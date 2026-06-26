/**
 * `colorContrast` — Utilidades para calcular y validar contraste WCAG.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Helpers para verificar que las combinaciones de color texto/fondo del
 * tema de ProdeAR cumplen con WCAG 2.1 AA/AAA. Usado por:
 * - Tests unitarios de `MatchLogistics` y otros componentes
 * - Audit estático del design system
 *
 * ============================================================================
 * FÓRMULAS WCAG 2.1
 * ============================================================================
 * sRGB → linear:
 *   if c <= 0.04045: c / 12.92
 *   else: ((c + 0.055) / 1.055) ^ 2.4
 *
 * Relative luminance (L):
 *   L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 *
 * Contrast ratio:
 *   ratio = (L_lighter + 0.05) / (L_darker + 0.05)
 *
 * Mínimos WCAG:
 *   AA  texto normal:  4.5:1
 *   AA  texto grande:  3:1   (≥18pt o ≥14pt bold)
 *   AAA texto normal:  7:1
 *   AAA texto grande:  4.5:1
 *
 * @module lib/colorContrast
 */

// ============================================================================
// TYPES
// ============================================================================

/** Color como tuple RGB [r, g, b] con valores 0-255. */
export type RGB = readonly [number, number, number];

/** Color como string hex "#rrggbb" o "#rgb". */
export type HexColor = string;

/** Nivel de WCAG. */
export type WCAGLevel = "AA" | "AAA";

// ============================================================================
// PARSING
// ============================================================================

/**
 * Convierte un color hex (#rgb o #rrggbb) a RGB tuple.
 * Lanza error si el formato es inválido.
 */
export function hexToRgb(hex: HexColor): RGB {
	const cleaned = hex.replace("#", "").trim();
	let r: number, g: number, b: number;
	if (cleaned.length === 3) {
		r = parseInt(cleaned[0]! + cleaned[0]!, 16);
		g = parseInt(cleaned[1]! + cleaned[1]!, 16);
		b = parseInt(cleaned[2]! + cleaned[2]!, 16);
	} else if (cleaned.length === 6) {
		r = parseInt(cleaned.slice(0, 2), 16);
		g = parseInt(cleaned.slice(2, 4), 16);
		b = parseInt(cleaned.slice(4, 6), 16);
	} else {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	if ([r, g, b].some((v) => Number.isNaN(v))) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return [r!, g!, b!] as const;
}

// ============================================================================
// WCAG MATH
// ============================================================================

/** Convierte un canal sRGB (0-255) a su valor lineal (0-1). */
function srgbToLinear(c: number): number {
	const normalized = c / 255;
	if (normalized <= 0.04045) {
		return normalized / 12.92;
	}
	return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/** Calcula la luminancia relativa de un color (0-1). */
export function relativeLuminance(rgb: RGB): number {
	const [r, g, b] = rgb;
	return (
		0.2126 * srgbToLinear(r) +
		0.7152 * srgbToLinear(g) +
		0.0722 * srgbToLinear(b)
	);
}

/** Calcula el ratio de contraste WCAG entre dos colores. */
export function getContrastRatio(fg: RGB, bg: RGB): number {
	const lFg = relativeLuminance(fg);
	const lBg = relativeLuminance(bg);
	const lighter = Math.max(lFg, lBg);
	const darker = Math.min(lFg, lBg);
	return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// ALPHA BLENDING
// ============================================================================

/**
 * Alpha-blending de un color semi-transparente sobre un fondo opaco.
 * Ej: alphaBlend("#ffffff", "#000f1a", 0.85) = blanco al 85% sobre dark blue
 *
 * Usado para calcular el color efectivo de `text-white/85` cuando se renderiza
 * sobre un card con `bg-surface-container-low/40`.
 */
export function alphaBlend(fg: HexColor, bg: HexColor, alpha: number): RGB {
	const [fR, fG, fB] = hexToRgb(fg);
	const [bR, bG, bB] = hexToRgb(bg);
	return [
		Math.round(fR * alpha + bR * (1 - alpha)),
		Math.round(fG * alpha + bG * (1 - alpha)),
		Math.round(fB * alpha + bB * (1 - alpha)),
	] as const;
}

// ============================================================================
// WCAG VALIDATION
// ============================================================================

export interface ContrastCheckResult {
	/** Ratio de contraste calculado (ej. 14.36). */
	ratio: number;
	/** Si cumple WCAG AA (≥ 4.5:1 normal, ≥ 3:1 grande). */
	meetsAA: boolean;
	/** Si cumple WCAG AAA (≥ 7:1 normal, ≥ 4.5:1 grande). */
	meetsAAA: boolean;
	/** Color efectivo del texto (después de alpha-blending si aplica). */
	effectiveFg: RGB;
	/** Color efectivo del fondo. */
	effectiveBg: RGB;
}

export interface CheckContrastOptions {
	/** Alpha del foreground (0-1). Si se especifica, se blendea con el bg. */
	fgAlpha?: number;
	/** true si el texto es ≥18pt o ≥14pt bold (umbrales más bajos). */
	isLargeText?: boolean;
}

/**
 * Verifica si una combinación de colores cumple WCAG.
 *
 * @example
 * ```ts
 * // Texto sólido sobre fondo opaco
 * checkContrast("#ffffff", "#000b14");
 *
 * // Texto semi-transparente (text-white/85) sobre fondo opaco
 * checkContrast("#ffffff", "#000D16", { fgAlpha: 0.85 });
 * ```
 */
export function checkContrast(
	fg: HexColor,
	bg: HexColor,
	options: CheckContrastOptions = {},
): ContrastCheckResult {
	const { fgAlpha, isLargeText = false } = options;
	const effectiveFg =
		fgAlpha !== undefined ? alphaBlend(fg, bg, fgAlpha) : hexToRgb(fg);
	const effectiveBg = hexToRgb(bg);
	const ratio = getContrastRatio(effectiveFg, effectiveBg);
	const aaThreshold = isLargeText ? 3 : 4.5;
	const aaaThreshold = isLargeText ? 4.5 : 7;
	return {
		ratio,
		meetsAA: ratio >= aaThreshold,
		meetsAAA: ratio >= aaaThreshold,
		effectiveFg,
		effectiveBg,
	};
}
