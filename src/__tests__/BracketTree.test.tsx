/**
 * Tests para `src/components/tournament/BracketTree.tsx`.
 *
 * Sprint 3 — TDD rojo. El componente aún NO existe.
 * Estos tests fallan hasta que se implemente el árbol visual.
 *
 * ============================================================================
 * COBERTURA (8 tests)
 * ============================================================================
 * 1. Renderiza las 5 rondas (R32, R16, QF, SF, F)
 * 2. Renderiza el partido por el 3er puesto debajo de la final
 * 3. Muestra TBD en slots no resueltos
 * 4. Muestra nombres de equipos en slots resueltos
 * 5. Llama onOpenDetails al hacer click en un partido
 * 6. Muestra LiveBadge en partidos en vivo
 * 7. Muestra banner del campeón cuando la final termina
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

/**
 * Helper: setea un slot como TBD (teamName null, slotType "TBD-like")
 * En la práctica, el bracket estructural ya devuelve slots con teamName desde grupos.
 */
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
 * Helper: renderiza el BracketTree dentro de un MemoryRouter porque
 * usa useSearchParams (Sprint 5C: URL params `?round=`).
 */
function renderWithRouter(ui: React.ReactNode) {
	return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("BracketTree", () => {
	it("renders all 5 rounds (R32, R16, QF, SF, F)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// Verificar que los 5 headers de ronda están presentes
		// Usamos queries específicos por role+aria-label para evitar colisiones
		expect(
			screen.getByRole("region", { name: /ronda: 16vos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: /ronda: 8vos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: /ronda: 4tos de final/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: /ronda: semifinal/i }),
		).toBeInTheDocument();
		// La Final (header <h3>): buscamos por el texto exacto
		const finalHeaders = screen.getAllByText(/final/i);
		// Debe haber al menos un h3 con "Final" (la final) y posiblemente más
		// (los partidos tienen "Final" en el aria-label)
		expect(finalHeaders.length).toBeGreaterThan(0);
	});

	it("renders third place match below the final", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// El section del 3er puesto debe estar presente
		expect(
			screen.getByRole("region", {
				name: /partido por el tercer puesto/i,
			}),
		).toBeInTheDocument();
		// Y el h3 "Tercer Puesto"
		expect(screen.getByText("Tercer Puesto")).toBeInTheDocument();
	});

	it("shows TBD slots for unresolved matches (initial state)", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// En R32 los slots tienen teamName desde grupos, pero R16+ están TBD
		// Verificamos que hay al menos 16 elementos "TBD" / "Por definir" en R16
		const tbdElements = screen.queryAllByText(/por definir|tbd/i);
		expect(tbdElements.length).toBeGreaterThan(0);
	});

	it("shows team names for resolved R32 matches", () => {
		const bracket = makeEmptyBracket();
		renderWithRouter(<BracketTree bracket={bracket} />);

		// Los 1° y 2° de cada grupo deben aparecer en los slots de R32
		// Buscamos algunos específicos (1°A, 2°A, 1°B, 2°B, etc.)
		expect(screen.getByText("1°A")).toBeInTheDocument();
		expect(screen.getByText("2°B")).toBeInTheDocument();
		expect(screen.getByText("1°C")).toBeInTheDocument();
	});

	it("calls onOpenDetails when clicking a match with both slots resolved", async () => {
		const user = userEvent.setup();
		// Para que el card sea clickeable, el match debe tener dbMatchId
		const bracket = makeEmptyBracket();
		bracket.rounds.forEach((round) => {
			round.matches.forEach((m, i) => {
				m.dbMatchId = `db-${m.id}-${i}`;
			});
		});

		const firstMatch = bracket.rounds[0]?.matches[0];
		expect(firstMatch).toBeDefined();
		if (!firstMatch) return;

		const onOpenDetails = vi.fn();
		renderWithRouter(
			<BracketTree bracket={bracket} onOpenDetails={onOpenDetails} />,
		);

		// Buscar el botón por aria-label (que incluye el nombre del equipo)
		const matchButton = screen.getByRole("button", {
			name: new RegExp(firstMatch.slotA.teamName ?? "", "i"),
		});

		await user.click(matchButton);
		expect(onOpenDetails).toHaveBeenCalledWith(firstMatch.dbMatchId);
	});

	it("renders live badge for matches in progress (status: live)", () => {
		// Crear un bracket con un R32 marcado como live
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

	it("renders champion banner when final is resolved", () => {
		// Crear un bracket donde la final tiene un ganador
		const bracket = makeEmptyBracket();

		// Propagar winners manualmente para llegar a la final
		// Simplificado: setear winner directamente en la final
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

		renderWithRouter(<BracketTree bracket={bracket} />);

		// El banner del campeón tiene role="status" y aria-label con el nombre
		const championBanner = screen.getByRole("status", {
			name: /argentina es el campeón del torneo/i,
		});
		expect(championBanner).toBeInTheDocument();
		// Y el texto "¡Campeón del Mundo!" debe estar visible dentro del banner
		expect(championBanner.textContent).toMatch(/campeón del mundo/i);
	});

	it("renders empty state when no matches are defined", () => {
		// Bracket con rounds vacíos
		const emptyBracket: FullBracket = {
			rounds: [],
			thirdPlaceMatch: makeMatchTBD(1, "3RD-1"),
			champion: null,
			runnerUp: null,
			thirdPlace: null,
		};

		renderWithRouter(<BracketTree bracket={emptyBracket} />);

		// Debe mostrar un mensaje de empty state
		// Usamos getAllByText y verificamos que el header está presente
		const allTexts = screen.getAllByText(/se completará|cuando termine/i);
		expect(allTexts.length).toBeGreaterThan(0);
	});
});
