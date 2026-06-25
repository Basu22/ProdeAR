/**
 * `bracketTypes` — Tipos extendidos para el árbol de eliminatorias completo.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * El Mundial 2026 tiene 5 rondas eliminatorias (R32 → R16 → QF → SF → F) más
 * el partido por el 3er puesto. Los tipos base de `worldCupGroups.ts`
 * (`BracketMatch`, `BracketSlot`, `KnockoutBracket`) fueron diseñados para
 * modelar SOLO la primera ronda (R32) con slots que se llenan desde las
 * posiciones de los grupos.
 *
 * Para modelar las 5 rondas con propagación de ganadores (penalWinner
 * incluido), necesitamos tipos extendidos que vivan en este módulo separado.
 *
 * ============================================================================
 * PROPAGACIÓN DE GANADORES
 * ============================================================================
 * Cada slot de R16+ tiene un `sourceMatchId` que apunta al partido de la
 * ronda anterior cuyo ganador alimenta ese slot. Esto permite:
 *   1. Saber de dónde viene cada equipo visualmente ("Ganador de R32-1")
 *   2. Propagar el ganador automáticamente cuando el partido fuente termina
 *   3. Detectar dependencias para optimización de renders
 *
 * @module lib/bracketTypes
 */

import type { RoundAbbreviation } from "./roundNames";
import type { BracketSlot, BracketSlotType } from "./worldCupGroups";

// ============================================================================
// RE-EXPORTS para conveniencia
// ============================================================================

export type { BracketSlot, BracketSlotType, RoundAbbreviation };

// ============================================================================
// METADATA DE RONDA
// ============================================================================

/**
 * Metadata descriptiva de una ronda eliminatoria.
 * Usada en headers, accesibilidad, y cálculo de stageMultiplier para scoring.
 */
export interface RoundMeta {
	/** Abreviatura canónica ("R32", "R16", "QF", "SF", "F", "3RD") */
	abbr: RoundAbbreviation;
	/** Nombre legible en español (ej. "Dieciseisavos de final") */
	label: string;
	/** stageMultiplier para scoring: R32=2, R16=3, QF=4, SF=5, F=6, 3RD=5 */
	multiplier: number;
	/** Cantidad esperada de partidos en esta ronda */
	expectedMatches: number;
}

/**
 * Catálogo de rondas en orden cronológico. Usado por el bracket engine
 * para construir las rondas en el orden correcto.
 */
export const ROUND_CATALOG: Record<RoundAbbreviation, RoundMeta> = {
	R32: {
		abbr: "R32",
		label: "16vos de final",
		multiplier: 2,
		expectedMatches: 16,
	},
	R16: {
		abbr: "R16",
		label: "8vos de final",
		multiplier: 3,
		expectedMatches: 8,
	},
	QF: { abbr: "QF", label: "4tos de final", multiplier: 4, expectedMatches: 4 },
	SF: { abbr: "SF", label: "Semifinal", multiplier: 5, expectedMatches: 2 },
	F: { abbr: "F", label: "Final", multiplier: 6, expectedMatches: 1 },
	"3RD": {
		abbr: "3RD",
		label: "Tercer Puesto",
		// ============================================================================
		// T0 HOTFIX 2026-06-25: stageMultiplier 3RD = 4 (no 5)
		// ============================================================================
		// El valor correcto es **4** (alineado con `poll-scores/index.ts:92` que es
		// la fuente real de scoring, con `SolDeMayoRulesModal.tsx:47` que muestra
		// "Tercer Puesto: ×4" en la UI pública, y con la migración 0006 seed).
		//
		// El valor anterior (5) era inconsistente: hacía que el engine del bracket
		// generara partidos de 3RD con multiplier 5 (matching SF), pero el cálculo
		// real de puntos del usuario (en `poll-scores`) siempre usó 4.
		//
		// Este hotfix alinea el engine con la realidad del scoring. **No rompe
		// predicciones existentes** porque `points_earned` ya está calculado con 4.
		multiplier: 4,
		expectedMatches: 1,
	},
};

// ============================================================================
// SLOT EXTENDIDO
// ============================================================================

/**
 * Tipo extendido de slot: incluye "winner" para los slots de R16+ que se
 * llenan con el ganador del partido de la ronda anterior (vía `sourceMatchId`).
 */
export type ExtendedBracketSlotType = BracketSlotType | "winner";

/**
 * Slot extendido: hereda `BracketSlot` y agrega metadata de propagación
 * y penales. Los slots de R32 tienen `sourceMatchId: null` (se llenan desde
 * grupos). Los slots de R16+ tienen `sourceMatchId` apuntando al partido
 * de la ronda anterior.
 */
