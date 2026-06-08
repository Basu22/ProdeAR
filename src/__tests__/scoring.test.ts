import { describe, expect, it } from "vitest";
import { calculateScore } from "../lib/scoring";

describe("calculateScore (ChampSheep Rules)", () => {
	it("award 10 points for exact score (multiplier x1)", () => {
		const result = calculateScore(
			{ predictedHome: 2, predictedAway: 1, predictedWinner: null },
			2,
			1,
			null,
			1,
		);
		expect(result.points).toBe(10);
		expect(result.breakdown.exactScore).toBe(true);
		expect(result.breakdown.goalDifference).toBe(false);
		expect(result.breakdown.correctWinner).toBe(false);
	});

	it("award 6 points for correct winner and goal difference (multiplier x1)", () => {
		const result = calculateScore(
			{ predictedHome: 2, predictedAway: 1, predictedWinner: null },
			3,
			2,
			null,
			1,
		);
		expect(result.points).toBe(6);
		expect(result.breakdown.goalDifference).toBe(true);
		expect(result.breakdown.exactScore).toBe(false);
		expect(result.breakdown.correctWinner).toBe(false);
	});

	it("award 6 points for correct draw and goal difference (multiplier x1)", () => {
		const result = calculateScore(
			{ predictedHome: 1, predictedAway: 1, predictedWinner: null },
			2,
			2,
			null,
			1,
		);
		expect(result.points).toBe(6);
		expect(result.breakdown.goalDifference).toBe(true);
		expect(result.breakdown.exactScore).toBe(false);
	});

	it("award 3 points for basic correct winner (multiplier x1)", () => {
		const result = calculateScore(
			{ predictedHome: 2, predictedAway: 0, predictedWinner: null },
			3,
			0,
			null,
			1,
		);
		expect(result.points).toBe(3);
		expect(result.breakdown.correctWinner).toBe(true);
		expect(result.breakdown.goalDifference).toBe(false);
	});

	it("apply stage multiplier to base points (Final x6)", () => {
		const exactResult = calculateScore(
			{ predictedHome: 2, predictedAway: 1, predictedWinner: null },
			2,
			1,
			null,
			6,
		);
		expect(exactResult.points).toBe(60); // 10 * 6

		const basicResult = calculateScore(
			{ predictedHome: 2, predictedAway: 0, predictedWinner: null },
			3,
			0,
			null,
			6,
		);
		expect(basicResult.points).toBe(18); // 3 * 6
	});

	it("award +4 penalty bonus for correct shootout winner in draw", () => {
		const result = calculateScore(
			{ predictedHome: 1, predictedAway: 1, predictedWinner: "home" },
			1,
			1,
			"home",
			1,
		);
		expect(result.points).toBe(14); // 10 (exacto) * 1 + 4 (bono penales)
		expect(result.breakdown.exactScore).toBe(true);
		expect(result.breakdown.penaltyBonus).toBe(true);
	});

	it("penalty bonus is NOT multiplied by stage multiplier (Final x6)", () => {
		const result = calculateScore(
			{ predictedHome: 1, predictedAway: 1, predictedWinner: "home" },
			1,
			1,
			"home",
			6,
		);
		expect(result.points).toBe(64); // (10 exacto * 6) + 4 fijos = 64
		expect(result.breakdown.exactScore).toBe(true);
		expect(result.breakdown.penaltyBonus).toBe(true);
	});

	it("do NOT award penalty bonus if shootout winner is wrong", () => {
		const result = calculateScore(
			{ predictedHome: 1, predictedAway: 1, predictedWinner: "home" },
			1,
			1,
			"away",
			1,
		);
		expect(result.points).toBe(10); // solo exact score
		expect(result.breakdown.penaltyBonus).toBe(false);
	});

	it("award 0 points for completely wrong prediction", () => {
		const result = calculateScore(
			{ predictedHome: 0, predictedAway: 2, predictedWinner: null },
			2,
			1,
			null,
			1,
		);
		expect(result.points).toBe(0);
		expect(result.breakdown.exactScore).toBe(false);
		expect(result.breakdown.goalDifference).toBe(false);
		expect(result.breakdown.correctWinner).toBe(false);
		expect(result.breakdown.penaltyBonus).toBe(false);
	});
});
