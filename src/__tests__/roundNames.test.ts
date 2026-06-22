/**
 * Tests para `src/lib/roundNames.ts`.
 *
 * Sprint 1 — TDD rojo. El módulo `roundNames.ts` aún NO existe.
 * Estos tests fallan hasta que se implemente la función `normalizeRoundName`.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * - Round of 32  → R32   (Dieciseisavos / 16vos)
 * - Round of 16  → R16   (Octavos / 8vos)
 * - Quarter-finals → QF  (Cuartos / 4tos)
 * - Semi-finals    → SF  (Semifinal)
 * - Final          → F
 * - Third Place    → 3RD (Tercer Puesto)
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import { normalizeRoundName } from "../lib/roundNames";

describe("normalizeRoundName", () => {
	it("normalizes 'Round of 32' to 'R32' (English, 16vos)", () => {
		expect(normalizeRoundName("Round of 32")).toBe("R32");
	});

	it("normalizes 'Round of 16' to 'R16' (English, 8vos)", () => {
		expect(normalizeRoundName("Round of 16")).toBe("R16");
	});

	it("normalizes 'Quarter-finals' to 'QF' (English, 4tos)", () => {
		expect(normalizeRoundName("Quarter-finals")).toBe("QF");
	});

	it("normalizes 'Semi-finals' to 'SF' (English, semis)", () => {
		expect(normalizeRoundName("Semi-finals")).toBe("SF");
	});

	it("normalizes 'Final' to 'F'", () => {
		expect(normalizeRoundName("Final")).toBe("F");
	});

	it("normalizes 'Third Place' to '3RD'", () => {
		expect(normalizeRoundName("Third Place")).toBe("3RD");
	});
});
