/**
 * LiveMiniScoreboard — Mini-scoreboard inline para partidos en vivo.
 *
 * Se muestra en el header de GroupTable cuando hay un partido en curso.
 * Formato: `🔴 MEX 1-0 RSA · 34'`
 *
 * Usa banderas de flagcdn.com para los flags. Si no hay logo, usa el ícono
 * de "flag" de Material Symbols.
 *
 * ============================================================================
 * NOTAS
 * ============================================================================
 * - El minuto se muestra solo si `live.minute` está presente y es positivo.
 * - Si hay múltiples partidos en vivo en el mismo grupo, se muestran
 *   todos apilados.
 * - El cronómetro usa `useLiveMinute` (mismo hook que MatchCard/SheetMatchHeader)
 *   para mantener la consistencia de tiempo entre vistas.
 */

import { useLiveMinute } from "../../hooks/useLiveMinute";
import type { Match } from "../../lib/types";
import { LiveClockBadge } from "../match/LiveClockBadge";

interface LiveMiniScoreboardProps {
	/** Partidos en vivo del grupo. Si está vacío, no se renderiza nada. */
	matches: Match[];
}

function shortTeamName(name: string): string {
	// Limita a 3 letras para que el mini-scoreboard sea compacto.
	// "México" → "MEX", "Corea del Sur" → "COR", "Estados Unidos" → "USA"
	if (name.length <= 3) return name.toUpperCase();
	// Quita acentos y toma las primeras 3 letras
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.substring(0, 3)
		.toUpperCase();
}

function TeamChip({
	team,
	score,
	logo,
	isWinning,
}: {
	team: string;
	score: number | null;
	logo: string | null;
	isWinning: boolean;
}) {
	return (
		<div className="flex items-center gap-1.5">
			{logo ? (
				<img
					src={logo}
					alt=""
					className="w-4 h-4 object-contain"
					loading="lazy"
				/>
			) : (
				<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
					flag
				</span>
			)}
			<span
				className={`font-label-caps text-[10px] font-bold tracking-wider ${
					isWinning ? "text-white" : "text-on-surface-variant"
				}`}
			>
				{shortTeamName(team)}
			</span>
			<span
				className={`font-stat-value text-base leading-none tabular-nums ${
					isWinning ? "text-primary" : "text-white/80"
				}`}
			>
				{score ?? 0}
			</span>
		</div>
	);
}

function SingleMatch({ match }: { match: Match }) {
	const homeScore = match.homeScore;
	const awayScore = match.awayScore;
	const homeWinning =
		homeScore !== null && awayScore !== null && homeScore > awayScore;
	const awayWinning =
		homeScore !== null && awayScore !== null && awayScore > homeScore;

	// Mismo hook que MatchCard/SheetMatchHeader — unifica el cronómetro en todas las vistas.
	const live = useLiveMinute(match);

	const showMinute =
		live.minute !== undefined && live.minute !== "0" && live.minute !== 0;

	return (
		<div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest/60 border border-white/5">
			<TeamChip
				team={match.homeTeam}
				score={homeScore}
				logo={match.homeLogo}
				isWinning={homeWinning}
			/>
			<span className="text-on-surface-variant/40 text-[10px] font-bold">
				vs
			</span>
			<TeamChip
				team={match.awayTeam}
				score={awayScore}
				logo={match.awayLogo}
				isWinning={awayWinning}
			/>
			{showMinute && (
				<>
					<span className="w-px h-3 bg-white/10 mx-0.5" />
					<LiveClockBadge live={live} size="inline" />
				</>
			)}
		</div>
	);
}

export function LiveMiniScoreboard({ matches }: LiveMiniScoreboardProps) {
	if (matches.length === 0) return null;

	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 mt-2">
			{matches.map((match) => (
				<SingleMatch key={match.id} match={match} />
			))}
		</div>
	);
}
