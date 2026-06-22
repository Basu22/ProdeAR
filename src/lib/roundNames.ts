/**
 * `roundNames` — Normalización de nombres de ronda eliminatoria.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * API-Football devuelve `stageName` en distintos formatos:
 * - Inglés: "Round of 32", "Quarter-finals", "Semi-finals", "Final", "Third Place"
 * - Español: "Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Tercer Puesto"
 *
 * Esta utility mapea cualquier string a una **abreviatura canónica** que
 * usamos en el código y en la UI:
 *
 *   R32  → 16vos de final (Dieciseisavos)
 *   R16  → 8vos de final  (Octavos)
 *   QF   → 4tos de final  (Cuartos)
 *   SF   → Semifinal
 *   F    → Final
 *   3RD  → Partido por el 3er puesto
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```ts
 * normalizeRoundName("Round of 32")  // → "R32"
 * normalizeRoundName("Quarter-finals") // → "QF"
 * normalizeRoundName("Final")          // → "F"
 * normalizeRoundName("Tercer Puesto")  // → "3RD"
 * normalizeRoundName("Unknown")        // → null
 * ```
 *
 * @module lib/roundNames
 */

/**
 * Abreviatura canónica de una ronda eliminatoria.
 * - "R32"  = 16vos de final (Round of 32 / Dieciseisavos)
 * - "R16"  = 8vos de final  (Round of 16 / Octavos)
 * - "QF"   = 4tos de final  (Quarter-finals / Cuartos)
 * - "SF"   = Semifinal
 * - "F"    = Final
 * - "3RD"  = Partido por el 3er puesto (Third Place)
 */
export type RoundAbbreviation = "R32" | "R16" | "QF" | "SF" | "F" | "3RD";

/**
 * Mapa de patrones (lowercase) → abreviatura canónica.
 *
 * El orden importa: patrones más específicos van primero.
 * Cada patrón se busca como substring dentro del `stageName` normalizado.
 */
const ROUND_PATTERNS: ReadonlyArray<readonly [string, RoundAbbreviation]> = [
	// Partido por el 3er puesto (chequear ANTES de "final" porque "Third Place" no contiene "final")
	["third place", "3RD"],
	["tercer puesto", "3RD"],
	// 16vos / Dieciseisavos
	["round of 32", "R32"],
	["dieciseisavos", "R32"],
	["32vos", "R32"],
	// 8vos / Octavos
	["round of 16", "R16"],
	["octavos", "R16"],
	["16vos", "R16"],
	// 4tos / Cuartos
	["quarter-finals", "QF"],
	["quarter finals", "QF"],
	["cuartos", "QF"],
	["4tos", "QF"],
	// Semifinal
	["semi-finals", "SF"],
	["semi finals", "SF"],
	["semifinal", "SF"],
	// Final (chequear al final porque "Third Place" también tiene "place" pero ya fue filtrado)
	["final", "F"],
];

/**
 * Normaliza un `stageName` de la API a una abreviatura canónica.
 *
 * Matching: case-insensitive, substring match (no exacto). Esto cubre
 * variaciones como "Quarter-finals", "quarter-finals", "QUARTER FINALS", etc.
 *
 * @param stageName - String crudo de `match.stageName`
 * @returns La abreviatura canónica, o `null` si no matchea ninguna ronda conocida.
 */
export function normalizeRoundName(
	stageName: string | null | undefined,
): RoundAbbreviation | null {
	if (!stageName || !stageName.trim()) return null;
	const normalized = stageName.toLowerCase().trim();
	for (const [pattern, abbr] of ROUND_PATTERNS) {
		if (normalized.includes(pattern)) {
			return abbr;
		}
	}
	return null;
}
