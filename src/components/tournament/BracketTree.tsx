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

import type { FullBracket } from "../../lib/bracketTypes";
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
 * Wrapper retrocompatible que delega a `BracketQuadro` (carrusel horizontal).
 */
export function BracketTree(props: BracketTreeProps) {
	return <BracketQuadro {...props} />;
}
