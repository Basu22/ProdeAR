/**
 * Tests unitarios para `src/lib/worldCupGroups.ts`.
 *
 * Cobertura:
 * - normalizeTeamName: NFD, lowercase, trim
 * - getGroupLetterFromStage: parseo de "Group A", "Grupo B", etc.
 * - findCanonicalTeam: matching exacto + fuzzy + edge cases
 * - isKnockoutMatch: stageMultiplier + strings
 * - getFlagUrl: URL generation
 * - getGroupTables: live vs finished, ordering, edge cases
 */

import { describe, expect, it } from "vitest";
import {
	BEST_THIRDS_QUALIFY_COUNT,
	BUILT_IN_TEAM_ALIASES,
	calculateBestThirds,
	findCanonicalTeam,
	getFlagUrl,
	getGroupLetterFromStage,
	getGroupTables,
	isKnockoutMatch,
	normalizeTeamName,
	resolveKnockoutMatchups,
	type WorldCupMatch,
} from "../lib/worldCupGroups";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper para crear un Match mock con defaults sensatos.
 * Solo se especifican los campos del test; el resto usa defaults.
 */
function makeMatch(overrides: Partial<WorldCupMatch> = {}): WorldCupMatch {
	return {
		id: "m-test",
		competitionId: "1",
		homeTeam: "México",
		awayTeam: "Corea del Sur",
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
// normalizeTeamName
// ============================================================================

describe("normalizeTeamName", () => {
	it("lowercase + trim", () => {
		expect(normalizeTeamName("  South Korea  ")).toBe("south korea");
		expect(normalizeTeamName("MEXICO")).toBe("mexico");
	});

	it("NFD normalization (strip diacritics)", () => {
		// Türkiye → turkiye (ü → u + combining diaeresis → stripped)
		expect(normalizeTeamName("Türkiye")).toBe("turkiye");
		expect(normalizeTeamName("Países Bajos")).toBe("paises bajos");
		expect(normalizeTeamName("Côte d'Ivoire")).toBe("cote d'ivoire");
	});

	it("preserves apostrophes (only diacritics are stripped)", () => {
		expect(normalizeTeamName("Cote d'Ivoire")).toBe("cote d'ivoire");
	});

	it("preserves ampersands", () => {
		expect(normalizeTeamName("Bosnia & Herzegovina")).toBe(
			"bosnia & herzegovina",
		);
	});

	it("handles empty / whitespace-only strings", () => {
		expect(normalizeTeamName("")).toBe("");
		expect(normalizeTeamName("   ")).toBe("");
	});
});

// ============================================================================
// getGroupLetterFromStage
// ============================================================================

describe("getGroupLetterFromStage", () => {
	it("parses 'Group A' (API-Football format)", () => {
		expect(getGroupLetterFromStage("Group A")).toBe("A");
		expect(getGroupLetterFromStage("Group B")).toBe("B");
		expect(getGroupLetterFromStage("Group L")).toBe("L");
	});

	it("parses 'Grupo A' (Spanish format)", () => {
		expect(getGroupLetterFromStage("Grupo A")).toBe("A");
		expect(getGroupLetterFromStage("Grupo C")).toBe("C");
	});

	it("is case-insensitive", () => {
		expect(getGroupLetterFromStage("group c")).toBe("C");
		expect(getGroupLetterFromStage("GRUPO D")).toBe("D");
	});

	it("returns null for non-group stages", () => {
		expect(getGroupLetterFromStage("Round of 16")).toBeNull();
		expect(getGroupLetterFromStage("Group Stage")).toBeNull();
		expect(getGroupLetterFromStage("Quarter-finals")).toBeNull();
		expect(getGroupLetterFromStage("Final")).toBeNull();
	});

	it("returns null for empty / nullish input", () => {
		expect(getGroupLetterFromStage("")).toBeNull();
		expect(getGroupLetterFromStage(null)).toBeNull();
		expect(getGroupLetterFromStage(undefined)).toBeNull();
	});
});

// ============================================================================
// findCanonicalTeam
// ============================================================================

describe("findCanonicalTeam", () => {
	it("resolves 'South Korea' → Corea del Sur", () => {
		const result = findCanonicalTeam("South Korea");
		expect(result).toEqual({
			groupLetter: "A",
			canonicalName: "Corea del Sur",
			flagCode: "kr",
		});
	});

	it("resolves 'Czechia' → República Checa", () => {
		const result = findCanonicalTeam("Czechia");
		expect(result).toEqual({
			groupLetter: "A",
			canonicalName: "República Checa",
			flagCode: "cz",
		});
	});

	it("resolves 'Cote d'Ivoire' → Costa de Marfil", () => {
		const result = findCanonicalTeam("Cote d'Ivoire");
		expect(result).toEqual({
			groupLetter: "E",
			canonicalName: "Costa de Marfil",
			flagCode: "ci",
		});
	});

	it("resolves 'USA' → Estados Unidos", () => {
		const result = findCanonicalTeam("USA");
		expect(result?.canonicalName).toBe("Estados Unidos");
		expect(result?.groupLetter).toBe("D");
	});

	it("resolves 'Türkiye' (with diacritic) via NFD normalization", () => {
		const result = findCanonicalTeam("Türkiye");
		expect(result?.canonicalName).toBe("Turquía");
		expect(result?.groupLetter).toBe("D");
	});

	it("resolves 'Bosnia & Herzegovina' (with ampersand)", () => {
		const result = findCanonicalTeam("Bosnia & Herzegovina");
		expect(result?.canonicalName).toBe("Bosnia y Herzegovina");
		expect(result?.groupLetter).toBe("B");
	});

	it("resolves 'Cape Verde Islands' (long form)", () => {
		const result = findCanonicalTeam("Cape Verde Islands");
		expect(result?.canonicalName).toBe("Cabo Verde");
		expect(result?.groupLetter).toBe("H");
	});

	it("resolves 'Cape Verde' (short form)", () => {
		const result = findCanonicalTeam("Cape Verde");
		expect(result?.canonicalName).toBe("Cabo Verde");
		expect(result?.groupLetter).toBe("H");
	});

	it("resolves 'England' → Inglaterra (special flag code)", () => {
		const result = findCanonicalTeam("England");
		expect(result?.canonicalName).toBe("Inglaterra");
		expect(result?.flagCode).toBe("gb-eng");
	});

	it("is case-insensitive", () => {
		expect(findCanonicalTeam("BRAZIL")?.canonicalName).toBe("Brasil");
		expect(findCanonicalTeam("mexico")?.canonicalName).toBe("México");
	});

	it("trims whitespace", () => {
		expect(findCanonicalTeam("  Argentina  ")?.canonicalName).toBe("Argentina");
	});

	it("returns null for unknown teams", () => {
		expect(findCanonicalTeam("Atlantis FC")).toBeNull();
		expect(findCanonicalTeam("Equipo Inexistente 2027")).toBeNull();
	});

	it("returns null for nullish / empty input", () => {
		expect(findCanonicalTeam("")).toBeNull();
		expect(findCanonicalTeam(null)).toBeNull();
		expect(findCanonicalTeam(undefined)).toBeNull();
	});

	it("accepts custom aliases array (DB-driven)", () => {
		const customAliases = [
			{
				canonicalName: "Custom Team",
				alias: "Custom Team",
				groupLetter: "X",
				flagCode: "xx",
			},
		];
		const result = findCanonicalTeam("Custom Team", customAliases);
		expect(result?.canonicalName).toBe("Custom Team");
	});

	it("falls back to BUILT_IN_TEAM_ALIASES when no aliases provided", () => {
		// Verifica que el default es BUILT_IN_TEAM_ALIASES
		expect(BUILT_IN_TEAM_ALIASES.length).toBeGreaterThan(0);
		expect(findCanonicalTeam("Argentina")?.canonicalName).toBe("Argentina");
	});
});

// ============================================================================
// isKnockoutMatch
// ============================================================================

describe("isKnockoutMatch", () => {
	it("returns true when stageMultiplier > 1", () => {
		const m = makeMatch({ stageMultiplier: 2, stageName: "Round of 32" });
		expect(isKnockoutMatch(m)).toBe(true);

		const m2 = makeMatch({ stageMultiplier: 6, stageName: "Final" });
		expect(isKnockoutMatch(m2)).toBe(true);
	});

	it("returns true for stageMultiplier === 1 + knockout strings", () => {
		expect(isKnockoutMatch(makeMatch({ stageName: "Round of 16" }))).toBe(true);
		expect(isKnockoutMatch(makeMatch({ stageName: "Quarter-finals" }))).toBe(
			true,
		);
		expect(isKnockoutMatch(makeMatch({ stageName: "Semi-finals" }))).toBe(true);
		expect(isKnockoutMatch(makeMatch({ stageName: "Final" }))).toBe(true);
		expect(isKnockoutMatch(makeMatch({ stageName: "Dieciseisavos" }))).toBe(
			true,
		);
		expect(isKnockoutMatch(makeMatch({ stageName: "Octavos de final" }))).toBe(
			true,
		);
	});

	it("returns false for group-stage matches", () => {
		expect(isKnockoutMatch(makeMatch({ stageName: "Group A" }))).toBe(false);
		expect(isKnockoutMatch(makeMatch({ stageName: "Grupo B" }))).toBe(false);
		expect(isKnockoutMatch(makeMatch({ stageName: "Group Stage" }))).toBe(
			false,
		);
	});

	// Sprint "Full Bracket": partido por el 3er puesto
	it("returns true for 'Third Place' (English)", () => {
		expect(isKnockoutMatch(makeMatch({ stageName: "Third Place" }))).toBe(true);
	});

	it("returns true for 'Tercer Puesto' (Spanish, case-insensitive)", () => {
		expect(isKnockoutMatch(makeMatch({ stageName: "Tercer Puesto" }))).toBe(true);
		expect(isKnockoutMatch(makeMatch({ stageName: "tercer puesto" }))).toBe(true);
	});

	it("handles empty stageName", () => {
		expect(isKnockoutMatch(makeMatch({ stageName: "" }))).toBe(false);
	});
});

// ============================================================================
// getFlagUrl
// ============================================================================

describe("getFlagUrl", () => {
	it("generates URL from flag code", () => {
		expect(getFlagUrl("mx")).toBe("https://flagcdn.com/w40/mx.png");
		expect(getFlagUrl("gb-eng")).toBe("https://flagcdn.com/w40/gb-eng.png");
	});

	it("returns null for nullish input", () => {
		expect(getFlagUrl(null)).toBeNull();
		expect(getFlagUrl(undefined)).toBeNull();
		expect(getFlagUrl("")).toBeNull();
	});
});

// ============================================================================
// getGroupTables — FIX BUG: live matches ahora cuentan
// ============================================================================

describe("getGroupTables", () => {
	it("returns empty array if no matches", () => {
		const result = getGroupTables([]);
		expect(result).toHaveLength(12); // Los 12 grupos se inicializan vacíos
		for (const group of result) {
			expect(group.standings).toHaveLength(4);
			for (const s of group.standings) {
				expect(s.pj).toBe(0);
				expect(s.pts).toBe(0);
			}
		}
	});

	it("counts FINISHED matches in pts/pg/pe/pp", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 1,
				status: "finished",
			}),
		];

		const tables = getGroupTables(matches);
		const groupA = tables.find((g) => g.groupName === "Grupo A");
		expect(groupA).toBeDefined();

		const mexico = groupA?.standings.find((s) => s.teamName === "México");
		expect(mexico?.pj).toBe(1);
		expect(mexico?.pg).toBe(1);
		expect(mexico?.pts).toBe(3);
		expect(mexico?.gf).toBe(2);
		expect(mexico?.gc).toBe(1);
		expect(mexico?.dg).toBe(1);
		expect(mexico?.isLive).toBe(false);

		const corea = groupA?.standings.find((s) => s.teamName === "Corea del Sur");
		expect(corea?.pj).toBe(1);
		expect(corea?.pp).toBe(1);
		expect(corea?.pts).toBe(0);
		expect(corea?.gf).toBe(1);
		expect(corea?.gc).toBe(2);
		expect(corea?.dg).toBe(-1);
	});

	it("counts LIVE matches with projected points (same as finished)", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 0,
				status: "live",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		expect(mexico?.pj).toBe(1);
		expect(mexico?.gf).toBe(1);
		expect(mexico?.gc).toBe(0);
		expect(mexico?.dg).toBe(1);
		expect(mexico?.pts).toBe(3);
		expect(mexico?.pg).toBe(1);
		expect(mexico?.isLive).toBe(true);

		const corea = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "Corea del Sur");

		expect(corea?.pts).toBe(0);
		expect(corea?.pp).toBe(1);
		expect(corea?.isLive).toBe(true);
	});

	it("LIVE match 0-0 assigns projected draw points (1 pt each)", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Sudáfrica",
				homeScore: 0,
				awayScore: 0,
				status: "live",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		expect(mexico?.pj).toBe(1);
		expect(mexico?.gf).toBe(0);
		expect(mexico?.gc).toBe(0);
		expect(mexico?.dg).toBe(0);
		expect(mexico?.pts).toBe(1);
		expect(mexico?.pe).toBe(1);
		expect(mexico?.isLive).toBe(true);
	});

	it("aggregates stats across multiple matches (some live, some finished)", () => {
		const matches: WorldCupMatch[] = [
			// Finished: México 2-1 Corea
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 1,
				status: "finished",
			}),
			// Live: México 1-0 Sudáfrica
			makeMatch({
				id: "m2",
				homeTeam: "México",
				awayTeam: "Sudáfrica",
				homeScore: 1,
				awayScore: 0,
				status: "live",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		// México: 1 finished (3 pts) + 1 live winning (3 pts projected) = 6 pts total
		expect(mexico?.pj).toBe(2);
		expect(mexico?.pts).toBe(6);
		expect(mexico?.pg).toBe(2);
		expect(mexico?.gf).toBe(3); // 2 + 1
		expect(mexico?.gc).toBe(1); // 1 + 0
		expect(mexico?.dg).toBe(2);
		expect(mexico?.isLive).toBe(true);
	});

	it("orders standings by pts > dg > gf > nombre", () => {
		const matches: WorldCupMatch[] = [
			// México gana 2-0
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Sudáfrica",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
			// Corea gana 3-0
			makeMatch({
				id: "m2",
				homeTeam: "Corea del Sur",
				awayTeam: "República Checa",
				homeScore: 3,
				awayScore: 0,
				status: "finished",
			}),
			// Empate 1-1
			makeMatch({
				id: "m3",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 1,
				status: "finished",
			}),
		];

		const tables = getGroupTables(matches);
		const groupA = tables.find((g) => g.groupName === "Grupo A");
		const order = groupA?.standings.map((s) => s.teamName);

		// México: 1W + 1D = 4 pts, GF=3, GC=2, DG=+1
		// Corea: 1W + 1D = 4 pts, GF=4, GC=2, DG=+2
		// SAF: 1L = 0 pts, GF=0, GC=2, DG=-2
		// CZE: 1L = 0 pts, GF=0, GC=3, DG=-3
		// Orden esperado: Corea (4,+2,4) > México (4,+1,3) > SAF (0,-2,0) > CZE (0,-3,0)
		expect(order).toEqual([
			"Corea del Sur",
			"México",
			"Sudáfrica",
			"República Checa",
		]);
	});

	it("ignores knockout matches (Dieciseisavos, Cuartos, etc.)", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m-ko",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 3,
				awayScore: 0,
				status: "finished",
				stageName: "Round of 32",
				stageMultiplier: 2,
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		// KO match ignorado → México sigue con 0 pts
		expect(mexico?.pj).toBe(0);
		expect(mexico?.pts).toBe(0);
	});

	it("ignores not_started matches (sin score)", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: null,
				awayScore: null,
				status: "not_started",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		expect(mexico?.pj).toBe(0);
	});

	it("ignores cancelled / postponed matches", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 0,
				awayScore: 0,
				status: "cancelled",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		expect(mexico?.pj).toBe(0);
	});

	it("includes liveMatches in the GroupTable for UI to render mini-scoreboard", () => {
		const liveMatch = makeMatch({
			id: "m-live",
			homeTeam: "México",
			awayTeam: "Corea del Sur",
			homeScore: 1,
			awayScore: 0,
			status: "live",
			minute: 45,
		});
		const matches: WorldCupMatch[] = [liveMatch];

		const tables = getGroupTables(matches);
		const groupA = tables.find((g) => g.groupName === "Grupo A");

		expect(groupA?.liveMatches).toHaveLength(1);
		expect(groupA?.liveMatches[0].id).toBe("m-live");
	});

	it("uses match.groupLetter (server-side) when present, no fuzzy needed", () => {
		// match.groupLetter del DB, sin necesidad de parsear stageName
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "Argentina",
				awayTeam: "Argelia",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
				stageName: "Group J - 1", // formato raro que NO matchearía con regex
				groupLetter: "J", // pero groupLetter del DB es "J"
			}),
		];

		const tables = getGroupTables(matches);
		const groupJ = tables.find((g) => g.groupName === "Grupo J");
		const argentina = groupJ?.standings.find((s) => s.teamName === "Argentina");

		expect(argentina?.pj).toBe(1);
		expect(argentina?.pts).toBe(3);
	});

	it("uses match.homeTeamCanonical/awayTeamCanonical when present", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "Mexico", // nombre crudo de la API
				awayTeam: "South Korea",
				homeScore: 1,
				awayScore: 0,
				status: "finished",
				homeTeamCanonical: "México", // canonical del server
				awayTeamCanonical: "Corea del Sur",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");

		expect(mexico?.pj).toBe(1);
		expect(mexico?.pts).toBe(3);
	});

	it("returns 12 groups sorted alphabetically (A → L)", () => {
		const tables = getGroupTables([]);
		expect(tables).toHaveLength(12);
		const names = tables.map((g) => g.groupName);
		expect(names).toEqual([
			"Grupo A",
			"Grupo B",
			"Grupo C",
			"Grupo D",
			"Grupo E",
			"Grupo F",
			"Grupo G",
			"Grupo H",
			"Grupo I",
			"Grupo J",
			"Grupo K",
			"Grupo L",
		]);
	});

	it("each group has exactly 4 teams", () => {
		const tables = getGroupTables([]);
		for (const g of tables) {
			expect(g.standings).toHaveLength(4);
		}
	});

	it("initializes logos from COUNTRY_FLAGS (flagcdn URLs)", () => {
		const tables = getGroupTables([]);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");
		expect(mexico?.logo).toBe("https://flagcdn.com/w40/mx.png");
	});

	it("falls back to match.homeLogo/match.awayLogo when no flag CDN match", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 0,
				status: "finished",
				homeLogo: "https://media.api-sports.io/football/teams/123.png",
				awayLogo: "https://media.api-sports.io/football/teams/456.png",
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");
		// México ya tiene logo de flagcdn, no se sobreescribe
		expect(mexico?.logo).toBe("https://flagcdn.com/w40/mx.png");
	});

	it("ignores matches from non-group stages (Group Stage sin letra)", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 0,
				status: "finished",
				stageName: "Group Stage", // sin letra → no matchea
			}),
		];

		const tables = getGroupTables(matches);
		const mexico = tables
			.find((g) => g.groupName === "Grupo A")
			?.standings.find((s) => s.teamName === "México");
		expect(mexico?.pj).toBe(0);
	});
});

