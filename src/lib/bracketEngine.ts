/**
 * `bracketEngine` — Motor puro para construir el árbol de eliminatorias.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Recibe los partidos crudos de la DB + tablas de grupos + mejores terceros
 * y devuelve un `FullBracket` con las 5 rondas (R32 → R16 → QF → SF → F) +
 * el partido por el 3er puesto, con la propagación de ganadores aplicada.
 *
 * Es un módulo **puro** (sin React, sin Supabase, sin hooks), 100% testeable.
 *
 * ============================================================================
 * PIPELINE
 * ============================================================================
 *
 *   getFullBracket(matches, groupTables, bestThirds)
 *     │
 *     ├─► resolveRoundOf16(groupTables, bestThirds)        → 16 R32
 *     ├─► resolveQuarterFinals(r32)                        → 8  R16
 *     ├─► resolveSemiFinals(r16)                           → 4  QF
 *     ├─► resolveFinal(qf)                                 → 2  SF + 1 F
 *     ├─► resolveThirdPlace(sf)                            → 1  3RD
 *     └─► propagateBracketWinners(matches, structuralBracket) → con scores
 *
 * ============================================================================
 *
 * @module lib/bracketEngine
 */

import type {
	ExtendedBracketMatch,
	ExtendedBracketSlot,
	FullBracket,
	KnockoutRound,
} from "./bracketTypes";
import { ROUND_CATALOG } from "./bracketTypes";
import { isFeatureEnabled } from "./featureFlags";
import {
	FIFA_FINAL,
	FIFA_QF_MATCHUPS,
	FIFA_R16_MATCHUPS,
	FIFA_SF_MATCHUPS,
	FIFA_THIRD_PLACE,
} from "./fifaBracketDefinition";
import type { RoundAbbreviation } from "./roundNames";
import type { Match } from "./types";
import type {
	BestThirdsTable,
	BracketMatch,
	BracketSlot,
	GroupTable,
	KnockoutBracket,
} from "./worldCupGroups";
import { resolveKnockoutMatchups } from "./worldCupGroups";

// ============================================================================
// CONVERSION HELPERS (BracketMatch → ExtendedBracketMatch)
// ============================================================================

/**
 * Convierte un `BracketSlot` (de `worldCupGroups.ts`) a `ExtendedBracketSlot`
 * (de `bracketTypes.ts`). En R32, `sourceMatchId` es null.
 */
function toExtendedSlot(
	slot: BracketSlot,
	sourceMatchId: string | null,
): ExtendedBracketSlot {
	return {
		...slot,
		sourceMatchId,
		decidedByPenalties: false,
	};
}

/**
 * Convierte un `BracketMatch` a `ExtendedBracketMatch`. Por defecto, no
 * tiene score ni winner (TBD).
 */
function toExtendedMatch(
	match: BracketMatch,
	multiplier: number,
): ExtendedBracketMatch {
	return {
		id: match.id,
		position: match.position,
		slotA: toExtendedSlot(match.slotA, null),
		slotB: toExtendedSlot(match.slotB, null),
		isComplete: match.isComplete,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		stadium: null,
		kickOff: null,
		decidedByPenalties: false,
		bracketPosition: match.id,
		stageMultiplier: multiplier,
	};
}

// ============================================================================
// RESOLVE FUNCTIONS
// ============================================================================

/**
 * Resuelve los 16 partidos de Dieciseisavos (R32) a partir de las tablas
 * de grupos y los mejores terceros. Es un wrapper tipado sobre
 * `resolveKnockoutMatchups` de `worldCupGroups.ts`.
 *
 * Estructura: pares de grupos (A-B, C-D, ...) + cruces de terceros (1v2, 3v4, ...).
 */
export function resolveRoundOf16(
	groupTables: GroupTable[],
	bestThirds: BestThirdsTable,
): ExtendedBracketMatch[] {
	const baseKnockout: KnockoutBracket = resolveKnockoutMatchups(
		groupTables,
		bestThirds,
	);
	return baseKnockout.matches.map((m) =>
		toExtendedMatch(m, ROUND_CATALOG.R32.multiplier),
	);
}

/**
 * Resuelve los 8 partidos de Octavos (R16) emparejando ganadores de R32.
 *
 * ============================================================================
 * T3: BRACKET_V2 — DUAL IMPLEMENTATION
 * ============================================================================
 * Wrapper que selecciona la implementación según el feature flag:
 * - `BRACKET_V2 = false` (default) → `resolveQuarterFinalsLegacy` (secuencial)
 * - `BRACKET_V2 = true`            → cruces oficiales FIFA via
 *                                   `FIFA_R16_MATCHUPS` (M89-M96)
 *
 * **Nota sobre naming:** La función se llama `resolveQuarterFinals` (legacy)
 * porque en el plan original "Quarter" se refería a la ronda R16. Esta
 * función produce los partidos de Octavos (R16), NO los Cuartos.
 */
