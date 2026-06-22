/**
 * useCompetitions — Hook para obtener las competiciones activas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Wrapper de React Query sobre `tournamentsApi.getCompetitions()` (que ya
 *    existía en el codebase para el selector de "crear torneo").
 * 2. Enriquece cada competition con el campo `format` (Fase 1 hardcodeado,
 *    Fase 2 desde DB).
 * 3. Filtra solo las competiciones activas (`active === true` o undefined).
 *
 * ============================================================================
 * FORMAT HARDCODED (Fase 1)
 * ============================================================================
 * El campo `format` no está en la DB todavía (se agrega en migration 0005
 * pero aún no consumido). Mapeamos en cliente:
 *   - competitionId === "1"  → "groups"  (Mundial 2026)
 *   - competitionId === "2"  → "league"  (Liga Profesional)
 *   - default                → "league"
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
 * Mapeo hardcodeado de competitionId → format (Fase 1).
 * En Fase 2 este mapa se elimina y se lee desde `competitions.format` en DB.
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

	// Enriquecer con format y filtrar activas
	const competitions = (data ?? [])
		.map(
			(c): Competition => ({
				...c,
				active: c.active ?? true,
				format: c.format ?? inferFormat(c.id),
			}),
		)
		.filter((c) => c.active === true);

	return {
		competitions,
		isLoading,
		error: error as Error | null,
	};
}
