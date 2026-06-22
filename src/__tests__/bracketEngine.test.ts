/**
 * Tests para `src/lib/bracketEngine.ts`.
 *
 * Sprint 1 — TDD rojo. El módulo `bracketEngine.ts` aún NO existe.
 * Estos tests fallan hasta que se implementen las funciones puras.
 *
 * ============================================================================
 * COBERTURA (15 tests)
 * ============================================================================
 * - resolveRoundOf16     (3 tests): cantidad, slots, TBD
 * - resolveQuarterFinals (2 tests): cantidad R16, sourceMatchId
 * - resolveSemiFinals    (1 test):  cantidad QF
 * - resolveFinal         (1 test):  SF + Final
 * - resolveThirdPlace    (1 test):  perdedores de SF
 * - getWinnerOfBracketMatch (3 tests): score normal, penales, null
 * - propagateBracketWinners (2 tests): cruza con DB, propaga en cadena
 * - getFullBracket       (2 tests): integración, todos TBD
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import {
	getFullBracket,
	getWinnerOfBracketMatch,
	propagateBracketWinners,
	resolveFinal,
	resolveQuarterFinals,
	resolveRoundOf16,
	resolveSemiFinals,
	resolveThirdPlace,
} from "../lib/bracketEngine";
import type { ExtendedBracketMatch, FullBracket } from "../lib/bracketTypes";
import type { Match } from "../lib/types";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crea un GroupTable con standings pre-llenados (sin pasar por getGroupTables).
 * Útil para testear el bracket engine de forma aislada.
 */
function makeGroupTable(
	letter: string,
	standings: Array<{ name: string; pts: number; dg: number; gf: number }>,
): GroupTable {
	return {
		groupName: `Grupo ${letter}`,
		groupLetter: letter,
		standings: standings.map((s) => ({
			teamName: s.name,
			logo: null,
			pj: 3,
			pg: 0,
			pe: 0,
			pp: 0,
			gf: s.gf,
			gc: 0,
			dg: s.dg,
			pts: s.pts,
			isLive: false,
		})),
		liveMatches: [],
	};
}

/**
 * Crea 12 GroupTables con standings básicos para testear el bracket completo.
 * Cada grupo tiene 1°, 2°, 3°, 4° con pts decrecientes.
 */
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
	return groupNames.map((letter, i) =>
		makeGroupTable(letter, [
			{ name: `1°${letter}`, pts: 9, dg: 5, gf: 7 },
			{ name: `2°${letter}`, pts: 6, dg: 2, gf: 4 },
			{ name: `3°${letter}`, pts: 3, dg: -1, gf: 2 },
			{ name: `4°${letter}`, pts: 0, dg: -6, gf: 1 },
		]),
	);
}

/**
 * Crea una BestThirdsTable con 8 terceros (todos califican) + 4 eliminados.
 */
function makeBestThirds(qualifyCount = 8): BestThirdsTable {
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
		pts: 6 - i * 0.1, // monotonically decreasing
		isLive: false,
		groupLetter: String.fromCharCode(65 + (i % 12)),
		qualifies: i < qualifyCount,
		rank: i + 1,
	}));
	return {
		standings,
		qualifyCount,
		cutoffIndex: Math.min(qualifyCount, standings.length) - 1,
	};
}

/**
 * Crea un Match mock con defaults sensatos.
 */
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
		stageName: "Group A",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

// ============================================================================
// resolveRoundOf16
// ============================================================================

describe("resolveRoundOf16", () => {
	it("returns exactly 16 matches from 12 groups + 8 best thirds", () => {
		const result = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		expect(result).toHaveLength(16);
	});

	it("produces matches with slotType: 1st, 2nd, or best3rd", () => {
		const result = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		for (const match of result) {
			expect(["1st", "2nd", "best3rd"]).toContain(match.slotA.slotType);
			expect(["1st", "2nd", "best3rd"]).toContain(match.slotB.slotType);
		}
	});

	it("fills teamName from standings (resolved)", () => {
		const result = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const allTeamNames = result.flatMap((m) => [
			m.slotA.teamName,
			m.slotB.teamName,
		]);
		// Todos los 12 grupos + 8 mejores terceros = 20 equipos únicos, pero pueden repetirse como 1°/2°
		// Verificamos que ningún slot sea null
		for (const name of allTeamNames) {
			expect(name).not.toBeNull();
		}
	});
});

// ============================================================================
// resolveQuarterFinals (produce R16 — Octavos)
// ============================================================================

