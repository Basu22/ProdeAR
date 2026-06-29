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
	/**
	 * FASE 1 (Sección Ligas): filtra competiciones visibles en el selector
	 * de la ruta /ligas. Si es false, no aparece en el dropdown.
	 * Default: true.
	 */
	active?: boolean;
	/**
	 * FASE 1 (Sección Ligas): determina cómo se renderizan las posiciones.
	 * - 'groups': fase de grupos (Mundial 2026 → 12 grupos de 4).
	 * - 'league': todos contra todos (LPF → tabla única).
	 * Default: 'league'.
	 */
	format?: CompetitionFormat;
	/**
	 * Marca amistosos. Si es `true`, el hook `useCompetitions` los filtra del
	 * selector de la ruta /ligas (junto con `format=null` e `active=false`).
	 * Default: false.
	 */
	is_friendly?: boolean;
}

/**
 * FASE 1 (Sección Ligas): formato de la competición.
 * Determina qué tabla de posiciones se renderiza en /ligas.
 */
export type CompetitionFormat = "groups" | "league";

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
	/**
	 * Sprint "Habilitar formations upcoming": ISO timestamp de cuándo la API
	 * publicó esta formación (o cuándo poll-scores la guardó por primera
	 * vez si la API no lo expone). Se popula server-side desde
	 * `matches.lineups_updated_at` en `mapDbMatchToFrontend` y se usa en
	 * `FormacionesTab` para mostrar el badge "Actualizado hace X min".
	 *
	 * Opcional: solo presente cuando el backend ya guardó la formación
	 * (lineups.length >= 2 en DB).
	 */
	publishedAt?: string;
}

export interface Match {
	id: string;
	competitionId: string;
	competitionName?: string;
	/**
	 * Sprint "Amistosos Read-Only" 2026-06-29: indica si el partido pertenece
	 * a una competición marcada como `is_friendly=true` en la DB.
	 *
	 * Cuando es `true`:
	 * - La card muestra badge "Amistoso Internacional" (sin opción de predecir)
	 * - El MatchSheet abre en modo read-only (oculta tab "Pronósticos")
	 * - `isMatchPredictable()` retorna `false` (no se puede pronosticar)
	 * - `deriveMatchCardState()` retorna `"read_only"`
	 *
	 * Se popula server-side desde `competitions.is_friendly` (migration 0007).
	 * Si la columna no existe en DB (entornos viejos), default `false`.
	 */
	isFriendly?: boolean;
	homeTeam: string;
	awayTeam: string;
	homeLogo: string | null;
	awayLogo: string | null;
	matchday: number;
	kickOff: string;
	homeScore: number | null;
	awayScore: number | null;
	penaltyWinner: "home" | "away" | null;
	/**
	 * Goles en tiempo extra (120 min). NULL si no hubo tiempo extra.
	 * Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
	 * Persistido por `poll-scores` desde `score.extratime` de API-Football.
	 */
	extraTimeHome: number | null;
	extraTimeAway: number | null;
	/**
	 * Goles en la tanda de penales. NULL si no hubo penales.
	 * Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
	 * Persistido por `poll-scores` desde `score.penalty` de API-Football.
	 * Junto con `penaltyWinner`, permiten mostrar "(4-3) PEN" en la UI.
	 */
	penaltiesHome: number | null;
	penaltiesAway: number | null;
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
	/**
	 * Sprint "Full Bracket" (migration 0006): posición del partido en el
	 * árbol eliminatorio. Ejemplos: "R32-1", "R16-3", "QF-2", "SF-1", "F-1",
	 * "3RD-1". `null` para partidos de fase de grupos.
	 *
	 * Lo popula `poll-scores` server-side basándose en `stageName` + orden
	 * cronológico. Permite cruzar un `Match` de Supabase con su slot en el
	 * bracket visual sin depender del `stageName` (free-text de la API).
	 */
	bracketPosition?: string | null;
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

/* === FASE 1: Sección "Ligas" (MVP) === */

/**
 * FASE 1: Standing de un equipo en formato liga (todos contra todos).
 *
 * Análogo a `GroupTeamStanding` (Mundial) pero sin `groupLetter` (no hay
 * grupos en formato liga) y con `position` ya calculado. Es el resultado
 * final que consume `LeagueTable.tsx` para renderizar las filas.
 *
 * `isLive` indica que el equipo tiene un partido en curso (status === "live"
 * con score parcial). La UI muestra un badge "EN JUEGO" en la fila.
 *
 * `zone` es opcional y se usa en Fase 2 para colorear las filas según
 * clasificación/descenso. En Fase 1 siempre es undefined.
 */
export interface LeagueStanding {
	/** Nombre del equipo (canónico o crudo, según fuente) */
	teamName: string;
	/** URL del logo (puede ser null si no hay logo disponible) */
	logo: string | null;
	/** Partidos jugados (incluye live y finished) */
	pj: number;
	/** Partidos ganados */
	pg: number;
	/** Partidos empatados */
	pe: number;
	/** Partidos perdidos */
	pp: number;
	/** Goles a favor */
	gf: number;
	/** Goles en contra */
	gc: number;
	/** Diferencia de gol (gf - gc) */
	dg: number;
	/** Puntos (3 por victoria, 1 por empate, 0 por derrota) */
	pts: number;
	/** Si el equipo tiene un partido en curso */
	isLive: boolean;
	/** Posición en la tabla (1-based, calculada por el sort) */
	position: number;
	/**
	 * Zona cualitativa (Fase 2): "libertadores" | "sudamericana" |
	 * "descenso" | undefined. En Fase 1 no se usa.
	 */
	zone?: "libertadores" | "sudamericana" | "descenso";
}

/**
 * FASE 1: Broadcaster (canal de TV/streaming) asociado a un partido.
 *
 * Mapea 1:1 con la tabla `match_broadcasters` (migration 0005).
 * Un partido puede tener varios broadcasters (TV abierta + cable + stream).
 *
 * En Fase 1 seguimos usando el campo `match.tvChannel` (string) para
 * mantener compatibilidad con los datos ya cargados. Esta interfaz queda
 * lista para Fase 2 cuando se popule `match_broadcasters`.
 */
export interface MatchBroadcaster {
	id: string;
	matchId: string;
	/** Nombre del canal/plataforma. ej. "TyC Sports", "ESPN Premium", "Star+" */
	broadcasterName: string;
	/** Tipo: tv (abierta/cable), streaming, radio */
	broadcasterType: "tv" | "streaming" | "radio";
	/** País de la señal (ej. "AR", "BR", "ES"). Default: "AR" */
	country: string;
	/** Link al stream (si aplica). Null si no hay URL. */
	url: string | null;
	/** Si es el canal principal del partido (se muestra primero) */
	isPrimary: boolean;
}
