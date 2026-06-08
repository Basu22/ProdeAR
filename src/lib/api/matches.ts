import { calculateScore } from "../scoring";
import { isSupabaseConfigured, supabase } from "../supabase";
import type {
	Match,
	MatchStatus,
	Prediction,
	Tournament,
	TournamentMember,
} from "../types";
import { INITIAL_MATCHES } from "./mockData";
import { simulator } from "./simulator";

export function getLocalMatches(): Match[] {
	const raw = localStorage.getItem("prodear_matches");
	if (!raw) {
		const initializedMatches = INITIAL_MATCHES.map((m) => {
			if (m.status === "live" && m.minute) {
				const adjustedKickOff = new Date(
					Date.now() - m.minute * 60000,
				).toISOString();
				return { ...m, kickOff: adjustedKickOff };
			}
			return m;
		});
		localStorage.setItem("prodear_matches", JSON.stringify(initializedMatches));
		return initializedMatches;
	}
	return JSON.parse(raw);
}

function mapDbStatus(dbStatus: string): MatchStatus {
	if (dbStatus === "scheduled") return "not_started";
	if (dbStatus === "live") return "live";
	if (dbStatus === "finished") return "finished";
	if (dbStatus === "cancelled") return "cancelled";
	return "postponed";
}

// biome-ignore lint/suspicious/noExplicitAny: database match type
function mapDbMatchToFrontend(m: any): Match {
	return {
		id: m.id,
		competitionId: String(m.competition_id),
		competitionName: m.competitions?.name || undefined,
		homeTeam: m.home_team,
		awayTeam: m.away_team,
		homeLogo: m.home_logo || null,
		awayLogo: m.away_logo || null,
		matchday: m.matchday,
		kickOff: m.kick_off,
		homeScore: m.home_score,
		awayScore: m.away_score,
		penaltyWinner: m.penalty_winner || null,
		stageName: m.stage_name,
		stageMultiplier: m.stage_multiplier,
		status: mapDbStatus(m.status),
		stadium: m.stadium || null,
		tvChannel: m.tv_channel || null,
		minute: m.elapsed ?? undefined,
		rawStatus: m.raw_status || undefined,
		events: m.events
			? typeof m.events === "string"
				? JSON.parse(m.events)
				: m.events
			: undefined,
		stats: m.stats
			? typeof m.stats === "string"
				? JSON.parse(m.stats)
				: m.stats
			: undefined,
		lineups: m.lineups
			? typeof m.lineups === "string"
				? JSON.parse(m.lineups)
				: m.lineups
			: undefined,
	};
}

