/**
 * Helpers para construir URLs directas al CDN de API-Sports.
 * Estas URLs siguen patterns predecibles y NO requieren segunda llamada a la API
 * (los endpoints de /fixtures/lineups y /fixtures/players ya las devuelven completas,
 * pero podemos construirlas a mano si solo tenemos el ID).
 *
 * Documentación de referencia: docs/API_FOOTBALL_REFERENCE.md §10
 */

const CDN_BASE = "https://media.api-sports.io/football";

/** Logo de liga (~200×200 PNG) */
export const leagueLogoUrl = (id: number): string =>
	`${CDN_BASE}/leagues/${id}.png`;

/** Logo de equipo (~200×200 PNG) */
export const teamLogoUrl = (id: number): string =>
	`${CDN_BASE}/teams/${id}.png`;

/**
 * Foto de jugador (~150×200 PNG, headshot/busto).
 * El campo `player.photo` del endpoint /fixtures/players ya viene con esta URL.
 */
export const playerPhotoUrl = (id: number): string =>
	`${CDN_BASE}/players/${id}.png`;

/**
 * Foto de coach (~200×200 PNG).
 * ⚠️ "coachs" es typo oficial de API-Football (debería ser "coaches").
 */
export const coachPhotoUrl = (id: number): string =>
	`${CDN_BASE}/coachs/${id}.png`;

/** Imagen de venue/estadio (~800×600 PNG) */
export const venueImageUrl = (id: number): string =>
	`${CDN_BASE}/venues/${id}.png`;

/**
 * Bandera de país (formato SVG, no PNG).
 * ⚠️ Usa `code` (GB, FR, AR) en `.svg`, no `.png`.
 * El `code` se debe pasar en minúsculas.
 */
export const countryFlagUrl = (code: string): string =>
	`https://media.api-sports.io/flags/${code.toLowerCase()}.svg`;
