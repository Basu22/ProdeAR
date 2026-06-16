import type { PlayerPhoto, TacticalPlayerInfo, TeamLineup } from "./types";

/**
 * Construye un Map<player_id, photo_url> para lookups O(1).
 * Sprint 2: helper puro para enriquecer lineups con fotos de jugadores.
 */
export function buildPhotoMap(
	photos: PlayerPhoto[] | null | undefined,
): Map<number, string> {
	const map = new Map<number, string>();
	if (!photos || photos.length === 0) return map;
	for (const p of photos) {
		if (p.player_id && p.photo) {
			map.set(p.player_id, p.photo);
		}
	}
	return map;
}

/**
 * Lookup O(n) simple para un player_id.
 * Preferir `buildPhotoMap()` si se hacen muchos lookups.
 */
export function getPlayerPhoto(
	playerId: number,
	photos: PlayerPhoto[] | null | undefined,
): string | null {
	if (!photos || photos.length === 0) return null;
	const entry = photos.find((p) => p.player_id === playerId);
	return entry?.photo ?? null;
}

/**
 * Enriquece los lineups con las fotos de los jugadores.
 * Devuelve un nuevo array de lineups (no muta el input).
 *
 * Si `lineups` es null/undefined/array vacío, retorna null.
 * Si `photos` es null/undefined/array vacío, retorna los lineups sin modificar.
 */
export function enrichLineupsWithPhotos(
	lineups: TeamLineup[] | null | undefined,
	photos: PlayerPhoto[] | null | undefined,
): TeamLineup[] | null {
	if (!lineups || lineups.length === 0) return null;
	if (!photos || photos.length === 0) return lineups;

	const photoMap = buildPhotoMap(photos);

	return lineups.map((lineup) => ({
		...lineup,
		startXI: enrichPlayers(lineup.startXI, photoMap),
		substitutes: enrichPlayers(lineup.substitutes, photoMap),
	}));
}

function enrichPlayers(
	players: TacticalPlayerInfo[],
	photoMap: Map<number, string>,
): TacticalPlayerInfo[] {
	return players.map((p) => {
		const photo = photoMap.get(p.player.id) ?? p.player.photo ?? null;
		return {
			...p,
			player: { ...p.player, photo },
		};
	});
}

/**
 * Genera iniciales a partir del nombre del jugador para usar como fallback
 * en el avatar (cuando no hay foto disponible).
 * Ej: "Lautaro Martínez" → "LM", "Ederson" → "E"
 */
export function getPlayerInitials(name: string): string {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) {
		return parts[0].substring(0, 1).toUpperCase();
	}
	// Primera letra del primer nombre + primera letra del último apellido
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normaliza un nombre de jugador para comparación insensible a acentos,
 * mayúsculas y espacios extra. Usado por `resolvePlayerPhoto` para
 * matchear nombres de jugadores (subs o cualquier evento) contra lineups
 * (la API a veces devuelve "Martínez" vs "Martinez" o tiene espacios duplicados).
 *
 * - Lowercase
 * - NFD + strip combining marks (descompone "á" → "a" + combining acute)
 * - Trim + colapsa whitespace múltiple a 1 espacio
 * - null/undefined/"" → ""
 */
export function normalizePlayerName(name: string | null | undefined): string {
	if (!name) return "";
	return name
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.replace(/\s+/g, " ");
}

/**
 * Resuelve la URL de la foto de un jugador (cualquier evento: gol, tarjeta,
 * substitution, etc.).
 *
 * Como `MatchEvent` y `SubPair` no tienen `playerId` (solo `name`),
 * hacemos bridge en 3 pasos:
 * 1. Matchear `name` normalizado contra `match.lineups[].startXI` o `.substitutes`
 *    (con fuzzy match Levenshtein ≤ 2 como fallback para nombres con
 *    abreviaciones o typos de la API, ej. "A. Martial" vs "Anthony Martial")
 * 2. Con el ID del lineup, buscar en `match.playerPhotos`
 * 3. Fallback al `lineup.player.photo` (que también está enriquecido por
 *    `enrichLineupsWithPhotos`, así que es una segunda fuente válida)
 *
 * Si todo falla, retorna null → la UI debe mostrar iniciales.
 *
 * @param lookup.name nombre del jugador (playerName del MatchEvent o
 *   playerOut/playerIn del SubPair)
 * @param lookup.team "home" o "away" (determina qué lineup buscar)
 * @param lineups array de lineups del match (home = lineups[0], away = lineups[1])
 * @param photos array de playerPhotos del match
 */
export function resolvePlayerPhoto(
	lookup: { name: string; team: "home" | "away" },
	lineups: TeamLineup[] | null | undefined,
	photos: PlayerPhoto[] | null | undefined,
): string | null {
	if (!lookup.name) return null;
	if (!lineups || lineups.length < 2) return null;

	const lineup = lookup.team === "home" ? lineups[0] : lineups[1];
	if (!lineup) return null;

	const normalized = normalizePlayerName(lookup.name);
	if (!normalized) return null;

	// Buscar primero en titulares, luego en suplentes
	const allPlayers = [...lineup.startXI, ...lineup.substitutes];

	// Paso 1: match exacto (normalizado)
	let matched: TacticalPlayerInfo | null =
		allPlayers.find((p) => normalizePlayerName(p.player.name) === normalized) ??
		null;

	// Paso 1b: fallback fuzzy (Levenshtein ≤ 2) para nombres con
	// abreviaciones o typos de la API. Acepta hasta 2 caracteres de diferencia.
	if (!matched) {
		matched = findClosestPlayerByName(normalized, allPlayers, 2);
	}

	if (!matched) return null;

	// Paso 2: lookup en playerPhotos por ID
	const photoFromPhotos = photos
		? getPlayerPhoto(matched.player.id, photos)
		: null;
	if (photoFromPhotos) return photoFromPhotos;

	// Paso 3: fallback al photo del lineup mismo (si fue enriquecido)
	return matched.player.photo ?? null;
}

/**
 * Encuentra el jugador más cercano por nombre usando distancia Levenshtein.
 * Retorna el primer match con distancia ≤ maxDistance, o null.
 *
 * Usado como fallback de `resolvePlayerPhoto` cuando el match exacto
 * falla. La API de API-Football es inconsistente con abreviaciones:
 * "A. Martial" vs "Anthony Martial", "D. SÁNCHEZ" vs "David Sánchez", etc.
 */
function findClosestPlayerByName(
	normalizedLookup: string,
	players: TacticalPlayerInfo[],
	maxDistance: number,
): TacticalPlayerInfo | null {
	let bestMatch: TacticalPlayerInfo | null = null;
	let bestDistance = Infinity;

	for (const p of players) {
		const normalizedName = normalizePlayerName(p.player.name);
		if (!normalizedName) continue;

		const distance = levenshtein(normalizedName, normalizedLookup);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestMatch = p;
		}
	}

	return bestDistance <= maxDistance ? bestMatch : null;
}

/**
 * Distancia Levenshtein (edit distance) entre dos strings.
 * Mide el número mínimo de ediciones (insert/delete/substitute) para
 * convertir `a` en `b`. Usado por el fuzzy match de substitutions.
 *
 * Performance: O(a.length * b.length) en tiempo y espacio.
 * Para nombres de jugadores (< 30 chars) y ≤ 16 jugadores por equipo,
 * es despreciable (< 1ms).
 */
function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Optimización: usar solo 2 filas en vez de matriz completa
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	let curr = new Array<number>(b.length + 1);

	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(
				prev[j] + 1, // deletion
				curr[j - 1] + 1, // insertion
				prev[j - 1] + cost, // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[b.length];
}
