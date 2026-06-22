/**
 * useStandings — Hook adaptador para obtener posiciones de cualquier
 * competición, independientemente del formato (groups o league).
 *
 * ============================================================================
 * PATRÓN ADAPTER
 * ============================================================================
 * - Si `format === 'groups'` (Mundial): delega a `useGroupStandings`,
 *   que retorna `groupTables` (12 grupos) + `liveMatchesCount` + animaciones.
 * - Si `format === 'league'` (LPF, etc.): usa `useMatches` + la lógica pura
 *   `calculateLeagueStandings` (calcula una tabla única ordenada).
 *
 * ============================================================================
 * FEATURE: FULL BRACKET (Sprint 4)
 * ============================================================================
 * Para `format === 'groups'`, el hook ahora pre-calcula:
 * - `bestThirds`: tabla de los 12 mejores terceros (top 8 clasifica a 16vos)
 * - `bracket`: árbol completo de eliminatorias (5 rondas + 3er puesto)
 *
 * Ambos se calculan con `useMemo` para evitar re-cálculos en cada render.
 * El cálculo se desactiva si la feature flag `VITE_ENABLE_FULL_BRACKET` no
 * está habilitada (rollback seguro).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const { result, isLoading } = useStandings(competitionId, format);
 *
 * if (result?.format === 'groups') {
 *   result.groupTables.map(...)
 *   result.bestThirds && <WorldCupBestThirdsSection ... />
 *   result.bracket && <WorldCupKnockoutSection ... />
 * }
 * ```
 */

import { useMemo } from "react";
import { getFullBracket } from "../lib/bracketEngine";
import type { FullBracket } from "../lib/bracketTypes";
import { calculateLeagueStandings } from "../lib/leagueStandings";
import type { CompetitionFormat, LeagueStanding } from "../lib/types";
import type { BestThirdsTable, GroupTable } from "../lib/worldCupGroups";
import { calculateBestThirds } from "../lib/worldCupGroups";
import { type PositionChange, useGroupStandings } from "./useGroupStandings";
import { useMatches } from "./useMatches";

/**
 * Feature flag: VITE_ENABLE_FULL_BRACKET
 * Si está `true`, el hook pre-calcula `bestThirds` y `bracket`.
 * Si está `false` o no está definida, retorna `null` (rollback a legacy).
 */
const ENABLE_FULL_BRACKET = import.meta.env.VITE_ENABLE_FULL_BRACKET === "true";

/**
 * Resultado discriminado por formato. Usar `result.format` para narrowing.
 */
export type StandingsResult =
	| {
			format: "groups";
			groupTables: GroupTable[];
			liveMatchesCount: number;
			liveGroupsCount: number;
			positionChanges: Map<string, PositionChange>;
			/** BestThirds pre-calculado (null si flag desactivada) */
			bestThirds: BestThirdsTable | null;
			/** FullBracket pre-calculado (null si flag desactivada) */
			bracket: FullBracket | null;
	  }
	| {
			format: "league";
			standings: LeagueStanding[];
			liveMatchesCount: number;
			bestThirds: null;
			bracket: null;
	  };

export interface UseStandingsResult {
	result: StandingsResult | null;
	isLoading: boolean;
	error: Error | null;
}

export function useStandings(
	competitionId: string | undefined,
	format: CompetitionFormat | undefined,
): UseStandingsResult {
	// Hook de matches (cacheado por React Query; mismo cache que Dashboard)
	const {
		data: matches,
		isLoading: isLoadingMatches,
		error: matchesError,
	} = useMatches(competitionId);

	// Hook de groups (solo se usa si format === 'groups')
	// useGroupStandings internamente llama a getGroupTables, que es pura
	// y liviana (no genera queries adicionales).
	const {
		groupTables,
		liveMatchesCount: groupsLiveMatchesCount,
		liveGroupsCount,
		positionChanges,
	} = useGroupStandings(format === "groups" ? matches : undefined);

	// Sprint 4: pre-calcular bestThirds y bracket (si feature flag está activa).
	// useMemo para evitar re-cálculos en cada render.
	// El cálculo es O(n) con n=12 grupos (~1ms) — no es problema de performance.
	const fullBracketData = useMemo(() => {
		if (!ENABLE_FULL_BRACKET) return { bestThirds: null, bracket: null };
		if (format !== "groups") return { bestThirds: null, bracket: null };
		if (!matches || groupTables.length === 0) {
			return { bestThirds: null, bracket: null };
		}

		const bestThirds = calculateBestThirds(groupTables);
		const bracket = getFullBracket(matches, groupTables, bestThirds);
		return { bestThirds, bracket };
	}, [format, matches, groupTables]);

	// Cálculo de league standings (memoizado)
	const leagueResult = useMemo(() => {
		if (format !== "league" || !matches) return null;
		const standings = calculateLeagueStandings(matches);
		const liveMatchesCount = matches.filter((m) => m.status === "live").length;
		return { standings, liveMatchesCount };
	}, [format, matches]);

	// Componer resultado discriminado
	const result = useMemo<StandingsResult | null>(() => {
		if (!format) return null;

		if (format === "groups") {
			return {
				format: "groups",
				groupTables,
				liveMatchesCount: groupsLiveMatchesCount,
				liveGroupsCount,
				positionChanges,
				bestThirds: fullBracketData.bestThirds,
				bracket: fullBracketData.bracket,
			};
		}

		if (!leagueResult) return null;
		return {
			format: "league",
			standings: leagueResult.standings,
			liveMatchesCount: leagueResult.liveMatchesCount,
			bestThirds: null,
			bracket: null,
		};
	}, [
		format,
		groupTables,
		groupsLiveMatchesCount,
		liveGroupsCount,
		positionChanges,
		leagueResult,
		fullBracketData,
	]);

	return {
		result,
		isLoading: isLoadingMatches,
		error: matchesError as Error | null,
	};
}
