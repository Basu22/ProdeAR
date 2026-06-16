import { describe, expect, it } from "vitest";
import {
	LINEUP_FETCH_WINDOW_MS,
	LINEUP_STALE_MS,
	type ShouldFetchLineupsInput,
	shouldFetchLineups,
} from "../lib/lineupFetch";

/**
 * Tests del Sprint "Habilitar formations upcoming".
 *
 * La función `shouldFetchLineups()` es pura: no toca DB ni API, el reloj
 * se inyecta vía `nowMs`. Esto nos permite testear todas las ramas
 * determinísticamente.
 *
 * Cubrimos:
 * - live / newly_finished (siempre fetch)
 * - finished con y sin lineups (backfill o skip)
 * - scheduled dentro y fuera de la ventana de 2h
 * - staleness check (30 min)
 * - cancelled / postponed
 * - edge cases: kickoff inválido, kickoff en el pasado, exLineupsUpdatedAt inválido
 */

// ============================================================================
// Helpers
// ============================================================================

const NOW_MS = new Date("2026-06-16T18:00:00Z").getTime();
const isoFromOffset = (offsetMs: number) =>
	new Date(NOW_MS + offsetMs).toISOString();
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

function makeInput(
	overrides: Partial<ShouldFetchLineupsInput> = {},
): ShouldFetchLineupsInput {
	return {
		status: "scheduled",
		isNewlyFinished: false,
		kickOff: isoFromOffset(3 * HOUR),
		exLineups: [],
		exLineupsUpdatedAt: null,
		nowMs: NOW_MS,
		...overrides,
	};
}

// ============================================================================
// Constantes
// ============================================================================

describe("constantes de ventana", () => {
	it("LINEUP_FETCH_WINDOW_MS es 2 horas", () => {
		expect(LINEUP_FETCH_WINDOW_MS).toBe(2 * HOUR);
	});

	it("LINEUP_STALE_MS es 30 minutos", () => {
		expect(LINEUP_STALE_MS).toBe(30 * MIN);
	});
});

// ============================================================================
// Estado: live
// ============================================================================

describe("status=live", () => {
	it("siempre fetchea, sin importar exLineups", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "live",
				kickOff: isoFromOffset(3 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-1 * MIN),
			}),
		);
		expect(r).toEqual({ needs: true, reason: "live" });
	});
});

// ============================================================================
// Estado: newly finished
// ============================================================================

describe("isNewlyFinished=true", () => {
	it("siempre fetchea, incluso si kickoff es pasado", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "finished",
				isNewlyFinished: true,
				kickOff: isoFromOffset(-3 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-1 * MIN),
			}),
		);
		expect(r).toEqual({ needs: true, reason: "newly_finished" });
	});
});

// ============================================================================
// Estado: finished (no newly)
// ============================================================================

describe("status=finished (no newly)", () => {
	it("sin lineups previas → backfill", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "finished",
				kickOff: isoFromOffset(-3 * HOUR),
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: true, reason: "finished_backfill" });
	});

	it("con exLineups=null → backfill", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "finished",
				kickOff: isoFromOffset(-3 * HOUR),
				exLineups: null,
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: true, reason: "finished_backfill" });
	});

	it("con 2 lineups previas → no fetchea", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "finished",
				kickOff: isoFromOffset(-3 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-2 * HOUR),
			}),
		);
		expect(r.needs).toBe(false);
		expect(r.reason).toBe("no_window");
	});
});

// ============================================================================
// Estado: cancelled
// ============================================================================

describe("status=cancelled", () => {
	it("nunca fetchea", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "cancelled",
				kickOff: isoFromOffset(30 * MIN),
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: false, reason: "cancelled_or_postponed" });
	});
});

// ============================================================================
// Estado: scheduled — ventana upcoming
// ============================================================================

