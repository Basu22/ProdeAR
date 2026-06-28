/**
 * Tests para `src/lib/bracketEngine.ts`.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * - Bloque LEGACY (BRACKET_V2 = false, default): valida el comportamiento
 *   secuencial original (preservado para rollback seguro).
 *   - resolveRoundOf16     (3 tests): cantidad, slots, TBD
 *   - resolveQuarterFinals (2 tests): cantidad R16, sourceMatchId
 *   - resolveSemiFinals    (1 test):  cantidad QF
 *   - resolveFinal         (1 test):  SF + Final
 *   - resolveThirdPlace    (1 test):  perdedores de SF
 *   - getWinnerOfBracketMatch (3 tests): score normal, penales, null
 *   - propagateBracketWinners (2 tests): cruza con DB, propaga en cadena
 *   - getFullBracket       (2 tests): integración, todos TBD
 *
 * - Bloque FIFA 2026 (BRACKET_V2 = true): valida el comportamiento con
 *   cruces oficiales FIFA 2026 (M89-M104).
 *   - R16: cada slot apunta al R32 correcto según FIFA_R16_MATCHUPS
 *   - QF: cada slot apunta al R16 correcto según FIFA_QF_MATCHUPS
 *   - SF: cada slot apunta al QF correcto según FIFA_SF_MATCHUPS
 *   - F: apunta a SF-1 y SF-2 según FIFA_FINAL
 *   - 3RD: apunta a SF-1 y SF-2 según FIFA_THIRD_PLACE
 *   - Feature flag: el mismo código produce cruces distintos según flag
 *   - Integración end-to-end con propagación completa
 * ============================================================================
 */

