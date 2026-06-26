/**
 * BracketTree — Wrapper retrocompatible para `BracketQuadro`.
 *
 * ============================================================================
 * HISTORIAL
 * ============================================================================
 * - Sprint 1-5: Vista de 5 rondas apiladas verticalmente + stepper.
 * - Sprint 5C: Vista de 1 ronda + RoundStepper (URL params).
 * - Sprint 5D: Refactor a carrusel horizontal via `BracketQuadro`.
 *
 * Este componente ahora es un thin wrapper que delega a `BracketQuadro`
 * para mantener compatibilidad con los 3 consumidores:
 * - `src/routes/Tournament.tsx`
 * - `src/components/tournament/PositionsView.tsx`
 * - `src/components/ligas/WorldCupKnockoutSection.tsx`
 *
 * ============================================================================
 * API PÚBLICA (invariante)
 * ============================================================================
 * La interface `BracketTreeProps` se mantiene igual:
 * - `bracket: FullBracket` — output de `getFullBracket`
 * - `onOpenDetails?: (matchId: string) => void` — callback al tocar un partido
 * - `interactive?: boolean` — si true, los cards son clickeables (default: true)
 *
 * El named export `BracketTree` se mantiene para no romper imports.
 *
 * ============================================================================
 * FEATURE FLAG
 * ============================================================================
 * Si `VITE_ENABLE_FULL_BRACKET=false`, se delega al componente legacy
 * `KnockoutBracket` (no refactorizado). El flag vive en `useStandings`
 * (decide si calcula `bracket` o no), por lo que en la práctica este
 * wrapper siempre recibe un `FullBracket` válido.
 *
 * ============================================================================
 */

import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import type { FullBracket } from "../../lib/bracketTypes";
import { BracketHybrid } from "./bracket-v2/BracketHybrid";
import { BracketQuadro } from "./BracketQuadro";

// ============================================================================
// PROPS (API pública invariante)
// ============================================================================

interface BracketTreeProps {
	bracket: FullBracket;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Wrapper retrocompatible que delega a la implementación correcta según
 * el feature flag `BRACKET_V2`:
 *
 * - `BRACKET_V2 = false` (default) → `BracketQuadro` (carrusel horizontal legacy).
 * - `BRACKET_V2 = true`           → `BracketHybrid` (Bracket V2 — Vista Global
 *                                   + Vista Detalle, detrás de feature flag).
 *
 * Esto permite hacer rollout progresivo del nuevo diseño sin riesgo de
 * regresión: el fallback al diseño legacy es instantáneo con un toggle
 * del flag.
 */
export function BracketTree(props: BracketTreeProps) {
	const isV2 = useFeatureFlag("BRACKET_V2");

	if (isV2) {
		return <BracketHybrid {...props} />;
	}

	return <BracketQuadro {...props} />;
}
