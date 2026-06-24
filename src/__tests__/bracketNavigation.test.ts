/**
 * Tests para `src/lib/bracketNavigation.ts`.
 *
 * Sprint 5C: lógica pura de navegación entre rondas del bracket.
 * Cubre todos los casos de habilitación de flechas + estado de 3RD.
 */

import { describe, expect, it } from "vitest";
import {
	getProgressPills,
	getRoundLabel,
	getRoundNavigatorState,
	getRoundShortLabel,
} from "../lib/bracketNavigation";
import type { RoundAbbreviation } from "../lib/roundNames";

describe("getRoundNavigatorState", () => {
	it("16vos (R32): flecha izquierda deshabilitada, derecha → 8vos", () => {
		const state = getRoundNavigatorState("R32");
		expect(state.current).toBe("R32");
		expect(state.currentIndex).toBe(0);
		expect(state.left.enabled).toBe(false);
		expect(state.left.target).toBeNull();
		expect(state.left.label).toBe("Primera ronda");
		expect(state.right.enabled).toBe(true);
		expect(state.right.target).toBe("R16");
		expect(state.right.label).toBe("Ronda siguiente: 8vos de final");
	});

	it("8vos (R16): ambas flechas habilitadas (← R32, → QF)", () => {
		const state = getRoundNavigatorState("R16");
		expect(state.currentIndex).toBe(1);
		expect(state.left.enabled).toBe(true);
		expect(state.left.target).toBe("R32");
		expect(state.right.enabled).toBe(true);
		expect(state.right.target).toBe("QF");
	});

	it("4tos (QF): ambas flechas habilitadas (← R16, → SF)", () => {
		const state = getRoundNavigatorState("QF");
		expect(state.currentIndex).toBe(2);
		expect(state.left.target).toBe("R16");
		expect(state.right.target).toBe("SF");
	});

	it("Semis (SF): ambas flechas habilitadas (← QF, → F)", () => {
		const state = getRoundNavigatorState("SF");
		expect(state.currentIndex).toBe(3);
		expect(state.left.target).toBe("QF");
		expect(state.right.target).toBe("F");
	});

	it("Final (F): flecha izquierda habilitada, derecha deshabilitada", () => {
		const state = getRoundNavigatorState("F");
		expect(state.currentIndex).toBe(4);
		expect(state.left.enabled).toBe(true);
		expect(state.left.target).toBe("SF");
		expect(state.right.enabled).toBe(false);
		expect(state.right.target).toBeNull();
		expect(state.right.label).toBe("Última ronda");
	});

	it("3er Puesto (3RD): solo flecha izquierda habilitada (→ SF)", () => {
		const state = getRoundNavigatorState("3RD");
		expect(state.isThirdPlace).toBe(true);
		expect(state.currentIndex).toBe(-1);
		expect(state.left.enabled).toBe(true);
		expect(state.left.target).toBe("SF");
		expect(state.right.enabled).toBe(false);
	});

	it("totalRounds siempre es 5 (R32, R16, QF, SF, F)", () => {
		const states: RoundAbbreviation[] = ["R32", "R16", "QF", "SF", "F", "3RD"];
		for (const r of states) {
			expect(getRoundNavigatorState(r).totalRounds).toBe(5);
		}
	});
});

describe("getProgressPills", () => {
	it("retorna 5 pills en orden: 16vos, 8vos, 4tos, Semis, Final", () => {
		const pills = getProgressPills();
		expect(pills).toHaveLength(5);
		expect(pills.map((p) => p.abbr)).toEqual(["R32", "R16", "QF", "SF", "F"]);
		expect(pills[0]?.short).toBe("16vos");
		expect(pills[1]?.short).toBe("8vos");
		expect(pills[2]?.short).toBe("4tos");
		expect(pills[3]?.short).toBe("Semis");
		expect(pills[4]?.short).toBe("Final");
	});
});

describe("getRoundLabel / getRoundShortLabel", () => {
	it("getRoundLabel retorna el label completo en español", () => {
		expect(getRoundLabel("R32")).toBe("16vos de final");
		expect(getRoundLabel("R16")).toBe("8vos de final");
		expect(getRoundLabel("QF")).toBe("4tos de final");
		expect(getRoundLabel("SF")).toBe("Semifinal");
		expect(getRoundLabel("F")).toBe("Final");
		expect(getRoundLabel("3RD")).toBe("Tercer Puesto");
	});

	it("getRoundShortLabel retorna el label corto", () => {
		expect(getRoundShortLabel("R32")).toBe("16vos");
		expect(getRoundShortLabel("3RD")).toBe("3er Puesto");
	});
});
