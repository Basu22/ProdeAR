import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import { useNewEvents } from "../../hooks/useNewEvents";
import type { MatchCardState } from "../../lib/matchCardState";
import type { Match, MatchEvent, Prediction } from "../../lib/types";
import { BroadcastLink } from "./BroadcastLink";
import { EventToast } from "./EventToast";
import { GoalAnimation } from "./GoalAnimation";
import { LiveClockBadge } from "./LiveClockBadge";
import { MatchStatusBar } from "./MatchStatusBar";
import { RedCardBadge } from "./RedCardBadge";

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
	"South Africa": "Sudáfrica",
	Mali: "Malí",
	"DR Congo": "RD Congo",
	"Cape Verde": "Cabo Verde",
	Iran: "Irán",
	Iraq: "Irak",
	Qatar: "Catar",
	Uzbekistan: "Uzbekistán",
	"United Arab Emirates": "Emiratos Árabes Unidos",
	Jordan: "Jordania",
	Thailand: "Tailandia",
	Scotland: "Escocia",
	Wales: "Gales",
	"Northern Ireland": "Irlanda del Norte",
	"Republic of Ireland": "República de Irlanda",
	"Czech Republic": "República Checa",
	"Bosnia and Herzegovina": "Bosnia y Herzegovina",
	Hungary: "Hungría",
	Romania: "Rumania",
	Finland: "Finlandia",
	Iceland: "Islandia",
	Slovakia: "Eslovaquia",
	Slovenia: "Eslovenia",
	"North Macedonia": "Macedonia del Norte",
	Luxembourg: "Luxemburgo",
	Belarus: "Bielorrusia",
	Haiti: "Haití",
	Panama: "Panamá",
	Curacao: "Curaçao",
	"Trinidad and Tobago": "Trinidad y Tobago",
	"Dominican Republic": "República Dominicana",
	Suriname: "Surinam",
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
	if (lower.includes("round of 32") || lower.includes("dieciseisavos"))
		return "Dieciseisavos de Final";
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
	predictionViewMode?: boolean;
	tournamentName?: string;
	predictions?: Prediction[];
	tournamentNames?: Map<string, string>;
	/** Fase 2: estado visual derivado. Si se provee, reemplaza la ROW 1 con <MatchStatusBar>. */
	cardState?: MatchCardState;
	/** Fase 3: true si el usuario ya pronosticó este partido en todos los torneos asignados. */
	isFullyPredicted?: boolean;
	/** Fase 2: cantidad de predicciones del usuario (multi-torneo). */
	predictionCount?: number;
	/** Si se provee, reemplaza el toggle del acordeón por este callback (abre MatchSheet). */
	onSelect?: (matchId: string) => void;
	/**
	 * Si se provee, renderiza el BroadcastLink (lower-third) al pie de la
	 * card. El callback abre el MatchSheet de detalles del partido. La card
	 * mantiene el comportamiento de acordeón para edición del pronóstico.
	 */
	onOpenDetails?: (matchId: string) => void;
}

