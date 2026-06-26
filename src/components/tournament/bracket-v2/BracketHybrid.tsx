/**
 * `BracketHybrid` — Componente raíz del Bracket V2 (detrás de `BRACKET_V2`).
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Wrapper que gestiona el `viewMode` ("global" | "detail") y la ronda activa,
 * y delega a la vista correspondiente (`BracketGlobalView` o
 * `BracketDetailView`).
 *
 * ============================================================================
 * FEATURE FLAG
 * ============================================================================
 * Lee `BRACKET_V2` vía `useFeatureFlag`. Si está inactivo, retorna `null` —
 * el `BracketTree` wrapper se encarga de delegar al `BracketQuadro` legacy.
 *
 * ============================================================================
 * SINCRONIZACIÓN URL ↔ ESTADO
 * ============================================================================
 * - `?round=X` mantiene la ronda activa (R32, R16, QF, SF, F, 3RD).
 * - `?view=detail` abre directamente la Vista Detalle. Sin param → Global.
 * - Cualquier cambio actualiza la URL con `setSearchParams({ replace: true })`
 *   para no contaminar el historial del navegador.
 *
 * ============================================================================
 * ROADMAP POR CAPAS
 * ============================================================================
 * - Capa 1: shell + feature flag + URL sync (DONE).
 * - Capa 2: `BracketGlobalView` con scroll horizontal contenido (DONE).
 * - Capa 3: `GlobalBracketHeader` + conectores SVG + dot indicator + chip bar.
 * - Capa 4: `BracketDetailView` con swipe gestures.
 * - Capa 5: Animaciones de transición + tokens CSS + pulido final.
 *
 * @module components/tournament/bracket-v2/BracketHybrid
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useFeatureFlag } from "../../../hooks/useFeatureFlag";
import type { RoundAbbreviation } from "../../../lib/roundNames";
import type { FullBracket } from "../../../lib/bracketTypes";
import { ROUND_CATALOG } from "../../../lib/bracketTypes";
import { BracketGlobalView } from "./BracketGlobalView";
import { BracketDetailView } from "./BracketDetailView";

// ============================================================================
// TYPES
// ============================================================================

/** Modo de vista del bracket híbrido. */
export type BracketViewMode = "global" | "detail";

interface BracketHybridProps {
	bracket: FullBracket;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valida que un string sea una `RoundAbbreviation` conocida.
 */
function isValidRound(value: string | null): value is RoundAbbreviation {
	if (!value) return false;
	return value in ROUND_CATALOG;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Wrapper que gestiona `viewMode` y la ronda activa.
 *
 * - `BRACKET_V2 = false` → retorna `null` (BracketTree delega a BracketQuadro).
 * - `viewMode = "global"` → renderiza `BracketGlobalView` (Capa 2+).
 * - `viewMode = "detail"` → renderiza placeholder de `BracketDetailView` (Capa 4).
 */
export function BracketHybrid({
	bracket,
	onOpenDetails,
	interactive = true,
}: BracketHybridProps) {
	const isV2 = useFeatureFlag("BRACKET_V2");
	const [searchParams, setSearchParams] = useSearchParams();

	// ── Leer view mode y ronda de la URL ──
	// Default: Vista Detalle (mejor mobile-first, sin scroll horizontal confuso).
	// Vista Global queda como opt-in via botón "🌳 Árbol" en DetailHeader.
	const viewMode: BracketViewMode =
		searchParams.get("view") === "global" ? "global" : "detail";
	const roundParam = searchParams.get("round");
	const activeRound: RoundAbbreviation = isValidRound(roundParam)
		? (roundParam as RoundAbbreviation)
		: "R32";

	// ── Helpers de navegación (URL sync) ──
	const setViewMode = useCallback(
		(mode: BracketViewMode) => {
			const next = new URLSearchParams(searchParams);
			if (mode === "detail") next.delete("view");
			else next.set("view", "global");
			setSearchParams(next, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const setActiveRound = useCallback(
		(round: RoundAbbreviation) => {
			const next = new URLSearchParams(searchParams);
			next.set("round", round);
			setSearchParams(next, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	// ── Si el flag está apagado, NO renderizar nada ──
	// (BracketTree delega al BracketQuadro legacy)
	if (!isV2) return null;

	// ── Handlers de navegación entre Vista Global y Detalle ──

	// Cierra Vista Global → vuelve a Vista Detalle (default).
	const handleCloseTree = useCallback(() => {
		setViewMode("detail");
	}, [setViewMode]);

	// Abre Vista Global → opt-in via botón "🌳 Árbol" en DetailHeader.
	const handleOpenTree = useCallback(() => {
		setViewMode("global");
	}, [setViewMode]);

	// ── Render Vista Global (Capa 2) o Vista Detalle (Capa 4) ──
	// `key={viewMode}` fuerza re-mount en cada cambio de vista, lo que
	// triggea la animación `animate-bracket-zoom-in` definida en index.css
	// (efecto Material Motion "emphasized": scale 0.96→1 + fade 0.7→1).
	// Se desactiva automáticamente con `prefers-reduced-motion: reduce`.
	return (
		<div key={viewMode} className="animate-bracket-zoom-in">
			{viewMode === "global" ? (
				<BracketGlobalView
					bracket={bracket}
					activeRound={activeRound}
					onBack={handleCloseTree}
					onOpenDetails={onOpenDetails}
					interactive={interactive}
				/>
			) : (
				<BracketDetailView
					bracket={bracket}
					activeRound={activeRound}
					onActiveRoundChange={setActiveRound}
					onOpenTree={handleOpenTree}
					onOpenDetails={onOpenDetails}
					interactive={interactive}
				/>
			)}
		</div>
	);
}
