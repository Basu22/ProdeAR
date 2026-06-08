import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { TournamentMember } from "../lib/types";

export interface GlobalRankingUser {
	userId: string;
	displayName: string;
	totalPoints: number;
	rank: number;
}

export function useGlobalRankings() {
	return useQuery<GlobalRankingUser[]>({
		queryKey: ["global-rankings"],
		queryFn: async () => {
			if (isSupabaseConfigured) {
				const { data, error } = await supabase
					.from("tournament_members")
					.select("user_id, total_points, users(display_name)");

				if (error) throw error;

				interface DBRow {
					user_id: string;
					total_points: number;
					users: { display_name: string } | null;
				}

				const userPointsMap = new Map<
					string,
					{ displayName: string; totalPoints: number }
				>();

				for (const row of (data as unknown as DBRow[]) || []) {
					const userId = row.user_id;
					const points = row.total_points;
					const name = row.users?.display_name || userId;

					const existing = userPointsMap.get(userId);
					if (existing) {
						existing.totalPoints += points;
					} else {
						userPointsMap.set(userId, {
							displayName: name,
							totalPoints: points,
						});
					}
				}

				const sorted = Array.from(userPointsMap.entries())
					.map(([userId, val]) => ({
						userId,
						displayName: val.displayName,
						totalPoints: val.totalPoints,
					}))
					.sort((a, b) => b.totalPoints - a.totalPoints);

				return sorted.map((item, index) => ({
					...item,
					rank: index + 1,
				}));
			} else {
				// LocalStorage Fallback
				const rawMembers = localStorage.getItem("prodear_tournament_members");
				const members: TournamentMember[] = rawMembers
					? JSON.parse(rawMembers)
					: [];

				const userPointsMap = new Map<
					string,
					{ displayName: string; totalPoints: number }
				>();

				for (const m of members) {
					const userId = m.userId;
					const points = m.totalPoints;
					const name = m.displayName || userId;

					const existing = userPointsMap.get(userId);
					if (existing) {
						existing.totalPoints += points;
						if (m.displayName && m.displayName !== userId) {
							existing.displayName = m.displayName;
						}
					} else {
						userPointsMap.set(userId, {
							displayName: name,
							totalPoints: points,
						});
					}
				}

				const sorted = Array.from(userPointsMap.entries())
					.map(([userId, val]) => ({
						userId,
						displayName: val.displayName,
						totalPoints: val.totalPoints,
					}))
					.sort((a, b) => b.totalPoints - a.totalPoints);

				return sorted.map((item, index) => ({
					...item,
					rank: index + 1,
				}));
			}
		},
	});
}
