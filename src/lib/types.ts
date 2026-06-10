export interface User {
	id: string;
	email: string;
	displayName: string;
	avatarUrl: string | null;
}

export interface Competition {
	id: string;
	name: string;
	country: string;
	logoUrl: string;
	season: string;
}

export interface Tournament {
	id: string;
	ownerId: string;
	competitionId: string;
	name: string;
	code: string;
	scoringConfig: ScoringConfig;
	status: "active" | "finished";
}

export interface TournamentMember {
	id: string;
	tournamentId: string;
	userId: string;
	totalPoints: number;
	rank: number;
	role: "admin" | "player";
	displayName?: string;
}

export interface MatchEvent {
	id: string;
	type: "goal" | "yellow" | "red" | "subst" | "var" | "info";
	minute: number;
	extra?: number | null;
	team: "home" | "away";
	playerName: string;
	assistName?: string | null;
	detail?: string | null;
	comments?: string | null;
}

export interface TeamStats {
	team: {
		id: number;
		name: string;
		logo: string;
	};
	statistics: {
		type: string;
		value: string | number | null;
	}[];
}

export interface TacticalPlayerInfo {
	player: {
		id: number;
		name: string;
		number: number;
		pos: string;
		grid: string | null;
	};
}

export interface TeamLineup {
	team: {
		id: number;
		name: string;
		logo: string;
	};
	formation: string;
	startXI: TacticalPlayerInfo[];
	substitutes: TacticalPlayerInfo[];
	coach: {
		id: number | null;
		name: string | null;
		photo: string | null;
	};
}

export interface Match {
	id: string;
	competitionId: string;
	competitionName?: string;
	homeTeam: string;
	awayTeam: string;
	homeLogo: string | null;
	awayLogo: string | null;
	matchday: number;
	kickOff: string;
	homeScore: number | null;
	awayScore: number | null;
	penaltyWinner: "home" | "away" | null;
	stageName: string;
	stageMultiplier: number;
	status: MatchStatus;
	stadium?: string | null;
	tvChannel?: string | null;
	minute?: number;
	rawStatus?: string;
	events?: MatchEvent[];
	stats?: TeamStats[];
	lineups?: TeamLineup[];
}

export type MatchStatus =
	| "not_started"
	| "live"
	| "finished"
	| "postponed"
	| "cancelled";

export interface Prediction {
	id: string;
	matchId: string;
	userId: string;
	tournamentId: string;
	predictedHome: number;
	predictedAway: number;
	predictedWinner: "home" | "away" | null;
	pointsEarned: number | null;
}

export interface ScoringConfig {
	exactScore: number;
	correctWinner: number;
	correctDraw: number;
	goalDifference: number;
	bonusStreak3: number;
	bonusStreak5: number;
}

export interface ChatMessage {
	id: string;
	tournamentId: string;
	userId: string;
	content: string;
	createdAt: string;
}
