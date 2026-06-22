/**
 * useOnboardingTour — Hook para disparar tours de onboarding con driver.js.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * function Ligas() {
 *   useOnboardingTour("onboarding-ligas");
 *   // ...
 * }
 * ```
 *
 * El hook hace 3 cosas:
 * 1. Verifica que el tour NO haya sido completado previamente (localStorage).
 * 2. Verifica que el dispositivo sea mobile (si el tour es mobile-only).
 * 3. Dispara un `CustomEvent("prodear:start-tour", { detail: { tourId } })`
 *    que el componente `OnboardingTour` (montado en AppLayout) escucha.
 *
 * Esto desacopla el trigger del componente de la ejecución de driver.js.
 *
 * ============================================================================
 * POR QUÉ UN EVENTO CUSTOM Y NO LLAMAR A DRIVER DIRECTAMENTE
 * ============================================================================
 * - Solo se instancia UN driver.js global (singleton en OnboardingTour).
 * - Si dos componentes piden el mismo tour, no se duplica.
 * - Cualquier parte de la app puede disparar un tour sin importar
 *   driver.js (más liviano en bundle).
 */

import { useEffect } from "react";
import { getTour } from "../lib/onboarding/tours";

const COMPLETED_KEY_PREFIX = "prodear:tour:";

/**
 * Mobile breakpoint (en pixels). Coincide con Tailwind `md` (768px).
 */
const MOBILE_MAX_WIDTH = 767;

export function isMobileViewport(): boolean {
	if (typeof window === "undefined") return false;
	return window.innerWidth <= MOBILE_MAX_WIDTH;
}

export function isTourCompleted(tourId: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		return (
			localStorage.getItem(`${COMPLETED_KEY_PREFIX}${tourId}:completed`) ===
			"true"
		);
	} catch {
		return false;
	}
}

export function markTourCompleted(tourId: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(`${COMPLETED_KEY_PREFIX}${tourId}:completed`, "true");
	} catch {
		// localStorage no disponible
	}
}

export function resetTour(tourId: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(`${COMPLETED_KEY_PREFIX}${tourId}:completed`);
	} catch {
		// ignorar
	}
}

export interface UseOnboardingTourResult {
	startTour: () => void;
	resetTour: () => void;
	isCompleted: boolean;
}

export function useOnboardingTour(tourId: string): UseOnboardingTourResult {
	const tour = getTour(tourId);
	const completed = isTourCompleted(tourId);

	// Disparar automáticamente al montar si está OK
	useEffect(() => {
		if (!tour) return;
		if (completed) return;
		if (tour.mobileOnly && !isMobileViewport()) return;

		// Pequeño delay para que el componente termine de montar y los
		// elementos target existan en el DOM
		const timeoutId = setTimeout(() => {
			startTourInternal(tourId);
		}, 600);

		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tourId]);

	function startTourInternal(id: string) {
		window.dispatchEvent(
			new CustomEvent("prodear:start-tour", { detail: { tourId: id } }),
		);
	}

	function startTour() {
		startTourInternal(tourId);
	}

	function reset() {
		resetTour(tourId);
	}

	return { startTour, resetTour: reset, isCompleted: completed };
}
