/**
 * RoundChipBar — Header sticky con chips clickeables de rondas.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Barra de navegación horizontal con 6 chips (R32, R16, QF, SF, F, 3RD)
 * que permite saltar directamente a una ronda del bracket.
 *
 * Es sticky (`position: sticky; top: 16`) debajo del TopAppBar y se
 * sincroniza con la URL via `?round=` (deep-linkable).
 *
 * ============================================================================
 * SEMÁNTICA ARIA
 * ============================================================================
 * - `role="navigation"` (NO `role="tablist"`) porque el contenido SCROLLEA,
 *   no aparece/desaparece. La convención WAI-ARIA para carruseles es
 *   `role="navigation"` + `aria-current="page"` en el item activo.
 * - Cada chip es un `<button>` con:
 *   - `aria-current="page"` cuando está activo
 *   - `aria-controls={panelId}` apuntando al `id` del `BracketColumn`
 *   - `aria-label` descriptivo: "Ir a 16vos de final"
 *
 * ============================================================================
 * UX MOBILE-FIRST
 * ============================================================================
 * - Mobile: chips scrolleables horizontalmente (`overflow-x-auto`)
 * - Desktop: todos los chips visibles sin scroll
 * - Tap target: `min-h-[44px] min-w-[44px]` (WCAG 2.5.5)
 * - Active state: scale-105 + ring-2 + color (primary o tertiary para 3RD)
 * - Separador vertical entre F y 3RD (color tertiary/40)
 * - Dot rojo pulsante si la ronda tiene partidos en vivo
 *
 * ============================================================================
 * SEPARADOR F/3RD
 * ============================================================================
 * El chip 3RD tiene un estilo visual diferenciado (ícono military_tech +
 * color tertiary cuando activo) para comunicar que es un "apéndice" de la
 * Final, no una ronda regular. Un separador vertical tertiary/40 refuerza
 * la separación visual.
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - activeRound: la ronda actualmente visible (derivada de ?round= o del observer)
 * - onChipClick: callback al clickear un chip
 * - liveRounds: Set de rondas con partidos en vivo (dot pulsante)
 */

import type { RoundAbbreviation } from "../../lib/roundNames";
import { getProgressPills } from "../../lib/bracketNavigation";

// ============================================================================
// PROPS
// ============================================================================

interface RoundChipBarProps {
	activeRound: RoundAbbreviation;
	onChipClick: (round: RoundAbbreviation) => void;
	liveRounds?: Set<RoundAbbreviation>;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera el `aria-label` descriptivo del chip.
 * - "Ir a 16vos de final"
 * - "Ir a 3er Puesto" (con texto alternativo)
 */
function buildChipAriaLabel(abbr: RoundAbbreviation, full: string): string {
	if (abbr === "3RD") return "Ir a Partido por el tercer puesto";
	return `Ir a ${full}`;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface ChipProps {
	abbr: RoundAbbreviation;
	label: string;
	isActive: boolean;
	isLive: boolean;
	isThirdPlace: boolean;
	onClick: () => void;
	panelId: string;
}

function Chip({
	abbr,
	label,
	isActive,
	isLive,
	isThirdPlace,
	onClick,
	panelId,
}: ChipProps) {
	// Active style: primary para rondas normales, tertiary para 3RD
	const activeClass = isActive
		? isThirdPlace
			? "bg-tertiary text-on-tertiary shadow-[0_0_15px_rgba(255,214,0,0.4)] ring-2 ring-tertiary/30"
			: "bg-primary text-on-primary shadow-[0_0_15px_rgba(0,229,255,0.3)] ring-2 ring-primary/30"
		: "bg-surface-container/40 text-on-surface-variant border border-white/5 hover:bg-surface-container/60";

	return (
		<button
			type="button"
			onClick={onClick}
			aria-controls={panelId}
			aria-current={isActive ? "page" : undefined}
			aria-label={buildChipAriaLabel(abbr, label)}
			className={`
				relative shrink-0
				inline-flex items-center justify-center gap-1.5
				px-3 sm:px-4
				min-h-[44px] min-w-[44px]
				rounded-full
				font-label-caps text-[10px] sm:text-xs
				font-black tracking-widest uppercase
				transition-all duration-200
				active:scale-[0.96]
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
				motion-reduce:transition-none
				${isActive ? "scale-105" : ""}
				${activeClass}
			`.trim()}
		>
			{/* Ícono para 3RD */}
			{isThirdPlace && (
				<span
					className="material-symbols-outlined"
					style={{ fontSize: "14px" }}
					aria-hidden="true"
				>
					military_tech
				</span>
			)}

			{/* Label */}
			<span className="whitespace-nowrap">{label}</span>

			{/* Live indicator (dot rojo pulsante) */}
			{isLive && (
				<span
					aria-label="En vivo"
					className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-error animate-pulse motion-reduce:animate-none ring-2 ring-background"
				/>
			)}
		</button>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RoundChipBar({
	activeRound,
	onChipClick,
	liveRounds = new Set(),
}: RoundChipBarProps) {
	const pills = getProgressPills();
	const thirdPlaceIndex = 4; // Separador entre F (índice 4) y 3RD (índice 5)

	return (
		<nav
			aria-label="Rondas del Mundial"
			className="
				sticky top-16 z-20
				backdrop-blur-xl bg-background/80
				border-b border-white/5
				shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]
				px-2 py-2
			"
		>
			<div
				className="
					flex items-center gap-2
					overflow-x-auto scrollbar-hide
					mx-auto max-w-3xl
				"
			>
				{pills.map((pill, i) => {
					const isThirdPlace = pill.abbr === "3RD";
					const panelId = `panel-${pill.abbr}`;
					return (
						<div key={pill.abbr} className="flex items-center gap-2">
							{/* Separador entre F y 3RD */}
							{i === thirdPlaceIndex && (
								<span
									aria-hidden="true"
									className="w-px h-5 bg-tertiary/40 mx-1 shrink-0"
								/>
							)}
							<Chip
								abbr={pill.abbr}
								label={pill.short}
								isActive={activeRound === pill.abbr}
								isLive={liveRounds.has(pill.abbr)}
								isThirdPlace={isThirdPlace}
								onClick={() => onChipClick(pill.abbr)}
								panelId={panelId}
							/>
						</div>
					);
				})}
			</div>
		</nav>
	);
}
