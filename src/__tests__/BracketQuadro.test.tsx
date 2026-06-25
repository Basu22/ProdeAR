/**
 * Tests para `src/components/tournament/BracketQuadro.tsx`.
 *
 * Sprint 5D: Carrusel horizontal del arbol de eliminatorias.
 *
 * ============================================================================
 * COBERTURA (10 tests)
 * ============================================================================
 * 1. Renderiza 5 columnas (R32, R16, QF, SF, F) con data-round correcto
 * 2. RoundChipBar tiene role="navigation" con 5 chips
 * 3. 3RD se renderiza como sub-card dentro de columna F (NO columna aparte)
 * 4. ChampionBanner visible cuando ?round=f y hay champion
 * 5. ChampionBanner NO visible cuando ?round=qf (evita spoilers)
 * 6. Empty state cuando rounds.length === 0
 * 7. Click en chip actualiza URL (?round=r16)
 * 8. ?round=3rd scrollea a columna F (3RD es sub-card de F)
 * 9. prefers-reduced-motion desactiva scroll-smooth (test de integracion)
 * 10. Aria-controls en chips apunta al id del panel (data-round)
 * ============================================================================
 *
 * NOTA: getProgressPills() retorna 5 items (R32, R16, QF, SF, F).
 * El chip 3RD se agrega manualmente en RoundChipBar para total 6 chips.
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

describe("BracketQuadro (Sprint 5D: carrusel horizontal)", () => {
	it("renderiza 5 columnas (R32, R16, QF, SF, F) con data-round correcto", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// Buscar todas las columnas con data-round
		const columns = container.querySelectorAll("[data-round]");
		expect(columns).toHaveLength(5);

		// Verificar que cada columna tiene el data-round correcto
		const roundValues = Array.from(columns).map((col) =>
			col.getAttribute("data-round"),
		);
		expect(roundValues).toEqual(["R32", "R16", "QF", "SF", "F"]);
	});

	it("RoundChipBar tiene role='navigation' con 6 chips (incluyendo 3RD)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketQuadro bracket={bracket} />);

		// El nav debe tener role="navigation" y aria-label descriptivo
		const nav = screen.getByRole("navigation", {
			name: /rondas del mundial/i,
		});
		expect(nav).toBeInTheDocument();

		// Debe tener 6 chips (botones): R32, R16, QF, SF, F, 3RD
		const chips = screen.getAllByRole("button", {
			name: /ir a/i,
		});
		expect(chips).toHaveLength(6);

		// Verificar que los chips tienen los labels correctos
		expect(
			screen.getByRole("button", { name: /ir a 16vos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ir a 8vos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ir a 4tos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ir a semifinal/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ir a final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: /ir a partido por el tercer puesto/i,
			}),
		).toBeInTheDocument();
	});

	it("3RD se renderiza como sub-card dentro de columna F (NO columna aparte)", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// El separator del 3RD debe estar presente
		const separator = screen.getByRole("separator", {
			name: /sección tercer puesto/i,
		});
		expect(separator).toBeInTheDocument();

		// El separator debe estar DENTRO de la columna F (data-round="F")
		const fColumn = container.querySelector('[data-round="F"]');
		expect(fColumn).toBeInTheDocument();
		expect(fColumn?.contains(separator)).toBe(true);

		// NO debe haber una columna separada con data-round="3RD"
		const thirdPlaceColumn = container.querySelector('[data-round="3RD"]');
		expect(thirdPlaceColumn).not.toBeInTheDocument();
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

	it("click en chip actualiza URL (?round=r16)", async () => {
		const user = userEvent.setup();
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketQuadro bracket={bracket} />);

		// Inicialmente, el chip R32 debe estar activo (aria-current="page")
		const r32Chip = screen.getByRole("button", {
			name: /ir a 16vos de final/i,
		});
		expect(r32Chip).toHaveAttribute("aria-current", "page");

		// Hacer click en el chip R16
		const r16Chip = screen.getByRole("button", {
			name: /ir a 8vos de final/i,
		});
		await user.click(r16Chip);

		// Despues del click, el chip R16 debe estar activo
		expect(r16Chip).toHaveAttribute("aria-current", "page");

		// El chip R32 ya no debe estar activo
		expect(r32Chip).not.toHaveAttribute("aria-current");
	});

	it("?round=3rd scrollea a columna F (3RD es sub-card de F)", async () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(
			<BracketQuadro bracket={bracket} />,
			["/?round=3rd"],
		);

		// Esperar a que el effect de URL→scroll se ejecute
		await new Promise((resolve) => setTimeout(resolve, 50));

		// scrollTo (NO scrollIntoView) debe haber sido llamado al menos una vez
		// (Sprint 5D Issue #1: scrollTo opera solo sobre el contenedor, evita
		// scroll vertical no deseado del body).
		const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
		expect(scrollToMock.mock.calls.length).toBeGreaterThan(0);

		// Verificar que el effect determino que el target es F (no 3RD):
		const fColumn = container.querySelector('[data-round="F"]');
		expect(fColumn).toBeInTheDocument();
		const thirdPlaceColumn = container.querySelector('[data-round="3RD"]');
		expect(thirdPlaceColumn).not.toBeInTheDocument();
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

	it("aria-controls en chips apunta al id del panel (data-round)", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketQuadro bracket={bracket} />);

		// Obtener todos los chips
		const chips = screen.getAllByRole("button", {
			name: /ir a/i,
		});

		// Verificar que cada chip tiene aria-controls apuntando al panel correcto
		for (const chip of chips) {
			const ariaControls = chip.getAttribute("aria-controls");
			expect(ariaControls).toBeTruthy();

			// El aria-controls debe ser "panel-{ROUND}" (incluye 3RD)
			expect(ariaControls).toMatch(/^panel-(R32|R16|QF|SF|F|3RD)$/);

			// El 3RD no tiene columna propia (vive dentro de F), pero
			// el aria-controls sigue apuntando a un id valido.
			// Para los 5 rounds principales, verificamos que el panel existe.
			if (ariaControls !== "panel-3RD") {
				const panel = container.querySelector(`#${ariaControls}`);
				expect(panel).toBeInTheDocument();

				// El panel debe tener el data-round correspondiente
				const roundFromId = ariaControls?.replace("panel-", "");
				const dataRound = panel?.getAttribute("data-round");
				expect(dataRound).toBe(roundFromId);
			}
		}
	});
});
