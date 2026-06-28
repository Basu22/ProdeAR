/**
 * Tests para `src/components/tournament/PositionsView.tsx`.
 *
 * PositionsView es el wrapper principal del tab POSICIONES del Mundial.
 * Renderiza:
 * - 3 sub-pills (GRUPOS, LIGA 3ROS, LLAVES) — todos habilitados post-Sprint 3
 * - Badge contador de partidos en vivo en el pill GRUPOS
 * - Contenido según la pill activa:
 *   - GRUPOS: grid de 12 GroupTable
 *   - LIGA 3ROS: BestThirdsTable
 *   - LLAVES: BracketTree (Sprint 4 — árbol completo de eliminatorias)
 * - Empty state cuando no hay grupos
 *
 * ESTRATEGIA DE MOCKING:
 * `useGroupStandings` se mockea con `vi.mock` para controlar los datos
 * que la vista recibe, sin depender del cálculo real.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Match } from "../lib/types";
import type { GroupTable, WorldCupMatch } from "../lib/worldCupGroups";

// Mock del hook useGroupStandings — ANTES de importar el componente
vi.mock("../hooks/useGroupStandings", () => ({
	useGroupStandings: vi.fn(),
}));

import { PositionsView } from "../components/tournament/PositionsView";
import { useGroupStandings } from "../hooks/useGroupStandings";

const mockedUseGroupStandings = vi.mocked(useGroupStandings);

/**
 * Helper: crea un Match[] mock vacío o con N partidos.
 */
function makeMatches(count: number = 0): WorldCupMatch[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `m-${i}`,
		competitionId: "1",
		homeTeam: "México",
		awayTeam: "Corea del Sur",
		homeLogo: null,
		awayLogo: null,
		matchday: i + 1,
		kickOff: "2026-06-11T18:00:00Z",
		homeScore: 0,
		awayScore: 0,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008)
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Group A",
		stageMultiplier: 1,
		status: "finished",
	}));
}

/**
 * Helper: crea 12 GroupTable mock con datos mínimos.
 */
function makeGroupTables(): GroupTable[] {
	return Array.from({ length: 12 }, (_, i) => ({
		groupName: `Grupo ${String.fromCharCode(65 + i)}`,
		groupLetter: String.fromCharCode(65 + i),
		liveMatches: [],
		standings: [
			{
				teamName: `Team ${i + 1}-1`,
				logo: null,
				pj: 3,
				pg: 2,
				pe: 1,
				pp: 0,
				gf: 5,
				gc: 1,
				dg: 4,
				pts: 7,
				isLive: false,
			},
			{
				teamName: `Team ${i + 1}-2`,
				logo: null,
				pj: 3,
				pg: 1,
				pe: 2,
				pp: 0,
				gf: 3,
				gc: 1,
				dg: 2,
				pts: 5,
				isLive: false,
			},
			{
				teamName: `Team ${i + 1}-3`,
				logo: null,
				pj: 3,
				pg: 1,
				pe: 1,
				pp: 1,
				gf: 2,
				gc: 2,
				dg: 0,
				pts: 4,
				isLive: false,
			},
			{
				teamName: `Team ${i + 1}-4`,
				logo: null,
				pj: 3,
				pg: 0,
				pe: 0,
				pp: 3,
				gf: 0,
				gc: 6,
				dg: -6,
				pts: 0,
				isLive: false,
			},
		],
	}));
}

function makeHookReturn(
	overrides: Partial<ReturnType<typeof useGroupStandings>> = {},
) {
	return {
		groupTables: makeGroupTables(),
		liveGroups: new Set<string>(),
		liveGroupsCount: 0,
		liveMatchesCount: 0,
		positionChanges: new Map<string, "up" | "down" | "same">(),
		...overrides,
	};
}

