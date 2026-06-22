/**
 * LeagueTable — Tabla de posiciones para formato LIGA (todos contra todos).
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Renderiza una tabla de posiciones con las columnas:
 *   # | EQUIPO | PTS | PJ | DG | GF | GC
 *
 * Mobile-first: en pantallas chicas, las columnas PG/PE/PP/GF/GC se ocultan
 * (queda: # | EQUIPO | PTS | PJ | DG). El badge de posición y los puntos
 * siempre son visibles.
 *
 * ============================================================================
 * FASES
 * ============================================================================
 * - Fase 1 (MVP): zonas (clasificación/descenso) renderizan sin colores
 *   (placeholder visual). La función `getPositionZone()` ya está
 *   implementada y lista para Fase 2 cuando se definan los cortes.
 * - Fase 2: se conectan los colores de zona (🟢 clasificación, 🟡 repechaje,
 *   🔴 descenso) con la config de cada competition.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <LeagueTable standings={result.standings} />
 * ```
 */

import type { LeagueStanding } from "../../lib/types";
import { getCountryCode } from "../../lib/worldCupGroups";
import { GlassCard } from "../ui/GlassCard";

interface LeagueTableProps {
	standings: LeagueStanding[];
}

/**
 * Determina la zona cualitativa de una posición en la tabla.
 *
 * ============================================================================
 * FASE 1: retorna siempre "neutral". Los colores están deshabilitados
 *         (CSS usa border transparente) pero la función queda lista.
 * FASE 2: conectarse con `Competition.zones` config (libertadores,
 *         sudamericana, descenso) y aplicar colores.
 * ============================================================================
 */
function getPositionZone(
	_position: number,
	_standings: LeagueStanding[],
): "libertadores" | "sudamericana" | "descenso" | "neutral" {
	// FASE 1: sin zonas. En Fase 2:
	//   if (position <= comp.zones.libertadores) return "libertadores";
	//   if (position <= comp.zones.sudamericana) return "sudamericana";
	//   if (position > standings.length - comp.zones.descenso) return "descenso";
	return "neutral";
}

function getRankBadgeClass(rank: number): string {
	if (rank === 1) return "bg-tertiary text-black";
	if (rank <= 4) return "bg-emerald-500 text-black";
	if (rank <= 6) return "bg-amber-500 text-black";
	return "bg-white/10 text-white/70";
}

function getZoneBorderClass(zone: ReturnType<typeof getPositionZone>): string {
	switch (zone) {
		case "libertadores":
			return "border-l-4 border-l-emerald-500";
		case "sudamericana":
			return "border-l-4 border-l-amber-500";
		case "descenso":
			return "border-l-4 border-l-red-500";
		case "neutral":
		default:
			return "border-l-4 border-l-transparent";
	}
}

export function LeagueTable({ standings }: LeagueTableProps) {
	if (standings.length === 0) {
		return (
			<GlassCard className="py-12 px-6 text-center">
				<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste inline-block">
					sports_soccer
				</span>
				<h3 className="font-headline-md text-base text-white uppercase tracking-tight mb-2">
					Tabla vacía
				</h3>
				<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto">
					Aún no hay partidos cargados para esta liga. Los datos se
					sincronizarán pronto.
				</p>
			</GlassCard>
		);
	}

	return (
		<GlassCard glow className="overflow-hidden border-white/10">
			{/* Header */}
			<div className="px-4 py-3 border-b border-white/10 bg-surface-container-high/60">
				<h3 className="font-headline-md text-base font-bold text-white uppercase tracking-wider">
					Tabla de posiciones
				</h3>
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
							<th className="py-2.5 px-1 text-center w-7">G</th>
							<th className="py-2.5 px-1 text-center w-7">E</th>
							<th className="py-2.5 px-1 text-center w-7">P</th>
							<th className="py-2.5 px-1 text-center w-12">+/-</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5 font-body-md">
						{standings.map((standing) => {
							const zone = getPositionZone(standing.position, standings);
							const zoneClass = getZoneBorderClass(zone);
							return (
								<tr
									key={standing.teamName}
									className={`
										hover:bg-white/[0.02] transition-colors
										${zoneClass}
									`.trim()}
								>
									<td className="py-3 px-2 text-center">
										<div
											className={`
												w-5 h-5 flex items-center justify-center rounded-full
												text-[10px] font-black mx-auto
												${getRankBadgeClass(standing.position)}
											`.trim()}
										>
											{standing.position}
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
													shield
												</span>
											)}
											<span
												className="font-stat-value text-xs font-black tracking-wider tabular-nums"
												title={standing.teamName}
											>
												{getCountryCode(standing.teamName)}
											</span>
											{standing.isLive && (
												<span
													className="
														inline-flex items-center gap-0.5
														px-1 py-0.5 rounded
														bg-error/20 text-error
														text-[8px] font-black tracking-wider
													"
												>
													<span className="w-1 h-1 rounded-full bg-current animate-live-pulse" />
													LIVE
												</span>
											)}
										</div>
									</td>
									<td className="py-3 px-1 text-center font-black text-primary bg-primary/5 tabular-nums">
										{standing.pts}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums">
										{standing.pj}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums">
										{standing.pg}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums">
										{standing.pe}
									</td>
									<td className="py-3 px-1 text-center text-on-surface-variant tabular-nums">
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
