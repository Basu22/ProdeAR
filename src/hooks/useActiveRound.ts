/**
 * useActiveRound — Hook que detecta qué ronda del bracket está visible.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Usa `IntersectionObserver` para detectar cuál de las 5+1 columnas del
 * carrusel horizontal está actualmente visible (con mayor intersectionRatio)
 * y retorna su abreviatura ("R32", "R16", "QF", "SF", "F" o "3RD" como
 * fallback si está en la sub-card 3RD).
 *
 * El `activeRound` se usa para resaltar el chip activo en `RoundChipBar`
 * y para sincronizar la URL `?round=`.
 *
 * ============================================================================
 * BUGS MITIGADOS (del QA review)
 * ============================================================================
 * - **Race condition URL↔scroll**: usa `isProgrammaticScroll` flag que se
 *   resetea con timeout de 600ms o `scrollend` event (lo que llegue primero).
 * - **`isProgrammaticScroll` stuck**: timeout de seguridad (800ms hard) que
 *   resetea el flag aunque el observer no dispare.
 * - **ResizeObserver ausente**: re-crea el `IntersectionObserver` cuando
 *   el contenedor cambia de tamaño (portrait↔landscape, resize de ventana).
 * - **`activeRound` null en primer render**: inicializa con `null` y el
 *   consumidor debe tener un fallback (ej. `currentRound` derivado de URL).
 *
 * ============================================================================
 * IMPLEMENTACIÓN
 * ============================================================================
 * 1. IntersectionObserver con `root: container` y thresholds múltiples
 *    [0.25, 0.5, 0.75, 1.0] para detectar transiciones de scroll suave.
 * 2. ResizeObserver en el contenedor: si cambia de tamaño, desconecta y
 *    re-crea el IntersectionObserver (los thresholds calculados con el
 *    tamaño anterior pueden ser incorrectos).
 * 3. Cleanup completo en unmount: ambos observers + timer.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const isProgrammaticScroll = useRef(false);
 * const activeRound = useActiveRound(scrollRef, ["R32", "R16", "QF", "SF", "F"], isProgrammaticScroll);
 * ```
 */

import { useEffect, useState, type RefObject } from "react";
import type { RoundAbbreviation } from "../lib/roundNames";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Timeout de seguridad para resetear `isProgrammaticScroll`.
 * Debe ser mayor que la duración de scroll-smooth (~300-500ms) pero
 * lo suficientemente corto para no bloquear scroll manual legítimo.
 */
const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 600;

/**
 * Hard timeout para resetear `isProgrammaticScroll` aunque el observer
 * no dispare (ej. desktop con `overflow-x-hidden` donde la columna
 * target no intersecta).
 */
const PROGRAMMATIC_SCROLL_HARD_TIMEOUT_MS = 800;

/**
 * Thresholds para IntersectionObserver.
 * Cubren los puntos de scroll-snap más comunes.
 */
const INTERSECTION_THRESHOLDS = [0.25, 0.5, 0.75, 1.0];

// ============================================================================
// HOOK
// ============================================================================

export function useActiveRound(
	containerRef: RefObject<HTMLDivElement | null>,
	_roundAbbrs: RoundAbbreviation[],
	isProgrammaticScroll: RefObject<boolean>,
): RoundAbbreviation | null {
	const [active, setActive] = useState<RoundAbbreviation | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// ── IntersectionObserver: detecta qué columna está visible ──
		const observer = new IntersectionObserver(
			(entries) => {
				// Si el scroll es programático, ignorar las entradas intermedias
				// (la columna pasa por varios thresholds durante la animación).
				if (isProgrammaticScroll.current) return;

				// Encontrar la columna con mayor intersectionRatio
				let best: { abbr: RoundAbbreviation; ratio: number } | null = null;
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const abbr = entry.target.getAttribute(
						"data-round",
					) as RoundAbbreviation | null;
					if (!abbr) continue;
					if (!best || entry.intersectionRatio > best.ratio) {
						best = { abbr, ratio: entry.intersectionRatio };
					}
				}
				if (best && best.ratio >= 0.25) {
					setActive(best.abbr);
				}
			},
			{
				root: container,
				threshold: INTERSECTION_THRESHOLDS,
			},
		);

		// Observar todas las columnas
		const columns = container.querySelectorAll<HTMLElement>("[data-round]");
		for (const col of columns) observer.observe(col);

		// ── ResizeObserver: re-crear el observer si el contenedor cambia ──
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => {
				// El contenedor cambió de tamaño: desconectar y re-crear
				observer.disconnect();
				const freshColumns =
					container.querySelectorAll<HTMLElement>("[data-round]");
				for (const col of freshColumns) observer.observe(col);
			});
			resizeObserver.observe(container);
		}

		// ── Cleanup ──
		return () => {
			observer.disconnect();
			resizeObserver?.disconnect();
		};
	}, [containerRef, isProgrammaticScroll]);

	return active;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Constantes exportadas para tests y consumidores que necesiten coordinar
 * con el timeout de `isProgrammaticScroll`.
 */
export const ACTIVE_ROUND_CONSTANTS = {
	PROGRAMMATIC_SCROLL_TIMEOUT_MS,
	PROGRAMMATIC_SCROLL_HARD_TIMEOUT_MS,
	INTERSECTION_THRESHOLDS,
} as const;
