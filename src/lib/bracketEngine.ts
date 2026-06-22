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
 * Resuelve los 8 partidos de Octavos (R16) emparejando ganadores de R32:
 *   R16-1 = ganador(R32-1) vs ganador(R32-2)
 *   R16-2 = ganador(R32-3) vs ganador(R32-4)
 *   ...
 *
 * Si un R32 no tiene ganador (slot TBD), el slot correspondiente del R16
 * queda TBD hasta que se propague el resultado.
 *
 * **Nota sobre naming:** La función se llama `resolveQuarterFinals` (legacy)
 * porque en el plan original "Quarter" se refería a la ronda R16. Esta
 * función produce los partidos de Octavos (R16), NO los Cuartos.
 */
export function resolveQuarterFinals(
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
 * de R16. Misma lógica que `resolveQuarterFinals` pero produce QF.
 *
 * **Nota sobre naming:** Idéntico a `resolveQuarterFinals`, produce la
 * ronda siguiente a la que recibe.
 */
export function resolveSemiFinals(
	r16Matches: ExtendedBracketMatch[],
): ExtendedBracketMatch[] {
	return pairWinnersIntoRound(r16Matches, "QF", ROUND_CATALOG.QF.multiplier);
}

/**
 * Resuelve los 2 partidos de Semifinal (SF) y la Final (F).
 *   SF-1 = ganador(QF-1) vs ganador(QF-2)
 *   SF-2 = ganador(QF-3) vs ganador(QF-4)
 *   F-1  = ganador(SF-1) vs ganador(SF-2)
 */
export function resolveFinal(quarterMatches: ExtendedBracketMatch[]): {
	semiMatches: ExtendedBracketMatch[];
	finalMatch: ExtendedBracketMatch;
} {
	const semiMatches = pairWinnersIntoRound(
		quarterMatches,
		"SF",
		ROUND_CATALOG.SF.multiplier,
	);
	const finalMatch = pairTwoIntoFinal(semiMatches);
	return { semiMatches, finalMatch };
}

/**
 * Resuelve el partido por el 3er puesto a partir de los perdedores de SF.
 *   3RD-1 = perdedor(SF-1) vs perdedor(SF-2)
 *
 * Si una SF no tiene perdedor (aún no se jugó), el slot queda TBD.
 */
export function resolveThirdPlace(
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
		decidedByPenalties: false,
		bracketPosition: "3RD-1",
		stageMultiplier: ROUND_CATALOG["3RD"].multiplier,
	};
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
 */
function getLoserOfBracketMatch(match: ExtendedBracketMatch): {
	teamName: string;
	teamLogo: string | null;
	decidedByPenalties: boolean;
} | null {
	if (!match.score) return null;
	const { home, away } = match.score;
	if (home === away) return null; // Empate: no podemos resolver
	if (home > away) {
		return {
			teamName: match.slotB.teamName ?? "",
			teamLogo: match.slotB.teamLogo,
			decidedByPenalties: match.decidedByPenalties,
		};
	}
	return {
		teamName: match.slotA.teamName ?? "",
		teamLogo: match.slotA.teamLogo,
		decidedByPenalties: match.decidedByPenalties,
	};
}

// ============================================================================
// PAIR HELPERS
// ============================================================================

/**
 * Empareja ganadores de N matches en N/2 partidos de la ronda siguiente.
 * Helper genérico usado por R16, QF, SF.
 */
function pairWinnersIntoRound(
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
			decidedByPenalties: false,
			bracketPosition: id,
			stageMultiplier: multiplier,
		};
		result.push(match);
	}
	return result;
}

/**
 * Empareja 2 semifinalistas en 1 final.
 */
function pairTwoIntoFinal(
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
		decidedByPenalties: false,
		bracketPosition: "F-1",
		stageMultiplier: ROUND_CATALOG.F.multiplier,
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

	// 3. Para cada match de DB, propagar score y winner al bracket
	for (const [position, dbMatch] of dbMatchByPosition) {
		const ebMatch = ebMatchByPosition.get(position);
		if (!ebMatch) continue;

		// Solo propagar si el match tiene score
		if (dbMatch.homeScore === null || dbMatch.awayScore === null) continue;

		ebMatch.dbMatchId = dbMatch.id;
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
 */
function propagateLosersToThirdPlace(
	semiMatches: ExtendedBracketMatch[],
	thirdPlaceMatch: ExtendedBracketMatch,
): void {
	for (const semi of semiMatches) {
		if (!semi.score) continue;
		const { home, away } = semi.score;
		if (home === away) continue; // Empate sin penales → no se puede determinar perdedor

		const loserName = home > away ? semi.slotB.teamName : semi.slotA.teamName;
		const loserLogo = home > away ? semi.slotB.teamLogo : semi.slotA.teamLogo;

		// Asignar al slot correspondiente (mismo orden: SF-1 → slotA, SF-2 → slotB)
		if (semi.bracketPosition === thirdPlaceMatch.slotA.sourceMatchId) {
			thirdPlaceMatch.slotA.teamName = loserName;
			thirdPlaceMatch.slotA.teamLogo = loserLogo;
		} else if (semi.bracketPosition === thirdPlaceMatch.slotB.sourceMatchId) {
			thirdPlaceMatch.slotB.teamName = loserName;
			thirdPlaceMatch.slotB.teamLogo = loserLogo;
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
