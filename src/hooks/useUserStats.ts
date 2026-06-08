import { useQuery } from "@tanstack/react-query";
import { getLocalMatches } from "../lib/api/matches";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Prediction } from "../lib/types";

export interface UserStats {
	exactHits: number;
	partialHits: number;
	effectiveness: number;
	currentStreak: number;
	maxStreak: number;
}

export function useUserStats(userId: string | undefined) {
	return useQuery<UserStats>({
		queryKey: ["user-stats", userId],
		enabled: !!userId,
		queryFn: async () => {
			if (!userId) {
				return {
					exactHits: 0,
					partialHits: 0,
					effectiveness: 0,
					currentStreak: 0,
					maxStreak: 0,
				};
			}

			interface ParsedPrediction {
				matchId: string;
				pointsEarned: number;
				predictedHome: number;
				predictedAway: number;
				actualHome: number;
				actualAway: number;
				matchStatus: string;
				kickOff: string;
			}

			let userPredictions: ParsedPrediction[] = [];

			if (isSupabaseConfigured) {
				const { data, error } = await supabase
					.from("predictions")
					.select(`
						id,
						points_earned,
						predicted_home,
						predicted_away,
						match_id,
						matches (
							status,
							kick_off,
							home_score,
							away_score
						)
					`)
					.eq("user_id", userId);

				if (error) throw error;

				interface DBRow {
					id: string;
					points_earned: number | null;
					predicted_home: number;
					predicted_away: number;
					match_id: string;
					matches: {
						status: string;
						kick_off: string;
						home_score: number | null;
						away_score: number | null;
					} | null;
				}

				userPredictions = (data as unknown as DBRow[])
					.filter((row) => row.matches !== null)
					.map((row) => ({
						matchId: row.match_id,
						pointsEarned: row.points_earned ?? 0,
						predictedHome: row.predicted_home,
						predictedAway: row.predicted_away,
						actualHome: row.matches?.home_score ?? 0,
						actualAway: row.matches?.away_score ?? 0,
						matchStatus: row.matches?.status || "scheduled",
						kickOff: row.matches?.kick_off || "",
					}));
			} else {
				// LocalStorage Fallback
				const rawPredictions = localStorage.getItem("prodear_predictions");
				const predictions: Prediction[] = rawPredictions
					? JSON.parse(rawPredictions)
					: [];
				const localMatches = getLocalMatches();

				userPredictions = predictions
					.filter((p) => p.userId === userId)
					.map((p) => {
						const match = localMatches.find((m) => m.id === p.matchId);
						return {
							matchId: p.matchId,
							pointsEarned: p.pointsEarned ?? 0,
							predictedHome: p.predictedHome,
							predictedAway: p.predictedAway,
							actualHome: match?.homeScore ?? 0,
							actualAway: match?.awayScore ?? 0,
							matchStatus: match?.status || "not_started",
							kickOff: match?.kickOff || "",
						};
					});
			}

			// Filter for completed/finished matches
			const finishedPredictions = userPredictions.filter(
				(p) => p.matchStatus === "finished",
			);

			// Count hits
			const exactHits = finishedPredictions.filter(
				(p) =>
					p.predictedHome === p.actualHome && p.predictedAway === p.actualAway,
			).length;

			const partialHits = finishedPredictions.filter((p) => {
				const isExact =
					p.predictedHome === p.actualHome && p.predictedAway === p.actualAway;
				return p.pointsEarned > 0 && !isExact;
			}).length;

			const totalPredicted = finishedPredictions.length;
			const totalHits = finishedPredictions.filter(
				(p) => p.pointsEarned > 0,
			).length;
			const effectiveness =
				totalPredicted > 0 ? Math.round((totalHits / totalPredicted) * 100) : 0;

			// Group by matchId to avoid double counting same match across different tournaments in streak
			const matchMap = new Map<
				string,
				{ kickOff: string; pointsEarned: number }
			>();
			for (const p of finishedPredictions) {
				const existing = matchMap.get(p.matchId);
				const points = p.pointsEarned;
				if (existing) {
					if (points > existing.pointsEarned) {
						existing.pointsEarned = points;
					}
				} else {
					matchMap.set(p.matchId, {
						kickOff: p.kickOff,
						pointsEarned: points,
					});
				}
			}

			const sortedMatches = Array.from(matchMap.values()).sort(
				(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
			);

			let currentStreak = 0;
			let maxStreak = 0;
			let tempStreak = 0;

			for (const m of sortedMatches) {
				if (m.pointsEarned > 0) {
					tempStreak++;
					if (tempStreak > maxStreak) {
						maxStreak = tempStreak;
					}
				} else {
					tempStreak = 0;
				}
			}
			currentStreak = tempStreak;

			return {
				exactHits,
				partialHits,
				effectiveness,
				currentStreak,
				maxStreak,
			};
		},
	});
}