function processFinishedMatches(oldMatches: Match[], newMatches: Match[]) {
	const finishedMatches = newMatches.filter(
		(newM) =>
			newM.status === "finished" &&
			oldMatches.find((oldM) => oldM.id === newM.id)?.status !== "finished",
	);

	if (finishedMatches.length === 0) return;

	const rawPredictions = localStorage.getItem("prodear_predictions");
	const predictions: Prediction[] = rawPredictions
		? JSON.parse(rawPredictions)
		: [];

	let updatedPredictionsCount = 0;

	// First, update prediction points
	for (const match of finishedMatches) {
		for (const pred of predictions) {
			if (pred.matchId === match.id) {
				const scoreResult = calculateScore(
					{
						predictedHome: pred.predictedHome,
						predictedAway: pred.predictedAway,
						predictedWinner: pred.predictedWinner,
					},
					match.homeScore ?? 0,
					match.awayScore ?? 0,
					match.penaltyWinner,
					match.stageMultiplier,
				);
				pred.pointsEarned = scoreResult.points;
				updatedPredictionsCount++;
			}
		}
	}

	if (updatedPredictionsCount > 0) {
		localStorage.setItem("prodear_predictions", JSON.stringify(predictions));
	}

	// Second, recalculate rankings
	const rawMembers = localStorage.getItem("prodear_tournament_members");
	const rawTournaments = localStorage.getItem("prodear_tournaments");
	if (!rawMembers) return;

	const members: TournamentMember[] = JSON.parse(rawMembers);
	const tournaments: Tournament[] = rawTournaments
		? JSON.parse(rawTournaments)
		: [];

	for (const tournament of tournaments) {
		const tournamentMembers = members.filter(
			(m) => m.tournamentId === tournament.id,
		);
		for (const member of tournamentMembers) {
			const userPreds = predictions.filter(
				(p) => p.userId === member.userId && p.tournamentId === tournament.id,
			);
			member.totalPoints = userPreds.reduce(
				(sum, p) => sum + (p.pointsEarned ?? 0),
				0,
			);
		}

		tournamentMembers.sort((a, b) => {
			if (b.totalPoints !== a.totalPoints) {
				return b.totalPoints - a.totalPoints;
			}

			const getExactCount = (m: TournamentMember) => {
				return predictions.filter((p) => {
					if (p.userId !== m.userId || p.tournamentId !== m.tournamentId)
						return false;
					const mId = p.matchId;
					const match = newMatches.find((nm) => nm.id === mId);
					const mult = match?.stageMultiplier ?? 1;
					return (p.pointsEarned ?? 0) >= 10 * mult;
				}).length;
			};
			const exactA = getExactCount(a);
			const exactB = getExactCount(b);
			if (exactB !== exactA) {
				return exactB - exactA;
			}

			const getDiffCount = (m: TournamentMember) => {
				return predictions.filter((p) => {
					if (p.userId !== m.userId || p.tournamentId !== m.tournamentId)
						return false;
					const mId = p.matchId;
					const match = newMatches.find((nm) => nm.id === mId);
					const mult = match?.stageMultiplier ?? 1;
					return (p.pointsEarned ?? 0) === 6 * mult;
				}).length;
			};
			const diffA = getDiffCount(a);
			const diffB = getDiffCount(b);
			if (diffB !== diffA) {
				return diffB - diffA;
			}

			const timeA = a.id.startsWith("tm-") ? Number(a.id.slice(3)) : 0;
			const timeB = b.id.startsWith("tm-") ? Number(b.id.slice(3)) : 0;
			if (timeA !== timeB) {
				return timeA - timeB;
			}
			return a.id.localeCompare(b.id);
		});

		tournamentMembers.forEach((m, idx) => {
			m.rank = idx + 1;
		});
	}

	localStorage.setItem("prodear_tournament_members", JSON.stringify(members));

	// Third, dispatch finished match events with updated rankings for the user
	if (typeof window !== "undefined") {
		const currentUser = JSON.parse(
			localStorage.getItem("prodear_user") || "null",
		);

		if (currentUser) {
			for (const match of finishedMatches) {
				let pointsEarned = 0;
				const userPred = predictions.find(
					(p) => p.matchId === match.id && p.userId === currentUser.id,
				);
				if (userPred) {
					const scoreResult = calculateScore(
						{
							predictedHome: userPred.predictedHome,
							predictedAway: userPred.predictedAway,
							predictedWinner: userPred.predictedWinner,
						},
						match.homeScore ?? 0,
						match.awayScore ?? 0,
						match.penaltyWinner,
						match.stageMultiplier,
					);
					pointsEarned = scoreResult.points;
				}

				const userRanks: { tournamentName: string; rank: number }[] = [];
				for (const t of tournaments) {
					const member = members.find(
						(m) => m.tournamentId === t.id && m.userId === currentUser.id,
					);
					if (member) {
						userRanks.push({
							tournamentName: t.name,
							rank: member.rank || 1,
						});
					}
				}

				window.dispatchEvent(
					new CustomEvent("prodear-local-finished", {
						detail: {
							matchId: match.id,
							homeTeam: match.homeTeam,
							awayTeam: match.awayTeam,
							homeScore: match.homeScore,
							awayScore: match.awayScore,
							pointsEarned,
							userRanks,
						},
					}),
				);
			}
		}
	}
}

