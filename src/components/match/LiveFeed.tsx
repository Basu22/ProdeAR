import type { Match } from "../../lib/types";
import { LiveMatchRow } from "./LiveMatchRow";

export function LiveFeed({ matches }: { matches: Match[] }) {
	const liveMatches = matches.filter((m) => m.status === "live");

	if (liveMatches.length === 0) return null;

	return (
		<section className="animate-enter w-full mb-8">
			<div className="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-primary/20">
				<h2 className="font-label-caps text-[10px] text-primary font-bold tracking-widest uppercase flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-error animate-pulse" />
					Partidos en Vivo
				</h2>
			</div>
			<div className="glass-card rounded-b-2xl overflow-hidden border-x border-b border-primary/20">
				{liveMatches.map((match) => (
					<LiveMatchRow key={match.id} match={match} />
				))}
			</div>
		</section>
	);
}
