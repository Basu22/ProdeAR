/**
 * Tests para el utility de contraste WCAG en `colorContrast.ts`.
 *
 * ============================================================================
 * COBERTURA
 * ============================================================================
 * - `hexToRgb`: parsing de hex corto (#rgb) y largo (#rrggbb), casos inválidos
 * - `relativeLuminance`: pure white = 1, pure black = 0
 * - `getContrastRatio`: white on black = 21, mismo color = 1
 * - `alphaBlend`: blanco al 50% sobre negro = gris medio
 * - `checkContrast`: WCAG AA/AAA thresholds para texto normal y grande
 * - Audit específico de MatchLogistics con los colors del theme de ProdeAR
 * ============================================================================
 */

import { describe, expect, it } from "vitest";
import {
	alphaBlend,
	checkContrast,
	getContrastRatio,
	hexToRgb,
	relativeLuminance,
} from "../lib/colorContrast";

// ============================================================================
// hexToRgb
// ============================================================================

describe("hexToRgb", () => {
	it("parsea hex de 6 dígitos", () => {
		expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
		expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
		expect(hexToRgb("#94a3b8")).toEqual([148, 163, 184]);
	});

	it("parsea hex corto (#rgb) expandiendo a duplicar dígitos", () => {
		expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
		expect(hexToRgb("#000")).toEqual([0, 0, 0]);
		expect(hexToRgb("#abc")).toEqual([170, 187, 204]);
	});

	it("acepta hex sin #", () => {
		expect(hexToRgb("ffffff")).toEqual([255, 255, 255]);
	});

	it("trim whitespace", () => {
		expect(hexToRgb("  #ffffff  ")).toEqual([255, 255, 255]);
	});

	it("lanza error para hex inválido", () => {
		expect(() => hexToRgb("#xyz")).toThrow();
		expect(() => hexToRgb("#12")).toThrow();
		expect(() => hexToRgb("")).toThrow();
	});
});

// ============================================================================
// relativeLuminance
// ============================================================================

describe("relativeLuminance", () => {
	it("pure white = 1.0", () => {
		expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 5);
	});

	it("pure black = 0.0", () => {
		expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0.0, 5);
	});
});

// ============================================================================
// getContrastRatio
// ============================================================================

describe("getContrastRatio", () => {
	it("white on black = 21:1 (max ratio)", () => {
		const ratio = getContrastRatio([255, 255, 255], [0, 0, 0]);
		expect(ratio).toBeCloseTo(21, 1);
	});

	it("black on white = 21:1 (simétrico)", () => {
		const ratio = getContrastRatio([0, 0, 0], [255, 255, 255]);
		expect(ratio).toBeCloseTo(21, 1);
	});

	it("mismo color = 1:1 (min ratio)", () => {
		const ratio = getContrastRatio([128, 128, 128], [128, 128, 128]);
		expect(ratio).toBeCloseTo(1, 5);
	});
});

// ============================================================================
// alphaBlend
// ============================================================================

describe("alphaBlend", () => {
	it("blendea blanco al 50% sobre negro = gris medio", () => {
		const blended = alphaBlend("#ffffff", "#000000", 0.5);
		expect(blended).toEqual([128, 128, 128]);
	});

	it("alpha 1.0 = color sólido (sin cambio)", () => {
		const blended = alphaBlend("#ffffff", "#000000", 1.0);
		expect(blended).toEqual([255, 255, 255]);
	});

	it("alpha 0.0 = fondo sólido (sin cambio)", () => {
		const blended = alphaBlend("#ffffff", "#000000", 0.0);
		expect(blended).toEqual([0, 0, 0]);
	});
});

// ============================================================================
// checkContrast
// ============================================================================

describe("checkContrast", () => {
	it("white sobre background muy oscuro = AA y AAA", () => {
		const result = checkContrast("#ffffff", "#000b14");
		expect(result.meetsAA).toBe(true);
		expect(result.meetsAAA).toBe(true);
	});

	it("text-white/85 sobre card bg normal = pasa AA", () => {
		// text-white/85 sobre bg-surface-container-low/40
		// (alpha-blended con page bg #000b14)
		const result = checkContrast("#ffffff", "#000D16", { fgAlpha: 0.85 });
		expect(result.meetsAA).toBe(true);
	});

	it("text-on-surface-variant (#94a3b8) sobre card bg = pasa AA", () => {
		const result = checkContrast("#94a3b8", "#000D16");
		expect(result.meetsAA).toBe(true);
	});

	it("large text tiene threshold más bajo (3:1 para AA)", () => {
		// Mismo color pero marcado como large text debería pasar AA
		const normalText = checkContrast("#777777", "#ffffff", {
			isLargeText: false,
		});
		const largeText = checkContrast("#777777", "#ffffff", {
			isLargeText: true,
		});
		// normalText puede no pasar AA con ratio 4.3:1
		// largeText pasa AA con threshold 3:1
		expect(largeText.meetsAA).toBe(true);
		expect(normalText.ratio).toBe(largeText.ratio);
	});

	it("retorna el ratio efectivo en el resultado", () => {
		const result = checkContrast("#ffffff", "#000000");
		expect(result.ratio).toBeCloseTo(21, 1);
	});
});

