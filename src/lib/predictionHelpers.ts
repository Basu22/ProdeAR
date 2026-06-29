/**
 * Helpers puros para el manejo de predicciones y conteos de tiempo.
 * Sin dependencias de React, fácilmente testeables.
 */

import { calculateScore, type ScoringResult } from "./scoring";
import type { Match, Prediction } from "./types";

/**
 * Umbral de cierre de predicciones: 15 minutos antes del kickOff.
 * Si `kickOff - 15min > now()`, el partido aún es pronosticable.
 */
export const PREDICTION_LOCK_OFFSET_MS = 15 * 60 * 1000;

/**
 * Determina si un partido es "pronosticable" en este momento.
 * Un partido es pronosticable cuando:
 *   1. NO es un partido de una competición "amistosa" (isFriendly === false)
 *   2. Su status es "not_started" (no está en vivo, finalizado, etc.)
 *   3. La ventana de pronóstico aún no cerró (kickOff - 15min > now)
 *
 * Sprint "Amistosos Read-Only" 2026-06-29: amistosos NUNCA son
 * pronosticables, independientemente de su estado o ventana de tiempo.
 */
export function isMatchPredictable(
	match: Match,
	now: number = Date.now(),
): boolean {
	// Amistosos no se pueden pronosticar (read-only en la UI)
	if (match.isFriendly === true) return false;
	if (match.status !== "not_started") return false;
	const lockTime =
		new Date(match.kickOff).getTime() - PREDICTION_LOCK_OFFSET_MS;
	return lockTime > now;
}

export interface PendingMatchesResult {
	count: number;
	firstMatch: Match | null;
	allMatches: Match[];
}

/**
 * Retorna los partidos para los cuales el usuario AÚN no tiene predicción
 * y la ventana de pronóstico sigue abierta, ordenados por kickOff ascendente.
 *
 * @param matches - Todos los partidos (del query useMatches)
 * @param predictions - Predicciones del usuario (de cualquier torneo)
 */
export function getPendingMatches(
	matches: Match[] | undefined,
	predictions: Prediction[] | undefined,
	now: number = Date.now(),
): PendingMatchesResult {
	if (!matches || matches.length === 0) {
		return { count: 0, firstMatch: null, allMatches: [] };
	}

	const predictedMatchIds = new Set((predictions ?? []).map((p) => p.matchId));

	const pending = matches
		.filter((match) => isMatchPredictable(match, now))
		.filter((match) => !predictedMatchIds.has(match.id))
		.sort(
			(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
		);

	return {
		count: pending.length,
		firstMatch: pending[0] ?? null,
		allMatches: pending,
	};
}

export interface NextCloseTimeResult {
	match: Match;
	closesAt: Date;
	msRemaining: number;
}

/**
 * Encuentra el partido con el cierre de predicción más próximo.
 * Solo retorna partidos cuya ventana de pronóstico aún está abierta.
 *
 * @returns `{ match, closesAt, msRemaining }` o `null` si no hay
 */
export function getNextCloseTime(
	matches: Match[] | undefined,
	now: number = Date.now(),
): NextCloseTimeResult | null {
	if (!matches || matches.length === 0) return null;

	let closest: NextCloseTimeResult | null = null;

	for (const match of matches) {
		if (match.status !== "not_started") continue;

		const lockTime =
			new Date(match.kickOff).getTime() - PREDICTION_LOCK_OFFSET_MS;
		const msRemaining = lockTime - now;

		// Solo considerar partidos cuya ventana aún está abierta
		if (msRemaining <= 0) continue;

		if (closest === null || msRemaining < closest.msRemaining) {
			closest = {
				match,
				closesAt: new Date(lockTime),
				msRemaining,
			};
		}
	}

	return closest;
}

/**
 * Formatea un tiempo restante en milisegundos a un string legible en español.
 * - `> 1h` → "Xh Ymin"
 * - `1min..1h` → "Xmin"
 * - `0 < ms < 1min` → "< 1min"
 * - `<= 0` → "Cerrado"
 */
export function formatCountdown(msRemaining: number): string {
	if (msRemaining <= 0) return "Cerrado";

	const totalMinutes = Math.floor(msRemaining / 60_000);

	if (totalMinutes < 1) return "< 1min";

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}min`;
	}
	return `${minutes}min`;
}

/**
 * Devuelve el día (YYYY-MM-DD en local time) en que se juega un partido.
 */
export function getMatchDayKey(match: Match): string {
	const date = new Date(match.kickOff);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export interface PotentialPoints {
	exact: number;
	goalDiff: number;
	basic: number;
	penalty: number;
}

/**
 * Calcula los puntos potenciales (en juego) para un partido, según su stageMultiplier.
 * Sirve para mostrar "En juego: +10 exacto" en el MatchSheet.
 */
export function getPotentialPoints(
	stageMultiplier: number = 1,
): PotentialPoints {
	return {
		exact: 10 * stageMultiplier,
		goalDiff: 6 * stageMultiplier,
		basic: 3 * stageMultiplier,
		penalty: 4,
	};
}

export type { ScoringResult };
// Re-export de calculateScore para conveniencia
export { calculateScore };

/**
 * Helper que calcula el resultado de scoring para una predicción real vs un partido finished.
 * Devuelve null si el partido aún no terminó.
 */
export function getScoreResultForPrediction(
	prediction: Pick<
		Prediction,
		"predictedHome" | "predictedAway" | "predictedWinner"
	>,
	match: Pick<
		Match,
		"homeScore" | "awayScore" | "penaltyWinner" | "stageMultiplier" | "status"
	>,
): ScoringResult | null {
	if (match.status !== "finished") return null;
	if (match.homeScore === null || match.awayScore === null) return null;

	return calculateScore(
		prediction,
		match.homeScore,
		match.awayScore,
		match.penaltyWinner,
		match.stageMultiplier,
	);
}

/**
 * Genera el texto para compartir una predicción por redes sociales / clipboard.
 * Formato amigable con emoji, fácil de leer en WhatsApp/Telegram/X.
 */
export function formatPredictionForSharing(
	match: Pick<Match, "homeTeam" | "awayTeam" | "competitionName" | "kickOff">,
	prediction: Pick<Prediction, "predictedHome" | "predictedAway">,
	tournamentName: string,
): string {
	const date = new Date(match.kickOff);
	const dateStr = date.toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "short",
	});
	const timeStr = date.toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	return `⚽ Mi pronóstico en ProdeAR

${match.homeTeam} ${prediction.predictedHome} - ${prediction.predictedAway} ${match.awayTeam}

🏆 ${tournamentName}
📅 ${dateStr} · ⏰ ${timeStr}
${match.competitionName ? `🌎 ${match.competitionName}` : ""}

#ProdeAR`.trim();
}
