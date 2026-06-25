/**
 * BracketRound — Una ronda completa del árbol de eliminatorias.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * - Renderiza el header de la ronda: nombre + multiplier badge + counter
 * - Renderiza el grid de partidos (BracketMatchCard) según la cantidad:
 *   - 16 partidos (R32) → 2 cols mobile, 4 desktop
 *   - 8 partidos (R16)  → 2 cols mobile, 4 desktop
 *   - 4 partidos (QF)   → 2 cols mobile, 2 desktop
 *   - 2 partidos (SF)   → 1-2 cols
 *   - 1 partido  (F)    → 1 col centrado
 * - Línea de cal (gradiente primary → error) como signature separadora
 *   entre rondas (siguiendo el design system del proyecto).
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - round: KnockoutRound con meta + matches
 * - cardVariant: qué variante pasar a BracketMatchCard hijos
 * - onOpenDetails: callback que se propaga a los cards
 * - isFirst: si es la primera ronda (R32), no muestra línea arriba
 *
 * ============================================================================
 * VISUAL DESIGN
 * ============================================================================
 * - Header sticky-style: nombre grande + multiplier + counter
 * - Border-bottom con gradiente "línea de cal" entre rondas
 * - Grid responsive: mantiene 1 col mínimo, expande según viewport
 */

import type { KnockoutRound } from "../../lib/bracketTypes";
import { MemoizedBracketMatchCard } from "./BracketMatchCard";

interface BracketRoundProps {
	round: KnockoutRound;
	cardVariant: "compact" | "default" | "hero";
	onOpenDetails?: (matchId: string) => void;
	/** Si es la primera ronda (no muestra línea de cal arriba) */
	isFirst?: boolean;
	/** Si es la última ronda antes del 3RD (muestra línea de cal extra) */
	isLast?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sprint 5D+: ya no usamos grid. Todas las cards se renderizan en una
 * sola columna vertical (flex flex-col) para soportar el efecto visual
 * del árbol de eliminatorias. Cada card recibe un margin-top proporcional
 * via CSS variable (--bracket-offset-multiplier) seteada en BracketColumn.
 */

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketRound({
	round,
	cardVariant,
	onOpenDetails,
	isFirst = false,
}: BracketRoundProps) {
	const { meta, matches, completedCount } = round;
	const totalMatches = matches.length;

	return (
		<section aria-label={`Ronda: ${meta.label}`} className="space-y-3">
			{/* Línea de cal "signature" — separador superior (excepto en R32) */}
			{!isFirst && (
				<div
					aria-hidden="true"
					className="h-[2px] bg-gradient-to-r from-primary/60 via-tertiary/40 to-error/60 rounded-full mx-auto max-w-md opacity-70"
				/>
			)}

			{/* Header de la ronda */}
			<header className="flex items-center justify-between gap-3 px-1">
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<h3
						className="
							font-headline-md text-sm sm:text-base
							font-black text-white uppercase tracking-wider
							truncate
						"
					>
						{meta.label}
					</h3>
					<span
						role="img"
						aria-label={`Multiplicador ×${meta.multiplier}`}
						className="
							inline-flex items-center px-2 py-0.5 rounded-full
							bg-tertiary/15 border border-tertiary/40 text-tertiary
							font-label-caps text-[9px] sm:text-[10px]
							font-black tracking-widest uppercase tabular-nums
							flex-shrink-0
						"
					>
						×{meta.multiplier}
					</span>
				</div>

				{/* Counter: X/Y definidos */}
				<span
					role="img"
					aria-label={`${completedCount} de ${totalMatches} partidos definidos`}
					className="
						inline-flex items-center px-2 py-0.5 rounded-full
						bg-white/5 border border-white/10 text-on-surface-variant
						font-label-caps text-[9px] sm:text-[10px]
						font-bold tracking-widest uppercase tabular-nums
						flex-shrink-0
					"
				>
					<span className="text-white font-black">{completedCount}</span>
					<span className="mx-0.5">/</span>
					<span>{totalMatches}</span>
				</span>
			</header>

			{/* Sprint 5D+: flex flex-col (no más grid) para soportar el árbol visual */}
			<div className="flex flex-col gap-3">
				{matches.map((match) => (
					<MemoizedBracketMatchCard
						key={match.id}
						match={match}
						variant={cardVariant}
						onOpenDetails={onOpenDetails}
						bracketPosition={match.position}
					/>
				))}
			</div>
		</section>
	);
}
