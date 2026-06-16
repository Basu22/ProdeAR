import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push";
// Sprint "Habilitar formations upcoming": función pura extraída a
// src/lib/lineupFetch.ts para ser testeable con Vitest. El Edge
// Function solo la consume (sin redefinirla).
import { shouldFetchLineups } from "../../../../src/lib/lineupFetch.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

// VAPID configuration for Web Push
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const vapidSubject =
	Deno.env.get("VAPID_SUBJECT") || "mailto:admin@prodear.app";

if (vapidPublicKey && vapidPrivateKey) {
	try {
		webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
	} catch (err) {
		console.error("Error setting VAPID details in Edge Function:", err);
	}
}

function mapApiFootballStatus(statusShort: string): MatchStatus {
	const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"];
	const finishedStatuses = ["FT", "AET", "PEN"];
	const cancelledStatuses = ["PST", "CANC", "ABD", "SUSP", "INT"];

	if (liveStatuses.includes(statusShort)) return "live";
	if (finishedStatuses.includes(statusShort)) return "finished";
	if (cancelledStatuses.includes(statusShort)) return "cancelled";
	return "scheduled";
}

function parseMatchday(roundStr: string): number {
	const match = roundStr.match(/\d+/);
	return match ? Number.parseInt(match[0], 10) : 1;
}

function getStageMultiplier(roundStr: string): number {
	const lower = roundStr.toLowerCase();
	if (
		lower.includes("final") &&
		!lower.includes("semi") &&
		!lower.includes("quarter") &&
		!lower.includes("1/8") &&
		!lower.includes("1/16") &&
		!lower.includes("1/4") &&
		!lower.includes("third") &&
		!lower.includes("tercer")
	) {
		return 6; // Final
	}
	if (lower.includes("semi")) {
		return 5; // Semifinal
	}
	if (
		lower.includes("quarter") ||
		lower.includes("1/4") ||
		lower.includes("cuartos")
	) {
		return 4; // Cuartos
	}
	if (
		lower.includes("round of 16") ||
		lower.includes("1/8") ||
		lower.includes("octavos")
	) {
		return 3; // Octavos
	}
	if (
		lower.includes("round of 32") ||
		lower.includes("1/16") ||
		lower.includes("dieciseisavos")
	) {
		return 2; // Dieciseisavos
	}
	if (
		lower.includes("3rd place") ||
		lower.includes("third place") ||
		lower.includes("tercer puesto")
	) {
		return 4; // Tercer puesto
	}
	return 1;
}

/**
 * Extrae la letra del grupo del stageName de la API.
 * Acepta "Group A" (API-Football) y "Grupo A" (legado).
 * Retorna null si no matchea (ej. "Group Stage" sin letra, "Round of 16").
 */
function getGroupLetterFromStage(stageName: string | null | undefined): string | null {
	if (!stageName) return null;
	const match = stageName.match(/[Gg]r(?:oup|upo)\s+([A-L])(?![a-zA-Z])/i);
	return match ? match[1].toUpperCase() : null;
}

/**
 * Cache en memoria de los aliases de la tabla `team_aliases`.
 * Se carga una vez por invocación de la Edge Function (Deno puede reciclar
 * el isolate entre invocaciones, por eso el lazy-load).
 *
 * Estructura: Map<lowercase-alias, { canonical: string; group: string | null }>
 *
 * Si la tabla `team_aliases` está vacía o la query falla, el Map queda vacío
 * y `resolveCanonicalName` retorna el nombre crudo de la API (fallback seguro).
 */
let aliasesCache: Map<
	string,
	{ canonical: string; group: string | null }
> | null = null;

async function loadAliasesCache(
	supabase: any,
): Promise<Map<string, { canonical: string; group: string | null }>> {
	if (aliasesCache) return aliasesCache;

	const map = new Map<string, { canonical: string; group: string | null }>();
	try {
		const { data, error } = await supabase
			.from("team_aliases")
			.select("alias, canonical_name, group_letter");

		if (error) {
			console.warn("Error loading team_aliases cache:", error);
		} else if (data) {
			for (const row of data) {
				map.set(row.alias.toLowerCase().trim(), {
					canonical: row.canonical_name,
					group: row.group_letter || null,
				});
			}
		}
	} catch (e) {
		console.warn("Exception loading team_aliases cache:", e);
	}

	aliasesCache = map;
	return map;
}

/**
 * Resuelve un nombre de equipo de la API a su forma canónica del Mundial.
 *
 * Retorna:
 * - `canonical`: nombre canónico en español (ej. "Corea del Sur")
 * - `groupLetter`: "A"-"L" si es de fase de grupos, null en otro caso
 *
 * Si el alias no está en el cache, retorna un objeto con `canonical: name`
 * (fallback: usa el nombre crudo de la API) y `groupLetter: null`.
 */
function resolveCanonicalName(
	teamName: string,
	cache: Map<string, { canonical: string; group: string | null }>,
): { canonical: string; groupLetter: string | null } {
	const key = teamName.toLowerCase().trim();
	const entry = cache.get(key);

	if (entry) {
		return { canonical: entry.canonical, groupLetter: entry.group };
	}

	// Fallback: nombre crudo + intentar parsear grupo del stage
	return { canonical: teamName, groupLetter: null };
}

/* ════════════════════════════════════════════════════════════════
   Sprint 2 Fix (#4): Coverage caching
   Cachea la disponibilidad de features por liga+season para no
   gastar cuota en endpoints que devuelven arrays vacíos.
   ════════════════════════════════════════════════════════════════ */

type LeagueCoverage = {
	fixtures_events: boolean;
	fixtures_lineups: boolean;
	fixtures_statistics_fixtures: boolean;
	fixtures_statistics_players: boolean;
};

type MatchStatus = "live" | "finished" | "cancelled" | "scheduled";

const COVERAGE_FRESH_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Sincroniza la tabla `league_coverage` con /leagues?current=true.
 * Solo actualiza ligas que no tienen coverage fresco (< 24h).
 */
