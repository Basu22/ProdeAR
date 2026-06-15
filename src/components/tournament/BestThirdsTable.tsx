/**
 * BestThirdsTable — Tabla de los 12 mejores terceros lugares del Mundial.
 *
 * ============================================================================
 * FUNCIONALIDAD
 * ============================================================================
 * - Renderiza los 12 terceros ordenados del mejor (rank 1) al peor (rank 12).
 * - Top 8 (clasifican a 16vos) en VERDE con badge "CLASIFICA".
 * - Bottom 4 (eliminados) en ROJO con opacidad reducida.
 * - Línea de CORTE visual entre el 8° y 9° puesto (la "línea roja" del Mundial).
 * - Cada fila muestra: rank, grupo (letra), equipo, pts, DG, GF.
 *
 * ============================================================================
 * LIVE BEHAVIOR
 * ============================================================================
 * Cuando un grupo aún tiene partidos en vivo, el "tercer lugar" es PROVISORIO.
 * El equipo que aparece 3° ahora puede cambiar cuando esos partidos terminen.
 * La UI marca estas filas con un punto pulsante (LiveBadge compact) en la
 * columna del grupo.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - Tabla semántica con thead/tbody
 * - aria-label descriptivo
 * - Colores de qualified/eliminated también se distinguen por texto (no solo color)
 */

import type { BestThirdsTable as BestThirdsTableType } from "../../lib/worldCupGroups";
import { LiveBadge } from "./LiveBadge";

interface BestThirdsTableProps {
	bestThirds: BestThirdsTableType;
}

export function BestThirdsTable({ bestThirds }: BestThirdsTableProps) {
	const { standings, qualifyCount, cutoffIndex } = bestThirds;

	if (standings.length === 0) {
		return (
			<div className="text-center py-12 text-on-surface-variant">
				<p className="font-headline-md text-sm uppercase tracking-wider">
					No hay datos de terceros lugares
				</p>
				<p className="font-body-md text-xs mt-2 max-w-xs mx-auto">
					Esperando que se jueguen partidos de la fase de grupos.
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto space-y-4">
			{/* Header con contexto */}
			<div className="text-center space-y-1">
				<p className="font-headline-md text-base text-white uppercase tracking-wider">
					Mejores terceros
				</p>
				<p className="font-body-md text-xs text-on-surface-variant">
					Los{" "}
					<span className="text-pitch-green font-bold">
						{qualifyCount} mejores
					</span>{" "}
					clasifican a 16vos de final
				</p>
			</div>

			{/* Tabla */}
			<div className="glass-card rounded-2xl overflow-hidden border-white/10">
				<div className="overflow-x-auto">
					<table
						aria-label="Tabla de los 12 mejores terceros lugares del Mundial"
						className="w-full text-left border-collapse text-xs"
					>
						<thead>
							<tr className="border-b border-white/10 bg-surface-container-high/60 text-on-surface-variant font-bold font-label-caps tracking-wider">
								<th className="py-3 px-3 text-center w-10" scope="col">
									#
								</th>
								<th className="py-3 px-2 text-center w-12" scope="col">
									GR
								</th>
								<th className="py-3 px-2" scope="col">
									SELECCIÓN
								</th>
								<th
									className="py-3 px-2 text-center font-black text-white w-10"
									scope="col"
								>
									PTS
								</th>
								<th className="py-3 px-2 text-center w-10" scope="col">
									DG
								</th>
								<th className="py-3 px-2 text-center w-10" scope="col">
									GF
								</th>
								<th className="py-3 px-3 text-center w-16" scope="col">
									ESTADO
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5 font-body-md">
							{standings.map((standing, index) => {
								const isCutoff = index === cutoffIndex;
								const isQualified = standing.qualifies;

								// Border-bottom especial en la fila de cutoff (8°) para
								// crear la "línea de corte" visual entre clasificados y eliminados
								const rowClass = isQualified
									? "hover:bg-pitch-green/5 transition-colors"
									: "hover:bg-error/5 transition-colors opacity-60";

								return (
									<tr
										key={`${standing.groupLetter}:${standing.teamName}`}
										className={`
											${rowClass}
											${isCutoff ? "border-b-2 border-b-error" : ""}
										`.trim()}
									>
										<td className="py-3 px-3 text-center">
											<div
												className={`
													w-6 h-6 flex items-center justify-center rounded-full
													text-[11px] font-black mx-auto
													${
														isQualified
															? "bg-pitch-green/20 text-pitch-green border border-pitch-green/40"
															: "bg-error/15 text-error/70 border border-error/30"
													}
												`.trim()}
											>
												{standing.rank}
											</div>
										</td>
										<td className="py-3 px-2 text-center">
											<div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-surface-container-high/60 border border-white/10 font-stat-value text-xs text-white">
												{standing.groupLetter}
											</div>
										</td>
										<td className="py-3 px-2 font-bold text-white">
											<div className="flex items-center gap-2">
												{standing.logo ? (
													<img
														src={standing.logo}
														alt=""
														className="w-4 h-4 object-contain"
														loading="lazy"
													/>
												) : (
													<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
														flag
													</span>
												)}
												<span className="truncate max-w-[140px]">
													{standing.teamName}
												</span>
												{standing.isLive && (
													<LiveBadge variant="compact" className="ml-1" />
												)}
											</div>
										</td>
										<td className="py-3 px-2 text-center font-black text-primary bg-primary/5 tabular-nums">
											{standing.pts}
										</td>
										<td
											className={`
												py-3 px-2 text-center font-bold tabular-nums
												${
													standing.dg > 0
														? "text-emerald-400"
														: standing.dg < 0
															? "text-red-400"
															: "text-on-surface-variant"
												}
											`.trim()}
										>
											{standing.dg > 0 ? `+${standing.dg}` : standing.dg}
										</td>
										<td className="py-3 px-2 text-center text-on-surface-variant/80 tabular-nums">
											{standing.gf}
										</td>
										<td className="py-3 px-3 text-center">
											{isQualified ? (
												<span
													aria-label="Clasifica a 16vos"
													className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pitch-green/15 border border-pitch-green/40 text-pitch-green font-label-caps text-[9px] font-black tracking-widest uppercase"
												>
													<span className="material-symbols-outlined text-[10px]">
														check
													</span>
													Clasifica
												</span>
											) : (
												<span
													aria-label="Eliminado"
													className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 border border-error/30 text-error/70 font-label-caps text-[9px] font-black tracking-widest uppercase"
												>
													<span className="material-symbols-outlined text-[10px]">
														close
													</span>
													Fuera
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Leyenda */}
			<div className="flex items-center justify-center gap-6 pt-2 pb-4 text-xs text-on-surface-variant font-bold font-label-caps select-none">
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-pitch-green shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
					<span>Clasifica a 16vos</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-error/60" />
					<span>Eliminado</span>
				</div>
			</div>
		</div>
	);
}
