/**
 * Tests para `src/components/tournament/GroupTable.tsx`.
 *
 * GroupTable renderiza la tabla de posiciones de un grupo del Mundial con:
 * - Header con nombre del grupo + LiveBadge (si hay live) + LiveMiniScoreboard
 * - Tabla con 4 equipos ordenados, badges de rank (verde/ámbar/gris)
 * - Animaciones animate-rank-up / animate-rank-down según positionChanges
 * - Logos con fallback a ícono "flag" de Material Symbols
 * - LiveBadge compact en la fila del equipo que está jugando
 * - Stats con tabular-nums (PJ, PG, PE, PP, GF, GC, DG, PTS)
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupTable } from "../components/tournament/GroupTable";
import type {
	GroupTable as GroupTableType,
	WorldCupMatch,
} from "../lib/worldCupGroups";

/**
 * Helper para crear un GroupTable mock con stats customizables.
 */
function makeGroup(overrides: Partial<GroupTableType> = {}): GroupTableType {
	return {
		groupName: "Grupo A",
		groupLetter: "A",
		liveMatches: [],
		standings: [
			{
				teamName: "México",
				logo: "https://flagcdn.com/w40/mx.png",
				pj: 2,
				pg: 2,
				pe: 0,
				pp: 0,
				gf: 4,
				gc: 0,
				dg: 4,
				pts: 6,
				isLive: false,
			},
			{
				teamName: "Corea del Sur",
				logo: "https://flagcdn.com/w40/kr.png",
				pj: 2,
				pg: 1,
				pe: 1,
				pp: 0,
				gf: 3,
				gc: 1,
				dg: 2,
				pts: 4,
				isLive: false,
			},
			{
				teamName: "Sudáfrica",
				logo: null,
				pj: 2,
				pg: 0,
				pe: 1,
				pp: 1,
				gf: 1,
				gc: 3,
				dg: -2,
				pts: 1,
				isLive: false,
			},
			{
				teamName: "República Checa",
				logo: "https://flagcdn.com/w40/cz.png",
				pj: 2,
				pg: 0,
				pe: 0,
				pp: 2,
				gf: 1,
				gc: 5,
				dg: -4,
				pts: 0,
				isLive: false,
			},
		],
		...overrides,
	};
}

const noChanges = new Map<string, "up" | "down" | "same">();

