import { useLiveMinute } from "../../hooks/useLiveMinute";
import type { Match } from "../../lib/types";

interface ScoreboardProps {
	match: Match;
}

export function Scoreboard({ match }: ScoreboardProps) {
	const isLive = match.status === "live";
	const {
		minute: liveMinute,
		freshness,
		ageMinutes,
		isStale,
	} = useLiveMinute(match);

	const freshnessPrefix =
		freshness === "stale" ? "⏱️ " : freshness === "warm" ? "~" : "";
	const freshnessTitle = isStale
		? `Última actualización hace ${ageMinutes} min`
		: freshness === "warm"
			? `Actualizado hace ${ageMinutes} min`
			: undefined;

	return (
		<div className="glass-card rounded-xl p-md flex items-center justify-between celestial-glow relative overflow-hidden">
			<div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[100px]" />
			<div className="absolute -bottom-24 -right-24 w-48 h-48 bg-tertiary/5 rounded-full blur-[100px]" />

			<div className="flex flex-col items-center gap-2 flex-1">
				<div className="w-16 h-16 rounded-full glass-card p-2 flex items-center justify-center border-primary/20">
					<span className="material-symbols-outlined text-primary text-3xl">
						shield
					</span>
				</div>
				<span className="font-headline-md text-sm text-center">
					{match.homeTeam}
				</span>
			</div>

			<div className="flex flex-col items-center px-lg">
				{isLive && (
					<div className="flex items-center gap-1 mb-2 px-3 py-0.5 bg-error-container/20 rounded-full border border-error/20">
						<span className="w-2 h-2 bg-error rounded-full animate-pulse" />
						<span
							className={`font-label-caps text-[10px] tabular-nums ${
								isStale ? "text-amber-400" : "text-error"
							}`}
							title={freshnessTitle}
						>
							{typeof liveMinute === "number"
								? `${freshnessPrefix}${liveMinute}'`
								: liveMinute}
						</span>
					</div>
				)}
				<div className="font-display-lg-mobile text-[32px] tracking-tighter flex items-center gap-4">
					<span className="text-on-surface tabular-nums">
						{match.homeScore ?? 0}
					</span>
					<span className="text-outline-variant">-</span>
					<span className="text-primary tabular-nums">
						{match.awayScore ?? 0}
					</span>
				</div>
			</div>

			<div className="flex flex-col items-center gap-2 flex-1">
				<div className="w-16 h-16 rounded-full glass-card p-2 flex items-center justify-center border-primary/20">
					<span className="material-symbols-outlined text-primary text-3xl">
						shield
					</span>
				</div>
				<span className="font-headline-md text-sm text-center">
					{match.awayTeam}
				</span>
			</div>
		</div>
	);
}
