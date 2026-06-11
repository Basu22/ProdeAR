/**
 * Helpers para el manejo de fechas en formato YYYY-MM-DD (local time)
 * y agrupación de partidos por día. Funciones puras, fácilmente testeables.
 */

import type { Match } from "./types";

/**
 * Genera la fecha actual en formato YYYY-MM-DD usando la zona horaria local.
 *
 * NOTA (tech-debt): Esta función no es reactiva al cruce de medianoche.
 * Si el usuario abre la app a las 23:59 y la deja abierta hasta las 00:01,
 * `todayKey` seguirá siendo el día anterior. Soluciones posibles:
 * - setInterval que invalide el cache cada minuto
 * - Recalcular al volver de background (visibilitychange)
 * - Dependencia de un timer en el componente que la consume
 *
 * @returns String en formato "YYYY-MM-DD"
 */
export function getTodayKey(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Convierte un string "YYYY-MM-DD" en una clave del día siguiente.
 * Maneja correctamente el rollover de mes y año.
 */
function addDaysToKey(dateKey: string, days: number): string {
	const [year, month, day] = dateKey.split("-").map(Number);
	const d = new Date(year, month - 1, day);
	d.setDate(d.getDate() + days);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

/**
 * Genera el label visual para una pastilla de día.
 * Devuelve el texto principal ("Hoy", "Mañ", "MIÉ", etc.) y el número del día.
 *
 * @param dateKey - Fecha en formato "YYYY-MM-DD"
 * @param todayKey - Fecha de hoy en el mismo formato
 * @returns `{ main, sub }` donde `main` es el label y `sub` el número del día
 */
export function getDayLabel(
	dateKey: string,
	todayKey: string,
): { main: string; sub: string } {
	const [year, month, day] = dateKey.split("-").map(Number);
	const todayKeyTomorrow = addDaysToKey(todayKey, 1);

	if (dateKey === todayKey) {
		return { main: "Hoy", sub: String(day) };
	}
	if (dateKey === todayKeyTomorrow) {
		return { main: "Mañ", sub: String(day) };
	}

	// Para días más lejanos, usar el weekday corto en mayúsculas
	const d = new Date(year, month - 1, day);
	const main = d
		.toLocaleDateString("es-AR", { weekday: "short" })
		.replace(".", "")
		.toUpperCase();
	return { main, sub: String(day) };
}

/**
 * Genera el nombre completo del día en español para uso en aria-label.
 * Devuelve "Hoy", "Mañana" o el nombre del día de la semana capitalizado.
 */
export function getDayFullName(dateKey: string, todayKey: string): string {
	const [year, month, day] = dateKey.split("-").map(Number);
	const todayKeyTomorrow = addDaysToKey(todayKey, 1);

	if (dateKey === todayKey) return "Hoy";
	if (dateKey === todayKeyTomorrow) return "Mañana";

	const d = new Date(year, month - 1, day);
	const name = d.toLocaleDateString("es-AR", { weekday: "long" });
	return name.charAt(0).toUpperCase() + name.slice(1);
}

interface GroupedMatches {
	days: string[];
	groupedMatches: Record<string, Match[]>;
}

/**
 * Agrupa una lista de partidos por día local (kickOff) y ordena cronológicamente.
 * Garantiza que `todayKey` esté siempre presente en el array `days`,
 * incluso si no hay partidos para hoy (devuelve array vacío para ese día).
 *
 * @param matches - Lista de partidos. Si es undefined, devuelve solo hoy.
 * @param todayKey - Fecha de hoy en formato "YYYY-MM-DD"
 */
export function groupMatchesByDay(
	matches: Match[] | undefined,
	todayKey: string,
): GroupedMatches {
	if (!matches) {
		return {
			days: [todayKey],
			groupedMatches: { [todayKey]: [] },
		};
	}

	const sorted = [...matches].sort(
		(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
	);

	const groups: Record<string, Match[]> = {};
	const uniqueDays: string[] = [];

	for (const match of sorted) {
		const date = new Date(match.kickOff);
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		const dateKey = `${y}-${m}-${d}`;

		if (!groups[dateKey]) {
			groups[dateKey] = [];
			uniqueDays.push(dateKey);
		}
		groups[dateKey].push(match);
	}

	// Ensure today's date is ALWAYS present in the days array
	if (!uniqueDays.includes(todayKey)) {
		uniqueDays.push(todayKey);
		uniqueDays.sort();
	}
	if (!groups[todayKey]) {
		groups[todayKey] = [];
	}

	return { days: uniqueDays, groupedMatches: groups };
}
