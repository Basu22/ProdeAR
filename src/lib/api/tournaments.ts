import { isSupabaseConfigured, supabase } from "../supabase";
import type {
	Competition,
	Prediction,
	Tournament,
	TournamentMember,
} from "../types";
import { authApi } from "./auth";
import { getLocalMatches } from "./matches";

const mockCompetitions: Competition[] = [
	{
		id: "comp-1",
		name: "Copa del Mundo 2026",
		country: "Internacional",
		logoUrl: "",
		season: "2026",
	},
	{
		id: "comp-2",
		name: "Liga Profesional Argentina",
		country: "Argentina",
		logoUrl: "",
		season: "2026",
	},
];

const mockTournaments: Tournament[] = [
	{
		id: "tournament-1",
		ownerId: "user-1",
		competitionId: "comp-1",
		name: "Prode de la Oficina",
		code: "AR-9X2F",
		scoringConfig: {
			exactScore: 10,
			correctWinner: 3,
			correctDraw: 3,
			goalDifference: 6,
			bonusStreak3: 0,
			bonusStreak5: 0,
		},
		status: "active",
	},
];

const mockMembers: TournamentMember[] = [
	{
		id: "tm-1",
		tournamentId: "tournament-1",
		userId: "user-1",
		displayName: "Jugador Demo",
		totalPoints: 42,
		rank: 1,
		role: "admin",
	},
	{
		id: "tm-2",
		tournamentId: "tournament-1",
		userId: "user-2",
		displayName: "Juan Pérez",
		totalPoints: 38,
		rank: 2,
		role: "player",
	},
	{
		id: "tm-3",
		tournamentId: "tournament-1",
		userId: "user-3",
		displayName: "Martín Palermo",
		totalPoints: 35,
		rank: 3,
		role: "player",
	},
];

const mockPredictions: Prediction[] = [
	{
		id: "pred-1",
		matchId: "match-3",
		userId: "user-1",
		tournamentId: "tournament-1",
		predictedHome: 2,
		predictedAway: 0,
		predictedWinner: null,
		pointsEarned: 0,
	},
	{
		id: "pred-2",
		matchId: "match-6",
		userId: "user-1",
		tournamentId: "tournament-1",
		predictedHome: 2,
		predictedAway: 0,
		predictedWinner: null,
		pointsEarned: 2,
	},
];

const defaultScoringConfig = {
	exactScore: 10,
	correctWinner: 3,
	correctDraw: 3,
	goalDifference: 6,
	bonusStreak3: 0,
	bonusStreak5: 0,
};

const TOURNAMENTS_STORAGE_KEY = "prodear_tournaments";
const MEMBERS_STORAGE_KEY = "prodear_tournament_members";
const COMPETITIONS_STORAGE_KEY = "prodear_competitions";

function getLocalTournaments(): Tournament[] {
	const raw = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
	if (!raw) {
		localStorage.setItem(
			TOURNAMENTS_STORAGE_KEY,
			JSON.stringify(mockTournaments),
		);
		return mockTournaments;
	}
	return JSON.parse(raw);
}

function saveLocalTournaments(tournaments: Tournament[]) {
	localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
}

function getLocalMembers(): TournamentMember[] {
	const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
	if (!raw) {
		localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(mockMembers));
		return mockMembers;
	}
	return JSON.parse(raw);
}

function saveLocalMembers(members: TournamentMember[]) {
	localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
}

function getLocalCompetitions(): Competition[] {
	const raw = localStorage.getItem(COMPETITIONS_STORAGE_KEY);
	if (!raw) {
		localStorage.setItem(
			COMPETITIONS_STORAGE_KEY,
			JSON.stringify(mockCompetitions),
		);
		return mockCompetitions;
	}
	return JSON.parse(raw);
}

