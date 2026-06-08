import type { Prediction } from "./types";

export interface ScoringResult {
	points: number;
	breakdown: {
		exactScore: boolean;
		goalDifference: boolean;
		correctWinner: boolean;
		penaltyBonus: boolean;
	};
}

export function calculateScore(
	prediction: Pick<
		Prediction,
		"predictedHome" | "predictedAway" | "predictedWinner"
	>,
	actualHome: number,
	actualAway: number,
	actualPenaltyWinner: "home" | "away" | null,
	stageMultiplier = 1,
): ScoringResult {
	const { predictedHome, predictedAway, predictedWinner } = prediction;
	const isExact = predictedHome === actualHome && predictedAway === actualAway;

	const actualWinnerType =
		actualHome > actualAway
			? "home"
			: actualAway > actualHome
				? "away"
				: "draw";

	const predictedWinnerType =
		predictedHome > predictedAway
			? "home"
			: predictedAway > predictedHome
				? "away"
				: "draw";

	const isCorrectDraw =
		actualWinnerType === "draw" && predictedWinnerType === "draw";
	const isCorrectWinner =
		actualWinnerType !== "draw" && actualWinnerType === predictedWinnerType;

	const actualDiff = actualHome - actualAway;
	const predictedDiff = predictedHome - predictedAway;
	const isGoalDifference =
		(isCorrectWinner || isCorrectDraw) &&
		actualDiff === predictedDiff &&
		!isExact;

	let basePoints = 0;
	const breakdown = {
		exactScore: false,
		goalDifference: false,
		correctWinner: false,
		penaltyBonus: false,
	};

	if (isExact) {
		basePoints = 10;
		breakdown.exactScore = true;
	} else if (isGoalDifference) {
		basePoints = 6;
		breakdown.goalDifference = true;
	} else if (isCorrectWinner || isCorrectDraw) {
		basePoints = 3;
		breakdown.correctWinner = true;
	}

	// Multiplicar los puntos base por el factor de la etapa
	let points = basePoints * stageMultiplier;

	// Evaluar el bono de penales (+4 fijos) si corresponde
	// Solo aplica si el partido real y el predicho terminan en empate en los 90/120 minutos
	// y se acierta quién se queda con los penales.
	if (
		actualHome === actualAway &&
		predictedHome === predictedAway &&
		actualPenaltyWinner !== null &&
		predictedWinner === actualPenaltyWinner
	) {
		points += 4;
		breakdown.penaltyBonus = true;
	}

	return { points, breakdown };
}
