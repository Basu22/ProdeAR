/**
 * Lógica pura para las posiciones de los grupos del Mundial 2026.
 *
 * Este módulo es self-contained (sin React, sin Supabase, sin hooks).
 * Toda la lógica es testeable y reutilizable.
 *
 * ============================================================================
 * CAMBIOS RESPECTO A LA IMPLEMENTACIÓN ANTERIOR (Tournament.tsx:247-387)
 * ============================================================================
 * - FIX BUG: los partidos `live` ahora cuentan en la tabla (PJ, GF, GC, DG).
 *   Antes solo `finished` contaba, por lo que la tabla quedaba desactualizada
 *   durante los 90+ minutos que dura un partido.
 * - Para partidos live NO se suman puntos (pts/pg/pe/pp). Se asignan solo
 *   cuando el partido termina. Esto evita confusión (un equipo puede ir 1-0
 *   y perder 1-3).
 * - Se agrega flag `isLive` al standing para que la UI muestre el badge
 *   "EN JUEGO" en equipos con partido en curso.
 * - Se agrega `liveMatches: Match[]` a la GroupTable para que la UI pueda
 *   renderizar un mini-scoreboard inline.
 * - `findCanonicalTeam` ahora aplica normalización NFD (lowercase + strip
 *   diacritics) y TRIM. Esto cubre casos como "Türkiye" ↔ "Turkiye",
 *   "  South Korea  " con whitespace, etc., sin necesidad de duplicar aliases.
 * - La función acepta aliases externos (provenientes de la tabla `team_aliases`
 *   en Supabase) o usa `BUILT_IN_TEAM_ALIASES` como fallback.
 *
 * @module lib/worldCupGroups
 */

import type { Match } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Standing de un equipo dentro de un grupo.
 *
 * `isLive` indica que el equipo tiene un partido en curso (status === "live"
 * con score parcial). Sirve para que la UI muestre el badge "EN JUEGO" sin
 * tener que consultar matches[] desde el componente.
 */
export interface GroupTeamStanding {
	teamName: string;
	logo: string | null;
	pj: number;
	pg: number;
	pe: number;
	pp: number;
	gf: number;
	gc: number;
	dg: number;
	pts: number;
	isLive: boolean;
}

/**
 * Tabla de posiciones de un grupo.
 */
export interface GroupTable {
	/** "Grupo A", "Grupo B", ... */
	groupName: string;
	/** Letra del grupo: "A", "B", ... (deriva de groupName) */
	groupLetter: string;
	/** Equipos del grupo, ordenados por posición (pts > dg > gf > nombre) */
	standings: GroupTeamStanding[];
	/** Partidos en vivo de este grupo (puede haber 0, 1, o más) */
	liveMatches: Match[];
}

/**
 * Alias de equipo para resolver nombres de la API a nombres canónicos.
 *
 * Estructura plana inspirada en la tabla `team_aliases` de Supabase:
 * - `canonicalName`: nombre "oficial" del equipo (ej. "México", "Corea del Sur")
 * - `alias`: nombre crudo de la API (ej. "Mexico", "South Korea", "Türkiye")
 * - `groupLetter`: letra del grupo (A-L)
 * - `flagCode`: código ISO del país para `flagcdn.com` (ej. "mx", "kr")
 */
export interface TeamAlias {
	canonicalName: string;
	alias: string;
	groupLetter: string;
	flagCode: string;
}

/**
 * Extensión opcional del tipo Match con campos canónicos del Mundial.
 *
 * Por ahora estos campos NO están en el tipo base Match (eso es UT-2).
 * Esta extensión permite que `getGroupTables` los use si están presentes
 * (server-side canonicalization) sin romper la firma pública.
 */
