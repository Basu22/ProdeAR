import { useCountdown } from "../../hooks/useCountdown";
import type { Match } from "../../lib/types";

export interface ActionBarProps {
	/** Cantidad de predicciones pendientes. */
	pendingCount: number;
	/** ID del primer partido pendiente (para scroll). */
	firstPendingMatchId: string | null;
	/** Día (YYYY-MM-DD) del primer partido pendiente. */
	firstPendingMatchDay: string | null;
	/** Callback para hacer scroll al partido. */
	onScrollToMatch: (matchId: string, dayKey: string) => void;
	/** Fecha de cierre del próximo pronóstico (para countdown). */
	nextCloseTime: Date | null;
	/** Siguiente partido que cierra (para enriquecer el aria-label del countdown). */
	nextClosingMatch: Match | null;
}

/**
 * ActionBar combina dos CTAs contextuales para el usuario:
 *  - E1: "Tenés N predicciones pendientes" (si count > 0)
 *  - E2: "Cierra en Xh Ymin" (si hay un partido pronosticable próximo)
 *
 * Si no hay ninguno de los dos, no se renderiza.
 */
export function ActionBar({
	pendingCount,
	firstPendingMatchId,
	firstPendingMatchDay,
	onScrollToMatch,
	nextCloseTime,
	nextClosingMatch,
}: ActionBarProps) {
	const countdown = useCountdown(nextCloseTime);

	const hasPending =
		pendingCount > 0 && firstPendingMatchId && firstPendingMatchDay;
	const hasCountdown = nextCloseTime !== null && !countdown.isExpired;

	// Si no hay nada que mostrar, no renderizar el wrapper
	if (!hasPending && !hasCountdown) return null;

	const handlePendingClick = () => {
		if (firstPendingMatchId && firstPendingMatchDay) {
			onScrollToMatch(firstPendingMatchId, firstPendingMatchDay);
		}
	};

	return (
		<section
			className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 w-full animate-enter"
			aria-label="Acciones rápidas de predicción"
		>
			{/* E1 — CTA Predicciones Pendientes */}
			{hasPending && (
				<button
					type="button"
					onClick={handlePendingClick}
					aria-label={`Tenés ${pendingCount} ${pendingCount === 1 ? "predicción pendiente" : "predicciones pendientes"}. Toca para ir a la primera.`}
					className="group flex items-center justify-between gap-3 w-full md:w-auto md:min-w-[280px] px-4 py-3 rounded-2xl bg-primary/5 border border-primary/25 hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98] transition-[background-color,border-color,transform] duration-200 cursor-pointer text-left"
				>
					<div className="flex items-center gap-2.5 min-w-0">
						{/* Indicador pulsante (ámbar) */}
						<span className="relative flex items-center justify-center w-2 h-2 flex-shrink-0">
							<span className="absolute inset-0 rounded-full bg-tertiary/40 animate-ping motion-reduce:hidden" />
							<span className="relative w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(255,214,0,0.6)]" />
						</span>

						{/* Icono Material */}
						<span className="material-symbols-outlined text-[18px] text-primary transition-transform duration-200 group-hover:scale-110">
							pending_actions
						</span>

						{/* Texto */}
						<span className="font-label-caps text-[11px] font-bold uppercase tracking-widest text-white truncate">
							{pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
						</span>
					</div>

					{/* Chevron indicador de acción */}
					<span className="material-symbols-outlined text-base text-primary transition-transform duration-200 group-hover:translate-x-0.5">
						chevron_right
					</span>
				</button>
			)}

			{/* E2 — Countdown al próximo cierre */}
			{hasCountdown && (
				<div
					role="timer"
					aria-live="polite"
					aria-atomic="true"
					aria-label={`Cierre de predicciones en ${countdown.formatted}${nextClosingMatch ? ` para el partido ${nextClosingMatch.homeTeam} vs ${nextClosingMatch.awayTeam}` : ""}`}
					className={`flex items-center gap-2.5 w-full md:w-auto px-3.5 py-2 rounded-full bg-surface-container/60 border ${
						countdown.msRemaining < 15 * 60 * 1000
							? "border-error/30"
							: "border-white/10"
					} transition-colors duration-300`}
				>
					{/* Dot de estado */}
					<span
						className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
							countdown.msRemaining < 15 * 60 * 1000
								? "bg-error shadow-[0_0_6px_rgba(255,42,42,0.6)]"
								: "bg-tertiary shadow-[0_0_6px_rgba(255,214,0,0.4)]"
						}`}
					/>

					{/* Icono Material */}
					<span
						className={`material-symbols-outlined text-[16px] ${
							countdown.msRemaining < 15 * 60 * 1000
								? "text-error"
								: "text-on-surface-variant"
						}`}
					>
						schedule
					</span>

					{/* Texto */}
					<span
						className={`font-label-caps text-[10px] font-bold uppercase tracking-widest tabular-nums ${
							countdown.msRemaining < 15 * 60 * 1000
								? "text-error"
								: "text-on-surface-variant"
						}`}
					>
						{countdown.msRemaining < 60 * 60 * 1000
							? `¡${countdown.formatted} para cerrar!`
							: `Cierra en ${countdown.formatted}`}
					</span>
				</div>
			)}
		</section>
	);
}
