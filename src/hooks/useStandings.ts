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
 * Ambos casos retornan un `StandingsResult` discriminado que la UI
 * (`Ligas.tsx`) puede renderizar condicionalmente sin type assertions.
 *
 * ============================================================================
 * FASES FUTURAS
 * ============================================================================
 * - Fase 2: se agrega un segundo `useQuery` que lee de la tabla
 *   `league_standings` (sincronizada por `poll-standings`). El componente
 *   mostrará un toggle "Calculada" / "Oficial API".
 * - Fase 3: se agrega `favoriteTeam` prop para highlight de "Mi tabla".
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const { result, isLoading } = useStandings(competitionId, format);
 *
 * if (result?.format === 'groups') {
 *   result.groupTables.map(...)
 * } else if (result?.format === 'league') {
 *   result.standings.map(...)
 * }
 * ```
 */

import { useMemo } from "react";
import { calculateLeagueStandings } from "../lib/leagueStandings";
import type { CompetitionFormat, LeagueStanding } from "../lib/types";
import type { GroupTable } from "../lib/worldCupGroups";
import { type PositionChange, useGroupStandings } from "./useGroupStandings";
import { useMatches } from "./useMatches";

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
	  }
	| {
			format: "league";
			standings: LeagueStanding[];
			liveMatchesCount: number;
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
			};
		}

		if (!leagueResult) return null;
		return {
			format: "league",
			standings: leagueResult.standings,
			liveMatchesCount: leagueResult.liveMatchesCount,
		};
	}, [
		format,
		groupTables,
		groupsLiveMatchesCount,
		liveGroupsCount,
		positionChanges,
		leagueResult,
	]);

	return {
		result,
		isLoading: isLoadingMatches,
		error: matchesError as Error | null,
	};
}
