import { describe, expect, it } from "vitest";
import {
	deriveEmptyStateVariant,
	EMPTY_STATE_VARIANTS,
	getEmptyStateCTA,
} from "../lib/emptyStateHelpers";

describe("deriveEmptyStateVariant", () => {
	it("sin partidos hoy, hay en otros días → no_matches_today", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: false,
			hasMatchesInSeason: true,
			allTodayPredicted: false,
			hasPendingCountdown: false,
			nextMatchDay: "2026-06-13",
		});
		expect(result).toBe("no_matches_today");
	});

	it("sin partidos en toda la temporada → no_matches_season", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: false,
			hasMatchesInSeason: false,
			allTodayPredicted: false,
			hasPendingCountdown: false,
			nextMatchDay: null,
		});
		expect(result).toBe("no_matches_season");
	});

	it("hay partidos hoy, todos pronosticados, sin countdown → all_predicted", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: true,
			hasMatchesInSeason: true,
			allTodayPredicted: true,
			hasPendingCountdown: false,
			nextMatchDay: "2026-06-12",
		});
		expect(result).toBe("all_predicted");
	});

	it("hay partidos hoy, todos pronosticados, CON countdown → countdown_only", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: true,
			hasMatchesInSeason: true,
			allTodayPredicted: true,
			hasPendingCountdown: true,
			nextMatchDay: "2026-06-12",
		});
		expect(result).toBe("countdown_only");
	});

	it("prioridad: no_matches_season gana sobre no_matches_today", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: false,
			hasMatchesInSeason: false,
			allTodayPredicted: false,
			hasPendingCountdown: false,
			nextMatchDay: null,
		});
		expect(result).toBe("no_matches_season");
	});

	it("edge: nextMatchDay null pero hasMatchesInSeason true → no_matches_today", () => {
		const result = deriveEmptyStateVariant({
			hasMatchesToday: false,
			hasMatchesInSeason: true,
			allTodayPredicted: false,
			hasPendingCountdown: false,
			nextMatchDay: null,
		});
		expect(result).toBe("no_matches_today");
	});

	it("EMPTY_STATE_VARIANTS contiene los 4 estados", () => {
		expect(EMPTY_STATE_VARIANTS).toHaveLength(4);
		expect(EMPTY_STATE_VARIANTS).toEqual([
			"no_matches_today",
			"no_matches_season",
			"all_predicted",
			"countdown_only",
		]);
	});
});

describe("getEmptyStateCTA", () => {
	it("no_matches_today → 'Ir al próximo día' con action navigate_next_day", () => {
		const cta = getEmptyStateCTA("no_matches_today");
		expect(cta).toEqual({
			label: "Ir al próximo día",
			action: "navigate_next_day",
		});
	});

	it("no_matches_season → null (sin CTA, recomendación QA)", () => {
		const cta = getEmptyStateCTA("no_matches_season");
		expect(cta).toBeNull();
	});

	it("all_predicted → null", () => {
		const cta = getEmptyStateCTA("all_predicted");
		expect(cta).toBeNull();
	});

	it("countdown_only → null", () => {
		const cta = getEmptyStateCTA("countdown_only");
		expect(cta).toBeNull();
	});
});
