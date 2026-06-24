/**
 * Tests para `src/hooks/useActiveRound.ts`.
 *
 * Sprint 5D: Hook que detecta la ronda visible en el carrusel horizontal
 * usando IntersectionObserver.
 *
 * ============================================================================
 * COBERTURA (4 tests)
 * ============================================================================
 * 1. Retorna null en primer render (antes de que el observer dispare)
 * 2. Retorna la ronda con mayor intersectionRatio cuando el observer dispara
 * 3. Ignora entradas cuando isProgrammaticScroll.current === true
 * 4. Desconecta el observer en unmount
 * ============================================================================
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useActiveRound } from "../hooks/useActiveRound";
import { MockIntersectionObserver } from "./setup";
import type { RoundAbbreviation } from "../lib/roundNames";
import { useRef } from "react";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crea un container con columnas que tienen `data-round` attributes.
 * Retorna el container y un mapa de columnas por abreviatura.
 */
function createContainerWithColumns(
	rounds: RoundAbbreviation[],
): { container: HTMLDivElement; columns: Map<RoundAbbreviation, HTMLDivElement> } {
	const container = document.createElement("div");
	const columns = new Map<RoundAbbreviation, HTMLDivElement>();

	for (const round of rounds) {
		const col = document.createElement("div");
		col.setAttribute("data-round", round);
		container.appendChild(col);
		columns.set(round, col);
	}

	document.body.appendChild(container);
	return { container, columns };
}

// ============================================================================
// TESTS
// ============================================================================

describe("useActiveRound", () => {
	let container: HTMLDivElement;
	let columns: Map<RoundAbbreviation, HTMLDivElement>;

	beforeEach(() => {
		const setup = createContainerWithColumns(["R32", "R16", "QF", "SF", "F"]);
		container = setup.container;
		columns = setup.columns;
	});

	afterEach(() => {
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	it("retorna null en primer render (antes de que el observer dispare)", () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(container);
			const isProgrammaticScroll = useRef(false);
			return useActiveRound(
				ref,
				["R32", "R16", "QF", "SF", "F"],
				isProgrammaticScroll,
			);
		});

		// El hook inicializa con null porque el observer aún no ha disparado
		expect(result.current).toBeNull();
	});

	it("retorna la ronda con mayor intersectionRatio cuando el observer dispara", () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(container);
			const isProgrammaticScroll = useRef(false);
			return useActiveRound(
				ref,
				["R32", "R16", "QF", "SF", "F"],
				isProgrammaticScroll,
			);
		});

		// Obtener el observer creado por el hook
		const observer = MockIntersectionObserver.latest;

		// Simular entradas de intersección: R32 con ratio 0.3, R16 con ratio 0.8
		const colR32 = columns.get("R32")!;
		const colR16 = columns.get("R16")!;

		act(() => {
			observer.trigger([
				{ target: colR32, isIntersecting: true, intersectionRatio: 0.3 },
				{ target: colR16, isIntersecting: true, intersectionRatio: 0.8 },
			]);
		});

		// Debe retornar R16 porque tiene el mayor intersectionRatio
		expect(result.current).toBe("R16");
	});

	it("ignora entradas cuando isProgrammaticScroll.current === true", () => {
		// Crear un ref mutable que podemos modificar desde fuera del hook
		const programmaticRef = { current: true };

		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(container);
			// Usar el ref externo directamente
			return useActiveRound(
				ref,
				["R32", "R16", "QF", "SF", "F"],
				programmaticRef,
			);
		});

		// Obtener el observer creado por el hook
		const observer = MockIntersectionObserver.latest;

		// Simular entradas de intersección con ratio alto
		const colR32 = columns.get("R32")!;

		act(() => {
			observer.trigger([
				{ target: colR32, isIntersecting: true, intersectionRatio: 0.8 },
			]);
		});

		// Debe seguir siendo null porque isProgrammaticScroll es true
		expect(result.current).toBeNull();
	});

	it("desconecta el observer en unmount", () => {
		const { unmount } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(container);
			const isProgrammaticScroll = useRef(false);
			return useActiveRound(
				ref,
				["R32", "R16", "QF", "SF", "F"],
				isProgrammaticScroll,
			);
		});

		// Obtener el observer creado por el hook
		const observer = MockIntersectionObserver.latest;
		const disconnectSpy = vi.spyOn(observer, "disconnect");

		// Desmontar el hook (debe llamar al cleanup del useEffect)
		unmount();

		// El observer debe haber sido desconectado
		expect(disconnectSpy).toHaveBeenCalled();
	});
});
