/**
 * Type declarations for `scripts/lib/parse-changelog.mjs`.
 *
 * El módulo es JavaScript puro (ESM, `.mjs`) para ser ejecutable con Node
 * sin compilar. Este archivo `.d.mts` provee las declaraciones de tipo
 * para que TypeScript pueda importarlo desde `vite.config.ts` y desde
 * cualquier otro archivo TS.
 *
 * El nombre de archivo debe matchear exactamente con el `.mjs` original
 * (mismo basename, extensión `.d.mts` en vez de `.mjs`).
 */

export interface ChangelogEntry {
	/** Tag de la entrada: 'Released' si ya se liberó, 'Unreleased' si está pendiente. */
	tag: "Released" | "Unreleased";
	/** Título completo de la entrada (sin el prefijo `## [Tag] —`). */
	title: string;
	/** Cuerpo de la entrada (todo lo que está debajo del `##` hasta la próxima entrada). */
	body: string;
}

/**
 * Extrae la entrada más reciente de un CHANGELOG en formato Keep a Changelog.
 * Prioriza [Released] sobre [Unreleased]. Devuelve `null` si no hay entradas.
 */
export function extractLatestEntry(changelogText: string): ChangelogEntry | null;

/**
 * Genera un resumen CORTO (≤ ~140 chars) del body de una entrada, apto
 * para el `changelog` del `version.json` (que el UpdateBanner muestra
 * con `truncate`).
 */
export function summarizeChangelog(body: string): string;

/**
 * Devuelve el título "limpio" de una entrada (sin el prefijo [Released] —).
 */
export function cleanTitle(rawTitle: string): string;
