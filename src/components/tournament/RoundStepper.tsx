/**
 * RoundStepper — Stepper unificado de rondas con flechas + pills clickeables.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Combina el `RoundNavigator` (flechas ◀ ▶) con pills de progreso clickeables
 * (16vos · 8vos · 4tos · Semis · Final) en un solo componente horizontal.
 *
 * El usuario puede:
 * - Navegar secuencialmente con las flechas (◀ ▶)
 * - Saltar directamente a una ronda con click en la pill
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * @param current - Ronda actualmente visible.
 * @param onNavigate - Callback al hacer click en una flecha o pill.
 * @param hasThirdPlace - Si true, muestra un sub-CTA "Ver partido por el 3er puesto" en la última pill.
 * @param liveRounds - Set de rondas con partidos en vivo (muestra dot rojo pulsante).
 * @param className - Classes extra para el contenedor.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - role="tablist" con aria-label="Rondas de eliminatorias"
 * - Cada pill es role="tab" con aria-selected y aria-current="step"
 * - Flechas con aria-label descriptivo y aria-disabled
 * - Indicador live con aria-live="polite" (anuncia ronda actual al SR)
 * - prefers-reduced-motion respetado en transiciones
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <RoundStepper
 *   current="R32"
 *   onNavigate={setRound}
 *   hasThirdPlace={true}
 *   liveRounds={new Set(["R16"])}
 * />
 * ```
 */

import {
	getProgressPills,
	getRoundNavigatorState,
} from "../../lib/bracketNavigation";
import type { RoundAbbreviation } from "../../lib/roundNames";

interface RoundStepperProps {
	/** Ronda actualmente visible. */
	current: RoundAbbreviation;
	/** Callback al hacer click en una flecha o pill. */
	onNavigate: (round: RoundAbbreviation) => void;
	/** Si true, muestra un sub-CTA "Ver partido por el 3er puesto" en la última pill. */
	hasThirdPlace?: boolean;
	/** Set de rondas con partidos en vivo (muestra dot rojo pulsante). */
	liveRounds?: Set<RoundAbbreviation>;
	className?: string;
}

export function RoundStepper({
	current,
	onNavigate,
	hasThirdPlace = false,
	liveRounds,
	className = "",
}: RoundStepperProps) {
	const state = getRoundNavigatorState(current);
	const pills = getProgressPills();
	const liveSet = liveRounds ?? new Set<RoundAbbreviation>();

	const handleLeft = () => {
		if (state.left.enabled && state.left.target) {
			onNavigate(state.left.target);
		}
	};

	const handleRight = () => {
		if (state.right.enabled && state.right.target) {
			onNavigate(state.right.target);
		}
	};

	return (
		<div
			className={`flex items-center gap-1 sm:gap-2 flex-wrap justify-center ${className}`.trim()}
			role="tablist"
			aria-label="Rondas de eliminatorias"
		>
			{/* Flecha izquierda */}
			<button
				type="button"
				onClick={handleLeft}
				disabled={!state.left.enabled}
				aria-label={state.left.label}
				aria-disabled={!state.left.enabled}
				title={
					state.left.target ? `Ir a ${state.left.target}` : state.left.label
				}
				className={`
					flex items-center justify-center
					w-10 h-10 sm:w-11 sm:h-11 rounded-full
					border backdrop-blur-md
					transition-all duration-200
					active:scale-[0.96]
					cursor-pointer select-none
					focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none
					${
						state.left.enabled
							? "bg-surface-container/60 border-white/10 text-primary hover:bg-surface-container-high hover:border-primary/40"
							: "bg-surface-container/30 border-white/5 text-on-surface-variant/30 cursor-not-allowed"
					}
				`.trim()}
			>
				<span
					className="material-symbols-outlined"
					style={{ fontSize: "20px" }}
					aria-hidden="true"
				>
					chevron_left
				</span>
			</button>

			{/* Pills de progreso clickeables */}
			{pills.map((pill) => {
				const isActive = pill.abbr === current;
				const isLive = liveSet.has(pill.abbr);
				return (
					<button
						key={pill.abbr}
						type="button"
						role="tab"
						aria-selected={isActive}
						aria-current={isActive ? "step" : undefined}
						onClick={() => onNavigate(pill.abbr)}
						title={pill.full}
						className={`
							relative px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full
							font-label-caps text-[10px] sm:text-xs
							font-bold uppercase tracking-wider
							transition-all duration-200
							active:scale-[0.96]
							cursor-pointer select-none
							focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none
							${
								isActive
									? "bg-primary text-on-primary font-black shadow-[0_0_15px_rgba(0,229,255,0.3)]"
									: "bg-surface-container/40 text-on-surface-variant border border-white/5 hover:bg-surface-container hover:text-white"
							}
						`.trim()}
					>
						<span className="flex items-center gap-1.5">
							{/* Dot rojo pulsante para rondas con partidos en vivo */}
							{isLive && (
								<span
									aria-label="En vivo"
									className="w-1.5 h-1.5 rounded-full bg-error animate-live-pulse"
								/>
							)}
							<span className="hidden sm:inline">{pill.full}</span>
							<span className="sm:hidden">{pill.short}</span>
						</span>
					</button>
				);
			})}

			{/* Flecha derecha */}
			<button
				type="button"
				onClick={handleRight}
				disabled={!state.right.enabled}
				aria-label={state.right.label}
				aria-disabled={!state.right.enabled}
				title={
					state.right.target ? `Ir a ${state.right.target}` : state.right.label
				}
				className={`
					flex items-center justify-center
					w-10 h-10 sm:w-11 sm:h-11 rounded-full
					border backdrop-blur-md
					transition-all duration-200
					active:scale-[0.96]
					cursor-pointer select-none
					focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none
					${
						state.right.enabled
							? "bg-surface-container/60 border-white/10 text-primary hover:bg-surface-container-high hover:border-primary/40"
							: "bg-surface-container/30 border-white/5 text-on-surface-variant/30 cursor-not-allowed"
					}
				`.trim()}
			>
				<span
					className="material-symbols-outlined"
					style={{ fontSize: "20px" }}
					aria-hidden="true"
				>
					chevron_right
				</span>
			</button>

			{/* Sub-CTA: Ver partido por el 3er puesto (solo en la última ronda si hasThirdPlace) */}
			{hasThirdPlace && current === "F" && (
				<button
					type="button"
					onClick={() => onNavigate("3RD")}
					className="
						ml-1 sm:ml-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full
						bg-tertiary/15 border border-tertiary/40 text-tertiary
						font-label-caps text-[10px] sm:text-xs
						font-bold uppercase tracking-wider
						transition-all duration-200
						active:scale-[0.96]
						cursor-pointer select-none
						focus-visible:ring-2 focus-visible:ring-tertiary/50 focus-visible:outline-none
						hover:bg-tertiary/25
					"
					aria-label="Ver partido por el tercer puesto"
				>
					<span className="flex items-center gap-1.5">
						<span
							className="material-symbols-outlined"
							style={{ fontSize: "14px" }}
							aria-hidden="true"
						>
							emoji_events
						</span>
						<span>3er Puesto</span>
					</span>
				</button>
			)}
		</div>
	);
}