describe("resolveQuarterFinals", () => {
	it("returns exactly 8 R16 matches", () => {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		expect(r16).toHaveLength(8);
	});

	it("each R16 slot references a R32 source match (sourceMatchId set)", () => {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		for (const match of r16) {
			// Los slots de R16 deben tener sourceMatchId apuntando a un R32
			expect(match.slotA.sourceMatchId).toMatch(/^R32-\d+$/);
			expect(match.slotB.sourceMatchId).toMatch(/^R32-\d+$/);
		}
	});
});

// ============================================================================
// resolveSemiFinals (produce QF — Cuartos)
// ============================================================================

describe("resolveSemiFinals", () => {
	it("returns exactly 4 QF matches", () => {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		const qf = resolveSemiFinals(r16);
		expect(qf).toHaveLength(4);
	});
});

// ============================================================================
// resolveFinal (produce SF + Final)
// ============================================================================

describe("resolveFinal", () => {
	it("returns 2 SF matches and 1 Final match", () => {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		const qf = resolveSemiFinals(r16);
		const { semiMatches, finalMatch } = resolveFinal(qf);
		expect(semiMatches).toHaveLength(2);
		expect(finalMatch).not.toBeNull();
	});
});

// ============================================================================
// resolveThirdPlace
// ============================================================================

describe("resolveThirdPlace", () => {
	it("returns 1 match with SF losers", () => {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		const qf = resolveSemiFinals(r16);
		const { semiMatches } = resolveFinal(qf);
		const thirdPlace = resolveThirdPlace(semiMatches);
		expect(thirdPlace).not.toBeNull();
		expect(thirdPlace.id).toBe("3RD-1");
	});
});

// ============================================================================
// getWinnerOfBracketMatch
// ============================================================================

