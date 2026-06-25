/**
 * BracketColumn — Columna individual del carrusel de eliminatorias.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Wrapper de `BracketRound` que agrega:
 * 1. `data-round={abbr}` para detección por IntersectionObserver
 * 2. `id` único para `aria-controls` desde los chips
 * 3. Soporte para 3RD sub-card cuando la ronda es F (Final)
 * 4. Border lateral accent según variant (gray/cyan/gold)
 * 5. Min-width responsivo (50vw mobile, flex-1 desktop)
 *
 * ============================================================================
 * LAYOUT
 * ============================================================================
 * - Mobile (< 768px): `min-w-[50vw] snap-start` → 2 columnas visibles
 * - Desktop (≥ 768px): `md:min-w-0 md:flex-1` → 5+1 columnas en viewport
 *
 * ============================================================================
 * 3RD SUB-CARD
 * ============================================================================
 * Cuando `round.meta.abbr === "F"` Y `thirdPlaceMatch` está presente, se
 * renderiza una sub-card `variant="compact"` debajo de la Final con:
 * - Separador dashed de color tertiary
 * - Chip "3er Puesto" centrado entre dos líneas
 * - Ícono `military_tech` (Material Symbol) + texto
 *
 * La sub-card 3RD NO tiene `data-round` propio (vive dentro de F para
 * que el IntersectionObserver no la confunda con una columna aparte).
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `id={panelId}` permite `aria-controls` desde los chips del RoundChipBar
 * - `data-round={abbr}` consumido por el observer (no es accesible, es
 *   solo metadata de layout)
 * - El 3RD separator usa `role="separator"` + `aria-label="3er Puesto"`
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - round: la ronda a renderizar
 * - variant: variant visual de los cards (compact/default/hero)
 * - onOpenDetails: callback al tocar un card
 * - thirdPlaceMatch: opcional, partido por el 3er puesto (solo se muestra en F)
 * - id: opcional, ID del panel (default: `panel-${abbr}`)
 */

import type {
	ExtendedBracketMatch,
	KnockoutRound,
} from "../../lib/bracketTypes";
import { BracketMatchCard } from "./BracketMatchCard";
import { BracketRound } from "./BracketRound";

// ============================================================================
// PROPS
// ============================================================================

interface BracketColumnProps {
	round: KnockoutRound;
	variant: "compact" | "default" | "hero";
	onOpenDetails?: (matchId: string) => void;
	/** Partido por el 3er puesto (solo se muestra si abbr === "F") */
	thirdPlaceMatch?: ExtendedBracketMatch;
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
 * - hero     → gold (final)
 */
const VARIANT_BORDER_LEFT: Record<string, string> = {
	compact: "border-l-on-surface-variant/20",
	default: "border-l-primary/40",
	hero: "border-l-tertiary",
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Separador dashed con chip "3er Puesto" centrado.
 * Se muestra entre la Final y la sub-card 3RD.
 */
function ThirdPlaceSeparator() {
	return (
		<div
			role="separator"
			aria-label="Sección tercer puesto"
			className="flex items-center gap-2 my-3"
		>
			<div
				aria-hidden="true"
				className="flex-1 border-t border-dashed border-tertiary/30"
			/>
			<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/30">
				<span
					className="material-symbols-outlined text-tertiary"
					style={{ fontSize: "12px" }}
				>
					military_tech
				</span>
				<span className="font-label-caps text-[9px] text-tertiary tracking-widest uppercase font-bold">
					3er Puesto
				</span>
			</span>
			<div
				aria-hidden="true"
				className="flex-1 border-t border-dashed border-tertiary/30"
			/>
		</div>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketColumn({
	round,
	variant,
	onOpenDetails,
	thirdPlaceMatch,
	id,
	isLeaving = false,
}: BracketColumnProps) {
	const { meta } = round;
	const panelId = id ?? `panel-${meta.abbr}`;
	const showThirdPlace = meta.abbr === "F" && thirdPlaceMatch;
	const borderLeftClass = VARIANT_BORDER_LEFT[variant] ?? VARIANT_BORDER_LEFT.compact;

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
				isFirst={true}
			/>

			{/* 3RD sub-card (solo en la columna F) */}
			{showThirdPlace && thirdPlaceMatch && (
				<>
					<ThirdPlaceSeparator />
					<div className="max-w-md mx-auto">
						<BracketMatchCard
							match={thirdPlaceMatch}
							variant="compact"
							onOpenDetails={onOpenDetails}
						/>
					</div>
				</>
			)}
		</div>
	);
}
