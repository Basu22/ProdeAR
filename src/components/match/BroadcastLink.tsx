import { useLiveMinute } from "../../hooks/useLiveMinute";
import type { Match } from "../../lib/types";

interface BroadcastLinkProps {
	match: Match;
	onOpenDetails: (matchId: string) => void;
}

/**
 * BroadcastLink — "Túnel de Broadcast"
 *
 * Franja horizontal lower-third al pie de la MatchCard que invita al usuario
 * a abrir el detalle completo del partido (eventos, stats, formaciones) en
 * el MatchSheet. Inspirado en los lower-thirds de transmisiones deportivas
 * (ESPN, TyC, Fox Sports).
 *
 * - Copy dinámico según estado del partido
 * - 3 chevrones ▶▶▶ animados (marching ants)
 * - Sweep cyan en hover (broadcastSweep)
 * - Border-top dashed simulando línea de cal
 * - Pill "EN EL DASHBOARD" como marca de origen
 */
export function BroadcastLink({ match, onOpenDetails }: BroadcastLinkProps) {
	const isCancelled = match.status === "cancelled";
	const isPostponed = match.status === "postponed";
	const { minute: liveMinute } = useLiveMinute(match);
	const isLive = match.status === "live";
	const isFinished = match.status === "finished";

	if (isCancelled || isPostponed) {
		return (
			<div className="px-3 py-2 border-t border-dashed border-white/10 flex items-center justify-center gap-2 opacity-40 select-none">
				<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
					link_off
				</span>
				<span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">
					Detalles no disponibles
				</span>
			</div>
		);
	}

	const { label, icon } = getBroadcastCopy(
		isLive,
		isFinished,
		typeof liveMinute === "number" ? liveMinute : null,
	);

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onOpenDetails(match.id);
			}}
			className="group/broadcast w-full px-3 py-2 md:px-4 md:py-2.5 border-t border-dashed border-white/10 bg-gradient-to-r from-surface-container-lowest/40 via-surface-container/30 to-surface-container-lowest/40 hover:bg-primary/5 transition-[background-color] duration-200 cursor-pointer flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-b-2xl active:scale-[0.99]"
			aria-label={`${label} — abrir detalle del partido`}
		>
			{/* Sweep overlay (hover) */}
			<span
				aria-hidden="true"
				className="broadcast-sweep absolute inset-0 pointer-events-none rounded-b-2xl"
			/>

			{/* Leading icon */}
			<span
				className="material-symbols-outlined text-[18px] md:text-[20px] text-primary stadium-glow-celeste transition-transform duration-200 group-hover/broadcast:scale-110 shrink-0"
				style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.45))" }}
			>
				{icon}
			</span>

			{/* Main label */}
			<span className="font-headline-md text-sm md:text-base text-white/90 group-hover/broadcast:text-white uppercase tracking-widest font-bold leading-none flex-1 text-left">
				{label}
			</span>

			{/* Marching chevrons ▶▶▶ */}
			<span
				className="animate-arrow-march flex items-center gap-0.5 text-primary/60 group-hover/broadcast:text-primary/90 transition-colors shrink-0"
				aria-hidden="true"
			>
				<span className="material-symbols-outlined text-[14px]">
					play_arrow
				</span>
				<span className="material-symbols-outlined text-[14px]">
					play_arrow
				</span>
				<span className="material-symbols-outlined text-[14px]">
					play_arrow
				</span>
			</span>

			{/* Origin pill */}
			<span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 font-label-caps text-[9px] text-primary uppercase tracking-widest font-bold shrink-0">
				EN EL DASHBOARD
			</span>
		</button>
	);
}

function getBroadcastCopy(
	isLive: boolean,
	isFinished: boolean,
	liveMinute: number | null,
): { label: string; icon: string } {
	if (isLive) {
		return {
			label:
				liveMinute !== null
					? `Ver minuto ${liveMinute}'`
					: "Ver minuto a minuto",
			icon: "live_tv",
		};
	}
	if (isFinished) {
		return { label: "Ver relato completo", icon: "play_circle" };
	}
	return { label: "Ver previa en vivo", icon: "live_tv" };
}
