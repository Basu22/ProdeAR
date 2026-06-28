import { useEffect, useRef, useState } from "react";
import { useSavePrediction } from "../../hooks/usePredictions";
import {
	getPotentialPoints,
	getScoreResultForPrediction,
} from "../../lib/predictionHelpers";
import type { Match, Prediction, Tournament } from "../../lib/types";
import type { ViewMode } from "./PredictionCarousel";

export interface PredictionSlideProps {
	match: Match;
	prediction: Prediction | undefined;
	tournament: Tournament;
	/** Si la predicción está locked (no se puede editar) */
	locked: boolean;
	/** Modo de vista: editable (puede pronosticar), consult (no puede), results (partido terminado) */
	viewMode: ViewMode;
	/** Callback para que el padre sepa si este slide tiene cambios sin guardar */
	onDirtyChange?: (isDirty: boolean) => void;
}

const MAX_GOALS = 15;

/**
 * Slide individual del carrusel de predicciones.
 * 1 slide = 1 torneo. Contiene:
 *  - Header con nombre del torneo
 *  - Stepper editable (viewMode="editable") o display (otros modos)
 *  - Puntos potenciales o ganados
 *  - Botón Guardar / Badge de puntos / Label cerrado según viewMode
 */
export function PredictionSlide({
	match,
	prediction,
	tournament,
	locked,
	viewMode,
	onDirtyChange,
}: PredictionSlideProps) {
	const saveMutation = useSavePrediction();
	const [home, setHome] = useState<number>(prediction?.predictedHome ?? 0);
	const [away, setAway] = useState<number>(prediction?.predictedAway ?? 0);
	// Sprint "Llaves Eliminatorias con Penales" 2026: en playoffs con empate
	// el usuario debe pronosticar quién gana la tanda. Estado sincronizado
	// con `prediction.predictedWinner` (que ya existe en el tipo Prediction).
	const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | null>(
		prediction?.predictedWinner ?? null,
	);
	const [isDirty, setIsDirty] = useState(false);
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
		"idle",
	);

	// Reset state cuando cambia el prediction (al cambiar slide)
	useEffect(() => {
		setHome(prediction?.predictedHome ?? 0);
		setAway(prediction?.predictedAway ?? 0);
		setPenaltyWinner(prediction?.predictedWinner ?? null);
		setIsDirty(false);
		setSaveState("idle");
	}, [prediction]);

	// Notificar al padre cuando cambia isDirty.
	// IMPORTANTE: el callback `onDirtyChange` es una prop que el padre RECREA
	// en cada render (es un callback inline). Si lo ponemos en las deps del
	// useEffect, el efecto se ejecuta en cada render del padre → llama al
	// callback → setState en el padre → re-render → nuevo callback → loop.
	// Solución: usar un ref para que el callback siempre sea la versión actual
	// sin causar re-ejecuciones, y dejar las deps solo con [isDirty] (un boolean).
	const onDirtyChangeRef = useRef(onDirtyChange);
	useEffect(() => {
		onDirtyChangeRef.current = onDirtyChange;
	});
	useEffect(() => {
		onDirtyChangeRef.current?.(isDirty);
	}, [isDirty]);

	const updateHome = (delta: number) => {
		if (locked) return;
		const next = Math.max(0, Math.min(MAX_GOALS, home + delta));
		setHome(next);
		setIsDirty(true);
		setSaveState("idle");
	};
	const updateAway = (delta: number) => {
		if (locked) return;
		const next = Math.max(0, Math.min(MAX_GOALS, away + delta));
		setAway(next);
		setIsDirty(true);
		setSaveState("idle");
	};

	// Sprint "Llaves Eliminatorias con Penales" 2026: toggle del ganador
	// de penales. Click en el mismo botón lo deselecciona (comportamiento
	// idéntico al MatchCard legacy). Marca el slide como dirty.
	const togglePenalty = (side: "home" | "away") => {
		if (locked) return;
		setPenaltyWinner(penaltyWinner === side ? null : side);
		setIsDirty(true);
		setSaveState("idle");
	};

	// Detección de modo playoffs + empate para mostrar el selector de penales.
	// stageMultiplier > 1 → octavos/cuartos/semis/final/3er puesto.
	const isPlayoffs = match.stageMultiplier > 1;
	const isDraw = home === away;
	const showPenaltySelector = isPlayoffs && isDraw;
	// needsPenalty es true cuando el selector está visible y todavía no
	// se eligió ganador. Bloquea el botón Guardar con label ámbar.
	const needsPenalty = showPenaltySelector && penaltyWinner === null;

	const handleSave = async () => {
		if (locked || !isDirty) return;
		setSaveState("saving");
		try {
			// Sprint "Llaves Eliminatorias con Penales" 2026: enviar
			// `predictedWinner` SOLO cuando el selector de penales está
			// visible (playoffs + empate). En grupos o partidos con
			// resultado definido en 90 min, se envía null (el ganador
			// se deriva del score predicho).
			await saveMutation.mutateAsync({
				matchId: match.id,
				tournamentId: tournament.id,
				predictedHome: home,
				predictedAway: away,
				predictedWinner: showPenaltySelector ? penaltyWinner : null,
			});
			// Haptic feedback en mobile (API estándar, no requiere permiso)
			// Solo en modo editable: no tiene sentido haptic en consulta
			if (typeof navigator !== "undefined" && "vibrate" in navigator) {
				navigator.vibrate(50);
			}
			setSaveState("saved");
			setIsDirty(false);
			setTimeout(() => setSaveState("idle"), 2000);
		} catch {
			setSaveState("idle");
		}
	};

	const potential = getPotentialPoints(match.stageMultiplier);
	const finishedResult = prediction
		? getScoreResultForPrediction(prediction, match)
		: null;

	// Botón state
	const buttonLabel = (() => {
		if (viewMode !== "editable") return ""; // No se renderiza
		if (saveState === "saving") return "GUARDANDO...";
		if (saveState === "saved") return "✓ GUARDADO";
		// Sprint "Llaves Eliminatorias con Penales" 2026: si es playoff con
		// empate y todavía no eligió ganador de penales, mostrar CTA ámbar.
		if (needsPenalty) return "⚽ ELEGÍ GANADOR DE PENALES";
		if (isDirty) return "GUARDAR PRONÓSTICO";
		if (prediction) return "ACTUALIZADO ✓";
		return "GUARDAR PRONÓSTICO";
	})();

	const buttonClass = (() => {
		if (viewMode !== "editable") return ""; // No se renderiza
		if (saveState === "saved")
			return "bg-pitch-green/10 border border-pitch-green/30 text-pitch-green";
		if (needsPenalty)
			// Estado de "falta completar": estilo ámbar, no-redirecting.
			// El botón queda disabled hasta que elija un ganador.
			return "bg-amber-500/10 border border-amber-500/30 text-amber-400 cursor-default";
		if (isDirty)
			return "bg-error border border-error/30 text-white shadow-[0_0_15px_rgba(255,42,42,0.3)]";
		return "bg-primary/10 border border-primary/30 text-primary";
	})();

	// Card border según viewMode (S3 polish)
	const cardBorderClass = (() => {
		if (saveState === "saved") return "slide-saved-burst border-pitch-green/50";
		if (viewMode === "editable")
			return "border-primary/20 shadow-[0_0_20px_rgba(0,229,255,0.06)]";
		return "border-white/5";
	})();

	const cardBgClass =
		viewMode === "editable"
			? "bg-surface-container/50"
			: "bg-surface-container/30";

	return (
		<div
			className="w-full px-1"
			role="tabpanel"
			aria-label={`Predicción para ${tournament.name}`}
		>
			<div
				className={`${cardBgClass} border rounded-2xl p-4 space-y-4 transition-colors duration-300 ${cardBorderClass}`}
			>
				{/* Header del slide */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 min-w-0">
						<span className="material-symbols-outlined text-tertiary text-base">
							emoji_events
						</span>
						<span className="font-label-caps text-[11px] text-tertiary font-bold tracking-widest uppercase truncate">
							{tournament.name}
						</span>
					</div>
					{prediction && viewMode === "editable" && (
						<span className="text-[9px] text-pitch-green font-bold uppercase tracking-widest flex items-center gap-1.5">
							<svg
								viewBox="0 0 24 24"
								className={`w-3 h-3 ${saveState === "saved" ? "checkmark-saved" : ""}`}
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M5 12l5 5L20 7" />
							</svg>
							Guardado
						</span>
					)}
				</div>

				{/* === STEPPER o DISPLAY según viewMode === */}
				{viewMode === "editable" ? (
					<div className="flex items-center justify-center gap-3">
						<Stepper
							value={home}
							onIncrement={() => updateHome(1)}
							onDecrement={() => updateHome(-1)}
							disabled={locked}
							accentColor="primary"
						/>
						<span className="font-stat-value text-2xl text-on-surface-variant/40">
							-
						</span>
						<Stepper
							value={away}
							onIncrement={() => updateAway(1)}
							onDecrement={() => updateAway(-1)}
							disabled={locked}
							accentColor="primary"
						/>
					</div>
				) : (
					<div className="flex items-center justify-center gap-4 py-1">
						<span className="font-stat-value text-4xl font-bold text-white tabular-nums">
							{prediction?.predictedHome ?? 0}
						</span>
						<span className="font-stat-value text-2xl text-on-surface-variant/40">
							-
						</span>
						<span className="font-stat-value text-4xl font-bold text-white tabular-nums">
							{prediction?.predictedAway ?? 0}
						</span>
					</div>
				)}

				{/* === Sprint "Llaves Eliminatorias con Penales" 2026: Selector de penales === */}
				{/* Solo visible en modo editable + playoffs + empate. */}
				{/* Concentric check: slide p-4 (16) → PenaltyButton rounded-xl (12). */}
				{showPenaltySelector && viewMode === "editable" && (
					<div className="space-y-2 pt-2 border-t border-white/5 animate-fade-in">
						<p className="font-label-caps text-[9px] text-tertiary font-bold tracking-widest uppercase text-center text-glowing-gold flex items-center justify-center gap-1">
							<span
								className="material-symbols-outlined text-[11px]"
								style={{ fontVariationSettings: "'FILL' 1" }}
								aria-hidden="true"
							>
								military_tech
							</span>
							Desempate por Penales (Requerido)
						</p>
						<div className="flex gap-2">
							<PenaltyButton
								teamName={match.homeTeam}
								selected={penaltyWinner === "home"}
								disabled={locked}
								onClick={() => togglePenalty("home")}
							/>
							<PenaltyButton
								teamName={match.awayTeam}
								selected={penaltyWinner === "away"}
								disabled={locked}
								onClick={() => togglePenalty("away")}
							/>
						</div>
					</div>
				)}

				{/* Confirmación del ganador de penales (modo lectura / locked) */}
				{/* Muestra el ganador elegido tanto en consult como en results. */}
				{prediction?.predictedWinner && !showPenaltySelector && (
					<div className="flex items-center justify-center gap-1.5 pt-2 border-t border-white/5">
						<span
							className="material-symbols-outlined text-[12px] text-amber-400"
							style={{ fontVariationSettings: "'FILL' 1" }}
							aria-hidden="true"
						>
							military_tech
						</span>
						<span className="font-label-caps text-[9px] text-amber-400 font-bold uppercase tracking-widest">
							Ganador Penales:{" "}
							{prediction.predictedWinner === "home"
								? match.homeTeam
								: match.awayTeam}
						</span>
					</div>
				)}

				{/* === Puntos potenciales (edición) o ganados (results) === */}
				{match.status === "finished" && finishedResult ? (
					<div className="flex items-center justify-center gap-3 text-[10px] font-label-caps uppercase tracking-widest pt-1 border-t border-white/5">
						{finishedResult.breakdown.exactScore && (
							<span className="text-pitch-green font-bold">
								✓ Exacto +{potential.exact}
							</span>
						)}
						{finishedResult.breakdown.goalDifference && (
							<span className="text-pitch-green font-bold">
								✓ Dif +{potential.goalDiff}
							</span>
						)}
						{finishedResult.breakdown.correctWinner && (
							<span className="text-pitch-green font-bold">
								✓ Básico +{potential.basic}
							</span>
						)}
						{finishedResult.breakdown.penaltyBonus && (
							<span className="text-pitch-green font-bold">✓ Penales +4</span>
						)}
						{finishedResult.points === 0 && (
							<span className="text-on-surface-variant/50">Sin puntos</span>
						)}
						{finishedResult.points > 0 && (
							<span className="text-pitch-green font-bold ml-auto">
								= {finishedResult.points} pts
							</span>
						)}
					</div>
				) : match.status === "not_started" ? (
					<div className="flex items-center justify-center gap-3 text-[10px] font-label-caps uppercase tracking-widest pt-1 border-t border-white/5">
						<span className="text-on-surface-variant">
							Exacto{" "}
							<span className="text-pitch-green font-bold">
								+{potential.exact}
							</span>
						</span>
						<span className="text-on-surface-variant">
							Básico{" "}
							<span className="text-pitch-green font-bold">
								+{potential.basic}
							</span>
						</span>
						{match.stageMultiplier > 1 && (
							<span className="text-tertiary/80">
								(×{match.stageMultiplier})
							</span>
						)}
					</div>
				) : null}

				{/* === CTA según viewMode === */}
				{viewMode === "editable" ? (
					<button
						type="button"
						onClick={handleSave}
						disabled={!isDirty || saveState === "saving" || needsPenalty}
						className={`w-full py-2.5 rounded-xl font-label-caps text-[11px] font-bold uppercase tracking-widest transition-all ${buttonClass}`}
					>
						{buttonLabel}
					</button>
				) : viewMode === "results" &&
					finishedResult &&
					finishedResult.points > 0 ? (
					<div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-pitch-green/10 border border-pitch-green/30 animate-tab-enter">
						<span
							className="material-symbols-outlined text-pitch-green text-base"
							style={{ fontVariationSettings: "'FILL' 1" }}
						>
							emoji_events
						</span>
						<span className="font-stat-value text-base font-bold text-pitch-green tabular-nums">
							+{finishedResult.points} pts
						</span>
						<span className="font-label-caps text-[9px] text-pitch-green/80 uppercase tracking-widest">
							ganados
						</span>
					</div>
				) : (
					<div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface-container border border-white/5">
						<span className="material-symbols-outlined text-on-surface-variant/60 text-base">
							lock
						</span>
						<span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
							{prediction
								? "En juego · sin guardar"
								: "Cerrado · sin pronóstico"}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

/** Stepper atómico con botones +/- e input numérico */
function Stepper({
	value,
	onIncrement,
	onDecrement,
	disabled,
	accentColor,
}: {
	value: number;
	onIncrement: () => void;
	onDecrement: () => void;
	disabled?: boolean;
	accentColor: "primary" | "tertiary";
}) {
	const colorClass =
		accentColor === "primary"
			? "text-primary border-primary/30 hover:bg-primary/10"
			: "text-tertiary border-tertiary/30 hover:bg-tertiary/10";
	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={onDecrement}
				disabled={disabled}
				aria-label="Decrementar"
				className={`w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : colorClass}`}
			>
				<span className="material-symbols-outlined text-base">remove</span>
			</button>
			<input
				type="number"
				value={value}
				readOnly
				disabled={disabled}
				inputMode="numeric"
				aria-label="Cantidad"
				className="w-12 h-9 bg-background/60 border border-white/10 rounded-lg text-center font-stat-value text-xl font-bold tabular-nums text-white focus:outline-none focus:border-primary/50"
			/>
			<button
				type="button"
				onClick={onIncrement}
				disabled={disabled}
				aria-label="Incrementar"
				className={`w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : colorClass}`}
			>
				<span className="material-symbols-outlined text-base">add</span>
			</button>
		</div>
	);
}

/**
 * PenaltyButton — botón atómico para elegir ganador de penales.
 * Sprint "Llaves Eliminatorias con Penales" 2026.
 *
 * - Hit area ≥44px (min-h-[44px])
 * - Scale on press 0.96 (tactile feedback, nunca menos)
 * - Estado seleccionado: bg-primary/20 + border-primary + celestial-glow
 * - Estado idle: bg-surface-container-high/40 + border-white/5
 * - Specific transition (no `transition-all`): transition-colors + transform
 * - Rótulo "Gana {teamName}" — usa el nombre canónico de la API
 *   (la traducción a español se hace en otra capa si es necesario)
 */
function PenaltyButton({
	teamName,
	selected,
	disabled,
	onClick,
}: {
	teamName: string;
	selected: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	const selectedClass = selected
		? "bg-primary/20 border-primary text-primary celestial-glow"
		: "bg-surface-container-high/40 border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white";
	const disabledClass = disabled
		? "opacity-50 cursor-not-allowed"
		: "cursor-pointer";
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={`Gana ${teamName} por penales`}
			disabled={disabled}
			onClick={onClick}
			className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl border text-[10px] font-bold tracking-wider transition-colors active:scale-[0.96] transition-transform ${selectedClass} ${disabledClass}`}
		>
			{selected && (
				<span
					className="material-symbols-outlined text-[12px] mr-1 align-middle"
					style={{ fontVariationSettings: "'FILL' 1" }}
					aria-hidden="true"
				>
					check_circle
				</span>
			)}
			Gana {teamName}
		</button>
	);
}
