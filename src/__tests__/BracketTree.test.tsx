/**
 * Tests para `src/components/tournament/BracketTree.tsx`.
 *
 * Sprint 5D: BracketTree es ahora un wrapper thin que delega a BracketQuadro.
 * Estos tests verifican que la API pública se mantiene (named export,
 * BracketTreeProps) y que la integración funciona correctamente.
 *
 * ============================================================================
 * COBERTURA (8 tests)
 * ============================================================================
 * 1. Renderiza la primera ronda por default (R32) con chip activo
 * 2. Renderiza el 3RD como sub-card de F cuando ?round=3rd
 * 3. Muestra TBD en slots no resueltos
 * 4. Muestra nombres de equipos en slots resueltos
 * 5. Llama onOpenDetails al hacer click en un partido
 * 6. Muestra LiveBadge en partidos en vivo
 * 7. Muestra banner del campeón cuando la final termina (con ?round=f)
 * 8. Muestra empty state cuando no hay partidos definidos
 * ============================================================================
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BracketTree } from "../components/tournament/BracketTree";
import { getFullBracket } from "../lib/bracketEngine";
import type {
	ExtendedBracketMatch,
	ExtendedBracketSlot,
	FullBracket,
} from "../lib/bracketTypes";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";

// ============================================================================
// MOCK: useFeatureFlag → false (forzamos BracketQuadro legacy)
// ============================================================================
//
// Estos tests validan el comportamiento del wrapper `BracketTree` cuando
// delega al `BracketQuadro` legacy (BRACKET_V2=false). Sin este mock, si
// alguien tiene `VITE_BRACKET_V2=true` en `.env.local`, el wrapper
// delegaría a `BracketHybrid` (Bracket V2) y los queries del DOM no
// encontrarían los elementos legacy, rompiendo los 8 tests.
//
// Para testear el path del V2, ver `BracketHybrid.test.tsx` (TBD Capa 2+).
vi.mock("../hooks/useFeatureFlag", () => ({
	useFeatureFlag: () => false,
}));

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
 * Helper: renderiza el BracketTree dentro de un MemoryRouter (Sprint 5D
 * usa useSearchParams via BracketQuadro). Acepta `initialEntries` para
 * simular `?round=`.
 */
function renderWithRouter(
	ui: React.ReactNode,
	initialEntries: string[] = ["/"],
) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
	);
}

describe("BracketTree (Sprint 5+: 3RD como columna navegable, sin RoundChipBar)", () => {
	it("renderiza R32 por default con la columna visible", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketTree bracket={bracket} />);

		// Sprint 5+: ya no hay RoundChipBar (pills superiores eliminadas).
		// La navegación entre rondas es via scroll + teclado.
		// Verificamos que la columna R32 está en el DOM.
		const r32Column = container.querySelector('[data-round="R32"]');
		expect(r32Column).toBeInTheDocument();
	});

	it("renderiza 3RD como sub-card de F cuando ?round=3rd (NO columna aparte)", () => {
		const bracket = makeEmptyBracket();
		const { container } = renderWithRouter(<BracketTree bracket={bracket} />, [
			"/?round=3rd",
		]);

		// El separator del 3er puesto debe estar presente
		const separator = screen.getByRole("separator", {
			name: /sección tercer puesto/i,
		});
		expect(separator).toBeInTheDocument();

		// El separator debe estar DENTRO de la columna F
		const fColumn = container.querySelector('[data-round="F"]');
		expect(fColumn).toBeInTheDocument();
		expect(fColumn?.contains(separator)).toBe(true);

		// NO debe haber una columna separada con data-round="3RD"
		const thirdPlaceColumn = container.querySelector('[data-round="3RD"]');
		expect(thirdPlaceColumn).not.toBeInTheDocument();
	});

	it("muestra TBD en slots no resueltos (Q4tos con cruces pendientes)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />, ["/?round=qf"]);

		// QF debe tener slots TBD (porque R16 no se jugo)
		// El nuevo helper buildTbdLabel genera "Ganador de 8vos N" para slots
		// cuyo sourceMatchId apunta a un R16 match.
		const tbdElements = screen.queryAllByText(/por definir|ganador de 8vos/i);
		expect(tbdElements.length).toBeGreaterThan(0);
	});

	it("muestra nombres de equipos en slots resueltos (R32 default)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// El R32 default debe mostrar los 1° y 2° de cada grupo
		expect(screen.getByText("1°A")).toBeInTheDocument();
		expect(screen.getByText("2°B")).toBeInTheDocument();
		expect(screen.getByText("1°C")).toBeInTheDocument();
	});

	it("llama onOpenDetails cuando hace click en un partido con ambos slots resueltos", async () => {
		const user = userEvent.setup();
		const bracket = makeEmptyBracket();
		// Asignar dbMatchId a los primeros partidos para que sean clickeables
		bracket.rounds[0]?.matches.forEach((m, i) => {
			m.dbMatchId = `db-r32-${i}`;
		});

		const firstMatch = bracket.rounds[0]?.matches[0];
		expect(firstMatch).toBeDefined();
		if (!firstMatch) return;

		const onOpenDetails = vi.fn();
		renderWithRouter(
			<BracketTree bracket={bracket} onOpenDetails={onOpenDetails} />,
		);

		// Buscar el button del primer match (que es clickeable)
		const matchButton = screen.getByRole("button", {
			name: new RegExp(firstMatch.slotA.teamName ?? "", "i"),
		});

		await user.click(matchButton);
		expect(onOpenDetails).toHaveBeenCalledWith(firstMatch.dbMatchId);
	});

	it("muestra LiveBadge en partidos en vivo (status: live)", () => {
		const bracket = makeEmptyBracket();
		const firstR32 = bracket.rounds[0]?.matches[0];
		if (firstR32) {
			firstR32.dbMatchId = "live-match-1";
			firstR32.slotA.isLive = true;
			firstR32.slotB.isLive = true;
		}

		renderWithRouter(<BracketTree bracket={bracket} />);

		// Debe haber un badge "En vivo"
		const liveBadges = screen.getAllByLabelText(/en vivo/i);
		expect(liveBadges.length).toBeGreaterThan(0);
	});

	it("muestra banner del campeón cuando la final termina (con ?round=f)", () => {
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

		renderWithRouter(<BracketTree bracket={bracket} />, ["/?round=f"]);

		// El banner del campeón con role="status" debe aparecer
		const championBanner = screen.getByRole("status", {
			name: /argentina es el campeón del torneo/i,
		});
		expect(championBanner).toBeInTheDocument();
	});

	it("renderiza empty state cuando no hay rondas", () => {
		const emptyBracket: FullBracket = {
			rounds: [],
			thirdPlaceMatch: makeMatchTBD(1, "3RD-1"),
			champion: null,
			runnerUp: null,
			thirdPlace: null,
		};

		renderWithRouter(<BracketTree bracket={emptyBracket} />);

		// El empty state debe estar presente
		const emptyStateText = screen.getByText(/el árbol se completará/i);
		expect(emptyStateText).toBeInTheDocument();
	});
});
