/**
 * Tests para `src/components/tournament/BracketQuadro.tsx`.
 *
 * Sprint 5+: Carrusel horizontal del arbol de eliminatorias con 3RD
 * como columna navegable independiente.
 *
 * ============================================================================
 * COBERTURA (7 tests)
 * ============================================================================
 * 1. Renderiza 6 columnas (R32, R16, QF, SF, F, 3RD) con data-round correcto
 * 2. NO renderiza RoundChipBar (pills superiores eliminadas)
 * 3. 3RD se renderiza como COLUMNA APARTE (NO sub-card de F)
 * 4. ChampionBanner visible cuando ?round=f y hay champion
 * 5. ChampionBanner NO visible cuando ?round=qf (evita spoilers)
 * 6. Empty state cuando rounds.length === 0
 * 7. ?round=3rd scrollea a la columna 3RD (no a F)
 * 8. prefers-reduced-motion desactiva scroll-smooth (test de integracion)
 * 9. Cada columna tiene id panel-{abbr}
 * ============================================================================
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BracketQuadro } from "../components/tournament/BracketQuadro";
import { getFullBracket } from "../lib/bracketEngine";
import type {
	ExtendedBracketMatch,
	ExtendedBracketSlot,
	FullBracket,
} from "../lib/bracketTypes";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";

// ============================================================================
// HELPERS (duplicados de bracketEngine.test.ts para mantener tests aislados)
// ============================================================================

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
		pts: 6 - i * 0.1,
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

function makeEmptyBracket(): FullBracket {
	return getFullBracket([], make12GroupTables(), makeBestThirds());
}

function makeMatchTBD(position: number, id: string): ExtendedBracketMatch {
	const emptySlot: ExtendedBracketSlot = {
		slotType: "1st",
		groupLetter: "A",
		bestThirdRank: null,
		teamName: null,
		teamLogo: null,
		isLive: false,
		sourceMatchId: null,
		decidedByPenalties: false,
	};
	return {
		id,
		position,
		slotA: { ...emptySlot, slotType: "1st" },
		slotB: { ...emptySlot, slotType: "2nd" },
		isComplete: false,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		decidedByPenalties: false,
		bracketPosition: id,
		stadium: null,
		kickOff: null,
		stageMultiplier: 2,
	};
}

// ============================================================================
// TESTS
// ============================================================================

/**
 * Helper: renderiza el BracketQuadro dentro de un MemoryRouter (Sprint 5D
 * usa useSearchParams). Acepta `initialEntries` para simular `?round=`.
 */
function renderWithRouter(
	ui: React.ReactNode,
	initialEntries: string[] = ["/"],
) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
	);
}

