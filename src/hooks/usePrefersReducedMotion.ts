/**
 * `usePrefersReducedMotion` — Hook que detecta si el usuario prefiere reduced motion.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Detecta la media query `prefers-reduced-motion: reduce` del sistema operativo
 * y re-renderiza cuando el usuario cambia la preferencia en vivo (ej. desde
 * DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion").
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const reduced = usePrefersReducedMotion();
 * const transition = reduced ? "none" : "transform 280ms ease";
 * ```
 *
 * ============================================================================
 * SSR SAFE
 * ============================================================================
 * En server render retorna `false` (asume motion habilitado por default).
 * En cliente se actualiza vía `useEffect` con `matchMedia`. No causa mismatch
 * de hidratación porque el primer render siempre es `false`.
 *
 * ============================================================================
 * CLEANUP
 * ============================================================================
 * El listener de `change` se desconecta en el cleanup del effect para evitar
 * memory leaks si el componente que usa el hook se desmonta.
 *
 * @module hooks/usePrefersReducedMotion
 */

import { useEffect, useState } from "react";

/**
 * Hook que retorna `true` si el usuario tiene `prefers-reduced-motion: reduce`
 * activo en su sistema operativo. Se re-evalúa si la preferencia cambia.
 *
 * @returns `true` si motion está reducido, `false` en caso contrario.
 */
export function usePrefersReducedMotion(): boolean {
	// SSR-safe: en server siempre false. En cliente se actualiza con effect.
	const [reduced, setReduced] = useState<boolean>(false);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;

		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		// Sincronizar estado inicial (puede haber cambiado entre SSR y mount)
		setReduced(mq.matches);

		const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return reduced;
}
