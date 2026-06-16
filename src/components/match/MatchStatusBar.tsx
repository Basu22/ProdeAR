import { useCountdown } from "../../hooks/useCountdown";
import type { LiveMinuteInfo } from "../../hooks/useLiveMinute";
import type { MatchCardState } from "../../lib/matchCardState";
import { LiveClockBadge } from "./LiveClockBadge";

export interface MatchStatusBarProps {
	state: MatchCardState;
	/** ISO string del kickoff del partido (para mostrar horario 24h + counter al arranque) */
	kickOff: string;
	/** Si el usuario ya pronosticó este partido en todos los torneos asignados */
	isFullyPredicted?: boolean;
	/**
	 * Info del cronómetro en vivo (retornada por `useLiveMinute`).
	 * Se pasa el objeto completo (no `minute` solo) para preservar
	 * `freshness`/`isStale` y mostrar el indicador honesto en la UI.
	 * Solo se usa cuando `state === "live"`.
	 */
	live?: LiveMinuteInfo;
	/** Cantidad de predicciones del usuario (multi-torneo) */
	predictionCount?: number;
	/**
	 * Sprint "Habilitar formations upcoming" (v1.1): si true, muestra un
	 * badge "👥 11" al lado del horario indicando que las alineaciones
	 * titulares ya están disponibles (señal de discovery en la lista).
	 * Solo se renderiza en estados de pre-partido (no en live/finished).
	 */
	hasLineupsUpcoming?: boolean;
}

const KICKOFF_COUNTDOWN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Status bar de MatchCard (Fase 3).
 *
 * Muestra siempre el horario en formato 24h.
 * - Si el partido aún no arranca y faltan <24h, agrega counter al kickoff.
 * - Si el usuario pronosticó en TODOS sus torneos, oculta el counter.
 * - Estados terminales: live (con minuto) / finished (FIN).
 */
export function MatchStatusBar({
	state,
	kickOff,
	isFullyPredicted = false,
	live,
	predictionCount = 0,
	hasLineupsUpcoming = false,
}: MatchStatusBarProps) {
	// Hooks SIEMPRE al principio (Rules of Hooks: orden estable entre renders)
	const kickoffDate = new Date(kickOff);
	const kickoffCountdown = useCountdown(kickoffDate, 30_000);
	const kickoffTime = kickoffDate.toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	// Sprint "Habilitar formations upcoming" (v1.1): badge reusable para
	// mostrar al lado del horario en estados de pre-partido.
	const lineupsBadge = hasLineupsUpcoming ? (
		<span
			className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary"
			aria-label="Formación titular disponible"
			title="Formación titular disponible — tocá para ver"
		>
			<span className="material-symbols-outlined text-[10px]" aria-hidden="true">
				groups
			</span>
			<span className="font-label-caps text-[8px] tracking-widest font-bold">
				11
			</span>
		</span>
	) : null;

	// live: renderiza el badge compartido (mismo estilo que la card sin cardState)
	if (state === "live") {
		if (live) {
			return <LiveClockBadge live={live} size="sm" />;
		}
		// Fallback defensivo: si por alguna razón no llega `live`, no rompemos.
		return (
			<div className="flex items-center gap-1.5 text-error" role="status">
				<span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
				<span className="font-label-caps text-[10px] font-bold uppercase tracking-widest">
					EN VIVO
				</span>
			</div>
		);
	}

	// finished
	if (state === "finished") {
		return (
			<div
				className="flex items-center gap-1.5 text-on-surface-variant/60"
				role="status"
			>
				<span className="font-label-caps text-[10px] font-bold tracking-widest uppercase">
					FIN
				</span>
			</div>
		);
	}

	// locked (sin predicción, ventana de predicción cerrada)
	if (state === "locked") {
		return (
			<div
				className="flex items-center gap-1.5 text-on-surface-variant/40"
				role="status"
			>
				<span className="material-symbols-outlined text-[14px]">lock</span>
				<span className="font-label-caps text-[10px] font-bold tracking-widest uppercase">
					Cerrado
				</span>
			</div>
		);
	}

	// predicted_locked (con predicción, ventana cerrada): solo horario
	if (state === "predicted_locked") {
		return (
			<div
				className="flex items-center gap-1.5 text-on-surface-variant"
				role="status"
			>
				<span className="font-stat-value text-base font-bold tabular-nums">
					{kickoffTime}
				</span>
				{predictionCount > 1 && (
					<span className="text-[9px] opacity-60">({predictionCount})</span>
				)}
				{lineupsBadge}
			</div>
		);
	}

	// pending_action / predicted_editable: ventana abierta
	// Sub-estado 1: isFullyPredicted → solo horario
	if (isFullyPredicted) {
		return (
			<div
				className="flex items-center gap-1.5 text-on-surface-variant"
				role="status"
			>
				<span className="font-stat-value text-base font-bold tabular-nums">
					{kickoffTime}
				</span>
				{lineupsBadge}
			</div>
		);
	}

	// Sub-estado 2: NO isFullyPredicted + faltan <24h → "⏰ HH:mm · Xh Ymin"
	const showKickoffCounter =
		!kickoffCountdown.isExpired &&
		kickoffCountdown.msRemaining < KICKOFF_COUNTDOWN_THRESHOLD_MS;

	if (showKickoffCounter) {
		const isImminent = kickoffCountdown.msRemaining < 60 * 60 * 1000; // <1h
		return (
			<div
				className={`flex items-center gap-1.5 ${isImminent ? "text-tertiary" : "text-on-surface-variant"}`}
				role="status"
				aria-live="polite"
			>
				{isImminent && (
					<span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
				)}
				<span className="font-stat-value text-base font-bold tabular-nums">
					{kickoffTime}
				</span>
				<span className="font-label-caps text-[10px] font-bold tracking-widest uppercase">
					· {kickoffCountdown.formatted}
				</span>
				{lineupsBadge}
			</div>
		);
	}

	// Sub-estado 3: NO isFullyPredicted + faltan >=24h → "⏰ HH:mm · PENDIENTE"
	return (
		<div
			className="flex items-center gap-1.5 text-on-surface-variant"
			role="status"
		>
			<span className="font-stat-value text-base font-bold tabular-nums">
				{kickoffTime}
			</span>
			<span className="font-label-caps text-[10px] font-bold tracking-widest uppercase opacity-60">
				· Pendiente
			</span>
			{lineupsBadge}
		</div>
	);
}
