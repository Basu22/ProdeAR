/**
 * MatchMiniRow — Row compacto de un partido para usar en acordeones por
 * grupo/fecha debajo de la tabla de posiciones.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Renderiza una fila horizontal con:
 *   - Logo + nombre local (truncado a 1 línea)
 *   - Score (si finished/live) o fecha/hora (si not_started)
 *   - Logo + nombre visitante (truncado a 1 línea)
 *   - Badge de estado (LIVE pulsante, FT, fecha)
 *   - Broadcaster (canal de TV) si está disponible en `match.tvChannel`
 *
 * ============================================================================
 * UX
 * ============================================================================
 * - Click en cualquier parte de la fila abre el `MatchSheet` con el
 *   detalle del partido (callback `onOpenDetails`).
 * - En mobile, la fila se ve apretada pero scrollea horizontal si hace
 *   falta. Los nombres se truncan a `max-w-[80px]` para evitar overflow.
 * - Atributo `data-tour="match-minirow"` opcional (lo pone el padre
 *   solo en el primer partido del primer acordeón para el tour).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <MatchMiniRow
 *   match={match}
 *   onOpenDetails={(id) => setSelectedMatchId(id)}
 * />
 * ```
 */

import type { Match } from "../../lib/types";

interface MatchMiniRowProps {
	match: Match;
	onOpenDetails: (matchId: string) => void;
	/** Si true, agrega el atributo data-tour para el primer partido (tour) */
	highlightForTour?: boolean;
}

const MONTHS_ES = [
	"ENE",
	"FEB",
	"MAR",
	"ABR",
	"MAY",
	"JUN",
	"JUL",
	"AGO",
	"SEP",
	"OCT",
	"NOV",
	"DIC",
];

function formatKickOffTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatKickOffDayLabel(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	if (d.toDateString() === now.toDateString()) return "HOY";
	const tomorrow = new Date(now);
	tomorrow.setDate(now.getDate() + 1);
	if (d.toDateString() === tomorrow.toDateString()) return "MAÑANA";
	const day = String(d.getDate()).padStart(2, "0");
	return `${day} ${MONTHS_ES[d.getMonth()]}`;
}

interface StatusBadge {
	label: string;
	icon?: string;
	className: string;
}

function getStatusBadge(match: Match): StatusBadge | null {
	if (match.status === "live") {
		return {
			label: match.minute ? `${match.minute}'` : "LIVE",
			icon: "circle",
			className: "bg-error/20 text-error",
		};
	}
	if (match.status === "finished") {
		return {
			label: "FIN",
			className: "bg-white/5 text-on-surface-variant",
		};
	}
	if (match.status === "postponed") {
		return {
			label: "PP",
			className: "bg-amber-500/20 text-amber-400",
		};
	}
	if (match.status === "cancelled") {
		return {
			label: "CANC",
			className: "bg-red-500/20 text-red-400",
		};
	}
	return null;
}

export function MatchMiniRow({
	match,
	onOpenDetails,
	highlightForTour = false,
}: MatchMiniRowProps) {
	const status = getStatusBadge(match);
	const hasScore = match.homeScore !== null && match.awayScore !== null;
	const isNotStarted = match.status === "not_started";

	return (
		<button
			type="button"
			onClick={() => onOpenDetails(match.id)}
			data-tour={highlightForTour ? "match-minirow" : undefined}
			className="
				group w-full flex items-center gap-2 sm:gap-3
				px-3 sm:px-4 py-2.5
				rounded-xl
				bg-surface-container/40 hover:bg-surface-container-high
				border border-white/5 hover:border-white/15
				transition-all duration-150 active:scale-[0.99]
				cursor-pointer text-left
			"
		>
			{/* Home team */}
			<div className="flex-1 flex items-center gap-2 min-w-0 justify-end text-right">
				<span className="font-body-md text-sm font-bold text-white truncate max-w-[100px] sm:max-w-[140px]">
					{match.homeTeam}
				</span>
				{match.homeLogo ? (
					<img
						src={match.homeLogo}
						alt=""
						className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
						loading="lazy"
					/>
				) : (
					<span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
						shield
					</span>
				)}
			</div>

			{/* Score / Time */}
			<div className="shrink-0 min-w-[60px] sm:min-w-[80px] text-center">
				{hasScore ? (
					<div className="flex items-center justify-center gap-1 sm:gap-2">
						<span
							className={`
								font-stat-value text-base sm:text-lg font-black tabular-nums
								${
									match.homeScore! > match.awayScore!
										? "text-white"
										: "text-on-surface-variant"
								}
							`.trim()}
						>
							{match.homeScore}
						</span>
						<span className="text-on-surface-variant/50 font-bold text-xs">
							-
						</span>
						<span
							className={`
								font-stat-value text-base sm:text-lg font-black tabular-nums
								${
									match.awayScore! > match.homeScore!
										? "text-white"
										: "text-on-surface-variant"
								}
							`.trim()}
						>
							{match.awayScore}
						</span>
					</div>
				) : isNotStarted ? (
					<div className="flex flex-col items-center justify-center leading-none gap-0.5">
						<span className="font-label-caps text-[9px] sm:text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
							{formatKickOffDayLabel(match.kickOff)}
						</span>
						<span className="font-headline-md text-sm sm:text-base font-bold text-white tabular-nums">
							{formatKickOffTime(match.kickOff)}
						</span>
					</div>
				) : (
					<span className="font-headline-md text-sm sm:text-base font-bold text-white tabular-nums">
						{formatKickOffTime(match.kickOff)}
					</span>
				)}
				{status && (
					<div
						className={`
							mt-0.5 inline-flex items-center justify-center gap-1
							px-1.5 py-0.5 rounded
							text-[8px] sm:text-[9px] font-black tracking-wider
							${status.className}
						`.trim()}
					>
						{status.icon && (
							<span className="w-1 h-1 rounded-full bg-current animate-live-pulse" />
						)}
						{status.label}
					</div>
				)}
			</div>

			{/* Away team */}
			<div className="flex-1 flex items-center gap-2 min-w-0">
				{match.awayLogo ? (
					<img
						src={match.awayLogo}
						alt=""
						className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
						loading="lazy"
					/>
				) : (
					<span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
						shield
					</span>
				)}
				<span className="font-body-md text-sm font-bold text-white truncate max-w-[100px] sm:max-w-[140px]">
					{match.awayTeam}
				</span>
			</div>

			{/* Broadcaster (cancha lateral, oculta en mobile muy chico) */}
			{match.tvChannel && (
				<div
					className="
						hidden md:flex shrink-0 items-center gap-1
						px-2 py-1 rounded
						bg-primary/5 border border-primary/20
						max-w-[120px]
					"
					title={`Canal: ${match.tvChannel}`}
				>
					<span className="material-symbols-outlined text-[12px] text-primary">
						live_tv
					</span>
					<span className="font-label-caps text-[9px] font-bold text-primary tracking-wider uppercase truncate">
						{match.tvChannel}
					</span>
				</div>
			)}
		</button>
	);
}