export function resolveQuarterFinals(
	roundOf16Matches: ExtendedBracketMatch[],
): ExtendedBracketMatch[] {
	if (!isFeatureEnabled("BRACKET_V2")) {
		return resolveQuarterFinalsLegacy(roundOf16Matches);
	}
	return resolveRoundFromFixtures(
		roundOf16Matches,
		FIFA_R16_MATCHUPS,
		"R16",
		ROUND_CATALOG.R16.multiplier,
	);
}

/**
 * Resuelve los 4 partidos de Cuartos de Final (QF) emparejando ganadores
 * de R16.
 *
 * ============================================================================
 * T3: BRACKET_V2 — DUAL IMPLEMENTATION
 * ============================================================================
 * - `BRACKET_V2 = false` (default) → `resolveSemiFinalsLegacy` (secuencial)
 * - `BRACKET_V2 = true`            → cruces oficiales FIFA via
 *                                   `FIFA_QF_MATCHUPS` (M97-M100)
 *
 * **Nota sobre naming:** Idéntico a `resolveQuarterFinals`, produce la
 * ronda siguiente a la que recibe.
 */
export function resolveSemiFinals(
	r16Matches: ExtendedBracketMatch[],
): ExtendedBracketMatch[] {
	if (!isFeatureEnabled("BRACKET_V2")) {
		return resolveSemiFinalsLegacy(r16Matches);
	}
	return resolveRoundFromFixtures(
		r16Matches,
		FIFA_QF_MATCHUPS,
		"QF",
		ROUND_CATALOG.QF.multiplier,
	);
}

/**
 * Resuelve los 2 partidos de Semifinal (SF) y la Final (F).
 *
 * ============================================================================
 * T3: BRACKET_V2 — DUAL IMPLEMENTATION
 * ============================================================================
 * - `BRACKET_V2 = false` (default) → `resolveFinalLegacy` (secuencial)
 * - `BRACKET_V2 = true`            → cruces oficiales FIFA via
 *                                   `FIFA_SF_MATCHUPS` (SF) + `FIFA_FINAL` (F-1)
 */
export function resolveFinal(quarterMatches: ExtendedBracketMatch[]): {
	semiMatches: ExtendedBracketMatch[];
	finalMatch: ExtendedBracketMatch;
} {
	if (!isFeatureEnabled("BRACKET_V2")) {
		return resolveFinalLegacy(quarterMatches);
	}
	const semiMatches = resolveRoundFromFixtures(
		quarterMatches,
		FIFA_SF_MATCHUPS,
		"SF",
		ROUND_CATALOG.SF.multiplier,
	);
	const finalMatch = resolveSingleMatchFromFixture(
		semiMatches,
		FIFA_FINAL,
		ROUND_CATALOG.F.multiplier,
	);
	return { semiMatches, finalMatch };
}

/**
 * Resuelve el partido por el 3er puesto a partir de los perdedores de SF.
 *   3RD-1 = perdedor(SF-1) vs perdedor(SF-2)
 *
 * ============================================================================
 * T3: BRACKET_V2 — DUAL IMPLEMENTATION
 * ============================================================================
 * - `BRACKET_V2 = false` (default) → `resolveThirdPlaceLegacy` (pre-llena
 *                                   slots con perdedores de SF si están
 *                                   disponibles; legacy: el 3RD queda con
 *                                   teamName pre-llenado).
 * - `BRACKET_V2 = true`            → `resolveThirdPlaceFromFixture`. Los
 *                                   slots quedan VACÍOS (teamName = null) y
 *                                   se llenan con los perdedores durante
 *                                   `propagateLosersToThirdPlace`. Esto es
 *                                   más correcto: 3RD no debería pre-llenarse
 *                                   en construcción.
 */
export function resolveThirdPlace(
	semiMatches: ExtendedBracketMatch[],
): ExtendedBracketMatch {
	if (!isFeatureEnabled("BRACKET_V2")) {
		return resolveThirdPlaceLegacy(semiMatches);
	}
	return resolveThirdPlaceFromFixture(semiMatches);
}

// ============================================================================
// WINNER / LOSER HELPERS
// ============================================================================

/**
 * Determina el ganador de un partido del bracket.
 *
 * - Retorna el nombre del equipo si hay score y no hay empate
 * - Retorna null si no hay score, o si hay empate sin info de penales
 *
 * **IMPORTANTE:** En caso de empate, esta función NO puede resolver
 * quién ganó por penales usando solo `ExtendedBracketMatch`. La info de
 * `penaltyWinner` viene del `Match` de la DB y se aplica en
 * `propagateBracketWinners`.
 */
