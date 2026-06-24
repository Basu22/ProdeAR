/**
 * bracketNavigation — Lógica pura de navegación entre rondas del bracket.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Funciones puras que determinan:
 * - Qué flecha está habilitada en una ronda dada
 * - A qué ronda apunta cada flecha
 * - El estado de las pills de progreso (activa, disponibles, deshabilitadas)
 *
 * Separar esta lógica del componente React permite:
 * - Testear sin montar el árbol completo
 * - Reutilizar en BracketTreeView y cualquier futuro consumidor
 * - Mantener el componente React enfocado en UI/animaciones
 *
 * ============================================================================
 * COMPORTAMIENTO POR RONDA
 * ============================================================================
 *
 * ┌────────────┬──────────────┬──────────────┐
 * │ current    │ ← (anterior) │ → (siguiente)│
 * ├────────────┼──────────────┼──────────────┤
 * │ 16vos (R32)│ 🔒 disabled  │ → 8vos (R16) │
 * │ 8vos (R16) │ → 16vos (R32)│ → 4tos (QF)  │
 * │ 4tos (QF)  │ → 8vos (R16) │ → Semis (SF) │
 * │ Semis (SF) │ → 4tos (QF)  │ → Final (F)  │
 * │ Final (F)  │ → Semis (SF) │ 🔒 disabled  │
 * │ 3RD       │ → Semis (SF) │ 🔒 disabled  │
 * └────────────┴──────────────┴──────────────┘
 *
 * 3RD es un "apéndice" de la Final (perdedores de semis).
 * No tiene flecha derecha (es la última vista).
 *
 * ============================================================================
 */

import type { RoundAbbreviation } from "./roundNames";

/**
 * Orden de las rondas en navegación (izquierda a derecha).
 * 3RD se maneja aparte como "apéndice de la Final".
 */
const ROUND_ORDER: RoundAbbreviation[] = ["R32", "R16", "QF", "SF", "F"];

/**
 * Estado de UNA flecha del navegador.
 */
export interface ArrowState {
	/** Si la flecha está habilitada (puede ser clickeada). */
	enabled: boolean;
	/** Ronda destino cuando se hace click. null si la flecha está deshabilitada. */
	target: RoundAbbreviation | null;
	/** Tooltip/tooltip-aria-label de la flecha. */
	label: string;
}

/**
 * Estado completo del navegador para una ronda actual.
 */
export interface RoundNavigatorState {
	current: RoundAbbreviation;
	left: ArrowState;
	right: ArrowState;
	/** Índice de la ronda actual en ROUND_ORDER (0-based). -1 si es 3RD. */
	currentIndex: number;
	/** Total de rondas en ROUND_ORDER (5). */
	totalRounds: number;
	/** Si la ronda actual es 3RD (apéndice de la Final). */
	isThirdPlace: boolean;
}

/**
 * Labels legibles en español para cada ronda.
 * Usados en tooltips, aria-labels, y breadcrumbs.
 */
const ROUND_LABELS: Record<RoundAbbreviation, string> = {
	R32: "16vos de final",
	R16: "8vos de final",
	QF: "4tos de final",
	SF: "Semifinal",
	F: "Final",
	"3RD": "Tercer Puesto",
};

/**
 * Etiqueta corta para las pills de progreso y los tooltips de las flechas.
 */
const ROUND_SHORT_LABELS: Record<RoundAbbreviation, string> = {
	R32: "16vos",
	R16: "8vos",
	QF: "4tos",
	SF: "Semis",
	F: "Final",
	"3RD": "3er Puesto",
};

/**
 * Devuelve el estado completo del navegador para una ronda actual.
 *
 * Reglas:
 * - 16vos (R32): ◀ disabled, ▶ → 8vos
 * - 8vos (R16): ◀ → 16vos, ▶ → 4tos
 * - 4tos (QF): ◀ → 8vos, ▶ → Semis
 * - Semis (SF): ◀ → 4tos, ▶ → Final
 * - Final (F): ◀ → Semis, ▶ disabled
 * - 3er Puesto (3RD): ◀ → Semis, ▶ disabled
 *
 * @param current - Ronda actualmente visible.
 * @returns RoundNavigatorState con left, right, currentIndex, totalRounds, isThirdPlace.
 */
export function getRoundNavigatorState(
	current: RoundAbbreviation,
): RoundNavigatorState {
	const isThirdPlace = current === "3RD";
	const currentIndex = isThirdPlace ? -1 : ROUND_ORDER.indexOf(current);

	// Flecha izquierda: apunta a la ronda anterior.
	// Caso especial 3RD: como los perdedores vienen de las semis, la flecha
	// izquierda de 3RD va a SF (no a la ronda anterior en el array, porque
	// 3RD no está en ROUND_ORDER).
	const leftTarget = isThirdPlace
		? "SF"
		: currentIndex > 0
			? ROUND_ORDER[currentIndex - 1]
			: null;
	const leftEnabled = leftTarget !== null;
	const left: ArrowState = {
		enabled: leftEnabled,
		target: leftTarget,
		label: leftEnabled
			? `Ronda anterior: ${ROUND_LABELS[leftTarget as RoundAbbreviation]}`
			: "Primera ronda",
	};

	// Flecha derecha: siempre apunta a la siguiente ronda.
	// Deshabilitada si current es la última (F) o si es 3RD (también
	// la "última" en términos de navegación).
	const rightTarget =
		currentIndex >= 0 && currentIndex < ROUND_ORDER.length - 1
			? ROUND_ORDER[currentIndex + 1]
			: null;
	const rightEnabled = rightTarget !== null;
	const right: ArrowState = {
		enabled: rightEnabled,
		target: rightTarget,
		label: rightEnabled
			? `Ronda siguiente: ${ROUND_LABELS[rightTarget as RoundAbbreviation]}`
			: "Última ronda",
	};

	return {
		current,
		left,
		right,
		currentIndex,
		totalRounds: ROUND_ORDER.length,
		isThirdPlace,
	};
}

/**
 * Devuelve los labels de las pills de progreso (16vos · 8vos · 4tos · Semis · Final).
 * Usado para renderizar la barra de progreso arriba del bracket.
 */
export function getProgressPills(): {
	abbr: RoundAbbreviation;
	short: string;
	full: string;
}[] {
	return ROUND_ORDER.map((abbr) => ({
		abbr,
		short: ROUND_SHORT_LABELS[abbr],
		full: ROUND_LABELS[abbr],
	}));
}

/**
 * Devuelve el label completo de una ronda (para breadcrumbs, tooltips, etc).
 */
export function getRoundLabel(abbr: RoundAbbreviation): string {
	return ROUND_LABELS[abbr];
}

/**
 * Devuelve el label corto de una ronda (para pills, headers compactos).
 */
export function getRoundShortLabel(abbr: RoundAbbreviation): string {
	return ROUND_SHORT_LABELS[abbr];
}
