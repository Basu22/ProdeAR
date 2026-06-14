import { useMemo } from "react";
import {
	getPendingMatches,
	type PendingMatchesResult,
} from "../lib/predictionHelpers";
import type { Match, Prediction } from "../lib/types";

/**
 * Hook que calcula las predicciones pendientes del usuario.
 * Es un wrapper reactivo sobre `getPendingMatches` que se recalcula
 * solo cuando `matches` o `predictions` cambian.
 */
export function usePendingPredictions(
	matches: Match[] | undefined,
	predictions: Prediction[] | undefined,
): PendingMatchesResult {
	return useMemo(
		() => getPendingMatches(matches, predictions),
		[matches, predictions],
	);
}