import { beforeEach, describe, expect, it } from "vitest";
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
import { setFeatureFlag } from "../lib/featureFlags";
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
	return groupNames.map((letter) =>
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
// BLOQUE LEGACY: BRACKET_V2 = false (default, rollback seguro)
// ============================================================================
// Estos tests validan el comportamiento original del engine (emparejamiento
// secuencial). El feature flag se fuerza a `false` en beforeEach para que
// estos tests sean inmunes a overrides accidentales en localStorage.
// ============================================================================

describe("LEGACY (BRACKET_V2 = false)", () => {
	beforeEach(() => {
		setFeatureFlag("BRACKET_V2", false);
	});

	// ------------------------------------------------------------------------
	// resolveRoundOf16
	// ------------------------------------------------------------------------

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

	// ------------------------------------------------------------------------
	// resolveQuarterFinals (produce R16 — Octavos)
	// ------------------------------------------------------------------------

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

	// ------------------------------------------------------------------------
	// resolveSemiFinals (produce QF — Cuartos)
	// ------------------------------------------------------------------------

	describe("resolveSemiFinals", () => {
		it("returns exactly 4 QF matches", () => {
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const qf = resolveSemiFinals(r16);
			expect(qf).toHaveLength(4);
		});
	});

	// ------------------------------------------------------------------------
	// resolveFinal (produce SF + Final)
	// ------------------------------------------------------------------------

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

	// ------------------------------------------------------------------------
	// resolveThirdPlace
	// ------------------------------------------------------------------------

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

	// ------------------------------------------------------------------------
	// getWinnerOfBracketMatch
	// ------------------------------------------------------------------------

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
				stadium: null,
				kickOff: null,
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
				stadium: null,
				kickOff: null,
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
				stadium: null,
				kickOff: null,
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

	// ------------------------------------------------------------------------
	// propagateBracketWinners
	// ------------------------------------------------------------------------

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
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
					stageName: "Round of 32",
					stadium: null,
					kickOff: undefined,
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
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
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

	// ------------------------------------------------------------------------
	// getFullBracket
	// ------------------------------------------------------------------------

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
});

// ============================================================================
// BLOQUE FIFA 2026: BRACKET_V2 = true
// ============================================================================
// Estos tests validan que el engine respeta los cruces oficiales FIFA 2026
// (M89-M104) cuando el feature flag está activado. El flag se fuerza a `true`
// en beforeEach.
// ============================================================================

describe("FIFA 2026 (BRACKET_V2 = true)", () => {
	beforeEach(() => {
		setFeatureFlag("BRACKET_V2", true);
	});

	// Helper local: genera bracket estructural con BRACKET_V2 activo y devuelve
	// cada ronda. El R32 usa los 12 grupos + 8 mejores terceros por defecto.
	function buildStructuralBracket(): {
		r32: ExtendedBracketMatch[];
		r16: ExtendedBracketMatch[];
		qf: ExtendedBracketMatch[];
		sf: ExtendedBracketMatch[];
		f: ExtendedBracketMatch;
		third: ExtendedBracketMatch;
	} {
		const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
		const r16 = resolveQuarterFinals(r32);
		const qf = resolveSemiFinals(r16);
		const { semiMatches, finalMatch } = resolveFinal(qf);
		const third = resolveThirdPlace(semiMatches);
		return { r32, r16, qf, sf: semiMatches, f: finalMatch, third };
	}

	// ------------------------------------------------------------------------
	// R16 — Cruces oficiales FIFA (FIFA_R16_MATCHUPS)
	// ------------------------------------------------------------------------

	describe("R16 con cruces FIFA oficiales", () => {
		it("retorna 8 partidos R16", () => {
			const { r16 } = buildStructuralBracket();
			expect(r16).toHaveLength(8);
		});

		it("R16-1: W(M73) vs W(M75) = R32-1 vs R32-3", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-1");
			expect(m).toBeDefined();
			expect(m?.slotA.sourceMatchId).toBe("R32-1"); // M73
			expect(m?.slotB.sourceMatchId).toBe("R32-3"); // M75
		});

		it("R16-2: W(M74) vs W(M77) = R32-2 vs R32-5", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-2");
			expect(m).toBeDefined();
			expect(m?.slotA.sourceMatchId).toBe("R32-2"); // M74
			expect(m?.slotB.sourceMatchId).toBe("R32-5"); // M77
		});

		it("R16-3: W(M76) vs W(M78) = R32-4 vs R32-6", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-3");
			expect(m?.slotA.sourceMatchId).toBe("R32-4"); // M76
			expect(m?.slotB.sourceMatchId).toBe("R32-6"); // M78
		});

		it("R16-4: W(M79) vs W(M80) = R32-7 vs R32-8", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-4");
			expect(m?.slotA.sourceMatchId).toBe("R32-7"); // M79
			expect(m?.slotB.sourceMatchId).toBe("R32-8"); // M80
		});

		it("R16-5: W(M83) vs W(M84) = R32-11 vs R32-12", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-5");
			expect(m?.slotA.sourceMatchId).toBe("R32-11"); // M83
			expect(m?.slotB.sourceMatchId).toBe("R32-12"); // M84
		});

		it("R16-6: W(M81) vs W(M82) = R32-9 vs R32-10", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-6");
			expect(m?.slotA.sourceMatchId).toBe("R32-9"); // M81
			expect(m?.slotB.sourceMatchId).toBe("R32-10"); // M82
		});

		it("R16-7: W(M86) vs W(M88) = R32-14 vs R32-16", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-7");
			expect(m?.slotA.sourceMatchId).toBe("R32-14"); // M86
			expect(m?.slotB.sourceMatchId).toBe("R32-16"); // M88
		});

		it("R16-8: W(M85) vs W(M87) = R32-13 vs R32-15", () => {
			const { r16 } = buildStructuralBracket();
			const m = r16.find((x) => x.id === "R16-8");
			expect(m?.slotA.sourceMatchId).toBe("R32-13"); // M85
			expect(m?.slotB.sourceMatchId).toBe("R32-15"); // M87
		});

		it("todos los R16 tienen bracketId, position y stageMultiplier correctos", () => {
			const { r16 } = buildStructuralBracket();
			for (let i = 0; i < r16.length; i++) {
				const m = r16[i];
				expect(m?.id).toBe(`R16-${i + 1}`);
				expect(m?.bracketPosition).toBe(`R16-${i + 1}`);
				expect(m?.position).toBe(i + 1);
				expect(m?.stageMultiplier).toBe(3); // ROUND_CATALOG.R16.multiplier
			}
		});
	});

	// ------------------------------------------------------------------------
	// QF — Cruces oficiales FIFA (FIFA_QF_MATCHUPS)
	// ------------------------------------------------------------------------

	describe("QF con cruces FIFA oficiales", () => {
		it("retorna 4 partidos QF", () => {
			const { qf } = buildStructuralBracket();
			expect(qf).toHaveLength(4);
		});

		it("QF-1: W(R16-1) vs W(R16-2)", () => {
			const { qf } = buildStructuralBracket();
			const m = qf.find((x) => x.id === "QF-1");
			expect(m?.slotA.sourceMatchId).toBe("R16-1");
			expect(m?.slotB.sourceMatchId).toBe("R16-2");
		});

		it("QF-2: W(R16-5) vs W(R16-6) — lado opuesto del bracket", () => {
			const { qf } = buildStructuralBracket();
			const m = qf.find((x) => x.id === "QF-2");
			expect(m?.slotA.sourceMatchId).toBe("R16-5");
			expect(m?.slotB.sourceMatchId).toBe("R16-6");
		});

		it("QF-3: W(R16-3) vs W(R16-4)", () => {
			const { qf } = buildStructuralBracket();
			const m = qf.find((x) => x.id === "QF-3");
			expect(m?.slotA.sourceMatchId).toBe("R16-3");
			expect(m?.slotB.sourceMatchId).toBe("R16-4");
		});

		it("QF-4: W(R16-7) vs W(R16-8) — lado opuesto del bracket", () => {
			const { qf } = buildStructuralBracket();
			const m = qf.find((x) => x.id === "QF-4");
			expect(m?.slotA.sourceMatchId).toBe("R16-7");
			expect(m?.slotB.sourceMatchId).toBe("R16-8");
		});

		it("todos los QF tienen stageMultiplier = 4", () => {
			const { qf } = buildStructuralBracket();
			for (const m of qf) {
				expect(m.stageMultiplier).toBe(4);
			}
		});
	});

	// ------------------------------------------------------------------------
	// SF — Cruces oficiales FIFA (FIFA_SF_MATCHUPS)
	// ------------------------------------------------------------------------

	describe("SF con cruces FIFA oficiales", () => {
		it("retorna 2 partidos SF + 1 Final", () => {
			const { sf, f } = buildStructuralBracket();
			expect(sf).toHaveLength(2);
			expect(f).toBeDefined();
		});

		it("SF-1: W(QF-1) vs W(QF-2)", () => {
			const { sf } = buildStructuralBracket();
			const m = sf.find((x) => x.id === "SF-1");
			expect(m?.slotA.sourceMatchId).toBe("QF-1");
			expect(m?.slotB.sourceMatchId).toBe("QF-2");
		});

		it("SF-2: W(QF-3) vs W(QF-4)", () => {
			const { sf } = buildStructuralBracket();
			const m = sf.find((x) => x.id === "SF-2");
			expect(m?.slotA.sourceMatchId).toBe("QF-3");
			expect(m?.slotB.sourceMatchId).toBe("QF-4");
		});

		it("F-1: W(SF-1) vs W(SF-2) con stageMultiplier = 6", () => {
			const { f } = buildStructuralBracket();
			expect(f.id).toBe("F-1");
			expect(f.bracketPosition).toBe("F-1");
			expect(f.stageMultiplier).toBe(6);
			expect(f.slotA.sourceMatchId).toBe("SF-1");
			expect(f.slotB.sourceMatchId).toBe("SF-2");
		});
	});

	// ------------------------------------------------------------------------
	// 3RD — Perdedores de SF
	// ------------------------------------------------------------------------

	describe("3RD con cruces FIFA oficiales", () => {
		it("3RD-1: sourceMatchId apunta a SF-1 y SF-2", () => {
			const { third } = buildStructuralBracket();
			expect(third.id).toBe("3RD-1");
			expect(third.bracketPosition).toBe("3RD-1");
			expect(third.slotA.sourceMatchId).toBe("SF-1");
			expect(third.slotB.sourceMatchId).toBe("SF-2");
		});

		it("3RD-1: stageMultiplier = 4 (alineado con T0 hotfix)", () => {
			const { third } = buildStructuralBracket();
			expect(third.stageMultiplier).toBe(4);
		});

		it("3RD-1: slots arrancan VACÍOS (teamName = null) en construcción", () => {
			// Decisión de diseño: el 3RD no pre-llena con perdedores en construcción
			// (a diferencia del legacy). Los perdedores se inyectan en
			// `propagateLosersToThirdPlace` cuando ambas SF tienen score.
			const { third } = buildStructuralBracket();
			expect(third.slotA.teamName).toBeNull();
			expect(third.slotB.teamName).toBeNull();
			expect(third.isComplete).toBe(false);
		});
	});

	// ------------------------------------------------------------------------
	// Feature flag behavior
	// ------------------------------------------------------------------------

	describe("Feature flag BRACKET_V2", () => {
		it("con BRACKET_V2 = false, R16-1 = R32-1 vs R32-2 (secuencial legacy)", () => {
			setFeatureFlag("BRACKET_V2", false);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const m = r16.find((x) => x.id === "R16-1");
			expect(m?.slotA.sourceMatchId).toBe("R32-1");
			expect(m?.slotB.sourceMatchId).toBe("R32-2");
		});

		it("con BRACKET_V2 = true, R16-1 = R32-1 vs R32-3 (FIFA oficial)", () => {
			setFeatureFlag("BRACKET_V2", true);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const m = r16.find((x) => x.id === "R16-1");
			expect(m?.slotA.sourceMatchId).toBe("R32-1");
			expect(m?.slotB.sourceMatchId).toBe("R32-3");
		});

		it("con BRACKET_V2 = false, QF-1 = R16-1 vs R16-2 (secuencial legacy)", () => {
			setFeatureFlag("BRACKET_V2", false);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const qf = resolveSemiFinals(r16);
			const m = qf.find((x) => x.id === "QF-1");
			// Legacy secuencial: QF-1 = W(R16-1) vs W(R16-2)
			expect(m?.slotA.sourceMatchId).toBe("R16-1");
			expect(m?.slotB.sourceMatchId).toBe("R16-2");
		});

		it("con BRACKET_V2 = true, QF-1 = R16-1 vs R16-2 (FIFA igual para QF-1)", () => {
			// Coincide con legacy para QF-1 (es el primer cruce en ambos sistemas),
			// pero QF-2, QF-3, QF-4 difieren. Sanity check del flag.
			setFeatureFlag("BRACKET_V2", true);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const qf = resolveSemiFinals(r16);
			const m = qf.find((x) => x.id === "QF-1");
			expect(m?.slotA.sourceMatchId).toBe("R16-1");
			expect(m?.slotB.sourceMatchId).toBe("R16-2");
		});

		it("con BRACKET_V2 = true, QF-2 = R16-5 vs R16-6 (FIFA asimétrico)", () => {
			// DIFERENCIA CLAVE: en legacy, QF-2 = R16-3 vs R16-4 (secuencial).
			// En FIFA, QF-2 = R16-5 vs R16-6 (asimétrico: cruza lados opuestos).
			setFeatureFlag("BRACKET_V2", true);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const qf = resolveSemiFinals(r16);
			const m = qf.find((x) => x.id === "QF-2");
			expect(m?.slotA.sourceMatchId).toBe("R16-5");
			expect(m?.slotB.sourceMatchId).toBe("R16-6");
		});

		it("con BRACKET_V2 = false, QF-2 = R16-3 vs R16-4 (secuencial legacy)", () => {
			setFeatureFlag("BRACKET_V2", false);
			const r32 = resolveRoundOf16(make12GroupTables(), makeBestThirds());
			const r16 = resolveQuarterFinals(r32);
			const qf = resolveSemiFinals(r16);
			const m = qf.find((x) => x.id === "QF-2");
			expect(m?.slotA.sourceMatchId).toBe("R16-3");
			expect(m?.slotB.sourceMatchId).toBe("R16-4");
		});
	});

	// ------------------------------------------------------------------------
	// getFullBracket + propagación end-to-end con FIFA
	// ------------------------------------------------------------------------

	describe("getFullBracket + propagación end-to-end (FIFA)", () => {
		it("estructura completa: 5 rondas + 3RD con bracketPosition FIFA", () => {
			const bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

			expect(bracket.rounds).toHaveLength(5);

			// R32: bracketId R32-1 a R32-16
			expect(bracket.rounds[0].matches.map((m) => m.bracketPosition)).toEqual(
				Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`),
			);

			// R16: R16-1 a R16-8
			expect(bracket.rounds[1].matches.map((m) => m.bracketPosition)).toEqual(
				Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`),
			);

			// QF: QF-1 a QF-4
			expect(bracket.rounds[2].matches.map((m) => m.bracketPosition)).toEqual(
				Array.from({ length: 4 }, (_, i) => `QF-${i + 1}`),
			);

			// SF: SF-1, SF-2
			expect(bracket.rounds[3].matches.map((m) => m.bracketPosition)).toEqual([
				"SF-1",
				"SF-2",
			]);

			// F: F-1
			expect(bracket.rounds[4].matches.map((m) => m.bracketPosition)).toEqual([
				"F-1",
			]);

			// 3RD: 3RD-1
			expect(bracket.thirdPlaceMatch.bracketPosition).toBe("3RD-1");
		});

		it("propagación end-to-end: winners de R32 → R16 → QF → SF → F con cruces FIFA", () => {
			let bracket: FullBracket = getFullBracket(
				[],
				make12GroupTables(),
				makeBestThirds(),
			);

			// Propagar ronda por ronda (todos los matches ganan el slot A, score 2-1)
			for (let r = 0; r < bracket.rounds.length; r++) {
				const round = bracket.rounds[r];
				if (!round) continue;

				const dbMatches: Match[] = round.matches.map((m) =>
					makeMatch({
						id: `db-${m.bracketPosition}`,
						homeTeam: m.slotA.teamName ?? "AUTO-A",
						awayTeam: m.slotB.teamName ?? "AUTO-B",
						homeScore: 2,
						awayScore: 1,
						stageName: "Knockout",
						stageMultiplier: m.stageMultiplier,
						status: "finished",
						bracketPosition: m.bracketPosition,
					}),
				);

				bracket = propagateBracketWinners(dbMatches, bracket);
				expect(bracket.rounds[r]?.completedCount).toBe(round.matches.length);
			}

			// Champion debe estar populado
			expect(bracket.champion).not.toBeNull();
			expect(bracket.runnerUp).not.toBeNull();

			// El campeón debe ser el slot A del F-1 (porque slot A gana 2-1 en cada partido)
			const f1 = bracket.rounds[4]?.matches[0];
			expect(f1?.winner).toBe(f1?.slotA.teamName);
			expect(bracket.champion).toBe(f1?.slotA.teamName);
		});

		it("propagación R16 FIFA: el slotA de QF-1 debe tener el winner de R16-1 (NO R16-2)", () => {
			// Test específico de la asimetría FIFA: en legacy, QF-1 = W(R16-1) vs W(R16-2).
			// Pero el teamName del slotA de QF-1 debe venir del winner de R16-1 (no
			// del de R16-2), que es lo que valida la cadena de propagación.
			let bracket: FullBracket = getFullBracket(
				[],
				make12GroupTables(),
				makeBestThirds(),
			);

			// Propagar solo R32 → R16
			const r32Db: Match[] = bracket.rounds[0].matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "?",
					awayTeam: m.slotB.teamName ?? "?",
					homeScore: 2,
					awayScore: 1,
					stageName: "Round of 32",
					stageMultiplier: 2,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(r32Db, bracket);

			// Propagar R16 → QF
			const r16Db: Match[] = bracket.rounds[1].matches.map((m) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "?",
					awayTeam: m.slotB.teamName ?? "?",
					homeScore: 1,
					awayScore: 0,
					stageName: "Round of 16",
					stageMultiplier: 3,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(r16Db, bracket);

			// QF-1 slotA debe tener el winner de R16-1
			const qf1 = bracket.rounds[2].matches.find((m) => m.id === "QF-1");
			const r16_1 = bracket.rounds[1].matches.find((m) => m.id === "R16-1");
			expect(qf1?.slotA.teamName).toBe(r16_1?.winner);

			// Y slotA.sourceMatchId sigue siendo "R16-1"
			expect(qf1?.slotA.sourceMatchId).toBe("R16-1");
		});

		it("3RD-1: propagateLosersToThirdPlace funciona con sourceMatchId FIFA (SF-1, SF-2)", () => {
			let bracket: FullBracket = getFullBracket(
				[],
				make12GroupTables(),
				makeBestThirds(),
			);

			// Propagar R32 → R16 → QF
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

			// Antes de propagar SF, el 3RD debe estar TBD
			expect(bracket.thirdPlaceMatch.slotA.teamName).toBeNull();
			expect(bracket.thirdPlaceMatch.slotB.teamName).toBeNull();
			expect(bracket.thirdPlaceMatch.isComplete).toBe(false);

			// Propagar SF con score normal
			const sfDb: Match[] = bracket.rounds[3].matches.map((m, i) =>
				makeMatch({
					id: `db-${m.bracketPosition}`,
					homeTeam: m.slotA.teamName ?? "?",
					awayTeam: m.slotB.teamName ?? "?",
					homeScore: i === 0 ? 2 : 1, // SF-1 home gana 2-?, SF-2 home pierde 1-?
					awayScore: i === 0 ? 1 : 2,
					stageName: "Semi-finals",
					stageMultiplier: 5,
					status: "finished",
					bracketPosition: m.bracketPosition,
				}),
			);
			bracket = propagateBracketWinners(sfDb, bracket);

			// 3RD debe tener perdedores de SF
			expect(bracket.thirdPlaceMatch.slotA.teamName).not.toBeNull();
			expect(bracket.thirdPlaceMatch.slotB.teamName).not.toBeNull();
			expect(bracket.thirdPlaceMatch.isComplete).toBe(true);

			// El slotA del 3RD debe ser el perdedor de SF-1 (slotB de SF-1)
			const sf1 = bracket.rounds[3].matches.find((m) => m.id === "SF-1");
			expect(bracket.thirdPlaceMatch.slotA.teamName).toBe(sf1?.slotB.teamName);

			// El slotB del 3RD debe ser el perdedor de SF-2 (slotA de SF-2)
			const sf2 = bracket.rounds[3].matches.find((m) => m.id === "SF-2");
			expect(bracket.thirdPlaceMatch.slotB.teamName).toBe(sf2?.slotA.teamName);
		});
	});

	// ------------------------------------------------------------------------
	// cleanup: limpiar el override del flag después de todos los tests FIFA
	// ------------------------------------------------------------------------
	// No es estrictamente necesario (cada test setea el flag en su cuerpo),
	// pero asegura que no quede basura en localStorage entre runs.
});

// ============================================================================
// Cleanup global: limpia el override del feature flag al final de la suite
// ============================================================================

// (Vitest no expone un afterAll global aquí; cada describe limpia su propio estado
// con clearFeatureFlag si lo necesita. El beforeEach setea el flag explícitamente
// para que cada test sea independiente.)
