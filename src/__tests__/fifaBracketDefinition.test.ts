/**
 * Tests para `src/lib/fifaBracketDefinition.ts`.
 *
 * ============================================================================
 * FUENTE ÚNICA DE VERDAD — BRACKET OFICIAL FIFA 2026
 * ============================================================================
 * Estos tests validan que la definición estática del bracket coincide con la
 * numeración oficial FIFA (M73-M104) y que las 495 combinaciones de mejores
 * terceros son consistentes (todas únicas, todas en pools válidos, etc.).
 *
 * Si la FIFA cambiara el formato (cosa que NO va a pasar post-draw), estos
 * tests serían el primer lugar a actualizar.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * 1. Estructura: cantidad de entradas, números FIFA, bracketIds
 * 2. Invariantes: tipos de cruce (2°vs2°, 1°vs2°, 1°vs3°), pools, grupos
 * 3. Helpers: buildBestThirdsKey, decodeBestThirdsKey, resolveBestThirdsAssignment
 * 4. Las 495 combinaciones: unicidad, validez, completitud
 * 5. Helpers de búsqueda: getR32MatchByBracketId, getR32MatchByFifaNumber
 * 6. Property-based: para cualquier combinación de 8 grupos, hay una entry
 *
 * @module __tests__/fifaBracketDefinition
 */

import { describe, expect, it } from "vitest";
import {
	ALL_GROUP_LETTERS,
	BEST_THIRDS_COMBINATIONS,
	BEST_THIRDS_COMBINATIONS_COUNT,
	type BestThirdsAssignment,
	buildBestThirdsKey,
	decodeBestThirdsKey,
	FIFA_BEST_THIRD_POOLS,
	FIFA_FINAL,
	FIFA_MATCH_NUMBER_TO_BRACKET,
	FIFA_QF_MATCHUPS,
	FIFA_R16_MATCHUPS,
	FIFA_R32_MATCHUPS,
	FIFA_SF_MATCHUPS,
	FIFA_THIRD_PLACE,
	type GroupLetter,
	getR32MatchByBracketId,
	getR32MatchByFifaNumber,
	getThirdForFirstPlace,
	resolveBestThirdsAssignment,
} from "../lib/fifaBracketDefinition";

// ============================================================================
// HELPERS
// ============================================================================

/** Set de GroupLetter para checks rápidos de membresía. */
const ALL_GROUPS_SET: ReadonlySet<GroupLetter> = new Set(ALL_GROUP_LETTERS);

/** Helper: genera todas las combinaciones de 8 grupos de los 12 (C(12,8)=495). */
function* generateAll8GroupCombos(): Generator<GroupLetter[]> {
	const groups = ALL_GROUP_LETTERS;
	const n = groups.length;
	const k = 8;
	// Algoritmo: combinación lexicográfica
	const combo: number[] = Array.from({ length: k }, (_, i) => i);
	while (true) {
		yield combo.map((idx) => {
			const g = groups[idx];
			if (!g) throw new Error(`Unexpected: groups[${idx}] is undefined`);
			return g;
		});
		let i = k - 1;
		while (i >= 0 && combo[i] === n - k + i) i--;
		if (i < 0) return;
		const current = combo[i];
		if (current === undefined) return;
		combo[i] = current + 1;
		for (let j = i + 1; j < k; j++) {
			const prev = combo[j - 1];
			if (prev === undefined) return;
			combo[j] = prev + 1;
		}
	}
}

// ============================================================================
// ESTRUCTURA: R32 (M73-M88)
// ============================================================================

