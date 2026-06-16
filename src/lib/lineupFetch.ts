/**
 * Lógica PURA de decisión de fetch de lineups (formations).
 *
 * Extraída de `supabase/functions/poll-scores/index.ts` para ser testeable
 * con Vitest desde `src/__tests__/lineupFetch.test.ts`. No tiene side
 * effects ni acceso a DB/API: el reloj es inyectable vía `nowMs`.
 *
 * Sprint: "Habilitar formations para partidos upcoming".
 *
 * Casos soportados:
 * 1. Live / recién finalizado → siempre fetchear (data en tiempo real).
 * 2. Finalizado sin lineups previas → backfill (algunas ligas tardan).
 * 3. Upcoming dentro de ventana de 2h → fetchear, pero solo si está
 *    stale (>30 min desde la última actualización) para no gastar cuota.
 * 4. Upcoming fuera de ventana → no fetchear (la API no publica tan
 *    temprano).
 * 5. Cancelled / postponed → no fetchear.
 *
 * Si en el futuro el cliente quiere mostrar un countdown o un indicador
 * "se publican en ~X minutos", esta función también es reutilizable
 * desde el frontend.
 */

export type LineupDecisionReason =
	| "live"
	| "newly_finished"
	| "finished_backfill"
	| "upcoming_window_fresh"
	| "upcoming_window_stale"
	| "no_window"
	| "cancelled_or_postponed";

export type MatchStatusForLineups = "live" | "finished" | "cancelled" | "scheduled";

/** Ventana de tiempo antes del kickoff para empezar a consultar lineups.
 *  API-Football publica lineups T-20-40min; con polls cada 10 min, una
 *  ventana de 2h garantiza capturarlas en ≤3 intentos. */
export const LINEUP_FETCH_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Staleness: tiempo mínimo entre re-fetches de lineups para el mismo
 *  partido. Evita gastar cuota re-consultando cada 10 min. Si hay una
 *  lesión de último momento, se captura en el próximo poll tras este
 *  intervalo. */
export const LINEUP_STALE_MS = 30 * 60 * 1000;

export interface ShouldFetchLineupsInput {
	/** Estado mapeado del partido (live/finished/cancelled/scheduled) */
	status: MatchStatusForLineups;
	/** true si el partido cambió a "finished" en este poll */
	isNewlyFinished: boolean;
	/** ISO string del kickoff, o cualquier valor parseable por `new Date()` */
	kickOff: string;
	/** Lineups ya guardados en DB (array de TeamLineup) */
	exLineups: unknown[] | null | undefined;
	/** ISO string del último upsert de lineups, o null si nunca se fetcheó */
	exLineupsUpdatedAt: string | null;
	/** "Reloj" actual en ms (inyectable para tests deterministas) */
	nowMs: number;
}

export interface ShouldFetchLineupsResult {
	needs: boolean;
	reason: LineupDecisionReason;
}

/**
 * Decide si poll-scores debe incluir las formations de un fixture
 * en el batch fetch de este ciclo.
 *
 * Pura, sin side effects, sin acceso a DB/API. Testeable con
 * `vi.useFakeTimers()` o cualquier mecanismo de clock injection.
 */
export function shouldFetchLineups(
	input: ShouldFetchLineupsInput,
): ShouldFetchLineupsResult {
	const {
		status,
		isNewlyFinished,
		kickOff,
		exLineups,
		exLineupsUpdatedAt,
		nowMs,
	} = input;

	// 1. Live: siempre
	if (status === "live") {
		return { needs: true, reason: "live" };
	}

	// 2. Recién finalizado: siempre
	if (isNewlyFinished) {
		return { needs: true, reason: "newly_finished" };
	}

	// 3. Finalizado sin lineups: backfill
	if (status === "finished") {
		const hasLineups = Array.isArray(exLineups) && exLineups.length > 0;
		if (!hasLineups) {
			return { needs: true, reason: "finished_backfill" };
		}
		return { needs: false, reason: "no_window" };
	}

	// 4. Cancelled / postponed: no fetcheamos
	if (status === "cancelled") {
		return { needs: false, reason: "cancelled_or_postponed" };
	}

	// 5. Scheduled: ventana upcoming
	const kickOffMs = new Date(kickOff).getTime();
	if (Number.isNaN(kickOffMs) || kickOffMs <= nowMs) {
		// Kickoff en el pasado o inválido: no aplica ventana upcoming
		return { needs: false, reason: "no_window" };
	}

	const msUntilKickoff = kickOffMs - nowMs;
	if (msUntilKickoff > LINEUP_FETCH_WINDOW_MS) {
		// Fuera de ventana: demasiado pronto (la API no publica)
		return { needs: false, reason: "no_window" };
	}

	// Dentro de ventana: solo si está stale
	if (!exLineupsUpdatedAt) {
		// Nunca se fetcheó → stale por definición
		return { needs: true, reason: "upcoming_window_stale" };
	}

	const lastFetchMs = new Date(exLineupsUpdatedAt).getTime();
	if (Number.isNaN(lastFetchMs)) {
		return { needs: true, reason: "upcoming_window_stale" };
	}

	if (nowMs - lastFetchMs > LINEUP_STALE_MS) {
		return { needs: true, reason: "upcoming_window_stale" };
	}

	return { needs: false, reason: "upcoming_window_fresh" };
}