export function getWinnerOfBracketMatch(
	match: ExtendedBracketMatch,
): string | null {
	if (!match.score) return null;
	const { home, away } = match.score;
	if (home === away) {
		// Empate: no podemos resolver sin penaltyWinner de la DB
		return null;
	}
	return home > away ? match.slotA.teamName : match.slotB.teamName;
}

/**
 * Determina el perdedor de un partido del bracket.
 * Retorna un objeto con teamName, teamLogo y decidedByPenalties, o null
 * si no se puede determinar.
 *
 * ============================================================================
 * T0 HOTFIX 2026-06-25: Manejo de penales
 * ============================================================================
 * Si el partido terminó empatado pero se definió por penales
 * (`decidedByPenalties === true` y `match.winner` está populado),
 * el perdedor es el equipo que NO ganó. Esto es necesario para
 * propagar correctamente los perdedores de SF al partido por el 3er puesto.
 *
 * Caso típico: SF-1 termina 1-1 y se define por penales para Argentina.
 * El perdedor (Francia) debe ir al 3RD-1.
 *
 * Pre-condición: `propagateBracketWinners` ya populó `match.winner` y
 * `match.decidedByPenalties` desde el `Match` de la DB.
 */
function getLoserOfBracketMatch(match: ExtendedBracketMatch): {
	teamName: string;
	teamLogo: string | null;
	decidedByPenalties: boolean;
} | null {
	if (!match.score) return null;
	const { home, away } = match.score;

	// Caso 1: Resultado normal (no hubo empate)
	if (home > away) {
		return {
			teamName: match.slotB.teamName ?? "",
			teamLogo: match.slotB.teamLogo,
			decidedByPenalties: match.decidedByPenalties,
		};
	}
	if (away > home) {
		return {
			teamName: match.slotA.teamName ?? "",
			teamLogo: match.slotA.teamLogo,
			decidedByPenalties: match.decidedByPenalties,
		};
	}

	// Caso 2: Empate (home === away)
	// Si se definió por penales y tenemos el winner populado, el perdedor es
	// el equipo que NO ganó.
	if (match.decidedByPenalties && match.winner) {
		const loserIsSlotA = match.winner === match.slotB.teamName;
		return {
			teamName: loserIsSlotA
				? (match.slotA.teamName ?? "")
				: (match.slotB.teamName ?? ""),
			teamLogo: loserIsSlotA ? match.slotA.teamLogo : match.slotB.teamLogo,
			decidedByPenalties: true,
		};
	}

	// Empate sin info de penales: no se puede determinar el perdedor
	return null;
}

// ============================================================================
// LEGACY IMPLEMENTATIONS (T3: BRACKET_V2 = false)
// ============================================================================
// Las funciones `*Legacy` son las implementaciones originales de T0-T2
// (emparejamiento secuencial: R16-1 = W(R32-1) vs W(R32-2), etc.).
// Se preservan tal cual para que BRACKET_V2 = false mantenga el
// comportamiento legacy exacto (sin cambios en tests existentes).
// ============================================================================

/**
 * Resuelve los 8 partidos de Octavos (R16) emparejando ganadores de R32 de
 * forma **secuencial**:
 *   R16-1 = ganador(R32-1) vs ganador(R32-2)
 *   R16-2 = ganador(R32-3) vs ganador(R32-4)
 *   ...
 *
 * ⚠️ Esta implementación **NO coincide con el fixture oficial FIFA 2026**
 * (donde, p.ej., R16-1 = W(R32-1) vs W(R32-3)). Se preserva solo para
 * rollback seguro vía `BRACKET_V2 = false`.
 */
function resolveQuarterFinalsLegacy(
	roundOf16Matches: ExtendedBracketMatch[],
): ExtendedBracketMatch[] {
	const result: ExtendedBracketMatch[] = [];
	const multiplier = ROUND_CATALOG.R16.multiplier;

	for (let i = 0; i < roundOf16Matches.length; i += 2) {
		const sourceA = roundOf16Matches[i];
		const sourceB = roundOf16Matches[i + 1];
		if (!sourceA || !sourceB) continue; // Safety: saltamos si falta source

		const position = result.length + 1;
		const id = `R16-${position}`;
		const match: ExtendedBracketMatch = {
			id,
			position,
			slotA: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceA.winner,
				teamLogo: sourceA.winnerLogo,
				isLive: false,
				sourceMatchId: sourceA.bracketPosition,
				decidedByPenalties: sourceA.decidedByPenalties,
			},
			slotB: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceB.winner,
				teamLogo: sourceB.winnerLogo,
				isLive: false,
				sourceMatchId: sourceB.bracketPosition,
				decidedByPenalties: sourceB.decidedByPenalties,
			},
			isComplete: sourceA.winner !== null && sourceB.winner !== null,
			dbMatchId: null,
			winner: null,
			winnerLogo: null,
			score: null,
			stadium: null,
			kickOff: null,
			decidedByPenalties: false,
			bracketPosition: id,
			stageMultiplier: multiplier,
		};
		result.push(match);
	}

	return result;
}

