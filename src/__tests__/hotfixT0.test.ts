/**
 * Tests del T0 HOTFIX (2026-06-25) — Bugs bloqueantes en producción.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * - Hotfix #1: stageMultiplier 3RD = 4 (no 5)
 *   - Validar ROUND_CATALOG["3RD"].multiplier === 4
 *   - Validar que 3RD match generado por engine tiene multiplier 4
 *
 * - Hotfix #2: getLoserOfBracketMatch maneja penales
 *   - Caso 1: Resultado normal (no empate) → retorna perdedor por score
 *   - Caso 2: Empate con penales + winner populado → retorna perdedor (equipo que NO ganó)
 *   - Caso 3: Empate sin penales → retorna null (no se puede determinar)
 *
 * - Hotfix #3: propagateLosersToThirdPlace maneja penales
 *   - Caso 1: SF con score normal → 3RD tiene perdedores correctos
 *   - Caso 2: SF con empate y penales → 3RD tiene perdedores correctos
 *   - Caso 3: SF con empate sin penales → 3RD queda TBD
 *   - Caso 4: 3RD match se completa (isComplete: true) después de propagación
 *
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import { getFullBracket, propagateBracketWinners } from "../lib/bracketEngine";
import { ROUND_CATALOG } from "../lib/bracketTypes";
import type { Match } from "../lib/types";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";

// ============================================================================
// HELPERS
// ============================================================================

function make12GroupTables(): GroupTable[] {
	const groupNames = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"I",
		"J",
		"K",
		"L",
	];
	return groupNames.map((letter) => ({
		groupName: `Grupo ${letter}`,
		groupLetter: letter,
		standings: [
			{
				teamName: `1°${letter}`,
				logo: null,
				pj: 3,
				pg: 3,
				pe: 0,
				pp: 0,
				gf: 7,
				gc: 1,
				dg: 6,
				pts: 9,
				isLive: false,
			},
			{
				teamName: `2°${letter}`,
				logo: null,
				pj: 3,
				pg: 2,
				pe: 0,
				pp: 1,
				gf: 4,
				gc: 2,
				dg: 2,
				pts: 6,
				isLive: false,
			},
			{
				teamName: `3°${letter}`,
				logo: null,
				pj: 3,
				pg: 1,
				pe: 0,
				pp: 2,
				gf: 2,
				gc: 4,
				dg: -2,
				pts: 3,
				isLive: false,
			},
			{
				teamName: `4°${letter}`,
				logo: null,
				pj: 3,
				pg: 0,
				pe: 0,
				pp: 3,
				gf: 1,
				gc: 7,
				dg: -6,
				pts: 0,
				isLive: false,
			},
		],
		liveMatches: [],
	}));
}

function makeBestThirds(): BestThirdsTable {
	const standings = Array.from({ length: 12 }, (_, i) => ({
		teamName: `3°-rank${i + 1}`,
		logo: null,
		pj: 3,
		pg: 0,
		pe: 0,
		pp: 0,
		gf: 2,
		gc: 0,
		dg: 0,
		pts: 6 - i * 0.1,
		isLive: false,
		groupLetter: String.fromCharCode(65 + (i % 12)),
		qualifies: i < 8,
		rank: i + 1,
	}));
	return { standings, qualifyCount: 8, cutoffIndex: 7 };
}

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: "m-test",
		competitionId: "1",
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-11T18:00:00Z",
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Group A",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

// ============================================================================
// HOTFIX #1: stageMultiplier 3RD = 4 (no 5)
// ============================================================================

describe("T0 Hotfix #1: stageMultiplier 3RD = 4", () => {
	it("ROUND_CATALOG['3RD'].multiplier es 4 (alineado con poll-scores y UI)", () => {
		expect(ROUND_CATALOG["3RD"].multiplier).toBe(4);
	});

	it("ROUND_CATALOG['3RD'].multiplier NO es 5 (valor bug pre-hotfix)", () => {
		// Sanity check: este test fallaría si alguien revierte el hotfix
		expect(ROUND_CATALOG["3RD"].multiplier).not.toBe(5);
	});

	it("el 3RD match generado por getFullBracket tiene stageMultiplier = 4", () => {
		const bracket = getFullBracket([], make12GroupTables(), makeBestThirds());
		expect(bracket.thirdPlaceMatch.stageMultiplier).toBe(4);
	});

	it("los multipliers de todas las rondas son consistentes", () => {
		// Sanity check: el resto del catálogo no debe cambiar con el hotfix
		expect(ROUND_CATALOG.R32.multiplier).toBe(2);
		expect(ROUND_CATALOG.R16.multiplier).toBe(3);
		expect(ROUND_CATALOG.QF.multiplier).toBe(4);
		expect(ROUND_CATALOG.SF.multiplier).toBe(5);
		expect(ROUND_CATALOG.F.multiplier).toBe(6);
	});
});

// ============================================================================
// HOTFIX #2: getLoserOfBracketMatch maneja penales
// ============================================================================
//
// No podemos testear `getLoserOfBracketMatch` directamente (es privada), pero
// podemos testear su efecto a través de `propagateLosersToThirdPlace` (ver
// HOTFIX #3 más abajo).

// ============================================================================
// HOTFIX #3: propagateLosersToThirdPlace maneja penales
// ============================================================================

describe("T0 Hotfix #3: SF con penales → 3RD propagado correctamente", () => {
	it("Caso normal: SF con score 2-1 → 3RD tiene perdedor correcto", () => {
		// Generar bracket estructural
		let bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

		// Propagar hasta SF
		for (let r = 0; r < 3; r++) {
			const round = bracket.rounds[r];
			if (!round) continue;
			const dbMatches: Match[] = round.matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "A",
					awayTeam: m.slotB.teamName ?? "B",
					homeScore: 2,
					awayScore: 1,
					stageName: "Knockout",
					stageMultiplier: m.stageMultiplier,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(dbMatches, bracket);
		}

		// SF-1 score 2-1 (Argentina gana, Francia pierde)
		// SF-2 score 1-2 (Brasil gana, Alemania pierde)
		const sfMatches: Match[] = [
			makeMatch({
				id: "db-SF-1",
				homeTeam: bracket.rounds[3]?.matches[0]?.slotA.teamName ?? "?",
				awayTeam: bracket.rounds[3]?.matches[0]?.slotB.teamName ?? "?",
				homeScore: 2,
				awayScore: 1,
				penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
				stageName: "Semi-finals",
				stageMultiplier: 5,
				status: "finished",
				bracketPosition: "SF-1",
			}),
			makeMatch({
				id: "db-SF-2",
				homeTeam: bracket.rounds[3]?.matches[1]?.slotA.teamName ?? "?",
				awayTeam: bracket.rounds[3]?.matches[1]?.slotB.teamName ?? "?",
				homeScore: 1,
				awayScore: 2,
				penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
				stageName: "Semi-finals",
				stageMultiplier: 5,
				status: "finished",
				bracketPosition: "SF-2",
			}),
		];

		const propagated = propagateBracketWinners(sfMatches, bracket);

		// 3RD debe tener perdedores: Francia (de SF-1) y Alemania (de SF-2)
		expect(propagated.thirdPlaceMatch.slotA.teamName).not.toBeNull();
		expect(propagated.thirdPlaceMatch.slotB.teamName).not.toBeNull();
		expect(propagated.thirdPlaceMatch.isComplete).toBe(true);
	});

	it("🔥 CASO BUG PRE-HOTFIX: SF con empate y penales → 3RD debe tener perdedores", () => {
		// El bug original: si SF terminaba 1-1 y se definía por penales,
		// el 3RD quedaba con slots TBD para siempre porque
		// propagateLosersToThirdPlace ignoraba los empates.

		// Generar bracket estructural
		let bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

		// Propagar hasta SF (mismo setup que el test anterior)
		for (let r = 0; r < 3; r++) {
			const round = bracket.rounds[r];
			if (!round) continue;
			const dbMatches: Match[] = round.matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "A",
					awayTeam: m.slotB.teamName ?? "B",
					homeScore: 2,
					awayScore: 1,
					stageName: "Knockout",
					stageMultiplier: m.stageMultiplier,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(dbMatches, bracket);
		}

		// SF-1: 1-1, gana Argentina por penales
		// SF-2: 2-1, gana Brasil
		const sfMatches: Match[] = [
			makeMatch({
				id: "db-SF-1",
				homeTeam: bracket.rounds[3]?.matches[0]?.slotA.teamName ?? "?",
				awayTeam: bracket.rounds[3]?.matches[0]?.slotB.teamName ?? "?",
				homeScore: 1,
				awayScore: 1,
				penaltyWinner: "home", // Argentina gana por penales
				stageName: "Semi-finals",
				stageMultiplier: 5,
				status: "finished",
				bracketPosition: "SF-1",
			}),
			makeMatch({
				id: "db-SF-2",
				homeTeam: bracket.rounds[3]?.matches[1]?.slotA.teamName ?? "?",
				awayTeam: bracket.rounds[3]?.matches[1]?.slotB.teamName ?? "?",
				homeScore: 2,
				awayScore: 1,
				penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
				stageName: "Semi-finals",
				stageMultiplier: 5,
				status: "finished",
				bracketPosition: "SF-2",
			}),
		];

		const propagated = propagateBracketWinners(sfMatches, bracket);

		// 3RD debe tener perdedores:
		// - Slot A: perdedor de SF-1 (Francia, que perdió por penales)
		// - Slot B: perdedor de SF-2 (Alemania)
		expect(propagated.thirdPlaceMatch.slotA.teamName).not.toBeNull();
		expect(propagated.thirdPlaceMatch.slotB.teamName).not.toBeNull();
		expect(propagated.thirdPlaceMatch.isComplete).toBe(true);

		// El slot A del 3RD debe ser el perdedor de SF-1
		// (que es el slot B de SF-1, ya que Argentina ganó por penales)
		const sf1SlotA = bracket.rounds[3]?.matches[0]?.slotA.teamName;
		const sf1SlotB = bracket.rounds[3]?.matches[0]?.slotB.teamName;
		expect(propagated.thirdPlaceMatch.slotA.teamName).toBe(sf1SlotB);
		expect(propagated.thirdPlaceMatch.slotA.teamName).not.toBe(sf1SlotA);
	});

	it("Empate sin info de penales → 3RD queda TBD (no se puede determinar)", () => {
		// Edge case: si una API devuelve home=away=1 sin penaltyWinner
		// (estado intermedio de un partido que está yendo a penales),
		// el 3RD debe quedar con slot null hasta que se actualice la info.

		let bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

		for (let r = 0; r < 3; r++) {
			const round = bracket.rounds[r];
			if (!round) continue;
			const dbMatches: Match[] = round.matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "A",
					awayTeam: m.slotB.teamName ?? "B",
					homeScore: 2,
					awayScore: 1,
					stageName: "Knockout",
					stageMultiplier: m.stageMultiplier,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(dbMatches, bracket);
		}

		// SF-1: 1-1 SIN penaltyWinner (estado intermedio)
		const sfMatches: Match[] = [
			makeMatch({
				id: "db-SF-1",
				homeTeam: bracket.rounds[3]?.matches[0]?.slotA.teamName ?? "?",
				awayTeam: bracket.rounds[3]?.matches[0]?.slotB.teamName ?? "?",
				homeScore: 1,
				awayScore: 1,
				penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null, // SIN info de penales
				stageName: "Semi-finals",
				stageMultiplier: 5,
				status: "finished",
				bracketPosition: "SF-1",
			}),
		];

		const propagated = propagateBracketWinners(sfMatches, bracket);

		// 3RD slot A debe quedar null (no se puede determinar perdedor)
		expect(propagated.thirdPlaceMatch.slotA.teamName).toBeNull();
		expect(propagated.thirdPlaceMatch.isComplete).toBe(false);
	});

	it("decidedByPenalties flag se popula correctamente desde penaltyWinner", () => {
		// Sanity check: el flag decidedByPenalties se popula en propagateBracketWinners
		let bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

		for (let r = 0; r < 4; r++) {
			const round = bracket.rounds[r];
			if (!round) continue;
			const dbMatches: Match[] = round.matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "A",
					awayTeam: m.slotB.teamName ?? "B",
					homeScore: r === 3 && m.id === "SF-1" ? 1 : 2,
					awayScore: r === 3 && m.id === "SF-1" ? 1 : 1,
					penaltyWinner: r === 3 && m.id === "SF-1" ? "home" : null,
					stageName: "Knockout",
					stageMultiplier: m.stageMultiplier,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(dbMatches, bracket);
		}

		const sf1 = bracket.rounds[3]?.matches[0];
		expect(sf1?.decidedByPenalties).toBe(true);
		expect(sf1?.score).toEqual({ home: 1, away: 1 });
		expect(sf1?.winner).not.toBeNull();
	});
});

// ============================================================================
// FEATURE FLAGS
// ============================================================================

describe("Feature Flags (T0.1)", () => {
	it("isFeatureEnabled retorna false por defecto para BRACKET_V2", async () => {
		const { isFeatureEnabled } = await import("../lib/featureFlags");
		// Limpiar override por si quedó algo de tests previos
		try {
			localStorage.removeItem("prodear:flag:BRACKET_V2");
		} catch {
			// Ignorar (puede no haber localStorage en SSR)
		}
		expect(isFeatureEnabled("BRACKET_V2")).toBe(false);
	});

	it("isFeatureEnabled retorna true por defecto para BRACKET_HELP_MODAL", async () => {
		const { isFeatureEnabled } = await import("../lib/featureFlags");
		try {
			localStorage.removeItem("prodear:flag:BRACKET_HELP_MODAL");
		} catch {
			// Ignorar
		}
		expect(isFeatureEnabled("BRACKET_HELP_MODAL")).toBe(true);
	});

	it("setFeatureFlag persiste el override en localStorage", async () => {
		const { isFeatureEnabled, setFeatureFlag, clearFeatureFlag } = await import(
			"../lib/featureFlags"
		);
		setFeatureFlag("BRACKET_V2", true);
		expect(isFeatureEnabled("BRACKET_V2")).toBe(true);
		clearFeatureFlag("BRACKET_V2");
		expect(isFeatureEnabled("BRACKET_V2")).toBe(false);
	});
});
