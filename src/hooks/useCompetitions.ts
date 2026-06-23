/**
 * useCompetitions — Hook para obtener las competiciones activas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Wrapper de React Query sobre `tournamentsApi.getCompetitions()`.
 * 2. Enriquece cada competition con `format` (desde DB o fallback hardcodeado).
 * 3. **Sprint 5**: filtra amistosos (`is_friendly = true`) y competiciones sin
 *    formato definido. Solo ligas reales se exponen al usuario.
 *
 * ============================================================================
 * FILTRO DE AMISTOSOS (Sprint 5)
 * ============================================================================
 * Reglas (en orden):
 * 1. `c.is_friendly === true` → excluido (marcado explícitamente en DB).
 * 2. `c.format == null` → excluido (sin formato = no es liga, fallback defensivo).
 * 3. `c.active === false` → excluido (legacy: oculto por owner).
 * 4. Lo demás → incluido.
 *
 * El criterio de filtrado vive en DB (columna `is_friendly` poblada por
 * migration 0007 con backfill por nombre). Esto es más performante y
 * testeable que filtrar por heurística en cliente.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const { competitions, isLoading } = useCompetitions();
 * // competitions[0] = { id: "1", name: "Copa del Mundo 2026", format: "groups", ... }
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { tournamentsApi } from "../lib/api/tournaments";
import type { Competition, CompetitionFormat } from "../lib/types";

/**
 * Mapeo hardcodeado de competitionId → format (Fase 1, fallback).
 * En Fase 2+ este mapa se elimina y se lee siempre desde `competitions.format`.
 * Hoy sigue siendo útil para el fallback de LocalStorage (mockCompetitions)
 * y como safety net si la columna `format` no se populó correctamente.
 */
const FORMAT_BY_COMPETITION_ID: Record<string, CompetitionFormat> = {
	"1": "groups", // Copa del Mundo 2026
	"2": "league", // Liga Profesional Argentina
};

function inferFormat(competitionId: string): CompetitionFormat {
	return FORMAT_BY_COMPETITION_ID[competitionId] ?? "league";
}

export interface UseCompetitionsResult {
	competitions: Competition[];
	isLoading: boolean;
	error: Error | null;
}

export function useCompetitions(): UseCompetitionsResult {
	const { data, isLoading, error } = useQuery({
		queryKey: ["competitions"],
		queryFn: () => tournamentsApi.getCompetitions(),
		// Las competiciones cambian muy poco (semestralmente).
		// staleTime largo para evitar refetches innecesarios.
		staleTime: 1000 * 60 * 30, // 30 minutos
	});

	// Sprint 5: pipeline de enriquecimiento + filtrado en 3 pasos:
	//   1. Enriquecer con format (DB si está, sino inferFormat)
	//   2. Excluir amistosos explícitos (is_friendly = true)
	//   3. Excluir competiciones sin formato definido (defensivo)
	//   4. Excluir inactivas (legacy: active = false)
	const competitions = (data ?? [])
		.map(
			(c): Competition => ({
				...c,
				active: c.active ?? true,
				format: c.format ?? inferFormat(c.id),
			}),
		)
		.filter((c) => c.is_friendly !== true) // excluye amistosos marcados en DB
		.filter((c) => c.format != null) // excluye sin formato (defensivo)
		.filter((c) => c.active === true); // excluye inactivas (legacy)

	return {
		competitions,
		isLoading,
		error: error as Error | null,
	};
}