describe("PositionsView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedUseGroupStandings.mockReturnValue(makeHookReturn());
	});

	it("renderiza las 3 sub-pills (GRUPOS, LIGA 3ROS, LLAVES)", () => {
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		expect(screen.getByRole("tab", { name: /GRUPOS/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /LIGA 3ROS/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /LLAVES/i })).toBeInTheDocument();
	});

	it("empieza con el sub-pill 'GRUPOS' activo por default", () => {
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		const grupos = screen.getByRole("tab", { name: /GRUPOS/i });
		expect(grupos).toHaveAttribute("aria-selected", "true");
	});

	it("renderiza las 12 GroupTable cuando GRUPOS está activo", () => {
		const { container } = render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		// 12 GroupTable = 12 cards con nombre "Grupo X"
		for (let i = 0; i < 12; i++) {
			const letter = String.fromCharCode(65 + i);
			expect(screen.getByText(`Grupo ${letter}`)).toBeInTheDocument();
		}

		// Contar los <article> o equivalentes que el componente renderice
		// (al menos los nombres de los 12 grupos están)
		const groupHeadings = container.querySelectorAll("h3");
		expect(groupHeadings.length).toBeGreaterThanOrEqual(12);
	});

	it("cambia al contenido de LIGA 3ROS al hacer click en el pill", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		await user.click(screen.getByRole("tab", { name: /LIGA 3ROS/i }));

		// El título "Mejores terceros" debe aparecer (BestThirdsTable)
		expect(screen.getByText("Mejores terceros")).toBeInTheDocument();
		// El pill LIGA 3ROS ahora es el activo
		expect(screen.getByRole("tab", { name: /LIGA 3ROS/i })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("cambia al contenido de LLAVES al hacer click en el pill", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		await user.click(screen.getByRole("tab", { name: /LLAVES/i }));

		// El nav del RoundChipBar del BracketQuadro debe aparecer
		expect(
			screen.getByRole("navigation", { name: /rondas del mundial/i }),
		).toBeInTheDocument();
		// Y debe haber al menos una columna con data-round (ej. R32)
		expect(document.querySelector('[data-round="R32"]')).toBeInTheDocument();
		// El pill LLAVES ahora es el activo
		expect(screen.getByRole("tab", { name: /LLAVES/i })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("vuelve a GRUPOS al hacer click en el pill GRUPOS desde otra vista", async () => {
		const user = userEvent.setup();
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		// 1. Click en LLAVES
		await user.click(screen.getByRole("tab", { name: /LLAVES/i }));
		expect(
			screen.getByRole("navigation", { name: /rondas del mundial/i }),
		).toBeInTheDocument();

		// 2. Click en GRUPOS
		await user.click(screen.getByRole("tab", { name: /GRUPOS/i }));
		expect(screen.getByText("Grupo A")).toBeInTheDocument();
		// El nav del RoundChipBar ya NO debe estar
		expect(
			screen.queryByRole("navigation", { name: /rondas del mundial/i }),
		).not.toBeInTheDocument();
	});

	it("muestra badge con contador de partidos en vivo en el pill GRUPOS", () => {
		mockedUseGroupStandings.mockReturnValue(
			makeHookReturn({ liveMatchesCount: 3 }),
		);

		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		const gruposTab = screen.getByRole("tab", { name: /GRUPOS/i });
		expect(gruposTab).toHaveTextContent("3");
		// aria-label descriptivo
		expect(gruposTab).toHaveAccessibleName(/3 en vivo/i);
	});

	it("NO muestra badge en GRUPOS cuando liveMatchesCount es 0", () => {
		mockedUseGroupStandings.mockReturnValue(
			makeHookReturn({ liveMatchesCount: 0 }),
		);

		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		const gruposTab = screen.getByRole("tab", { name: /GRUPOS/i });
		// El texto "en vivo" no debería estar presente
		expect(gruposTab).not.toHaveAccessibleName(/en vivo/i);
	});

	it("renderiza empty state cuando no hay groupTables", () => {
		mockedUseGroupStandings.mockReturnValue(
			makeHookReturn({ groupTables: [] }),
		);

		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		expect(screen.getByText("No hay grupos disponibles")).toBeInTheDocument();
		expect(
			screen.getByText(/No se encontraron partidos de fase de grupos/i),
		).toBeInTheDocument();
	});

	it("renderiza la leyenda en la vista GRUPOS (Clasifica, Posible)", () => {
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		expect(screen.getByText("Clasifica a 16vos")).toBeInTheDocument();
		expect(
			screen.getByText("Posible clasificado (mejor 3°)"),
		).toBeInTheDocument();
	});

	it("pasa los matches al hook useGroupStandings", () => {
		const matches = makeMatches(5);
		render(
			<MemoryRouter>
				<PositionsView matches={matches} />
			</MemoryRouter>,
		);

		// El hook debe haber sido llamado con los matches que le pasamos
		expect(mockedUseGroupStandings).toHaveBeenCalledWith(matches);
	});

	it("re-renderiza cuando cambian los datos del hook (live count sube)", () => {
		mockedUseGroupStandings.mockReturnValue(
			makeHookReturn({ liveMatchesCount: 0 }),
		);

		const { rerender } = render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		// Inicialmente: sin badge
		const gruposTab = screen.getByRole("tab", { name: /GRUPOS/i });
		expect(gruposTab).not.toHaveAccessibleName(/en vivo/i);

		// Cambio el mock: ahora hay 2 partidos en vivo
		mockedUseGroupStandings.mockReturnValue(
			makeHookReturn({ liveMatchesCount: 2 }),
		);
		rerender(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		const gruposTab2 = screen.getByRole("tab", { name: /GRUPOS/i });
		expect(gruposTab2).toHaveAccessibleName(/2 en vivo/i);
	});

	it("los 3 pills están habilitados (no disabled) post-Sprint 3", () => {
		render(
			<MemoryRouter>
				<PositionsView matches={makeMatches()} />
			</MemoryRouter>,
		);

		const grupos = screen.getByRole("tab", { name: /GRUPOS/i });
		const mejores3ros = screen.getByRole("tab", { name: /LIGA 3ROS/i });
		const llaves = screen.getByRole("tab", { name: /LLAVES/i });

		expect(grupos).not.toBeDisabled();
		expect(mejores3ros).not.toBeDisabled();
		expect(llaves).not.toBeDisabled();
	});

	it("acepta Match[] vacío sin errores", () => {
		expect(() =>
			render(
				<MemoryRouter>
					<PositionsView matches={[]} />
				</MemoryRouter>,
			),
		).not.toThrow();
	});

	it("preserva el tipo de matches: acepta Match[] (no solo WorldCupMatch)", () => {
		// El componente se declara con `matches: Match[]`, no `WorldCupMatch[]`.
		// Esto verifica que la firma es correcta.
		const matches: Match[] = makeMatches(3) as Match[];
		expect(() =>
			render(
				<MemoryRouter>
					<PositionsView matches={matches} />
				</MemoryRouter>,
			),
		).not.toThrow();
	});
});
