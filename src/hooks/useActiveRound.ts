/**
 * useActiveRound — Hook que detecta qué ronda del bracket está visible.
 *
 * ============================================================================
 * SPRINT 5D+ — EXTENSIÓN PARA ÁRBOL VISUAL
 * ============================================================================
 * Sprint 5D+ agrega el efecto visual de "árbol de eliminatorias" con líneas
 * conectoras entre partidos de rondas adyacentes. Para soportar este efecto,
 * el hook ahora retorna 3 valores:
 *
 * - `active`: la ronda con mayor `intersectionRatio` (la que el usuario está
 *   mirando). Se usa para resaltar el chip en el RoundChipBar.
 * - `leaving`: la ronda adyacente a `active` que se está dejando (sale del
 *   viewport por el lado opuesto). Se usa para mostrar el "gap" entre cards
 *   de la ronda que se está dejando.
 * - `scrollDirection`: "left" | "right" — la dirección del último scroll
 *   manual. Determina si `leaving` está a la izquierda o derecha de `active`.
 *
 * Ejemplo visual:
 *   R32 (active) ←───   R16 (leaving, con gap)   QF (out)
 *   ┌────────┐           ┌──────────┐
 *   │ card 1 │           │ card 1   │
 *   │ card 2 │  ────►    │          │  ← gap aparece en R16
 *   │ card 3 │           │ card 2   │
 *   │ card 4 │           │          │
 *   └────────┘           └──────────┘
 *
 * ============================================================================
 * BUGS MITIGADOS
 * ============================================================================
 * - Race condition URL↔scroll: usa isProgrammaticScroll flag + timeouts
 * - isProgrammaticScroll stuck: hard timeout 800ms
 * - ResizeObserver ausente: re-crea el IntersectionObserver
 * - activeRound null en primer render: inicializa con null, consumidor
 *   debe tener un fallback (currentRound derivado de URL)
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const isProgrammaticScroll = useRef(false);
 * const { active, leaving, scrollDirection } = useActiveRound(
 *   scrollRef, ROUND_ORDER, isProgrammaticScroll
 * );
 * ```
 */

import { useEffect, useState, type RefObject } from "react";
import type { RoundAbbreviation } from "../lib/roundNames";

// ============================================================================
// CONSTANTS
// ============================================================================

const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 600;
const PROGRAMMATIC_SCROLL_HARD_TIMEOUT_MS = 800;
const INTERSECTION_THRESHOLDS = [0.25, 0.5, 0.75, 1.0];

/**
 * Threshold para considerar que una columna está "saliendo" del viewport.
 * Si su intersectionRatio es < 0.15, la consideramos leaving.
 */
const LEAVING_THRESHOLD = 0.15;

// ============================================================================
// TYPES
// ============================================================================

export type ScrollDirection = "left" | "right" | "none";

export interface UseActiveRoundReturn {
	/** Ronda con mayor intersectionRatio (la que el usuario mira). */
	active: RoundAbbreviation | null;
	/**
	 * Ronda adyacente a `active` que se está dejando (saliendo del viewport
	 * por el lado opuesto a la dirección de scroll). null si no hay ronda
	 * saliendo (ej. active es la primera/última, o no hay scroll).
	 */
	leaving: RoundAbbreviation | null;
	/** Dirección del último scroll manual detectado. */
	scrollDirection: ScrollDirection;
}

// ============================================================================
// HOOK
// ============================================================================

