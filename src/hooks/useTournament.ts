import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tournamentsApi } from "../lib/api/tournaments";

export function useTournaments() {
	return useQuery({
		queryKey: ["tournaments"],
		queryFn: tournamentsApi.getTournaments,
	});
}

export function useTournament(id: string) {
	return useQuery({
		queryKey: ["tournament", id],
		queryFn: () => tournamentsApi.getTournamentById(id),
	});
}

export function useTournamentMembers(tournamentId: string) {
	return useQuery({
		queryKey: ["tournament-members", tournamentId],
		queryFn: () => tournamentsApi.getMembers(tournamentId),
	});
}

// Nota: `useCompetitions` (con filtrado de amistosos) vive en
// `./useCompetitions.ts`. NO exportar un duplicado acá — el de `useTournament.ts`
// no filtraba y permitía que el dropdown de "Crear Torneo" mostrara
// competiciones amistosas, contradiciendo la policy de DB (migration 0010).

export function useUpdateTournament(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ name }: { name: string }) =>
			tournamentsApi.updateTournament(id, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tournaments"] });
			queryClient.invalidateQueries({ queryKey: ["tournament", id] });
		},
	});
}

export function useDeleteTournament() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => tournamentsApi.deleteTournament(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tournaments"] });
			queryClient.invalidateQueries({ queryKey: ["all-predictions"] });
		},
	});
}

export function useRemoveMember(tournamentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) =>
			tournamentsApi.removeMember(tournamentId, userId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["tournament-members", tournamentId],
			});
			queryClient.invalidateQueries({
				queryKey: ["predictions", tournamentId],
			});
			queryClient.invalidateQueries({
				queryKey: ["all-predictions"],
			});
		},
	});
}

export function useLeaveTournament() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (tournamentId: string) =>
			tournamentsApi.leaveTournament(tournamentId),
		onSuccess: (_, tournamentId) => {
			queryClient.invalidateQueries({ queryKey: ["tournaments"] });
			queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
			queryClient.invalidateQueries({ queryKey: ["all-predictions"] });
		},
	});
}