async function syncLeagueCoverage(
	apiFootballKey: string,
	supabase: any,
): Promise<void> {
	try {
		// 1. Buscar ligas que necesitan refresh
		const { data: stale, error: selErr } = await supabase
			.from("league_coverage")
			.select("league_id, updated_at")
			.lt("updated_at", new Date(Date.now() - COVERAGE_FRESH_MS).toISOString())
			.limit(20);
		if (selErr) {
			console.error("[poll-scores] Error reading league_coverage:", selErr);
			return;
		}
		const staleIds = (stale ?? []).map((r: any) => r.league_id);

		// 2. Si no hay ligas stales, no gastar la call
		if (staleIds.length === 0) return;

		// 3. Pedir el endpoint con los IDs específicos (más eficiente)
		const idsParam = staleIds.slice(0, 20).join("-");
		const resp = await fetch(
			`https://v3.football.api-sports.io/leagues?ids=${idsParam}`,
			{ headers: { "x-apisports-key": apiFootballKey } },
		);
		if (!resp.ok) {
			console.error(
				`[poll-scores] /leagues?ids returned ${resp.status}`,
			);
			return;
		}
		const data = await resp.json();

		// 4. Upsert el coverage de cada liga+season actual
		const rows: any[] = [];
		for (const leagueEntry of data.response ?? []) {
			for (const season of leagueEntry.seasons ?? []) {
				if (!season.current) continue;
				rows.push({
					league_id: leagueEntry.league.id,
					league_name: leagueEntry.league.name,
					season: season.year,
					fixtures_events: season.coverage?.fixtures?.events ?? false,
					fixtures_lineups: season.coverage?.fixtures?.lineups ?? false,
					fixtures_statistics_fixtures:
						season.coverage?.fixtures?.statistics_fixtures ?? false,
					fixtures_statistics_players:
						season.coverage?.fixtures?.statistics_players ?? false,
					standings: season.coverage?.standings ?? false,
					players: season.coverage?.players ?? false,
					predictions: season.coverage?.predictions ?? false,
					updated_at: new Date().toISOString(),
				});
			}
		}
		if (rows.length > 0) {
			const { error: upErr } = await supabase
				.from("league_coverage")
				.upsert(rows, { onConflict: "league_id,season" });
			if (upErr) {
				console.error("[poll-scores] Error upserting league_coverage:", upErr);
			} else {
				console.log(`[poll-scores] Synced coverage for ${rows.length} league/seasons`);
			}
		}
	} catch (e) {
		console.error("[poll-scores] Error in syncLeagueCoverage:", e);
	}
}

/**
 * Carga el cache de coverage en memoria (Map<`${leagueId}-${season}`, coverage>).
 * Se llama 1 vez por invocación de poll-scores.
 */
async function loadCoverageCache(
	supabase: any,
): Promise<Map<string, LeagueCoverage>> {
	const map = new Map<string, LeagueCoverage>();
	const { data, error } = await supabase
		.from("league_coverage")
		.select(
			"league_id, season, fixtures_events, fixtures_lineups, fixtures_statistics_fixtures, fixtures_statistics_players",
		);
	if (error) {
		console.error("[poll-scores] Error loading coverage cache:", error);
		return map;
	}
	for (const r of data ?? []) {
		const key = `${r.league_id}-${r.season}`;
		map.set(key, {
			fixtures_events: r.fixtures_events,
			fixtures_lineups: r.fixtures_lineups,
			fixtures_statistics_fixtures: r.fixtures_statistics_fixtures,
			fixtures_statistics_players: r.fixtures_statistics_players,
		});
	}
	return map;
}

/**
 * Helper para chequear si un feature está disponible para una liga+season.
 * Si no hay info en cache, retorna `true` (asume que sí, para no bloquear).
 */
function isFeatureAvailable(
	coverageMap: Map<string, LeagueCoverage>,
	leagueId: number,
	season: number,
	feature: "events" | "lineups" | "statistics_fixtures" | "statistics_players",
): boolean {
	const cov = coverageMap.get(`${leagueId}-${season}`);
	if (!cov) return true; // sin info, asumimos disponible
	switch (feature) {
		case "events":
			return cov.fixtures_events;
		case "lineups":
			return cov.fixtures_lineups;
		case "statistics_fixtures":
			return cov.fixtures_statistics_fixtures;
		case "statistics_players":
			return cov.fixtures_statistics_players;
	}
}

const isYouthOrWomen = (teamName: string): boolean => {
	const lower = teamName.toLowerCase();
	const youthPatterns = [
		/\bu[- ]?\d{2}\b/, // u20, u-20, u 20, u17, u-17, u16
		/\bsub[- ]?\d{2}\b/, // sub-20, sub 20, sub20, sub-17
		/\bunder[- ]?\d{2}\b/, // under-20, under 20, under 17
		/\bwomen\b/, // women
		/\bfemenino\b/, // femenino
		/\bfemenil\b/, // femenil
		/\bteam w\b/, // selecciones femeninas
		/\bolympic\b/, // selecciones olímpicas
		/\bolímpica\b/,
	];
	return youthPatterns.some((pattern) => pattern.test(lower));
};

async function notifyFinishedMatch(
	supabase: any,
	matchId: string,
	homeTeam: string,
	awayTeam: string,
	homeScore: number,
	awayScore: number,
) {
	if (!vapidPublicKey || !vapidPrivateKey) {
		console.warn("VAPID keys not configured. Skipping push notifications.");
		return;
	}

	try {
		// Query predictions for this match
		const { data: predictions, error: predError } = await supabase
			.from("predictions")
			.select("user_id, points_earned")
			.eq("match_id", matchId);

		if (predError) {
			console.error("Error querying predictions for push:", predError);
			return;
		}

		if (!predictions || predictions.length === 0) return;

		for (const pred of predictions) {
			const userId = pred.user_id;
			const points = pred.points_earned || 0;

			// Fetch user rank in their tournaments
			const { data: members } = await supabase
				.from("tournament_members")
				.select("tournament_id, rank")
				.eq("user_id", userId);

			const rankInfo =
				members && members.length > 0 && members[0].rank
					? `puesto #${members[0].rank}`
					: "tu puesto";

			// Fetch subscriptions for this user
			const { data: subscriptions } = await supabase
				.from("push_subscriptions")
				.select("endpoint, p256dh, auth")
				.eq("user_id", userId);

			if (!subscriptions || subscriptions.length === 0) continue;

			const payload = JSON.stringify({
				title: "¡Partido Finalizado!",
				body: `¡Finalizado! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}. Sumaste +${points} pts. Puesto: ${rankInfo}`,
				icon: "/favicon.svg",
			});

			for (const sub of subscriptions) {
				try {
					const pushSubscription = {
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth,
						},
					};
					await webpush.sendNotification(pushSubscription, payload);
				} catch (err: any) {
					console.error(
						`Error sending push notification to endpoint ${sub.endpoint}:`,
						err,
					);
					// Clean up expired or invalid subscriptions (410 Gone or 404 Not Found)
					if (err.statusCode === 410 || err.statusCode === 404) {
						await supabase
							.from("push_subscriptions")
							.delete()
							.eq("endpoint", sub.endpoint);
					}
				}
			}
		}
	} catch (err) {
		console.error("Error running notifyFinishedMatch:", err);
	}
}