/**
 * Resuelve los 4 partidos de Cuartos de Final (QF) emparejando ganadores
 * de R16 de forma **secuencial** (legacy).
 */
function resolveSemiFinalsLegacy(
	r16Matches: ExtendedBracketMatch[],
): ExtendedBracketMatch[] {
	return pairWinnersIntoRoundLegacy(
		r16Matches,
		"QF",
		ROUND_CATALOG.QF.multiplier,
	);
}

/**
 * Resuelve los 2 partidos de Semifinal (SF) y la Final (F) con emparejamiento
 * **secuencial** (legacy).
 */
function resolveFinalLegacy(quarterMatches: ExtendedBracketMatch[]): {
	semiMatches: ExtendedBracketMatch[];
	finalMatch: ExtendedBracketMatch;
} {
	const semiMatches = pairWinnersIntoRoundLegacy(
		quarterMatches,
		"SF",
		ROUND_CATALOG.SF.multiplier,
	);
	const finalMatch = pairTwoIntoFinalLegacy(semiMatches);
	return { semiMatches, finalMatch };
}

/**
 * Resuelve el partido por el 3er puesto (legacy: pre-llena slots con los
 * perdedores de SF si están disponibles al momento de construcción).
 */
function resolveThirdPlaceLegacy(
	semiMatches: ExtendedBracketMatch[],
): ExtendedBracketMatch {
	const sf1 = semiMatches[0];
	const sf2 = semiMatches[1];

	const loser1 = sf1 ? getLoserOfBracketMatch(sf1) : null;
	const loser2 = sf2 ? getLoserOfBracketMatch(sf2) : null;

	return {
		id: "3RD-1",
		position: 1,
		slotA: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: loser1?.teamName ?? null,
			teamLogo: loser1?.teamLogo ?? null,
			isLive: false,
			sourceMatchId: sf1?.bracketPosition ?? null,
			decidedByPenalties: loser1?.decidedByPenalties ?? false,
		},
		slotB: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: loser2?.teamName ?? null,
			teamLogo: loser2?.teamLogo ?? null,
			isLive: false,
			sourceMatchId: sf2?.bracketPosition ?? null,
			decidedByPenalties: loser2?.decidedByPenalties ?? false,
		},
		isComplete: loser1 !== null && loser2 !== null,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		stadium: null,
		kickOff: null,
		decidedByPenalties: false,
		bracketPosition: "3RD-1",
		stageMultiplier: ROUND_CATALOG["3RD"].multiplier,
	};
}

/**
 * Empareja ganadores de N matches en N/2 partidos de la ronda siguiente
 * de forma **secuencial** (legacy). Helper genérico usado por
 * `resolveQuarterFinalsLegacy`, `resolveSemiFinalsLegacy`, `resolveFinalLegacy`.
 */
function pairWinnersIntoRoundLegacy(
	sourceMatches: ExtendedBracketMatch[],
	targetRound: RoundAbbreviation,
	multiplier: number,
): ExtendedBracketMatch[] {
	const result: ExtendedBracketMatch[] = [];
	for (let i = 0; i < sourceMatches.length; i += 2) {
		const sourceA = sourceMatches[i];
		const sourceB = sourceMatches[i + 1];
		if (!sourceA || !sourceB) continue;

		const position = result.length + 1;
		const id = `${targetRound}-${position}`;
		const match: ExtendedBracketMatch = {
			id,
			position,
			slotA: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceA.winner,
				teamLogo: sourceA.winnerLogo,
				isLive: false,
				sourceMatchId: sourceA.bracketPosition,
				decidedByPenalties: sourceA.decidedByPenalties,
			},
			slotB: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceB.winner,
				teamLogo: sourceB.winnerLogo,
				isLive: false,
				sourceMatchId: sourceB.bracketPosition,
				decidedByPenalties: sourceB.decidedByPenalties,
			},
			isComplete: sourceA.winner !== null && sourceB.winner !== null,
			dbMatchId: null,
			winner: null,
			winnerLogo: null,
			score: null,
			stadium: null,
			kickOff: null,
			decidedByPenalties: false,
			bracketPosition: id,
			stageMultiplier: multiplier,
		};
		result.push(match);
	}
	return result;
}

/**
 * Empareja 2 semifinalistas en 1 final (legacy).
 */
