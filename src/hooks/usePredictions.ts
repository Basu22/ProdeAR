import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tournamentsApi } from "../lib/api/tournaments";

export function usePredictions(tournamentId: string) {
	return useQuery({
		queryKey: ["predictions", tournamentId],
		queryFn: () => tournamentsApi.getPredictions(tournamentId),
	});
}

export function useAllPredictions() {
	return useQuery({
		queryKey: ["all-predictions"],
		queryFn: () => tournamentsApi.getAllMyPredictions(),
	});
}

export function useSavePrediction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			matchId,
			tournamentId,
			predictedHome,
			predictedAway,
			predictedWinner,
		}: {
			matchId: string;
			tournamentId: string;
			predictedHome: number;
			predictedAway: number;
			predictedWinner?: "home" | "away" | null;
		}) =>
			tournamentsApi.savePrediction(
				matchId,
				tournamentId,
				predictedHome,
				predictedAway,
				predictedWinner,
			),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["predictions", variables.tournamentId],
			});
			queryClient.invalidateQueries({
				queryKey: ["all-predictions"],
			});
		},
	});
}
