/**
 * Tests para `src/components/tournament/BracketTree.tsx`.
 *
 * Sprint 5C: el árbol ahora SIEMPRE muestra 1 sola ronda + navegador
 * de flechas (con URL params `?round=`). La vista de "5 rondas apiladas"
 * fue removida porque ya no tiene sentido con el navegador.
 *
 * ============================================================================
 * COBERTURA (8 tests)
 * ============================================================================
 * 1. Renderiza 1 ronda por default + navegador con flechas
 * 2. Renderiza 3RD con `?round=3rd` (apéndice de la final)
 * 3. Muestra TBD en slots no resueltos
 * 4. Muestra nombres de equipos en slots resueltos
 * 5. Llama onOpenDetails al hacer click en un partido
 * 6. Muestra LiveBadge en partidos en vivo
 * 7. Muestra banner del campeón cuando la final termina (con `?round=f`)
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
	const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
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
		stageMultiplier: 2,
	};
}

// ============================================================================
// TESTS
// ============================================================================

/**
 * Helper: renderiza el BracketTree dentro de un MemoryRouter (Sprint 5C
 * usa useSearchParams). Acepta `initialEntries` para simular `?round=`.
 */
function renderWithRouter(
	ui: React.ReactNode,
	initialEntries: string[] = ["/"],
) {
	return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe("BracketTree (Sprint 5C: 1 ronda + navegador)", () => {
	it("renderiza la primera ronda por default (R32) con navegador de flechas", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// El header de la ronda R32 debe estar visible
		expect(
			screen.getByRole("region", { name: /ronda: 16vos de final/i }),
		).toBeInTheDocument();
		// El navegador de flechas debe estar visible
		expect(
			screen.getByRole("navigation", { name: /navegación del bracket/i }),
		).toBeInTheDocument();
	});

	it("renderiza el 3RD con `?round=3rd` (apéndice de la final)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />, ["/?round=3rd"]);

		// El section del 3er puesto debe estar presente
		expect(
			screen.getByRole("region", {
				name: /partido por el tercer puesto/i,
			}),
		).toBeInTheDocument();
	});

	it("muestra TBD en slots no resueltos (rondas sin grupos asignados)", () => {
		const bracket = makeEmptyBracket();
		// Navegamos a QF (cuartos) que SÍ tiene slots TBD porque los
		// grupos aún no han definido los 8 cruces de cuartos.
		// R32 siempre tiene equipos desde los grupos, así que no tiene TBDs.
		renderWithRouter(<BracketTree bracket={bracket} />, ["/?round=qf"]);

		// El QF debe tener slots "Por definir"
		const tbdElements = screen.queryAllByText(/por definir|tbd/i);
		expect(tbdElements.length).toBeGreaterThan(0);
	});

	it("muestra nombres de equipos en slots resueltos", () => {
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

		// Debe haber un badge "En vivo" o un LiveBadge compact
		const liveBadges = screen.getAllByLabelText(/en vivo/i);
		expect(liveBadges.length).toBeGreaterThan(0);
	});

	it("muestra banner del campeón cuando la final termina (con `?round=f`)", () => {
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

		// El empty state debe estar presente (al menos 1 match: título + descripción)
		const matches = screen.getAllByText(/se completará|cuando termine|sin partidos/i);
		expect(matches.length).toBeGreaterThan(0);
	});
});