export function useActiveRound(
	containerRef: RefObject<HTMLDivElement | null>,
	roundAbbrs: RoundAbbreviation[],
	isProgrammaticScroll: RefObject<boolean>,
): UseActiveRoundReturn {
	const [active, setActive] = useState<RoundAbbreviation | null>(null);
	const [leaving, setLeaving] = useState<RoundAbbreviation | null>(null);
	const [scrollDirection, setScrollDirection] =
		useState<ScrollDirection>("none");

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Mapa de ratios actuales por abreviatura
		const ratios = new Map<RoundAbbreviation, number>();
		for (const abbr of roundAbbrs) ratios.set(abbr, 0);

		// ── IntersectionObserver: detecta qué columna está visible ──
		const observer = new IntersectionObserver(
			(entries) => {
				if (isProgrammaticScroll.current) return;

				// Actualizar ratios
				for (const entry of entries) {
					const abbr = entry.target.getAttribute(
						"data-round",
					) as RoundAbbreviation | null;
					if (!abbr) continue;
					ratios.set(abbr, entry.intersectionRatio);
				}

				// Encontrar la ronda con mayor ratio
				let bestActive: { abbr: RoundAbbreviation; ratio: number } | null =
					null;
				for (const [abbr, ratio] of ratios) {
					if (ratio < 0.25) continue;
					if (!bestActive || ratio > bestActive.ratio) {
						bestActive = { abbr, ratio };
					}
				}

				if (bestActive) {
					setActive((prev) =>
						prev === bestActive!.abbr ? prev : bestActive!.abbr,
					);

					// Determinar la ronda "leaving" (la adyacente a active
					// con menor ratio)
					const activeIdx = roundAbbrs.indexOf(bestActive.abbr);
					const candidates: Array<{ abbr: RoundAbbreviation; idx: number }> =
						[];
					if (activeIdx > 0)
						candidates.push({
							abbr: roundAbbrs[activeIdx - 1]!,
							idx: activeIdx - 1,
						});
					if (activeIdx < roundAbbrs.length - 1)
						candidates.push({
							abbr: roundAbbrs[activeIdx + 1]!,
							idx: activeIdx + 1,
						});

					let bestLeaving: { abbr: RoundAbbreviation; ratio: number } | null =
						null;
					for (const cand of candidates) {
						const ratio = ratios.get(cand.abbr) ?? 0;
						// leaving: visible pero parcialmente (entre 0.05 y 0.5)
						if (ratio < 0.05 || ratio > 0.5) continue;
						if (!bestLeaving || ratio < bestLeaving.ratio) {
							bestLeaving = { abbr: cand.abbr, ratio };
						}
					}
					setLeaving(bestLeaving?.abbr ?? null);
				}
			},
			{
				root: container,
				threshold: INTERSECTION_THRESHOLDS,
			},
		);

		const columns = container.querySelectorAll<HTMLElement>("[data-round]");
		for (const col of columns) observer.observe(col);

		// ── Scroll listener: detectar dirección del scroll ──
		let lastScrollLeft = container.scrollLeft;
		const onScroll = () => {
			if (isProgrammaticScroll.current) {
				lastScrollLeft = container.scrollLeft;
				return;
			}
			const delta = container.scrollLeft - lastScrollLeft;
			if (Math.abs(delta) > 2) {
				setScrollDirection(delta > 0 ? "right" : "left");
				lastScrollLeft = container.scrollLeft;
			}
		};
		container.addEventListener("scroll", onScroll, { passive: true });

		// ── ResizeObserver ──
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => {
				observer.disconnect();
				const fresh =
					container.querySelectorAll<HTMLElement>("[data-round]");
				for (const col of fresh) observer.observe(col);
			});
			resizeObserver.observe(container);
		}

		return () => {
			observer.disconnect();
			resizeObserver?.disconnect();
			container.removeEventListener("scroll", onScroll);
		};
	}, [containerRef, isProgrammaticScroll, roundAbbrs]);

	return { active, leaving, scrollDirection };
}

// ============================================================================
// BACKWARDS-COMPATIBLE OVERLOAD
// ============================================================================

/**
 * Overload que mantiene la firma original del hook (retorna solo `active`).
 * Usar esto en código que no necesita `leaving` ni `scrollDirection`.
 */
export function useActiveRoundLegacy(
	containerRef: RefObject<HTMLDivElement | null>,
	roundAbbrs: RoundAbbreviation[],
	isProgrammaticScroll: RefObject<boolean>,
): RoundAbbreviation | null {
	const { active } = useActiveRound(
		containerRef,
		roundAbbrs,
		isProgrammaticScroll,
	);
	return active;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ACTIVE_ROUND_CONSTANTS = {
	PROGRAMMATIC_SCROLL_TIMEOUT_MS,
	PROGRAMMATIC_SCROLL_HARD_TIMEOUT_MS,
	INTERSECTION_THRESHOLDS,
	LEAVING_THRESHOLD,
} as const;
