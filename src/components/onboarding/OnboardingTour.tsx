/**
 * OnboardingTour — Componente singleton que escucha eventos `prodear:start-tour`
 * y ejecuta el driver de driver.js correspondiente.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Escucha `window.addEventListener("prodear:start-tour", ...)`.
 * 2. Cuando recibe un tourId, instancia el Driver de driver.js.
 * 3. Cuando el tour termina (destroy), marca el tour como completado en
 *    localStorage.
 *
 * ============================================================================
 * SINGLETON
 * ============================================================================
 * Solo se monta UNA vez en toda la app (en `AppLayout.tsx`). Es el único
 * import de `driver.js` en el proyecto.
 *
 * ============================================================================
 * LAZY IMPORT
 * ============================================================================
 * driver.js se importa dinámicamente (`await import("driver.js")`) para
 * que el bundle inicial no incluya la librería (se usa solo cuando el
 * usuario entra a /ligas por primera vez).
 */

import { useEffect, useRef } from "react";
import {
	isTourCompleted,
	markTourCompleted,
	resetTour,
} from "../../hooks/useOnboardingTour";
import {
	getDriverConfig,
	getTour,
	toDriverSteps,
} from "../../lib/onboarding/tours";

export function OnboardingTour() {
	// Ref para mantener la instancia del Driver (no se re-renderiza)
	const driverRef = useRef<unknown>(null);

	useEffect(() => {
		async function handleStartTour(event: Event) {
			const customEvent = event as CustomEvent<{ tourId: string }>;
			const tourId = customEvent.detail?.tourId;
			if (!tourId) return;

			const tour = getTour(tourId);
			if (!tour) {
				console.warn(
					`[OnboardingTour] Tour "${tourId}" no encontrado en registry.`,
				);
				return;
			}

			// Re-check: no iniciar si ya está completado
			if (isTourCompleted(tourId)) return;

			// Re-check mobile
			if (
				tour.mobileOnly &&
				typeof window !== "undefined" &&
				window.innerWidth > 767
			) {
				return;
			}

			// Lazy import de driver.js (solo cuando se necesita)
			try {
				const { driver } = await import("driver.js");
				// CSS de driver.js ya se carga eager en main.tsx (orden correcto:
				// driver.css → index.css → tourStyles.css). Si lo cargáramos
				// acá lazy, sobrescribiría nuestros estilos del tema.

				// Destruir instancia previa si existe
				if (driverRef.current) {
					try {
						(driverRef.current as { destroy: () => void }).destroy();
					} catch {
						// ignorar
					}
				}

				// Crear nueva instancia
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const driverInstance = driver({
					...getDriverConfig(),
					steps: toDriverSteps(tour.steps, tourId),
					// onNextClick a nivel CONFIG (no del step). Se dispara en
					// cada click de NEXT o DONE. En el último step, marca como
					// completado y llama moveNext() que internamente destruye
					// el tour con cleanup completo.
					//
					// FIX BUG DONE: el handler anterior estaba en step.onNextClick
					// (lugar incorrecto — driver.js lo lee de step.popover.onNextClick).
					// Movido a la config del driver que es donde se setea correctamente.
					onNextClick: (
						_element: Element | undefined,
						_step: unknown,
						opts: {
							driver: { isLastStep: () => boolean; moveNext: () => void };
						},
					) => {
						if (opts.driver.isLastStep()) {
							markTourCompleted(tourId);
						}
						// moveNext() avanza al próximo step, o si es el último,
						// llama a destroy(false) que hace el cleanup completo
						// (remueve overlay, popover, listeners, etc).
						opts.driver.moveNext();
					},
				});

				driverRef.current = driverInstance;
				driverInstance.drive();
			} catch (err) {
				console.error("[OnboardingTour] Error iniciando tour:", err);
			}
		}

		window.addEventListener("prodear:start-tour", handleStartTour);
		return () => {
			window.removeEventListener("prodear:start-tour", handleStartTour);
			if (driverRef.current) {
				try {
					(driverRef.current as { destroy: () => void }).destroy();
				} catch {
					// ignorar
				}
			}
		};
	}, []);

	// Helper global para resetear tours desde la consola del navegador.
	// Útil durante desarrollo: window.prodear.resetTour("onboarding-ligas")
	// Limpia el flag de completado y dispara el tour de nuevo.
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).prodear = (window as any).prodear || {};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).prodear.resetTour = (tourId: string) => {
			resetTour(tourId);
			console.log(
				`[prodear] Tour "${tourId}" reseteado. Recargá la página o navegá a /ligas para verlo.`,
			);
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).prodear.resetAllTours = () => {
			const keys = Object.keys(localStorage).filter((k) =>
				k.startsWith("prodear:tour:"),
			);
			for (const key of keys) {
				localStorage.removeItem(key);
			}
			console.log(
				`[prodear] ${keys.length} tour(s) reseteado(s). Recargá la página.`,
			);
		};
	}, []);

	// No renderiza nada (es invisible)
	return null;
}
