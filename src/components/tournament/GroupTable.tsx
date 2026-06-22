/**
 * GroupTable — Tabla de posiciones de UN grupo del Mundial.
 *
 * Renderiza:
 * - Header con nombre del grupo + LiveBadge + LiveMiniScoreboard (si hay live)
 * - Tabla con 4 equipos ordenados
 * - Animaciones animate-rank-up / animate-rank-down cuando hay cambios
 * - Leyenda al final
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * @param group       - Datos del grupo (standings + liveMatches)
 * @param positionChanges - Map de teamKey → 'up' | 'down' | 'same'
 *                          donde teamKey = `${groupLetter}:${teamName}`
 *
 * @example
 * ```tsx
 * <GroupTable
 *   group={groupA}
 *   positionChanges={positionChanges}
 * />
 * ```
 */

import type { PositionChange } from "../../hooks/useGroupStandings";
import type { GroupTable as GroupTableType } from "../../lib/worldCupGroups";
import { getCountryCode } from "../../lib/worldCupGroups";
import { GlassCard } from "../ui/GlassCard";
import { LiveBadge } from "./LiveBadge";
import { LiveMiniScoreboard } from "./LiveMiniScoreboard";

interface GroupTableProps {
	group: GroupTableType;
	positionChanges: Map<string, PositionChange>;
}

function getRankBadgeClass(rank: number): string {
	if (rank <= 2) return "bg-emerald-500 text-black";
	if (rank === 3) return "bg-amber-500 text-black";
	return "bg-white/10 text-white/70";
}

function getPositionAnimationClass(change: PositionChange | undefined): string {
	if (change === "up") return "animate-rank-up";
	if (change === "down") return "animate-rank-down";
	return "";
}

export function GroupTable({ group, positionChanges }: GroupTableProps) {
	const isLive = group.liveMatches.length > 0;

	return (
		<GlassCard glow className="overflow-hidden border-white/10">
			{/* Header */}
			<div
				className={`
					px-4 py-3 border-b border-white/10
					${isLive ? "bg-error/[0.04]" : "bg-surface-container-high/60"}
					transition-colors duration-300
				`.trim()}
			>
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<h3 className="font-headline-md text-base font-bold text-white uppercase tracking-wider">
							{group.groupName}
						</h3>
						{isLive && <LiveBadge />}
					</div>
				</div>
				{isLive && <LiveMiniScoreboard matches={group.liveMatches} />}
			</div>

			{/* Tabla */}
			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse text-xs">
					<thead>
						<tr className="border-b border-white/5 bg-white/[0.02] text-on-surface-variant font-bold font-label-caps tracking-wider">
							<th className="py-2.5 px-2 text-center w-7">#</th>
							<th className="py-2.5 px-1">EQUIPO</th>
							<th className="py-2.5 px-1 text-center font-black text-white w-9">
								Pts
							</th>
							<th className="py-2.5 px-1 text-center w-7">J</th>
							<th className="py-2.5 px-1 text-center w-7 hidden sm:table-cell">
								G
							</th>
							<th className="py-2.5 px-1 text-center w-7 hidden sm:table-cell">
								E
							</th>
							<th className="py-2.5 px-1 text-center w-7 hidden sm:table-cell">
								P
							</th>
							<th className="py-2.5 px-1 text-center w-12">+/-</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5 font-body-md">
						{group.standings.map((standing, index) => {
							const rank = index + 1;
							const teamKey = `${group.groupLetter}:${standing.teamName}`;
							const change = positionChanges.get(teamKey);
							const animClass = getPositionAnimationClass(change);
							const countryCode = getCountryCode(standing.teamName);

							return (
								<tr
									key={standing.teamName}
									className={`
										hover:bg-white/[0.02] transition-colors
										${animClass}
									`.trim()}
								>
									<td className="py-3 px-2 text-center">
										<div
											className={`
												w-5 h-5 flex items-center justify-center rounded-full
												text-[10px] font-black mx-auto
												${getRankBadgeClass(rank)}
											`.trim()}
										>
											{rank}
										</div>
									</td>
									<td className="py-3 px-1 font-bold text-white">
										<div className="flex items-center gap-1.5">
											{standing.logo ? (
												<img
													src={standing.logo}
													alt=""
													className="w-4 h-4 object-contain shrink-0"
													loading="lazy"
												/>
											) : (
												<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
													flag
												</span>
											)}
											<span
												className="font-stat-value text-xs font-black tracking-wider tabular-nums"
												title={standing.teamName}
											>
												{countryCode}
											</span>
											{standing.isLive && (
												<LiveBadge variant="compact" className="ml-1" />
											)}
										</div>
									</td>
									<td className="py-3 px-1 text-center font-black text-primary bg-primary/5 tabular-nums">
										{standing.pts}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums">
										{standing.pj}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums hidden sm:table-cell">
										{standing.pg}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums hidden sm:table-cell">
										{standing.pe}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums hidden sm:table-cell">
										{standing.pp}
									</td>
									<td
										className={`
											py-3 px-1 text-center font-bold tabular-nums text-[11px]
											${
												standing.gf > standing.gc
													? "text-emerald-400"
													: standing.gf < standing.gc
														? "text-red-400"
														: "text-on-surface-variant"
											}
										`.trim()}
									>
										{standing.gf}-{standing.gc}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</GlassCard>
	);
}
