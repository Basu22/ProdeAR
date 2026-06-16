import { useCountdown } from "../../hooks/useCountdown";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import { getPotentialPoints } from "../../lib/predictionHelpers";
import type { Match } from "../../lib/types";
import { LiveClockBadge } from "./LiveClockBadge";

export interface SheetMatchHeaderProps {
	match: Match;
}

/**
 * Cabecera del MatchSheet: muestra el matchup con score más grande,
 * metadata del partido y countdown al kickoff (si upcoming).
 */
export function SheetMatchHeader({ match }: SheetMatchHeaderProps) {
	const kickoffDate = new Date(match.kickOff);
	const kickoffTime = kickoffDate.toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const countdown = useCountdown(kickoffDate, 30_000);
	const showCountdown = match.status === "not_started" && !countdown.isExpired;

	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isCancelled =
		match.status === "cancelled" || match.status === "postponed";

	// Fuente única de verdad para el cronómetro en vivo: mismo hook que usa
	// la MatchCard, para que no haya divergencia entre card (73') y modal (24').
	const live = useLiveMinute(match);

	const potential = getPotentialPoints(match.stageMultiplier);

	// Score
	const hasScore = match.homeScore !== null && match.awayScore !== null;
	const homeScore = match.homeScore ?? 0;
	const awayScore = match.awayScore ?? 0;
	const homeWon = hasScore && homeScore > awayScore;
	const awayWon = hasScore && awayScore > homeScore;
	const isDraw = hasScore && homeScore === awayScore;

	return (
		<header className="relative w-full space-y-4 px-2 pt-2 pb-4 border-b border-white/5">
			{/* Status badge + countdown */}
			<div className="flex items-center justify-center gap-3 text-[10px] font-label-caps uppercase tracking-widest">
				{isLive && <LiveClockBadge live={live} size="lg" highlightOnMount />}
				{isFinished && (
					<span className="text-on-surface-variant/60 font-bold">FIN</span>
				)}
				{isCancelled && (
					<span className="text-error/80 font-bold">SUSPENDIDO</span>
				)}
				{showCountdown && (
					<span className="text-tertiary font-bold flex items-center gap-1.5">
						<span className="material-symbols-outlined text-[14px]">
							schedule
						</span>
						<span>
							⏰ {kickoffTime} · {countdown.formatted}
						</span>
					</span>
				)}
				{!isLive && !isFinished && !isCancelled && !showCountdown && (
					<span className="text-on-surface-variant font-bold">
						⏰ {kickoffTime}
					</span>
				)}
			</div>

			{/* Score + equipos */}
			<div className="flex items-center justify-center gap-3 md:gap-4">
				{/* Home */}
				<div className="flex flex-col items-center gap-2 flex-1 min-w-0">
					{match.homeLogo ? (
						<img
							src={match.homeLogo}
							alt={match.homeTeam}
							className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
						/>
					) : (
						<div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-surface-container flex items-center justify-center">
							<span className="material-symbols-outlined text-on-surface-variant text-2xl">
								sports_soccer
							</span>
						</div>
					)}
					<span className="font-headline-md text-sm md:text-base font-bold text-white uppercase text-center truncate max-w-full">
						{match.homeTeam}
					</span>
				</div>

				{/* Score o VS */}
				<div className="flex flex-col items-center gap-1 px-2">
					{hasScore ? (
						<div className="font-stat-value text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight flex items-center gap-2">
							<span
								className={
									homeWon
										? "text-primary text-glowing"
										: "text-on-surface-variant"
								}
							>
								{homeScore}
							</span>
							<span className="text-on-surface-variant/40 text-2xl">:</span>
							<span
								className={
									awayWon
										? "text-primary text-glowing"
										: "text-on-surface-variant"
								}
							>
								{awayScore}
							</span>
						</div>
					) : (
						<div className="font-stat-value text-3xl md:text-4xl text-on-surface-variant/40 tracking-widest">
							VS
						</div>
					)}
					{isDraw && hasScore && (
						<span className="text-[9px] text-on-surface-variant uppercase tracking-widest">
							EMPATE
						</span>
					)}
				</div>

				{/* Away */}
				<div className="flex flex-col items-center gap-2 flex-1 min-w-0">
					{match.awayLogo ? (
						<img
							src={match.awayLogo}
							alt={match.awayTeam}
							className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
						/>
					) : (
						<div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-surface-container flex items-center justify-center">
							<span className="material-symbols-outlined text-on-surface-variant text-2xl">
								sports_soccer
							</span>
						</div>
					)}
					<span className="font-headline-md text-sm md:text-base font-bold text-white uppercase text-center truncate max-w-full">
						{match.awayTeam}
					</span>
				</div>
			</div>

			{/* Metadata: estadio + TV + competition */}
			<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-on-surface-variant">
				{match.competitionName && (
					<span className="font-label-caps uppercase tracking-widest">
						{match.competitionName}
					</span>
				)}
				{match.stadium && (
					<span className="flex items-center gap-1">
						<span className="material-symbols-outlined text-[12px]">
							stadium
						</span>
						<span className="truncate max-w-[180px]">{match.stadium}</span>
					</span>
				)}
				{match.tvChannel && (
					<span className="flex items-center gap-1">
						<span className="material-symbols-outlined text-[12px]">tv</span>
						<span className="truncate max-w-[180px]">{match.tvChannel}</span>
					</span>
				)}
			</div>

			{/* Potential points — solo en upcoming */}
			{match.status === "not_started" && (
				<div className="flex items-center justify-center gap-3 text-[10px] font-label-caps uppercase tracking-widest pt-1">
					<span className="text-tertiary font-bold">💰 En juego</span>
					<span className="text-on-surface-variant">
						Exacto{" "}
						<span className="text-pitch-green font-bold">
							+{potential.exact}
						</span>
					</span>
					<span className="text-on-surface-variant">
						Dif{" "}
						<span className="text-pitch-green font-bold">
							+{potential.goalDiff}
						</span>
					</span>
					<span className="text-on-surface-variant">
						Básico{" "}
						<span className="text-pitch-green font-bold">
							+{potential.basic}
						</span>
					</span>
					{match.stageMultiplier > 1 && (
						<span className="text-tertiary/80">(×{match.stageMultiplier})</span>
					)}
				</div>
			)}
		</header>
	);
}