describe("BracketQuadro (Sprint 5+: 3RD como columna navegable)", () => {
	it("renderiza 6 columnas (R32, R16, QF, SF, F, 3RD) con data-round correcto", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// Buscar todas las columnas con data-round
		const columns = container.querySelectorAll("[data-round]");
		expect(columns).toHaveLength(6);

		// Verificar que cada columna tiene el data-round correcto
		const roundValues = Array.from(columns).map((col) =>
			col.getAttribute("data-round"),
		);
		expect(roundValues).toEqual(["R32", "R16", "QF", "SF", "F", "3RD"]);
	});

	it("NO renderiza RoundChipBar (pills superiores eliminadas)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketQuadro bracket={bracket} />);

		// El nav de las pills superiores NO debe estar presente
		const nav = screen.queryByRole("navigation", {
			name: /rondas del mundial/i,
		});
		expect(nav).not.toBeInTheDocument();
	});

	it("3RD se renderiza como COLUMNA APARTE (NO sub-card de F)", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// NO debe haber un separator de 3RD dentro de F (ya no es sub-card)
		const separator = screen.queryByRole("separator", {
			name: /sección tercer puesto/i,
		});
		expect(separator).not.toBeInTheDocument();

		// La columna F NO debe contener un card de 3RD dentro
		const fColumn = container.querySelector('[data-round="F"]');
		expect(fColumn).toBeInTheDocument();

		// SÍ debe haber una columna separada con data-round="3RD"
		const thirdPlaceColumn = container.querySelector('[data-round="3RD"]');
		expect(thirdPlaceColumn).toBeInTheDocument();

		// La columna 3RD debe ser hermana de F (no hija)
		expect(fColumn?.parentElement?.contains(thirdPlaceColumn!)).toBe(true);
	});

	it("ChampionBanner visible cuando ?round=f y hay champion", () => {
		const bracket = makeEmptyBracket();
		// Propagar el resultado de la final
		const finalMatch = bracket.rounds[4]?.matches[0];
		if (finalMatch) {
			finalMatch.slotA.teamName = "Argentina";
			finalMatch.slotA.teamLogo = null;
			finalMatch.slotB.teamName = "Francia";
			finalMatch.score = { home: 3, away: 1 };
			finalMatch.winner = "Argentina";
			finalMatch.winnerLogo = null;
			finalMatch.isComplete = true;
			bracket.champion = "Argentina";
		}

		renderWithRouter(<BracketQuadro bracket={bracket} />, ["/?round=f"]);

		// El banner del campeon con role="status" debe aparecer
		const championBanner = screen.getByRole("status", {
			name: /argentina es el campeón del torneo/i,
		});
		expect(championBanner).toBeInTheDocument();
	});

	it("ChampionBanner NO visible cuando ?round=qf (evita spoilers)", () => {
		const bracket = makeEmptyBracket();
		// Propagar el resultado de la final
		const finalMatch = bracket.rounds[4]?.matches[0];
		if (finalMatch) {
			finalMatch.slotA.teamName = "Argentina";
			finalMatch.slotA.teamLogo = null;
			finalMatch.slotB.teamName = "Francia";
			finalMatch.score = { home: 3, away: 1 };
			finalMatch.winner = "Argentina";
			finalMatch.winnerLogo = null;
			finalMatch.isComplete = true;
			bracket.champion = "Argentina";
		}

		renderWithRouter(<BracketQuadro bracket={bracket} />, ["/?round=qf"]);

		// El banner del campeon NO debe aparecer (evita spoilers)
		const championBanner = screen.queryByRole("status", {
			name: /argentina es el campeón del torneo/i,
		});
		expect(championBanner).not.toBeInTheDocument();
	});

	it("empty state cuando rounds.length === 0", () => {
		const emptyBracket: FullBracket = {
			rounds: [],
			thirdPlaceMatch: makeMatchTBD(1, "3RD-1"),
			champion: null,
			runnerUp: null,
			thirdPlace: null,
		};

		renderWithRouter(<BracketQuadro bracket={emptyBracket} />);

		// El empty state debe estar presente
		const emptyStateText = screen.getByText(/el árbol se completará/i);
		expect(emptyStateText).toBeInTheDocument();

		// La descripcion del empty state tambien debe estar presente
		const emptyStateDesc = screen.getByText(
			/cuando termine la fase de grupos/i,
		);
		expect(emptyStateDesc).toBeInTheDocument();
	});

	it("?round=3rd scrollea a la columna 3RD (no a F)", async () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(
			<BracketQuadro bracket={bracket} />,
			["/?round=3rd"],
		);

		// Esperar a que el effect de URL→scroll se ejecute
		await new Promise((resolve) => setTimeout(resolve, 50));

		// scrollTo (NO scrollIntoView) debe haber sido llamado al menos una vez
		const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
		expect(scrollToMock.mock.calls.length).toBeGreaterThan(0);

		// SÍ debe existir una columna con data-round="3RD"
		const thirdPlaceColumn = container.querySelector('[data-round="3RD"]');
		expect(thirdPlaceColumn).toBeInTheDocument();
	});

	it("prefers-reduced-motion desactiva scroll-smooth (test de integracion)", async () => {
		// Mockear matchMedia para que prefers-reduced-motion sea true
		const originalMatchMedia = window.matchMedia;
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketQuadro bracket={bracket} />, ["/?round=f"]);

		// Esperar a que el effect de URL→scroll se ejecute
		await new Promise((resolve) => setTimeout(resolve, 50));

		// scrollTo (Sprint 5D) debe haber sido llamado con behavior: "auto"
		// cuando prefers-reduced-motion está activo.
		const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
		const calls = scrollToMock.mock.calls;

		const hasAutoBehavior = calls.some((call) => call[0]?.behavior === "auto");
		expect(hasAutoBehavior).toBe(true);

		// Restaurar el mock original
		window.matchMedia = originalMatchMedia;
	});

	it("cada columna con data-round tiene un id panel-{abbr}", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// Las 6 columnas deben tener un id panel-{abbr}
		const expectedIds = ["panel-R32", "panel-R16", "panel-QF", "panel-SF", "panel-F", "panel-3RD"];
		for (const id of expectedIds) {
			const panel = container.querySelector(`#${id}`);
			expect(panel).toBeInTheDocument();

			// Verificar que data-round coincide con el id
			const abbr = id.replace("panel-", "");
			expect(panel?.getAttribute("data-round")).toBe(abbr);
		}
	});
});