function pairTwoIntoFinalLegacy(
	semiMatches: ExtendedBracketMatch[],
): ExtendedBracketMatch {
	const sf1 = semiMatches[0];
	const sf2 = semiMatches[1];

	return {
		id: "F-1",
		position: 1,
		slotA: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: sf1?.winner ?? null,
			teamLogo: sf1?.winnerLogo ?? null,
			isLive: false,
			sourceMatchId: sf1?.bracketPosition ?? null,
			decidedByPenalties: sf1?.decidedByPenalties ?? false,
		},
		slotB: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: sf2?.winner ?? null,
			teamLogo: sf2?.winnerLogo ?? null,
			isLive: false,
			sourceMatchId: sf2?.bracketPosition ?? null,
			decidedByPenalties: sf2?.decidedByPenalties ?? false,
		},
		isComplete: sf1?.winner != null && sf2?.winner != null,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		stadium: null,
		kickOff: null,
		decidedByPenalties: false,
		bracketPosition: "F-1",
		stageMultiplier: ROUND_CATALOG.F.multiplier,
	};
}

// ============================================================================
// FIFA HELPERS (T3: BRACKET_V2 = true)
// ============================================================================
// Helpers genéricos que construyen rondas a partir de los fixtures oficiales
// FIFA. Usan `bracketPosition` del match fuente como link de propagación
// (no por índice de array), lo cual es robusto ante cualquier reorden de R32.
//
// Cada helper toma un subset del tipo FIFA def correspondiente
// (FIFAR16MatchDef | FIFAQFMatchDef | FIFASFMatchDef) y produce los
// `ExtendedBracketMatch` con `sourceMatchId` apuntando a los bracketIds
// de los partidos fuente.
// ============================================================================

/**
 * Estructura mínima de un fixture FIFA usada por `resolveRoundFromFixtures`.
 * `FIFAR16MatchDef`, `FIFAQFMatchDef` y `FIFASFMatchDef` la satisfacen.
 */
interface FIFAFixtureSource {
	bracketId: string;
	sourceMatchA: string;
	sourceMatchB: string;
}

/**
 * Construye los partidos de una ronda (R16 / QF / SF) a partir de los cruces
 * oficiales FIFA y los partidos de la ronda anterior.
 *
 * Comportamiento:
 * - Cada fixture produce un `ExtendedBracketMatch` con `bracketPosition` igual
 *   al `bracketId` del fixture (ej. "R16-1"), no un índice de array.
 * - `slotA.sourceMatchId` y `slotB.sourceMatchId` apuntan a los `bracketPosition`
 *   de los partidos fuente (que en R32/R16/QF también son "R32-1", "R16-3", etc.).
 * - `teamName`/`teamLogo` se populan desde `source.winner`/`source.winnerLogo`
 *   si están disponibles (es decir, si el match fuente ya terminó).
 * - `isComplete` es `true` solo si ambos sources tienen winner.
 */
function resolveRoundFromFixtures<T extends FIFAFixtureSource>(
	sourceMatches: ExtendedBracketMatch[],
	fixtures: readonly T[],
	targetRound: RoundAbbreviation,
	multiplier: number,
): ExtendedBracketMatch[] {
	return fixtures.map((fixture, idx) => {
		const sourceA = sourceMatches.find(
			(m) => m.bracketPosition === fixture.sourceMatchA,
		);
		const sourceB = sourceMatches.find(
			(m) => m.bracketPosition === fixture.sourceMatchB,
		);

		const position = idx + 1;
		const id = fixture.bracketId || `${targetRound}-${position}`;

		return {
			id,
			position,
			slotA: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceA?.winner ?? null,
				teamLogo: sourceA?.winnerLogo ?? null,
				isLive: false,
				sourceMatchId: sourceA?.bracketPosition ?? null,
				decidedByPenalties: sourceA?.decidedByPenalties ?? false,
			},
			slotB: {
				slotType: "winner",
				groupLetter: null,
				bestThirdRank: null,
				teamName: sourceB?.winner ?? null,
				teamLogo: sourceB?.winnerLogo ?? null,
				isLive: false,
				sourceMatchId: sourceB?.bracketPosition ?? null,
				decidedByPenalties: sourceB?.decidedByPenalties ?? false,
			},
			isComplete: sourceA?.winner != null && sourceB?.winner != null,
			dbMatchId: null,
			winner: null,
			winnerLogo: null,
			score: null,
			stadium: null,
			kickOff: null,
			decidedByPenalties: false,
			bracketPosition: id,
			stageMultiplier: multiplier,
		};
	});
}

/**
 * Construye un único match (F-1) a partir de un fixture FIFA con dos sources.
 * Usado para la Final: F-1 = W(SF-1) vs W(SF-2).
 */
