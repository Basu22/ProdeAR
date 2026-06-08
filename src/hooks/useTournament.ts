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

export function useCompetitions() {
	return useQuery({
		queryKey: ["competitions"],
		queryFn: tournamentsApi.getCompetitions,
	});
}

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
		},
	});
}