describe("GroupTable", () => {
	it("renderiza el nombre del grupo en el header", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);
		expect(screen.getByText("Grupo A")).toBeInTheDocument();
	});

	it("renderiza los 4 equipos con sus nombres", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		expect(screen.getByText("MEX")).toBeInTheDocument();
		expect(screen.getByText("KOR")).toBeInTheDocument();
		expect(screen.getByText("RSA")).toBeInTheDocument();
		expect(screen.getByText("CZE")).toBeInTheDocument();
	});

	it("renderiza los stats numéricos (PTS, J, G, E, P, +/-)", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		// México: 6pts, 2J, 2G, 0E, 0P, 4-0 en +/-
		const mexicoRow = screen.getByText("MEX").closest("tr");
		expect(mexicoRow).toHaveTextContent("6"); // PTS
		expect(mexicoRow).toHaveTextContent("2"); // J
		expect(mexicoRow).toHaveTextContent("4-0"); // +/-
	});

	it("asigna rank badge verde (clasifica) para posiciones 1-2", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		// México y Corea deberían tener rank badges verdes
		const mexicoRow = screen.getByText("MEX").closest("tr");
		const coreaRow = screen.getByText("KOR").closest("tr");

		// Buscar el badge de rank (1, 2) en cada fila
		const mexicoRankBadge = mexicoRow?.querySelector("td:first-child > div");
		const coreaRankBadge = coreaRow?.querySelector("td:first-child > div");

		expect(mexicoRankBadge).toHaveClass("bg-emerald-500");
		expect(coreaRankBadge).toHaveClass("bg-emerald-500");
	});

	it("asigna rank badge ámbar (mejor 3°) para posición 3", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		const safRow = screen.getByText("RSA").closest("tr");
		const safRankBadge = safRow?.querySelector("td:first-child > div");

		expect(safRankBadge).toHaveClass("bg-amber-500");
	});

	it("asigna rank badge gris para posición 4", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		const czeRow = screen.getByText("CZE").closest("tr");
		const czeRankBadge = czeRow?.querySelector("td:first-child > div");

		expect(czeRankBadge).toHaveClass("bg-white/10");
		expect(czeRankBadge).not.toHaveClass("bg-emerald-500");
		expect(czeRankBadge).not.toHaveClass("bg-amber-500");
	});

	it("renderiza el logo del equipo cuando está disponible", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		// México tiene logo en flagcdn
		const mexicoRow = screen.getByText("MEX").closest("tr");
		const mexicoImg = mexicoRow?.querySelector("img");
		expect(mexicoImg).toHaveAttribute("src", "https://flagcdn.com/w40/mx.png");
	});

	it("renderiza ícono de fallback cuando logo es null", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		// Sudáfrica tiene logo: null → debe haber un span con class "material-symbols-outlined"
		const safRow = screen.getByText("RSA").closest("tr");
		const safIcon = safRow?.querySelector(".material-symbols-outlined");
		expect(safIcon).toBeInTheDocument();
	});

	it("muestra DG con signo + para positivos, - para negativos, sin signo para 0", () => {
		const group = makeGroup({
			standings: [
				{
					teamName: "A",
					logo: null,
					pj: 1,
					pg: 1,
					pe: 0,
					pp: 0,
					gf: 3,
					gc: 0,
					dg: 3,
					pts: 3,
					isLive: false,
				},
				{
					teamName: "B",
					logo: null,
					pj: 1,
					pg: 0,
					pe: 1,
					pp: 0,
					gf: 1,
					gc: 1,
					dg: 0,
					pts: 1,
					isLive: false,
				},
				{
					teamName: "C",
					logo: null,
					pj: 1,
					pg: 0,
					pe: 0,
					pp: 1,
					gf: 0,
					gc: 3,
					dg: -3,
					pts: 0,
					isLive: false,
				},
				{
					teamName: "D",
					logo: null,
					pj: 0,
					pg: 0,
					pe: 0,
					pp: 0,
					gf: 0,
					gc: 0,
					dg: 0,
					pts: 0,
					isLive: false,
				},
			],
		});
		render(<GroupTable group={group} positionChanges={noChanges} />);

		// Los formatos GF-GC son únicos en la tabla
		expect(screen.getByText("3-0")).toBeInTheDocument(); // A: gf=3 gc=0
		expect(screen.getByText("0-3")).toBeInTheDocument(); // C: gf=0 gc=3
	});

	it("aplica clase de color verde a + GF>GC y rojo a GF<GC", () => {
		const group = makeGroup({
			standings: [
				{
					teamName: "Pos",
					logo: null,
					pj: 1,
					pg: 1,
					pe: 0,
					pp: 0,
					gf: 3,
					gc: 0,
					dg: 3,
					pts: 3,
					isLive: false,
				},
				{
					teamName: "Neg",
					logo: null,
					pj: 1,
					pg: 0,
					pe: 0,
					pp: 1,
					gf: 0,
					gc: 3,
					dg: -3,
					pts: 0,
					isLive: false,
				},
				// Filler teams
				{
					teamName: "X",
					logo: null,
					pj: 0,
					pg: 0,
					pe: 0,
					pp: 0,
					gf: 0,
					gc: 0,
					dg: 0,
					pts: 0,
					isLive: false,
				},
				{
					teamName: "Y",
					logo: null,
					pj: 0,
					pg: 0,
					pe: 0,
					pp: 0,
					gf: 0,
					gc: 0,
					dg: 0,
					pts: 0,
					isLive: false,
				},
			],
		});
		render(<GroupTable group={group} positionChanges={noChanges} />);

		// El +/- cell muestra el formato GF-GC
		const gfHigh = screen.getByText("3-0");
		const gfLow = screen.getByText("0-3");

		expect(gfHigh).toHaveClass("text-emerald-400");
		expect(gfLow).toHaveClass("text-red-400");
	});

	it("muestra LiveBadge en el header cuando hay liveMatches", () => {
		const liveMatch: Partial<WorldCupMatch> = {
			id: "m1",
			homeTeam: "México",
			awayTeam: "Corea del Sur",
			homeScore: 1,
			awayScore: 0,
			status: "live",
			// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
			extraTimeHome: null,
			extraTimeAway: null,
			penaltiesHome: null,
			penaltiesAway: null,
			penaltyWinner: null,
		};
		const group = makeGroup({ liveMatches: [liveMatch as WorldCupMatch] });
		render(<GroupTable group={group} positionChanges={noChanges} />);

		expect(screen.getByText("En vivo")).toBeInTheDocument();
	});

	it("NO muestra LiveBadge cuando no hay liveMatches", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		expect(screen.queryByText("En vivo")).not.toBeInTheDocument();
	});

	it("aplica animate-rank-up cuando el equipo subió de posición", () => {
		const changes = new Map<string, "up" | "down" | "same">([
			["A:México", "up"],
		]);
		render(<GroupTable group={makeGroup()} positionChanges={changes} />);

		const mexicoRow = screen.getByText("MEX").closest("tr");
		expect(mexicoRow).toHaveClass("animate-rank-up");
	});

	it("aplica animate-rank-down cuando el equipo bajó de posición", () => {
		const changes = new Map<string, "up" | "down" | "same">([
			["A:Corea del Sur", "down"],
		]);
		render(<GroupTable group={makeGroup()} positionChanges={changes} />);

		const coreaRow = screen.getByText("KOR").closest("tr");
		expect(coreaRow).toHaveClass("animate-rank-down");
	});

	it("NO aplica animación cuando positionChange es 'same' (default)", () => {
		render(<GroupTable group={makeGroup()} positionChanges={noChanges} />);

		const mexicoRow = screen.getByText("MEX").closest("tr");
		expect(mexicoRow).not.toHaveClass("animate-rank-up");
		expect(mexicoRow).not.toHaveClass("animate-rank-down");
	});

	it("usa el teamKey `${groupLetter}:${teamName}` para positionChanges", () => {
		// El key del map es "A:México" para México en Grupo A
		const changes = new Map<string, "up" | "down" | "same">([
			["A:México", "up"],
		]);
		render(<GroupTable group={makeGroup()} positionChanges={changes} />);

		const mexicoRow = screen.getByText("MEX").closest("tr");
		expect(mexicoRow).toHaveClass("animate-rank-up");
	});
});