// ============================================================================
// calculateBestThirds
// ============================================================================

describe("calculateBestThirds", () => {
	/**
	 * Helper: crea 12 GroupTable mock con un "tercer lugar" específico por grupo.
	 * Para simplificar, todos los terceros tienen los mismos stats; ajustamos
	 * per-group según el test.
	 */
	function makeGroupTablesWithThirds(
		thirds: Array<{
			groupLetter: string;
			teamName: string;
			pts: number;
			dg: number;
			gf: number;
		}>,
	) {
		// Construir 12 grupos, asignando el third provisto al índice 2
		return thirds.map((t) => {
			const otherTeams = [
				{
					teamName: `${t.teamName} (1°)`,
					pts: 9,
					dg: 5,
					gf: 6,
					gc: 1,
					pj: 3,
					pg: 3,
					pe: 0,
					pp: 0,
					isLive: false,
					logo: null,
				},
				{
					teamName: `${t.teamName} (2°)`,
					pts: 6,
					dg: 2,
					gf: 4,
					gc: 2,
					pj: 3,
					pg: 2,
					pe: 0,
					pp: 1,
					isLive: false,
					logo: null,
				},
				{
					teamName: t.teamName,
					pts: t.pts,
					dg: t.dg,
					gf: t.gf,
					gc: 0,
					pj: 3,
					pg: 0,
					pe: 0,
					pp: 3,
					isLive: false,
					logo: null,
				},
				{
					teamName: `${t.teamName} (4°)`,
					pts: 0,
					dg: -10,
					gf: 0,
					gc: 10,
					pj: 3,
					pg: 0,
					pe: 0,
					pp: 3,
					isLive: false,
					logo: null,
				},
			];
			return {
				groupName: `Grupo ${t.groupLetter}`,
				groupLetter: t.groupLetter,
				standings: otherTeams,
				liveMatches: [],
			};
		});
	}

	it("extrae los 12 terceros (uno por grupo) en orden de mejor a peor", () => {
		const groupTables = makeGroupTablesWithThirds(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i), // A-L
				teamName: `Team ${i + 1}`,
				pts: 12 - i, // 12, 11, 10, ... 1
				dg: 0,
				gf: 0,
			})),
		);

		const result = calculateBestThirds(groupTables);

		expect(result.standings).toHaveLength(12);
		expect(result.standings[0].teamName).toBe("Team 1"); // 12 pts
		expect(result.standings[0].groupLetter).toBe("A");
		expect(result.standings[11].teamName).toBe("Team 12"); // 1 pt
		expect(result.standings[11].groupLetter).toBe("L");
	});

	it("marca los primeros 8 como qualifies=true y los últimos 4 como false", () => {
		const groupTables = makeGroupTablesWithThirds(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				teamName: `Team ${i + 1}`,
				pts: 12 - i,
				dg: 0,
				gf: 0,
			})),
		);

		const result = calculateBestThirds(groupTables);

		for (let i = 0; i < 8; i++) {
			expect(result.standings[i].qualifies).toBe(true);
		}
		for (let i = 8; i < 12; i++) {
			expect(result.standings[i].qualifies).toBe(false);
		}
	});

	it("asigna ranks secuenciales (1 al 12)", () => {
		const groupTables = makeGroupTablesWithThirds(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				teamName: `Team ${i + 1}`,
				pts: 12 - i,
				dg: 0,
				gf: 0,
			})),
		);

		const result = calculateBestThirds(groupTables);

		result.standings.forEach((s, i) => {
			expect(s.rank).toBe(i + 1);
		});
	});

	it("ordena por puntos descendentes", () => {
		const groupTables = makeGroupTablesWithThirds([
			{ groupLetter: "A", teamName: "México", pts: 6, dg: 5, gf: 5 },
			{ groupLetter: "B", teamName: "Argentina", pts: 3, dg: 2, gf: 3 },
			{ groupLetter: "C", teamName: "Brasil", pts: 9, dg: 8, gf: 8 },
		]);

		const result = calculateBestThirds(groupTables);

		expect(result.standings[0].teamName).toBe("Brasil"); // 9 pts
		expect(result.standings[1].teamName).toBe("México"); // 6 pts
		expect(result.standings[2].teamName).toBe("Argentina"); // 3 pts
	});

	it("usa diferencia de gol como desempate (mismos pts)", () => {
		const groupTables = makeGroupTablesWithThirds([
			{ groupLetter: "A", teamName: "México", pts: 6, dg: 1, gf: 3 },
			{ groupLetter: "B", teamName: "Argentina", pts: 6, dg: 5, gf: 6 },
			{ groupLetter: "C", teamName: "Brasil", pts: 6, dg: -1, gf: 2 },
		]);

		const result = calculateBestThirds(groupTables);

		// Todos 6pts, sort por DG: Arg (+5) > Mex (+1) > Bra (-1)
		expect(result.standings[0].teamName).toBe("Argentina");
		expect(result.standings[1].teamName).toBe("México");
		expect(result.standings[2].teamName).toBe("Brasil");
	});

	it("usa goles a favor como desempate final (mismos pts y DG)", () => {
		const groupTables = makeGroupTablesWithThirds([
			{ groupLetter: "A", teamName: "México", pts: 6, dg: 2, gf: 4 },
			{ groupLetter: "B", teamName: "Argentina", pts: 6, dg: 2, gf: 6 },
		]);

		const result = calculateBestThirds(groupTables);

		// Mismos pts, mismos DG → sort por GF: Arg (6) > Mex (4)
		expect(result.standings[0].teamName).toBe("Argentina");
		expect(result.standings[1].teamName).toBe("México");
	});

	it("permite customize qualifyCount (default = 8)", () => {
		const groupTables = makeGroupTablesWithThirds(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				teamName: `Team ${i + 1}`,
				pts: 12 - i,
				dg: 0,
				gf: 0,
			})),
		);

		const result = calculateBestThirds(groupTables, 6);

		expect(result.qualifyCount).toBe(6);
		expect(result.cutoffIndex).toBe(5);
		for (let i = 0; i < 6; i++) {
			expect(result.standings[i].qualifies).toBe(true);
		}
		for (let i = 6; i < 12; i++) {
			expect(result.standings[i].qualifies).toBe(false);
		}
	});

	it("BEST_THIRDS_QUALIFY_COUNT exporta el valor correcto (8)", () => {
		expect(BEST_THIRDS_QUALIFY_COUNT).toBe(8);
	});

	it("maneja groupTables vacío (sin grupos)", () => {
		const result = calculateBestThirds([]);
		expect(result.standings).toHaveLength(0);
		expect(result.qualifyCount).toBe(8);
	});

	it("preserva el groupLetter del grupo original", () => {
		const groupTables = makeGroupTablesWithThirds([
			{ groupLetter: "J", teamName: "Argentina", pts: 6, dg: 0, gf: 0 },
		]);

		const result = calculateBestThirds(groupTables);
		expect(result.standings[0].groupLetter).toBe("J");
	});
});

