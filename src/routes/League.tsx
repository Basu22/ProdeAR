import { useState } from "react";
import { MatchCard } from "../components/match/MatchCard";
import { GlassCard } from "../components/ui/GlassCard";
import { useMatches } from "../hooks/useMatches";
import type { Match } from "../lib/types";

export function League() {
	const [tab, setTab] = useState<"tabla" | "fixture">("tabla");
	const { data: matches, isLoading } = useMatches();

	const ligaMatches =
		matches?.filter((m) => m.competitionId === "comp-2") ?? [];

	return (
		<div className="px-4 py-8 max-w-container-max mx-auto space-y-6 relative z-10">
			<div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

			{/* Header Info */}
			<div className="text-center space-y-2 mb-8">
				<span className="font-label-caps text-[10px] text-primary tracking-widest font-bold bg-primary/10 border border-primary/25 px-3 py-1 rounded-full uppercase">
					LIGA PROFESIONAL DE FÚTBOL
				</span>
				<h1 className="font-display-lg text-3xl md:text-5xl font-black text-white uppercase tracking-tight text-balance">
					LIGA ARGENTINA
				</h1>
				<p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
					Tabla de posiciones oficial del torneo real y fixture interactivo de
					partidos.
				</p>
			</div>

			{/* Tabs Switcher */}
			<div className="flex p-1 glass-card rounded-full max-w-md mx-auto mb-8 border-white/10">
				<button
					type="button"
					onClick={() => setTab("tabla")}
					className={`flex-1 py-2.5 px-4 rounded-full font-label-caps text-[10px] font-extrabold tracking-widest transition-[color,background-color,transform] duration-200 active:scale-[0.96] cursor-pointer ${
						tab === "tabla"
							? "bg-primary text-on-primary font-black shadow-[0_4px_15px_rgba(56,189,248,0.25)]"
							: "text-on-surface-variant hover:text-primary"
					}`}
				>
					TABLA POSICIONES
				</button>
				<button
					type="button"
					onClick={() => setTab("fixture")}
					className={`flex-1 py-2.5 px-4 rounded-full font-label-caps text-[10px] font-extrabold tracking-widest transition-[color,background-color,transform] duration-200 active:scale-[0.96] cursor-pointer ${
						tab === "fixture"
							? "bg-primary text-on-primary font-black shadow-[0_4px_15px_rgba(56,189,248,0.25)]"
							: "text-on-surface-variant hover:text-primary"
					}`}
				>
					FIXTURE
				</button>
			</div>

			{tab === "tabla" ? (
				<TablaPosiciones />
			) : (
				<Fixture matches={ligaMatches} isLoading={isLoading} />
			)}
		</div>
	);
}

function TablaPosiciones() {
	const teams = [
		{ pos: 1, name: "Huracán", pts: 18, pj: 9, g: 5, e: 3, p: 1, dg: 8 },
		{ pos: 2, name: "Talleres", pts: 17, pj: 9, g: 5, e: 2, p: 2, dg: 6 },
		{ pos: 3, name: "Unión", pts: 17, pj: 9, g: 5, e: 2, p: 2, dg: 4 },
		{ pos: 4, name: "River Plate", pts: 16, pj: 9, g: 4, e: 4, p: 1, dg: 10 },
		{ pos: 5, name: "Boca Juniors", pts: 15, pj: 9, g: 4, e: 3, p: 2, dg: 3 },
		{ pos: 6, name: "Racing Club", pts: 15, pj: 9, g: 4, e: 3, p: 2, dg: 5 },
	];

	return (
		<GlassCard
			glow
			className="rounded-2xl overflow-hidden border-white/10 max-w-4xl mx-auto"
		>
			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-surface-container-high/60 border-b border-white/10">
						<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant text-center w-12 font-bold tracking-widest">
							POS
						</th>
						<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant font-bold tracking-widest">
							CLUB DEPORTIVO
						</th>
						<th className="py-4 px-3 font-label-caps text-[10px] text-primary text-center font-bold tracking-widest bg-primary/5">
							PTS
						</th>
						<th className="py-4 px-3 font-label-caps text-[10px] text-on-surface-variant text-center font-bold tracking-widest">
							PJ
						</th>
						<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant text-center font-bold tracking-widest">
							DG
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{teams.map((team) => (
						<tr
							key={team.name}
							className="hover:bg-primary/5 transition-colors group"
						>
							<td className="py-4 px-4 font-stat-value text-base text-center font-black">
								<span
									className={
										team.pos <= 3
											? "text-primary text-glowing"
											: "text-secondary"
									}
								>
									<span className="tabular-nums">{team.pos}</span>
								</span>
							</td>
							<td className="py-4 px-4 flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center p-1.5 group-hover:border-primary/30">
									<span className="material-symbols-outlined text-primary text-lg">
										shield
									</span>
								</div>
								<span className="font-headline-md text-sm font-bold text-white group-hover:text-primary transition-colors">
									{team.name}
								</span>
							</td>
							<td className="py-4 px-3 font-stat-value text-base text-primary text-center font-black bg-primary/5 tabular-nums">
								{team.pts}
							</td>
							<td className="py-4 px-3 font-body-md text-sm text-secondary text-center tabular-nums">
								{team.pj}
							</td>
							<td className="py-4 px-4 font-stat-value text-sm text-center font-bold">
								<span
									className={
										team.dg > 0 ? "text-primary text-glowing" : "text-error"
									}
								>
									<span className="tabular-nums">
										{team.dg > 0 ? `+${team.dg}` : team.dg}
									</span>
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</GlassCard>
	);
}

function Fixture({
	matches,
	isLoading,
}: {
	matches: Match[];
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<div className="space-y-md max-w-2xl mx-auto">
				{[1, 2, 3].map((i) => (
					<div key={i} className="glass-card rounded-xl p-md animate-pulse">
						<div className="h-28 bg-surface-container-high rounded" />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-4 max-w-2xl mx-auto">
			<div className="flex items-center justify-between px-1 mb-2">
				<h2 className="font-label-caps text-xs text-on-surface-variant tracking-wider uppercase font-bold">
					PARTIDOS DE LA FECHA
				</h2>
				<span className="font-label-caps text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase">
					LOCKED 15M ANTES
				</span>
			</div>
			{matches.map((match) => (
				<MatchCard key={match.id} match={match} showPrediction />
			))}
		</div>
	);
}
