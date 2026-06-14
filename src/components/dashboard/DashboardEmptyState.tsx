import { useCountdown } from "../../hooks/useCountdown";
import {
	type EmptyStateVariant,
	getEmptyStateCTA,
} from "../../lib/emptyStateHelpers";

export interface DashboardEmptyStateProps {
	variant: EmptyStateVariant;
	/** Próximo día con partidos (para "no_matches_today") */
	nextMatchDayKey?: string;
	nextMatchDayLabel?: string;
	/** Date de cierre del próximo pronóstico (para "countdown_only") */
	nextCloseTime?: Date | null;
	/** Callback para navegar al próximo día */
	onNavigateToNextDay?: (dayKey: string) => void;
}

/**
 * Empty state enriquecido del Dashboard con 4 variantes contextuales.
 * Reemplaza el empty state inline básico de Fase 1.
 */
export function DashboardEmptyState({
	variant,
	nextMatchDayKey,
	nextMatchDayLabel,
	nextCloseTime,
	onNavigateToNextDay,
}: DashboardEmptyStateProps) {
	const countdown = useCountdown(nextCloseTime ?? null, 30_000);
	const cta = getEmptyStateCTA(variant);

	if (variant === "no_matches_today") {
		return (
			<div className="relative overflow-hidden p-8 rounded-2xl glass-card border-white/10 celestial-glow text-center animate-enter">
				<div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
				<div className="relative z-10 space-y-4">
					<span className="material-symbols-outlined text-on-surface-variant text-5xl">
						calendar_today
					</span>
					<div>
						<h3 className="font-headline-md text-base text-white uppercase tracking-wider">
							No hay partidos para este día
						</h3>
						{nextMatchDayLabel && (
							<p className="font-body-md text-xs text-on-surface-variant mt-1 leading-relaxed">
								El próximo partido es el {nextMatchDayLabel}
							</p>
						)}
					</div>
					{cta && nextMatchDayKey && onNavigateToNextDay && (
						<button
							type="button"
							onClick={() => onNavigateToNextDay(nextMatchDayKey)}
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase hover:bg-primary/20 active:scale-[0.97] transition-all cursor-pointer"
						>
							{cta.label}
							<span className="material-symbols-outlined text-base">
								arrow_forward
							</span>
						</button>
					)}
				</div>
			</div>
		);
	}

	if (variant === "no_matches_season") {
		return (
			<div className="relative overflow-hidden p-8 rounded-2xl glass-card border-white/10 celestial-glow text-center animate-enter">
				<div className="absolute -top-8 -left-8 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl" />
				<div className="relative z-10 space-y-3">
					<span className="material-symbols-outlined text-on-surface-variant text-5xl">
						sports_soccer
					</span>
					<h3 className="font-headline-md text-base text-white uppercase tracking-wider">
						Fuera de temporada
					</h3>
					<p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
						No hay partidos programados. Volvé más adelante.
					</p>
				</div>
			</div>
		);
	}

	if (variant === "all_predicted") {
		return (
			<div className="relative overflow-hidden p-8 rounded-2xl glass-card border-white/10 celestial-glow text-center animate-enter">
				<div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
				<div className="relative z-10 space-y-3">
					<span className="material-symbols-outlined text-primary text-5xl text-glowing">
						task_alt
					</span>
					<h3 className="font-headline-md text-base text-white uppercase tracking-wider">
						¡Todas tus predicciones listas!
					</h3>
					<p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
						Pronosticaste todos los partidos de este día. ¡Buena suerte!
					</p>
				</div>
			</div>
		);
	}

	// countdown_only
	return (
		<div
			className="relative overflow-hidden p-8 rounded-2xl glass-card border-white/10 celestial-glow text-center animate-enter"
			role="status"
			aria-live="polite"
		>
			<div className="absolute -top-8 -left-8 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl" />
			<div className="relative z-10 space-y-3">
				<span
					className={`material-symbols-outlined text-5xl ${
						countdown.msRemaining < 60 * 60 * 1000
							? "text-tertiary text-glowing-gold"
							: "text-on-surface-variant"
					}`}
				>
					schedule
				</span>
				<h3 className="font-headline-md text-base text-white uppercase tracking-wider">
					Próximo cierre en {countdown.formatted}
				</h3>
				<p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
					Todos los partidos pronosticados o cerrados
				</p>
			</div>
		</div>
	);
}
