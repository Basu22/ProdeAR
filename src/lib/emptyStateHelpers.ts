/**
 * Helpers puros para derivar la variante del empty state del Dashboard.
 * Sin dependencias de React, fácilmente testeables.
 */

export type EmptyStateVariant =
	| "no_matches_today" // Hoy no hay, pero sí en otros días
	| "no_matches_season" // No hay partidos en toda la temporada
	| "all_predicted" // Hay partidos, todos pronosticados
	| "countdown_only"; // No hay pendientes pero hay countdown activo

export const EMPTY_STATE_VARIANTS: readonly EmptyStateVariant[] = [
	"no_matches_today",
	"no_matches_season",
	"all_predicted",
	"countdown_only",
] as const;

export interface EmptyStateInput {
	/** ¿Hay partidos en el día seleccionado? */
	hasMatchesToday: boolean;
	/** ¿Hay partidos en algún día de la temporada? */
	hasMatchesInSeason: boolean;
	/** ¿Todos los partidos de hoy están pronosticados? */
	allTodayPredicted: boolean;
	/** ¿Hay un countdown activo (cierre próximo)? */
	hasPendingCountdown: boolean;
	/** Día del próximo partido con partidos (si existe) */
	nextMatchDay: string | null;
}

/**
 * Deriva la variante del empty state a mostrar.
 *
 * Lógica:
 *  - No hay partidos en toda la temporada → "no_matches_season"
 *  - No hay partidos hoy, pero sí en otros días → "no_matches_today"
 *  - Hay partidos hoy, todos pronosticados, con countdown → "countdown_only"
 *  - Hay partidos hoy, todos pronosticados, sin countdown → "all_predicted"
 */
export function deriveEmptyStateVariant(
	input: EmptyStateInput,
): EmptyStateVariant {
	if (!input.hasMatchesInSeason) return "no_matches_season";
	if (!input.hasMatchesToday) return "no_matches_today";
	if (input.allTodayPredicted && input.hasPendingCountdown)
		return "countdown_only";
	if (input.allTodayPredicted) return "all_predicted";
	// Fallback: hay partidos y no están todos pronosticados → no aplica empty state
	// (Devolvemos all_predicted como safe default; el caller debe validar hasMatchesToday antes)
	return "all_predicted";
}

export interface EmptyStateCTA {
	label: string;
	action: "navigate_next_day" | "view_calendar" | "none";
}

/**
 * Devuelve el CTA contextual para una variante de empty state.
 * Retorna `null` si la variante no tiene CTA (caso de "all_predicted" o "countdown_only").
 */
export function getEmptyStateCTA(
	variant: EmptyStateVariant,
): EmptyStateCTA | null {
	switch (variant) {
		case "no_matches_today":
			return { label: "Ir al próximo día", action: "navigate_next_day" };
		case "no_matches_season":
			return null; // Sin CTA — placeholder eliminado por recomendación QA
		case "all_predicted":
			return null;
		case "countdown_only":
			return null;
	}
}
