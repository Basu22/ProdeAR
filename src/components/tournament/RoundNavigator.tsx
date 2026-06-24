/**
 * RoundNavigator — Flechas circulares para navegar entre rondas del bracket.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Renderiza 2 botones circulares (◀ →) que permiten navegar entre las 5
 * rondas del Mundial (16vos → 8vos → 4tos → Semis → Final) + 3er Puesto.
 *
 * Reglas de habilitación (función pura `getRoundNavigatorState`):
 * - 16vos: solo flecha derecha habilitada (es la primera ronda)
 * - 8vos, 4tos, Semis: ambas flechas habilitadas
 * - Final: solo flecha izquierda habilitada (es la última ronda)
 * - 3RD: solo flecha izquierda habilitada (apéndice de la final)
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * @param current - Ronda actualmente visible.
 * @param onNavigate - Callback al hacer click en una flecha habilitada.
 * @param variant - "header" (default, integrado en el header del árbol)
 *                   o "bottom-fixed" (mobile, overlay sticky abajo).
 * @param className - Classes extra para el contenedor.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - <button> nativos con aria-label descriptivo (de ArrowState.label).
 * - aria-disabled en los buttons deshabilitados.
 * - Touch target mínimo 40×40px (cumple WCAG 2.5.5).
 * - Keyboard: Enter/Space activan el button (default del browser).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const [round, setRound] = useState<RoundAbbreviation>("R32");
 *
 * <RoundNavigator
 *   current={round}
 *   onNavigate={setRound}
 * />
 * ```
 */

import { getRoundNavigatorState } from "../../lib/bracketNavigation";
import type { RoundAbbreviation } from "../../lib/roundNames";

interface RoundNavigatorProps {
	/** Ronda actualmente visible. */
	current: RoundAbbreviation;
	/** Callback al hacer click en una flecha habilitada. */
	onNavigate: (round: RoundAbbreviation) => void;
	/** Variante visual: "header" (default) o "bottom-fixed" (mobile overlay). */
	variant?: "header" | "bottom-fixed";
	className?: string;
}

export function RoundNavigator({
	current,
	onNavigate,
	variant = "header",
	className = "",
}: RoundNavigatorProps) {
	const state = getRoundNavigatorState(current);

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

	const containerClass = {
		header: "flex items-center gap-2",
		"bottom-fixed":
			"flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-container/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
	}[variant];

	return (
		<div
			className={`${containerClass} ${className}`.trim()}
			role="navigation"
			aria-label="Navegación del bracket"
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
					w-11 h-11 rounded-full
					border backdrop-blur-md
					transition-all duration-200
					active:scale-[0.96]
					cursor-pointer select-none
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

			{/* Indicador de ronda actual (centro, opcional) */}
			<span
				className="font-label-caps text-[10px] text-on-surface-variant tracking-widest uppercase tabular-nums px-2"
				aria-label={`Ronda ${state.currentIndex + 1} de ${state.totalRounds}`}
			>
				{state.currentIndex + 1} / {state.totalRounds}
			</span>

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
					w-11 h-11 rounded-full
					border backdrop-blur-md
					transition-all duration-200
					active:scale-[0.96]
					cursor-pointer select-none
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
		</div>
	);
}
