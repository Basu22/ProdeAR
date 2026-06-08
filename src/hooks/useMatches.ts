import { useQuery } from "@tanstack/react-query";
import { matchesApi } from "../lib/api/matches";

export function useMatches(competitionId?: string) {
	return useQuery({
		queryKey: ["matches", competitionId],
		queryFn: () => matchesApi.getMatches(competitionId),
		refetchInterval: (query) => {
			const matches = query.state.data;
			const hasLive = matches?.some((m) => m.status === "live");
			return hasLive ? 30_000 : false;
		},
	});
}

export function useMatch(id: string) {
	return useQuery({
		queryKey: ["match", id],
		queryFn: () => matchesApi.getMatchById(id),
	});
}

export function useLiveMatches() {
	return useQuery({
		queryKey: ["matches", "live"],
		queryFn: matchesApi.getLiveMatches,
		refetchInterval: 15_000,
	});
}

export function useUpcomingMatches() {
	return useQuery({
		queryKey: ["matches", "upcoming"],
		queryFn: matchesApi.getUpcomingMatches,
	});
}
