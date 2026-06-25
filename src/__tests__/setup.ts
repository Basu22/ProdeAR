import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

// ============================================================================
// Sprint 5D: Mocks globales para BracketQuadro (carrusel horizontal)
// ============================================================================

// ── scrollIntoView: jsdom no lo implementa ──
Element.prototype.scrollIntoView = vi.fn();

// ── scrollTo: jsdom no lo implementa en Element (sí en window) ──
// Sprint 5D Issue #1 fix: BracketQuadro usa container.scrollTo({ left })
// en vez de scrollIntoView para evitar scroll vertical no deseado.
Element.prototype.scrollTo = vi.fn();

// ── getBoundingClientRect: jsdom retorna 0,0,0,0 por defecto.
// Sprint 5D: BracketQuadro usa este método para verificar si una columna
// ya está visible antes de llamar a scrollIntoView. Sin un mock, el check
// falla (0 >= 0 es true) y el effect bail-out, por lo que scrollIntoView
// nunca se llama. Este mock devuelve posiciones variables para que el
// check funcione correctamente.
//
// Para elementos con data-round (columnas del carrusel): cada una ocupa
// un slot horizontal de 300px. El container "ocupa" 1000px de viewport.
// → R32, R16, QF quedan dentro del viewport (visibles, no scroll).
// → SF, F quedan fuera del viewport (no visibles, disparan scroll).
const ROUND_INDEX: Record<string, number> = {
	R32: 0,
	R16: 1,
	QF: 2,
	SF: 3,
	F: 4,
	"3RD": 4, // 3RD mapea a F para el scroll
};
const COLUMN_WIDTH = 300;
const VIEWPORT_WIDTH = 1000;

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
	const dataRound = this.getAttribute?.("data-round");
	if (dataRound && dataRound in ROUND_INDEX) {
		const index = ROUND_INDEX[dataRound]!;
		const left = index * COLUMN_WIDTH;
		return {
			x: left,
			y: 0,
			width: COLUMN_WIDTH,
			height: 800,
			top: 0,
			right: left + COLUMN_WIDTH,
			bottom: 800,
			left,
			toJSON: () => ({}),
		} as DOMRect;
	}
	// Container del carrusel: ocupa todo el viewport
	if (this.querySelector?.("[data-round]")) {
		return {
			x: 0,
			y: 0,
			width: VIEWPORT_WIDTH,
			height: 800,
			top: 0,
			right: VIEWPORT_WIDTH,
			bottom: 800,
			left: 0,
			toJSON: () => ({}),
		} as DOMRect;
	}
	return originalGetBoundingClientRect.call(this);
};

// ── matchMedia: jsdom no lo implementa ──
// Default: prefers-reduced-motion NO está activo.
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// ── IntersectionObserver: jsdom no lo implementa ──
// Mock con método `trigger()` para que los tests puedan simular
// entradas de intersección manualmente.
export class MockIntersectionObserver {
	readonly root: Element | null = null;
	readonly rootMargin: string = "";
	readonly thresholds: ReadonlyArray<number> = [];
	callback: IntersectionObserverCallback;
	observedTargets: Set<Element> = new Set();
	static instances: MockIntersectionObserver[] = [];

	constructor(
		callback: IntersectionObserverCallback,
		options?: IntersectionObserverInit,
	) {
		this.callback = callback;
		if (options?.threshold !== undefined) {
			this.thresholds = Array.isArray(options.threshold)
				? options.threshold
				: [options.threshold];
		}
		MockIntersectionObserver.instances.push(this);
	}

	observe(target: Element): void {
		this.observedTargets.add(target);
	}
	unobserve(target: Element): void {
		this.observedTargets.delete(target);
	}
	disconnect(): void {
		this.observedTargets.clear();
	}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}

	/** Test helper: simular entradas de intersección. */
	trigger(entries: Array<Partial<IntersectionObserverEntry>>): void {
		const fullEntries = entries.map((e) => ({
			isIntersecting: true,
			intersectionRatio: 0.5,
			boundingClientRect: new DOMRectReadOnly(),
			intersectionRect: new DOMRectReadOnly(),
			rootBounds: null,
			target: e.target ?? document.createElement("div"),
			time: performance.now(),
			...e,
		})) as IntersectionObserverEntry[];
		this.callback(fullEntries, this as unknown as IntersectionObserver);
	}

	static get latest(): MockIntersectionObserver {
		const last =
			MockIntersectionObserver.instances[
				MockIntersectionObserver.instances.length - 1
			];
		if (!last) throw new Error("No MockIntersectionObserver instances");
		return last;
	}

	static reset(): void {
		MockIntersectionObserver.instances = [];
	}
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// ── ResizeObserver: jsdom no lo implementa ──
class MockResizeObserver {
	callback: ResizeObserverCallback;
	observedTargets: Set<Element> = new Set();
	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}
	observe(target: Element): void {
		this.observedTargets.add(target);
	}
	unobserve(target: Element): void {
		this.observedTargets.delete(target);
	}
	disconnect(): void {
		this.observedTargets.clear();
	}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ── Cleanup entre tests ──
beforeEach(() => {
	MockIntersectionObserver.reset();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.useRealTimers();
});
