import React, { useEffect, useRef, useState } from "react";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import type { Match } from "../../lib/types";

export const LiveMatchRow = React.memo(({ match }: { match: Match }) => {
	const getAbrev = (name: string) => name.substring(0, 3).toUpperCase();
	const [isGoal, setIsGoal] = useState(false);
	const prevScoreRef = useRef({ home: match.homeScore, away: match.awayScore });
	const liveMinute = useLiveMinute(match);

	useEffect(() => {
		if (
			match.homeScore !== prevScoreRef.current.home ||
			match.awayScore !== prevScoreRef.current.away
		) {
			setIsGoal(true);
			const timer = setTimeout(() => setIsGoal(false), 3000);
			prevScoreRef.current = { home: match.homeScore, away: match.awayScore };
			return () => clearTimeout(timer);
		}
	}, [match.homeScore, match.awayScore]);

	return (
		<div
			className={`flex items-center justify-between py-3 px-4 border-b border-white/5 transition-colors duration-500 ${
				isGoal ? "bg-primary/20" : "bg-background/40 hover:bg-white/5"
			}`}
		>
			<div className="flex items-center gap-3 w-[80px]">
				<div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
				<span className="font-label-caps text-[10px] text-error tabular-nums font-bold">
					{typeof liveMinute === "number" ? `${liveMinute}'` : liveMinute}
				</span>
			</div>

			<div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-2 font-headline-md text-xs font-bold text-white uppercase text-center">
				<span className="truncate">{getAbrev(match.homeTeam)}</span>
				<span
					className={`tabular-nums text-sm font-black transition-transform duration-300 ${
						isGoal ? "scale-125 text-primary text-glowing" : "text-primary"
					}`}
				>
					{match.homeScore} - {match.awayScore}
				</span>
				<span className="truncate">{getAbrev(match.awayTeam)}</span>
			</div>

			<div className="flex items-center gap-1 w-[60px] justify-end">
				{isGoal && (
					<span className="text-[10px] text-primary font-black animate-bounce mr-2">
						¡GOL!
					</span>
				)}
				{match.events?.slice(-3).map((e) => (
					<span key={e.id} className="text-[10px]">
						{e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : "🟥"}
					</span>
				))}
			</div>
		</div>
	);
});

LiveMatchRow.displayName = "LiveMatchRow";