function resolveSingleMatchFromFixture(
	sourceMatches: ExtendedBracketMatch[],
	fixture: FIFAFixtureSource,
	multiplier: number,
): ExtendedBracketMatch {
	const sourceA = sourceMatches.find(
		(m) => m.bracketPosition === fixture.sourceMatchA,
	);
	const sourceB = sourceMatches.find(
		(m) => m.bracketPosition === fixture.sourceMatchB,
	);

	return {
		id: fixture.bracketId,
		position: 1,
		slotA: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: sourceA?.winner ?? null,
			teamLogo: sourceA?.winnerLogo ?? null,
			isLive: false,
			sourceMatchId: sourceA?.bracketPosition ?? null,
			decidedByPenalties: sourceA?.decidedByPenalties ?? false,
		},
		slotB: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: sourceB?.winner ?? null,
			teamLogo: sourceB?.winnerLogo ?? null,
			isLive: false,
			sourceMatchId: sourceB?.bracketPosition ?? null,
			decidedByPenalties: sourceB?.decidedByPenalties ?? false,
		},
		isComplete: sourceA?.winner != null && sourceB?.winner != null,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		stadium: null,
		kickOff: null,
		decidedByPenalties: false,
		bracketPosition: fixture.bracketId,
		stageMultiplier: multiplier,
	};
}

/**
 * Construye el match 3RD-1 a partir del fixture FIFA.
 *
 * A diferencia de los otros helpers, **NO popula `teamName`/`teamLogo` desde
 * los sources** porque el 3RD se llena con los **perdedores** de SF, no con
 * los ganadores. Esta función solo establece la estructura del match:
 * - `slotA.sourceMatchId = "SF-1"` y `slotB.sourceMatchId = "SF-2"`
 * - `teamName`/`teamLogo` quedan en `null`
 * - `isComplete: false` al inicio
 *
 * Los perdedores se inyectan durante `propagateLosersToThirdPlace`, que
 * matchea `semi.bracketPosition === thirdPlaceMatch.slotA.sourceMatchId`
 * (es decir, "SF-1" === "SF-1" para slotA, y "SF-2" === "SF-2" para slotB).
 */
function resolveThirdPlaceFromFixture(
	semiMatches: ExtendedBracketMatch[],
): ExtendedBracketMatch {
	const sourceA = semiMatches.find(
		(m) => m.bracketPosition === FIFA_THIRD_PLACE.sourceMatchA,
	);
	const sourceB = semiMatches.find(
		(m) => m.bracketPosition === FIFA_THIRD_PLACE.sourceMatchB,
	);

	return {
		id: "3RD-1",
		position: 1,
		slotA: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: null,
			teamLogo: null,
			isLive: false,
			sourceMatchId: sourceA?.bracketPosition ?? FIFA_THIRD_PLACE.sourceMatchA,
			decidedByPenalties: false,
		},
		slotB: {
			slotType: "winner",
			groupLetter: null,
			bestThirdRank: null,
			teamName: null,
			teamLogo: null,
			isLive: false,
			sourceMatchId: sourceB?.bracketPosition ?? FIFA_THIRD_PLACE.sourceMatchB,
			decidedByPenalties: false,
		},
		isComplete: false,
		dbMatchId: null,
		winner: null,
		winnerLogo: null,
		score: null,
		stadium: null,
		kickOff: null,
		decidedByPenalties: false,
		bracketPosition: "3RD-1",
		stageMultiplier: ROUND_CATALOG["3RD"].multiplier,
	};
}

// ============================================================================
// PROPAGATION
// ============================================================================

/**
 * Propaga los ganadores de los partidos reales (DB) hacia el bracket.
 *
 * Para cada `Match` de la DB, encuentra el `ExtendedBracketMatch`
 * correspondiente (matching por `bracketPosition` o `dbMatchId`) y popula
 * `score`, `winner`, `winnerLogo`, `decidedByPenalties`.
 *
 * Después, para cada ronda siguiente, propaga los winners a los slots
 * correspondientes (resueltos via `sourceMatchId`).
 *
 * **Importante:** Esta función es **pura y no destructiva**: devuelve un
 * nuevo `FullBracket` sin modificar el input. Se puede usar dentro de
 * `useMemo` con seguridad.
 */
