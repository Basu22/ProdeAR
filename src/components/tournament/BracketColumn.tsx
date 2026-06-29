/**
 * BracketColumn — Columna individual del carrusel de eliminatorias.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Wrapper de `BracketRound` que agrega:
 * 1. `data-round={abbr}` para detección por IntersectionObserver
 * 2. `id` único para `aria-controls` desde los chips
 * 3. Border lateral accent según variant (gray/cyan/gold)
 * 4. Min-width responsivo (50vw mobile, flex-1 desktop)
 *
 * ============================================================================
 * LAYOUT
 * ============================================================================
 * - Mobile (< 768px): `min-w-[50vw] snap-start` → 2 columnas visibles
 * - Desktop (≥ 768px): `md:min-w-0 md:flex-1` → 6 columnas en viewport
 *   (R32 + R16 + QF + SF + F + 3RD)
 *
 * ============================================================================
 * SPRINT 5+: 3RD COMO COLUMNA INDEPENDIENTE
 * ============================================================================
 * Antes: 3RD era una sub-card dentro de la columna F.
 * Ahora: 3RD es su propia columna navegable (data-round="3RD").
 * La columna F ya no contiene la sub-card 3RD.
 * El consumidor (BracketQuadro) pasa el thirdPlaceMatch como un
 * `KnockoutRound` aparte o como un match directo.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `id={panelId}` permite `aria-controls` desde los chips del RoundChipBar
 * - `data-round={abbr}` consumido por el observer (no es accesible, es
 *   solo metadata de layout)
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - round: la ronda a renderizar
 * - variant: variant visual de los cards (compact/default/hero)
 * - onOpenDetails: callback al tocar un card
 * - id: opcional, ID del panel (default: `panel-${abbr}`)
 */

import type { KnockoutRound } from "../../lib/bracketTypes";
import { BracketRound } from "./BracketRound";

// ============================================================================
// PROPS
// ============================================================================

interface BracketColumnProps {
	round: KnockoutRound;
	variant: "compact" | "default" | "hero";
	onOpenDetails?: (matchId: string) => void;
	/** ID del panel para `aria-controls` desde los chips. Default: `panel-${abbr}` */
	id?: string;
	/**
	 * Sprint 5D+: true si esta columna es la que se está dejando (sale del
	 * viewport por el lado opuesto a la dirección de scroll). Cuando es
	 * true, se aplica `data-leaving="true"` al wrapper para que CSS
	 * muestre el "gap" entre cards (espacio para las líneas conectoras).
	 */
	isLeaving?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Border lateral accent según variant — affordance cromática para
 * diferenciar la "densidad" de cada ronda de un vistazo.
 * - compact  → gris (más denso, R32/R16)
 * - default  → cyan (medio, QF/SF)
 * - hero     → gold (final, 3RD)
 */
const VARIANT_BORDER_LEFT: Record<string, string> = {
	compact: "border-l-on-surface-variant/20",
	default: "border-l-primary/40",
	hero: "border-l-tertiary",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketColumn({
	round,
	variant,
	onOpenDetails,
	id,
	isLeaving = false,
}: BracketColumnProps) {
	const { meta } = round;
	const panelId = id ?? `panel-${meta.abbr}`;
	const borderLeftClass =
		VARIANT_BORDER_LEFT[variant] ?? VARIANT_BORDER_LEFT.compact;

	return (
		<div
			id={panelId}
			data-round={meta.abbr}
			data-leaving={isLeaving ? "true" : "false"}
			className={`
				shrink-0
				min-w-[55vw] sm:min-w-[50vw]
				snap-start
				md:min-w-0 md:flex-1
				border-l-2 ${borderLeftClass}
				pl-3 pr-1
				${isLeaving ? "bracket-column-leaving" : ""}
			`.trim()}
		>
			{/* Round content (reusa BracketRound) */}
			<BracketRound
				round={round}
				cardVariant={variant}
				onOpenDetails={onOpenDetails}
			/>
		</div>
	);
}
