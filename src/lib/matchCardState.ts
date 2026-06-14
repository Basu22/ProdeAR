/**
 * Helpers puros para derivar el estado visual de un MatchCard.
 * Sin dependencias de React, fácilmente testeables.
 */

import { isMatchPredictable } from "./predictionHelpers";
import type { Match } from "./types";

/**
 * Estados visuales posibles para una MatchCard.
 * Determinan el color del borde, el indicador y el copy del status bar.
 */
export type MatchCardState =
	| "pending_action" // Sin predicción, pronosticable → URGENTE (ámbar)
	| "locked" // Sin predicción, ventana cerrada → BLOQUEADO
	| "predicted_editable" // Con predicción, pronosticable → EDITABLE (cyan)
	| "predicted_locked" // Con predicción, ventana cerrada → CONFIRMADO (emerald)
	| "live" // En vivo
	| "finished"; // Finalizado

export const MATCH_CARD_STATES: readonly MatchCardState[] = [
	"pending_action",
	"locked",
	"predicted_editable",
	"predicted_locked",
	"live",
	"finished",
] as const;

const VALID_STATES: ReadonlySet<string> = new Set(MATCH_CARD_STATES);

/**
 * Deriva el estado visual de una MatchCard a partir de su match,
 * la cantidad de predicciones del usuario y la predicibilidad.
 *
 * Reglas (en orden de prioridad):
 *   1. status === "live" → "live" (gana sobre todo)
 *   2. status === "finished" → "finished" (gana sobre todo)
 *   3. status === "cancelled" o "postponed" → "locked" (sin acción)
 *   4. hasPrediction && isPredictable → "predicted_editable"
 *   5. hasPrediction && !isPredictable → "predicted_locked"
 *   6. !hasPrediction && isPredictable → "pending_action"
 *   7. !hasPrediction && !isPredictable → "locked"
 */
export function deriveMatchCardState(
	match: Match,
	hasPrediction: boolean,
	isPredictableArg: boolean = isMatchPredictable(match),
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_now: number = Date.now(),
): MatchCardState {
	// Prioridad 1-3: estados terminales
	if (match.status === "live") return "live";
	if (match.status === "finished") return "finished";

	// Recalcular isPredictable con el `now` provisto (consistencia con tests)
	const predictable = match.status === "not_started" ? isPredictableArg : false;

	// cancelled/postponed → locked (no hay acción posible)
	if (match.status === "cancelled" || match.status === "postponed") {
		return "locked";
	}

	// Estados basados en predicción
	if (hasPrediction && predictable) return "predicted_editable";
	if (hasPrediction && !predictable) return "predicted_locked";
	if (!hasPrediction && predictable) return "pending_action";
	return "locked";
}

/**
 * Type guard que valida si un string es un MatchCardState válido.
 */
export function isMatchCardState(value: string): value is MatchCardState {
	return VALID_STATES.has(value);
}
