import { useEffect, useRef, useState } from "react";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import type { Match, Prediction } from "../../lib/types";
import { MatchDetailsTabs } from "./MatchDetailsTabs";

const TEAM_TRANSLATIONS: Record<string, string> = {
	Argentina: "Argentina",
	Brazil: "Brasil",
	France: "Francia",
	Germany: "Alemania",
	Spain: "España",
	Italy: "Italia",
	England: "Inglaterra",
	"Saudi Arabia": "Arabia Saudita",
	"South Korea": "Corea del Sur",
	Japan: "Japón",
	"United States": "Estados Unidos",
	USA: "Estados Unidos",
	Mexico: "México",
	Belgium: "Bélgica",
	Netherlands: "Países Bajos",
	Croatia: "Croacia",
	Portugal: "Portugal",
	Uruguay: "Uruguay",
	Colombia: "Colombia",
	Chile: "Chile",
	Ecuador: "Ecuador",
	Peru: "Perú",
	Paraguay: "Paraguay",
	Venezuela: "Venezuela",
	Bolivia: "Bolivia",
	Morocco: "Marruecos",
	Senegal: "Senegal",
	Tunisia: "Túnez",
	Cameroon: "Camerún",
	Ghana: "Ghana",
	Canada: "Canadá",
	"Costa Rica": "Costa Rica",
	Poland: "Polonia",
	Denmark: "Dinamarca",
	Switzerland: "Suiza",
	Sweden: "Suecia",
	Norway: "Noruega",
	Ukraine: "Ucrania",
	Turkey: "Turquía",
	Greece: "Grecia",
	Egypt: "Egipto",
	Nigeria: "Nigeria",
	Algeria: "Argelia",
	"Ivory Coast": "Costa de Marfil",
	"Cote d'Ivoire": "Costa de Marfil",
	Australia: "Australia",
	"New Zealand": "Nueva Zelanda",
};

function translateTeamName(name: string): string {
	return TEAM_TRANSLATIONS[name] || name;
}

function translateStage(stage: string): string {
	const lower = stage.toLowerCase();
	if (
		lower.includes("friendly international") ||
		lower.includes("friendlies") ||
		lower.includes("friendly")
	) {
		return "Amistoso Internacional";
	}
	if (lower.includes("group stage")) {
		return stage
			.replace(/group stage - group/i, "Fase de Grupos - Grupo")
			.replace(/group stage - /i, "Fase de Grupos - ")
			.replace(/group stage/i, "Fase de Grupos")
			.replace(/group/i, "Grupo");
	}
	if (lower.includes("round of 16")) return "Octavos de Final";
	if (lower.includes("quarter-finals") || lower.includes("quarter-final"))
		return "Cuartos de Final";
	if (lower.includes("semi-finals") || lower.includes("semi-final"))
		return "Semifinales";
	if (lower.includes("third place") || lower.includes("3rd place"))
		return "Tercer Puesto";
	if (lower.includes("final")) return "Final";

	return stage;
}

interface MatchCardProps {
	match: Match;
	showPrediction?: boolean;
	prediction?: Prediction;
	onSave?: (
		home: number,
		away: number,
		penaltyWinner: "home" | "away" | null,
	) => Promise<void>;
}

