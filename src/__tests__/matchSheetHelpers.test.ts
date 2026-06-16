import { describe, expect, it } from "vitest";
import {
	formatPredictionForSharing,
	getPotentialPoints,
	getScoreResultForPrediction,
} from "../lib/predictionHelpers";
import type { Match, Prediction } from "../lib/types";

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: "m1",
		competitionId: "c1",
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-12T18:00:00Z",
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		stageName: "GROUP_STAGE",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
	return {
		id: "p1",
		matchId: "m1",
		userId: "u1",
		tournamentId: "t1",
		predictedHome: 2,
		predictedAway: 1,
		predictedWinner: null,
		pointsEarned: null,
		...overrides,
	};
}

describe("getPotentialPoints", () => {
	it("stageMultiplier=1 → 10/6/3/4", () => {
		expect(getPotentialPoints(1)).toEqual({
			exact: 10,
			goalDiff: 6,
			basic: 3,
			penalty: 4,
		});
	});

	it("stageMultiplier=2 → 20/12/6/4", () => {
		expect(getPotentialPoints(2)).toEqual({
			exact: 20,
			goalDiff: 12,
			basic: 6,
			penalty: 4,
		});
	});

	it("stageMultiplier=0 → 0/0/0/4 (penalty siempre es 4)", () => {
		expect(getPotentialPoints(0)).toEqual({
			exact: 0,
			goalDiff: 0,
			basic: 0,
			penalty: 4,
		});
	});

	it("default sin argumentos → 1", () => {
		expect(getPotentialPoints()).toEqual({
			exact: 10,
			goalDiff: 6,
			basic: 3,
			penalty: 4,
		});
	});

	it("stageMultiplier=3 (knockout) → 30/18/9/4", () => {
		expect(getPotentialPoints(3)).toEqual({
			exact: 30,
			goalDiff: 18,
			basic: 9,
			penalty: 4,
		});
	});
});

describe("getScoreResultForPrediction", () => {
	it("retorna null si el partido no está finished", () => {
		const match = makeMatch({ status: "not_started" });
		const pred = makePrediction();
		expect(getScoreResultForPrediction(pred, match)).toBeNull();
	});

	it("retorna null si el partido está live", () => {
		const match = makeMatch({ status: "live" });
		const pred = makePrediction();
		expect(getScoreResultForPrediction(pred, match)).toBeNull();
	});

	it("retorna null si homeScore es null", () => {
		const match = makeMatch({ status: "finished", homeScore: null });
		const pred = makePrediction();
		expect(getScoreResultForPrediction(pred, match)).toBeNull();
	});

	it("retorna null si awayScore es null", () => {
		const match = makeMatch({ status: "finished", awayScore: null });
		const pred = makePrediction();
		expect(getScoreResultForPrediction(pred, match)).toBeNull();
	});

	it("predicción exacta → 10 puntos (multiplier=1)", () => {
		const match = makeMatch({
			status: "finished",
			homeScore: 2,
			awayScore: 1,
		});
		const pred = makePrediction({ predictedHome: 2, predictedAway: 1 });
		const result = getScoreResultForPrediction(pred, match);
		expect(result).not.toBeNull();
		expect(result?.points).toBe(10);
		expect(result?.breakdown.exactScore).toBe(true);
	});

	it("diferencia de gol correcta → 6 puntos", () => {
		const match = makeMatch({
			status: "finished",
			homeScore: 3,
			awayScore: 1,
		});
		const pred = makePrediction({ predictedHome: 2, predictedAway: 0 });
		const result = getScoreResultForPrediction(pred, match);
		expect(result?.points).toBe(6);
		expect(result?.breakdown.goalDifference).toBe(true);
	});

	it("ganador correcto con diff distinta → 3 puntos", () => {
		// Pred 1-0 (diff 1) vs Real 2-0 (diff 2) — mismo ganador, diff distinta
		const match = makeMatch({
			status: "finished",
			homeScore: 2,
			awayScore: 0,
		});
		const pred = makePrediction({ predictedHome: 1, predictedAway: 0 });
		const result = getScoreResultForPrediction(pred, match);
		expect(result?.points).toBe(3);
		expect(result?.breakdown.correctWinner).toBe(true);
		expect(result?.breakdown.goalDifference).toBe(false);
	});

	it("predicción totalmente incorrecta → 0 puntos", () => {
		const match = makeMatch({
			status: "finished",
			homeScore: 1,
			awayScore: 2,
		});
		const pred = makePrediction({ predictedHome: 2, predictedAway: 1 });
		const result = getScoreResultForPrediction(pred, match);
		expect(result?.points).toBe(0);
	});

	it("aplica stageMultiplier (knockout ×2)", () => {
		const match = makeMatch({
			status: "finished",
			homeScore: 2,
			awayScore: 1,
			stageMultiplier: 2,
		});
		const pred = makePrediction({ predictedHome: 2, predictedAway: 1 });
		const result = getScoreResultForPrediction(pred, match);
		expect(result?.points).toBe(20);
	});

	it("bono de penales (+4) en empate con penaltyWinner correcto (no exacto, no goalDiff)", () => {
		// Pred 2-2 con winner=home (diff 0, isCorrectDraw=true)
		// Real 3-3 con penaltyWinner=home (diff 0, isCorrectDraw=true)
		// isGoalDifference=true (mismo diff 0) → 6 pts
		// penaltyBonus aplica → +4
		// Total: 10 pts
		const match = makeMatch({
			status: "finished",
			homeScore: 3,
			awayScore: 3,
			penaltyWinner: "home",
			stageMultiplier: 1,
		});
		const pred = makePrediction({
			predictedHome: 2,
			predictedAway: 2,
			predictedWinner: "home",
		});
		const result = getScoreResultForPrediction(pred, match);
		expect(result?.points).toBe(10);
		expect(result?.breakdown.goalDifference).toBe(true);
		expect(result?.breakdown.penaltyBonus).toBe(true);
	});
});

