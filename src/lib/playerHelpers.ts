import type { PlayerPhoto, TeamLineup, TacticalPlayerInfo } from "./types";

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