// =============================================================================
// FASE 3: Notificaciones recordatorio de cierre de pronósticos
// =============================================================================
//
// Envía push a los usuarios cuando faltan ~30 min y ~5 min para que cierre el
// plazo de pronósticos (que es 15 min antes del kick_off).
//
// Ventanas de detección (con tolerancia ±5 min porque el cron corre cada 10 min):
//   - prediction_closing_30 → kick_off entre NOW()+40min y NOW()+50min
//   - prediction_closing_5  → kick_off entre NOW()+15min y NOW()+25min
//
// Idempotencia: tabla `notification_log` con UNIQUE (user_id, match_id, type).
// Concurrencia: batching paralelo con Promise.allSettled().

interface MatchForClosure {
	id: string;
	home_team: string;
	away_team: string;
	kick_off: string;
	competition_id: number | null;
	home_logo: string | null;
	away_logo: string | null;
}

interface ClosureRecipient {
	user_id: string;
	tournament_id: string;
	has_prediction: boolean;
}

interface ClosureWindow {
	type: "prediction_closing_30" | "prediction_closing_5";
	minMinutes: number;
	maxMinutes: number;
}

const CLOSURE_WINDOWS: ClosureWindow[] = [
	{ type: "prediction_closing_30", minMinutes: 40, maxMinutes: 50 },
	{ type: "prediction_closing_5", minMinutes: 15, maxMinutes: 25 },
];

function buildClosurePayload(
	match: MatchForClosure,
	type: "prediction_closing_30" | "prediction_closing_5",
	recipient: ClosureRecipient,
): string {
	const isUrgent = type === "prediction_closing_5";
	const minutesLabel = isUrgent ? "5" : "30";
	const matchLabel = `${match.home_team} vs ${match.away_team}`;

	let title: string;
	let body: string;
	if (recipient.has_prediction) {
		title = isUrgent ? "🔴 Último aviso" : "⏰ Partido por cerrar";
		body = `${matchLabel} cierra en ${minutesLabel} min. Ya tenés tu pronóstico, ¡suerte!`;
	} else {
		title = isUrgent
			? "🔴 ¡Última oportunidad!"
			: "⏰ No te quedes sin pronosticar";
		body = `${matchLabel} cierra en ${minutesLabel} min. ¡Hacé tu pronóstico ahora!`;
	}

	return JSON.stringify({
		title,
		body,
		icon: match.home_logo || "/logo-192.png",
		badge: "/logo-192.png",
		tag: `closure-${type}-${match.id}`,
		renotify: true,
		vibrate: isUrgent ? [200, 100, 200, 100, 200] : [100, 50, 100],
		url: `/torneo/${recipient.tournament_id}?match=${match.id}`,
	});
}

async function notifyUpcomingClosures(
	supabase: any,
	options: { forceType?: string; forceMatchId?: string } = {},
): Promise<{ processedMatches: number; totalSent: number; totalSkipped: number; totalFailed: number }> {
	if (!vapidPublicKey || !vapidPrivateKey) {
		console.warn("VAPID keys not configured. Skipping closure notifications.");
		return { processedMatches: 0, totalSent: 0, totalSkipped: 0, totalFailed: 0 };
	}

	const stats = { processedMatches: 0, totalSent: 0, totalSkipped: 0, totalFailed: 0 };

	const windowsToProcess = options.forceType
		? CLOSURE_WINDOWS.filter((w) => w.type === options.forceType)
		: CLOSURE_WINDOWS;

	for (const window of windowsToProcess) {
		try {
			let matchesQuery = supabase
				.from("matches")
				.select("id, home_team, away_team, kick_off, competition_id, home_logo, away_logo")
				.eq("status", "scheduled")
				.gte("kick_off", new Date(Date.now() + window.minMinutes * 60_000).toISOString())
				.lte("kick_off", new Date(Date.now() + window.maxMinutes * 60_000).toISOString());

			if (options.forceMatchId) {
				matchesQuery = matchesQuery.eq("id", options.forceMatchId);
			}

			const { data: matches, error: matchesErr } = await matchesQuery;
			if (matchesErr) {
				console.error(`[Phase 3] Error fetching matches for ${window.type}:`, matchesErr);
				continue;
			}
			if (!matches || matches.length === 0) continue;

			stats.processedMatches += matches.length;

			// Para cada match, obtener destinatarios y enviar.
			for (const match of matches) {
				const { data: recipients, error: recErr } = await supabase.rpc(
					"get_closure_notification_recipients",
					{ p_match_id: match.id, p_competition_id: match.competition_id },
				);
				if (recErr) {
					console.error(`[Phase 3] Error getting recipients for match ${match.id}:`, recErr);
					continue;
				}
				if (!recipients || recipients.length === 0) continue;

				// Batching paralelo de envíos.
				const sendPromises: Promise<void>[] = [];

				for (const recipient of recipients) {
					// Idempotencia: insertar en notification_log antes de enviar.
					const { error: logErr } = await supabase
						.from("notification_log")
						.insert({
							user_id: recipient.user_id,
							match_id: match.id,
							tournament_id: recipient.tournament_id,
							type: window.type,
						});

					if (logErr) {
						// unique_violation = ya se notificó antes; skip.
						if (logErr.code === "23505") {
							stats.totalSkipped++;
							continue;
						}
						console.error(`[Phase 3] Error logging notification:`, logErr);
						stats.totalSkipped++;
						continue;
					}

					// Buscar TODAS las suscripciones del user (puede tener varios devices).
					const { data: subscriptions } = await supabase
						.from("push_subscriptions")
						.select("endpoint, p256dh, auth")
						.eq("user_id", recipient.user_id);

					if (!subscriptions || subscriptions.length === 0) continue;

					const payload = buildClosurePayload(match, window.type, recipient);

					for (const sub of subscriptions) {
						sendPromises.push(
							(async () => {
								try {
									const pushSubscription = {
										endpoint: sub.endpoint,
										keys: { p256dh: sub.p256dh, auth: sub.auth },
									};
									await webpush.sendNotification(pushSubscription, payload);
									stats.totalSent++;
								} catch (err: any) {
									console.error(
										`[Phase 3] Error sending push to ${sub.endpoint}:`,
										err?.message ?? err,
									);
									// Limpieza de suscripciones inválidas.
									if (err?.statusCode === 410 || err?.statusCode === 404) {
										await supabase
											.from("push_subscriptions")
											.delete()
											.eq("endpoint", sub.endpoint);
									}
									stats.totalFailed++;
								}
							})(),
						);
					}
				}

				// Esperar todos los envíos de este match en paralelo.
				await Promise.allSettled(sendPromises);
			}
		} catch (err) {
			console.error(`[Phase 3] Error in window ${window.type}:`, err);
		}
	}

	console.log(
		`[Phase 3] Done: ${stats.processedMatches} matches, ${stats.totalSent} sent, ${stats.totalSkipped} skipped, ${stats.totalFailed} failed`,
	);
	return stats;
}