describe("FIFA_R32_MATCHUPS", () => {
	it("tiene exactamente 16 entradas", () => {
		expect(FIFA_R32_MATCHUPS).toHaveLength(16);
	});

	it("tiene los números FIFA 73-88 en orden ascendente", () => {
		const numbers = FIFA_R32_MATCHUPS.map((m) => m.fifaNumber);
		expect(numbers).toEqual([
			73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
		]);
	});

	it("tiene los bracketIds R32-1 a R32-16 en orden", () => {
		const ids = FIFA_R32_MATCHUPS.map((m) => m.bracketId);
		expect(ids).toEqual(Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`));
	});

	it("tiene slotA y slotB con group válido (A-L)", () => {
		for (const m of FIFA_R32_MATCHUPS) {
			expect(ALL_GROUPS_SET.has(m.slotA.group)).toBe(true);
			expect(ALL_GROUPS_SET.has(m.slotB.group)).toBe(true);
		}
	});

	it("los best3rd slots tienen bestThirdPool definido y no vacío", () => {
		for (const m of FIFA_R32_MATCHUPS) {
			if (m.slotA.slotType === "best3rd") {
				expect(m.slotA.bestThirdPool).toBeDefined();
				expect(m.slotA.bestThirdPool?.length).toBeGreaterThan(0);
			}
			if (m.slotB.slotType === "best3rd") {
				expect(m.slotB.bestThirdPool).toBeDefined();
				expect(m.slotB.bestThirdPool?.length).toBeGreaterThan(0);
			}
		}
	});

	it("no hay grupos repetidos dentro de un mismo partido", () => {
		for (const m of FIFA_R32_MATCHUPS) {
			expect(m.slotA.group).not.toBe(m.slotB.group);
		}
	});

	it("el bracketId se mapea al fifaNumber vía FIFA_MATCH_NUMBER_TO_BRACKET", () => {
		for (const m of FIFA_R32_MATCHUPS) {
			expect(FIFA_MATCH_NUMBER_TO_BRACKET[m.fifaNumber]).toBe(m.bracketId);
		}
		// Y la inversa
		for (const [fifaStr, bracket] of Object.entries(
			FIFA_MATCH_NUMBER_TO_BRACKET,
		)) {
			const found = FIFA_R32_MATCHUPS.find((m) => m.bracketId === bracket);
			expect(found).toBeDefined();
			expect(String(found?.fifaNumber)).toBe(fifaStr);
		}
	});
});

// ============================================================================
// INVARIANTES: tipos de cruce R32
// ============================================================================

describe("Tipos de cruce R32", () => {
	/** Filtra partidos por tipo de cruce y los cuenta. */
	function countByType(): {
		secondVsSecond: number;
		firstVsSecond: number;
		firstVsBest3rd: number;
	} {
		let secondVsSecond = 0;
		let firstVsSecond = 0;
		let firstVsBest3rd = 0;
		for (const m of FIFA_R32_MATCHUPS) {
			const a = m.slotA.slotType;
			const b = m.slotB.slotType;
			if (a === "2nd" && b === "2nd") secondVsSecond++;
			else if (a === "1st" && b === "2nd") firstVsSecond++;
			else if (a === "1st" && b === "best3rd") firstVsBest3rd++;
			else if (a === "2nd" && b === "1st") firstVsSecond++;
			else if (a === "best3rd" && b === "1st") firstVsBest3rd++;
			else {
				throw new Error(
					`Tipo de cruce no reconocido en M${m.fifaNumber}: ${a} vs ${b}`,
				);
			}
		}
		return { secondVsSecond, firstVsSecond, firstVsBest3rd };
	}

	it("4 partidos 2° vs 2°: M73, M78, M83, M88", () => {
		const secondVsSecond = FIFA_R32_MATCHUPS.filter(
			(m) => m.slotA.slotType === "2nd" && m.slotB.slotType === "2nd",
		);
		const fifaNumbers = secondVsSecond.map((m) => m.fifaNumber).sort();
		expect(fifaNumbers).toEqual([73, 78, 83, 88]);
	});

	it("4 partidos 1° vs 2°: M75, M76, M84, M86", () => {
		const firstVsSecond = FIFA_R32_MATCHUPS.filter((m) => {
			const types = [m.slotA.slotType, m.slotB.slotType].sort().join("-");
			return types === "1st-2nd";
		});
		const fifaNumbers = firstVsSecond.map((m) => m.fifaNumber).sort();
		expect(fifaNumbers).toEqual([75, 76, 84, 86]);
	});

	it("8 partidos 1° vs Best 3°: M74, M77, M79, M80, M81, M82, M85, M87", () => {
		const firstVsBest3rd = FIFA_R32_MATCHUPS.filter((m) => {
			const types = [m.slotA.slotType, m.slotB.slotType].sort().join("-");
			return types === "1st-best3rd";
		});
		const fifaNumbers = firstVsBest3rd.map((m) => m.fifaNumber).sort();
		expect(fifaNumbers).toEqual([74, 77, 79, 80, 81, 82, 85, 87]);
	});

	it("el conteo total suma 16 (4 + 4 + 8)", () => {
		const counts = countByType();
		expect(
			counts.secondVsSecond + counts.firstVsSecond + counts.firstVsBest3rd,
		).toBe(16);
	});

	it("los pools de Best 3° coinciden con FIFA_BEST_THIRD_POOLS", () => {
		const matchToPool: Record<number, keyof BestThirdsAssignment | null> = {
			74: "M74",
			77: "M77",
			79: "M79",
			80: "M80",
			81: "M81",
			82: "M82",
			85: "M85",
			87: "M87",
		};
		for (const m of FIFA_R32_MATCHUPS) {
			const expectedKey = matchToPool[m.fifaNumber];
			if (expectedKey) {
				const expectedPool = FIFA_BEST_THIRD_POOLS[expectedKey];
				// El best3rd slot es el de tipo "best3rd"
				const best3rdSlot = m.slotA.slotType === "best3rd" ? m.slotA : m.slotB;
				expect(best3rdSlot.bestThirdPool).toEqual(expectedPool);
			}
		}
	});
});

// ============================================================================
// ESTRUCTURA: rondas siguientes
// ============================================================================

describe("FIFA_R16_MATCHUPS", () => {
	it("tiene exactamente 8 entradas", () => {
		expect(FIFA_R16_MATCHUPS).toHaveLength(8);
	});

	it("tiene los números FIFA 89-96 en orden", () => {
		const numbers = FIFA_R16_MATCHUPS.map((m) => m.fifaNumber);
		expect(numbers).toEqual([89, 90, 91, 92, 93, 94, 95, 96]);
	});

	it("tiene los bracketIds R16-1 a R16-8 en orden", () => {
		const ids = FIFA_R16_MATCHUPS.map((m) => m.bracketId);
		expect(ids).toEqual(Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`));
	});

	it("todos los sourceMatch apuntan a R32 existentes", () => {
		const r32Ids = new Set(FIFA_R32_MATCHUPS.map((m) => m.bracketId));
		for (const m of FIFA_R16_MATCHUPS) {
			expect(r32Ids.has(m.sourceMatchA)).toBe(true);
			expect(r32Ids.has(m.sourceMatchB)).toBe(true);
		}
	});

	it("los R16 son los cruces oficiales: M73 vs M75, M74 vs M77, etc.", () => {
		const pairs: Array<[string, string]> = FIFA_R16_MATCHUPS.map((m) => [
			m.sourceMatchA,
			m.sourceMatchB,
		]);
		// M89 = W(M73) vs W(M75) → R32-1 vs R32-3
		expect(pairs[0]).toEqual(["R32-1", "R32-3"]);
		// M90 = W(M74) vs W(M77) → R32-2 vs R32-5
		expect(pairs[1]).toEqual(["R32-2", "R32-5"]);
		// M91 = W(M76) vs W(M78) → R32-4 vs R32-6
		expect(pairs[2]).toEqual(["R32-4", "R32-6"]);
		// M92 = W(M79) vs W(M80) → R32-7 vs R32-8
		expect(pairs[3]).toEqual(["R32-7", "R32-8"]);
		// M93 = W(M83) vs W(M84) → R32-11 vs R32-12
		expect(pairs[4]).toEqual(["R32-11", "R32-12"]);
		// M94 = W(M81) vs W(M82) → R32-9 vs R32-10
		expect(pairs[5]).toEqual(["R32-9", "R32-10"]);
		// M95 = W(M86) vs W(M88) → R32-14 vs R32-16
		expect(pairs[6]).toEqual(["R32-14", "R32-16"]);
		// M96 = W(M85) vs W(M87) → R32-13 vs R32-15
		expect(pairs[7]).toEqual(["R32-13", "R32-15"]);
	});
});

