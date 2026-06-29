#!/usr/bin/env node
/**
 * scripts/sync-version.mjs
 *
 * Regenera `public/version.json` desde:
 *   - `version` de `package.json` (SemVer)
 *   - Entrada [Released] (o fallback [Unreleased]) más reciente de `CHANGELOG.md`
 *
 * Es la SINGLE SOURCE OF TRUTH del `version.json`. Lo usan:
 *   - El subagente @release-manager después de bumpear versión
 *   - `vite.config.ts` (vía la misma lib, durante el build)
 *   - `npm run version:sync` (uso manual)
 *
 * Uso:
 *   node scripts/sync-version.mjs
 *   npm run version:sync
 *
 * Salida:
 *   ✅ Escribe public/version.json
 *   📋 Loggea en consola qué se leyó de dónde
 *
 * Exit codes:
 *   0 = OK
 *   1 = Falta package.json, CHANGELOG.md, o entrada en CHANGELOG
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractLatestEntry, summarizeChangelog } from "./lib/parse-changelog.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const pkgPath = resolve(PROJECT_ROOT, "package.json");
const changelogPath = resolve(PROJECT_ROOT, "CHANGELOG.md");
const versionJsonPath = resolve(PROJECT_ROOT, "public", "version.json");

// ── Validaciones previas ────────────────────────────────────────────

if (!existsSync(pkgPath)) {
	console.error(`❌ No se encontró package.json en ${pkgPath}`);
	process.exit(1);
}

if (!existsSync(changelogPath)) {
	console.error(`❌ No se encontró CHANGELOG.md en ${changelogPath}`);
	process.exit(1);
}

// ── Lectura ─────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const changelog = readFileSync(changelogPath, "utf-8");

// ── Extracción del changelog ────────────────────────────────────────

const entry = extractLatestEntry(changelog);
if (!entry) {
	console.error(
		"❌ CHANGELOG.md no tiene ninguna entrada [Released] ni [Unreleased].",
	);
	console.error(
		"   Agregá una entrada con formato '## [Unreleased] — Título' antes de continuar.",
	);
	process.exit(1);
}

const summary = summarizeChangelog(entry.body);
if (!summary) {
	console.warn(
		`⚠️  La entrada [${entry.tag}] "${entry.title}" tiene el body vacío.`,
	);
	console.warn(
		"   version.json se generará con changelog vacío. Recomendamos agregar al menos 1 bullet.",
	);
}

// ── Generación ──────────────────────────────────────────────────────

const versionData = {
	version: pkg.version,
	buildTime: new Date().toISOString(),
	minSupportedVersion: pkg.version,
	forceUpdate: false,
	changelog: summary,
};

writeFileSync(
	versionJsonPath,
	`${JSON.stringify(versionData, null, 2)}\n`,
);

// ── Output ──────────────────────────────────────────────────────────

const changelogPreview =
	summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;

console.log("✅ public/version.json regenerado:");
console.log(`   version:    ${versionData.version}`);
console.log(`   buildTime:  ${versionData.buildTime}`);
console.log(`   changelog:  ${changelogPreview}`);
console.log(
	`   source:     Entrada [${entry.tag}] "${entry.title}" de CHANGELOG.md`,
);