export interface ExtendedBracketSlot extends Omit<BracketSlot, "slotType"> {
	/** Tipo de slot extendido: incluye "winner" para rondas R16+ */
	slotType: ExtendedBracketSlotType;
	/** ID del partido de la ronda anterior que define este slot (null en R32) */
	sourceMatchId: string | null;
	/** Si el equipo fue determinado por penales (penaltyWinner del match fuente) */
	decidedByPenalties: boolean;
}

// ============================================================================
// MATCH EXTENDIDO
// ============================================================================

/**
 * Partido extendido del bracket: hereda `BracketMatch` y agrega metadata
 * de resultado (score, winner, penaltyWinner) y conexión con el `Match`
 * real de la DB.
 *
 * Los slots son `ExtendedBracketSlot` (con `sourceMatchId`).
 */
export interface ExtendedBracketMatch {
	/** ID único: "R32-1", "R16-3", "QF-2", "SF-1", "F-1", "3RD-1" */
	id: string;
	/** Posición en el bracket tree (1-16 para R32, 1-8 para R16, etc.) */
	position: number;
	slotA: ExtendedBracketSlot;
	slotB: ExtendedBracketSlot;
	/** `true` si ambos slots están resueltos (tienen teamName) */
	isComplete: boolean;
	/** ID del Match real en la DB (para abrir MatchSheet). Null si aún no existe. */
	dbMatchId: string | null;
	/** Nombre del ganador resuelto (null si no se jugó aún o no terminó) */
	winner: string | null;
	/** Logo del ganador (null si no se jugó aún) */
	winnerLogo: string | null;
	/** Score final (null si no se jugó) */
	score: { home: number; away: number } | null;
	/** Si el partido se definió por penales */
	decidedByPenalties: boolean;
	/** Posición en el bracket tree (para layout visual, ej. "R16-3") */
	bracketPosition: string;
	/** stageMultiplier para scoring (2 para R32, 3 para R16, etc.) */
	stageMultiplier: number;
	/** Sprint 5D+: Estadio del partido (propagado desde Match.stadium). Null si TBD. */
	stadium: string | null;
	/** Sprint 5D+: ISO timestamp del kickoff (propagado desde Match.kickOff). Null si TBD. */
	kickOff: string | null;
}

// ============================================================================
// FORMAT HELPERS (Sprint 5D+)
// ============================================================================

/**
 * Formatea un ISO timestamp a "DD/MM" usando timezone del usuario.
 * Retorna null si el input es null/inválido.
 * Ej: "2026-07-15T16:00:00Z" → "15/07"
 */
export function formatKickoffDate(
	iso: string | null | undefined,
): string | null {
	if (!iso) return null;
	try {
		return new Intl.DateTimeFormat("es-AR", {
			day: "2-digit",
			month: "2-digit",
		}).format(new Date(iso));
	} catch {
		return null;
	}
}

/**
 * Formatea un ISO timestamp a "HH:MM" (24h) usando timezone del usuario.
 * Retorna null si el input es null/inválido.
 * Ej: "2026-07-15T16:00:00Z" → "16:00"
 */
export function formatKickoffTime(
	iso: string | null | undefined,
): string | null {
	if (!iso) return null;
	try {
		return new Intl.DateTimeFormat("es-AR", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).format(new Date(iso));
	} catch {
		return null;
	}
}

// ============================================================================
// RONDA
// ============================================================================

/**
 * Una ronda completa del bracket (ej. todos los partidos de Cuartos de Final).
 */
export interface KnockoutRound {
	/** Metadata de la ronda */
	meta: RoundMeta;
	/** Partidos de esta ronda */
	matches: ExtendedBracketMatch[];
	/** Cantidad de partidos con resultado definido (score no-null) */
	completedCount: number;
}

// ============================================================================
// BRACKET COMPLETO
// ============================================================================

/**
 * Bracket completo: las 5 rondas eliminatorias + partido por el 3er puesto.
 * Estructura inmutable producida por `getFullBracket`.
 *
 * `champion`, `runnerUp` y `thirdPlace` son derivados de los partidos
 * terminados y se populan automáticamente en `getFullBracket`.
 */
export interface FullBracket {
	/** Rondas en orden cronológico: R32, R16, QF, SF, F */
	rounds: KnockoutRound[];
	/** Partido por el 3er puesto (siempre presente, puede tener slots TBD) */
	thirdPlaceMatch: ExtendedBracketMatch;
	/** Campeón del torneo (null si la final no se jugó) */
	champion: string | null;
	/** Subcampeón (null si la final no se jugó) */
	runnerUp: string | null;
	/** Tercer puesto (null si el partido por el 3° no se jugó) */
	thirdPlace: string | null;
}
