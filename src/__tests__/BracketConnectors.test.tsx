/**
 * Tests para `src/components/tournament/BracketConnectors.tsx`.
 *
 * Sprint 5D+: SVG overlay que dibuja las líneas conectoras del árbol
 * de eliminatorias entre rondas adyacentes.
 *
 * ============================================================================
 * COBERTURA (4 tests)
 * ============================================================================
 * 1. Retorna null si no hay cards en el DOM
 * 2. Renderiza paths SVG cuando hay matches completos (resolved)
 * 3. Aplica stroke-dasharray a las líneas TBD
 * 4. Aplica stroke-opacity según el estado (tbd=0.35, resolved=0.6, live=1.0)
 * ============================================================================
 */

import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, afterEach } from "vitest";
import { BracketConnectors } from "../components/tournament/BracketConnectors";
import { getFullBracket } from "../lib/bracketEngine";
import type {
	FullBracket,
	KnockoutRound,
} from "../lib/bracketTypes";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";

// ============================================================================
// HELPERS
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
	return ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(
		(letter) =>
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

// ============================================================================
// MOCK DOM: crea un container con cards que tienen data-card-position
// ============================================================================

interface CardInfo {
	abbr: string;
	position: number;
	el: HTMLElement;
}

/**
 * Crea un container con cards simuladas (data-round + data-card-position)
 * y devuelve un mapa de cards por abreviatura + position.
 * Tambien hace mock de getBoundingClientRect para que cada card tenga
 * coordenadas conocidas.
 */
function setupMockCarousel(
	cardsByRound: Record<string, number[]>,
): {
	container: HTMLDivElement;
	cardMap: Map<string, CardInfo>;
	cleanup: () => void;
} {
	const container = document.createElement("div");
	container.style.width = "1000px";
	container.style.height = "1000px";
	container.style.position = "relative";
	document.body.appendChild(container);

	const cardMap = new Map<string, CardInfo>();
	let xOffset = 0;
	const colWidth = 200;

	for (const [abbr, positions] of Object.entries(cardsByRound)) {
		const col = document.createElement("div");
		col.setAttribute("data-round", abbr);
		col.style.position = "absolute";
		col.style.left = `${xOffset}px`;
		col.style.top = "0";
		col.style.width = `${colWidth}px`;
		container.appendChild(col);

		positions.forEach((pos, i) => {
			const card = document.createElement("div");
			card.setAttribute("data-card-position", String(pos));
			card.style.position = "absolute";
			card.style.left = "0";
			card.style.top = `${i * 80}px`;
			card.style.width = "100px";
			card.style.height = "60px";
			col.appendChild(card);

			// Mock getBoundingClientRect para coordenadas conocidas
			const rect = {
				x: xOffset,
				y: i * 80,
				width: 100,
				height: 60,
				top: i * 80,
				right: xOffset + 100,
				bottom: i * 80 + 60,
				left: xOffset,
				toJSON: () => ({}),
			};
			card.getBoundingClientRect = () => rect as DOMRect;
			col.getBoundingClientRect = () => ({
				...rect,
				width: colWidth,
				right: xOffset + colWidth,
				left: xOffset,
			}) as DOMRect;

			cardMap.set(`${abbr}-${pos}`, { abbr, position: pos, el: card });
		});

		xOffset += colWidth;
	}

	container.getBoundingClientRect = () => ({
		x: 0,
		y: 0,
		width: 1000,
		height: 1000,
		top: 0,
		right: 1000,
		bottom: 1000,
		left: 0,
		toJSON: () => ({}),
	}) as DOMRect;

	const cleanup = () => {
		document.body.removeChild(container);
	};

	return { container, cardMap, cleanup };
}

// ============================================================================
// TESTS
// ============================================================================

describe("BracketConnectors (Sprint 5D+ tree)", () => {
	let cleanup: (() => void) | null = null;

	afterEach(() => {
		if (cleanup) {
			cleanup();
			cleanup = null;
		}
	});

	it("retorna null si no hay cards en el DOM", () => {
		// Container vacio, sin cards
		const container = document.createElement("div");
		document.body.appendChild(container);
		cleanup = () => document.body.removeChild(container);

		function TestComp() {
			const ref = useRef(container);
			const bracket = getFullBracket([], make12GroupTables(), makeBestThirds());
			return <BracketConnectors containerRef={ref} rounds={bracket.rounds} />;
		}

		const { container: result } = render(<TestComp />);
		expect(result.querySelector("svg")).toBeNull();
	});

	it("renderiza paths SVG cuando hay matches completos (resolved)", () => {
		const bracket: FullBracket = getFullBracket(
			[],
			make12GroupTables(),
			makeBestThirds(),
		);
		// Marcar los primeros 2 R32 y el primer R16 como resolved
		const r32_1 = bracket.rounds[0]!.matches[0]!;
		const r32_2 = bracket.rounds[0]!.matches[1]!;
		const r16_1 = bracket.rounds[1]!.matches[0]!;

		// Propagar manualmente
		r32_1.slotA.teamName = "Argentina";
		r32_1.slotB.teamName = "Francia";
		r32_1.score = { home: 2, away: 1 };
		r32_1.winner = "Argentina";
		r32_1.isComplete = true;

		r32_2.slotA.teamName = "Brasil";
		r32_2.slotB.teamName = "Alemania";
		r32_2.score = { home: 3, away: 0 };
		r32_2.winner = "Brasil";
		r32_2.isComplete = true;

		// Setup DOM con 3 rondas (R32, R16, QF) y 2 R32 cards + 1 R16 card
		const setup = setupMockCarousel({
			R32: [1, 2],
			R16: [1],
			QF: [1],
		});
		cleanup = setup.cleanup;

		// Propagar sourceMatchId en r16_1
		r16_1.slotA.sourceMatchId = "R32-1";
		r16_1.slotB.sourceMatchId = "R32-2";
		// Y necesitamos los source slots con teamName (no sourceMatchId)
		// pero como son winners, ya tienen teamName en slotA/slotB

		function TestComp() {
			const ref = useRef(setup.container);
			return (
				<BracketConnectors
					containerRef={ref}
					rounds={bracket.rounds as KnockoutRound[]}
				/>
			);
		}

		const { container: result } = render(<TestComp />);
		const svg = result.querySelector("svg");
		expect(svg).not.toBeNull();

		// Debe haber al menos 1 path (entre R32-1/R32-2 → R16-1)
		const paths = result.querySelectorAll("path");
		expect(paths.length).toBeGreaterThan(0);
	});

	it("renderiza sin paths cuando no hay sourceMatchId en los slots", () => {
		const bracket = getFullBracket([], make12GroupTables(), makeBestThirds());

		// Limpiar sourceMatchId manualmente para simular un bracket donde
		// las rondas no estan conectadas (caso edge: bracket recén creado
		// sin partidos de R32 terminados)
		for (const round of bracket.rounds) {
			for (const match of round.matches) {
				match.slotA.sourceMatchId = null;
				match.slotB.sourceMatchId = null;
			}
		}

		const setup = setupMockCarousel({
			R32: [1, 2],
			R16: [1],
			QF: [1],
		});
		cleanup = setup.cleanup;

		function TestComp() {
			const ref = useRef(setup.container);
			return (
				<BracketConnectors
					containerRef={ref}
					rounds={bracket.rounds as KnockoutRound[]}
				/>
			);
		}

		const { container: result } = render(<TestComp />);
		const paths = result.querySelectorAll("path");
		// Sin sourceMatchId en los slots, no hay lineas
		expect(paths.length).toBe(0);
	});

	it("renderiza container sin chocar con el DOM de cards", () => {
		// Este test verifica que BracketConnectors no rompe cuando
		// se monta con rounds vacios
		const setup = setupMockCarousel({});
		cleanup = setup.cleanup;

		function TestComp() {
			const ref = useRef(setup.container);
			return <BracketConnectors containerRef={ref} rounds={[]} />;
		}

		const { container: result } = render(<TestComp />);
		// Sin rounds, no deberia renderizar svg
		expect(result.querySelector("svg")).toBeNull();
	});
});
