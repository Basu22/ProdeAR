import type { MatchEvent } from "./types";

/**
 * Identificador de período (F2).
 * - 1T: Primer Tiempo (1-45 + extra)
 * - 2T: Segundo Tiempo (46-90 + extra)
 * - ET1: Extra Time Primer Tiempo (91-105 + extra)
 * - ET2: Extra Time Segundo Tiempo (106-120 + extra)
 * - PEN: Penales (121+)
 */
export type PeriodId = "1T" | "2T" | "ET1" | "ET2" | "PEN";

/**
 * Grupo de eventos para un período (F2).
 */
export interface PeriodGroup {
	id: PeriodId;
	label: string;
	events: MatchEvent[];
}

/**
 * Orden canónico de períodos (1T → 2T → ET1 → ET2 → PEN).
 * Usado para ordenar el array de PeriodGroup.
 */
const PERIOD_ORDER: PeriodId[] = ["1T", "2T", "ET1", "ET2", "PEN"];

/**
 * Minuto real de un evento (minute + extra).
 * Exportado para reuso en eventHelpers.
 */
export function realMinute(e: MatchEvent): number {
	return e.minute + (e.extra ?? 0);
}

/**
 * Determina el período al que pertenece un evento (F2).
 *
 * Reglas (basadas en convención real de fútbol):
 * - minute 0-45 (con o sin extra): 1T
 * - minute 46-90 (con o sin extra): 2T
 * - minute 91-105 (con o sin extra): ET1
 * - minute 106-120 (con o sin extra): ET2
 * - minute 121+ (incluye penales): PEN
 *
 * Importante: el `extra` SIEMPRE pertenece al tiempo actual. Un gol en 45+3
 * sigue siendo del 1T, no del 2T. Por eso usamos `minute` (no `realMinute`)
 * para clasificar.
 *
 * Casos especiales:
 * - `minute === 0`: lo asignamos a "1T" (pre-partido / kickoff)
 * - `minute < 0`: clamp a 1T
 */
export function getEventPeriod(e: MatchEvent): PeriodId {
	const m = e.minute;
	if (m < 0) return "1T";
	if (m <= 45) return "1T";
	if (m <= 90) return "2T";
	if (m <= 105) return "ET1";
	if (m <= 120) return "ET2";
	return "PEN";
}

/**
 * Genera el label visible para un período (F2).
 * Ejemplos: "1T · 0–45'", "2T · 46–90'", "ET · 91–105'", "PENALES".
 */
export function getPeriodLabel(period: PeriodId): string {
	switch (period) {
		case "1T":
			return "1T · 0–45'";
		case "2T":
			return "2T · 46–90'";
		case "ET1":
			return "ET · 91–105'";
		case "ET2":
			return "ET · 106–120'";
		case "PEN":
			return "PENALES";
	}
}

/**
 * Agrupa eventos por período (F2).
 *
 * Reglas:
 * 1. Solo retorna grupos con al menos 1 evento (omite períodos vacíos).
 * 2. Los eventos dentro de cada grupo están ordenados por minuto real ascendente.
 * 3. Los grupos están ordenados por el orden canónico de períodos.
 *
 * Retorna un array vacío si no hay eventos.
 */
export function groupEventsByPeriod(
	events: MatchEvent[] | null | undefined,
): PeriodGroup[] {
	if (!events || events.length === 0) return [];

	const buckets: Record<PeriodId, MatchEvent[]> = {
		"1T": [],
		"2T": [],
		ET1: [],
		ET2: [],
		PEN: [],
	};

	for (const e of events) {
		const period = getEventPeriod(e);
		buckets[period].push(e);
	}

	// Ordenar eventos dentro de cada bucket por minuto real
	for (const period of PERIOD_ORDER) {
		buckets[period].sort((a, b) => realMinute(a) - realMinute(b));
	}

	// Construir grupos solo para períodos no vacíos, en orden canónico
	const groups: PeriodGroup[] = [];
	for (const period of PERIOD_ORDER) {
		if (buckets[period].length > 0) {
			groups.push({
				id: period,
				label: getPeriodLabel(period),
				events: buckets[period],
			});
		}
	}

	return groups;
}