// ============================================================================
// AUDIT WCAG AA — MatchLogistics (Bracket V2)
// ============================================================================
//
// Colores del theme de ProdeAR (src/index.css):
//   --color-background:            #000b14  (page bg)
//   --color-surface-container-low: #000f1a  (card bg base, 40% opacity)
//   --color-on-surface-variant:    #94a3b8
//
// Cards en BracketMatchCard usan:
//   - Normal:  bg-surface-container-low/40  (#000f1a @ 40% sobre #000b14)
//   - TBD:     bg-surface-container-lowest/30 (#00070d @ 30% sobre #000b14)
//   - Con score: bg-surface-container-low/60 (#000f1a @ 60% sobre #000b14)
//
// Textos en MatchLogistics:
//   - Stadium name:  text-white/85  (text-[10-12px] → SMALL, requiere 4.5:1)
//   - Day prefix:    text-white/90  (text-[9-10px]  → SMALL, requiere 4.5:1)
//   - Date/time:     text-on-surface-variant (#94a3b8) (text-[9-10px] → SMALL)
//
// Audit ejecutado: 2026-06-26.
// ============================================================================

// bg-surface-container-low (#000f1a) @ 40% alpha sobre page bg (#000b14)
const CARD_BG_NORMAL = "#000D16";
// bg-surface-container-lowest (#00070d) @ 30% alpha sobre #000b14
const CARD_BG_TBD = "#000A12";
// bg-surface-container-low (#000f1a) @ 60% alpha sobre #000b14
const CARD_BG_WITH_SCORE = "#000D18";

describe("AUDIT WCAG AA — MatchLogistics variants", () => {
	describe("variant compact (R32, R16) — small text", () => {
		// Background: card normal (#000D16)
		it("stadium text-white/85 cumple AA", () => {
			const r = checkContrast("#ffffff", CARD_BG_NORMAL, { fgAlpha: 0.85 });
			expect(r.meetsAA).toBe(true);
			expect(r.ratio).toBeGreaterThan(4.5);
		});

		it("day text-white/90 cumple AA", () => {
			const r = checkContrast("#ffffff", CARD_BG_NORMAL, { fgAlpha: 0.9 });
			expect(r.meetsAA).toBe(true);
			expect(r.ratio).toBeGreaterThan(4.5);
		});

		it("date text-on-surface-variant cumple AA", () => {
			const r = checkContrast("#94a3b8", CARD_BG_NORMAL);
			expect(r.meetsAA).toBe(true);
			expect(r.ratio).toBeGreaterThan(4.5);
		});
	});

	describe("variant default (QF, SF) — small text", () => {
		it("stadium text-white/85 cumple AA en card TBD", () => {
			const r = checkContrast("#ffffff", CARD_BG_TBD, { fgAlpha: 0.85 });
			expect(r.meetsAA).toBe(true);
		});

		it("date text-on-surface-variant cumple AA en card TBD", () => {
			const r = checkContrast("#94a3b8", CARD_BG_TBD);
			expect(r.meetsAA).toBe(true);
		});

		it("stadium text-white/85 cumple AA en card con score", () => {
			const r = checkContrast("#ffffff", CARD_BG_WITH_SCORE, {
				fgAlpha: 0.85,
			});
			expect(r.meetsAA).toBe(true);
		});

		it("date text-on-surface-variant cumple AA en card con score", () => {
			const r = checkContrast("#94a3b8", CARD_BG_WITH_SCORE);
			expect(r.meetsAA).toBe(true);
		});
	});

	describe("variant hero (F, 3RD) — small text", () => {
		it("stadium text-white/85 cumple AA", () => {
			const r = checkContrast("#ffffff", CARD_BG_NORMAL, { fgAlpha: 0.85 });
			expect(r.meetsAA).toBe(true);
		});

		it("date text-on-surface-variant cumple AA", () => {
			const r = checkContrast("#94a3b8", CARD_BG_NORMAL);
			expect(r.meetsAA).toBe(true);
		});
	});
});