// FIX: SWC parser rejects 5-level nested ternary with optional chaining
// inside object literals. Extracted to helper function.
function mapEventType(e: any): string {
	if (e.type === "Goal") return "goal";
	if (e.detail && e.detail.includes("Red")) return "red";
	if (e.type === "Card") return "yellow";
	if (e.type === "subst") return "subst";
	if (e.type === "Var") return "var";
	return "info";
}

serve(async (req) => {
	// CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY");

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error("Missing Supabase environment variables.");
		}

		if (!apiFootballKey) {
			throw new Error("Missing API_FOOTBALL_KEY environment variable.");
		}

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Sprint 3: Cargar cache de team_aliases para canonicalización server-side.
		// Se usa para popular home_team_canonical, away_team_canonical y group_letter
		// en cada match upserted. Si la tabla está vacía, el Map queda vacío y
		// resolveCanonicalName() hace fallback al nombre crudo de la API.
		const aliasesCache = await loadAliasesCache(supabase);

		const url = new URL(req.url);

		// Debug Match Endpoint
		const debugMatchId = url.searchParams.get("debug_match");
		if (debugMatchId) {
			const matchIdInt = Number.parseInt(debugMatchId, 10);
			const { data, error } = await supabase
				.from("matches")
				.select("*, competitions(name, api_football_id)")
				.eq("api_match_id", matchIdInt)
				.maybeSingle();

			return new Response(JSON.stringify({ debugMatchId, data, error }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: error ? 400 : 200,
			});
		}

		const listMatches = url.searchParams.get("list_matches");
		if (listMatches) {
			const { data, error } = await supabase
				.from("matches")
				.select("*, competitions(name, api_football_id)")
				.order("kick_off", { ascending: true })
				.limit(10);

			return new Response(JSON.stringify({ listMatches, data, error }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: error ? 400 : 200,
			});
		}

		// Debug: simular notificaciones de cierre sin esperar el tiempo real
		// Uso: ?simulate_closure=30min o ?simulate_closure=5min
		// Opcional: ?match_id=<uuid> para simular contra un partido específico
		const simulateClosure = url.searchParams.get("simulate_closure");
		if (simulateClosure) {
			const typeMap: Record<string, "prediction_closing_30" | "prediction_closing_5"> = {
				"30min": "prediction_closing_30",
				"5min": "prediction_closing_5",
			};
			const forceType = typeMap[simulateClosure];
			if (!forceType) {
				return new Response(
					JSON.stringify({
						error: `simulate_closure inválido: '${simulateClosure}'. Valores permitidos: 30min, 5min`,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 400,
					},
				);
			}
			const forceMatchId = url.searchParams.get("match_id") ?? undefined;
			console.log(`[Phase 3] Simulating closure: type=${forceType}, match=${forceMatchId ?? "all"}`);
			const stats = await notifyUpcomingClosures(supabase, { forceType, forceMatchId });
			return new Response(JSON.stringify({ simulated: true, type: forceType, ...stats }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		const seed = url.searchParams.get("seed");
		if (seed === "true") {
			const defaultComps = [
				{
					name: "Copa del Mundo 2026",
					country: "Internacional",
					logo_url: "https://media.api-sports.io/football/leagues/1.png",
					api_football_id: 1,
					season: "2026",
				},
				{
					name: "Amistosos Internacionales",
					country: "Internacional",
					logo_url: "https://media.api-sports.io/football/leagues/10.png",
					api_football_id: 10,
					season: "2026",
				},
			];
			const { data: seeded, error: seedError } = await supabase
				.from("competitions")
				.upsert(defaultComps, { onConflict: "api_football_id" })
				.select();

			if (seedError) {
				return new Response(
					JSON.stringify({ error: seedError.message, details: seedError }),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
						status: 400,
					},
				);
			}
			return new Response(JSON.stringify({ success: true, seeded }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		// Extract filters from the request query params
		const live = url.searchParams.get("live");
		const league = url.searchParams.get("league");
		const season = url.searchParams.get("season");
		const preview =
			url.searchParams.get("preview") === "true" ||
			url.searchParams.get("dryRun") === "true";
		const raw = url.searchParams.get("raw") === "true";

		// Cooldown control to preserve API-Football quota
		let targetCompId: number | null = null;
		if (!preview && !raw && league && season) {
			const leagueIdNum = Number.parseInt(league, 10);
			const { data: compData } = await supabase
				.from("competitions")
				.select("id, last_synced_at")
				.eq("api_football_id", leagueIdNum)
				.maybeSingle();

			if (compData) {
				targetCompId = compData.id;
				if (compData.last_synced_at) {
					const lastSynced = new Date(compData.last_synced_at).getTime();
					const now = Date.now();
					const cooldownMs = 5 * 60 * 1000; // 5 minutes cooldown
					if (now - lastSynced < cooldownMs) {
						const secondsLeft = Math.ceil(
							(cooldownMs - (now - lastSynced)) / 1000,
						);
						return new Response(
							JSON.stringify({
								success: true,
								message: `Sincronización en enfriamiento (cooldown) para liga ${league}. Próxima petición externa permitida en ${secondsLeft} segundos.`,
								cooldown: true,
								processedCount: 0,
								upsertedCount: 0,
								upsertedMatches: [],
							}),
							{
								headers: { ...corsHeaders, "Content-Type": "application/json" },
								status: 200,
							},
						);
					}
				}
			}
		}

		const apiParams = new URLSearchParams();
		if (live) {
			apiParams.set("live", live);
		} else if (league && season) {
			apiParams.set("league", league);
			apiParams.set("season", season);
		} else {
			apiParams.set("live", "all");
		}

		// Fetch fixtures from API-Football
		const apiResponse = await fetch(
			`https://v3.football.api-sports.io/fixtures?${apiParams.toString()}`,
			{
				headers: {
					"x-apisports-key": apiFootballKey,
				},
			},
		);

		if (!apiResponse.ok) {
			throw new Error(`API-Football request failed: ${apiResponse.statusText}`);
		}

		const apiData = await apiResponse.json();

		// If raw mode is requested, return the exact API-Football payload without any mapping or database writes
		if (raw) {
			return new Response(JSON.stringify(apiData), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			});
		}

		const apiFixtures = apiData.response || [];

		// Auto-Heal: Check if there are matches in our database marked as 'live'
		// but which are no longer returned by the live API response (meaning they finished).
		try {
			const { data: dbLiveMatches, error: dbLiveError } = await supabase
				.from("matches")
				.select("api_match_id")
				.eq("status", "live");

			if (!dbLiveError && dbLiveMatches && dbLiveMatches.length > 0) {
				const apiLiveIds = new Set(apiFixtures.map((f: any) => f.fixture.id));
				const missingLiveIds = dbLiveMatches
					.map((dbM: any) => dbM.api_match_id)
					.filter((id: number) => !apiLiveIds.has(id));

				if (missingLiveIds.length > 0) {
					console.log(
						`[Auto-Heal] Encontrados ${missingLiveIds.length} partidos 'live' en DB que ya no están activos en la API. Consultando detalles definitivos para IDs: ${missingLiveIds.join(", ")}`,
					);

					// API-Football admite un máximo de 20 IDs separados por guiones por petición
					for (let i = 0; i < missingLiveIds.length; i += 20) {
						const chunk = missingLiveIds.slice(i, i + 20);
						const idsParam = chunk.join("-");
						const missingResponse = await fetch(
							`https://v3.football.api-sports.io/fixtures?ids=${idsParam}`,
							{
								headers: {
									"x-apisports-key": apiFootballKey,
								},
							},
						);
						if (missingResponse.ok) {
							const missingData = await missingResponse.json();
							const missingFixtures = missingData.response || [];
							console.log(
								`[Auto-Heal] Obtenidos ${missingFixtures.length} partidos finalizados/actualizados desde la API.`,
							);
							apiFixtures.push(...missingFixtures);
						} else {
							console.error(
								`[Auto-Heal] Error al consultar partidos huérfanos para IDs ${idsParam}: ${missingResponse.statusText}`,
							);
						}
					}
				}
			}
		} catch (err) {
			console.error(
				"[Auto-Heal] Error durante la reconciliación de partidos en vivo:",
				err,
			);
		}

		// Query active competitions in Supabase
		let { data: dbCompetitions, error: dbError } = await supabase
			.from("competitions")
			.select("id, api_football_id");

		if (dbError) {
			throw dbError;
		}

		// Only upsert default competitions if NOT in preview mode
		if (!preview) {
			const defaultComps = [
				{
					name: "Copa del Mundo 2026",
					country: "Internacional",
					logo_url: "https://media.api-sports.io/football/leagues/1.png",
					api_football_id: 1,
					season: "2026",
				},
				{
					name: "Amistosos Internacionales",
					country: "Internacional",
					logo_url: "https://media.api-sports.io/football/leagues/10.png",
					api_football_id: 10,
					season: "2026",
				},
			];

			const { data: seeded, error: seedError } = await supabase
				.from("competitions")
				.upsert(defaultComps, { onConflict: "api_football_id" })
				.select("id, api_football_id");

			if (seedError) {
				console.error("Error ensuring default competitions:", seedError);
			}

			// Re-fetch all competitions to have a complete and updated list
			const { data: refreshedComps, error: refreshError } = await supabase
				.from("competitions")
				.select("id, api_football_id");

			if (!refreshError && refreshedComps) {
				dbCompetitions = refreshedComps;
			}
		}

		const compMap = new Map<number, number>();
		if (dbCompetitions) {
			for (const comp of dbCompetitions) {
				compMap.set(comp.api_football_id, comp.id);
			}
		}

		let firstError: any = null;
		const upsertedMatches = [];
		const previewMatches = [];

		for (const f of apiFixtures) {
			const leagueId = f.league.id;
			const dbCompId = compMap.get(leagueId);

			// If not in preview, we skip if the competition is not in our database
			if (!dbCompId && !preview) continue;

			// Omit youth and women's selections
			if (
				isYouthOrWomen(f.teams.home.name) ||
				isYouthOrWomen(f.teams.away.name)
			) {
				continue;
			}

			let penaltyWinner: "home" | "away" | null = null;
			if (
				f.score?.penalty?.home !== null &&
				f.score?.penalty?.away !== null &&
				f.score?.penalty?.home !== undefined &&
				f.score?.penalty?.away !== undefined
			) {
				penaltyWinner =
					f.score.penalty.home > f.score.penalty.away ? "home" : "away";
			}

			const mappedStatus = mapApiFootballStatus(f.fixture.status.short);

			let isNewlyFinished = false;
			let existingMatch: any = null;
			if (!preview) {
				// Query if match exists in DB and its current status, stats and lineups
				const { data } = await supabase
					.from("matches")
					.select("id, status, stats, lineups")
					.eq("api_match_id", f.fixture.id)
					.maybeSingle();
				existingMatch = data;

				isNewlyFinished =
					mappedStatus === "finished" &&
					(!existingMatch || existingMatch.status !== "finished");
			}

			let stats = existingMatch?.stats || [];
			let lineups = existingMatch?.lineups || [];
			let events = existingMatch?.events || [];
			let player_photos = existingMatch?.player_photos || [];

			// Mapear eventos inline de la API como fallback inicial si existen
			if (f.events && f.events.length > 0) {
				events = f.events.map((e: any, idx: number) => ({
					id: `evt-${f.fixture.id}-${idx}`,
					type:
						mapEventType(e),
					minute: e.time?.elapsed ?? 0,
					extra: e.time?.extra ?? null,
					team: e.team?.id === f.teams.home.id ? "home" : "away",
					playerName: e.player?.name || "Desconocido",
					assistName: e.assist?.name || null,
					detail: e.detail || null,
					comments: e.comments || null,
				}));
			}
		}

// ════════════════════════════════════════════════════════════════
// Sprint 2 Fix (refactor #1): BATCH FETCH con /fixtures?ids=
// Desde API-Football v3.9.2, el param `ids` de /fixtures trae TODO
// (events, lineups, statistics, players) en una sola respuesta.
// Antes: 4 fetches × N partidos = 4N calls
// Ahora: 1 fetch × (N/20 chunks) ≈ N/20 calls
// ════════════════════════════════════════════════════════════════

		// Phase A-0: Sincronizar league_coverage (1 call/día, sin cuota adicional)
		// Sprint 2 Fix (#4): coverage check para no gastar cuota en ligas sin datos.
		// El endpoint /leagues?current=true NO tiene cobertura propia (es metadata)
		// y devuelve el campo `coverage` por league+season que cacheamos.
		await syncLeagueCoverage(apiFootballKey, supabase);

		// Cargar cache de coverage en memoria para evitar queries repetidos
		const coverageCache = await loadCoverageCache(supabase);

		// Phase A: Pre-query DB para todos los partidos en 1 sola query
		// y acumular IDs que necesitan data refresh.
		type FixtureDecision = {
			fixture: any;
			dbCompId: number | null;
			existingMatch: any;
			isLive: boolean;
			isNewlyFinished: boolean;
			mappedStatus: MatchStatus;
			needsStats: boolean;
			needsLineups: boolean;
			needsEvents: boolean;
			needsPlayerPhotos: boolean;
		};

		const decisions: FixtureDecision[] = [];

		for (const f of apiFixtures) {
			const leagueId = f.league.id;
			const dbCompId = compMap.get(leagueId) ?? null;

			if (!dbCompId && !preview) continue;

			if (
				isYouthOrWomen(f.teams.home.name) ||
				isYouthOrWomen(f.teams.away.name)
			) {
				continue;
			}

			const mappedStatus = mapApiFootballStatus(f.fixture.status.short);
			const isLive = mappedStatus === "live";

			let existingMatch: any = null;
			let isNewlyFinished = false;
			if (!preview) {
				const { data } = await supabase
					.from("matches")
					.select(
						"id, status, stats, lineups, events, player_photos, lineups_updated_at",
					)
					.eq("api_match_id", f.fixture.id)
					.maybeSingle();
				existingMatch = data;
				isNewlyFinished =
					mappedStatus === "finished" &&
					(!existingMatch || existingMatch.status !== "finished");
			}

			const exStats = existingMatch?.stats || [];
			const exLineups = existingMatch?.lineups || [];
			const exEvents = existingMatch?.events || [];
			const exPhotos = existingMatch?.player_photos || [];
			const exLineupsUpdatedAt = existingMatch?.lineups_updated_at ?? null;

			const needsStats =
				isLive ||
				isNewlyFinished ||
				(mappedStatus === "finished" && (!exStats || exStats.length === 0));

			// Sprint "Habilitar formations upcoming": la lógica de decisión
			// para lineups ahora cubre también upcoming en ventana de 2h
			// antes del kickoff, con un staleness check de 30 min para
			// evitar re-fetches innecesarios. Ver `shouldFetchLineups()`
			// arriba (función pura testeable).
			const lineupsDecision = shouldFetchLineups({
				status: mappedStatus,
				isNewlyFinished,
				kickOff: f.fixture.date,
				exLineups,
				exLineupsUpdatedAt,
				nowMs: Date.now(),
			});
			const needsLineups = lineupsDecision.needs;

			const needsEvents =
				isLive ||
				isNewlyFinished ||
				(mappedStatus === "finished" && (!exEvents || exEvents.length === 0));
			const needsPlayerPhotos =
				isLive || isNewlyFinished || (!exPhotos || exPhotos.length === 0);

			decisions.push({
				fixture: f,
				dbCompId,
				existingMatch,
				isLive,
				isNewlyFinished,
				mappedStatus,
				needsStats,
				needsLineups,
				needsEvents,
				needsPlayerPhotos,
			});

			// Sprint "Habilitar formations upcoming": log de observabilidad
			// para entender en producción por qué se decidió fetchar (o no)
			// las lineups de este fixture. Útil para auditar cuota y
			// detectar partidos que no reciben lineups cuando deberían.
			if (needsLineups || lineupsDecision.reason === "no_window") {
				console.log(
					`[poll-scores] lineups fixture=${f.fixture.id} ` +
					`${f.teams.home.name} vs ${f.teams.away.name} ` +
					`status=${mappedStatus} kickoff=${f.fixture.date} ` +
					`→ needs=${needsLineups} reason=${lineupsDecision.reason} ` +
					`exLineupsLen=${Array.isArray(exLineups) ? exLineups.length : 0} ` +
					`exUpdatedAt=${exLineupsUpdatedAt ?? "null"}`,
				);
			}
		}

		// Phase B: Batch fetch todos los IDs que necesitan CUALQUIER dato
		const idsNeedingData = preview
			? []
			: decisions
					.filter(
							(d) =>
								d.needsStats ||
								d.needsLineups ||
								d.needsEvents ||
								d.needsPlayerPhotos,
						)
					.map((d) => d.fixture.fixture.id);

		const batchData = new Map<number, any>();
		if (idsNeedingData.length > 0) {
			for (let i = 0; i < idsNeedingData.length; i += 20) {
				const chunk = idsNeedingData.slice(i, i + 20).join("-");
				try {
					await new Promise((resolve) => setTimeout(resolve, 100));
					const resp = await fetch(
						`https://v3.football.api-sports.io/fixtures?ids=${chunk}`,
						{ headers: { "x-apisports-key": apiFootballKey } },
					);
					// Sprint 2 Fix (#3): rate limit logging
					console.log(
						`[poll-scores] ids chunk ${i / 20 + 1}/${
							Math.ceil(idsNeedingData.length / 20)
						} status=${resp.status} daily-remaining=${
							resp.headers.get("x-ratelimit-requests-remaining") ?? "?"
						} min-remaining=${resp.headers.get("X-RateLimit-Remaining") ?? "?"}`,
					);
					if (resp.ok) {
						const data = await resp.json();
						for (const fixture of data.response ?? []) {
							batchData.set(fixture.fixture.id, fixture);
						}
					}
				} catch (e) {
					console.error(
						`[poll-scores] Error batch-fetching fixtures ${chunk}:`,
						e,
					);
				}
			}
		}

		// Phase C: Helper para extraer los 4 tipos de data del response batched
		function processBatchDataForFixture(
			fixture: any,
			originalFixture: any,
		) {
			let season: any = null;
			if (fixture?.league?.season) season = fixture.league.season;
			else if (originalFixture?.league?.season) season = originalFixture.league.season;

			// Sprint 2 Fix (#4): Coverage check. Si la API indica que la feature
			// no está disponible para esta liga+season, NO procesamos la data.
			// Esto evita meter arrays vacíos en la DB cuando la API devolvería vacío.
			const hasStats = season
				? isFeatureAvailable(
						coverageCache,
						originalFixture.league.id,
						season,
						"statistics_fixtures",
				  )
				: true;
			const hasLineups = season
				? isFeatureAvailable(
						coverageCache,
						originalFixture.league.id,
						season,
						"lineups",
				  )
				: true;
			const hasEvents = season
				? isFeatureAvailable(
						coverageCache,
						originalFixture.league.id,
						season,
						"events",
				  )
				: true;

			let stats: any = [];
			if (hasStats) {
				if (fixture?.statistics) stats = fixture.statistics;
				else if (originalFixture?.stats) stats = originalFixture.stats;
			}
			const lineups = hasLineups
				? fixture?.lineups ?? null
				: [];
			const apiEvents = hasEvents ? fixture?.events ?? null : [];
			const apiPlayers = fixture?.players ?? null;

			// Events: transformar al formato interno
			let events: any[] = [];
			if (apiEvents && apiEvents.length > 0) {
				events = apiEvents.map((e: any, idx: number) => ({
					id: `evt-${fixture.fixture.id}-${idx}`,
					type:
						mapEventType(e),
					minute: e.time?.elapsed ?? 0,
					extra: e.time?.extra ?? null,
					team: e.team?.id === originalFixture.teams.home.id ? "home" : "away",
					playerName: e.player?.name || "Desconocido",
					assistName: e.assist?.name || null,
					detail: e.detail || null,
					comments: e.comments || null,
				}));
			} else if (originalFixture.events?.length > 0) {
				// Fallback: usar events del main fetch si existen (algunos endpoints los incluyen)
				events = originalFixture.events.map((e: any, idx: number) => ({
					id: `evt-${originalFixture.fixture.id}-${idx}`,
					type:
						mapEventType(e),
					minute: e.time?.elapsed ?? 0,
					extra: e.time?.extra ?? null,
					team:
						e.team?.id === originalFixture.teams.home.id ? "home" : "away",
					playerName: e.player?.name || "Desconocido",
					assistName: e.assist?.name || null,
					detail: e.detail || null,
					comments: e.comments || null,
				}));
			}

			// Player photos: aplanar a map player_id → photo URL
			let playerPhotos: Array<{ player_id: number; photo: string }> = [];
			if (apiPlayers && Array.isArray(apiPlayers)) {
				for (const teamBlock of apiPlayers) {
					for (const p of teamBlock.players || []) {
						if (p.player?.id && p.player?.photo) {
							playerPhotos.push({
								player_id: p.player.id,
								photo: p.player.photo,
							});
						}
					}
				}
			}

			return {
				stats,
				lineups,
				events,
				player_photos: playerPhotos,
			};
		}

		// Phase D: Iterar las decisiones y procesar/upsert
		for (const decision of decisions) {
			const f = decision.fixture;
			const dbCompId = decision.dbCompId;
			const existingMatch = decision.existingMatch;
			const isNewlyFinished = decision.isNewlyFinished;
			const mappedStatus = decision.mappedStatus;

			// Calcular penalty winner
			let penaltyWinner: "home" | "away" | null = null;
			if (
				f.score?.penalty?.home !== null &&
				f.score?.penalty?.away !== null &&
				f.score?.penalty?.home !== undefined &&
				f.score?.penalty?.away !== undefined
			) {
				penaltyWinner =
					f.score.penalty.home > f.score.penalty.away ? "home" : "away";
			}

			// Obtener data del batch fetch (o fallback al existingMatch)
			let stats = existingMatch?.stats || [];
			let lineups = existingMatch?.lineups || [];
			let events = existingMatch?.events || [];
			let player_photos = existingMatch?.player_photos || [];
			// Sprint "Habilitar formations upcoming": flag que indica si
			// sobrescribimos las lineups en este poll. Se usa más abajo
			// para popular `lineups_updated_at` solo cuando corresponde.
			let lineupsWereUpdated = false;

			if (!preview) {
				const fetchedData = batchData.get(f.fixture.id);
				const needsAnyData =
					decision.needsStats ||
					decision.needsLineups ||
					decision.needsEvents ||
					decision.needsPlayerPhotos;

				if (fetchedData && needsAnyData) {
					const processed = processBatchDataForFixture(fetchedData, f);

					// Solo sobrescribir si realmente precisamos (para no pisar data existente con null)
					if (decision.needsStats && processed.stats) {
						stats = processed.stats;
					}
					// Sprint "Habilitar formations upcoming": fix de gap. Antes
					// aceptaba `length > 0` (1 solo equipo pisaba 2 ya guardados).
					// Ahora requiere `>= 2` para sobrescribir, con fallback
					// permisivo: si la API devuelve 1 solo equipo y NO había
					// lineups previas, aceptar (mejor que nada).
					if (
						decision.needsLineups &&
						processed.lineups &&
						processed.lineups.length >= 2
					) {
						lineups = processed.lineups;
						lineupsWereUpdated = true;
					} else if (
						decision.needsLineups &&
						Array.isArray(processed.lineups) &&
						processed.lineups.length === 1 &&
						(!exLineups || exLineups.length === 0)
					) {
						lineups = processed.lineups;
						lineupsWereUpdated = true;
					}
					if (decision.needsEvents && processed.events && processed.events.length > 0) {
						events = processed.events;
					}
					if (
						decision.needsPlayerPhotos &&
						processed.player_photos.length > 0
					) {
						player_photos = processed.player_photos;
					}
				}
			}

			// Sprint 3: Canonicalización server-side de equipos y grupo.
			// Resuelve nombres crudos de la API (ej. "South Korea") a nombres
			// canónicos en español (ej. "Corea del Sur") usando la tabla team_aliases.
			// group_letter se popula desde stageName (ej. "Group A" → "A").
			const homeResolved = resolveCanonicalName(
				f.teams.home.name,
				aliasesCache,
			);
			const awayResolved = resolveCanonicalName(
				f.teams.away.name,
				aliasesCache,
			);
			// Priorizar group_letter del alias (más robusto), fallback al stageName
			const groupLetter =
				homeResolved.groupLetter ?? getGroupLetterFromStage(f.league.round);

			const matchPayload = {
				competition_id: dbCompId || null,
				api_match_id: f.fixture.id,
				elapsed: f.fixture.status.elapsed ?? null,
				events: events,
				home_team: f.teams.home.name,
				away_team: f.teams.away.name,
				home_logo: f.teams.home.logo || null,
				away_logo: f.teams.away.logo || null,
				matchday: parseMatchday(f.league.round),
				kick_off: f.fixture.date,
				home_score: f.goals.home !== undefined ? f.goals.home : null,
				away_score: f.goals.away !== undefined ? f.goals.away : null,
				penalty_winner: penaltyWinner,
				stage_name: f.league.round,
				stage_multiplier: getStageMultiplier(f.league.round),
				status: mappedStatus,
				stadium: f.fixture.venue?.name || null,
				raw_status: f.fixture.status.short || null,
				stats: stats,
				lineups: lineups,
				player_photos: player_photos,
				// Sprint "Habilitar formations upcoming": timestamp de cuándo
				// se actualizaron las lineups por última vez. Se popula SOLO
				// cuando sobrescribimos (evita pisar el valor real con NOW()
				// en polls que no tocaron lineups).
				lineups_updated_at: lineupsWereUpdated
					? new Date().toISOString()
					: (exLineupsUpdatedAt ?? null),
				// Canonicalización Sprint 3 (server-side, opcional en DB)
				group_letter: groupLetter,
				home_team_canonical: homeResolved.canonical,
				away_team_canonical: awayResolved.canonical,
			};

			if (preview) {
				previewMatches.push({
					...matchPayload,
					api_raw_status: f.fixture.status.short, // Útil para depuración
				});
			} else {
				const { data, error } = await supabase
					.from("matches")
					.upsert(matchPayload, { onConflict: "api_match_id" })
					.select();

				if (error) {
					console.error(`Error upserting match ${f.fixture.id}:`, error);
					if (!firstError) firstError = error;
				} else if (data && data.length > 0) {
					const savedMatch = data[0];
					upsertedMatches.push(savedMatch);

					if (isNewlyFinished) {
						await notifyFinishedMatch(
							supabase,
							savedMatch.id,
							savedMatch.home_team,
							savedMatch.away_team,
							savedMatch.home_score,
							savedMatch.away_score,
						);
					}
				}
			}
		}

		// Update last_synced_at timestamp on successful database upsert
		if (!preview && !raw && targetCompId && !firstError) {
			const { error: updateErr } = await supabase
				.from("competitions")
				.update({ last_synced_at: new Date().toISOString() })
				.eq("id", targetCompId);
			if (updateErr) {
				console.error("Error updating last_synced_at:", updateErr);
			}
		}

		// ── Fase 3: Notificaciones de cierre de pronósticos ──
		// Solo ejecutar si NO es preview ni raw.
		// Se ejecuta en try/catch independiente para no romper la respuesta
		// principal si hay algún error en la lógica de Fase 3.
		// FIX: tipo explícito en lugar de Awaited<ReturnType<typeof ...>>
		// (Deno SWC parser rechaza el tipo complejo — bug conocido).
		let closureStats:
			| {
				processedMatches: number;
				totalSent: number;
				totalSkipped: number;
				totalFailed: number;
			  }
			| null = null;
		if (!preview && !raw) {
			try {
				closureStats = await notifyUpcomingClosures(supabase);
			} catch (err) {
				console.error("[Phase 3] Error in notifyUpcomingClosures:", err);
			}
		}

		if (preview) {
			return new Response(
				JSON.stringify({
					preview: true,
					processedCount: apiFixtures.length,
					matches: previewMatches,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				},
			);
		}

		return new Response(
			JSON.stringify({
				success: firstError ? false : true,
				error: firstError ? firstError.message : undefined,
				errorDetails: firstError || undefined,
				processedCount: apiFixtures.length,
				upsertedCount: upsertedMatches.length,
				upsertedMatches,
				phase3: closureStats ?? undefined,
				debug: {
					dbCompetitionsCount: dbCompetitions ? dbCompetitions.length : 0,
					dbCompetitions,
					compMapKeys: Array.from(compMap.keys()),
					preview,
				},
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 400,
		});
	}
});
