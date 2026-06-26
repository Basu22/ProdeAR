/**
 * `GlobalBracketHeader` — Header clickeable de cada ronda en Vista Global.
 *
 * ============================================================================
 * PROPÓSITO (Capa 3)
 * ============================================================================
 * Reemplaza el header inline de `BracketRound` (línea de cal + h3 + badges)
 * cuando se renderiza en la Vista Global del Bracket V2. La diferencia clave:
 * TODO el header es clickeable y abre la Vista Detalle de esa ronda.
 *
 * Compara con `BracketRound` (legacy, header estático):
 * - **Legacy**: el header es decorativo, no clickeable. El usuario navega
 *   entre rondas con los chips del `RoundChipBar` o con scroll horizontal.
 * - **V2 (este)**: cada ronda tiene su propio "punto de entrada" a la
 *   Vista Detalle. Tap en el header → Vista Detalle de ESA ronda, no otra.
 *
 * ============================================================================
 * DISEÑO
 * ============================================================================
 * - Altura fija 48px (`h-12`) para consistencia con el header legacy.
 * - Border inferior sutil (1px) que se vuelve cyan (`border-primary/30`)
 *   cuando hay partidos en vivo, comunicando visualmente "hay acción".
 * - Tipografía: `font-headline-md` para el nombre, `font-label-caps` para
 *   multiplier y counter (consistente con el resto del design system).
 * - Chevron `›` a la derecha (solo visible en hover/active) como affordance
 *   de "tocá para ver detalle".
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `<button>` semántico con `aria-label` descriptivo incluyendo el multiplier.
 * - Tap target ≥ 44px de alto (48px = h-12).
 * - Focus ring 2px primary/50 + offset 2px.
 * - `motion-reduce:transition-none` en todas las transiciones.
 * - Counter con `aria-label="X de Y partidos definidos"`.
 *
 * ============================================================================
 * ROADMAP
 * ============================================================================
 * - Capa 3 (esta): header clickeable con contador y multiplier.
 * - Capa 5: micro-interacciones adicionales (scale on press, badge pulse).
 *
 * @module components/tournament/bracket-v2/GlobalBracketHeader
 */

import type { KnockoutRound } from "../../../lib/bracketTypes";

// ============================================================================
// TYPES
// ============================================================================

interface GlobalBracketHeaderProps {
	round: KnockoutRound;
	/** Si true, el round tiene partidos en vivo (border cyan + pulse). */
	isLive?: boolean;
	/** Callback al hacer click → abre Vista Detalle de esta ronda. */
	onClick: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Header clickeable de una ronda en Vista Global. Renderiza:
 * - Línea de cal signature (gradiente decorativo)
 * - Nombre de la ronda (h3, uppercase)
 * - Badge multiplier ×N
 * - Counter "X/Y definidos"
 * - Chevron affordance (hover)
 *
 * Tap → `onClick()` → Vista Detalle de esta ronda.
 */
export function GlobalBracketHeader({
	round,
	isLive = false,
	onClick,
}: GlobalBracketHeaderProps) {
	const { meta, completedCount, matches } = round;
	const totalMatches = matches.length;

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`Ver detalle de ${meta.label}, multiplicador ×${meta.multiplier}`}
			className={`
				group
				w-full
				h-12
				flex items-center justify-between gap-2
				px-1
				rounded-lg
				bg-transparent
				hover:bg-white/[0.04]
				active:scale-[0.99]
				transition-[transform,background-color] duration-200
				motion-reduce:transition-none
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background
			`.trim()}
		>
			{/* Línea de cal (gradient decorativo) — solo visible al hover */}
			<div
				aria-hidden="true"
				className={`
					absolute top-0 left-2 right-2 h-[2px]
					rounded-full
					bg-gradient-to-r from-primary/60 via-tertiary/40 to-error/60
					opacity-0 group-hover:opacity-70
					transition-opacity duration-200
					motion-reduce:transition-none
				`.trim()}
			/>

			<div className="flex items-center gap-1.5 min-w-0 flex-1">
				<h3
					className="
						font-headline-md text-sm
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
						inline-flex items-center px-1.5 py-0.5 rounded-full
						bg-tertiary/15 border border-tertiary/40 text-tertiary
						font-label-caps text-[9px]
						font-black tracking-widest uppercase tabular-nums
						flex-shrink-0
					"
				>
					×{meta.multiplier}
				</span>
			</div>

			{/* Counter X/Y + live indicator */}
			<div className="flex items-center gap-1.5 flex-shrink-0">
				{isLive && (
					<span
						aria-hidden="true"
						className="
							inline-block w-1.5 h-1.5 rounded-full
							bg-error
							animate-pulse
							motion-reduce:animate-none
						"
					/>
				)}
				<span
					role="img"
					aria-label={`${completedCount} de ${totalMatches} partidos definidos`}
					className="
						inline-flex items-center px-1.5 py-0.5 rounded-full
						bg-white/5 border border-white/10 text-on-surface-variant
						font-label-caps text-[9px]
						font-bold tracking-widest uppercase tabular-nums
					"
				>
					<span className="text-white font-black">{completedCount}</span>
					<span className="mx-0.5">/</span>
					<span>{totalMatches}</span>
				</span>
				{/* Chevron hint (visible en hover) */}
				<span
					className="
						material-symbols-outlined
						text-white/30 group-hover:text-white/70
						transition-colors duration-200
						motion-reduce:transition-none
						text-base
					"
					aria-hidden="true"
					style={{ fontSize: "16px" }}
				>
					chevron_right
				</span>
			</div>
		</button>
	);
}
