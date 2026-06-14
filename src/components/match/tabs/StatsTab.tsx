import { useMockMatchData } from "../../../hooks/useMockMatchData";
import type { Match, TeamStats } from "../../../lib/types";

interface StatsTabProps {
	match: Match;
}

/**
 * Tab "Estadísticas" del Match Bottom Sheet.
 * Sprint 1 (F10): solo lectura, muestra las 6 stats principales.
 * Sprint 1 (Commit 7): usa `useMockMatchData` para fallback de mocks en DEV.
 * Sprint 2 (F4) ampliará a las 15-20 stats completas.
 */
export function StatsTab({ match }: StatsTabProps) {
	const { stats, isMockedStats } = useMockMatchData(match);

	if (!stats || stats.length < 2) {
		return (
			<EmptyState
				icon="search_off"
				message="SIN INFORMACIÓN DISPONIBLE"
				submessage="Se actualizará cuando comience el partido"
			/>
		);
	}

	return (
		<div className="space-y-4">
			{isMockedStats && <DemoTag />}
			<div className="grid gap-3 bg-surface-container-low/30 rounded-xl p-3 border border-white/5">
				{/* Ball Possession */}
				<StatProgressRow
					label="Posesión de Balón"
					homeVal={getStatValue(stats, "Ball Possession", true) ?? "50%"}
					awayVal={getStatValue(stats, "Ball Possession", false) ?? "50%"}
					homePercent={getPossessionNumber(
						getStatValue(stats, "Ball Possession", true),
					)}
					awayPercent={getPossessionNumber(
						getStatValue(stats, "Ball Possession", false),
					)}
				/>

				{/* Shots on Goal */}
				<StatProgressRow
					label="Remates al Arco"
					homeVal={getStatValue(stats, "Shots on Goal", true) ?? 0}
					awayVal={getStatValue(stats, "Shots on Goal", false) ?? 0}
				/>

				{/* Total Shots */}
				<StatProgressRow
					label="Remates Totales"
					homeVal={getStatValue(stats, "Total Shots", true) ?? 0}
					awayVal={getStatValue(stats, "Total Shots", false) ?? 0}
				/>

				{/* Corners & Fouls */}
				<div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
					<StatBox
						label="Tiros de Esquina"
						value={`${getStatValue(stats, "Corner Kicks", true) ?? 0} - ${getStatValue(stats, "Corner Kicks", false) ?? 0}`}
					/>
					<StatBox
						label="Faltas Cometidas"
						value={`${getStatValue(stats, "Fouls", true) ?? 0} - ${getStatValue(stats, "Fouls", false) ?? 0}`}
					/>
				</div>
			</div>
		</div>
	);
}

function getStatValue(
	stats: TeamStats[],
	type: string,
	isHome: boolean,
): string | number | null {
	if (stats.length < 2) return null;
	const teamStats = isHome ? stats[0] : stats[1];
	const statItem = teamStats.statistics.find(
		(s) => s.type.toLowerCase() === type.toLowerCase(),
	);
	return statItem ? statItem.value : null;
}

function getPossessionNumber(val: string | number | null): number {
	if (val === null || val === undefined) return 50;
	const clean = String(val).replace("%", "");
	return Number.parseInt(clean, 10) || 50;
}

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

function EmptyState({
	icon,
	message,
	submessage,
}: {
	icon: string;
	message: string;
	submessage?: string;
}) {
	return (
		<div className="text-center py-6 flex flex-col items-center gap-2">
			<span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
				{icon}
			</span>
			<span className="font-label-caps text-[10px] md:text-xs text-on-surface-variant/70 uppercase tracking-widest font-bold">
				{message}
			</span>
			{submessage && (
				<span className="text-[9px] md:text-[10px] text-on-surface-variant/40 leading-relaxed max-w-xs">
					{submessage}
				</span>
			)}
		</div>
	);
}

/**
 * Tag discreto "DEMO" para indicar que los datos son mocks.
 * Solo se renderiza en DEV (cuando `isMocked*` es true).
 */
function DemoTag() {
	return (
		<div className="flex justify-end">
			<span className="font-label-caps text-[8px] text-on-surface-variant/50 bg-surface-container-high/40 border border-white/10 px-1.5 py-0.5 rounded tracking-widest">
				DEMO
			</span>
		</div>
	);
}
