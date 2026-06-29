import { describe, expect, it } from "vitest";
import {
	formatCountdown,
	getMatchDayKey,
	getNextCloseTime,
	getPendingMatches,
	isMatchPredictable,
	PREDICTION_LOCK_OFFSET_MS,
} from "../lib/predictionHelpers";
import type { Match, Prediction } from "../lib/types";

// Helpers para crear Matches y Predictions de prueba
const NOW = new Date("2026-06-12T15:00:00Z").getTime();

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: `match-${Math.random()}`,
		competitionId: "comp-1",
		competitionName: "Copa Test",
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-12T18:00:00Z", // 3h en el futuro
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

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
	return {
		id: `pred-${Math.random()}`,
		matchId: "match-1",
		userId: "user-1",
		tournamentId: "t-1",
		predictedHome: 2,
		predictedAway: 1,
		predictedWinner: null,
		pointsEarned: null,
		...overrides,
	};
}

describe("isMatchPredictable", () => {
	it("retorna true para match not_started con kickOff > 15min en el futuro", () => {
		const match = makeMatch({ kickOff: "2026-06-12T18:00:00Z" });
		expect(isMatchPredictable(match, NOW)).toBe(true);
	});

	it("retorna false si la ventana de pronóstico ya cerró (kickOff - 15min < now)", () => {
		const match = makeMatch({ kickOff: "2026-06-12T15:10:00Z" }); // 10min futuro
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false si la ventana cerró exactamente ahora (kickOff - 15min == now)", () => {
		const match = makeMatch({
			kickOff: new Date(NOW + PREDICTION_LOCK_OFFSET_MS).toISOString(),
		});
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match en vivo", () => {
		const match = makeMatch({ status: "live" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match finalizado", () => {
		const match = makeMatch({ status: "finished" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match cancelado", () => {
		const match = makeMatch({ status: "cancelled" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match postergado", () => {
		const match = makeMatch({ status: "postponed" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	// Sprint "Amistosos Read-Only" 2026-06-29
	it("retorna false para match amistoso (isFriendly=true) aunque sea pronosticable", () => {
		const match = makeMatch({
			isFriendly: true,
			kickOff: "2026-06-12T18:00:00Z", // futuro, would be predictable
		});
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match amistoso en vivo (read-only sigue aplicando)", () => {
		const match = makeMatch({ isFriendly: true, status: "live" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});

	it("retorna false para match amistoso finalizado", () => {
		const match = makeMatch({ isFriendly: true, status: "finished" });
		expect(isMatchPredictable(match, NOW)).toBe(false);
	});
});

describe("getPendingMatches", () => {
	it("retorna count=0 y firstMatch=null si matches es undefined", () => {
		const result = getPendingMatches(undefined, [], NOW);
		expect(result).toEqual({ count: 0, firstMatch: null, allMatches: [] });
	});

	it("retorna count=0 si matches está vacío", () => {
		const result = getPendingMatches([], [], NOW);
		expect(result).toEqual({ count: 0, firstMatch: null, allMatches: [] });
	});

	it("cuenta solo partidos pronosticables SIN predicción", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const m2 = makeMatch({ id: "m2", kickOff: "2026-06-12T20:00:00Z" });
		const m3 = makeMatch({ id: "m3", kickOff: "2026-06-12T22:00:00Z" });
		const result = getPendingMatches([m1, m2, m3], [], NOW);
		expect(result.count).toBe(3);
		expect(result.firstMatch?.id).toBe("m1"); // El de menor kickOff
		expect(result.allMatches).toHaveLength(3);
	});

	it("excluye partidos con predicción del usuario", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const m2 = makeMatch({ id: "m2", kickOff: "2026-06-12T20:00:00Z" });
		const predictions = [makePrediction({ matchId: "m2" })];
		const result = getPendingMatches([m1, m2], predictions, NOW);
		expect(result.count).toBe(1);
		expect(result.firstMatch?.id).toBe("m1");
	});

	it("excluye partidos en vivo aunque no tengan predicción", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const m2 = makeMatch({ id: "m2", status: "live" });
		const result = getPendingMatches([m1, m2], [], NOW);
		expect(result.count).toBe(1);
		expect(result.firstMatch?.id).toBe("m1");
	});

	it("excluye partidos cuya ventana de pronóstico ya cerró", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const m2 = makeMatch({ id: "m2", kickOff: "2026-06-12T15:10:00Z" }); // ventana cerrada
		const result = getPendingMatches([m1, m2], [], NOW);
		expect(result.count).toBe(1);
		expect(result.firstMatch?.id).toBe("m1");
	});

	it("predictions=undefined se trata como 0 predicciones", () => {
		const m1 = makeMatch({ id: "m1" });
		const result = getPendingMatches([m1], undefined, NOW);
		expect(result.count).toBe(1);
	});

	it("ordena allMatches por kickOff ascendente", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T22:00:00Z" });
		const m2 = makeMatch({ id: "m2", kickOff: "2026-06-12T18:00:00Z" });
		const m3 = makeMatch({ id: "m3", kickOff: "2026-06-12T20:00:00Z" });
		const result = getPendingMatches([m1, m2, m3], [], NOW);
		expect(result.allMatches.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
	});
});

describe("getNextCloseTime", () => {
	it("retorna null si matches es undefined", () => {
		expect(getNextCloseTime(undefined, NOW)).toBeNull();
	});

	it("retorna null si matches está vacío", () => {
		expect(getNextCloseTime([], NOW)).toBeNull();
	});

	it("retorna null si todos los matches están en vivo", () => {
		const m1 = makeMatch({ id: "m1", status: "live" });
		const m2 = makeMatch({ id: "m2", status: "live" });
		expect(getNextCloseTime([m1, m2], NOW)).toBeNull();
	});

	it("retorna null si la ventana de pronóstico ya cerró para todos", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T15:10:00Z" });
		expect(getNextCloseTime([m1], NOW)).toBeNull();
	});

	it("retorna el partido con cierre más próximo", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T22:00:00Z" });
		const m2 = makeMatch({ id: "m2", kickOff: "2026-06-12T18:00:00Z" });
		const m3 = makeMatch({ id: "m3", kickOff: "2026-06-12T20:00:00Z" });
		const result = getNextCloseTime([m1, m2, m3], NOW);
		expect(result?.match.id).toBe("m2");
	});

	it("msRemaining es positivo y corresponde a kickOff - 15min - now", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const result = getNextCloseTime([m1], NOW);
		expect(result?.msRemaining).toBeGreaterThan(0);
		// m1 kickOff = NOW + 3h = 10.800.000ms → lock = NOW + 3h - 15min = NOW + 2h 45min = 9.900.000ms
		expect(result?.msRemaining).toBe(
			3 * 60 * 60 * 1000 - PREDICTION_LOCK_OFFSET_MS,
		);
	});

	it("closesAt es un Date válido correspondiente al lock time", () => {
		const m1 = makeMatch({ id: "m1", kickOff: "2026-06-12T18:00:00Z" });
		const result = getNextCloseTime([m1], NOW);
		expect(result?.closesAt).toBeInstanceOf(Date);
		expect(result?.closesAt.getTime()).toBe(
			new Date(m1.kickOff).getTime() - PREDICTION_LOCK_OFFSET_MS,
		);
	});
});

describe("formatCountdown", () => {
	it('formatea >1h como "Xh Ymin"', () => {
		expect(formatCountdown(2 * 60 * 60 * 1000)).toBe("2h 0min");
		expect(formatCountdown(2 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe(
			"2h 30min",
		);
		expect(formatCountdown(5 * 60 * 60 * 1000 + 45 * 60 * 1000)).toBe(
			"5h 45min",
		);
	});

	it('formatea <1h y >0 como "Xmin"', () => {
		// 59min (justo bajo 1h) → "59min"
		expect(formatCountdown(59 * 60 * 1000)).toBe("59min");
		expect(formatCountdown(30 * 60 * 1000)).toBe("30min");
		expect(formatCountdown(1 * 60 * 1000)).toBe("1min");
	});

	it('el boundary de exactamente 1h se formatea como "1h 0min"', () => {
		expect(formatCountdown(60 * 60 * 1000)).toBe("1h 0min");
	});

	it('retorna "Cerrado" para msRemaining <= 0', () => {
		expect(formatCountdown(0)).toBe("Cerrado");
		expect(formatCountdown(-1)).toBe("Cerrado");
		expect(formatCountdown(-1000 * 60)).toBe("Cerrado");
	});

	it("maneja correctamente 23h 59min", () => {
		expect(formatCountdown(23 * 60 * 60 * 1000 + 59 * 60 * 1000)).toBe(
			"23h 59min",
		);
	});
});

describe("getMatchDayKey", () => {
	it("retorna YYYY-MM-DD en timezone local", () => {
		const match = makeMatch({ kickOff: "2026-06-12T03:00:00Z" });
		// El día exacto depende de la TZ del runner, pero al menos verifica formato
		const key = getMatchDayKey(match);
		expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("es consistente con la misma fecha de kickOff", () => {
		const m1 = makeMatch({ kickOff: "2026-06-12T18:00:00Z" });
		const m2 = makeMatch({ kickOff: "2026-06-12T20:00:00Z" });
		// Si están en la misma TZ, deberían ser el mismo día
		const tzOffset = new Date("2026-06-12T18:00:00Z").getTimezoneOffset();
		if (Math.abs(tzOffset) < 12 * 60) {
			// Zonas razonables (no antípodas)
			expect(getMatchDayKey(m1)).toBe(getMatchDayKey(m2));
		}
	});
});
