import { useMemo, useState } from "react";
import { PLAYERS } from "../../lib/api/mockData";
import type {
	Match,
	TacticalPlayerInfo,
	TeamLineup,
	TeamStats,
} from "../../lib/types";

interface MatchDetailsTabsProps {
	match: Match;
}

export function MatchDetailsTabs({ match }: MatchDetailsTabsProps) {
	const [activeTab, setActiveTab] = useState<
		"eventos" | "estadisticas" | "formaciones"
	>("eventos");

	// 1. Deterministic statistics generator (seeded by match ID)
	const statsData = useMemo<TeamStats[] | null>(() => {
		if (match.stats && match.stats.length >= 2) {
			return match.stats;
		}

		// Don't show stats for not started matches unless they are live/finished
		if (match.status === "not_started") {
			return null;
		}

		// Generate mock stats based on match scores
		let seed = 0;
		for (let i = 0; i < match.id.length; i++) {
			seed += match.id.charCodeAt(i);
		}
		const random = () => {
			const x = Math.sin(seed++) * 10000;
			return x - Math.floor(x);
		};

		const homeS = match.homeScore ?? 0;
		const awayS = match.awayScore ?? 0;

		const homePos = 40 + Math.floor(random() * 20); // 40 to 60
		const awayPos = 100 - homePos;

		const homeShots = 5 + homeS * 2 + Math.floor(random() * 5);
		const awayShots = 5 + awayS * 2 + Math.floor(random() * 5);

		const homeCorners = 2 + Math.floor(random() * 6);
		const awayCorners = 2 + Math.floor(random() * 6);

		const homeFouls = 8 + Math.floor(random() * 10);
		const awayFouls = 8 + Math.floor(random() * 10);

		const homePasses = 320 + Math.floor(random() * 150);
		const awayPasses = 320 + Math.floor(random() * 150);

		return [
			{
				team: { id: 1, name: match.homeTeam, logo: match.homeLogo || "" },
				statistics: [
					{ type: "Ball Possession", value: `${homePos}%` },
					{ type: "Shots on Goal", value: homeS + Math.floor(random() * 3) },
					{ type: "Total Shots", value: homeShots },
					{ type: "Corner Kicks", value: homeCorners },
					{ type: "Fouls", value: homeFouls },
					{ type: "Total Passes", value: homePasses },
				],
			},
			{
				team: { id: 2, name: match.awayTeam, logo: match.awayLogo || "" },
				statistics: [
					{ type: "Ball Possession", value: `${awayPos}%` },
					{ type: "Shots on Goal", value: awayS + Math.floor(random() * 3) },
					{ type: "Total Shots", value: awayShots },
					{ type: "Corner Kicks", value: awayCorners },
					{ type: "Fouls", value: awayFouls },
					{ type: "Total Passes", value: awayPasses },
				],
			},
		];
	}, [match]);

	// 2. Deterministic lineup generator (seeded by match ID)
	const lineupsData = useMemo<TeamLineup[] | null>(() => {
		if (match.lineups && match.lineups.length >= 2) {
			return match.lineups;
		}

		// Don't show lineups for not started matches unless they are live/finished
		if (match.status === "not_started") {
			return null;
		}

		const generateMockLineup = (
			teamName: string,
			isHome: boolean,
		): TeamLineup => {
			let seed = 0;
			for (let i = 0; i < match.id.length; i++) {
				seed += match.id.charCodeAt(i);
			}
			if (!isHome) seed += 123;
			const random = () => {
				const x = Math.sin(seed++) * 10000;
				return x - Math.floor(x);
			};

			const availablePlayers = PLAYERS[teamName as keyof typeof PLAYERS] || [];
			const genericNames = isHome
				? [
						"Gómez",
						"Rodríguez",
						"López",
						"Fernández",
						"González",
						"Martínez",
						"Pérez",
						"Sánchez",
						"Romero",
						"Díaz",
						"Torres",
						"Álvarez",
					]
				: [
						"Silva",
						"Pereira",
						"Santos",
						"Oliveira",
						"Souza",
						"Lima",
						"Araujo",
						"Carvalho",
						"Gomes",
						"Costa",
						"Ribeiro",
						"Martins",
					];

			// Choose formation deterministically
			const use433 = random() > 0.5;
			const formation = use433 ? "4-3-3" : "4-4-2";

			const startXIGrids = use433
				? [
						{ pos: "G", grid: "1:1", num: 1 },
						{ pos: "D", grid: "2:1", num: 4 },
						{ pos: "D", grid: "2:2", num: 2 },
						{ pos: "D", grid: "2:3", num: 6 },
						{ pos: "D", grid: "2:4", num: 3 },
						{ pos: "M", grid: "3:1", num: 8 },
						{ pos: "M", grid: "3:2", num: 5 },
						{ pos: "M", grid: "3:3", num: 10 },
						{ pos: "F", grid: "4:1", num: 7 },
						{ pos: "F", grid: "4:2", num: 9 },
						{ pos: "F", grid: "4:3", num: 11 },
					]
				: [
						{ pos: "G", grid: "1:1", num: 1 },
						{ pos: "D", grid: "2:1", num: 4 },
						{ pos: "D", grid: "2:2", num: 2 },
						{ pos: "D", grid: "2:3", num: 6 },
						{ pos: "D", grid: "2:4", num: 3 },
						{ pos: "M", grid: "3:1", num: 8 },
						{ pos: "M", grid: "3:2", num: 5 },
						{ pos: "M", grid: "3:3", num: 14 },
						{ pos: "M", grid: "3:4", num: 11 },
						{ pos: "F", grid: "4:1", num: 7 },
						{ pos: "F", grid: "4:2", num: 9 },
					];

			const startXI: TacticalPlayerInfo[] = [];
			let mockIdx = 0;
			let genIdx = 0;

			for (let i = 0; i < startXIGrids.length; i++) {
				const gridInfo = startXIGrids[i];
				let name = "";
				if (gridInfo.pos === "F" || gridInfo.pos === "M") {
					if (mockIdx < availablePlayers.length) {
						name = availablePlayers[mockIdx++];
					}
				}
				if (!name) {
					name = genericNames[genIdx % genericNames.length];
					genIdx++;
				}
				startXI.push({
					player: {
						id: isHome ? 100 + i : 200 + i,
						name,
						number: gridInfo.num,
						pos: gridInfo.pos,
						grid: gridInfo.grid,
					},
				});
			}

			const substitutes: TacticalPlayerInfo[] = [];
			for (let i = 0; i < 5; i++) {
				const name = genericNames[(genIdx + i) % genericNames.length];
				substitutes.push({
					player: {
						id: isHome ? 300 + i : 400 + i,
						name,
						number: 12 + i,
						pos: i === 0 ? "G" : i < 3 ? "D" : i < 4 ? "M" : "F",
						grid: null,
					},
				});
			}

			const coach = {
				id: isHome ? 999 : 888,
				name: isHome ? "A. Orfila" : "F. Kudelka",
				photo: null,
			};

			return {
				team: {
					id: isHome ? 1 : 2,
					name: teamName,
					logo: isHome ? match.homeLogo || "" : match.awayLogo || "",
				},
				formation,
				startXI,
				substitutes,
				coach,
			};
		};

		return [
			generateMockLineup(match.homeTeam, true),
			generateMockLineup(match.awayTeam, false),
		];
	}, [match]);

	const getEventEmoji = (type: string) => {
		if (type === "goal") return "⚽";
		if (type === "yellow") return "🟨";
		if (type === "red") return "🟥";
		return "📢";
	};

	const getStatValue = (
		stats: TeamStats[] | null,
		type: string,
		isHome: boolean,
	): string | number | null => {
		if (!stats || stats.length < 2) return null;
		const teamStats = isHome ? stats[0] : stats[1];
		const statItem = teamStats.statistics.find(
			(s) => s.type.toLowerCase() === type.toLowerCase(),
		);
		return statItem ? statItem.value : null;
	};

	// Parse helper for possession percentage
	const getPossessionNumber = (val: string | number | null): number => {
		if (val === null || val === undefined) return 50;
		const clean = String(val).replace("%", "");
		return Number.parseInt(clean, 10) || 50;
	};

	return (
		<div className="pt-2 mt-2 border-t border-white/5 space-y-4">
			{/* Tab Selector */}
			<div className="flex border-b border-white/5">
				{(["eventos", "estadisticas", "formaciones"] as const).map((t) => (
					<button
						type="button"
						key={t}
						onClick={() => setActiveTab(t)}
						className={`flex-1 py-2 font-label-caps text-[10px] tracking-widest font-extrabold transition-[color,transform] duration-200 active:scale-[0.96] relative cursor-pointer uppercase ${
							activeTab === t
								? "text-primary text-glowing"
								: "text-on-surface-variant hover:text-primary"
						}`}
					>
						{t}
						{activeTab === t && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
						)}
					</button>
				))}
			</div>

			{/* EVENTOS TIMELINE */}
			{activeTab === "eventos" && (
				<div className="space-y-3">
					{!match.events || match.events.length === 0 ? (
						<div className="text-center py-4">
							<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
								{match.status === "not_started"
									? "El partido no ha comenzado"
									: "No se registraron eventos en este partido"}
							</span>
						</div>
					) : (
						<div className="relative pl-6 border-l border-white/10 ml-2 space-y-3 py-1">
							{match.events.map((e) => {
								const isHome = e.team === "home";
								const dotColor =
									e.type === "yellow"
										? "bg-tertiary"
										: e.type === "red"
											? "bg-error"
											: "bg-primary shadow-[0_0_8px_rgba(56,189,248,0.5)]";

								return (
									<div key={e.id} className="relative">
										{/* Dot indicator on timeline */}
										<div
											className={`absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full ${dotColor} border-2 border-background`}
										/>
										<div className="flex items-center justify-between bg-surface-container-low/40 rounded-xl p-2.5 border border-white/5">
											<div className="flex items-center gap-2 min-w-0">
												<span className="font-stat-value text-xs font-black text-primary tabular-nums">
													{e.minute}'
												</span>
												<span className="text-xs">{getEventEmoji(e.type)}</span>
												<span className="text-xs text-white font-bold truncate">
													{e.playerName}
												</span>
											</div>
											<span className="text-[8px] text-on-surface-variant font-black bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
												{isHome ? "LOC" : "VIS"}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* ESTADÍSTICAS */}
			{activeTab === "estadisticas" && (
				<div className="space-y-4">
					{!statsData ? (
						<div className="text-center py-4">
							<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
								Estadísticas no disponibles todavía
							</span>
						</div>
					) : (
						<div className="grid gap-3 bg-surface-container-low/30 rounded-xl p-3 border border-white/5">
							{/* Ball Possession */}
							<StatProgressRow
								label="Posesión de Balón"
								homeVal={
									getStatValue(statsData, "Ball Possession", true) ?? "50%"
								}
								awayVal={
									getStatValue(statsData, "Ball Possession", false) ?? "50%"
								}
								homePercent={getPossessionNumber(
									getStatValue(statsData, "Ball Possession", true),
								)}
								awayPercent={getPossessionNumber(
									getStatValue(statsData, "Ball Possession", false),
								)}
							/>

							{/* Shots on Goal */}
							<StatProgressRow
								label="Remates al Arco"
								homeVal={getStatValue(statsData, "Shots on Goal", true) ?? 0}
								awayVal={getStatValue(statsData, "Shots on Goal", false) ?? 0}
							/>

							{/* Total Shots */}
							<StatProgressRow
								label="Remates Totales"
								homeVal={getStatValue(statsData, "Total Shots", true) ?? 0}
								awayVal={getStatValue(statsData, "Total Shots", false) ?? 0}
							/>

							{/* Corners & Fouls */}
							<div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
								<StatBox
									label="Tiros de Esquina"
									value={`${getStatValue(statsData, "Corner Kicks", true) ?? 0} - ${getStatValue(statsData, "Corner Kicks", false) ?? 0}`}
								/>
								<StatBox
									label="Faltas Cometidas"
									value={`${getStatValue(statsData, "Fouls", true) ?? 0} - ${getStatValue(statsData, "Fouls", false) ?? 0}`}
								/>
							</div>
						</div>
					)}
				</div>
			)}

			{/* FORMACIONES */}
			{activeTab === "formaciones" && (
				<div className="space-y-4">
					{!lineupsData ? (
						<div className="text-center py-4">
							<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
								Formaciones no disponibles todavía
							</span>
						</div>
					) : (
						<div className="space-y-4">
							{/* The Tactical Pitch Board */}
							<div className="glass-card rounded-xl overflow-hidden aspect-[3/4] md:aspect-[4/3] relative pitch-grid border-white/10 shadow-2xl flex flex-col justify-between py-4 max-w-md mx-auto">
								{/* Field Overlay & Markings */}
								<div className="absolute inset-0 bg-black/45 pointer-events-none" />
								<div className="absolute top-1/2 w-full h-px bg-white/20 pointer-events-none" />
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/10 rounded-full pointer-events-none" />

								{/* Home Team (Top Half, descending rows) */}
								<TacticalTeamFormation lineup={lineupsData[0]} isHome />

								{/* Away Team (Bottom Half, ascending rows) */}
								<TacticalTeamFormation lineup={lineupsData[1]} isHome={false} />
							</div>

							{/* Coaches & Substitutes Panel */}
							<div className="grid sm:grid-cols-2 gap-3 bg-surface-container-low/40 rounded-xl p-3 border border-white/5 text-[10px]">
								{/* Home Details */}
								<div className="space-y-2">
									<div className="pb-1 border-b border-white/5">
										<p className="font-bold text-secondary uppercase truncate">
											{match.homeTeam}
										</p>
										<p className="text-[9px] text-on-surface-variant">
											DT:{" "}
											<span className="text-white font-bold">
												{lineupsData[0].coach.name || "No disponible"}
											</span>
										</p>
									</div>
									<div>
										<p className="text-[9px] font-bold text-on-surface-variant/70 mb-1">
											SUPLENTES
										</p>
										<ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/90">
											{lineupsData[0].substitutes.map((s) => (
												<li key={s.player.id} className="truncate">
													<span className="text-[8px] font-black text-secondary mr-1 bg-white/5 px-1 rounded">
														{s.player.number}
													</span>
													{s.player.name}
												</li>
											))}
										</ul>
									</div>
								</div>

								{/* Away Details */}
								<div className="space-y-2">
									<div className="pb-1 border-b border-white/5">
										<p className="font-bold text-primary uppercase truncate text-glowing">
											{match.awayTeam}
										</p>
										<p className="text-[9px] text-on-surface-variant">
											DT:{" "}
											<span className="text-white font-bold">
												{lineupsData[1].coach.name || "No disponible"}
											</span>
										</p>
									</div>
									<div>
										<p className="text-[9px] font-bold text-on-surface-variant/70 mb-1">
											SUPLENTES
										</p>
										<ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/90">
											{lineupsData[1].substitutes.map((s) => (
												<li key={s.player.id} className="truncate">
													<span className="text-[8px] font-black text-primary mr-1 bg-primary/10 px-1 rounded">
														{s.player.number}
													</span>
													{s.player.name}
												</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/* Sub-components for stats and tactical pitch */
function StatProgressRow({
	label,
	homeVal,
	awayVal,
	homePercent,
	awayPercent,
}: {
	label: string;
	homeVal: string | number;
	awayVal: string | number;
	homePercent?: number;
	awayPercent?: number;
}) {
	const hNum =
		typeof homeVal === "number"
			? homeVal
			: Number.parseInt(String(homeVal), 10) || 0;
	const aNum =
		typeof awayVal === "number"
			? awayVal
			: Number.parseInt(String(awayVal), 10) || 0;

	const hPercent =
		homePercent ?? (hNum + aNum > 0 ? (hNum / (hNum + aNum)) * 100 : 50);
	const aPercent =
		awayPercent ?? (hNum + aNum > 0 ? (aNum / (hNum + aNum)) * 100 : 50);

	return (
		<div className="space-y-1">
			<div className="flex justify-between font-label-caps text-[9px] text-on-surface-variant tracking-wider uppercase">
				<span>{label}</span>
			</div>
			<div className="flex h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
				<div
					className="h-full bg-secondary-container transition-[width] duration-300"
					style={{ width: `${hPercent}%` }}
				/>
				<div
					className="h-full bg-primary transition-[width] duration-300 shadow-[0_0_6px_rgba(56,189,248,0.5)]"
					style={{ width: `${aPercent}%` }}
				/>
			</div>
			<div className="flex justify-between font-stat-value text-base font-black leading-none pt-0.5">
				<span className="text-secondary tabular-nums">{homeVal}</span>
				<span className="text-primary text-glowing tabular-nums">
					{awayVal}
				</span>
			</div>
		</div>
	);
}

function StatBox({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-surface-container-low/50 rounded-lg p-2 border border-white/5 text-center">
			<p className="font-label-caps text-[8px] text-on-surface-variant font-bold tracking-widest uppercase mb-0.5">
				{label}
			</p>
			<p className="font-stat-value text-base font-black text-white tabular-nums leading-none">
				{value}
			</p>
		</div>
	);
}

interface TacticalTeamFormationProps {
	lineup: TeamLineup;
	isHome: boolean;
}

function TacticalTeamFormation({ lineup, isHome }: TacticalTeamFormationProps) {
	// Group players by row based on coordinate grid "row:col" or pos fallback
	const rows = useMemo(() => {
		const groups: Record<number, TacticalPlayerInfo[]> = {};

		// Grid positional mapping
		for (const p of lineup.startXI) {
			let rowNum = 1;
			if (p.player.grid) {
				const [rStr] = p.player.grid.split(":");
				rowNum = Number.parseInt(rStr, 10) || 1;
			} else {
				// Position fallback
				const pos = p.player.pos.toUpperCase();
				if (pos === "G") rowNum = 1;
				else if (pos === "D") rowNum = 2;
				else if (pos === "M") rowNum = 3;
				else rowNum = 4;
			}

			if (!groups[rowNum]) groups[rowNum] = [];
			groups[rowNum].push(p);
		}

		// Sort columns within rows
		const sortedRowKeys = Object.keys(groups)
			.map(Number)
			.sort((a, b) => a - b);

		const finalRows = sortedRowKeys.map((key) => {
			const rowPlayers = groups[key];
			// Sort left-to-right based on grid column
			rowPlayers.sort((a, b) => {
				const colA = a.player.grid
					? Number.parseInt(a.player.grid.split(":")[1], 10) || 0
					: 0;
				const colB = b.player.grid
					? Number.parseInt(b.player.grid.split(":")[1], 10) || 0
					: 0;
				return colA - colB;
			});
			return { rowNum: key, players: rowPlayers };
		});

		// For home, render row 1 (GK) down to row 4 (FW).
		// For away, render row 4 (FW) down to row 1 (GK) to face each other.
		if (!isHome) {
			finalRows.reverse();
		}

		return finalRows;
	}, [lineup, isHome]);

	return (
		<div className="relative z-10 flex flex-col justify-around h-[45%]">
			{rows.map((row) => (
				<div
					key={row.rowNum}
					className="flex justify-around w-full max-w-xs mx-auto"
				>
					{row.players.map((p) => (
						<TacticalPlayerPin
							key={p.player.id}
							name={p.player.name}
							number={p.player.number}
							isHome={isHome}
						/>
					))}
				</div>
			))}
		</div>
	);
}

function TacticalPlayerPin({
	name,
	number,
	isHome,
}: {
	name: string;
	number: number;
	isHome: boolean;
}) {
	// Visual styling based on home/away team colors
	const pinColors = isHome
		? "bg-surface-container-high border-white/20 text-white"
		: "bg-primary text-on-primary border-primary-fixed-dim shadow-[0_0_8px_rgba(0,229,255,0.2)]";

	// Truncate player name for pin label (e.g. Advíncula -> Advin..)
	const displayName = name.length > 9 ? `${name.substring(0, 8)}.` : name;

	return (
		<div className="flex flex-col items-center select-none transition-transform hover:scale-110">
			<div
				className={`w-6 h-6 rounded-full flex items-center justify-center font-stat-value text-[10px] font-black border shadow-md tabular-nums ${pinColors}`}
			>
				{number}
			</div>
			<span className="font-label-caps text-[7px] text-white/95 bg-black/60 px-1 py-0.5 rounded border border-white/5 mt-0.5 max-w-[50px] truncate">
				{displayName}
			</span>
		</div>
	);
}
