/**
 * Tests para `src/components/tournament/BestThirdsTable.tsx`.
 *
 * BestThirdsTable renderiza la tabla de los 12 mejores terceros lugares
 * del Mundial con:
 * - Top 8 en verde (clasifican a 16vos)
 * - Bottom 4 en rojo con opacidad reducida (eliminados)
 * - Línea de corte visual en la fila 8° (border-b-2 border-b-error)
 * - Header con contexto ("Los 8 mejores clasifican a 16vos")
 *
 * Sprint 5: se removieron la columna ESTADO (badge "Clasifica"/"Fuera") y la
 * leyenda al pie. La comunicación de clasificado/eliminado es ahora
 * exclusivamente visual (color verde/rojo + opacidad + línea de corte).
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

	it("NO renderiza la columna ESTADO con badges (Sprint 5: removida por redundancia visual)", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		// No debe haber badges "Clasifica" ni "Fuera" en el DOM
		expect(screen.queryAllByText("Clasifica")).toHaveLength(0);
		expect(screen.queryAllByText("Fuera")).toHaveLength(0);
		// El aria-label del badge tampoco debe estar
		expect(screen.queryAllByLabelText("Clasifica a 16vos")).toHaveLength(0);
		expect(screen.queryAllByLabelText("Eliminado")).toHaveLength(0);
	});

	it("NO renderiza leyenda al pie (Sprint 5: removida por redundancia visual)", () => {
		render(<BestThirdsTable bestThirds={makeBestThirds()} />);

		expect(screen.queryByText("Clasifica a 16vos")).not.toBeInTheDocument();
		expect(screen.queryByText("Eliminado")).not.toBeInTheDocument();
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

	it("respeta qualifyCount custom (no siempre 8) — línea de corte se mueve", () => {
		const custom = makeBestThirds({ qualifyCount: 6, cutoffIndex: 5 });
		const { container } = render(<BestThirdsTable bestThirds={custom} />);

		// La línea de corte debe estar en la fila 6 (no 8)
		const row6 = rowForRank(container, 6);
		expect(row6).toHaveClass("border-b-2");
		expect(row6).toHaveClass("border-b-error");

		// La fila 7 (primera eliminada) debe tener opacity-60
		const row7 = rowForRank(container, 7);
		expect(row7).toHaveClass("opacity-60");

		// Solo 6 filas clasificadas (1-6 sin opacidad), 6 eliminadas (7-12)
		for (let i = 1; i <= 6; i++) {
			const row = rowForRank(container, i);
			expect(row).not.toHaveClass("opacity-60");
		}
		for (let i = 7; i <= 12; i++) {
			const row = rowForRank(container, i);
			expect(row).toHaveClass("opacity-60");
		}

		// Texto del header refleja el cutoff
		const subtitle = container.querySelector("p.text-on-surface-variant");
		expect(subtitle?.textContent).toMatch(/Los 6 mejores clasifican/i);
	});
});