describe("FIFA_QF_MATCHUPS", () => {
	it("tiene exactamente 4 entradas con números 97-100", () => {
		expect(FIFA_QF_MATCHUPS).toHaveLength(4);
		const numbers = FIFA_QF_MATCHUPS.map((m) => m.fifaNumber);
		expect(numbers).toEqual([97, 98, 99, 100]);
	});

	it("todos los sourceMatch apuntan a R16 existentes", () => {
		const r16Ids = new Set(FIFA_R16_MATCHUPS.map((m) => m.bracketId));
		for (const m of FIFA_QF_MATCHUPS) {
			expect(r16Ids.has(m.sourceMatchA)).toBe(true);
			expect(r16Ids.has(m.sourceMatchB)).toBe(true);
		}
	});
});

describe("FIFA_SF_MATCHUPS", () => {
	it("tiene exactamente 2 entradas con números 101-102", () => {
		expect(FIFA_SF_MATCHUPS).toHaveLength(2);
		const numbers = FIFA_SF_MATCHUPS.map((m) => m.fifaNumber);
		expect(numbers).toEqual([101, 102]);
	});

	it("todos los sourceMatch apuntan a QF existentes", () => {
		const qfIds = new Set(FIFA_QF_MATCHUPS.map((m) => m.bracketId));
		for (const m of FIFA_SF_MATCHUPS) {
			expect(qfIds.has(m.sourceMatchA)).toBe(true);
			expect(qfIds.has(m.sourceMatchB)).toBe(true);
		}
	});
});