// ============================================================================
// resolveKnockoutMatchups
// ============================================================================

describe("resolveKnockoutMatchups", () => {
	/**
	 * Helper: crea 12 GroupTable mock con 1° y 2° definidos para tests de bracket.
	 */
	function makeGroupTablesWithTop2(
		top2PerGroup: Array<{
			groupLetter: string;
			first: string;
			second: string;
		}>,
	) {
		return top2PerGroup.map(({ groupLetter, first, second }) => {
			const standings = [
				{
					teamName: first,
					pts: 9,
					dg: 5,
					gf: 6,
					gc: 1,
					pj: 3,
					pg: 3,
					pe: 0,
					pp: 0,
					isLive: false,
					logo: null,
				},
				{
					teamName: second,
					pts: 6,
					dg: 2,
					gf: 4,
					gc: 2,
					pj: 3,
					pg: 2,
					pe: 0,
					pp: 1,
					isLive: false,
					logo: null,
				},
				{
					teamName: "Third",
					pts: 3,
					dg: 0,
					gf: 2,
					gc: 2,
					pj: 3,
					pg: 1,
					pe: 0,
					pp: 2,
					isLive: false,
					logo: null,
				},
				{
					teamName: "Fourth",
					pts: 0,
					dg: -7,
					gf: 0,
					gc: 7,
					pj: 3,
					pg: 0,
					pe: 0,
					pp: 3,
					isLive: false,
					logo: null,
				},
			];
			return {
				groupName: `Grupo ${groupLetter}`,
				groupLetter,
				standings,
				liveMatches: [],
			};
		});
	}

	it("genera 16 partidos en Dieciseisavos", () => {
		const groupTables = makeGroupTablesWithTop2(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				first: `1° of ${String.fromCharCode(65 + i)}`,
				second: `2° of ${String.fromCharCode(65 + i)}`,
			})),
		);
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		expect(bracket.matches).toHaveLength(16);
		expect(bracket.totalMatches).toBe(16);
		expect(bracket.roundName).toBe("Dieciseisavos de final");
	});

	it("partidos 1-12 son 1° vs 2° de grupos adyacentes (pares)", () => {
		const groupTables = makeGroupTablesWithTop2([
			{ groupLetter: "A", first: "México", second: "Corea" },
			{ groupLetter: "B", first: "Canadá", second: "Suiza" },
			{ groupLetter: "C", first: "Brasil", second: "Marruecos" },
			{ groupLetter: "D", first: "USA", second: "Paraguay" },
		]);
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		// Match 1: 1°A (México) vs 2°B (Suiza)
		expect(bracket.matches[0].slotA.teamName).toBe("México");
		expect(bracket.matches[0].slotA.groupLetter).toBe("A");
		expect(bracket.matches[0].slotA.slotType).toBe("1st");
		expect(bracket.matches[0].slotB.teamName).toBe("Suiza");
		expect(bracket.matches[0].slotB.groupLetter).toBe("B");
		expect(bracket.matches[0].slotB.slotType).toBe("2nd");

		// Match 2: 1°B (Canadá) vs 2°A (Corea)
		expect(bracket.matches[1].slotA.teamName).toBe("Canadá");
		expect(bracket.matches[1].slotA.groupLetter).toBe("B");
		expect(bracket.matches[1].slotB.teamName).toBe("Corea");
		expect(bracket.matches[1].slotB.groupLetter).toBe("A");

		// Match 3: 1°C (Brasil) vs 2°D (Paraguay)
		expect(bracket.matches[2].slotA.teamName).toBe("Brasil");
		expect(bracket.matches[2].slotB.teamName).toBe("Paraguay");

		// Match 4: 1°D (USA) vs 2°C (Marruecos)
		expect(bracket.matches[3].slotA.teamName).toBe("USA");
		expect(bracket.matches[3].slotB.teamName).toBe("Marruecos");
	});

	it("partidos 13-16 son mejores terceros emparejados (1-2, 3-4, 5-6, 7-8)", () => {
		const groupTables = makeGroupTablesWithTop2(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				first: `1° of ${String.fromCharCode(65 + i)}`,
				second: `2° of ${String.fromCharCode(65 + i)}`,
			})),
		);
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		// Matches 13-16 son best3rd
		for (let i = 12; i < 16; i++) {
			expect(bracket.matches[i].slotA.slotType).toBe("best3rd");
			expect(bracket.matches[i].slotB.slotType).toBe("best3rd");
		}

		// Match 13: 3° #1 vs 3° #2
		expect(bracket.matches[12].slotA.bestThirdRank).toBe(1);
		expect(bracket.matches[12].slotB.bestThirdRank).toBe(2);

		// Match 14: 3° #3 vs 3° #4
		expect(bracket.matches[13].slotA.bestThirdRank).toBe(3);
		expect(bracket.matches[13].slotB.bestThirdRank).toBe(4);

		// Match 15: 3° #5 vs 3° #6
		expect(bracket.matches[14].slotA.bestThirdRank).toBe(5);
		expect(bracket.matches[14].slotB.bestThirdRank).toBe(6);

		// Match 16: 3° #7 vs 3° #8
		expect(bracket.matches[15].slotA.bestThirdRank).toBe(7);
		expect(bracket.matches[15].slotB.bestThirdRank).toBe(8);
	});

	it("marca isComplete=true solo cuando ambos slots están resueltos", () => {
		const groupTables = makeGroupTablesWithTop2(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				first: `1° of ${String.fromCharCode(65 + i)}`,
				second: `2° of ${String.fromCharCode(65 + i)}`,
			})),
		);
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		// Con todos los grupos terminados, todos los partidos deberían estar completos
		expect(bracket.completedMatches).toBe(16);
		for (const match of bracket.matches) {
			expect(match.isComplete).toBe(true);
		}
	});

	it("maneja grupos con standings vacíos (slots TBD)", () => {
		// Solo 2 grupos con datos; los otros 10 con standings VACÍOS
		// (length === 0) → todos los slots TBD para esos grupos.
		// PERO los grupos A y B sí tienen datos, así que sus terceros
		// SÍ existen y Match 13 (3°#1 vs 3°#2) queda completo.
		const groupTables = makeGroupTablesWithTop2([
			{ groupLetter: "A", first: "México", second: "Corea" },
			{ groupLetter: "B", first: "Canadá", second: "Suiza" },
		]);
		for (const letter of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]) {
			groupTables.push({
				groupName: `Grupo ${letter}`,
				groupLetter: letter,
				standings: [], // ← vacío → todos los slots TBD
				liveMatches: [],
			});
		}
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		// Partidos 1-2 (grupos A-B) están completos, el resto no
		expect(bracket.matches[0].isComplete).toBe(true);
		expect(bracket.matches[1].isComplete).toBe(true);
		// Match 3 (1°C vs 2°D): grupo C y D vacíos → slots TBD
		expect(bracket.matches[2].isComplete).toBe(false);
		// Match 13 (3°#1 vs 3°#2): AMBOS vienen de grupos A y B (con datos) → completo
		expect(bracket.matches[12].isComplete).toBe(true);
		// Match 14 (3°#3 vs 3°#4): terceros #3 y #4 no existen (standings vacíos) → TBD
		expect(bracket.matches[13].isComplete).toBe(false);
		// Match 15 (3°#5 vs 3°#6): tampoco existen → TBD
		expect(bracket.matches[14].isComplete).toBe(false);
		// Total: 2 (R32-1, R32-2) + 1 (R32-13) = 3
		expect(bracket.completedMatches).toBe(3);
	});

	it("preserva isLive en slots cuyo grupo aún tiene partidos en vivo", () => {
		const groupTables = makeGroupTablesWithTop2([
			{ groupLetter: "A", first: "México", second: "Corea" },
			{ groupLetter: "B", first: "Canadá", second: "Suiza" },
		]);
		// Marcar el primer equipo del grupo A como live
		groupTables[0].standings[0].isLive = true;

		const bestThirds = calculateBestThirds(groupTables);
		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		// Match 1 slotA (1° de A = México) está live
		expect(bracket.matches[0].slotA.isLive).toBe(true);
		expect(bracket.matches[0].slotA.teamName).toBe("México");
		// Match 2 slotA (1° de B = Canadá) NO está live
		expect(bracket.matches[1].slotA.isLive).toBe(false);
	});

	it("asigna IDs únicos a cada match (R32-1 a R32-16)", () => {
		const groupTables = makeGroupTablesWithTop2(
			Array.from({ length: 12 }, (_, i) => ({
				groupLetter: String.fromCharCode(65 + i),
				first: `1° of ${String.fromCharCode(65 + i)}`,
				second: `2° of ${String.fromCharCode(65 + i)}`,
			})),
		);
		const bestThirds = calculateBestThirds(groupTables);

		const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

		const ids = bracket.matches.map((m) => m.id);
		expect(ids).toEqual([
			"R32-1",
			"R32-2",
			"R32-3",
			"R32-4",
			"R32-5",
			"R32-6",
			"R32-7",
			"R32-8",
			"R32-9",
			"R32-10",
			"R32-11",
			"R32-12",
			"R32-13",
			"R32-14",
			"R32-15",
			"R32-16",
		]);
	});
});
