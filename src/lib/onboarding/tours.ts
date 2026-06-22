/**
 * tours.ts — Registry de tours de onboarding con driver.js.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * import { TOUR_REGISTRY, getTour } from "@/lib/onboarding/tours";
 *
 * const tour = getTour("onboarding-ligas");
 * if (tour) {
 *   driver(tour.driverConfig).drive();
 * }
 * ```
 *
 * ============================================================================
 * AGREGAR UN TOUR NUEVO
 * ============================================================================
 * 1. Definir las pasos en este archivo (id + steps).
 * 2. Agregar atributos `data-tour="<step.element>"` en los componentes target.
 * 3. Disparar el tour desde el componente relevante con `useOnboardingTour(id)`.
 *
 * La persistencia es automática (key = `prodear:tour:<id>:completed`).
 *
 * ============================================================================
 * MOBILE-ONLY
 * ============================================================================
 * Los tours SOLO se disparan en mobile (`window.innerWidth < 768`). En
 * desktop, el tour no se inicia. Ver `OnboardingTour.tsx` para detalles.
 */

import type { DriveStep } from "driver.js";

export type TourStepSide = "top" | "bottom" | "left" | "right" | "over";

export interface TourStepDef {
	/** Selector CSS del elemento target (debe tener data-tour="...") */
	element: string;
	/** Título del popover */
	title: string;
	/** Descripción del popover (puede ser HTML básico) */
	description: string;
	/** Posición del popover respecto al elemento target */
	side?: TourStepSide;
	/** Si true, deshabilita el botón "Next" hasta que el usuario interactúe
	 *  con el elemento (útil para enseñar "tocá este botón"). */
	waitForInteraction?: boolean;
}

export interface TourDefinition {
	/** ID único del tour (usado como key en localStorage) */
	id: string;
	/** Pasos del tour en orden */
	steps: TourStepDef[];
	/** Si se debe mostrar en mobile. Default: true. */
	mobileOnly?: boolean;
}

/**
 * Registry de tours disponibles. Cada tour es una entrada indexada por id.
 */
export const TOUR_REGISTRY: Record<string, TourDefinition> = {
	/**
	 * Tour de la nueva sección "Ligas" (Fase 1 MVP).
	 * Se dispara en el primer ingreso del usuario a /ligas en mobile.
	 *
	 * 4 pasos:
	 *  1. Apunta al item "Ligas" del BottomNavBar (explica que es nuevo).
	 *  2. Apunta al selector de competición (explica cómo cambiar).
	 *  3. Apunta al primer acordeón de partidos (explica cómo ver partidos).
	 *  4. Apunta al primer partido (explica que el click abre el detalle).
	 *
	 * NOTA SOBRE POSICIONAMIENTO:
	 * En mobile (viewport < 768px), el espacio vertical es muy limitado. Si
	 * usamos `side: "top"` o `side: "bottom"`, el popover puede TAPAR el
	 * elemento target (que es justo lo que el usuario tiene que ver/tocar).
	 * Para los steps 3 y 4 usamos `side: "over"` (popover flotante centrado)
	 * para que no tape los elementos. El usuario puede ver el spotlight
	 * (borde brillante) y el popover al mismo tiempo.
	 */
	"onboarding-ligas": {
		id: "onboarding-ligas",
		steps: [
			{
				element: '[data-tour="bottomnav-ligas"]',
				title: "👋 ¡Nueva sección: Ligas!",
				description:
					"Acá vas a ver las posiciones y partidos de cualquier liga sin necesidad de entrar a un torneo.",
				side: "top",
			},
			{
				element: '[data-tour="competition-selector"]',
				title: "Elegí la competición",
				description:
					"Tocá un chip para alternar entre Mundial, Liga Argentina y más.",
				side: "bottom",
			},
			{
				element: '[data-tour="group-accordion-trigger"]',
				title: "Partidos del grupo",
				description:
					"Tocá el acordeón para ver los partidos jugados y los que vienen. Después tocá un partido para ver el detalle completo. (Podés interactuar ahora mismo con lo que está detrás del tour.)",
				side: "over",
			},
			{
				element: '[data-tour="match-minirow"]',
				title: "Detalle del partido",
				description:
					"Tocá un partido para ver el resultado, los goles, las estadísticas y tu pronóstico.",
				side: "top",
			},
		],
		mobileOnly: true,
	},
};

/**
 * Helper para obtener un tour por ID.
 */
export function getTour(id: string): TourDefinition | undefined {
	return TOUR_REGISTRY[id];
}

/**
 * Convierte nuestros `TourStepDef` al formato nativo de driver.js.
 * Usado por `OnboardingTour.tsx` para construir el `Driver` object.
 *
 * IMPORTANTE: driver.js v1.x lee `onNextClick` desde `step.popover.onNextClick`
 * (NO desde `step.onNextClick`). Si necesitás un handler por-step, ponelo
 * dentro del objeto `popover`. Para un handler global, pasalo en la config
 * del driver (ver `OnboardingTour.tsx`).
 */
export function toDriverSteps(
	steps: TourStepDef[],
	// Mantenemos el parámetro tourId para compatibilidad con el call-site.
	// No se usa internamente: el handler global se setea en la config del
	// driver en lugar de por-step.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_tourId?: string,
): DriveStep[] {
	return steps.map((step) => {
		const driverStep: DriveStep = {
			element: step.element,
			popover: {
				title: step.title,
				description: step.description,
				side: step.side ?? "bottom",
				align: "center",
			},
		};

		// Si el step requiere interacción del usuario, deshabilitar Next
		// hasta que interactúe con el elemento target
		if (step.waitForInteraction) {
			driverStep.onHighlightStarted = (element: Element | undefined) => {
				if (!element) return;
				const onInteract = () => {
					element.removeEventListener("click", onInteract);
					element.removeEventListener("touchstart", onInteract);
					// Habilitar el botón Next
					const nextBtn = document.querySelector<HTMLButtonElement>(
						".driver-popover-next-btn",
					);
					if (nextBtn) {
						nextBtn.disabled = false;
						nextBtn.classList.remove("driver-popover-btn-disabled");
					}
				};
				element.addEventListener("click", onInteract);
				element.addEventListener("touchstart", onInteract);
			};
		}

		return driverStep;
	});
}

/**
 * Configuración común del Driver (CSS selectors, popover, etc).
 * Define cómo se ve el tour a nivel global.
 *
 * NOTA SOBRE KEYS (driver.js v1.4.0):
 * - `overlayOpacity`: 0-1, opacidad del overlay oscuro.
 * - `allowKeyboardControl`: si true, Esc cierra el tour.
 * - `overlayClickBehavior`: "close" | "next" | "searchClick" — acción al
 *   click fuera del elemento target.
 *
 * El tipo público de `Driver` no expone todas las opciones. Usamos un
 * cast a `any` para evitar fricciones con el tipado.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDriverConfig(): Record<string, any> {
	return {
		// Overlay semi-transparente (0-1, default 0.7)
		overlayOpacity: 0.55,
		// Permitir Escape para cerrar el tour
		allowKeyboardControl: true,
		// Click en el overlay: no avanza (evita saltos accidentales).
		// El usuario puede seguir interactuando con elementos detrás del
		// overlay porque su CSS está con pointer-events: none.
		overlayClickBehavior: "none",
		// Botones y progreso
		showButtons: ["next", "previous", "close"],
		showProgress: true,
		// Permitir cerrar con la X
		allowClose: true,
	};
}