describe("FIFA_FINAL y FIFA_THIRD_PLACE", () => {
	it("FIFA_FINAL es M104 con sourceMatch SF-1 vs SF-2", () => {
		expect(FIFA_FINAL.fifaNumber).toBe(104);
		expect(FIFA_FINAL.bracketId).toBe("F-1");
		expect(FIFA_FINAL.sourceMatchA).toBe("SF-1");
		expect(FIFA_FINAL.sourceMatchB).toBe("SF-2");
	});

	it("FIFA_THIRD_PLACE es M103 con sourceMatch SF-1 vs SF-2 (perdedores)", () => {
		expect(FIFA_THIRD_PLACE.fifaNumber).toBe(103);
		expect(FIFA_THIRD_PLACE.bracketId).toBe("3RD-1");
		expect(FIFA_THIRD_PLACE.sourceMatchA).toBe("SF-1");
		expect(FIFA_THIRD_PLACE.sourceMatchB).toBe("SF-2");
	});
});

// ============================================================================
// HELPERS: buildBestThirdsKey
// ============================================================================

describe("buildBestThirdsKey", () => {
	it("8 grupos A-H → 111111110000", () => {
		expect(buildBestThirdsKey(["A", "B", "C", "D", "E", "F", "G", "H"])).toBe(
			"111111110000",
		);
	});

	it("8 grupos I-L + A-D → 111100001111", () => {
		expect(buildBestThirdsKey(["I", "J", "K", "L", "A", "B", "C", "D"])).toBe(
			"111100001111",
		);
	});

	it("8 grupos E-L → 000011111111", () => {
		expect(buildBestThirdsKey(["E", "F", "G", "H", "I", "J", "K", "L"])).toBe(
			"000011111111",
		);
	});

	it("array vacío → 000000000000", () => {
		expect(buildBestThirdsKey([])).toBe("000000000000");
	});

	it("los 12 grupos → 111111111111", () => {
		expect(
			buildBestThirdsKey([
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
			]),
		).toBe("111111111111");
	});

	it("es insensible al orden de entrada", () => {
		expect(buildBestThirdsKey(["H", "G", "F", "E", "D", "C", "B", "A"])).toBe(
			buildBestThirdsKey(["A", "B", "C", "D", "E", "F", "G", "H"]),
		);
	});

	it("siempre retorna un string de 12 chars", () => {
		const key = buildBestThirdsKey(["A", "C", "E", "G", "I", "K", "B", "D"]);
		expect(key).toHaveLength(12);
	});
});

describe("decodeBestThirdsKey", () => {
	it("decodifica 111111110000 → [A,B,C,D,E,F,G,H]", () => {
		expect(decodeBestThirdsKey("111111110000")).toEqual([
			"A",
			"B",
			"C",
			"D",
			"E",
			"F",
			"G",
			"H",
		]);
	});

	it("decodifica 000011111111 → [E,F,G,H,I,J,K,L]", () => {
		expect(decodeBestThirdsKey("000011111111")).toEqual([
			"E",
			"F",
			"G",
			"H",
			"I",
			"J",
			"K",
			"L",
		]);
	});

	it("decodifica 000000000000 → []", () => {
		expect(decodeBestThirdsKey("000000000000")).toEqual([]);
	});

	it("es inversa de buildBestThirdsKey", () => {
		const groups: GroupLetter[] = ["A", "C", "F", "H", "I", "J", "K", "L"];
		const key = buildBestThirdsKey(groups);
		const decoded = decodeBestThirdsKey(key);
		// El orden es alfabético
		expect(decoded).toEqual([...groups].sort());
	});

	it("lanza error si la key no tiene 12 chars", () => {
		expect(() => decodeBestThirdsKey("111")).toThrow();
		expect(() => decodeBestThirdsKey("1111111111111")).toThrow();
	});

	it("lanza error si la key tiene chars inválidos", () => {
		expect(() => decodeBestThirdsKey("1111XX11111")).toThrow();
	});
});

