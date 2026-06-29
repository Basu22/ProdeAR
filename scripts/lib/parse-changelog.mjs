#!/usr/bin/env node
/**
 * scripts/lib/parse-changelog.mjs
 *
 * Funciones PURAS para parsear CHANGELOG.md en formato Keep a Changelog.
 * No hace I/O: recibe strings, devuelve strings/objects.
 *
 * Single source of truth para extraer changelogs en ProdeAR. Usado por:
 *   - scripts/sync-version.mjs (regenera public/version.json)
 *   - vite.config.ts (plugin versionJsonPlugin en build)
 *   - subagente @release-manager
 *
 * Convenciones que asume del CHANGELOG.md:
 *   - Entradas de nivel 2 (##) con formato `## [Tag] — Título (meta)`
 *     donde Tag ∈ {Released, Unreleased}
 *   - Subsecciones de nivel 3 (###) con formato `### Added | Changed | Fixed | Internal | Breaking changes`
 *   - Bullets con `-` o `*` al inicio de línea
 */

const ENTRY_HEADER_REGEX = /^## \[(Released|Unreleased)\]\s*—\s*(.+)$/;
const BULLET_REGEX = /^[-*]\s+(.+)$/;

/**
 * Extrae la entrada más reciente de un CHANGELOG en formato Keep a Changelog.
 * Prioridad:
 *   1. La primera entrada ## [Released] que aparezca (es la más reciente porque
 *      el CHANGELOG está en orden cronológico inverso: newest first).
 *   2. Si no hay [Released], devuelve la primera [Unreleased].
 *   3. Si tampoco hay, devuelve null.
 *
 * @param {string} changelogText - Contenido completo de CHANGELOG.md
 * @returns {{ tag: 'Released'|'Unreleased', title: string, body: string } | null}
 *
 * @example
 *   const entry = extractLatestEntry(changelog);
 *   if (entry?.tag === 'Released') {
 *     console.log(entry.title); // "Sprint Penales 2026 (commit 81a1b23, 2026-06-28)"
 *   }
 */
export function extractLatestEntry(changelogText) {
	if (!changelogText || typeof changelogText !== "string") return null;

	const lines = changelogText.split("\n");
	const entries = [];
	let current = null;

	for (const line of lines) {
		const match = line.match(ENTRY_HEADER_REGEX);
		if (match) {
			if (current) entries.push(current);
			current = {
				tag: /** @type {'Released'|'Unreleased'} */ (match[1]),
				title: match[2].trim(),
				body: "",
			};
		} else if (current !== null) {
			current.body += `${line}\n`;
		}
	}
	if (current) entries.push(current);

	// Prioridad 1: la primera [Released] (en orden de aparición = más reciente)
	const released = entries.find((e) => e.tag === "Released");
	if (released) return released;

	// Prioridad 2: fallback a [Unreleased]
	const unreleased = entries.find((e) => e.tag === "Unreleased");
	if (unreleased) return unreleased;

	return null;
}

/**
 * Genera un resumen CORTO (1 línea, ≤ ~140 chars) del body de una entrada,
 * apto para mostrar en el UpdateBanner (que tiene `truncate`).
 *
 * Estrategia:
 *   1. Si hay bullets con emoji (🆕 🔄 🐛 🔧 🧪 ⚠️ etc.) en cualquier
 *      subsección Added/Changed/Fixed/Internal/Breaking, devolver la
 *      concatenación de los primeros 3 bullets.
 *   2. Si no hay bullets pero el body tiene líneas con texto, devolver
 *      las primeras 2 líneas no vacías (sin markdown).
 *   3. Si todo está vacío, devolver string vacío.
 *
 * @param {string} body - El cuerpo (sin el título `##`) de la entrada
 * @returns {string} - Resumen corto, idealmente 1 línea
 */
export function summarizeChangelog(body) {
	if (!body || typeof body !== "string") return "";

	const bullets = [];
	const bulletRe = new RegExp(BULLET_REGEX, "gm");
	let m;
	while ((m = bulletRe.exec(body)) !== null) {
		const text = m[1].trim();
		// Filtrar bullets de subsección (### Added, ### Changed, etc.) por si
		// accidentalmente matchean. La regex ya excluye esos porque el `###`
		// no empieza con `-` o `*`, pero por las dudas:
		if (text.startsWith("#")) continue;
		bullets.push(text);
	}

	if (bullets.length > 0) {
		// Tomar hasta 3 bullets representativos y unirlos con " • "
		const summary = bullets.slice(0, 3).join(" • ");
		// Truncar a 140 chars con elipsis si fuera necesario
		return summary.length > 140 ? `${summary.slice(0, 137)}...` : summary;
	}

	// Fallback: primeras 2 líneas no vacías del body (sin markdown markers)
	const lines = body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith("#"));
	const fallback = lines.slice(0, 2).join(" • ");
	return fallback.length > 140 ? `${fallback.slice(0, 137)}...` : fallback;
}

/**
 * Devuelve el título "limpio" de una entrada (sin el prefijo [Released] —).
 * Útil para construir el campo `title` de RELEASES.md.
 *
 * @param {string} rawTitle - El título tal como viene del CHANGELOG (ej: "Sprint Penales 2026 (commit 81a1b23, 2026-06-28)")
 * @returns {string} - El título limpio
 */
export function cleanTitle(rawTitle) {
	if (!rawTitle) return "";
	return rawTitle.trim();
}
