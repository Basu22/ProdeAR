import { useEffect, useState } from "react";
import type { MatchEvent } from "../../lib/types";

interface EventToastProps {
	event: MatchEvent;
	onComplete: () => void;
}

/**
 * Toast para eventos no-gol (amarilla, roja, sustitución, VAR, info).
 * Timing: entrada 0.35s, visible 6s, salida 0.5s (total 6.85s).
 * Posición: absolute bottom-4 left-4 right-4 z-30 dentro de la card.
 */
export function EventToast({ event, onComplete }: EventToastProps) {
	const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

	useEffect(() => {
		const t1 = setTimeout(() => setPhase("visible"), 350);
		const t2 = setTimeout(() => setPhase("exit"), 350 + 6000);
		const t3 = setTimeout(() => onComplete(), 350 + 6000 + 500);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
		};
	}, [onComplete]);

	type ToastConfig = { icon: string; bg: string; text: string };
	const configMap: Record<MatchEvent["type"], ToastConfig> = {
		yellow: {
			icon: "🟨",
			bg: "bg-amber-500/20 border-amber-500/40",
			text: "text-amber-400",
		},
		red: {
			icon: "🟥",
			bg: "bg-error/20 border-error/40",
			text: "text-red-400",
		},
		subst: {
			icon: "🔄",
			bg: "bg-sky-500/20 border-sky-500/40",
			text: "text-sky-400",
		},
		var: {
			icon: "🖥️",
			bg: "bg-purple-500/20 border-purple-500/40",
			text: "text-purple-400",
		},
		goal: {
			icon: "⚽",
			bg: "bg-pitch-green/20 border-pitch-green/40",
			text: "text-pitch-green",
		},
		info: {
			icon: "ℹ️",
			bg: "bg-white/10 border-white/20",
			text: "text-white",
		},
	};
	const config = configMap[event.type] ?? configMap.info;

	const animClass =
		phase === "enter"
			? "animate-toast-enter"
			: phase === "exit"
				? "animate-toast-exit"
				: "";

	return (
		<div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className={`flex items-center gap-2 ${config.bg} border backdrop-blur-sm rounded-xl px-3 py-2 ${animClass}`}
			>
				<span className="text-lg flex-shrink-0">{config.icon}</span>
				<div className="flex-1 min-w-0">
					<p className={`text-xs font-bold ${config.text} truncate`}>
						{event.playerName}
					</p>
					<p className="text-[10px] text-on-surface-variant">
						{event.minute}'
						{event.extra ? `+${event.extra}` : ""} ·{" "}
						{event.team === "home" ? "Local" : "Visitante"}
					</p>
				</div>
			</div>
		</div>
	);
}