describe("formatPredictionForSharing", () => {
	const match = makeMatch({
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		competitionName: "Copa América",
		kickOff: "2026-06-12T18:00:00Z",
	});
	const pred = makePrediction({ predictedHome: 2, predictedAway: 1 });

	it("incluye equipos + score predicho", () => {
		const result = formatPredictionForSharing(
			match,
			pred,
			"Liga de los Amigos",
		);
		expect(result).toContain("Argentina 2 - 1 Brasil");
	});

	it("incluye nombre del torneo", () => {
		const result = formatPredictionForSharing(match, pred, "Mundial 2026");
		expect(result).toContain("Mundial 2026");
	});

	it("incluye hashtag #ProdeAR", () => {
		const result = formatPredictionForSharing(match, pred, "Torneo");
		expect(result).toContain("#ProdeAR");
	});

	it("incluye competición cuando está presente", () => {
		const result = formatPredictionForSharing(match, pred, "Torneo");
		expect(result).toContain("Copa América");
	});

	it("omite competición cuando es undefined", () => {
		const matchNoComp = makeMatch({ competitionName: undefined });
		const result = formatPredictionForSharing(matchNoComp, pred, "Torneo");
		expect(result).not.toContain("🌎");
	});

	it("incluye marcador de fecha y hora", () => {
		const result = formatPredictionForSharing(match, pred, "Torneo");
		expect(result).toContain("📅");
		expect(result).toContain("⏰");
	});

	it("incluye hora en formato HH:MM (24h)", () => {
		const result = formatPredictionForSharing(match, pred, "Torneo");
		// Formato HH:MM con hour12 false
		expect(result).toMatch(/⏰ \d{2}:\d{2}/);
	});

	it("empieza con ⚽ Mi pronóstico", () => {
		const result = formatPredictionForSharing(match, pred, "Torneo");
		expect(result.startsWith("⚽ Mi pronóstico")).toBe(true);
	});
});
