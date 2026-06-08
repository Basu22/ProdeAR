import { GlassCard } from "../components/ui/GlassCard";
import { RankingTableSkeleton } from "../components/ui/Skeletons";
import { useGlobalRankings } from "../hooks/useGlobalRankings";
import { useAuthStore } from "../stores/authStore";

export function Rankings() {
	const { data: rankings = [], isLoading } = useGlobalRankings();
	const { user: currentUser } = useAuthStore();

	const first = rankings[0];
	const second = rankings[1];
	const third = rankings[2];

	if (isLoading) {
		return (
			<div className="px-4 py-8 max-w-container-max mx-auto space-y-8">
				{/* Header Skeleton */}
				<div className="text-center space-y-3 mb-8 animate-pulse">
					<div className="h-6 w-32 bg-white/5 rounded-full mx-auto shimmer-bg" />
					<div className="h-10 w-64 md:w-96 bg-white/5 rounded-xl mx-auto shimmer-bg" />
					<div className="h-4 w-80 bg-white/5 rounded mx-auto shimmer-bg" />
				</div>

				{/* Podium Skeleton */}
				<div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-12 items-end min-h-[280px] mb-12 animate-pulse">
					{/* #2 */}
					<div className="flex flex-col items-center space-y-2">
						<div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 shimmer-bg" />
						<div className="h-4 w-12 bg-white/5 rounded shimmer-bg" />
						<div className="h-3.5 w-16 bg-white/5 rounded shimmer-bg" />
						<div className="w-full bg-white/5 rounded-t-xl h-20 shimmer-bg" />
					</div>
					{/* #1 */}
					<div className="flex flex-col items-center space-y-2">
						<div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 shimmer-bg" />
						<div className="h-4 w-16 bg-white/5 rounded shimmer-bg" />
						<div className="h-3.5 w-20 bg-white/5 rounded shimmer-bg" />
						<div className="w-full bg-white/5 rounded-t-xl h-32 shimmer-bg" />
					</div>
					{/* #3 */}
					<div className="flex flex-col items-center space-y-2">
						<div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 shimmer-bg" />
						<div className="h-4 w-12 bg-white/5 rounded shimmer-bg" />
						<div className="h-3.5 w-16 bg-white/5 rounded shimmer-bg" />
						<div className="w-full bg-white/5 rounded-t-xl h-14 shimmer-bg" />
					</div>
				</div>

				{/* Table Skeleton */}
				<div className="max-w-2xl mx-auto">
					<RankingTableSkeleton />
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 py-8 max-w-container-max mx-auto space-y-8 relative z-10">
			<div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			{/* Header */}
			<div className="text-center space-y-2 mb-8">
				<span className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase">
					TABLA CONSOLIDADA
				</span>
				<h1 className="font-display-lg text-3xl md:text-5xl font-black text-white uppercase tracking-tight text-balance">
					Ranking General Prode
					<span className="text-primary text-glowing">AR</span>
				</h1>
				<p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
					Puntaje total consolidado acumulado a través de todos tus torneos
					activos.
				</p>
			</div>

			{/* Podio Top 3 */}
			{rankings.length > 0 && (
				<div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-12 items-end relative min-h-[280px] mb-12 select-none px-2">
					{/* Segundo Puesto */}
					<div
						className="flex flex-col items-center space-y-2 animate-enter"
						style={{ animationDelay: "100ms" }}
					>
						{second ? (
							<>
								<div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-stat-value text-base text-slate-200 font-bold relative shadow-[0_0_15px_rgba(255,255,255,0.05)]">
									{second.displayName.slice(0, 2).toUpperCase()}
									<span className="absolute -top-2.5 -right-2.5 text-base">
										🥈
									</span>
								</div>
								<div className="text-center">
									<p className="font-headline-md text-xs font-bold text-slate-300 uppercase truncate max-w-[90px]">
										{second.displayName}
									</p>
									<p className="font-stat-value text-sm font-bold text-white tabular-nums">
										{second.totalPoints} PTS
									</p>
								</div>
							</>
						) : (
							<div className="w-12 h-12 rounded-full border border-dashed border-white/10" />
						)}
						<div className="w-full bg-surface-container-high/60 border-t border-x border-slate-400/20 rounded-t-xl h-20 flex items-center justify-center relative shadow-[0_-5px_15px_rgba(255,255,255,0.01)]">
							<span className="font-headline-md text-xl font-black text-slate-400/50">
								#2
							</span>
						</div>
					</div>

					{/* Primer Puesto */}
					<div
						className="flex flex-col items-center space-y-2 animate-enter"
						style={{ animationDelay: "0ms" }}
					>
						{first ? (
							<>
								<div className="w-16 h-16 rounded-full bg-tertiary/20 border-2 border-tertiary flex items-center justify-center font-stat-value text-lg text-tertiary font-bold relative shadow-[0_0_20px_rgba(255,214,0,0.15)]">
									{first.displayName.slice(0, 2).toUpperCase()}
									<span className="absolute -top-3.5 -right-3.5 text-xl">
										🥇
									</span>
								</div>
								<div className="text-center">
									<p className="font-headline-md text-sm font-bold text-tertiary uppercase truncate max-w-[120px]">
										{first.displayName}
									</p>
									<p className="font-stat-value text-base font-bold text-white tabular-nums">
										{first.totalPoints} PTS
									</p>
								</div>
							</>
						) : (
							<div className="w-16 h-16 rounded-full border border-dashed border-white/10" />
						)}
						<div className="w-full bg-surface-container-highest/80 border-t border-x border-tertiary/30 rounded-t-xl h-32 flex items-center justify-center relative shadow-[0_-8px_25px_rgba(255,214,0,0.08)]">
							<span className="font-headline-md text-3xl font-black text-tertiary/50 text-glowing-gold">
								#1
							</span>
						</div>
					</div>

					{/* Tercer Puesto */}
					<div
						className="flex flex-col items-center space-y-2 animate-enter"
						style={{ animationDelay: "200ms" }}
					>
						{third ? (
							<>
								<div className="w-12 h-12 rounded-full bg-amber-800/20 border-2 border-amber-700 flex items-center justify-center font-stat-value text-base text-amber-500 font-bold relative shadow-[0_0_15px_rgba(245,158,11,0.05)]">
									{third.displayName.slice(0, 2).toUpperCase()}
									<span className="absolute -top-2.5 -right-2.5 text-base">
										🥉
									</span>
								</div>
								<div className="text-center">
									<p className="font-headline-md text-xs font-bold text-amber-500 uppercase truncate max-w-[90px]">
										{third.displayName}
									</p>
									<p className="font-stat-value text-sm font-bold text-white tabular-nums">
										{third.totalPoints} PTS
									</p>
								</div>
							</>
						) : (
							<div className="w-12 h-12 rounded-full border border-dashed border-white/10" />
						)}
						<div className="w-full bg-surface-container-high/40 border-t border-x border-amber-800/20 rounded-t-xl h-14 flex items-center justify-center relative shadow-[0_-5px_15px_rgba(255,255,255,0.01)]">
							<span className="font-headline-md text-base font-black text-amber-700/50">
								#3
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Rankings Table */}
			<GlassCard
				glow
				className="overflow-hidden border-white/10 max-w-2xl mx-auto rounded-2xl"
			>
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="bg-surface-container-high/60 border-b border-white/10 select-none">
							<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant text-center w-16 font-bold tracking-widest">
								PUESTO
							</th>
							<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant font-bold tracking-widest">
								ANALISTA / JUGADOR
							</th>
							<th className="py-4 px-4 font-label-caps text-[10px] text-primary text-center font-bold tracking-widest bg-primary/5">
								PUNTOS ACUMULADOS
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{rankings.map((item) => {
							const isMe = item.userId === currentUser?.id;
							const rank = item.rank;
							const medal =
								rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";

							return (
								<tr
									key={item.userId}
									className={`hover:bg-primary/5 transition-colors group ${
										isMe ? "bg-primary/5" : ""
									}`}
								>
									<td className="py-4 px-4 font-stat-value text-base text-center font-black">
										<span
											className={
												rank === 1
													? "text-tertiary text-glowing-gold"
													: rank === 2
														? "text-slate-300"
														: rank === 3
															? "text-amber-500"
															: isMe
																? "text-primary text-glowing"
																: "text-secondary"
											}
										>
											{medal ? (
												<span className="text-lg">{medal}</span>
											) : (
												<span className="tabular-nums">#{rank}</span>
											)}
										</span>
									</td>
									<td className="py-4 px-4 flex items-center gap-2">
										<div
											className={`w-7 h-7 rounded-full bg-surface-container border flex items-center justify-center font-stat-value text-xs font-bold ${
												rank === 1
													? "border-tertiary/40 text-tertiary"
													: rank === 2
														? "border-slate-300/40 text-slate-300"
														: rank === 3
															? "border-amber-700/40 text-amber-500"
															: "border-white/10 text-white"
											}`}
										>
											{item.displayName.slice(0, 2).toUpperCase()}
										</div>
										<span
											className={`font-headline-md text-sm font-bold group-hover:text-primary transition-colors ${
												isMe ? "text-primary text-glowing" : "text-white"
											}`}
										>
											{item.displayName} {isMe && "(Vos)"}
										</span>
									</td>
									<td className="py-4 px-4 font-stat-value text-base text-primary text-center font-black bg-primary/5 tabular-nums">
										{item.totalPoints}
									</td>
								</tr>
							);
						})}

						{rankings.length === 0 && (
							<tr>
								<td
									colSpan={3}
									className="py-8 text-center text-on-surface-variant font-body-md text-xs select-none"
								>
									No hay analistas registrados en el ranking general aún.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</GlassCard>
		</div>
	);
}