export function MatchCard({
	match,
	showPrediction,
	prediction,
	onSave,
	predictionViewMode,
	tournamentName,
	predictions,
	tournamentNames,
	cardState,
	isFullyPredicted,
	predictionCount,
	onSelect,
	onOpenDetails,
}: MatchCardProps) {
	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isCancelled = match.status === "cancelled";
	const isPostponed = match.status === "postponed";
	// Hook único: usado por MatchStatusBar (vía prop `live`) Y por el render
	// inline del cronómetro (vía LiveClockBadge). Mantener un solo consumer
	// del hook aquí garantiza una única fuente de verdad en esta card.
	const live = useLiveMinute(match);

	const [isExpanded, setIsExpanded] = useState(false);
	const { newEvents, clearEvent } = useNewEvents(match, isLive);
	const [animationQueue, setAnimationQueue] = useState<MatchEvent[]>([]);
	const [currentAnimation, setCurrentAnimation] = useState<MatchEvent | null>(
		null,
	);
	const [stadiumGlow, setStadiumGlow] = useState<
		"goal" | "red" | "yellow" | null
	>(null);
	const goalAudioRef = useRef<HTMLAudioElement | null>(null);

	// Tab activo del detalle expandido (eventos / stats / formaciones)

	// Determinar si el gol fue acertado por el usuario (soporta modo multi-torneo)
	const isUserGoal = useMemo(() => {
		if (currentAnimation?.type !== "goal") return false;
		if (match.homeScore === null || match.awayScore === null) return false;

		// Modo multi-torneo: iterar todas las predicciones del array
		if (predictions && predictions.length > 0) {
			return predictions.some(
				(p) =>
					match.homeScore === p.predictedHome &&
					match.awayScore === p.predictedAway,
			);
		}

		// Modo legacy: predicción singular
		if (prediction) {
			return (
				match.homeScore === prediction.predictedHome &&
				match.awayScore === prediction.predictedAway
			);
		}

		return false;
	}, [
		currentAnimation,
		match.homeScore,
		match.awayScore,
		predictions,
		prediction,
	]);

	// Pre-load del audio al montar si isLive
	useEffect(() => {
		if (isLive && !goalAudioRef.current) {
			goalAudioRef.current = new Audio("/sounds/goal.mp3");
			goalAudioRef.current.preload = "auto";
			goalAudioRef.current.volume = 0.6;
		}
	}, [isLive]);

	// Encolar eventos nuevos (goles primero)
	useEffect(() => {
		if (newEvents.length === 0) return;
		const goals = newEvents.filter((e) => e.type === "goal");
		const others = newEvents.filter((e) => e.type !== "goal");
		setAnimationQueue((prev) => {
			const combined = [...goals.reverse(), ...prev, ...others];
			// Cap a 5 elementos
			return combined.slice(-5);
		});
		for (const e of newEvents) {
			clearEvent(e.id);
		}
	}, [newEvents, clearEvent]);

	// Limpiar cola si no es live
	useEffect(() => {
		if (!isLive) {
			setAnimationQueue([]);
			setCurrentAnimation(null);
			setStadiumGlow(null);
		}
	}, [isLive]);

	// Procesar la cola
	useEffect(() => {
		if (currentAnimation || animationQueue.length === 0) return;
		const next = animationQueue[0];
		setCurrentAnimation(next);
		setAnimationQueue((prev) => prev.slice(1));

		// Stadium Glow
		if (next.type === "goal") {
			setStadiumGlow("goal");
			goalAudioRef.current?.play().catch(() => {});
		} else if (next.type === "red") {
			setStadiumGlow("red");
		} else if (next.type === "yellow") {
			setStadiumGlow("yellow");
		}

		// Auto-clear glow
		const glowDuration = next.type === "goal" ? 14000 : 7000;
		const t = setTimeout(() => setStadiumGlow(null), glowDuration);
		return () => clearTimeout(t);
	}, [animationQueue, currentAnimation]);

	const handleAnimationComplete = useCallback(() => {
		setCurrentAnimation(null);
	}, []);

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

	const getTeamAbrev = (name: string) => name.substring(0, 3).toUpperCase();

	const handleIncrement = (current: string, setter: (val: string) => void) => {
		if (isLocked) return;
		const val =
			current === "" ? 0 : Math.max(0, Number.parseInt(current, 10) + 1);
		setter(String(val));
	};

	const handleDecrement = (current: string, setter: (val: string) => void) => {
		if (isLocked) return;
		if (current === "" || current === "0") {
			setter("0");
		} else {
			const val = Math.max(0, Number.parseInt(current, 10) - 1);
			setter(String(val));
		}
	};

	const isDirty = useMemo(() => {
		const savedHome = prediction ? String(prediction.predictedHome) : "";
		const savedAway = prediction ? String(prediction.predictedAway) : "";
		const savedWinner = prediction ? prediction.predictedWinner : null;
		return (
			homeScore !== savedHome ||
			awayScore !== savedAway ||
			penaltyWinner !== savedWinner
		);
	}, [prediction, homeScore, awayScore, penaltyWinner]);

	const saveBtnState = useMemo(() => {
		if (isLocked) {
			if (prediction) {
				return {
					text: "PRONÓSTICO REGISTRADO",
					style:
						"bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default opacity-85",
					disabled: true,
					icon: "check_circle",
				};
			}
			return {
				text: "TIEMPO EXPIRADO",
				style:
					"bg-surface-container border border-white/5 text-on-surface-variant/50 cursor-default opacity-50",
				disabled: true,
				icon: "lock",
			};
		}

		if (saveStatus === "saving") {
			return {
				text: "GUARDANDO...",
				style:
					"bg-primary/20 border border-primary/30 text-primary animate-pulse cursor-default",
				disabled: true,
				icon: "sync",
			};
		}

		if (homeScore === "" || awayScore === "") {
			return {
				text: "COMPLETAR PRONÓSTICO",
				style:
					"bg-surface-container border border-white/5 text-on-surface-variant/40 cursor-not-allowed",
				disabled: true,
				icon: "edit",
			};
		}

		const isPlayoffs = match.stageMultiplier > 1;
		const isDraw =
			homeScore !== "" &&
			awayScore !== "" &&
			Number.parseInt(homeScore, 10) === Number.parseInt(awayScore, 10);
		if (isPlayoffs && isDraw && penaltyWinner === null) {
			return {
				text: "SELECCIONAR GANADOR DE PENALES",
				style:
					"bg-amber-500/10 border border-amber-500/30 text-amber-400 cursor-default",
				disabled: true,
				icon: "military_tech",
			};
		}

		if (isDirty) {
			return {
				text: "GUARDAR PRONÓSTICO",
				style:
					"bg-error hover:bg-error/90 text-white font-extrabold active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(255,42,42,0.15)]",
				disabled: false,
				icon: "save",
			};
		}

		return {
			text: "PRONÓSTICO GUARDADO",
			style:
				"bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold cursor-default shadow-[0_0_15px_rgba(16,185,129,0.05)]",
			disabled: true,
			icon: "check_circle",
		};
	}, [
		isLocked,
		saveStatus,
		homeScore,
		awayScore,
		isDirty,
		match.stageMultiplier,
		penaltyWinner,
		prediction,
	]);

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

	// Puntos desglosados (reutiliza la función pura)
	const scoreResult = useMemo(
		() => (prediction ? getScoreResultForPrediction(prediction, match) : null),
		[prediction, match],
	);

	// Conteo de tarjetas rojas por equipo (para badge en el escudo)
	const { homeRedCount, awayRedCount } = useMemo(() => {
		const events = match.events ?? [];
		return {
			homeRedCount: events.filter((e) => e.type === "red" && e.team === "home")
				.length,
			awayRedCount: events.filter((e) => e.type === "red" && e.team === "away")
				.length,
		};
	}, [match.events]);

	return (
		<div
			className={`glass-card rounded-2xl overflow-hidden relative group transition-[background-color,border-color] duration-500 border-white/10 ${
				stadiumGlow === "goal"
					? "stadium-glow-green"
					: stadiumGlow === "red"
						? "stadium-glow-red"
						: stadiumGlow === "yellow"
							? "stadium-glow-amber"
							: isLive
								? "celestial-glow border-primary/20 bg-primary/5"
								: isCancelled
									? "border-red-500/30 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
									: "hover:bg-white/5"
			}`}
		>
			{/* Header: 4 stacked centered rows */}
			{/* biome-ignore lint/a11y/useSemanticElements: El div actúa como un botón de acordeón para expandir la tarjeta. */}
			<div
				onClick={() => {
					if (onSelect) {
						onSelect(match.id);
					} else {
						setIsExpanded(!isExpanded);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						if (onSelect) {
							onSelect(match.id);
						} else {
							setIsExpanded(!isExpanded);
						}
					}
				}}
				role="button"
				tabIndex={0}
				className="cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-primary/50 rounded-t-2xl"
			>
				{/* ROW 1: Horario / Estado (centrado) */}
				<div className="flex items-center justify-center px-4 pt-3 pb-1">
					{cardState ? (
						<MatchStatusBar
							state={cardState}
							kickOff={match.kickOff}
							isFullyPredicted={isFullyPredicted}
							live={live}
							predictionCount={predictionCount}
							// Sprint "Habilitar formations upcoming" (v1.1): badge
							// "👥 11" al lado del horario en estados de pre-partido.
							hasLineupsUpcoming={
								!isLive &&
								!isFinished &&
								!isCancelled &&
								!isPostponed &&
								(match.lineups?.length ?? 0) >= 2
							}
						/>
					) : isLive ? (
						<LiveClockBadge live={live} size="sm" />
					) : isFinished ? (
						<span className="bg-white/5 border border-white/10 text-on-surface-variant px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase">
							FIN
						</span>
					) : isCancelled ? (
						<span className="bg-red-500/15 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider">
							SUSP
						</span>
					) : isPostponed ? (
						<span className="bg-white/5 border border-white/10 text-on-surface-variant px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase">
							PPTO
						</span>
					) : (
						// Sprint "Habilitar formations upcoming" (v1.1): badge
						// "👥 11" al lado del horario en upcoming SIN cardState.
						<div className="flex items-center gap-1.5">
							<span className="text-[9px] md:text-[10px] text-on-surface-variant font-bold tabular-nums">
								{new Date(match.kickOff).toLocaleTimeString("es-AR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
							{(match.lineups?.length ?? 0) >= 2 && (
								<span
									className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary"
									aria-label="Formación titular disponible"
									title="Formación titular disponible — tocá para ver"
								>
									<span
										className="material-symbols-outlined text-[10px]"
										aria-hidden="true"
									>
										groups
									</span>
									<span className="font-label-caps text-[8px] tracking-widest font-bold">
										11
									</span>
								</span>
							)}
						</div>
					)}
				</div>

				{/* ROW 2: Matchup (centrado, equipos flanquean el score) */}
				<div className="flex items-center justify-center px-4 py-2 md:py-3">
					{/* Home Team block */}
					<div className="flex items-center justify-end gap-2 md:gap-3 flex-1 min-w-0">
						<span className="font-headline-md text-xs md:text-sm font-bold text-white uppercase">
							{translateTeamName(match.homeTeam)}
						</span>
						{/* Escudo Home con badge de rojas */}
						<div className="relative flex-shrink-0">
							<div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center">
								{match.homeLogo ? (
									<img
										src={match.homeLogo}
										alt={translateTeamName(match.homeTeam)}
										className="w-full h-full object-cover"
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
									className="material-symbols-outlined text-primary text-base bg-surface-container w-full h-full flex items-center justify-center"
									style={{ display: match.homeLogo ? "none" : "block" }}
								>
									shield
								</span>
							</div>
							<RedCardBadge count={homeRedCount} />
						</div>
					</div>

					{/* Score / VS Pill */}
					<div className="flex-none mx-3 md:mx-5">
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

					{/* Away Team block */}
					<div className="flex items-center justify-start gap-2 md:gap-3 flex-1 min-w-0">
						{/* Escudo Away con badge de rojas */}
						<div className="relative flex-shrink-0">
							<div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center">
								{match.awayLogo ? (
									<img
										src={match.awayLogo}
										alt={translateTeamName(match.awayTeam)}
										className="w-full h-full object-cover"
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
									className="material-symbols-outlined text-primary text-base bg-surface-container w-full h-full flex items-center justify-center"
									style={{ display: match.awayLogo ? "none" : "block" }}
								>
									shield
								</span>
							</div>
							<RedCardBadge count={awayRedCount} />
						</div>
						<span className="font-headline-md text-xs md:text-sm font-bold text-white uppercase">
							{translateTeamName(match.awayTeam)}
						</span>
					</div>
				</div>

				{/* ROW 3: Competencia (centrada) */}
				<div className="flex items-center justify-center px-4 pb-1 pt-1">
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="material-symbols-outlined text-sm text-tertiary flex-shrink-0">
							emoji_events
						</span>
						<span className="font-label-caps text-[9px] md:text-[10px] text-on-surface-variant tracking-wider font-semibold truncate max-w-[220px] md:max-w-none">
							{competitionLabel}
						</span>
					</div>
				</div>

				{/* ROW 4: Auxiliar (TV + flecha) */}
				<div className="flex items-center justify-between px-4 pb-2 pt-1">
					{/* Lado izquierdo: TV */}
					<div>
						{match.tvChannel && (
							<span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] text-secondary font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
								📺 {match.tvChannel}
							</span>
						)}
					</div>
					{/* Lado derecho: flecha */}
					<span
						className={`material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-transform duration-300 ${
							isExpanded ? "rotate-180 text-primary" : ""
						}`}
					>
						keyboard_arrow_down
					</span>
				</div>
			</div>

			{/* Live event animations (Idea 2) */}
			{currentAnimation?.type === "goal" && (
				<GoalAnimation
					event={currentAnimation}
					onComplete={handleAnimationComplete}
					isUserGoal={isUserGoal}
				/>
			)}
			{currentAnimation && currentAnimation.type !== "goal" && (
				<EventToast
					event={currentAnimation}
					onComplete={handleAnimationComplete}
				/>
			)}

			{/* Accordion Expanded Section: Predictions / Stadium / Action */}
			{isExpanded && (
				<div className="p-4 border-t border-white/5 bg-surface-container-low/20 animate-fade-in space-y-4">
					{/* Stadium & TV mobile (competition label already in header row 3) */}
					<div className="grid sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
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

					{/* MODO LECTURA (Dashboard) — prioridad sobre modo edición */}
					{predictionViewMode && (
						<PredictionViewPanel
							match={match}
							prediction={prediction}
							tournamentName={tournamentName}
							predictions={predictions}
							tournamentNames={tournamentNames}
							scoreResult={scoreResult}
							pointsEarned={pointsEarned}
							isFinished={isFinished}
						/>
					)}

					{/* MODO EDICIÓN (Tournament, League) — solo si NO está en modo lectura */}
					{!predictionViewMode && showPrediction && (
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
							</div>

							{isLocked && !prediction ? (
								<div className="text-center py-2">
									<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
										No registraste pronóstico a tiempo
									</span>
								</div>
							) : (
								<div className="space-y-5">
									{/* Scoreboard redesign with + and - buttons and logos */}
									<div className="flex items-center justify-between gap-6 max-w-sm mx-auto py-2">
										{/* Home Team Column */}
										<div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
											<div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
												{match.homeLogo ? (
													<img
														src={match.homeLogo}
														alt={translateTeamName(match.homeTeam)}
														className="w-full h-full object-cover"
														onError={(e) => {
															(e.target as HTMLImageElement).style.display =
																"none";
															const sibling = (e.target as HTMLImageElement)
																.nextElementSibling;
															if (sibling)
																(sibling as HTMLElement).style.display =
																	"block";
														}}
													/>
												) : null}
												<span
													className="material-symbols-outlined text-primary text-lg bg-surface-container w-full h-full flex items-center justify-center"
													style={{ display: match.homeLogo ? "none" : "block" }}
												>
													shield
												</span>
											</div>
											<span className="font-headline-md text-sm font-bold text-white truncate uppercase tracking-wider">
												{getTeamAbrev(match.homeTeam)}
											</span>
										</div>

										{/* Scores Columns Container */}
										<div className="flex items-center gap-3">
											{/* Home Score Column */}
											<div className="flex flex-col items-center gap-1.5">
												<button
													type="button"
													disabled={isLocked}
													onClick={() =>
														handleIncrement(homeScore, setHomeScore)
													}
													className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-colors active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed select-none"
												>
													+
												</button>
												<input
													type="number"
													placeholder="-"
													min="0"
													disabled={isLocked}
													value={homeScore}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d+$/.test(val)) {
															setHomeScore(val);
														}
													}}
													className="w-12 h-12 md:w-14 md:h-14 bg-white text-center font-stat-value text-2xl md:text-3xl text-neutral-900 font-black rounded-xl border border-white/10 shadow-inner outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-neutral-800 disabled:text-white transition-colors"
												/>
												<button
													type="button"
													disabled={isLocked}
													onClick={() =>
														handleDecrement(homeScore, setHomeScore)
													}
													className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-colors active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed select-none"
												>
													-
												</button>
											</div>

											{/* Spacer */}
											<span className="text-on-surface-variant font-bold text-xl select-none self-center pb-1">
												-
											</span>

											{/* Away Score Column */}
											<div className="flex flex-col items-center gap-1.5">
												<button
													type="button"
													disabled={isLocked}
													onClick={() =>
														handleIncrement(awayScore, setAwayScore)
													}
													className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-colors active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed select-none"
												>
													+
												</button>
												<input
													type="number"
													placeholder="-"
													min="0"
													disabled={isLocked}
													value={awayScore}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d+$/.test(val)) {
															setAwayScore(val);
														}
													}}
													className="w-12 h-12 md:w-14 md:h-14 bg-white text-center font-stat-value text-2xl md:text-3xl text-neutral-900 font-black rounded-xl border border-white/10 shadow-inner outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-neutral-800 disabled:text-white transition-colors"
												/>
												<button
													type="button"
													disabled={isLocked}
													onClick={() =>
														handleDecrement(awayScore, setAwayScore)
													}
													className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-colors active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed select-none"
												>
													-
												</button>
											</div>
										</div>

										{/* Away Team Column */}
										<div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
											<div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
												{match.awayLogo ? (
													<img
														src={match.awayLogo}
														alt={translateTeamName(match.awayTeam)}
														className="w-full h-full object-cover"
														onError={(e) => {
															(e.target as HTMLImageElement).style.display =
																"none";
															const sibling = (e.target as HTMLImageElement)
																.nextElementSibling;
															if (sibling)
																(sibling as HTMLElement).style.display =
																	"block";
														}}
													/>
												) : null}
												<span
													className="material-symbols-outlined text-primary text-lg bg-surface-container w-full h-full flex items-center justify-center"
													style={{ display: match.awayLogo ? "none" : "block" }}
												>
													shield
												</span>
											</div>
											<span className="font-headline-md text-sm font-bold text-white truncate uppercase tracking-wider">
												{getTeamAbrev(match.awayTeam)}
											</span>
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

									{/* Giant RED/State Action Button */}
									<div className="w-full max-w-sm mx-auto pt-1">
										<button
											type="button"
											disabled={saveBtnState.disabled}
											onClick={() => handleSave()}
											className={`w-full py-3 px-4 rounded-xl border font-label-caps text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 select-none ${saveBtnState.style}`}
										>
											{saveBtnState.icon && (
												<span
													className={`material-symbols-outlined text-sm ${saveBtnState.icon === "sync" ? "animate-spin" : ""}`}
												>
													{saveBtnState.icon}
												</span>
											)}
											{saveBtnState.text}
										</button>
									</div>

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
				</div>
			)}

			{/* BroadcastLink (lower-third) — abre el MatchSheet de detalles */}
			{onOpenDetails && (
				<BroadcastLink match={match} onOpenDetails={onOpenDetails} />
			)}
		</div>
	);
}

/**
 * Resultado del cálculo de puntos realizado por `getScoreResult()` en MatchCard.
 * Reutilizado por `PredictionViewPanel` para tipar correctamente la prop.
 */
type ScoreResult = {
	exactScore: boolean;
	goalDifference: boolean;
	correctWinner: boolean;
	penaltyBonus: boolean;
};

/**
 * Calcula el desglose de puntos de una predicción vs. el resultado real.
 * Función pura reutilizable (multi-torneo o legacy).
 */
function getScoreResultForPrediction(
	prediction: Prediction,
	match: Match,
): ScoreResult | null {
	if (match.homeScore === null || match.awayScore === null) return null;

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

/**
 * Panel de visualización (modo lectura) para el Dashboard.
 * Soporta modo multi-torneo (array de predicciones) y modo legacy (1 predicción).
 */
function PredictionViewPanel({
	match,
	prediction,
	tournamentName,
	predictions,
	tournamentNames,
	scoreResult,
	pointsEarned,
	isFinished,
}: {
	match: Match;
	prediction?: Prediction;
	tournamentName?: string;
	predictions?: Prediction[];
	tournamentNames?: Map<string, string>;
	scoreResult: ScoreResult | null;
	pointsEarned: number | null | undefined;
	isFinished: boolean;
}) {
	// MODO MULTI-TORNEO: si se pasa el array con predicciones
	if (predictions && tournamentNames && predictions.length > 0) {
		return (
			<MultiPredictionRows
				predictions={predictions}
				match={match}
				tournamentNames={tournamentNames}
				isFinished={isFinished}
			/>
		);
	}

	// MODO MULTI-TORNEO sin predicciones: usuario sin pronósticos en este partido
	if (predictions && predictions.length === 0) {
		return (
			<div className="bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
				<div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-white/5">
					<span className="material-symbols-outlined text-sm text-tertiary">
						emoji_events
					</span>
					<p className="font-label-caps text-[10px] text-tertiary tracking-widest uppercase font-bold">
						PRONÓSTICOS
					</p>
				</div>
				<div className="text-center py-4 flex flex-col items-center gap-2">
					<span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
						edit_note
					</span>
					<p className="font-label-caps text-xs text-on-surface-variant/80 uppercase tracking-widest font-bold">
						No pronosticaste este partido en ningún torneo
					</p>
					<p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-xs">
						Andá a la página del torneo para cargar tu pronóstico
					</p>
				</div>
			</div>
		);
	}

	// MODO LEGACY: comportamiento anterior (un solo torneo)
	// Caso 1: No hay torneo activo
	if (!tournamentName) {
		return (
			<div className="bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
				<div className="text-center py-4 flex flex-col items-center gap-2">
					<span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
						lock
					</span>
					<p className="font-label-caps text-xs text-on-surface-variant/80 uppercase tracking-widest font-bold">
						No tenés un torneo activo
					</p>
					<p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-xs">
						Unite a uno para pronosticar
					</p>
					<Link
						to="/tournaments"
						className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
					>
						<span className="material-symbols-outlined text-sm">
							add_circle
						</span>
						Unirme a un torneo
					</Link>
				</div>
			</div>
		);
	}

	// Caso 2: Hay torneo pero no hay predicción para este partido
	if (!prediction) {
		return (
			<div className="bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
				<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
				<div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-white/5">
					<span className="material-symbols-outlined text-sm text-tertiary">
						emoji_events
					</span>
					<p className="font-label-caps text-[10px] text-tertiary tracking-widest uppercase font-bold">
						Pronóstico — {tournamentName}
					</p>
				</div>
				<div className="text-center py-4 flex flex-col items-center gap-2">
					<span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
						edit_note
					</span>
					<p className="font-label-caps text-xs text-on-surface-variant/80 uppercase tracking-widest font-bold">
						Aún no pronosticaste este partido
					</p>
					<p className="text-xs text-on-surface-variant/60 leading-relaxed max-w-xs">
						Andá a la página del torneo para cargar tu pronóstico
					</p>
				</div>
			</div>
		);
	}

	// Caso 3: Hay predicción — mostrar el score estático grande (legacy)
	const predictedHomeScore = prediction.predictedHome;
	const predictedAwayScore = prediction.predictedAway;

	return (
		<div className="bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
			<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

			{/* Header con nombre del torneo */}
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="material-symbols-outlined text-sm text-tertiary flex-shrink-0">
						emoji_events
					</span>
					<p className="font-label-caps text-[10px] text-tertiary tracking-widest uppercase font-bold truncate">
						Pronóstico — {tournamentName}
					</p>
				</div>
				{isFinished && pointsEarned !== null && pointsEarned !== undefined && (
					<span
						className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
							pointsEarned > 0
								? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
								: "bg-red-500/10 border border-red-500/20 text-red-400/80"
						}`}
					>
						{pointsEarned > 0 ? `+${pointsEarned} pts` : "0 pts"}
					</span>
				)}
			</div>

			{/* Score estático grande (Mejora 4) */}
			<div className="flex items-center justify-between gap-6 max-w-sm mx-auto py-3">
				{/* Home Team */}
				<div className="flex-1 flex flex-col items-center gap-2 min-w-0">
					<div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
						{match.homeLogo ? (
							<img
								src={match.homeLogo}
								alt={translateTeamName(match.homeTeam)}
								className="w-full h-full object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
									const sibling = (e.target as HTMLImageElement)
										.nextElementSibling;
									if (sibling) (sibling as HTMLElement).style.display = "block";
								}}
							/>
						) : null}
						<span
							className="material-symbols-outlined text-primary text-2xl bg-surface-container w-full h-full flex items-center justify-center"
							style={{ display: match.homeLogo ? "none" : "block" }}
						>
							shield
						</span>
					</div>
					<span className="font-headline-md text-sm md:text-base font-bold text-white text-center leading-tight">
						{translateTeamName(match.homeTeam)}
					</span>
				</div>

				{/* Score */}
				<div className="flex items-center gap-2 md:gap-3">
					<span className="font-stat-value text-3xl md:text-4xl font-black text-white tabular-nums">
						{predictedHomeScore}
					</span>
					<span className="text-on-surface-variant/40 font-bold text-2xl select-none">
						-
					</span>
					<span className="font-stat-value text-3xl md:text-4xl font-black text-white tabular-nums">
						{predictedAwayScore}
					</span>
				</div>

				{/* Away Team */}
				<div className="flex-1 flex flex-col items-center gap-2 min-w-0">
					<div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
						{match.awayLogo ? (
							<img
								src={match.awayLogo}
								alt={translateTeamName(match.awayTeam)}
								className="w-full h-full object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
									const sibling = (e.target as HTMLImageElement)
										.nextElementSibling;
									if (sibling) (sibling as HTMLElement).style.display = "block";
								}}
							/>
						) : null}
						<span
							className="material-symbols-outlined text-primary text-2xl bg-surface-container w-full h-full flex items-center justify-center"
							style={{ display: match.awayLogo ? "none" : "block" }}
						>
							shield
						</span>
					</div>
					<span className="font-headline-md text-sm md:text-base font-bold text-white text-center leading-tight">
						{translateTeamName(match.awayTeam)}
					</span>
				</div>
			</div>

			{/* Ganador de penales (si aplica) */}
			{prediction.predictedWinner && (
				<div className="text-center mt-2">
					<span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
						Ganador Penales:{" "}
						{prediction.predictedWinner === "home"
							? match.homeTeam
							: match.awayTeam}
					</span>
				</div>
			)}

			{/* Tags de resultado (si está finalizado) — reutiliza scoreResult existente */}
			{isFinished && scoreResult && (
				<div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5">
					{scoreResult.exactScore && (
						<span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1">
							<span className="material-symbols-outlined text-[12px]">
								sports_soccer
							</span>
							Marcador Exacto (+{10 * match.stageMultiplier} pts)
						</span>
					)}
					{scoreResult.goalDifference && (
						<span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center gap-1">
							<span className="material-symbols-outlined text-[12px]">
								show_chart
							</span>
							Diferencia de Goles (+{6 * match.stageMultiplier} pts)
						</span>
					)}
					{scoreResult.correctWinner && (
						<span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)] flex items-center gap-1">
							<span className="material-symbols-outlined text-[12px]">
								done
							</span>
							Resultado Básico (+{3 * match.stageMultiplier} pts)
						</span>
					)}
					{scoreResult.penaltyBonus && (
						<span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.2)] flex items-center gap-1">
							<span className="material-symbols-outlined text-[12px]">
								military_tech
							</span>
							Tanda de Penales (+4)
						</span>
					)}
					{pointsEarned === 0 && (
						<span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400/80 flex items-center gap-1">
							<span className="material-symbols-outlined text-[12px]">
								close
							</span>
							Pronóstico Errado (0 pts)
						</span>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Lista compacta de predicciones (modo multi-torneo del Dashboard).
 * Una fila por cada torneo en el que el usuario pronosticó este partido.
 */
function MultiPredictionRows({
	predictions,
	match,
	tournamentNames,
	isFinished,
}: {
	predictions: Prediction[];
	match: Match;
	tournamentNames: Map<string, string>;
	isFinished: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Orden: finalizados con puntos >0 (desc), finalizados con 0pts, pendientes
	const sortedPredictions = useMemo(() => {
		return [...predictions].sort((a, b) => {
			const aFinished = isFinished && a.pointsEarned !== null;
			const bFinished = isFinished && b.pointsEarned !== null;
			const aHasPoints = aFinished && (a.pointsEarned ?? 0) > 0;
			const bHasPoints = bFinished && (b.pointsEarned ?? 0) > 0;
			const aZeroPts = aFinished && (a.pointsEarned ?? 0) === 0;
			const bZeroPts = bFinished && (b.pointsEarned ?? 0) === 0;

			if (aHasPoints && bHasPoints)
				return (b.pointsEarned ?? 0) - (a.pointsEarned ?? 0);
			if (aHasPoints) return -1;
			if (bHasPoints) return 1;
			if (aZeroPts && bZeroPts) return 0;
			if (aZeroPts) return -1;
			if (bZeroPts) return 1;
			return 0;
		});
	}, [predictions, isFinished]);

	const totalPoints = useMemo(
		() =>
			predictions.reduce(
				(sum, p) =>
					sum + (p.pointsEarned && p.pointsEarned > 0 ? p.pointsEarned : 0),
				0,
			),
		[predictions],
	);

	const COLLAPSE_THRESHOLD = 4;
	const shouldCollapse = sortedPredictions.length >= COLLAPSE_THRESHOLD;
	const visiblePredictions =
		shouldCollapse && !isExpanded
			? sortedPredictions.slice(0, 3)
			: sortedPredictions;
	const hiddenCount = sortedPredictions.length - 3;

	return (
		<div className="bg-surface-container-low/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
			<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

			{/* HEADER */}
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="material-symbols-outlined text-sm text-tertiary flex-shrink-0">
						emoji_events
					</span>
					<p className="font-label-caps text-[10px] text-tertiary tracking-widest uppercase font-bold truncate">
						PRONÓSTICOS — {predictions.length}{" "}
						{predictions.length === 1 ? "TORNEO" : "TORNEOS"}
					</p>
				</div>
				{isFinished ? (
					<span
						className={`font-stat-value text-xs font-black tabular-nums flex-shrink-0 ${totalPoints > 0 ? "text-emerald-400" : "text-on-surface-variant/50"}`}
					>
						Σ {totalPoints} pts
					</span>
				) : (
					<span className="text-[10px] text-on-surface-variant/60 italic flex-shrink-0">
						Pendiente
					</span>
				)}
			</div>

			{/* FILAS */}
			<div className="space-y-2">
				{visiblePredictions.map((pred) => (
					<PredictionRow
						key={pred.id}
						prediction={pred}
						match={match}
						tournamentName={
							tournamentNames.get(pred.tournamentId) ||
							`Torneo #${pred.tournamentId.slice(0, 4)}`
						}
						tournamentId={pred.tournamentId}
						scoreResult={getScoreResultForPrediction(pred, match)}
						isFinished={isFinished}
					/>
				))}
			</div>

			{/* BOTÓN DE COLAPSO */}
			{shouldCollapse && !isExpanded && (
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className="w-full mt-2 text-center py-1.5 text-on-surface-variant hover:text-primary font-label-caps text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
				>
					Ver {hiddenCount} más
					<span className="material-symbols-outlined text-xs ml-1 align-middle">
						expand_more
					</span>
				</button>
			)}
		</div>
	);
}

/**
 * Fila individual de predicción en el panel multi-torneo.
 * Cada fila es un <Link> al torneo correspondiente.
 */
function PredictionRow({
	prediction,
	match,
	tournamentName,
	tournamentId,
	scoreResult,
	isFinished,
}: {
	prediction: Prediction;
	match: Match;
	tournamentName: string;
	tournamentId: string;
	scoreResult: ScoreResult | null;
	isFinished: boolean;
}) {
	return (
		<Link to={`/torneo/${tournamentId}`} className="block group">
			<div className="py-2 px-3 rounded-lg bg-surface-container/40 border border-white/5 hover:bg-surface-container/60 transition-colors group-hover:border-white/10">
				<div className="flex items-center gap-2">
					{/* Col 1: Torneo */}
					<div className="flex items-center gap-1.5 min-w-0 flex-1">
						<span className="material-symbols-outlined text-tertiary text-sm flex-shrink-0">
							emoji_events
						</span>
						<span className="font-label-caps text-xs uppercase truncate font-semibold text-on-surface-variant group-hover:text-white transition-colors">
							{tournamentName}
						</span>
					</div>

					{/* Col 2: Score */}
					<div className="flex items-center gap-1 flex-none">
						<span className="font-stat-value text-base font-black tabular-nums text-white">
							{prediction.predictedHome}
						</span>
						<span className="text-on-surface-variant/40 text-xs">-</span>
						<span className="font-stat-value text-base font-black tabular-nums text-white">
							{prediction.predictedAway}
						</span>
					</div>

					{/* Col 3: Puntos */}
					<div className="flex-none">
						{isFinished && prediction.pointsEarned !== null ? (
							prediction.pointsEarned > 0 ? (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
									+{prediction.pointsEarned} pts
								</span>
							) : (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/10 border border-red-500/20 text-red-400/80">
									0 pts
								</span>
							)
						) : (
							<span className="flex items-center gap-0.5 text-on-surface-variant/60 italic text-[10px]">
								<span className="material-symbols-outlined text-[12px]">
									schedule
								</span>
								Pendiente
							</span>
						)}
					</div>

					{/* Col 4: Tag resultado (sm+) */}
					{isFinished && scoreResult && (
						<div className="flex-none hidden sm:flex items-center gap-1">
							{scoreResult.exactScore && (
								<span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
									EXACTO
								</span>
							)}
							{scoreResult.goalDifference && (
								<span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
									DIF
								</span>
							)}
							{scoreResult.correctWinner && (
								<span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
									BÁSICO
								</span>
							)}
							{scoreResult.penaltyBonus && (
								<span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
									PEN
								</span>
							)}
						</div>
					)}
				</div>

				{/* Sub-fila: Penales */}
				{prediction.predictedWinner && (
					<div className="flex items-center gap-1 mt-1 pl-6">
						<span className="material-symbols-outlined text-[10px] text-amber-400">
							military_tech
						</span>
						<span className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">
							Penales:{" "}
							{prediction.predictedWinner === "home"
								? match.homeTeam
								: match.awayTeam}
						</span>
					</div>
				)}
			</div>
		</Link>
	);
}
