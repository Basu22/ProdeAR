/**
 * BracketRound — Una ronda completa del árbol de eliminatorias.
 *
 * ============================================================================
 * SPRINT 5D+ — REFACTOR A CSS GRID (Approach A)
 * ============================================================================
 * Layout estructurado en 2 zonas:
 * 1. **Header zone** (`h-12` fija, 48px): línea de cal + nombre + multiplier + counter.
 *    La altura fija garantiza que el grid de cards empiece a la misma Y en
 *    TODAS las columnas, lo que hace que la matemática del árbol se cumpla
 *    por construcción.
 * 2. **Cards zone** (grid de 16 filas virtuales, `flex-1`): las N cards de
 *    la ronda se distribuyen con `grid-row: span ${16/N}` y `flex items-center`
 *    para que cada card esté centrada verticalmente en su span.
 *
 * Ejemplo con R16 (8 cards):
 *   - Cada card ocupa 2 filas del grid
 *   - El span es de 140px (2×64 + 1×12) en viewport ~700px
 *   - El centro del span = 70px = centro del par (R32-1 centro 32px, R32-2 centro 108px)
 *   - La invariante geométrica del árbol se cumple sin measurement runtime.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * - Renderiza el header de la ronda: línea de cal + nombre + multiplier + counter
 * - Renderiza el grid de 16 filas con N cards distribuidas
 * - Las cards viven en wrappers `<div>` que llevan `data-card-position={n}` y
 *   `style={{ gridRow: \`span ${16/N}\` }}`
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - round: KnockoutRound con meta + matches
 * - cardVariant: qué variante pasar a BracketMatchCard hijos
 * - onOpenDetails: callback que se propaga a los cards
 *
 * ============================================================================
 * VISUAL DESIGN
 * ============================================================================
 * - Header sticky-style: nombre grande + multiplier + counter
 * - Border-bottom con gradiente "línea de cal" entre rondas (en TODAS, no
 *   solo en R32 — la consistencia visual es importante)
 * - Grid responsive: 16 filas virtuales, cada card se centra con `flex items-center`
 */

import type { KnockoutRound } from "../../lib/bracketTypes";
import { MemoizedBracketMatchCard } from "./BracketMatchCard";

interface BracketRoundProps {
	round: KnockoutRound;
	cardVariant: "compact" | "default" | "hero";
	onOpenDetails?: (matchId: string) => void;
}

/**
 * Constante global: cantidad de filas del virtual grid compartido por
 * todas las columnas. Hardcodeado en 16 porque R32 tiene 16 cards
 * (Mundial 2026, 8 grupos × 2 partidos de 16vos = 16). Si cambia la
 * cantidad de grupos, hay que ajustar este número y re-validar.
 */
const UNIT_ROWS = 16;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketRound({
	round,
	cardVariant,
	onOpenDetails,
}: BracketRoundProps) {
	const { meta, matches, completedCount } = round;
	const totalMatches = matches.length;

	// Cada card de esta ronda ocupa `span` filas del virtual grid.
	// R32 (16 cards) → span 1, R16 (8) → span 2, QF (4) → span 4,
	// SF (2) → span 8, F (1) → span 16.
	const span = UNIT_ROWS / totalMatches;

	return (
		<section
			aria-label={`Ronda: ${meta.label}`}
			className="flex flex-col h-full min-h-0"
		>
			{/* Header zone — h-12 fija, contiene la línea de cal arriba + h3 + badges.
			    La línea de cal se renderiza en TODAS las rondas (no solo en R32) para
			    consistencia visual entre columnas. */}
			<header className="h-12 shrink-0 flex flex-col justify-center gap-0.5">
				{/* Línea de cal "signature" — gradiente decorativo */}
				<div
					aria-hidden="true"
					className="h-[2px] bg-gradient-to-r from-primary/60 via-tertiary/40 to-error/60 rounded-full mx-auto max-w-md opacity-70"
				/>

				<div className="flex items-center justify-between gap-3 px-1">
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
				</div>
			</header>

			{/* Cards zone — grid virtual de 16 filas, cada card ocupa `span` filas
			    y se centra verticalmente con `flex items-center`. */}
			<div
				className="grid gap-y-1.5 flex-1 min-h-0"
				style={{
					gridTemplateRows: `repeat(${UNIT_ROWS}, minmax(0, 1fr))`,
				}}
			>
				{matches.map((match) => (
					<div
						key={match.id}
						data-card-position={match.position}
						style={{ gridRow: `span ${span}` }}
						className="flex items-center min-h-0"
					>
						<MemoizedBracketMatchCard
							match={match}
							variant={cardVariant}
							onOpenDetails={onOpenDetails}
							bracketPosition={match.position}
						/>
					</div>
				))}
			</div>
		</section>
	);
}
