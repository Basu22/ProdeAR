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
		photo?: string | null;
	};
}

/**
 * Foto de un jugador en un partido específico.
 * Sprint 2: agregada para enriquecer el FormacionesTab con las caras de los
 * jugadores. Se guarda como JSONB en `matches.player_photos` y se hidrata
 * desde el endpoint `/fixtures/players?fixture=X` de API-Football.
 */
export interface PlayerPhoto {
	player_id: number;
	photo: string;
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
	playerPhotos?: PlayerPhoto[];
	/**
	 * Sprint 3: Canonicalización server-side para el Mundial.
	 * Populados por `poll-scores` desde la tabla `team_aliases`.
	 * - `groupLetter`: "A"-"L" para partidos de fase de grupos (null en eliminatorias)
	 * - `homeTeamCanonical` / `awayTeamCanonical`: nombre canónico en español
	 *   (ej. "México", "Corea del Sur"), independiente del nombre crudo de la API
	 *   (ej. "Mexico", "South Korea").
	 *
	 * Si están presentes, `getGroupTables` los prefiere sobre el fuzzy match
	 * built-in, lo que elimina la necesidad de mantener aliases en el cliente.
	 */
	groupLetter?: string | null;
	homeTeamCanonical?: string | null;
	awayTeamCanonical?: string | null;
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

/* === Sprint 1: Match Bottom Sheet Tabs (F10) === */
export type SheetTabId = "predictions" | "events" | "stats" | "lineups";

export interface SheetTabDef {
	id: SheetTabId;
	label: string;
	icon: string; // Material Symbol name
}
