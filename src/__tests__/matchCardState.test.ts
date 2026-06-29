import { describe, expect, it } from "vitest";
import {
	deriveMatchCardState,
	isMatchCardState,
	MATCH_CARD_STATES,
} from "../lib/matchCardState";
import type { Match } from "../lib/types";

const NOW = new Date("2026-06-12T15:00:00Z").getTime();

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: `match-${Math.random()}`,
		competitionId: "comp-1",
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-12T18:00:00Z",
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "GROUP_STAGE",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

describe("deriveMatchCardState", () => {
	it("not_started + sin predicción + pronosticable → pending_action", () => {
		const match = makeMatch({ kickOff: "2026-06-12T18:00:00Z" });
		expect(deriveMatchCardState(match, false, true, NOW)).toBe(
			"pending_action",
		);
	});

	it("not_started + sin predicción + ventana cerrada → locked", () => {
		const match = makeMatch({ kickOff: "2026-06-12T15:10:00Z" });
		expect(deriveMatchCardState(match, false, false, NOW)).toBe("locked");
	});

	it("not_started + con predicción + pronosticable → predicted_editable", () => {
		const match = makeMatch({ kickOff: "2026-06-12T18:00:00Z" });
		expect(deriveMatchCardState(match, true, true, NOW)).toBe(
			"predicted_editable",
		);
	});

	it("not_started + con predicción + ventana cerrada → predicted_locked", () => {
		const match = makeMatch({ kickOff: "2026-06-12T15:10:00Z" });
		expect(deriveMatchCardState(match, true, false, NOW)).toBe(
			"predicted_locked",
		);
	});

	it("live + sin predicción → live (prioridad sobre isPredictable)", () => {
		const match = makeMatch({ status: "live" });
		expect(deriveMatchCardState(match, false, true, NOW)).toBe("live");
	});

	it("live + con predicción → live", () => {
		const match = makeMatch({ status: "live" });
		expect(deriveMatchCardState(match, true, true, NOW)).toBe("live");
	});

	it("finished + sin predicción → finished", () => {
		const match = makeMatch({ status: "finished" });
		expect(deriveMatchCardState(match, false, false, NOW)).toBe("finished");
	});

	it("finished + con predicción → finished", () => {
		const match = makeMatch({ status: "finished" });
		expect(deriveMatchCardState(match, true, true, NOW)).toBe("finished");
	});

	it("cancelled → locked (sin acción posible)", () => {
		const match = makeMatch({ status: "cancelled" });
		expect(deriveMatchCardState(match, false, false, NOW)).toBe("locked");
	});

	it("postponed → locked (sin acción posible)", () => {
		const match = makeMatch({ status: "postponed" });
		expect(deriveMatchCardState(match, false, false, NOW)).toBe("locked");
	});

	it("cancelled + con predicción → locked", () => {
		const match = makeMatch({ status: "cancelled" });
		expect(deriveMatchCardState(match, true, false, NOW)).toBe("locked");
	});

	it("prioridad: live gana sobre predicted_editable", () => {
		const match = makeMatch({ status: "live" });
		expect(deriveMatchCardState(match, true, true, NOW)).toBe("live");
	});

	it("prioridad: finished gana sobre predicted_locked", () => {
		const match = makeMatch({ status: "finished" });
		expect(deriveMatchCardState(match, true, false, NOW)).toBe("finished");
	});

	it("edge: kickOff exactamente en lock time (no pronosticable)", () => {
		// kickOff - 15min = NOW → ventana cerrada
		const match = makeMatch({
			kickOff: new Date(NOW + 15 * 60 * 1000).toISOString(),
		});
		expect(deriveMatchCardState(match, false, false, NOW)).toBe("locked");
	});

	it("edge: 1ms después del lock time → pronosticable", () => {
		const match = makeMatch({
			kickOff: new Date(NOW + 15 * 60 * 1000 + 1).toISOString(),
		});
		expect(deriveMatchCardState(match, false, true, NOW)).toBe(
			"pending_action",
		);
	});

	it("MATCH_CARD_STATES contiene exactamente los 7 estados (incluye read_only)", () => {
		expect(MATCH_CARD_STATES).toHaveLength(7);
		expect(MATCH_CARD_STATES).toEqual([
			"pending_action",
			"locked",
			"predicted_editable",
			"predicted_locked",
			"live",
			"finished",
			"read_only", // Sprint "Amistosos Read-Only" 2026-06-29
		]);
	});

	// Sprint "Amistosos Read-Only" 2026-06-29
	describe("read_only state (amistosos)", () => {
		it("isFriendly=true + not_started → read_only (gana sobre pending_action)", () => {
			const match = makeMatch({
				isFriendly: true,
				status: "not_started",
				kickOff: "2026-06-12T18:00:00Z", // futuro, pronosticable
			});
			expect(deriveMatchCardState(match, false, true, NOW)).toBe(
				"read_only",
			);
		});

		it("isFriendly=true + live → live (tiene prioridad sobre read_only)", () => {
			const match = makeMatch({ isFriendly: true, status: "live" });
			expect(deriveMatchCardState(match, false, false, NOW)).toBe("live");
		});

		it("isFriendly=true + finished → finished (tiene prioridad sobre read_only)", () => {
			const match = makeMatch({ isFriendly: true, status: "finished" });
			expect(deriveMatchCardState(match, false, false, NOW)).toBe(
				"finished",
			);
		});

		it("isFriendly=true + cancelled → read_only (amistoso gana sobre cancelled)", () => {
			const match = makeMatch({ isFriendly: true, status: "cancelled" });
			expect(deriveMatchCardState(match, false, false, NOW)).toBe(
				"read_only",
			);
		});

		it("isFriendly=false + not_started + pronosticable → pending_action (default)", () => {
			const match = makeMatch({
				isFriendly: false,
				status: "not_started",
				kickOff: "2026-06-12T18:00:00Z",
			});
			expect(deriveMatchCardState(match, false, true, NOW)).toBe(
				"pending_action",
			);
		});
	});

	it("es determinística: mismo input → mismo output (100 iteraciones)", () => {
		const match = makeMatch({ kickOff: "2026-06-12T18:00:00Z" });
		const results = new Set(
			Array.from({ length: 100 }, () =>
				deriveMatchCardState(match, true, true, NOW),
			),
		);
		expect(results.size).toBe(1);
	});
});

describe("isMatchCardState", () => {
	it.each(MATCH_CARD_STATES)("retorna true para estado válido: %s", (state) => {
		expect(isMatchCardState(state)).toBe(true);
	});

	it("retorna false para strings no válidos", () => {
		expect(isMatchCardState("invalid")).toBe(false);
		expect(isMatchCardState("")).toBe(false);
		expect(isMatchCardState("PENDING_ACTION")).toBe(false);
	});
});