// ============================================================================
// BEST_THIRDS_COMBINATIONS: estructura
// ============================================================================

describe("BEST_THIRDS_COMBINATIONS", () => {
	it(`tiene exactamente ${BEST_THIRDS_COMBINATIONS_COUNT} entradas (= 495 = C(12,8))`, () => {
		expect(Object.keys(BEST_THIRDS_COMBINATIONS)).toHaveLength(
			BEST_THIRDS_COMBINATIONS_COUNT,
		);
	});

	it("cada key tiene exactamente 12 chars", () => {
		for (const key of Object.keys(BEST_THIRDS_COMBINATIONS)) {
			expect(key).toHaveLength(12);
		}
	});

	it("cada key contiene solo '0' o '1'", () => {
		for (const key of Object.keys(BEST_THIRDS_COMBINATIONS)) {
			expect(key).toMatch(/^[01]{12}$/);
		}
	});

	it("cada key tiene exactamente 8 '1's (los 8 grupos clasificados)", () => {
		for (const key of Object.keys(BEST_THIRDS_COMBINATIONS)) {
			const ones = (key.match(/1/g) ?? []).length;
			expect(ones).toBe(8);
		}
	});

	it("cada entry tiene los 8 matches requeridos", () => {
		const requiredMatches: Array<keyof BestThirdsAssignment> = [
			"M74",
			"M77",
			"M79",
			"M80",
			"M81",
			"M82",
			"M85",
			"M87",
		];
		for (const assignment of Object.values(BEST_THIRDS_COMBINATIONS)) {
			for (const m of requiredMatches) {
				expect(assignment[m]).toBeDefined();
			}
		}
	});

	it("cada valor de match es un GroupLetter válido (A-L)", () => {
		for (const assignment of Object.values(BEST_THIRDS_COMBINATIONS)) {
			for (const value of Object.values(assignment)) {
				expect(ALL_GROUPS_SET.has(value)).toBe(true);
			}
		}
	});

	it("cada entry tiene 8 grupos únicos en la asignación", () => {
		for (const [key, assignment] of Object.entries(BEST_THIRDS_COMBINATIONS)) {
			const groups = Object.values(assignment);
			expect(new Set(groups).size).toBe(8);
			// Y los 8 grupos deben ser exactamente los 8 grupos clasificados
			const qualified = decodeBestThirdsKey(key);
			expect(new Set(groups)).toEqual(new Set(qualified));
		}
	});

	it("cada match usa un grupo DENTRO de su pool", () => {
		for (const assignment of Object.values(BEST_THIRDS_COMBINATIONS)) {
			for (const [matchKey, group] of Object.entries(assignment) as Array<
				[keyof BestThirdsAssignment, GroupLetter]
			>) {
				const pool = FIFA_BEST_THIRD_POOLS[matchKey];
				expect(pool).toContain(group);
			}
		}
	});

	it("todas las keys son únicas (no hay combinaciones duplicadas)", () => {
		const keys = Object.keys(BEST_THIRDS_COMBINATIONS);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("los 12 grupos aparecen como '0' (eliminados) en al menos 1 combinación", () => {
		for (const group of ALL_GROUP_LETTERS) {
			const idx = ALL_GROUP_LETTERS.indexOf(group);
			const hasZero = Object.keys(BEST_THIRDS_COMBINATIONS).some(
				(key) => key[idx] === "0",
			);
			expect(hasZero).toBe(true);
		}
	});

	it("los 12 grupos aparecen como '1' (clasificados) en al menos 1 combinación", () => {
		for (const group of ALL_GROUP_LETTERS) {
			const idx = ALL_GROUP_LETTERS.indexOf(group);
			const hasOne = Object.keys(BEST_THIRDS_COMBINATIONS).some(
				(key) => key[idx] === "1",
			);
			expect(hasOne).toBe(true);
		}
	});
});

// ============================================================================
// BEST_THIRDS_COMBINATIONS: cobertura exhaustiva
// ============================================================================

describe("BEST_THIRDS_COMBINATIONS: cobertura de C(12,8)=495", () => {
	it("cubre TODAS las combinaciones de 8 grupos de 12", () => {
		// Generar las 495 combinaciones de 8 grupos y verificar que cada una
		// tiene su entry correspondiente.
		const generatedKeys = new Set<string>();
		for (const combo of generateAll8GroupCombos()) {
			const key = buildBestThirdsKey(combo);
			generatedKeys.add(key);
		}
		expect(generatedKeys.size).toBe(495);
		// Cada key generada debe estar en BEST_THIRDS_COMBINATIONS
		for (const key of generatedKeys) {
			expect(BEST_THIRDS_COMBINATIONS[key]).toBeDefined();
		}
	});

	it("no hay keys extra que no correspondan a una combinación válida", () => {
		const generatedKeys = new Set<string>();
		for (const combo of generateAll8GroupCombos()) {
			generatedKeys.add(buildBestThirdsKey(combo));
		}
		for (const key of Object.keys(BEST_THIRDS_COMBINATIONS)) {
			expect(generatedKeys.has(key)).toBe(true);
		}
	});
});

// ============================================================================
// resolveBestThirdsAssignment
// ============================================================================

describe("resolveBestThirdsAssignment", () => {
	it("retorna la asignación correcta para una combinación conocida", () => {
		// Si clasifican A,B,C,D,E,F,G,H (key=111111110000):
		const result = resolveBestThirdsAssignment([
			"A",
			"B",
			"C",
			"D",
			"E",
			"F",
			"G",
			"H",
		]);
		// Verificamos que la asignación existe y es válida
		expect(result).toBeDefined();
		expect(Object.keys(result).sort()).toEqual(
			["M74", "M77", "M79", "M80", "M81", "M82", "M85", "M87"].sort(),
		);
	});

	it("lanza error si no se pasan 8 grupos", () => {
		expect(() => resolveBestThirdsAssignment(["A", "B", "C"])).toThrow();
		expect(() =>
			resolveBestThirdsAssignment([
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
			]),
		).toThrow();
	});

	it("es consistente con BEST_THIRDS_COMBINATIONS[key]", () => {
		// Para 100 combinaciones aleatorias, verificar consistencia
		const allCombos: GroupLetter[][] = [];
		for (const combo of generateAll8GroupCombos()) {
			allCombos.push(combo);
		}
		// Sample 100
		for (let i = 0; i < 100; i++) {
			const idx = Math.floor((i * 7 + 3) % allCombos.length);
			const combo = allCombos[idx];
			if (!combo) continue;
			const result = resolveBestThirdsAssignment(combo);
			const direct = BEST_THIRDS_COMBINATIONS[buildBestThirdsKey(combo)];
			expect(result).toEqual(direct);
		}
	});
});

// ============================================================================
// getThirdForFirstPlace
// ============================================================================

describe("getThirdForFirstPlace", () => {
	it("para 1°E con A-H clasificados, retorna el grupo correcto", () => {
		const result = getThirdForFirstPlace("E", [
			"A",
			"B",
			"C",
			"D",
			"E",
			"F",
			"G",
			"H",
		]);
		// Verificamos que es uno de los 8 grupos clasificados
		expect(["A", "B", "C", "D", "E", "F", "G", "H"]).toContain(result);
		// Y que está en el pool M74 = {A,B,C,D,F}
		expect(["A", "B", "C", "D", "F"]).toContain(result);
	});

	it("lanza error si el grupo no es un 1° que enfrenta Best 3°", () => {
		// C, F, H, J juegan contra 2° de grupo, no contra 3°
		expect(() =>
			getThirdForFirstPlace("C", ["A", "B", "C", "D", "E", "F", "G", "H"]),
		).toThrow();
		expect(() =>
			getThirdForFirstPlace("F", ["A", "B", "C", "D", "E", "F", "G", "H"]),
		).toThrow();
		expect(() =>
			getThirdForFirstPlace("H", ["A", "B", "C", "D", "E", "F", "G", "H"]),
		).toThrow();
		expect(() =>
			getThirdForFirstPlace("J", ["A", "B", "C", "D", "E", "F", "G", "H"]),
		).toThrow();
	});
});

// ============================================================================
// HELPERS DE BÚSQUEDA
// ============================================================================

describe("getR32MatchByBracketId", () => {
	it("retorna el match correcto para cada bracketId", () => {
		expect(getR32MatchByBracketId("R32-1")?.fifaNumber).toBe(73);
		expect(getR32MatchByBracketId("R32-16")?.fifaNumber).toBe(88);
	});

	it("retorna undefined para bracketIds inválidos", () => {
		expect(getR32MatchByBracketId("R32-99")).toBeUndefined();
		expect(getR32MatchByBracketId("R16-1")).toBeUndefined();
		expect(getR32MatchByBracketId("")).toBeUndefined();
	});
});

describe("getR32MatchByFifaNumber", () => {
	it("retorna el match correcto para cada número FIFA", () => {
		expect(getR32MatchByFifaNumber(73)?.bracketId).toBe("R32-1");
		expect(getR32MatchByFifaNumber(88)?.bracketId).toBe("R32-16");
	});

	it("retorna undefined para números fuera de rango", () => {
		expect(getR32MatchByFifaNumber(72)).toBeUndefined();
		expect(getR32MatchByFifaNumber(89)).toBeUndefined();
	});
});

// ============================================================================
// PROPERTY-BASED: para CUALQUIER combinación, la estructura es válida
// ============================================================================

describe("Property-based: para CUALQUIER combinación válida", () => {
	it("las 495 combinaciones tienen asignaciones consistentes con la key", () => {
		let count = 0;
		for (const combo of generateAll8GroupCombos()) {
			const key = buildBestThirdsKey(combo);
			const assignment = BEST_THIRDS_COMBINATIONS[key];
			expect(assignment).toBeDefined();

			// 1. Los 8 grupos asignados son los 8 grupos clasificados
			const assignedGroups = new Set(Object.values(assignment));
			const qualifiedGroups = new Set(combo);
			expect(assignedGroups).toEqual(qualifiedGroups);

			// 2. Cada match usa un grupo en su pool
			for (const [matchKey, group] of Object.entries(assignment) as Array<
				[keyof BestThirdsAssignment, GroupLetter]
			>) {
				expect(FIFA_BEST_THIRD_POOLS[matchKey]).toContain(group);
			}

			count++;
		}
		expect(count).toBe(495);
	});

	it("getThirdForFirstPlace retorna grupos únicos para los 8 matches", () => {
		// Para CUALQUIER combinación, los 8 grupos retornados por
		// getThirdForFirstPlace deben ser únicos.
		const firsts: GroupLetter[] = ["E", "I", "A", "L", "D", "G", "B", "K"];
		for (const combo of generateAll8GroupCombos()) {
			const result = firsts.map((g) => getThirdForFirstPlace(g, combo));
			expect(new Set(result).size).toBe(8);
		}
	});
});

// ============================================================================
// TYPE-LEVEL: smoke test
// ============================================================================

describe("Type smoke test", () => {
	it("FIFAR32MatchDef tiene la forma esperada", () => {
		const m = FIFA_R32_MATCHUPS[0];
		if (!m) throw new Error("FIFA_R32_MATCHUPS[0] is undefined");
		expect(m.fifaNumber).toBeTypeOf("number");
		expect(m.bracketId).toBeTypeOf("string");
		expect(m.slotA.slotType).toMatch(/^(1st|2nd|best3rd)$/);
		expect(m.slotB.slotType).toMatch(/^(1st|2nd|best3rd)$/);
	});

	it("BestThirdsAssignment tiene 8 keys con valores GroupLetter", () => {
		const sample = BEST_THIRDS_COMBINATIONS["111111110000"];
		if (!sample)
			throw new Error("BEST_THIRDS_COMBINATIONS[111111110000] is undefined");
		const keys = Object.keys(sample).sort();
		expect(keys).toEqual(
			["M74", "M77", "M79", "M80", "M81", "M82", "M85", "M87"].sort(),
		);
	});
});
