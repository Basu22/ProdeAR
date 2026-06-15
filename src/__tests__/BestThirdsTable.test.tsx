/**
 * Tests para `src/components/tournament/BestThirdsTable.tsx`.
 *
 * BestThirdsTable renderiza la tabla de los 12 mejores terceros lugares
 * del Mundial con:
 * - Top 8 en verde con badge "Clasifica" (qualify a 16vos)
 * - Bottom 4 en rojo con opacidad reducida y badge "Fuera"
 * - Línea de corte visual en la fila 8° (border-b-2 border-b-error)
 * - Header con contexto ("Los 8 mejores clasifican a 16vos")
 * - Leyenda al final
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestThirdsTable } from "../components/tournament/BestThirdsTable";
import type { BestThirdsTable as BestThirdsTableType } from "../lib/worldCupGroups";

/**
 * Helper: crea un BestThirdsTable mock con N terceros y stats customizables.
 *
 * `qualifyCount` determina cuántos terceros clasifican (los primeros N
 * tienen `qualifies: true`, el resto `false`). Esto refleja el comportamiento
 * real de `calculateBestThirds`.
 */
function makeBestThirds(
	overrides: Partial<BestThirdsTableType> = {},
): BestThirdsTableType {
	const qualifyCount = overrides.qualifyCount ?? 8;
	const teams: BestThirdsTableType["standings"] = Array.from(
		{ length: 12 },
		(_, i) => ({
			teamName: `Team ${i + 1}`,
			logo: null,
			pj: 3,
			pg: 1,
			pe: 0,
			pp: 2,
			gf: Math.max(0, 12 - i),
			gc: 3,
			dg: Math.max(0, 12 - i) - 3,
			pts: Math.max(0, 12 - i), // Decreciente: 12, 11, 10, ..., 1
			isLive: false,
			groupLetter: String.fromCharCode(65 + i), // A, B, C, ...
			qualifies: i < qualifyCount,
			rank: i + 1,
		}),
	);

	return {
		qualifyCount: 8,
		cutoffIndex: 7,
		standings: teams,
		...overrides,
	};
}

describe("BestThirdsTable", () => {
	/**
	 * Helper: busca la fila del tbody con rank N. Más robusto que
	 * `getByText(String(rank))` porque el número aparece en múltiples
	 * celdas (PTS, GF, GC, DG).
	 */
	function rowForRank(container: HTMLElement, rank: number): HTMLElement {
		const tbody = container.querySelector("tbody");
		if (!tbody) throw new Error("No tbody found");
		const rows = tbody.querySelectorAll("tr");
		// rows[rank - 1] porque ranks van 1-12
		const row = rows[rank - 1];
		if (!row) throw new Error(`No row for rank ${rank}`);
		return row as HTMLElement;
	}

	it("renderiza el título y contexto del header", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		expect(screen.getByText("Mejores terceros")).toBeInTheDocument();
		// El número 8 está en un <span> separado, no se puede usar getByText
		// directamente. Buscamos el <p> del subtítulo por selector.
		const subtitle = container.querySelector("p.text-on-surface-variant");
		expect(subtitle?.textContent).toMatch(/Los 8 mejores clasifican/i);
	});

	it("renderiza las 12 filas (una por grupo)", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		const rows = container.querySelectorAll("tbody tr");
		expect(rows.length).toBe(12);
	});

	it("muestra rank 1-12 secuencial en círculos de badge", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		// El rank badge es el primer div dentro del primer td de cada fila
		const rows = container.querySelectorAll("tbody tr");
		rows.forEach((row, index) => {
			const rankBadge = row.querySelector("td:first-child > div");
			expect(rankBadge?.textContent).toBe(String(index + 1));
		});
	});

	it("muestra badge 'Clasifica' para los primeros 8 (verde)", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		const clasificaBadges = screen.getAllByText("Clasifica");
		expect(clasificaBadges).toHaveLength(8);
	});

	it("muestra badge 'Fuera' para los últimos 4 (rojo)", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		const fueraBadges = screen.getAllByText("Fuera");
		expect(fueraBadges).toHaveLength(4);
	});

	it("muestra la letra del grupo (GR) en una columna dedicada", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		// Las letras A-L deben estar todas
		for (const letter of [
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
		]) {
			expect(screen.getByText(letter)).toBeInTheDocument();
		}
	});

	it("aplica línea de corte (border-b-error) en la fila 8°", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		const row8 = rowForRank(container, 8);
		expect(row8).toHaveClass("border-b-2");
		expect(row8).toHaveClass("border-b-error");
	});

	it("NO aplica línea de corte en filas 1-7", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		for (let i = 1; i <= 7; i++) {
			const row = rowForRank(container, i);
			expect(row).not.toHaveClass("border-b-2");
		}
	});

	it("aplica opacidad reducida (opacity-60) a filas eliminadas", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		// Fila 9 (la primera eliminada) debe tener opacity-60
		const row9 = rowForRank(container, 9);
		expect(row9).toHaveClass("opacity-60");
	});

	it("NO aplica opacity-60 a filas clasificadas (1-8)", () => {
		const { container } = render(
			<BestThirdsTable bestThirds={makeBestThirds()} />,
		);

		for (let i = 1; i <= 8; i++) {
			const row = rowForRank(container, i);
			expect(row).not.toHaveClass("opacity-60");
		}
	});

	it("muestra leyenda con 'Clasifica a 16vos' y 'Eliminado'", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		expect(screen.getByText("Clasifica a 16vos")).toBeInTheDocument();
		expect(screen.getByText("Eliminado")).toBeInTheDocument();
	});

	it("renderiza el estado vacío cuando standings está vacío", () => {
		const empty = makeBestThirds({
			standings: [],
			qualifyCount: 0,
			cutoffIndex: -1,
		});
		render(<BestThirdsTable bestThirds={empty} />);

		expect(
			screen.getByText("No hay datos de terceros lugares"),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Esperando que se jueguen partidos/i),
		).toBeInTheDocument();
	});

	it("respeta qualifyCount custom (no siempre 8)", () => {
		const custom = makeBestThirds({ qualifyCount: 6, cutoffIndex: 5 });
		const { container } = render(<BestThirdsTable bestThirds={custom} />);

		// Solo 6 clasifican
		expect(screen.getAllByText("Clasifica")).toHaveLength(6);
		expect(screen.getAllByText("Fuera")).toHaveLength(6);
		// Texto del header refleja el cutoff
		const subtitle = container.querySelector("p.text-on-surface-variant");
		expect(subtitle?.textContent).toMatch(/Los 6 mejores clasifican/i);
	});
});