describe("getWinnerOfBracketMatch", () => {
	it("returns winner when both slots resolved + score", () => {
		const match: ExtendedBracketMatch = {
			id: "R32-1",
			position: 1,
			slotA: {
				slotType: "1st",
				groupLetter: "A",
				bestThirdRank: null,
				teamName: "Argentina",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			slotB: {
				slotType: "2nd",
				groupLetter: "B",
				bestThirdRank: null,
				teamName: "Brasil",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			isComplete: true,
			dbMatchId: "m-1",
			winner: null,
			winnerLogo: null,
			score: { home: 2, away: 1 },
			decidedByPenalties: false,
			bracketPosition: "R32-1",
			stageMultiplier: 2,
		};
		expect(getWinnerOfBracketMatch(match)).toBe("Argentina");
	});

	it("returns null when no score", () => {
		const match: ExtendedBracketMatch = {
			id: "R32-1",
			position: 1,
			slotA: {
				slotType: "1st",
				groupLetter: "A",
				bestThirdRank: null,
				teamName: "Argentina",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			slotB: {
				slotType: "2nd",
				groupLetter: "B",
				bestThirdRank: null,
				teamName: "Brasil",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			isComplete: true,
			dbMatchId: null,
			winner: null,
			winnerLogo: null,
			score: null,
			decidedByPenalties: false,
			bracketPosition: "R32-1",
			stageMultiplier: 2,
		};
		expect(getWinnerOfBracketMatch(match)).toBeNull();
	});

	it("respects penaltyWinner when match ended in draw", () => {
		const match: ExtendedBracketMatch = {
			id: "R32-1",
			position: 1,
			slotA: {
				slotType: "1st",
				groupLetter: "A",
				bestThirdRank: null,
				teamName: "Argentina",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			slotB: {
				slotType: "2nd",
				groupLetter: "B",
				bestThirdRank: null,
				teamName: "Brasil",
				teamLogo: null,
				isLive: false,
				sourceMatchId: null,
				decidedByPenalties: false,
			},
			isComplete: true,
			dbMatchId: "m-1",
			winner: null,
			winnerLogo: null,
			score: { home: 1, away: 1 },
			decidedByPenalties: true,
			bracketPosition: "R32-1",
			stageMultiplier: 2,
		};
		// Para testear penaltyWinner, necesitamos que el match tenga penaltyWinner poblado
		// pero en este test estamos testeando un ExtendedBracketMatch, no un Match de DB.
		// La función debería leer de `match.score` + `decidedByPenalties` flag.
		// Si decidedByPenalties=true pero no hay info de quién ganó, retorna null.
		// (En la práctica, penaltyWinner viene del Match de DB via propagateBracketWinners)
		expect(getWinnerOfBracketMatch(match)).toBeNull();
	});
});

// ============================================================================
// propagateBracketWinners
// ============================================================================

describe("propagateBracketWinners", () => {
	it("fills scores from DB matches and advances winners to next round", () => {
		// 1. Generar un bracket base con todos los slots resueltos
		const baseBracket: FullBracket = getFullBracket(
			[],
			make12GroupTables(),
			makeBestThirds(),
		);

		// 2. Crear 16 matches de DB de R32 (todos con score, sin penales)
		const dbR32Matches: Match[] = baseBracket.rounds[0].matches.map((m, i) =>
			makeMatch({
				id: `db-r32-${i + 1}`,
				homeTeam: m.slotA.teamName ?? "?",
				awayTeam: m.slotB.teamName ?? "?",
				homeScore: 2,
				awayScore: 1,
				penaltyWinner: null,
				stageName: "Round of 32",
				stageMultiplier: 2,
				status: "finished",
				bracketPosition: m.bracketPosition,
			}),
		);

		// 3. Propagar
		const propagated = propagateBracketWinners(dbR32Matches, baseBracket);

		// 4. R32 debe tener scores poblados
		for (const m of propagated.rounds[0].matches) {
			expect(m.score).not.toBeNull();
			expect(m.winner).not.toBeNull();
		}

		// 5. R16 debe tener winners en los slots
		for (const m of propagated.rounds[1].matches) {
			// Si ambos R32 fuentes tienen ganador, el slot debe estar lleno
			const sourceA = propagated.rounds[0].matches.find(
				(x) => x.bracketPosition === m.slotA.sourceMatchId,
			);
			const sourceB = propagated.rounds[0].matches.find(
				(x) => x.bracketPosition === m.slotB.sourceMatchId,
			);
			if (sourceA?.winner && sourceB?.winner) {
				expect(m.slotA.teamName).toBe(sourceA.winner);
				expect(m.slotB.teamName).toBe(sourceB.winner);
			}
		}
	});

	it("propagates through 5 rounds end-to-end and sets champion", () => {
		// Generar bracket estructural
		let bracket: FullBracket = getFullBracket(
			[],
			make12GroupTables(),
			makeBestThirds(),
		);

		// Propagar ronda por ronda (realista con cómo llegan los matches de la API)
		for (let r = 0; r < bracket.rounds.length; r++) {
			const round = bracket.rounds[r];
			if (!round) continue;

			// Crear matches de DB para esta ronda usando los teamNames actuales
			// de los slots (que se llenaron en rondas anteriores por propagación)
			const dbMatchesForRound: Match[] = round.matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "AUTO-A",
					awayTeam: m.slotB.teamName ?? "AUTO-B",
					homeScore: 2,
					awayScore: 1,
					penaltyWinner: null,
					stageName: "Knockout",
					stageMultiplier: m.stageMultiplier,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);

			// Propagar
			bracket = propagateBracketWinners(dbMatchesForRound, bracket);

			// Esta ronda debe tener todos los winners
			expect(bracket.rounds[r]?.completedCount).toBe(round.matches.length);
		}

		// Verificar que el campeón está populado
		expect(bracket.champion).not.toBeNull();
		expect(bracket.runnerUp).not.toBeNull();

		// El campeón debe ser el ganador de la final (F-1)
		const finalMatch = bracket.rounds[4]?.matches[0];
		expect(finalMatch?.winner).toBe(bracket.champion);
	});
});

// ============================================================================
// getFullBracket
// ============================================================================

describe("getFullBracket", () => {
	it("returns complete bracket with 5 rounds + third place match", () => {
		const result = getFullBracket([], make12GroupTables(), makeBestThirds());

		expect(result.rounds).toHaveLength(5);
		expect(result.rounds[0].meta.abbr).toBe("R32");
		expect(result.rounds[0].matches).toHaveLength(16);
		expect(result.rounds[1].meta.abbr).toBe("R16");
		expect(result.rounds[1].matches).toHaveLength(8);
		expect(result.rounds[2].meta.abbr).toBe("QF");
		expect(result.rounds[2].matches).toHaveLength(4);
		expect(result.rounds[3].meta.abbr).toBe("SF");
		expect(result.rounds[3].matches).toHaveLength(2);
		expect(result.rounds[4].meta.abbr).toBe("F");
		expect(result.rounds[4].matches).toHaveLength(1);
		expect(result.thirdPlaceMatch).not.toBeNull();
	});

	it("all matches start with null winner and null score (TBD)", () => {
		const result = getFullBracket([], make12GroupTables(), makeBestThirds());
		for (const round of result.rounds) {
			for (const match of round.matches) {
				expect(match.winner).toBeNull();
				expect(match.score).toBeNull();
				expect(match.decidedByPenalties).toBe(false);
			}
		}
	});
});