describe("status=scheduled fuera de ventana", () => {
	it("kickoff en 5h → no_window", () => {
		const r = shouldFetchLineups(
			makeInput({ kickOff: isoFromOffset(5 * HOUR) }),
		);
		expect(r).toEqual({ needs: false, reason: "no_window" });
	});

	it("kickoff en 24h → no_window", () => {
		const r = shouldFetchLineups(
			makeInput({ kickOff: isoFromOffset(24 * HOUR) }),
		);
		expect(r.needs).toBe(false);
		expect(r.reason).toBe("no_window");
	});

	it("kickoff exactamente en 2h (borde superior) → entra en ventana", () => {
		const r = shouldFetchLineups(
			makeInput({ kickOff: isoFromOffset(LINEUP_FETCH_WINDOW_MS) }),
		);
		// Está en el borde: kickOffMs - nowMs === LINEUP_FETCH_WINDOW_MS,
		// no es estrictamente mayor → entra al bloque de "dentro de ventana".
		expect(r.reason).toBe("upcoming_window_stale");
		expect(r.needs).toBe(true);
	});
});

describe("status=scheduled dentro de ventana (sin lineups previas)", () => {
	it("kickoff en 1h, sin exLineupsUpdatedAt → fetchea (stale)", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: true, reason: "upcoming_window_stale" });
	});

	it("kickoff en 30min, sin exLineupsUpdatedAt → fetchea (stale)", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(30 * MIN),
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r.needs).toBe(true);
		expect(r.reason).toBe("upcoming_window_stale");
	});
});

describe("status=scheduled dentro de ventana (con lineups frescas)", () => {
	it("kickoff en 1h, exLineupsUpdatedAt hace 10min → no fetchea (fresh)", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-10 * MIN),
			}),
		);
		expect(r).toEqual({ needs: false, reason: "upcoming_window_fresh" });
	});

	it("kickoff en 1h, exLineupsUpdatedAt hace 29min (justo bajo el límite) → no fetchea", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-(LINEUP_STALE_MS - 1000)),
			}),
		);
		expect(r).toEqual({ needs: false, reason: "upcoming_window_fresh" });
	});
});

describe("status=scheduled dentro de ventana (con lineups stale)", () => {
	it("kickoff en 1h, exLineupsUpdatedAt hace 31min (apenas pasado el límite) → fetchea", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-(LINEUP_STALE_MS + 1000)),
			}),
		);
		expect(r).toEqual({ needs: true, reason: "upcoming_window_stale" });
	});

	it("kickoff en 1h, exLineupsUpdatedAt hace 2h → fetchea (stale)", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: isoFromOffset(-2 * HOUR),
			}),
		);
		expect(r).toEqual({ needs: true, reason: "upcoming_window_stale" });
	});
});

// ============================================================================
// Edge cases
// ============================================================================

describe("edge cases", () => {
	it("kickoff en el pasado (scheduled pero ya empezó) → no_window", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "scheduled",
				kickOff: isoFromOffset(-1 * MIN),
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: false, reason: "no_window" });
	});

	it("kickoff ISO inválido → no_window", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "scheduled",
				kickOff: "not-a-date",
				exLineups: [],
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r.reason).toBe("no_window");
		expect(r.needs).toBe(false);
	});

	it("exLineupsUpdatedAt inválido (NaN) → trata como stale", () => {
		const r = shouldFetchLineups(
			makeInput({
				kickOff: isoFromOffset(1 * HOUR),
				exLineups: [{ team: "A" }, { team: "B" }],
				exLineupsUpdatedAt: "invalid-iso",
			}),
		);
		expect(r).toEqual({ needs: true, reason: "upcoming_window_stale" });
	});

	it("exLineups no es array (objeto raro) → considera sin lineups → backfill si finished", () => {
		const r = shouldFetchLineups(
			makeInput({
				status: "finished",
				kickOff: isoFromOffset(-3 * HOUR),
				// @ts-expect-error: testeamos caso patológico
				exLineups: { something: "weird" },
				exLineupsUpdatedAt: null,
			}),
		);
		expect(r).toEqual({ needs: true, reason: "finished_backfill" });
	});
});
