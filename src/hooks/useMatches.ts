import { useQuery } from "@tanstack/react-query";
import { matchesApi } from "../lib/api/matches";

/**
 * Hook principal para obtener los partidos de un torneo.
 *
 * Polling adaptativo: solo refetchea cada 15s si hay al menos un partido
 * `live` en el resultado. Cuando no hay ninguno, el polling se desactiva
 * automáticamente (no se desperdician requests a Supabase).
 *
 * El staleTime de 5min configurado en `App.tsx` evita refetches extra al
 * cambiar de tab o volver del background — el polling de 15s manda.
 */
export function useMatches(competitionId?: string) {
	return useQuery({
		queryKey: ["matches", competitionId],
		queryFn: () => matchesApi.getMatches(competitionId),
		refetchInterval: (query) => {
			const hasLive = query.state.data?.some((m) => m.status === "live");
			return hasLive ? 15_000 : false;
		},
	});
}