export type WorldCupMatch = Match & {
	groupLetter?: string | null;
	homeTeamCanonical?: string | null;
	awayTeamCanonical?: string | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Definición oficial de los 12 grupos del Mundial 2026.
 * Nombres canónicos en español con tildes.
 */
export const WORLD_CUP_GROUPS_DEF: Record<string, string[]> = {
	"Grupo A": ["México", "Corea del Sur", "Sudáfrica", "República Checa"],
	"Grupo B": ["Canadá", "Suiza", "Catar", "Bosnia y Herzegovina"],
	"Grupo C": ["Brasil", "Marruecos", "Escocia", "Haití"],
	"Grupo D": ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
	"Grupo E": ["Alemania", "Ecuador", "Costa de Marfil", "Curaçao"],
	"Grupo F": ["Países Bajos", "Japón", "Túnez", "Suecia"],
	"Grupo G": ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
	"Grupo H": ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"],
	"Grupo I": ["Francia", "Senegal", "Irak", "Noruega"],
	"Grupo J": ["Argentina", "Argelia", "Austria", "Jordania"],
	"Grupo K": ["Portugal", "Colombia", "Uzbekistán", "RD Congo"],
	"Grupo L": ["Inglaterra", "Croacia", "Ghana", "Panamá"],
};

/**
 * Mapeo de nombre canónico → código de país para `flagcdn.com`.
 * 48 entradas (una por equipo del Mundial).
 */
export const COUNTRY_FLAGS: Record<string, string> = {
	México: "mx",
	"Corea del Sur": "kr",
	Sudáfrica: "za",
	"República Checa": "cz",
	Canadá: "ca",
	Suiza: "ch",
	Catar: "qa",
	"Bosnia y Herzegovina": "ba",
	Brasil: "br",
	Marruecos: "ma",
	Escocia: "gb-sct",
	Haití: "ht",
	"Estados Unidos": "us",
	Paraguay: "py",
	Australia: "au",
	Turquía: "tr",
	Alemania: "de",
	Ecuador: "ec",
	"Costa de Marfil": "ci",
	Curaçao: "cw",
	"Países Bajos": "nl",
	Japón: "jp",
	Túnez: "tn",
	Suecia: "se",
	Bélgica: "be",
	Egipto: "eg",
	Irán: "ir",
	"Nueva Zelanda": "nz",
	España: "es",
	Uruguay: "uy",
	"Arabia Saudita": "sa",
	"Cabo Verde": "cv",
	Francia: "fr",
	Senegal: "sn",
	Irak: "iq",
	Noruega: "no",
	Argentina: "ar",
	Argelia: "dz",
	Austria: "at",
	Jordania: "jo",
	Portugal: "pt",
	Colombia: "co",
	Uzbekistán: "uz",
	"RD Congo": "cd",
	Inglaterra: "gb-eng",
	Croacia: "hr",
	Ghana: "gh",
	Panamá: "pa",
};

/**
 * Aliases BUILT-IN como fallback cuando la tabla `team_aliases` de Supabase
 * no está disponible (ej. fallback local, tests, primera carga).
 *
 * En producción, `getGroupTables` recibe los aliases de la DB via
 * `getTeamAliases()` (UT-5).
 */
export const BUILT_IN_TEAM_ALIASES: TeamAlias[] = [
	// Grupo A
	{
		canonicalName: "México",
		alias: "Mexico",
		groupLetter: "A",
		flagCode: "mx",
	},
	{
		canonicalName: "México",
		alias: "México",
		groupLetter: "A",
		flagCode: "mx",
	},
	{
		canonicalName: "Corea del Sur",
		alias: "South Korea",
		groupLetter: "A",
		flagCode: "kr",
	},
	{
		canonicalName: "Corea del Sur",
		alias: "Corea del Sur",
		groupLetter: "A",
		flagCode: "kr",
	},
	{
		canonicalName: "Sudáfrica",
		alias: "South Africa",
		groupLetter: "A",
		flagCode: "za",
	},
	{
		canonicalName: "Sudáfrica",
		alias: "Sudáfrica",
		groupLetter: "A",
		flagCode: "za",
	},
	{
		canonicalName: "República Checa",
		alias: "Czechia",
		groupLetter: "A",
		flagCode: "cz",
	},
	{
		canonicalName: "República Checa",
		alias: "Czech Republic",
		groupLetter: "A",
		flagCode: "cz",
	},
	{
		canonicalName: "República Checa",
		alias: "República Checa",
		groupLetter: "A",
		flagCode: "cz",
	},

	// Grupo B
	{
		canonicalName: "Canadá",
		alias: "Canada",
		groupLetter: "B",
		flagCode: "ca",
	},
	{
		canonicalName: "Canadá",
		alias: "Canadá",
		groupLetter: "B",
		flagCode: "ca",
	},
	{
		canonicalName: "Suiza",
		alias: "Switzerland",
		groupLetter: "B",
		flagCode: "ch",
	},
	{ canonicalName: "Suiza", alias: "Suiza", groupLetter: "B", flagCode: "ch" },
	{ canonicalName: "Catar", alias: "Qatar", groupLetter: "B", flagCode: "qa" },
	{ canonicalName: "Catar", alias: "Catar", groupLetter: "B", flagCode: "qa" },
	{
		canonicalName: "Bosnia y Herzegovina",
		alias: "Bosnia and Herzegovina",
		groupLetter: "B",
		flagCode: "ba",
	},
	{
		canonicalName: "Bosnia y Herzegovina",
		alias: "Bosnia & Herzegovina",
		groupLetter: "B",
		flagCode: "ba",
	},
	{
		canonicalName: "Bosnia y Herzegovina",
		alias: "Bosnia y Herzegovina",
		groupLetter: "B",
		flagCode: "ba",
	},

	// Grupo C
	{
		canonicalName: "Brasil",
		alias: "Brazil",
		groupLetter: "C",
		flagCode: "br",
	},
	{
		canonicalName: "Brasil",
		alias: "Brasil",
		groupLetter: "C",
		flagCode: "br",
	},
	{
		canonicalName: "Marruecos",
		alias: "Morocco",
		groupLetter: "C",
		flagCode: "ma",
	},
	{
		canonicalName: "Marruecos",
		alias: "Marruecos",
		groupLetter: "C",
		flagCode: "ma",
	},
	{
		canonicalName: "Escocia",
		alias: "Scotland",
		groupLetter: "C",
		flagCode: "gb-sct",
	},
	{
		canonicalName: "Escocia",
		alias: "Escocia",
		groupLetter: "C",
		flagCode: "gb-sct",
	},
	{ canonicalName: "Haití", alias: "Haiti", groupLetter: "C", flagCode: "ht" },
	{ canonicalName: "Haití", alias: "Haití", groupLetter: "C", flagCode: "ht" },

	// Grupo D
	{
		canonicalName: "Estados Unidos",
		alias: "USA",
		groupLetter: "D",
		flagCode: "us",
	},
	{
		canonicalName: "Estados Unidos",
		alias: "United States",
		groupLetter: "D",
		flagCode: "us",
	},
	{
		canonicalName: "Estados Unidos",
		alias: "Estados Unidos",
		groupLetter: "D",
		flagCode: "us",
	},
	{
		canonicalName: "Paraguay",
		alias: "Paraguay",
		groupLetter: "D",
		flagCode: "py",
	},
	{
		canonicalName: "Australia",
		alias: "Australia",
		groupLetter: "D",
		flagCode: "au",
	},
	{
		canonicalName: "Turquía",
		alias: "Turkey",
		groupLetter: "D",
		flagCode: "tr",
	},
	{
		canonicalName: "Turquía",
		alias: "Turquía",
		groupLetter: "D",
		flagCode: "tr",
	},
	{
		canonicalName: "Turquía",
		alias: "Türkiye",
		groupLetter: "D",
		flagCode: "tr",
	},

	// Grupo E
	{
		canonicalName: "Alemania",
		alias: "Germany",
		groupLetter: "E",
		flagCode: "de",
	},
	{
		canonicalName: "Alemania",
		alias: "Alemania",
		groupLetter: "E",
		flagCode: "de",
	},
	{
		canonicalName: "Ecuador",
		alias: "Ecuador",
		groupLetter: "E",
		flagCode: "ec",
	},
	{
		canonicalName: "Costa de Marfil",
		alias: "Ivory Coast",
		groupLetter: "E",
		flagCode: "ci",
	},
	{
		canonicalName: "Costa de Marfil",
		alias: "Cote d'Ivoire",
		groupLetter: "E",
		flagCode: "ci",
	},
	{
		canonicalName: "Costa de Marfil",
		alias: "Costa de Marfil",
		groupLetter: "E",
		flagCode: "ci",
	},
	{
		canonicalName: "Curaçao",
		alias: "Curacao",
		groupLetter: "E",
		flagCode: "cw",
	},
	{
		canonicalName: "Curaçao",
		alias: "Curaçao",
		groupLetter: "E",
		flagCode: "cw",
	},

	// Grupo F
	{
		canonicalName: "Países Bajos",
		alias: "Netherlands",
		groupLetter: "F",
		flagCode: "nl",
	},
	{
		canonicalName: "Países Bajos",
		alias: "Países Bajos",
		groupLetter: "F",
		flagCode: "nl",
	},
	{ canonicalName: "Japón", alias: "Japan", groupLetter: "F", flagCode: "jp" },
	{ canonicalName: "Japón", alias: "Japón", groupLetter: "F", flagCode: "jp" },
	{
		canonicalName: "Túnez",
		alias: "Tunisia",
		groupLetter: "F",
		flagCode: "tn",
	},
	{ canonicalName: "Túnez", alias: "Túnez", groupLetter: "F", flagCode: "tn" },
	{
		canonicalName: "Suecia",
		alias: "Sweden",
		groupLetter: "F",
		flagCode: "se",
	},
	{
		canonicalName: "Suecia",
		alias: "Suecia",
		groupLetter: "F",
		flagCode: "se",
	},

	// Grupo G
	{
		canonicalName: "Bélgica",
		alias: "Belgium",
		groupLetter: "G",
		flagCode: "be",
	},
	{
		canonicalName: "Bélgica",
		alias: "Bélgica",
		groupLetter: "G",
		flagCode: "be",
	},
	{ canonicalName: "Egipto", alias: "Egypt", groupLetter: "G", flagCode: "eg" },
	{
		canonicalName: "Egipto",
		alias: "Egipto",
		groupLetter: "G",
		flagCode: "eg",
	},
	{ canonicalName: "Irán", alias: "Iran", groupLetter: "G", flagCode: "ir" },
	{ canonicalName: "Irán", alias: "Irán", groupLetter: "G", flagCode: "ir" },
	{
		canonicalName: "Nueva Zelanda",
		alias: "New Zealand",
		groupLetter: "G",
		flagCode: "nz",
	},
	{
		canonicalName: "Nueva Zelanda",
		alias: "Nueva Zelanda",
		groupLetter: "G",
		flagCode: "nz",
	},

	// Grupo H
	{ canonicalName: "España", alias: "Spain", groupLetter: "H", flagCode: "es" },
	{
		canonicalName: "España",
		alias: "España",
		groupLetter: "H",
		flagCode: "es",
	},
	{
		canonicalName: "Uruguay",
		alias: "Uruguay",
		groupLetter: "H",
		flagCode: "uy",
	},
	{
		canonicalName: "Arabia Saudita",
		alias: "Saudi Arabia",
		groupLetter: "H",
		flagCode: "sa",
	},
	{
		canonicalName: "Arabia Saudita",
		alias: "Arabia Saudita",
		groupLetter: "H",
		flagCode: "sa",
	},
	{
		canonicalName: "Cabo Verde",
		alias: "Cape Verde",
		groupLetter: "H",
		flagCode: "cv",
	},
	{
		canonicalName: "Cabo Verde",
		alias: "Cape Verde Islands",
		groupLetter: "H",
		flagCode: "cv",
	},
	{
		canonicalName: "Cabo Verde",
		alias: "Cabo Verde",
		groupLetter: "H",
		flagCode: "cv",
	},

	// Grupo I
	{
		canonicalName: "Francia",
		alias: "France",
		groupLetter: "I",
		flagCode: "fr",
	},
	{
		canonicalName: "Francia",
		alias: "Francia",
		groupLetter: "I",
		flagCode: "fr",
	},
	{
		canonicalName: "Senegal",
		alias: "Senegal",
		groupLetter: "I",
		flagCode: "sn",
	},
	{ canonicalName: "Irak", alias: "Iraq", groupLetter: "I", flagCode: "iq" },
	{ canonicalName: "Irak", alias: "Irak", groupLetter: "I", flagCode: "iq" },
	{
		canonicalName: "Noruega",
		alias: "Norway",
		groupLetter: "I",
		flagCode: "no",
	},
	{
		canonicalName: "Noruega",
		alias: "Noruega",
		groupLetter: "I",
		flagCode: "no",
	},

	// Grupo J
	{
		canonicalName: "Argentina",
		alias: "Argentina",
		groupLetter: "J",
		flagCode: "ar",
	},
	{
		canonicalName: "Argelia",
		alias: "Algeria",
		groupLetter: "J",
		flagCode: "dz",
	},
	{
		canonicalName: "Argelia",
		alias: "Argelia",
		groupLetter: "J",
		flagCode: "dz",
	},
	{
		canonicalName: "Austria",
		alias: "Austria",
		groupLetter: "J",
		flagCode: "at",
	},
	{
		canonicalName: "Jordania",
		alias: "Jordan",
		groupLetter: "J",
		flagCode: "jo",
	},
	{
		canonicalName: "Jordania",
		alias: "Jordania",
		groupLetter: "J",
		flagCode: "jo",
	},

	// Grupo K
	{
		canonicalName: "Portugal",
		alias: "Portugal",
		groupLetter: "K",
		flagCode: "pt",
	},
	{
		canonicalName: "Colombia",
		alias: "Colombia",
		groupLetter: "K",
		flagCode: "co",
	},
	{
		canonicalName: "Uzbekistán",
		alias: "Uzbekistan",
		groupLetter: "K",
		flagCode: "uz",
	},
	{
		canonicalName: "Uzbekistán",
		alias: "Uzbekistán",
		groupLetter: "K",
		flagCode: "uz",
	},
	{
		canonicalName: "RD Congo",
		alias: "Congo DR",
		groupLetter: "K",
		flagCode: "cd",
	},
	{
		canonicalName: "RD Congo",
		alias: "RD Congo",
		groupLetter: "K",
		flagCode: "cd",
	},

	// Grupo L
	{
		canonicalName: "Inglaterra",
		alias: "England",
		groupLetter: "L",
		flagCode: "gb-eng",
	},
	{
		canonicalName: "Inglaterra",
		alias: "Inglaterra",
		groupLetter: "L",
		flagCode: "gb-eng",
	},
	{
		canonicalName: "Croacia",
		alias: "Croatia",
		groupLetter: "L",
		flagCode: "hr",
	},
	{
		canonicalName: "Croacia",
		alias: "Croacia",
		groupLetter: "L",
		flagCode: "hr",
	},
	{ canonicalName: "Ghana", alias: "Ghana", groupLetter: "L", flagCode: "gh" },
	{
		canonicalName: "Panamá",
		alias: "Panama",
		groupLetter: "L",
		flagCode: "pa",
	},
	{
		canonicalName: "Panamá",
		alias: "Panamá",
		groupLetter: "L",
		flagCode: "pa",
	},
];

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Normaliza un nombre de equipo para matching robusto.
 *
 * Proceso:
 * 1. Trim whitespace
 * 2. Lowercase
 * 3. NFD (descompone caracteres con diacríticos: "Türkiye" → "Tu" + "̈" + "rkiye")
 * 4. Strip combining marks (elimina los diacríticos: "Tu" + "̈" → "turkiye")
 *
 * Esto permite que `Türkiye`, `turkiye`, `TÜRKIYE`, `  Türkiye  ` se matcheen
 * con `Turkiye` o `Türkiye` indistintamente.
 *
 * @example
 * normalizeTeamName("  South Korea  ") // → "south korea"
 * normalizeTeamName("Türkiye")          // → "turkiye"
 * normalizeTeamName("Côte d'Ivoire")    // → "cote d'ivoire"
 */
export function normalizeTeamName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extrae la letra del grupo del stageName de la API.
 *
 * Acepta formatos de la API-Football:
 * - "Group A" → "A"
 * - "Group B - Group B" → "B"
 * - "Grupo A" → "A" (formato legado)
 * - "group c" → "C" (case-insensitive)
 *
 * Retorna `null` si no matchea con un grupo (ej. "Group Stage", "Round of 16").
 */
export function getGroupLetterFromStage(
	stageName: string | null | undefined,
): string | null {
	if (!stageName) return null;
	// Flag `i` para case-insensitive (cubre "Group A", "group a", "GRUPO A", etc.)
	// Negative lookahead `(?![a-zA-Z])` evita que "Group AB" matchee con "A"
	// (esperaríamos que retorne null o un comportamiento explícito).
	const match = stageName.match(/[Gg]r(?:oup|upo)\s+([A-L])(?![a-zA-Z])/i);
	return match ? match[1].toUpperCase() : null;
}

/**
 * Determina si un partido es de fase eliminatoria (no grupo).
 *
 * Usa el campo `stageMultiplier` (1 = grupo, >1 = eliminatoria) como señal
 * principal, y verifica strings específicos como fallback para compat con
 * datos viejos que puedan no tener el multiplier.
 */
export function isKnockoutMatch(match: Match): boolean {
	if (match.stageMultiplier > 1) return true;
	const stage = (match.stageName ?? "").toLowerCase();
	return (
		stage.includes("round of") ||
		stage.includes("dieciseisavos") ||
		stage.includes("quarter") ||
		stage.includes("semi") ||
		stage.includes("final") ||
		stage.includes("llave") ||
		stage.includes("eliminatoria") ||
		stage.includes("octavos") ||
		stage.includes("cuartos") ||
		stage.includes("16vos") ||
		stage.includes("8vos") ||
		stage.includes("4tos")
	);
}

/**
 * Resuelve un nombre de equipo a su forma canónica del Mundial.
 *
 * Algoritmo (en orden):
 * 1. Match EXACTO contra `alias` normalizado (NFD + lowercase + trim)
 * 2. Si no hay match exacto, fuzzy: el alias normalizado está contenido
 *    en el input normalizado, o viceversa.
 * 3. Si nada matchea, retorna `null`.
 *
 * El fuzzy match es defensivo y solo se activa si el match exacto falla.
 *
 * @example
 * findCanonicalTeam("South Korea")
 * // → { groupLetter: "A", canonicalName: "Corea del Sur", flagCode: "kr" }
 *
 * findCanonicalTeam("Türkiye")
 * // → { groupLetter: "D", canonicalName: "Turquía", flagCode: "tr" }
 *   (gracias a NFD normalization, matchea con el alias "Türkiye" o "Turkey")
 */
export function findCanonicalTeam(
	teamName: string | null | undefined,
	aliases: TeamAlias[] = BUILT_IN_TEAM_ALIASES,
): { groupLetter: string; canonicalName: string; flagCode: string } | null {
	if (!teamName || !teamName.trim()) return null;

	const normalizedInput = normalizeTeamName(teamName);

	// 1. Match exacto
	for (const alias of aliases) {
		if (normalizeTeamName(alias.alias) === normalizedInput) {
			return {
				groupLetter: alias.groupLetter,
				canonicalName: alias.canonicalName,
				flagCode: alias.flagCode,
			};
		}
	}

	// 2. Fuzzy: contains bidireccional
	for (const alias of aliases) {
		const normalizedAlias = normalizeTeamName(alias.alias);
		if (
			normalizedAlias &&
			(normalizedInput.includes(normalizedAlias) ||
				normalizedAlias.includes(normalizedInput))
		) {
			return {
				groupLetter: alias.groupLetter,
				canonicalName: alias.canonicalName,
				flagCode: alias.flagCode,
			};
		}
	}

	// 3. No match
	return null;
}

/**
 * Genera URL del flag desde el código de país.
 *
 * @example
 * getFlagUrl("mx")  // → "https://flagcdn.com/w40/mx.png"
 * getFlagUrl(null)  // → null
 */
export function getFlagUrl(flagCode: string | null | undefined): string | null {
	if (!flagCode) return null;
	return `https://flagcdn.com/w40/${flagCode}.png`;
}

// ============================================================================
// BEST THIRDS (Liga de mejores terceros)
// ============================================================================

/**
 * Standing extendido de un TERCER lugar, con metadata de si clasifica a 16vos.
 *
 * Es un sub-tipo de `GroupTeamStanding` (no exactamente igual — `isThird` lo
 * diferencia) porque la UI de Liga 3ros necesita info extra (`groupLetter` para
 * mostrar de qué grupo viene el tercero, `qualifies` para colorear verde/rojo).
 */
export interface BestThirdsStanding extends GroupTeamStanding {
	/** Letra del grupo del que viene este tercero (ej. "A" para México si quedó 3° en A) */
	groupLetter: string;
	/** `true` si está en el top 8 (clasifica a 16vos), `false` si está 9-12 (eliminado) */
	qualifies: boolean;
	/** Posición en el ranking de los 12 terceros (1 = mejor tercero, 12 = peor) */
	rank: number;
}

export interface BestThirdsTable {
	/** Los 12 terceros ordenados del mejor al peor (rank 1 al 12) */
	standings: BestThirdsStanding[];
	/** Cantidad de terceros que clasifican (FIFA 2026: 8) */
	qualifyCount: number;
	/** Índice (0-based) del último clasificado. En el array, standings[cutoffIndex] es el último clasificado. */
	cutoffIndex: number;
}

/**
 * ============================================================================
 * CONSTANTE: Cantidad de mejores terceros que clasifican a 16vos en Mundial 2026
 * ============================================================================
 * FIFA 2026: 12 grupos (A-L) × 1 tercer lugar = 12 terceros. De esos, los 8
 * mejores clasifican a 16vos de final. Los 4 peores quedan eliminados.
 *
 * Si en el futuro se cambia el formato (ej. 16 grupos, 6 mejores terceros),
 * basta cambiar esta constante.
 */
export const BEST_THIRDS_QUALIFY_COUNT = 8;

/**
 * Extrae los terceros lugares de los 12 grupos y los ordena según las reglas
 * FIFA de desempate: Puntos → Diferencia de gol → Goles a favor → Fair play
 * (no implementado en esta fase) → Sorteo.
 *
 * Reglas FIFA oficiales para desempate entre mejores terceros:
 * 1. Mayor cantidad de puntos
 * 2. Mayor diferencia de gol
 * 3. Mayor cantidad de goles a favor
 * 4. Fair play (tarjetas)
 * 5. Sorteo
 *
 * En esta implementación, seguimos 1-3 y usamos el nombre del equipo como
 * desempate final (más predecible que un sort aleatorio).
 *
 * ============================================================================
 * LIVE VS FINISHED
 * ============================================================================
 * En la realidad, la tabla de "mejores terceros" se calcula cuando TODOS los
 * grupos terminaron. Pero mostramos la tabla en vivo para que el usuario vea
 * cómo se mueve la clasificación. Los partidos `live` ya tienen PJ/GF/GC/DG
 * populados (no así pts), así que el ranking puede cambiar dramáticamente
 * cuando un partido live termina y asigna los 3 pts al ganador.
 *
 * @param groupTables - Array de 12 GroupTable (de `getGroupTables`)
 * @returns BestThirdsTable con standings ordenados + metadata de cutoff
 */
export function calculateBestThirds(
	groupTables: GroupTable[],
	qualifyCount: number = BEST_THIRDS_QUALIFY_COUNT,
): BestThirdsTable {
	// 1. Extraer el tercer lugar de cada grupo (índice 2 en standings ya ordenadas)
	const thirds: Omit<BestThirdsStanding, "qualifies" | "rank">[] = [];
	for (const group of groupTables) {
		const thirdPlace = group.standings[2];
		if (thirdPlace) {
			thirds.push({
				...thirdPlace,
				groupLetter: group.groupLetter,
			});
		}
	}

	// 2. Ordenar por criterios FIFA: pts > DG > GF > nombre
	thirds.sort((a, b) => {
		if (b.pts !== a.pts) return b.pts - a.pts;
		if (b.dg !== a.dg) return b.dg - a.dg;
		if (b.gf !== a.gf) return b.gf - a.gf;
		return a.teamName.localeCompare(b.teamName);
	});

	// 3. Asignar rank y qualifies
	const standings: BestThirdsStanding[] = thirds.map((third, index) => ({
		...third,
		rank: index + 1,
		qualifies: index < qualifyCount,
	}));

	return {
		standings,
		qualifyCount,
		cutoffIndex: Math.min(qualifyCount, standings.length) - 1,
	};
}

// ============================================================================
// KNOCKOUT BRACKET (Dieciseisavos de final / Round of 32)
// ============================================================================

/**
 * Slot de un equipo en el bracket de Dieciseisavos.
 *
 * - `teamName: string` si el equipo ya está definido (grupo terminado)
 * - `teamName: null` si el slot está pendiente (ej. "1° Grupo X" cuando el grupo
 *   aún no terminó)
 *
 * `slotType` describe cómo se llena el slot, útil para la UI ("1° Grupo A",
 * "Mejor 3° #1", etc.).
 */
export type BracketSlotType =
	| "1st" // 1° del grupo
	| "2nd" // 2° del grupo
	| "best3rd"; // Mejor 3° (rank 1-8)

export interface BracketSlot {
	/** Tipo de slot (cómo se llena) */
	slotType: BracketSlotType;
	/** Letra del grupo (A-L), null si es best3rd */
	groupLetter: string | null;
	/** Rank del best3rd (1-8), solo si slotType === 'best3rd' */
	bestThirdRank: number | null;
	/** Nombre del equipo resuelto, null si TBD */
	teamName: string | null;
	/** URL del logo, null si TBD o sin logo */
	teamLogo: string | null;
	/** Si el slot aún depende de partidos en vivo del grupo */
	isLive: boolean;
}

/**
 * Un partido del bracket de Dieciseisavos.
 *
 * Cada partido tiene dos slots (slotA y slotB). Cuando ambos slots están
 * resueltos (teamName no-null), el partido está "completo" y se puede
 * pronosticar.
 */
export interface BracketMatch {
	/** ID único del match en el bracket (ej. "R32-1", "R32-13-B3") */
	id: string;
	/** Posición en el bracket (1-16) */
	position: number;
	slotA: BracketSlot;
	slotB: BracketSlot;
	/** `true` si ambos slots están resueltos */
	isComplete: boolean;
}

export interface KnockoutBracket {
	/** Nombre de la ronda: "Dieciseisavos de final" */
	roundName: string;
	matches: BracketMatch[];
	/** Cantidad de matches completos (ambos slots resueltos) */
	completedMatches: number;
	/** Total de matches (16 en Dieciseisavos) */
	totalMatches: number;
}

/**
 * ============================================================================
 * ESTRUCTURA DEL BRACKET (Mundial 2026 — formato simplificado)
 * ============================================================================
 *
 * El formato oficial FIFA 2026 con 48 equipos aún no está confirmado al 100%,
 * pero la estructura lógica es:
 * - 12 grupos (A-L) → 24 equipos (1° y 2° de cada uno)
 * - + 8 mejores terceros
 * - = 32 equipos en Dieciseisavos (16 partidos)
 *
 * En esta implementación usamos una **versión simplificada** del bracket:
 *
 * **Partidos 1-12**: 1° vs 2° de grupos adyacentes en pares (A-B, C-D, E-F, G-H, I-J, K-L)
 *   - Match 1: 1°A vs 2°B
 *   - Match 2: 1°B vs 2°A
 *   - Match 3: 1°C vs 2°D
 *   - Match 4: 1°D vs 2°C
 *   - ... etc
 *
 * **Partidos 13-16**: Mejores terceros emparejados en orden
 *   - Match 13: 3° #1 vs 3° #2
 *   - Match 14: 3° #3 vs 3° #4
 *   - Match 15: 3° #5 vs 3° #6
 *   - Match 16: 3° #7 vs 3° #8
 *
 * Esta es una simplificación pedagógica para visualizar cómo se va armando
 * el bracket en vivo. El bracket oficial FIFA tiene cruces específicos entre
 * grupos (ej. 1A vs 2C) que se pueden agregar en una iteración futura.
 *
 * ============================================================================
 *
 * @param groupTables - Array de 12 GroupTable (de `getGroupTables`)
 * @param bestThirds - Resultado de `calculateBestThirds(groupTables)`
 * @returns KnockoutBracket con 16 matches, cada uno con 2 slots
 */
export function resolveKnockoutMatchups(
	groupTables: GroupTable[],
	bestThirds: BestThirdsTable,
): KnockoutBracket {
	// Helper: extrae el equipo N°X de un grupo (índice X-1 en standings)
	function getNthPlace(
		group: GroupTable | undefined,
		n: 1 | 2 | 3,
	): BracketSlot {
		if (!group) {
			return {
				slotType: n === 3 ? "best3rd" : n === 1 ? "1st" : "2nd",
				groupLetter: null,
				bestThirdRank: null,
				teamName: null,
				teamLogo: null,
				isLive: false,
			};
		}
		const team = group.standings[n - 1];
		return {
			slotType: n === 3 ? "best3rd" : n === 1 ? "1st" : "2nd",
			groupLetter: group.groupLetter,
			bestThirdRank: null,
			teamName: team?.teamName ?? null,
			teamLogo: team?.logo ?? null,
			isLive: team?.isLive ?? false,
		};
	}

	// Helper: extrae el N-ésimo mejor tercero
	function getNthBestThird(rank: number): BracketSlot {
		const team = bestThirds.standings[rank - 1];
		return {
			slotType: "best3rd",
			groupLetter: team?.groupLetter ?? null,
			bestThirdRank: rank,
			teamName: team?.teamName ?? null,
			teamLogo: team?.logo ?? null,
			isLive: team?.isLive ?? false,
		};
	}

	// Helper: agrupa por letras
	const groupByLetter: Record<string, GroupTable> = {};
	for (const g of groupTables) {
		groupByLetter[g.groupLetter] = g;
	}

	// Helper: crea un match
	function makeMatch(
		position: number,
		slotA: BracketSlot,
		slotB: BracketSlot,
	): BracketMatch {
		return {
			id: `R32-${position}`,
			position,
			slotA,
			slotB,
			isComplete: slotA.teamName !== null && slotB.teamName !== null,
		};
	}

	const matches: BracketMatch[] = [];

	// Matches 1-12: 1° vs 2° de grupos adyacentes (pares: AB, CD, EF, GH, IJ, KL)
	const pairs: [string, string][] = [
		["A", "B"],
		["C", "D"],
		["E", "F"],
		["G", "H"],
		["I", "J"],
		["K", "L"],
	];

	for (const [g1, g2] of pairs) {
		const group1 = groupByLetter[g1];
		const group2 = groupByLetter[g2];

		// Match N: 1°G1 vs 2°G2
		matches.push(
			makeMatch(
				matches.length + 1,
				getNthPlace(group1, 1),
				getNthPlace(group2, 2),
			),
		);

		// Match N+1: 1°G2 vs 2°G1
		matches.push(
			makeMatch(
				matches.length + 1,
				getNthPlace(group2, 1),
				getNthPlace(group1, 2),
			),
		);
	}

	// Matches 13-16: mejores terceros emparejados (1-2, 3-4, 5-6, 7-8)
	for (let i = 0; i < 4; i++) {
		const rankA = i * 2 + 1;
		const rankB = i * 2 + 2;
		matches.push(
			makeMatch(
				matches.length + 1,
				getNthBestThird(rankA),
				getNthBestThird(rankB),
			),
		);
	}

	const completedMatches = matches.filter((m) => m.isComplete).length;

	return {
		roundName: "Dieciseisavos de final",
		matches,
		completedMatches,
		totalMatches: matches.length,
	};
}

/**
 * Calcula las tablas de posiciones de los 12 grupos del Mundial 2026.
 *
 * ============================================================================
 * LÓGICA DE LIVE VS FINISHED
 * ============================================================================
 *
 * Partido `finished` (con score final):
 *   - PJ += 1, GF += score, GC += score rival, DG = GF - GC
 *   - PG/PE/PP += 1 (según resultado)
 *   - Pts += 3 (victoria) | 1 (empate) | 0 (derrota)
 *
 * Partido `live` (con score parcial):
 *   - PJ += 1, GF += score, GC += score rival, DG = GF - GC
 *   - PG/PE/PP NO se incrementa
 *   - Pts NO se incrementa
 *   - `isLive = true` para que la UI muestre "EN JUEGO"
 *
 * Esto evita que la tabla muestre puntos parciales que pueden revertirse
 * (un equipo puede ir 1-0 y perder 1-3). Los puntos se asignan solo cuando
 * el partido termina.
 *
 * ============================================================================
 * RESOLUCIÓN DE EQUIPOS
 * ============================================================================
 *
 * Para cada partido:
 * 1. Se prefiere `homeTeamCanonical` / `awayTeamCanonical` (server-side,
 *    populado por la Edge Function en UT-5).
 * 2. Si no están, se hace fuzzy match contra `BUILT_IN_TEAM_ALIASES`.
 * 3. Si no matchea, el partido se ignora (no se cuenta en la tabla).
 *
 * ============================================================================
 *
 * @param matches - Array de partidos del Mundial (típicamente de useMatches)
 * @returns Array de 12 tablas (ordenadas alfabéticamente A→L). Cada grupo
 *          tiene 4 standings ordenados por pts > dg > gf > nombre.
 */
export function getGroupTables(matches: WorldCupMatch[]): GroupTable[] {
	// 1. Inicializar los 12 grupos con sus 4 equipos
	const groupsMap: Record<string, Record<string, GroupTeamStanding>> = {};
	const liveMatchesByGroup: Record<string, Match[]> = {};

	for (const [groupName, teams] of Object.entries(WORLD_CUP_GROUPS_DEF)) {
		groupsMap[groupName] = {};
		liveMatchesByGroup[groupName] = [];
		for (const team of teams) {
			const flagCode = COUNTRY_FLAGS[team];
			groupsMap[groupName][team] = {
				teamName: team,
				logo: getFlagUrl(flagCode),
				pj: 0,
				pg: 0,
				pe: 0,
				pp: 0,
				gf: 0,
				gc: 0,
				dg: 0,
				pts: 0,
				isLive: false,
			};
		}
	}

	// 2. Procesar cada partido
	for (const match of matches) {
		if (isKnockoutMatch(match)) continue;

		// 2a. Determinar grupo
		//     Prioridad: match.groupLetter (server-side) → parsear stageName
		let groupName: string | null = null;
		if (match.groupLetter) {
			groupName = `Grupo ${match.groupLetter.toUpperCase()}`;
		} else {
			const letter = getGroupLetterFromStage(match.stageName);
			if (letter) groupName = `Grupo ${letter}`;
		}

		if (!groupName || !groupsMap[groupName]) continue;

		// 2b. Resolver equipos
		//     Prioridad: homeTeamCanonical/awayTeamCanonical → fuzzy match
		const homeResolved = match.homeTeamCanonical
			? findCanonicalTeam(match.homeTeamCanonical)
			: findCanonicalTeam(match.homeTeam);
		const awayResolved = match.awayTeamCanonical
			? findCanonicalTeam(match.awayTeamCanonical)
			: findCanonicalTeam(match.awayTeam);

		if (!homeResolved || !awayResolved) continue;

		const homeStanding = groupsMap[groupName][homeResolved.canonicalName];
		const awayStanding = groupsMap[groupName][awayResolved.canonicalName];

		if (!homeStanding || !awayStanding) continue;

		// 2c. Update logos si la API los trae y no tenemos todavía
		if (match.homeLogo && !homeStanding.logo) {
			homeStanding.logo = match.homeLogo;
		}
		if (match.awayLogo && !awayStanding.logo) {
			awayStanding.logo = match.awayLogo;
		}

		// 2d. Aplicar stats según status
		if (
			(match.status === "finished" || match.status === "live") &&
			match.homeScore !== null &&
			match.awayScore !== null
		) {
			const hs = match.homeScore;
			const as = match.awayScore;

			// Común a finished y live: PJ, GF, GC, DG
			homeStanding.pj += 1;
			awayStanding.pj += 1;
			homeStanding.gf += hs;
			homeStanding.gc += as;
			awayStanding.gf += as;
			awayStanding.gc += hs;
			homeStanding.dg = homeStanding.gf - homeStanding.gc;
			awayStanding.dg = awayStanding.gf - awayStanding.gc;

			if (match.status === "finished") {
				// Solo finished: PG/PE/PP, Pts
				if (hs > as) {
					homeStanding.pg += 1;
					homeStanding.pts += 3;
					awayStanding.pp += 1;
				} else if (hs < as) {
					awayStanding.pg += 1;
					awayStanding.pts += 3;
					homeStanding.pp += 1;
				} else {
					homeStanding.pe += 1;
					awayStanding.pe += 1;
					homeStanding.pts += 1;
					awayStanding.pts += 1;
				}
			} else {
				// Solo live: marcar como en juego + agregar a liveMatches
				homeStanding.isLive = true;
				awayStanding.isLive = true;
				liveMatchesByGroup[groupName].push(match);
			}
		}
	}

	// 3. Ordenar standings y construir resultado
	const groupTables: GroupTable[] = Object.keys(groupsMap).map((groupName) => {
		const standings = Object.values(groupsMap[groupName]).sort((a, b) => {
			if (b.pts !== a.pts) return b.pts - a.pts;
			if (b.dg !== a.dg) return b.dg - a.dg;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.teamName.localeCompare(b.teamName);
		});

		return {
			groupName,
			groupLetter: groupName.replace("Grupo ", ""),
			standings,
			liveMatches: liveMatchesByGroup[groupName],
		};
	});

	return groupTables.sort((a, b) => a.groupName.localeCompare(b.groupName));
}
