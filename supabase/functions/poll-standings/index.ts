/**
 * poll-standings — Edge function para sincronizar tablas de posiciones
 * oficiales desde API-Football.
 *
 * ============================================================================
 * ESTADO: SCAFFOLD (Fase 1)
 * ============================================================================
 * Este archivo es SOLO el esqueleto. La lógica de fetch a API-Football
 * se implementa en FASE 2.
 *
 * En Fase 1:
 *  - Health check funciona (GET /poll-standings)
 *  - Estructura base (CORS, Deno.serve, Supabase client) está lista
 *  - La sincronización real es un TODO documentado
 *
 * ============================================================================
 * FASE 2: QUÉ HARÁ
 * ============================================================================
 * 1. Lee `competitions` activas de Supabase.
 * 2. Para cada competition, llama a API-Football:
 *    GET https://v3.football.api-sports.io/standings?league={api_football_id}&season={year}
 * 3. Hace upsert del resultado en la tabla `league_standings`:
 *    - `competition_id`, `season`, `group_name`, `team_name`, `team_logo`,
 *      `position`, `played`, `won`, `drawn`, `lost`, `goals_for`,
 *      `goals_against`, `goal_difference`, `points`, `api_team_id`,
 *      `synced_at = now()`
 * 4. Trigger: cron cada 6 horas, o post-poll-scores si hubo partidos
 *    finalizados en esa competición.
 *
 * ============================================================================
 * POR QUÉ SE NECESITA
 * ============================================================================
 * El cálculo local de standings (vía `calculateLeagueStandings`) funciona
 * bien para el Mundial (donde tenemos todos los matches) pero para la LPF
 * y otras ligas podemos perder partidos si la API no nos los devolvió
 * (ej. partido suspendido, error de sync, etc.).
 *
 * Sincronizar la tabla oficial de API-Football nos da un fallback:
 * - Vista "Calculada" (local, inmediata)
 * - Vista "Oficial API" (sincronizada, authoritative)
 *
 * El componente `Ligas.tsx` mostrará un toggle entre las dos (Fase 2).
 *
 * ============================================================================
 * CONFIGURACIÓN EN SUPABASE
 * ============================================================================
 * Secrets requeridos (configurar en Supabase Dashboard → Edge Functions):
 *   - API_FOOTBALL_KEY: API key de api-football.com
 *
 * Trigger: supabase/functions/poll-standings/index.ts
 */

// @ts-expect-error - Deno global, disponible en el runtime de Supabase Edge Functions
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface HealthResponse {
	status: "ok" | "error";
	service: "poll-standings";
	version: "scaffold-1.0";
	timestamp: string;
	message: string;
	phase: 1 | 2;
}

function healthResponse(): Response {
	const body: HealthResponse = {
		status: "ok",
		service: "poll-standings",
		version: "scaffold-1.0",
		timestamp: new Date().toISOString(),
		message:
			"Scaffold listo. La sincronización de standings se implementa en Fase 2.",
		phase: 1,
	};
	return new Response(JSON.stringify(body, null, 2), {
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

// @ts-expect-error - Deno.serve disponible en el runtime de Supabase Edge Functions
Deno.serve(async (req: Request) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	const url = new URL(req.url);

	// Health check
	if (url.pathname.endsWith("/health") || req.method === "GET") {
		return healthResponse();
	}

	// ============================================================================
	// FASE 2: Sincronización real
	// ============================================================================
	// TODO Fase 2:
	// 1. Crear cliente Supabase con service role key (admin):
	//    const supabase = createClient(
	//      Deno.env.get("SUPABASE_URL")!,
	//      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	//    );
	//
	// 2. Leer competiciones activas:
	//    const { data: competitions } = await supabase
	//      .from("competitions")
	//      .select("id, api_football_id, season, format")
	//      .eq("active", true);
	//
	// 3. Para cada competition, llamar a API-Football:
	//    const response = await fetch(
	//      `https://v3.football.api-sports.io/standings?league=${comp.api_football_id}&season=${comp.season}`,
	//      { headers: { "x-apisports-key": Deno.env.get("API_FOOTBALL_KEY")! } }
	//    );
	//    const data = await response.json();
	//
	// 4. Mapear y upsert en `league_standings`:
	//    - Por cada grupo (formato groups) o tabla única (formato league)
	//    - Upsert con onConflict: "competition_id,season,group_name,team_name"
	//
	// 5. Retornar resumen:
	//    { synced: [...], errors: [...], duration_ms: N }

	return new Response(
		JSON.stringify({
			status: "not_implemented",
			message: "Sincronización de standings se implementa en Fase 2.",
			hint: "Hacé un POST a esta función con { dryRun: true } para previsualizar.",
		}),
		{
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 501, // Not Implemented
		},
	);
});
