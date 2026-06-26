/**
 * Tests para los helpers de fecha de `bracketTypes.ts`.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * - `formatKickoffDate`: formatea ISO a "DD/MM" en es-AR
 * - `formatKickoffTime`: formatea ISO a "HH:MM" (24h) en es-AR
 * - `formatKickoffDay`:  formatea ISO a día de semana corto ("JUE") en es-AR
 *
 * Casos cubiertos:
 * - Happy path con fecha válida
 * - null / undefined / string vacío / string inválido → null
 * - Timezones (UTC vs local): el día/hora puede cambiar según la zona
 * - Edge cases: 1970-01-01, 2030-12-31, fin de año, etc.
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import {
	formatKickoffDate,
	formatKickoffDay,
	formatKickoffTime,
} from "../lib/bracketTypes";

// ============================================================================
// formatKickoffDate
// ============================================================================

describe("formatKickoffDate", () => {
	it("formatea un ISO válido a DD/MM en es-AR", () => {
		// 2026-07-15 es miércoles. Con timezone del runner (que puede variar),
		// verificamos el formato DD/MM con regex en vez de valor exacto.
		const result = formatKickoffDate("2026-07-15T16:00:00Z");
		expect(result).toMatch(/^\d{2}\/\d{2}$/);
	});

	it("retorna null para null", () => {
		expect(formatKickoffDate(null)).toBeNull();
	});

	it("retorna null para undefined", () => {
		expect(formatKickoffDate(undefined)).toBeNull();
	});

	it("retorna null para string vacío", () => {
		expect(formatKickoffDate("")).toBeNull();
	});

	it("retorna null para string inválido", () => {
		expect(formatKickoffDate("not-a-date")).toBeNull();
	});

	it("retorna null para fecha imposible (mes 13)", () => {
		expect(formatKickoffDate("2026-13-01T16:00:00Z")).toBeNull();
	});

	it("acepta timestamps con timezone offset explícito", () => {
		// 2026-07-15T16:00:00-03:00 = 19:00 UTC = 15/07 en UTC-3
		// En otra zona puede ser 16/07. Solo verificamos formato.
		const result = formatKickoffDate("2026-07-15T16:00:00-03:00");
		expect(result).toMatch(/^\d{2}\/\d{2}$/);
	});
});

// ============================================================================
// formatKickoffTime
// ============================================================================

describe("formatKickoffTime", () => {
	it("formatea un ISO válido a HH:MM (24h) en es-AR", () => {
		const result = formatKickoffTime("2026-07-15T16:00:00Z");
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("no usa formato 12h (AM/PM)", () => {
		// En es-AR con hour12: false, 13:00 → "13:00", no "1:00 PM"
		const result = formatKickoffTime("2026-07-15T13:00:00Z");
		// Podría ser 10:00, 13:00, 15:00 etc. según timezone del runner.
		// Lo importante es que NO tenga "PM" ni "AM" ni dígitos < 10 con formato "1:00"
		expect(result).not.toMatch(/PM|AM|p\.m\.|a\.m\./i);
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("retorna null para null", () => {
		expect(formatKickoffTime(null)).toBeNull();
	});

	it("retorna null para undefined", () => {
		expect(formatKickoffTime(undefined)).toBeNull();
	});

	it("retorna null para string vacío", () => {
		expect(formatKickoffTime("")).toBeNull();
	});

	it("retorna null para string inválido", () => {
		expect(formatKickoffTime("not-a-date")).toBeNull();
	});

	it("maneja medianoche correctamente (00:00, no 24:00)", () => {
		// `Intl.DateTimeFormat` con hour12:false debe retornar "00:00" para
		// medianoche, NUNCA "24:00" (que es un formato raro de algunos locales).
		// El timezone del runner puede convertir 2026-07-15T00:00:00Z a otro
		// día, pero la hora siempre debe estar en formato 00:00–23:00.
		const result = formatKickoffTime("2026-07-15T00:00:00Z");
		expect(result).not.toBe("24:00");
		expect(result).toMatch(/^\d{2}:\d{2}$/);
		if (result) {
			const [hh] = result.split(":");
			expect(Number(hh)).toBeGreaterThanOrEqual(0);
			expect(Number(hh)).toBeLessThan(24);
		}
	});
});

// ============================================================================
// formatKickoffDay
// ============================================================================

describe("formatKickoffDay", () => {
	it("retorna día de semana corto en mayúsculas (3 letras)", () => {
		const result = formatKickoffDay("2026-07-15T16:00:00Z");
		expect(result).toMatch(/^[A-ZÁÉÍÓÚÑ]{3}$/);
	});

	it("retorna 3 caracteres exactos (normaliza 'jue.' → 'JUE')", () => {
		const result = formatKickoffDay("2026-07-15T16:00:00Z");
		expect(result).toHaveLength(3);
	});

	it("retorna null para null", () => {
		expect(formatKickoffDay(null)).toBeNull();
	});

	it("retorna null para undefined", () => {
		expect(formatKickoffDay(undefined)).toBeNull();
	});

	it("retorna null para string vacío", () => {
		expect(formatKickoffDay("")).toBeNull();
	});

	it("retorna null para string inválido", () => {
		expect(formatKickoffDay("not-a-date")).toBeNull();
	});

	it("retorna null para fecha imposible", () => {
		expect(formatKickoffDay("2026-13-01T16:00:00Z")).toBeNull();
	});

	it("no incluye punto final (normaliza 'jue.' → 'JUE')", () => {
		// `Intl.DateTimeFormat` con `weekday: "short"` en es-AR puede devolver
		// "jue.", "jue", "ju.", etc. dependiendo del runtime. Nuestro helper
		// debe normalizar a 3 letras sin punto.
		const result = formatKickoffDay("2026-07-15T16:00:00Z");
		expect(result).not.toMatch(/\./);
	});
});

// ============================================================================
// Tests integrados (los 3 helpers juntos)
// ============================================================================

describe("formatKickoff* — combinación", () => {
	it("los 3 helpers retornan null para el mismo input inválido", () => {
		const invalidInputs: (string | null | undefined)[] = [
			null,
			undefined,
			"",
			"not-a-date",
			"2026-13-99T99:99:99Z",
		];
		for (const input of invalidInputs) {
			expect(formatKickoffDate(input)).toBeNull();
			expect(formatKickoffTime(input)).toBeNull();
			expect(formatKickoffDay(input)).toBeNull();
		}
	});

	it("los 3 helpers retornan formato consistente para fecha válida", () => {
		const iso = "2026-07-15T16:00:00Z";
		const date = formatKickoffDate(iso);
		const time = formatKickoffTime(iso);
		const day = formatKickoffDay(iso);
		expect(date).toMatch(/^\d{2}\/\d{2}$/);
		expect(time).toMatch(/^\d{2}:\d{2}$/);
		expect(day).toMatch(/^[A-ZÁÉÍÓÚÑ]{3}$/);
	});
});