function generateCode(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let suffix = "";
	for (let i = 0; i < 4; i++) {
		suffix += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return `AR-${suffix}`;
}

export const tournamentsApi = {
	async getCompetitions(): Promise<Competition[]> {
		await new Promise((r) => setTimeout(r, 150));
		if (isSupabaseConfigured) {
			const { data, error } = await supabase.from("competitions").select("*");
			if (error) throw error;
			return data.map((c) => ({
				id: String(c.id),
				name: c.name,
				country: c.country,
				logoUrl: c.logo_url || "",
				season: c.season,
			}));
		}
		return getLocalCompetitions();
	},

	async getTournaments(): Promise<Tournament[]> {
		await new Promise((r) => setTimeout(r, 150));
		if (isSupabaseConfigured) {
			const { data, error } = await supabase.from("tournaments").select("*");
			if (error) throw error;
			return data.map((t) => ({
				id: t.id,
				ownerId: t.owner_id,
				competitionId: String(t.competition_id),
				name: t.name,
				code: t.code,
				scoringConfig: defaultScoringConfig,
				status: t.status,
			}));
		}
		const currentUser = authApi.getPersistedUser();
		const tournaments = getLocalTournaments();
		if (!currentUser) return [];
		const members = getLocalMembers();
		return tournaments.filter(
			(t) =>
				t.ownerId === currentUser.id ||
				members.some(
					(m) => m.tournamentId === t.id && m.userId === currentUser.id,
				),
		);
	},

	async getTournamentById(id: string): Promise<Tournament | undefined> {
		await new Promise((r) => setTimeout(r, 100));
		if (isSupabaseConfigured) {
			const { data, error } = await supabase
				.from("tournaments")
				.select("*")
				.eq("id", id)
				.maybeSingle();
			if (error) throw error;
			if (!data) return undefined;
			return {
				id: data.id,
				ownerId: data.owner_id,
				competitionId: String(data.competition_id),
				name: data.name,
				code: data.code,
				scoringConfig: defaultScoringConfig,
				status: data.status,
			};
		}
		const tournaments = getLocalTournaments();
		return tournaments.find((t) => t.id === id);
	},

	async getMembers(tournamentId: string): Promise<TournamentMember[]> {
		await new Promise((r) => setTimeout(r, 100));
		if (isSupabaseConfigured) {
			const { data, error } = await supabase
				.from("tournament_members")
				.select("*, users(display_name)")
				.eq("tournament_id", tournamentId);
			if (error) throw error;
			interface DBTournamentMember {
				id: string;
				tournament_id: string;
				user_id: string;
				total_points: number;
				rank: number;
				role: "admin" | "player";
				users: { display_name: string } | null;
			}
			return (data as unknown as DBTournamentMember[]).map((m) => ({
				id: m.id,
				tournamentId: m.tournament_id,
				userId: m.user_id,
				displayName: m.users?.display_name || m.user_id,
				totalPoints: m.total_points,
				rank: m.rank,
				role: m.role,
			}));
		}
		return getLocalMembers().filter((m) => m.tournamentId === tournamentId);
	},

	async createTournament(
		name: string,
		competitionId: string,
	): Promise<Tournament> {
		await new Promise((r) => setTimeout(r, 200));
		if (isSupabaseConfigured) {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Usuario no autenticado");

			let code = "";
			let isUnique = false;
			let attempts = 0;
			while (!isUnique && attempts < 10) {
				code = generateCode();
				const { data, error } = await supabase
					.from("tournaments")
					.select("id")
					.eq("code", code)
					.maybeSingle();
				if (!error && !data) {
					isUnique = true;
				}
				attempts++;
			}

			const { data: tournament, error: insertError } = await supabase
				.from("tournaments")
				.insert({
					owner_id: user.id,
					competition_id: Number(competitionId),
					name,
					code,
					invite_link: `${window.location.origin}/join?code=${code}`,
					status: "active",
				})
				.select()
				.single();
			if (insertError) throw insertError;

			const { error: memberError } = await supabase
				.from("tournament_members")
				.insert({
					tournament_id: tournament.id,
					user_id: user.id,
					role: "admin",
					total_points: 0,
					rank: 1,
				});
			if (memberError) throw memberError;

			return {
				id: tournament.id,
				ownerId: tournament.owner_id,
				competitionId: String(tournament.competition_id),
				name: tournament.name,
				code: tournament.code,
				scoringConfig: defaultScoringConfig,
				status: tournament.status,
			};
		}

		// Fallback LocalStorage
		const currentUser = authApi.getPersistedUser() || {
			id: "user-1",
			email: "demo@prodear.app",
			displayName: "Jugador Demo",
			avatarUrl: null,
		};

		const code = generateCode();
		const newTournament: Tournament = {
			id: `tournament-${Date.now()}`,
			ownerId: currentUser.id,
			competitionId,
			name,
			code,
			scoringConfig: defaultScoringConfig,
			status: "active",
		};

		const tournaments = getLocalTournaments();
		tournaments.push(newTournament);
		saveLocalTournaments(tournaments);

		const newMember: TournamentMember = {
			id: `tm-${Date.now()}`,
			tournamentId: newTournament.id,
			userId: currentUser.id,
			displayName: currentUser.displayName,
			totalPoints: 0,
			rank: 1,
			role: "admin",
		};
		const members = getLocalMembers();
		members.push(newMember);
		saveLocalMembers(members);

		return newTournament;
	},

	async joinTournament(code: string): Promise<Tournament> {
		await new Promise((r) => setTimeout(r, 200));
		const cleanCode = code.trim().toUpperCase();

		if (isSupabaseConfigured) {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Usuario no autenticado");

			const { data: tournament, error: tournamentError } = await supabase
				.from("tournaments")
				.select("*")
				.eq("code", cleanCode)
				.maybeSingle();
			if (tournamentError) throw tournamentError;
			if (!tournament) throw new Error("Código de invitación inválido");

			const { data: existingMember, error: checkError } = await supabase
				.from("tournament_members")
				.select("id")
				.eq("tournament_id", tournament.id)
				.eq("user_id", user.id)
				.maybeSingle();
			if (checkError) throw checkError;

			if (existingMember) {
				return {
					id: tournament.id,
					ownerId: tournament.owner_id,
					competitionId: String(tournament.competition_id),
					name: tournament.name,
					code: tournament.code,
					scoringConfig: defaultScoringConfig,
					status: tournament.status,
				};
			}

			const { error: joinError } = await supabase
				.from("tournament_members")
				.insert({
					tournament_id: tournament.id,
					user_id: user.id,
					role: "player",
					total_points: 0,
					rank: 1,
				});

			if (joinError) {
				if (
					joinError.message.includes("50") ||
					joinError.message.includes("límite")
				) {
					throw new Error(
						"El torneo ha alcanzado el límite máximo de 50 participantes.",
					);
				}
				throw joinError;
			}

			return {
				id: tournament.id,
				ownerId: tournament.owner_id,
				competitionId: String(tournament.competition_id),
				name: tournament.name,
				code: tournament.code,
				scoringConfig: defaultScoringConfig,
				status: tournament.status,
			};
		}

		// Fallback LocalStorage
		const currentUser = authApi.getPersistedUser() || {
			id: "user-1",
			email: "demo@prodear.app",
			displayName: "Jugador Demo",
			avatarUrl: null,
		};

		const tournaments = getLocalTournaments();
		const tournament = tournaments.find(
			(t) => t.code.toUpperCase() === cleanCode,
		);
		if (!tournament) throw new Error("Código de invitación inválido");

		const members = getLocalMembers();
		const existingMember = members.find(
			(m) => m.tournamentId === tournament.id && m.userId === currentUser.id,
		);
		if (existingMember) {
			return tournament;
		}

		const currentMembersCount = members.filter(
			(m) => m.tournamentId === tournament.id,
		).length;
		if (currentMembersCount >= 50) {
			throw new Error(
				"El torneo ha alcanzado el límite máximo de 50 participantes.",
			);
		}

		const newMember: TournamentMember = {
			id: `tm-${Date.now()}`,
			tournamentId: tournament.id,
			userId: currentUser.id,
			displayName: currentUser.displayName,
			totalPoints: 0,
			rank: currentMembersCount + 1,
			role: "player",
		};
		members.push(newMember);
		saveLocalMembers(members);

		return tournament;
	},

	async getPredictions(tournamentId: string): Promise<Prediction[]> {
		await new Promise((r) => setTimeout(r, 100));
		if (isSupabaseConfigured) {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Usuario no autenticado");

			const { data, error } = await supabase
				.from("predictions")
				.select("*")
				.eq("tournament_id", tournamentId)
				.eq("user_id", user.id);
			if (error) throw error;

			return data.map((p) => ({
				id: p.id,
				matchId: p.match_id,
				userId: p.user_id,
				tournamentId: p.tournament_id,
				predictedHome: p.predicted_home,
				predictedAway: p.predicted_away,
				predictedWinner: p.predicted_winner,
				pointsEarned: p.points_earned,
			}));
		}

		// Fallback LocalStorage
		const currentUser = authApi.getPersistedUser();
		const userId = currentUser?.id || "user-1";
		const raw = localStorage.getItem("prodear_predictions");
		const predictions: Prediction[] = raw ? JSON.parse(raw) : [];
		if (!raw) {
			localStorage.setItem(
				"prodear_predictions",
				JSON.stringify(mockPredictions),
			);
			return mockPredictions.filter(
				(p) => p.tournamentId === tournamentId && p.userId === userId,
			);
		}
		return predictions.filter(
			(p) => p.tournamentId === tournamentId && p.userId === userId,
		);
	},

	async savePrediction(
		matchId: string,
		tournamentId: string,
		predictedHome: number,
		predictedAway: number,
		predictedWinner?: "home" | "away" | null,
	): Promise<Prediction> {
		await new Promise((r) => setTimeout(r, 200));

		if (isSupabaseConfigured) {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Usuario no autenticado");

			const { data: match, error: matchError } = await supabase
				.from("matches")
				.select("kick_off, status")
				.eq("id", matchId)
				.single();
			if (matchError || !match) throw new Error("Partido no encontrado");
			if (
				new Date(match.kick_off).getTime() - 15 * 60 * 1000 <= Date.now() ||
				match.status !== "scheduled"
			) {
				throw new Error(
					"No se pueden registrar o modificar pronósticos menos de 15 minutos antes del inicio del partido.",
				);
			}

			const predictionPayload = {
				match_id: matchId,
				user_id: user.id,
				tournament_id: tournamentId,
				predicted_home: predictedHome,
				predicted_away: predictedAway,
				predicted_winner: predictedWinner || null,
			};

			const { data, error } = await supabase
				.from("predictions")
				.upsert(predictionPayload, {
					onConflict: "match_id,user_id,tournament_id",
				})
				.select()
				.single();

			if (error) throw error;

			return {
				id: data.id,
				matchId: data.match_id,
				userId: data.user_id,
				tournamentId: data.tournament_id,
				predictedHome: data.predicted_home,
				predictedAway: data.predicted_away,
				predictedWinner: data.predicted_winner,
				pointsEarned: data.points_earned,
			};
		}

		// LocalStorage fallback
		const currentUser = authApi.getPersistedUser();
		const userId = currentUser?.id || "user-1";

		const localMatches = getLocalMatches();
		const match = localMatches.find((m) => m.id === matchId);
		if (!match) throw new Error("Partido no encontrado");
		if (
			new Date(match.kickOff).getTime() - 15 * 60 * 1000 <= Date.now() ||
			match.status !== "not_started"
		) {
			throw new Error(
				"No se pueden registrar o modificar pronósticos menos de 15 minutos antes del inicio del partido.",
			);
		}

		const rawPredictions = localStorage.getItem("prodear_predictions");
		const predictions: Prediction[] = rawPredictions
			? JSON.parse(rawPredictions)
			: [];
		if (!rawPredictions) {
			predictions.push(...mockPredictions);
		}

		const existingIndex = predictions.findIndex(
			(p) =>
				p.matchId === matchId &&
				p.userId === userId &&
				p.tournamentId === tournamentId,
		);

		const updatedPrediction: Prediction = {
			id:
				existingIndex >= 0
					? predictions[existingIndex].id
					: `pred-${Date.now()}`,
			matchId,
			userId,
			tournamentId,
			predictedHome,
			predictedAway,
			predictedWinner: predictedWinner || null,
			pointsEarned:
				existingIndex >= 0 ? predictions[existingIndex].pointsEarned : null,
		};

		if (existingIndex >= 0) {
			predictions[existingIndex] = updatedPrediction;
		} else {
			predictions.push(updatedPrediction);
		}

		localStorage.setItem("prodear_predictions", JSON.stringify(predictions));
		return updatedPrediction;
	},

	async updateTournament(id: string, name: string): Promise<void> {
		await new Promise((r) => setTimeout(r, 150));
		if (isSupabaseConfigured) {
			const { error } = await supabase
				.from("tournaments")
				.update({ name })
				.eq("id", id);
			if (error) throw error;
			return;
		}
		const tournaments = getLocalTournaments();
		const t = tournaments.find((x) => x.id === id);
		if (t) {
			t.name = name;
			saveLocalTournaments(tournaments);
		}
	},

	async deleteTournament(id: string): Promise<void> {
		await new Promise((r) => setTimeout(r, 150));
		if (isSupabaseConfigured) {
			const { error } = await supabase
				.from("tournaments")
				.delete()
				.eq("id", id);
			if (error) throw error;
			return;
		}
		const tournaments = getLocalTournaments();
		const filtered = tournaments.filter((x) => x.id !== id);
		saveLocalTournaments(filtered);

		// Limpieza local en cascada
		const members = getLocalMembers().filter((m) => m.tournamentId !== id);
		saveLocalMembers(members);

		const rawPreds = localStorage.getItem("prodear_predictions");
		if (rawPreds) {
			const preds: Prediction[] = JSON.parse(rawPreds);
			const filteredPreds = preds.filter((p) => p.tournamentId !== id);
			localStorage.setItem(
				"prodear_predictions",
				JSON.stringify(filteredPreds),
			);
		}
	},
};