export function MatchCard({
	match,
	showPrediction,
	prediction,
	onSave,
}: MatchCardProps) {
	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isCancelled = match.status === "cancelled";
	const isPostponed = match.status === "postponed";
	const liveMinute = useLiveMinute(match);

	const [isExpanded, setIsExpanded] = useState(false);
	const [isGoal, setIsGoal] = useState(false);
	const prevScoreRef = useRef({ home: match.homeScore, away: match.awayScore });

	useEffect(() => {
		if (!isLive) return;

		const prevHome = prevScoreRef.current.home;
		const prevAway = prevScoreRef.current.away;
		const currentHome = match.homeScore;
		const currentAway = match.awayScore;

		if (
			(currentHome !== null && currentHome !== prevHome) ||
			(currentAway !== null && currentAway !== prevAway)
		) {
			setIsGoal(true);
			const timer = setTimeout(() => setIsGoal(false), 3000);
			prevScoreRef.current = { home: currentHome, away: currentAway };
			return () => clearTimeout(timer);
		}
	}, [match.homeScore, match.awayScore, isLive]);

	// Determine competition details dynamically
	const compName =
		match.competitionName ||
		(match.competitionId === "comp-1" || match.competitionId === "1"
			? "Copa del Mundo 2026"
			: "Liga Profesional Argentina");
	const isWorldCup =
		compName.toLowerCase().includes("copa del mundo") ||
		compName.toLowerCase().includes("world cup");
	const isFriendly =
		compName.toLowerCase().includes("amistoso") ||
		match.stageName.toLowerCase().includes("friendly");

	let competitionLabel = compName;
	if (isFriendly) {
		competitionLabel = "Amistoso Internacional";
	} else if (isWorldCup) {
		const translatedStage = translateStage(match.stageName);
		competitionLabel = `${compName} • ${translatedStage}`;
	} else {
		competitionLabel = `${compName} • Fecha ${match.matchday}`;
	}

	const getCompAbrev = () => {
		if (isFriendly) return "AMIS";
		if (isWorldCup) return "WC";
		if (compName.toLowerCase().includes("liga profesional")) return "LPF";
		return compName.substring(0, 3).toUpperCase();
	};

	const [homeScore, setHomeScore] = useState<string>(
		prediction ? String(prediction.predictedHome) : "",
	);
	const [awayScore, setAwayScore] = useState<string>(
		prediction ? String(prediction.predictedAway) : "",
	);
	const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | null>(
		prediction ? prediction.predictedWinner : null,
	);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");

	useEffect(() => {
		setHomeScore(prediction ? String(prediction.predictedHome) : "");
		setAwayScore(prediction ? String(prediction.predictedAway) : "");
		setPenaltyWinner(prediction ? prediction.predictedWinner : null);
	}, [prediction]);

	const isPastLockTime =
		new Date(match.kickOff).getTime() - 15 * 60 * 1000 <= Date.now();
	const isLocked =
		isLive || isFinished || isCancelled || isPostponed || isPastLockTime;

	const handleSave = async (
		hVal = homeScore,
		aVal = awayScore,
		pWinner = penaltyWinner,
	) => {
		if (!onSave) return;
		const hNum = Number.parseInt(hVal, 10);
		const aNum = Number.parseInt(aVal, 10);
		if (Number.isNaN(hNum) || Number.isNaN(aNum)) return;

		setSaveStatus("saving");
		try {
			await onSave(hNum, aNum, pWinner);
			setSaveStatus("saved");
			setTimeout(() => {
				setSaveStatus("idle");
			}, 2000);
		} catch (err) {
			console.error(err);
			setSaveStatus("error");
		}
	};

	const isPlayoffs = match.stageMultiplier > 1;
	const isDraw =
		homeScore !== "" &&
		awayScore !== "" &&
		Number.parseInt(homeScore, 10) === Number.parseInt(awayScore, 10);
	const showPenaltySelector = isPlayoffs && isDraw;

	const pointsEarned = prediction?.pointsEarned;

	// Perform helper points breakdown for rendering finished tags
	const getScoreResult = () => {
		if (prediction && match.homeScore !== null && match.awayScore !== null) {
			const pHome = prediction.predictedHome;
			const pAway = prediction.predictedAway;
			const pWinner = prediction.predictedWinner;
			const aHome = match.homeScore;
			const aAway = match.awayScore;
			const aWinner = match.penaltyWinner;

			const exactScore = pHome === aHome && pAway === aAway;

			const actualWinnerType =
				aHome > aAway ? "home" : aAway > aHome ? "away" : "draw";
			const predictedWinnerType =
				pHome > pAway ? "home" : pAway > pHome ? "away" : "draw";

			const correctDraw =
				actualWinnerType === "draw" && predictedWinnerType === "draw";
			const correctWinner =
				actualWinnerType !== "draw" && actualWinnerType === predictedWinnerType;

			const actualDiff = aHome - aAway;
			const predictedDiff = pHome - pAway;
			const goalDifference =
				(correctWinner || correctDraw) &&
				actualDiff === predictedDiff &&
				!exactScore;

			const correctWinnerOrDraw = correctWinner || correctDraw;

			const penaltyBonus =
				aHome === aAway &&
				pHome === pAway &&
				aWinner !== null &&
				pWinner === aWinner;

			return {
				exactScore,
				goalDifference,
				correctWinner: correctWinnerOrDraw && !exactScore && !goalDifference,
				penaltyBonus,
			};
		}
		return null;
	};

	const scoreResult = getScoreResult();

	const latestHomeEvent = match.events
		?.filter((e) => e.team === "home")
		?.slice(-1)[0];
	const latestAwayEvent = match.events
		?.filter((e) => e.team === "away")
		?.slice(-1)[0];

	const getEventEmoji = (type: string) => {
		if (type === "goal") return "⚽";
		if (type === "yellow") return "🟨";
		if (type === "red") return "🟥";
		return "📢";
	};

	return (
		<div
			className={`glass-card rounded-2xl overflow-hidden relative group transition-[background-color,border-color] duration-500 border-white/10 ${
				isGoal
					? "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] animate-pulse"
					: isLive
						? "celestial-glow border-primary/20 bg-primary/5"
						: isCancelled
							? "border-red-500/30 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
							: "hover:bg-white/5"
			}`}
		>
			{/* Main Match Row */}
			{/* biome-ignore lint/a11y/useSemanticElements: El div actúa como un botón de acordeón para expandir la tarjeta. */}
			<div
				onClick={() => setIsExpanded(!isExpanded)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsExpanded(!isExpanded);
					}
				}}
				role="button"
				tabIndex={0}
				className="flex items-center justify-between p-3.5 md:px-5 cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
			>
				{/* Left Section: Time or Status + League Badge */}
				<div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2.5 w-[65px] md:w-[95px] flex-none">
					{isLive ? (
						<span className="flex items-center gap-1 bg-error/10 border border-error/30 text-error px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase animate-pulse">
							<span className="w-1 h-1 rounded-full bg-error inline-block animate-ping" />
							{typeof liveMinute === "number" ? `${liveMinute}'` : liveMinute}
						</span>
					) : isCancelled ? (
						<span className="bg-red-500/15 border border-red-500/30 text-red-400 px-1.5 md:px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider">
							Susp
						</span>
					) : isFinished ? (
						<span className="bg-white/5 border border-white/10 text-on-surface-variant px-1.5 md:px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold uppercase">
							Fin
						</span>
					) : (
						<span className="text-[9px] md:text-[10px] text-on-surface-variant font-bold tabular-nums">
							{new Date(match.kickOff).toLocaleTimeString("es-AR", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					)}
					<span className="text-[8px] md:text-[9px] bg-white/5 text-secondary border border-white/10 px-1 md:px-1.5 py-0.5 rounded font-black tracking-wider">
						{getCompAbrev()}
					</span>
				</div>

				{/* Middle Section: Matchup (Home - Score - Away) */}
				<div className="flex-1 min-w-0 flex items-center justify-center px-1.5 md:px-4">
					{/* Home Team */}
					<div className="flex-1 flex items-center justify-end gap-1 md:gap-2 min-w-0">
						{latestHomeEvent && (
							<span className="hidden md:inline-flex items-center gap-0.5 text-[9px] text-on-surface-variant bg-white/5 px-2 py-0.5 rounded-full border border-white/5 truncate max-w-[120px] animate-enter">
								{getEventEmoji(latestHomeEvent.type)} {latestHomeEvent.minute}'{" "}
								{latestHomeEvent.playerName}
							</span>
						)}
						<span className="font-headline-md text-xs font-bold text-white truncate max-w-[60px] md:max-w-[140px] uppercase">
							{translateTeamName(match.homeTeam)}
						</span>
						<div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface-container border border-white/10 flex items-center justify-center p-0 relative overflow-hidden flex-shrink-0">
							{match.homeLogo ? (
								<img
									src={match.homeLogo}
									alt={translateTeamName(match.homeTeam)}
									className="w-full h-full object-contain"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
										const sibling = (e.target as HTMLImageElement)
											.nextElementSibling;
										if (sibling)
											(sibling as HTMLElement).style.display = "block";
									}}
								/>
							) : null}
							<span
								className="material-symbols-outlined text-primary text-sm"
								style={{ display: match.homeLogo ? "none" : "block" }}
							>
								shield
							</span>
						</div>
					</div>

					{/* Score / VS Pill */}
					<div className="flex-none mx-1.5 md:mx-3">
						{isLive || isFinished || isCancelled ? (
							<div className="bg-surface-container-high border border-white/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-black select-none tabular-nums flex items-center gap-2">
								<span
									className={`${match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore ? "text-primary text-glowing" : "text-white"}`}
								>
									{match.homeScore ?? 0}
								</span>
								<span className="text-on-surface-variant text-[9px]">:</span>
								<span
									className={`${match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore ? "text-primary text-glowing" : "text-white"}`}
								>
									{match.awayScore ?? 0}
								</span>
							</div>
						) : (
							<div className="bg-surface-container border border-white/5 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[9px] font-black text-tertiary tracking-wider uppercase select-none">
								VS
							</div>
						)}
					</div>

					{/* Away Team */}
					<div className="flex-1 flex items-center justify-start gap-1 md:gap-2 min-w-0">
						<div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface-container border border-white/10 flex items-center justify-center p-0 relative overflow-hidden flex-shrink-0">
							{match.awayLogo ? (
								<img
									src={match.awayLogo}
									alt={translateTeamName(match.awayTeam)}
									className="w-full h-full object-contain"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
										const sibling = (e.target as HTMLImageElement)
											.nextElementSibling;
										if (sibling)
											(sibling as HTMLElement).style.display = "block";
									}}
								/>
							) : null}
							<span
								className="material-symbols-outlined text-primary text-sm"
								style={{ display: match.awayLogo ? "none" : "block" }}
							>
								shield
							</span>
						</div>
						<span className="font-headline-md text-xs font-bold text-white truncate max-w-[60px] md:max-w-[140px] uppercase">
							{translateTeamName(match.awayTeam)}
						</span>
						{latestAwayEvent && (
							<span className="hidden md:inline-flex items-center gap-0.5 text-[9px] text-on-surface-variant bg-white/5 px-2 py-0.5 rounded-full border border-white/5 truncate max-w-[120px] animate-enter">
								{getEventEmoji(latestAwayEvent.type)} {latestAwayEvent.minute}'{" "}
								{latestAwayEvent.playerName}
							</span>
						)}
					</div>
				</div>

				{/* Right Section: TV + Expand arrow */}
				<div className="flex items-center justify-end gap-2.5 w-auto md:w-[160px] md:min-w-[160px] flex-none">
					{isLive && match.events && match.events.length > 0 && (
						<div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full select-none shadow-[0_0_10px_rgba(255,255,255,0.02)]">
							{match.events.slice(-3).map((e) => (
								<span
									key={e.id}
									className="text-[10px] cursor-help transition-transform hover:scale-110 active:scale-95"
									title={`${e.minute}' - ${e.playerName} (${e.type === "goal" ? "Gol ⚽" : e.type === "yellow" ? "Tarj. Amarilla 🟨" : "Tarj. Roja 🟥"})`}
								>
									{e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : "🟥"}
								</span>
							))}
						</div>
					)}
					{isGoal && (
						<span className="text-[9px] text-emerald-400 font-black tracking-widest animate-bounce mr-1">
							¡GOL!
						</span>
					)}
					{match.tvChannel && (
						<span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-secondary font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
							📺 {match.tvChannel}
						</span>
					)}
					<span
						className={`material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-transform duration-300 ${
							isExpanded ? "rotate-180 text-primary" : ""
						}`}
					>
						keyboard_arrow_down
					</span>
				</div>
			</div>

			{/* Mobile Event Ticker Row */}
			{(latestHomeEvent || latestAwayEvent) && (
				<div className="md:hidden flex justify-between items-center px-4 pb-2 text-[8px] text-on-surface-variant/80 border-b border-white/5">
					<div className="w-1/2 text-left truncate pr-2">
						{latestHomeEvent && (
							<span>
								{getEventEmoji(latestHomeEvent.type)} {latestHomeEvent.minute}'{" "}
								{latestHomeEvent.playerName}
							</span>
						)}
					</div>
					<div className="w-1/2 text-right truncate pl-2">
						{latestAwayEvent && (
							<span>
								{latestAwayEvent.playerName} {latestAwayEvent.minute}'{" "}
								{getEventEmoji(latestAwayEvent.type)}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Accordion Expanded Section: Predictions / Stadium / Action */}
			{isExpanded && (
				<div className="p-4 border-t border-white/5 bg-surface-container-low/20 animate-fade-in space-y-4">
					{/* Competition & Stadium full details */}
					<div className="grid sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
						<div className="flex items-center gap-2">
							<span className="material-symbols-outlined text-sm text-tertiary">
								emoji_events
							</span>
							<span className="font-semibold">{competitionLabel}</span>
						</div>
						{match.stadium && (
							<div className="flex items-center gap-2">
								<span className="material-symbols-outlined text-sm text-primary">
									stadium
								</span>
								<span className="italic">{match.stadium}</span>
							</div>
						)}
						{match.tvChannel && (
							<div className="sm:hidden flex items-center gap-2">
								<span className="material-symbols-outlined text-sm text-secondary">
									tv
								</span>
								<span>Transmite: {match.tvChannel}</span>
							</div>
						)}
					</div>

					{/* Interactive Prediction panel inside expanded view */}
					{showPrediction && (
						<div
							className={`bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden transition-opacity duration-300 ${
								isFinished && pointsEarned === 0 ? "opacity-60" : ""
							}`}
						>
							<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

							<div className="flex justify-between items-center mb-3">
								<p className="font-label-caps text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">
									{isLocked ? "PRONÓSTICO REGISTRADO" : "TU PRONÓSTICO TÁCTICO"}
								</p>

								<div className="flex items-center gap-1.5">
									{saveStatus === "saving" && (
										<span className="flex items-center gap-1 text-[10px] text-primary font-bold animate-pulse">
											<span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping mr-1" />
											Guardando...
										</span>
									)}
									{saveStatus === "saved" && (
										<span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold transition-opacity duration-500">
											<span className="material-symbols-outlined text-xs mr-0.5">
												check_circle
											</span>
											Guardado
										</span>
									)}
									{saveStatus === "error" && (
										<span className="flex items-center gap-1 text-[10px] text-error font-bold">
											<span className="material-symbols-outlined text-xs mr-0.5">
												error
											</span>
											Error
										</span>
									)}
								</div>
							</div>

							{isLocked && !prediction ? (
								<div className="text-center py-2">
									<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
										No registraste pronóstico a tiempo
									</span>
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex items-center justify-center gap-4">
										<div className="flex flex-col items-center">
											<input
												type="number"
												placeholder="0"
												min="0"
												disabled={isLocked}
												value={homeScore}
												onChange={(e) => {
													setHomeScore(e.target.value);
												}}
												onBlur={(e) => handleSave(e.target.value, awayScore)}
												className="w-14 h-12 bg-surface-container text-center font-stat-value text-2xl text-white font-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none rounded-lg border border-outline transition-[border-color,box-shadow]"
											/>
										</div>
										<span className="text-on-surface-variant font-bold text-xl select-none">
											-
										</span>
										<div className="flex flex-col items-center">
											<input
												type="number"
												placeholder="0"
												min="0"
												disabled={isLocked}
												value={awayScore}
												onChange={(e) => {
													setAwayScore(e.target.value);
												}}
												onBlur={(e) => handleSave(homeScore, e.target.value)}
												className="w-14 h-12 bg-surface-container text-center font-stat-value text-2xl text-primary font-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none rounded-lg border border-outline transition-[border-color,box-shadow]"
											/>
										</div>
									</div>

									{/* Penalty Winner Selector for Playoffs draws */}
									{showPenaltySelector && (
										<div className="flex flex-col items-center space-y-2 animate-fade-in">
											<p className="font-label-caps text-[9px] text-tertiary font-bold tracking-widest uppercase text-glowing-gold">
												Desempate por Penales (Requerido)
											</p>
											<div className="flex gap-2 w-full max-w-[320px]">
												<button
													type="button"
													disabled={isLocked}
													onClick={() => {
														if (isLocked) return;
														const nextWinner =
															penaltyWinner === "home" ? null : "home";
														setPenaltyWinner(nextWinner);
														handleSave(homeScore, awayScore, nextWinner);
													}}
													className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold tracking-wider transition-transform duration-200 active:scale-[0.96] cursor-pointer ${
														penaltyWinner === "home"
															? "bg-primary/20 border-primary text-primary celestial-glow"
															: "bg-surface-container-high/40 border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white"
													}`}
												>
													Gana {translateTeamName(match.homeTeam)}
												</button>
												<button
													type="button"
													disabled={isLocked}
													onClick={() => {
														if (isLocked) return;
														const nextWinner =
															penaltyWinner === "away" ? null : "away";
														setPenaltyWinner(nextWinner);
														handleSave(homeScore, awayScore, nextWinner);
													}}
													className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold tracking-wider transition-transform duration-200 active:scale-[0.96] cursor-pointer ${
														penaltyWinner === "away"
															? "bg-primary/20 border-primary text-primary celestial-glow"
															: "bg-surface-container-high/40 border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white"
													}`}
												>
													Gana {translateTeamName(match.awayTeam)}
												</button>
											</div>
										</div>
									)}

									{/* Penalty Winner Display when locked */}
									{isLocked && penaltyWinner && (
										<div className="text-center">
											<span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
												Ganador Penales Elegido:{" "}
												{penaltyWinner === "home"
													? translateTeamName(match.homeTeam)
													: translateTeamName(match.awayTeam)}
											</span>
										</div>
									)}

									{/* Score results premium styling tags */}
									{isFinished && scoreResult && (
										<div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-2 border-t border-white/5">
											{scoreResult.exactScore && (
												<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1">
													<span className="material-symbols-outlined text-[12px]">
														sports_soccer
													</span>
													Marcador Exacto (+{10 * match.stageMultiplier} pts)
												</span>
											)}

											{scoreResult.goalDifference && (
												<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center gap-1">
													<span className="material-symbols-outlined text-[12px]">
														show_chart
													</span>
													Diferencia de Goles (+{6 * match.stageMultiplier} pts)
												</span>
											)}
											{scoreResult.correctWinner && (
												<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)] flex items-center gap-1">
													<span className="material-symbols-outlined text-[12px]">
														done
													</span>
													Resultado Básico (+{3 * match.stageMultiplier} pts)
												</span>
											)}
											{scoreResult.penaltyBonus && (
												<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.2)] flex items-center gap-1">
													<span className="material-symbols-outlined text-[12px]">
														military_tech
													</span>
													Tanda de Penales (+4)
												</span>
											)}
											{pointsEarned === 0 && (
												<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400/80 flex items-center gap-1">
													<span className="material-symbols-outlined text-[12px]">
														close
													</span>
													Pronóstico Errado (0 pts)
												</span>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Tactical Details Tabs (Events, Stats, Lineups) */}
					<MatchDetailsTabs match={match} />
				</div>
			)}
		</div>
	);
}
