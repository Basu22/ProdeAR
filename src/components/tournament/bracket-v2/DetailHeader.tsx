/**
 * `DetailHeader` — Header sticky de la Vista Detalle del Bracket V2.
 *
 * ============================================================================
 * PROPÓSITO (Capa 4)
 * ============================================================================
 * Header sticky que aparece arriba de la Vista Detalle de UNA ronda.
 * Tiene 3 zonas:
 * - **Izquierda**: botón "← Volver" (z-30, sobre las cards) → vuelve a Global.
 * - **Centro**: nombre de la ronda + multiplier ×N + counter X/Y.
 * - **Derecha**: botones prev/next (chevron_left, chevron_right).
 *
 * ============================================================================
 * DISEÑO
 * ============================================================================
 * - Sticky debajo del TopAppBar: `sticky top-16 z-30`.
 * - `backdrop-blur-xl` con `bg-background/85` para legibilidad sobre cards.
 * - Border inferior sutil (1px white/5) + sombra para separación visual.
 * - Tap targets ≥ 44×44px en todos los botones (cumple WCAG 2.5.5 AAA).
 * - Botones prev/next deshabilitados en los extremos (R32 y F) o en 3RD.
 *   Estado deshabilitado: opacidad 0.3 + `cursor-not-allowed` + `aria-disabled`.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `<header>` semántico con `role="banner"` implícito.
 * - Cada botón tiene `aria-label` descriptivo ("Volver al bracket", "Ronda
 *   anterior: 4tos de final", "Ronda siguiente: Final").
 * - Multiplier y counter tienen `aria-label` específico.
 * - Focus ring 2px primary/50 + offset 2px en todos los botones.
 * - `motion-reduce:transition-none` en transiciones.
 *
 * @module components/tournament/bracket-v2/DetailHeader
 */

import type { RoundMeta } from "../../../lib/bracketTypes";
import type { RoundNavigatorState } from "../../../lib/bracketNavigation";

// ============================================================================
// TYPES
// ============================================================================

interface DetailHeaderProps {
	round: RoundMeta;
	completedCount: number;
	totalMatches: number;
	navState: RoundNavigatorState;
	onOpenTree: () => void;
	onPrev: () => void;
	onNext: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Header sticky de la Vista Detalle. Renderiza:
 * - Botón "← Volver" (izquierda)
 * - Nombre de ronda + multiplier ×N + counter X/Y (centro)
 * - Botones prev/next (derecha)
 */
export function DetailHeader({
	round,
	completedCount,
	totalMatches,
	navState,
	onOpenTree,
	onPrev,
	onNext,
}: DetailHeaderProps) {
	return (
		<header
			className="
				sticky top-[112px] z-30
				backdrop-blur-xl bg-background/85
				border-b border-white/5
				shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]
			"
		>
			<div className="flex items-center gap-1.5 sm:gap-2 px-2 py-2">
				{/* Tree button (opt-in Vista Global).
				    Sprint 5D+ polish: oculto en mobile (`< md`) porque la Vista
				    Global no se ve bien en viewports angostos (las cards compactas
				    en columnas de 168px se truncan). En tablet/desktop sigue
				    visible como opt-in. Los usuarios mobile pueden seguir
				    accediendo vía deep link `?view=global` si lo desean. */}
				<button
					type="button"
					onClick={onOpenTree}
					aria-label="Ver árbol completo de eliminatorias"
					className="
						hidden
						md:inline-flex
						shrink-0
						min-h-[44px] min-w-[44px]
						items-center justify-center
						rounded-full
						bg-surface-container/60 border border-white/10
						hover:bg-surface-container-high
						active:scale-[0.96]
						transition-[transform,background-color] duration-200
						motion-reduce:transition-none
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
					"
				>
					<span
						className="material-symbols-outlined text-white"
						style={{ fontSize: "20px" }}
						aria-hidden="true"
					>
						account_tree
					</span>
				</button>

				{/* Centro: nombre + badges */}
				<div className="flex-1 min-w-0 flex items-center justify-center gap-2">
					<h2
						className="
							font-headline-md text-base sm:text-lg
							font-black text-white uppercase tracking-wider
							truncate
						"
					>
						{round.label}
					</h2>
					<span
						role="img"
						aria-label={`Multiplicador ×${round.multiplier}`}
						className="
							inline-flex items-center px-2 py-0.5 rounded-full
							bg-tertiary/15 border border-tertiary/40 text-tertiary
							font-label-caps text-[10px]
							font-black tracking-widest uppercase tabular-nums
							flex-shrink-0
						"
					>
						×{round.multiplier}
					</span>
					<span
						role="img"
						aria-label={`${completedCount} de ${totalMatches} definidos`}
						className="
							inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full
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

				{/* Prev button */}
				<button
					type="button"
					onClick={onPrev}
					disabled={!navState.left.enabled}
					aria-label={navState.left.label}
					aria-disabled={!navState.left.enabled}
					className={`
						shrink-0
						min-h-[44px] min-w-[44px]
						inline-flex items-center justify-center
						rounded-full
						border
						${
							navState.left.enabled
								? "bg-surface-container/60 border-white/10 hover:bg-surface-container-high active:scale-[0.96]"
								: "bg-surface-container/20 border-white/5 opacity-30 cursor-not-allowed"
						}
						transition-[transform,background-color,opacity] duration-200
						motion-reduce:transition-none
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
					`.trim()}
				>
					<span
						className="material-symbols-outlined text-white"
						style={{ fontSize: "20px" }}
						aria-hidden="true"
					>
						chevron_left
					</span>
				</button>

				{/* Next button */}
				<button
					type="button"
					onClick={onNext}
					disabled={!navState.right.enabled}
					aria-label={navState.right.label}
					aria-disabled={!navState.right.enabled}
					className={`
						shrink-0
						min-h-[44px] min-w-[44px]
						inline-flex items-center justify-center
						rounded-full
						border
						${
							navState.right.enabled
								? "bg-surface-container/60 border-white/10 hover:bg-surface-container-high active:scale-[0.96]"
								: "bg-surface-container/20 border-white/5 opacity-30 cursor-not-allowed"
						}
						transition-[transform,background-color,opacity] duration-200
						motion-reduce:transition-none
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
					`.trim()}
				>
					<span
						className="material-symbols-outlined text-white"
						style={{ fontSize: "20px" }}
						aria-hidden="true"
					>
						chevron_right
					</span>
				</button>
			</div>
		</header>
	);
}