export function propagateBracketWinners(
	matches: Match[],
	bracket: FullBracket,
): FullBracket {
	// 1. Construir índice de matches de DB por bracketPosition
	const dbMatchByPosition = new Map<string, Match>();
	for (const m of matches) {
		if (m.bracketPosition) {
			dbMatchByPosition.set(m.bracketPosition, m);
		}
	}

	// 2. Construir índice de ExtendedBracketMatch por bracketPosition
	const ebMatchByPosition = new Map<string, ExtendedBracketMatch>();
	for (const round of bracket.rounds) {
		for (const m of round.matches) {
			ebMatchByPosition.set(m.bracketPosition, m);
		}
	}
	if (bracket.thirdPlaceMatch) {
		ebMatchByPosition.set(
			bracket.thirdPlaceMatch.bracketPosition,
			bracket.thirdPlaceMatch,
		);
	}

	// 3. Para cada match de DB, propagar datos al bracket
	for (const [position, dbMatch] of dbMatchByPosition) {
		const ebMatch = ebMatchByPosition.get(position);
		if (!ebMatch) continue;

		// Sprint 5D+: estos campos se propagan incluso para matches sin score
		// (TBD con fecha programada: el usuario ve estadio+fecha antes del resultado)
		ebMatch.dbMatchId = dbMatch.id;
		ebMatch.stadium = dbMatch.stadium ?? null;
		ebMatch.kickOff = dbMatch.kickOff ?? null;

		// Solo propagar score y winner si el match tiene resultado
		if (dbMatch.homeScore === null || dbMatch.awayScore === null) continue;

		ebMatch.score = { home: dbMatch.homeScore, away: dbMatch.awayScore };
		ebMatch.decidedByPenalties = dbMatch.penaltyWinner !== null;

		// Determinar ganador (respeta penaltyWinner)
		if (dbMatch.homeScore > dbMatch.awayScore) {
			ebMatch.winner = ebMatch.slotA.teamName;
			ebMatch.winnerLogo = ebMatch.slotA.teamLogo;
		} else if (dbMatch.awayScore > dbMatch.homeScore) {
			ebMatch.winner = ebMatch.slotB.teamName;
			ebMatch.winnerLogo = ebMatch.slotB.teamLogo;
		} else if (dbMatch.penaltyWinner === "home") {
			ebMatch.winner = ebMatch.slotA.teamName;
			ebMatch.winnerLogo = ebMatch.slotA.teamLogo;
		} else if (dbMatch.penaltyWinner === "away") {
			ebMatch.winner = ebMatch.slotB.teamName;
			ebMatch.winnerLogo = ebMatch.slotB.teamLogo;
		}
		// Si hay empate y no hay penaltyWinner, winner queda null (match no decidido)
	}

	// 4. Propagar winners a rondas siguientes (R32 → R16 → QF → SF → F)
	//    y R32 → R16 → QF → SF → 3RD
	for (let i = 0; i < bracket.rounds.length - 1; i++) {
		const currentRound = bracket.rounds[i];
		const nextRound = bracket.rounds[i + 1];
		if (!currentRound || !nextRound) continue;

		propagateWinnersToNextRound(currentRound.matches, nextRound.matches);
	}

	// 5. Propagar perdedores de SF al partido por el 3er puesto
	if (bracket.rounds[3] && bracket.thirdPlaceMatch) {
		propagateLosersToThirdPlace(
			bracket.rounds[3].matches,
			bracket.thirdPlaceMatch,
		);
	}

	// 6. Recalcular completedCount por ronda + champion/runners-up
	const updatedRounds = bracket.rounds.map((round) => ({
		...round,
		completedCount: round.matches.filter((m) => m.winner !== null).length,
	}));

	// Final: champion = winner de F-1, runnerUp = perdedor de F-1
	const finalRound = updatedRounds[4];
	const finalMatch = finalRound?.matches[0];
	const champion = finalMatch?.winner ?? null;
	const runnerUp = finalMatch
		? finalMatch.winner === finalMatch.slotA.teamName
			? finalMatch.slotB.teamName
			: finalMatch.winner === finalMatch.slotB.teamName
				? finalMatch.slotA.teamName
				: null
		: null;
	const thirdPlace = bracket.thirdPlaceMatch.winner;

	return {
		...bracket,
		rounds: updatedRounds,
		champion,
		runnerUp,
		thirdPlace,
	};
}

/**
 * Copia winners de matches de la ronda actual a slots de la ronda siguiente.
 */
function propagateWinnersToNextRound(
	currentMatches: ExtendedBracketMatch[],
	nextMatches: ExtendedBracketMatch[],
): void {
	for (const next of nextMatches) {
		// Slot A
		if (next.slotA.sourceMatchId) {
			const source = currentMatches.find(
				(m) => m.bracketPosition === next.slotA.sourceMatchId,
			);
			if (source) {
				next.slotA.teamName = source.winner;
				next.slotA.teamLogo = source.winnerLogo;
				next.slotA.decidedByPenalties = source.decidedByPenalties;
				next.slotA.isLive = false; // El slot destino no está "live", solo el source
			}
		}
		// Slot B
		if (next.slotB.sourceMatchId) {
			const source = currentMatches.find(
				(m) => m.bracketPosition === next.slotB.sourceMatchId,
			);
			if (source) {
				next.slotB.teamName = source.winner;
				next.slotB.teamLogo = source.winnerLogo;
				next.slotB.decidedByPenalties = source.decidedByPenalties;
				next.slotB.isLive = false;
			}
		}
		// isComplete: ambos slots con teamName
		next.isComplete =
			next.slotA.teamName !== null && next.slotB.teamName !== null;
	}
}