export const matchesApi = {
	async getMatches(competitionId?: string): Promise<Match[]> {
		await new Promise((r) => setTimeout(r, 200));

		const isYouthSelection = (teamName: string): boolean => {
			const lower = teamName.toLowerCase();
			return (
				/\bu[- ]?\d{2}\b/.test(lower) ||
				/\bsub[- ]?\d{2}\b/.test(lower) ||
				/\bunder[- ]?\d{2}\b/.test(lower) ||
				/\bwomen\b/.test(lower) ||
				/\bfemenino\b/.test(lower) ||
				/\bfemenil\b/.test(lower) ||
				/\bteam w\b/.test(lower) ||
				/\bolympic\b/.test(lower) ||
				/\bolímpica\b/.test(lower)
			);
		};

		if (isSupabaseConfigured) {
			let query = supabase.from("matches").select("*, competitions(name)");

			if (competitionId) {
				const compIdNum = Number.parseInt(competitionId, 10);
				if (!Number.isNaN(compIdNum)) {
					query = query.eq("competition_id", compIdNum);
				} else {
					query = query.eq("competition_id", competitionId);
				}
			} else {
				// Ventana de ±14 días para no traer partidos históricos sólo si no se busca una competencia específica
				const now = new Date();
				const from = new Date(now);
				from.setDate(from.getDate() - 14);
				const to = new Date(now);
				to.setDate(to.getDate() + 14);
				query = query
					.gte("kick_off", from.toISOString())
					.lte("kick_off", to.toISOString());
			}

			const { data, error } = await query.order("kick_off", {
				ascending: true,
			});
			if (error) throw error;

			return data
				.map(mapDbMatchToFrontend)
				.filter(
					(m) => !isYouthSelection(m.homeTeam) && !isYouthSelection(m.awayTeam),
				);
		}

		const oldMatches = getLocalMatches();
		let newMatches = oldMatches;
		if (oldMatches.some((m) => m.status === "live")) {
			simulator.setMatches(oldMatches);
			simulator.tick();
			newMatches = simulator.getMatches();
			processFinishedMatches(oldMatches, newMatches);
			localStorage.setItem("prodear_matches", JSON.stringify(newMatches));
		}

		const filteredMatches = newMatches.filter(
			(m) => !isYouthSelection(m.homeTeam) && !isYouthSelection(m.awayTeam),
		);
		const stageFiltered = competitionId
			? filteredMatches.filter((m) => m.competitionId === competitionId)
			: filteredMatches;

		// Ordenamiento por fecha en el fallback local
		return stageFiltered.sort(
			(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
		);
	},

	async getMatchById(id: string): Promise<Match | undefined> {
		await new Promise((r) => setTimeout(r, 100));

		if (isSupabaseConfigured) {
			const { data, error } = await supabase
				.from("matches")
				.select("*, competitions(name)")
				.eq("id", id)
				.maybeSingle();
			if (error) throw error;
			if (!data) return undefined;
			return mapDbMatchToFrontend(data);
		}

		return getLocalMatches().find((m) => m.id === id);
	},

	async getLiveMatches(): Promise<Match[]> {
		await new Promise((r) => setTimeout(r, 150));

		if (isSupabaseConfigured) {
			const { data, error } = await supabase
				.from("matches")
				.select("*, competitions(name)")
				.eq("status", "live");
			if (error) throw error;
			return data.map(mapDbMatchToFrontend);
		}

		const oldMatches = getLocalMatches();
		simulator.setMatches(oldMatches);
		simulator.tick();
		const newMatches = simulator.getMatches();

		processFinishedMatches(oldMatches, newMatches);

		localStorage.setItem("prodear_matches", JSON.stringify(newMatches));

		return newMatches.filter((m) => m.status === "live");
	},

	async getUpcomingMatches(): Promise<Match[]> {
		await new Promise((r) => setTimeout(r, 150));

		if (isSupabaseConfigured) {
			const { data, error } = await supabase
				.from("matches")
				.select("*, competitions(name)")
				.eq("status", "scheduled");
			if (error) throw error;
			return data.map(mapDbMatchToFrontend);
		}

		return getLocalMatches().filter((m) => m.status === "not_started");
	},
};
