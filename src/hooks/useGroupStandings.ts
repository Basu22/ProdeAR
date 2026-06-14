/**
 * Hook `useGroupStandings` — calcula las posiciones de los grupos del Mundial
 * a partir de los matches de useMatches.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Calcular `groupTables` (memoizado) usando `getGroupTables` de la lib pura.
 * 2. Detectar partidos en vivo en cada grupo (para el badge "EN VIVO" y el
 *    contador del pill "GRUPOS").
 * 3. Trackear cambios de posición de cada equipo entre renders (para animar
 *    filas que suben/bajan en la tabla cuando hay un gol).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const { data: matches } = useMatches(competitionId);
 * const { groupTables, liveGroupsCount, positionChanges } =
 *   useGroupStandings(matches);
 * ```
 *
 * ============================================================================
 * NOTAS
 * ============================================================================
 * - El hook acepta `matches | undefined` para no romper si useMatches todavía
 *   está cargando.
 * - `positionChanges` se calcula comparando las posiciones actuales con las
 *   del render anterior (almacenado en un ref). En el primer render, todas
 *   las posiciones son `'same'`.
 * - El ref usa un Map<string, number> donde la key es `${groupLetter}:${teamName}`
 *   y el value es la posición (1-4).
 */

import { useEffect, useMemo, useRef } from "react";
import {
	getGroupTables,
	type GroupTable,
	type WorldCupMatch,
} from "../lib/worldCupGroups";
import type { Match } from "../lib/types";

export type PositionChange = "up" | "down" | "same";

export interface UseGroupStandingsResult {
	/** Tablas de los 12 grupos, ordenadas alfabéticamente A→L */
	groupTables: GroupTable[];
	/** Set de letras de grupos que tienen al menos un partido en vivo */
	liveGroups: Set<string>;
	/** Cantidad total de grupos con partidos en vivo (para el pill counter) */
	liveGroupsCount: number;
	/** Cantidad total de partidos en vivo en todos los grupos */
	liveMatchesCount: number;
	/**
	 * Map de `${groupLetter}:${teamName}` → cambio de posición desde el último render.
	 * La UI usa esto para aplicar `animate-rank-up` / `animate-rank-down` en la fila.
	 */
	positionChanges: Map<string, PositionChange>;
}

/**
 * Genera la key estable para el Map de positionChanges.
 * Formato: `${groupLetter}:${teamName}` (ej. "A:México", "J:Argentina")
 */
function teamKey(groupLetter: string, teamName: string): string {
	return `${groupLetter}:${teamName}`;
}

export function useGroupStandings(
	matches: Match[] | undefined,
): UseGroupStandingsResult {
	// Ref que guarda las posiciones del render anterior: teamKey → rank (1-4)
	const previousRanksRef = useRef<Map<string, number>>(new Map());
	// Flag para saber si es el primer render (no animar nada)
	const isFirstRenderRef = useRef(true);
	/**
	 * Flag para saber si ALGUNA VEZ recibimos datos con partidos reales.
	 * Esto resuelve el caso "primera vez que llegan datos": no queremos animar
	 * la transición del estado vacío (todos en 0pts) al estado con datos, porque
	 * el usuario no vio el estado previo. La animación debe ser solo entre
	 * estados con datos visibles.
	 */
	const hasEverHadDataRef = useRef(false);

	// Calcular tablas (memoizado)
	const groupTables = useMemo<GroupTable[]>(() => {
		// Cast a WorldCupMatch[] — los nuevos campos opcionales están en Match ya,
		// pero getGroupTables acepta el tipo extendido para server-side canonical.
		return getGroupTables((matches ?? []) as WorldCupMatch[]);
	}, [matches]);

	// Calcular liveGroups y liveMatchesCount (memoizado)
	const { liveGroups, liveMatchesCount } = useMemo(() => {
		const liveGroupsSet = new Set<string>();
		let count = 0;
		for (const group of groupTables) {
			if (group.liveMatches.length > 0) {
				liveGroupsSet.add(group.groupLetter);
				count += group.liveMatches.length;
			}
		}
		return { liveGroups: liveGroupsSet, liveMatchesCount: count };
	}, [groupTables]);

	// Calcular positionChanges (NO memoizado — debe correr en cada render para
	// detectar el diff vs el render anterior)
	const positionChanges = useMemo<Map<string, PositionChange>>(() => {
		const changes = new Map<string, PositionChange>();

		// Construir mapa de ranks actuales
		const currentRanks = new Map<string, number>();
		for (const group of groupTables) {
			group.standings.forEach((standing, index) => {
				const rank = index + 1;
				const key = teamKey(group.groupLetter, standing.teamName);
				currentRanks.set(key, rank);
			});
		}

		// Determinar si debemos animar:
		// - Primer render del hook: NO animar (mount)
		// - Nunca recibimos datos con partidos: NO animar (estado vacío → vacío)
		// - Primera vez que llegan datos reales: NO animar (no hay estado previo visible)
		// - Renders subsiguientes con datos: SÍ animar (diff vs render anterior)
		const shouldAnimate =
			!isFirstRenderRef.current && hasEverHadDataRef.current;

		if (!shouldAnimate) {
			// Primer render, sin datos previos, o primera carga de datos: 'same' para todos
			previousRanksRef.current = currentRanks;
			isFirstRenderRef.current = false;
			// Si tenemos datos, marcar el flag para futuros renders
			if (matches && matches.length > 0) {
				hasEverHadDataRef.current = true;
			}
			for (const key of currentRanks.keys()) {
				changes.set(key, "same");
			}
			return changes;
		}

		// Renders con datos previos: comparar con el ref
		for (const [key, currentRank] of currentRanks) {
			const previousRank = previousRanksRef.current.get(key);
			if (previousRank === undefined) {
				// Equipo nuevo (no debería pasar, pero defensivo)
				changes.set(key, "same");
			} else if (currentRank < previousRank) {
				changes.set(key, "up"); // rank menor = mejor posición
			} else if (currentRank > previousRank) {
				changes.set(key, "down");
			} else {
				changes.set(key, "same");
			}
		}

		// Actualizar ref para el próximo render
		previousRanksRef.current = currentRanks;
		return changes;
	}, [groupTables, matches]);

	// Resetear el first-render flag si `matches` pasa de undefined a definido
	// (caso edge: el hook se monta antes de que lleguen los datos)
	useEffect(() => {
		if (matches && isFirstRenderRef.current) {
			// El useMemo ya maneja esto, pero por seguridad
		}
	}, [matches]);

	return {
		groupTables,
		liveGroups,
		liveGroupsCount: liveGroups.size,
		liveMatchesCount,
		positionChanges,
	};
}
