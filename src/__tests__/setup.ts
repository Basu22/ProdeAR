import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Sprint 5D: Mocks globales para BracketQuadro (carrusel horizontal)
// ============================================================================

// ── scrollIntoView: jsdom no lo implementa ──
Element.prototype.scrollIntoView = vi.fn();

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
		this.callback(fullEntries, this);
	}

	static get latest(): MockIntersectionObserver {
		const last = this.instances[this.instances.length - 1];
		if (!last) throw new Error("No MockIntersectionObserver instances");
		return last;
	}

	static reset(): void {
		this.instances = [];
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