/**
 * Copia perdedores de SF al partido por el 3er puesto.
 *
 * ============================================================================
 * T0 HOTFIX 2026-06-25: Manejo de penales
 * ============================================================================
 * Si una SF termina empatada y se define por penales
 * (`decidedByPenalties === true` y `winner` está populado), el perdedor
 * es el equipo que NO ganó. Esto evita que el 3RD quede con slots TBD
 * para siempre cuando hay penales en SF (bug pre-T0).
 *
 * Pre-condición: `propagateBracketWinners` ya populó `semi.score`,
 * `semi.winner` y `semi.decidedByPenalties` desde el `Match` de la DB.
 */
function propagateLosersToThirdPlace(
	semiMatches: ExtendedBracketMatch[],
	thirdPlaceMatch: ExtendedBracketMatch,
): void {
	for (const semi of semiMatches) {
		if (!semi.score) continue;
		const { home, away } = semi.score;

		let loserName: string | null | undefined;
		let loserLogo: string | null | undefined;

		if (home > away) {
			// Victoria normal: perdedor es el visitante
			loserName = semi.slotB.teamName;
			loserLogo = semi.slotB.teamLogo;
		} else if (away > home) {
			// Victoria normal: perdedor es el local
			loserName = semi.slotA.teamName;
			loserLogo = semi.slotA.teamLogo;
		} else {
			// Empate: solo podemos resolver si se definió por penales
			// y tenemos el winner populado (T0 hotfix).
			if (semi.decidedByPenalties && semi.winner) {
				// El perdedor es el equipo que NO ganó los penales
				const loserIsSlotA = semi.winner === semi.slotB.teamName;
				loserName = loserIsSlotA ? semi.slotA.teamName : semi.slotB.teamName;
				loserLogo = loserIsSlotA ? semi.slotA.teamLogo : semi.slotB.teamLogo;
			} else {
				// Empate sin info de penales: no se puede determinar
				continue;
			}
		}

		// Asignar al slot correspondiente (mismo orden: SF-1 → slotA, SF-2 → slotB)
		if (semi.bracketPosition === thirdPlaceMatch.slotA.sourceMatchId) {
			thirdPlaceMatch.slotA.teamName = loserName ?? null;
			thirdPlaceMatch.slotA.teamLogo = loserLogo ?? null;
		} else if (semi.bracketPosition === thirdPlaceMatch.slotB.sourceMatchId) {
			thirdPlaceMatch.slotB.teamName = loserName ?? null;
			thirdPlaceMatch.slotB.teamLogo = loserLogo ?? null;
		}
	}
	thirdPlaceMatch.isComplete =
		thirdPlaceMatch.slotA.teamName !== null &&
		thirdPlaceMatch.slotB.teamName !== null;
}

// ============================================================================
// MAIN ENTRYPOINT
// ============================================================================

/**
 * Construye el bracket completo desde cero.
 *
 * @param matches - Partidos crudos de la DB (de `useMatches`). Sirve para
 *                  propagar scores y winners. Si está vacío, devuelve bracket
 *                  estructural sin scores.
 * @param groupTables - 12 tablas de grupos (de `getGroupTables`)
 * @param bestThirds - Tabla de mejores terceros (de `calculateBestThirds`)
 * @returns FullBracket con 5 rondas + 3er puesto, scores propagados
 */
export function getFullBracket(
	matches: Match[],
	groupTables: GroupTable[],
	bestThirds: BestThirdsTable,
): FullBracket {
	// 1. Construir rondas estructurales
	const r32 = resolveRoundOf16(groupTables, bestThirds);
	const r16 = resolveQuarterFinals(r32);
	const qf = resolveSemiFinals(r16);
	const { semiMatches, finalMatch } = resolveFinal(qf);
	const thirdPlaceMatch = resolveThirdPlace(semiMatches);

	// 2. Armar KnockoutRounds con metadata
	const rounds: KnockoutRound[] = [
		{
			meta: ROUND_CATALOG.R32,
			matches: r32,
			completedCount: 0,
		},
		{
			meta: ROUND_CATALOG.R16,
			matches: r16,
			completedCount: 0,
		},
		{
			meta: ROUND_CATALOG.QF,
			matches: qf,
			completedCount: 0,
		},
		{
			meta: ROUND_CATALOG.SF,
			matches: semiMatches,
			completedCount: 0,
		},
		{
			meta: { ...ROUND_CATALOG.F, expectedMatches: 1 },
			matches: [finalMatch],
			completedCount: 0,
		},
	];

	// 3. Construir bracket estructural
	const structuralBracket: FullBracket = {
		rounds,
		thirdPlaceMatch,
		champion: null,
		runnerUp: null,
		thirdPlace: null,
	};

	// 4. Propagar winners desde matches de DB
	return propagateBracketWinners(matches, structuralBracket);
}
