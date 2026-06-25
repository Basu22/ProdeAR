/**
 * BracketMatchCard — Card de un partido del árbol de eliminatorias.
 *
 * ============================================================================
 * SPRINT 5D — REDISEÑO
 * ============================================================================
 * Layout 2 columnas SIN header ni multiplier (estos se muestran en el
 * header de la ronda arriba, no en cada card):
 *
 * ```
 * ┌──────────────────┬───────────────────┐
 * │ 🇦🇷 Argentina  2 │ 🏟 Estadio Azteca │
 * │ 🇫🇷 Francia    1 │ 📅 15/07  16:00   │
 * └──────────────────┴───────────────────┘
 *    ↑ 60% resultado   ↑ 40% logística
 * ```
 *
 * Columna izquierda: 2 slots apilados (equipo A + equipo B con score).
 * Columna derecha: estadio arriba, fecha+hora abajo (subcomponente
 * `MatchLogistics` con border-l sutil para separar).
 *
 * Estado TBD: dashed border en card completo + "Por confirmar" en logistica.
 *
 * ============================================================================
 * VARIANTES (3)
 * ============================================================================
 * - `compact`  → R32, R16 (16 y 8 partidos): denso, fuente 11px
 * - `default`  → QF, SF (4 y 2 partidos): medio, fuente 13px
 * - `hero`     → F, 3RD (1 partido): generoso, fuente 14-18px
 *
 * ============================================================================
 * ESTADOS VISUALES
 * ============================================================================
 * - TBD        → slots con "Por definir"/"Ganador de X N", dashed border
 * - Resolved   → ambos slots con equipo + score
 * - Live       → badge EN VIVO pulsante en uno o ambos slots
 * - Finished   → score final, ganador con nombre bold + score verde
 * - Penalties  → badge "PK" pequeño cuando decidedByPenalties
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - <button> clickeable con aria-label descriptivo (incluye estadio + fecha)
 * - Contraste WCAG AA (texto blanco sobre fondos oscuros)
 * - Touch target ≥ 72px en compact (regla make-interfaces-feel-better)
 * - Tabular nums para scores (evita layout shift)
 * - prefers-reduced-motion desactiva transiciones
 *
 * ============================================================================
 * INTERACCIÓN
 * ============================================================================
 * - onClick → onOpenDetails(matchId) si está provisto
 * - onClick es no-op si onOpenDetails no está definido
 * - hover → sutil highlight de border
 * - active:scale-[0.96] para feedback táctil
 */

import React from "react";
import {
	formatKickoffDate,
	formatKickoffTime,
	type ExtendedBracketMatch,
} from "../../lib/bracketTypes";
import { LiveBadge } from "./LiveBadge";

// ============================================================================
// PROPS
// ============================================================================

interface BracketMatchCardProps {
	match: ExtendedBracketMatch;
	/** Variante visual según la ronda */
	variant: "compact" | "default" | "hero";
	/** Callback al hacer click (abre MatchSheet con pronóstico) */
	onOpenDetails?: (matchId: string) => void;
	/**
	 * Sprint 5D+: posición de la card en su ronda (1-16 para R32, 1-8 para R16, etc.).
	 * Se usa como `data-card-position={n}` para que CSS y JS ubiquen la card
	 * en el árbol de eliminatorias (margin-top proporcional según ronda).
	 */
	bracketPosition?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construye el aria-label descriptivo para el card.
 * Ejemplos:
 *  - "16vos 1: Argentina vs Francia. Estadio Azteca, 15/07 a las 16:00."
 *  - "Final: Argentina 3 - 1 Francia. Lusail Stadium, 19/12 a las 17:00."
 *  - "16vos 1: Por definir. Estadio por confirmar, fecha por confirmar."
 */
function buildAriaLabel(
	match: ExtendedBracketMatch,
	roundLabel: string,
): string {
	const a = match.slotA.teamName ?? "Por definir";
	const b = match.slotB.teamName ?? "Por definir";
	const stadium = match.stadium ?? "estadio por confirmar";
	const date = formatKickoffDate(match.kickOff) ?? "fecha por confirmar";
	const time = formatKickoffTime(match.kickOff) ?? "hora por confirmar";

	if (match.score) {
		return `${roundLabel} ${match.position}: ${a} ${match.score.home} - ${match.score.away} ${b}. ${stadium}, ${date} a las ${time}.`;
	}
	return `${roundLabel} ${match.position}: ${a} vs ${b}. ${stadium}, ${date} a las ${time}.`;
}

/**
 * Construye el label para un slot TBD a partir de su `sourceMatchId`.
 * Convierte IDs como "R32-1", "R16-3", "SF-1" en labels legibles
 * como "Ganador de 16vos 1", "Ganador de 8vos 3", "Perdedor de Semis 1".
 *
 * - `R32-N` → "Ganador de 16vos N" (slots de R16 dependen de ganadores R32)
 * - `R16-N` → "Ganador de 8vos N"  (slots de QF dependen de ganadores R16)
 * - `QF-N`  → "Ganador de 4tos N"  (slots de SF dependen de ganadores QF)
 * - `SF-N`  → "Perdedor de Semis N" (slots de 3RD dependen de perdedores SF)
 *
 * Si el `sourceMatchId` no matchea el patrón esperado, retorna
 * `"Por definir"` como fallback.
 */
function buildTbdLabel(sourceMatchId: string | null): string {
	if (!sourceMatchId) return "Por definir";
	const m = sourceMatchId.match(/^([A-Z0-9]+)-(\d+)$/);
	if (!m) return "Por definir";
	const [, abbr, pos] = m;
	const ROUND_LABELS: Record<string, string> = {
		R32: "16vos",
		R16: "8vos",
		QF: "4tos",
		SF: "Semis",
		F: "Final",
		"3RD": "3er Puesto",
	};
	const label = ROUND_LABELS[abbr] ?? abbr;
	const prefix = abbr === "SF" ? "Perdedor de" : "Ganador de";
	return `${prefix} ${label} ${pos}`;
}

/**
 * Sizing map por variante.
 * Sprint 5D: las fonts son un poco más grandes porque ahora no compiten
 * con el header. Los slots no tienen border ni background (clean).
 */
const VARIANT_STYLES = {
	compact: {
		teamText: "text-[11px]",
		scoreText: "text-sm",
		logisticsText: "text-[10px]",
		logisticsDateText: "text-[9px]",
		logoSize: "w-3.5 h-3.5",
		iconSize: "text-[11px]",
		minHeight: "min-h-[64px]",
	},
	default: {
		teamText: "text-xs",
		scoreText: "text-[15px]",
		logisticsText: "text-[11px]",
		logisticsDateText: "text-[10px]",
		logoSize: "w-4 h-4",
		iconSize: "text-[12px]",
		minHeight: "min-h-[72px]",
	},
	hero: {
		teamText: "text-sm",
		scoreText: "text-lg",
		logisticsText: "text-xs",
		logisticsDateText: "text-[10px]",
		logoSize: "w-5 h-5",
		iconSize: "text-[13px]",
		minHeight: "min-h-[88px]",
	},
} as const;

// ============================================================================
// SLOT RENDERER
// ============================================================================

interface SlotProps {
	teamName: string | null;
	teamLogo: string | null;
	isLive: boolean;
	isWinner: boolean;
	score: number | null;
	variant: "compact" | "default" | "hero";
	showPenalties: boolean;
	/** Label personalizado para slots TBD. */
	tbdLabel?: string;
}

function Slot({
	teamName,
	teamLogo,
	isLive,
	isWinner,
	score,
	variant,
	showPenalties,
	tbdLabel,
}: SlotProps) {
	const styles = VARIANT_STYLES[variant];

	// Estado: TBD (slot vacío)
	if (!teamName) {
		return (
			<div className="flex items-center gap-1.5 min-w-0 text-white/40 italic">
				<span
					className="material-symbols-outlined text-[10px] text-white/30 flex-shrink-0"
					aria-hidden="true"
				>
					help
				</span>
				<span
					className={`${styles.teamText} font-medium truncate flex-1`}
				>
					{tbdLabel ?? "Por definir"}
				</span>
			</div>
		);
	}

	// Estado: slot resuelto — nombre + score, sin border ni background
	return (
		<div className="flex items-center gap-1.5 min-w-0">
			{/* Logo pequeño (opcional) */}
			{teamLogo ? (
				<img
					src={teamLogo}
					alt=""
					className={`${styles.logoSize} object-contain flex-shrink-0 rounded-full`}
					loading="lazy"
				/>
			) : null}

			{/* Nombre del equipo */}
			<span
				className={`
					${styles.teamText} font-bold truncate flex-1
					${isWinner ? "text-white" : "text-white/85"}
				`.trim()}
			>
				{teamName}
			</span>

			{/* Score (tabular nums) */}
			{score !== null && (
				<span
					className={`
						${styles.scoreText} font-black tabular-nums flex-shrink-0
						${isWinner ? "text-pitch-green" : isLive ? "text-white" : "text-white/75"}
					`.trim()}
				>
					{score}
				</span>
			)}

			{/* Live badge */}
			{isLive && <LiveBadge variant="compact" />}

			{/* Penales badge */}
			{showPenalties && (
				<span
					role="img"
					aria-label="Definido por penales"
					className="
						inline-flex items-center px-1 py-0.5 rounded
						bg-tertiary/15 border border-tertiary/40 text-tertiary
						font-label-caps text-[8px] font-black tracking-widest uppercase
						flex-shrink-0
					"
				>
					PK
				</span>
			)}
		</div>
	);
}

// ============================================================================
// MATCH LOGISTICS (columna derecha: estadio + fecha/hora)
// ============================================================================

interface MatchLogisticsProps {
	stadium: string | null;
	kickOff: string | null;
	variant: "compact" | "default" | "hero";
}

function MatchLogistics({ stadium, kickOff, variant }: MatchLogisticsProps) {
	const styles = VARIANT_STYLES[variant];
	const stadiumText = stadium ?? "Por confirmar";
	const dateText = formatKickoffDate(kickOff) ?? "—";
	const timeText = formatKickoffTime(kickOff) ?? "—";

	return (
		<div
			className="
				flex flex-col justify-center gap-0.5
				pl-2.5 ml-0.5
				border-l border-white/10
				text-right
				min-w-0
			"
		>
			{/* Estadio (sin icono, solo texto) */}
			<span
				className={`
					${styles.logisticsText} font-medium text-white/85 truncate
				`.trim()}
				title={stadiumText}
			>
				{stadiumText}
			</span>

			{/* Fecha + hora (sin icono, solo texto) */}
			<span
				className={`
					${styles.logisticsDateText} font-bold uppercase tracking-wider
					text-on-surface-variant tabular-nums whitespace-pre
				`.trim()}
			>
				{dateText}  {timeText}
			</span>
		</div>
	);
}

// ============================================================================
// ROUND LABEL (para aria-label y getRoundPrefix)
// ============================================================================

function getRoundPrefix(bracketPosition: string): string {
	const match = bracketPosition.match(/^(R32|R16|QF|SF|F|3RD)/);
	return match?.[1] ?? "";
}

function getRoundLabel(bracketPosition: string): string {
	const map: Record<string, string> = {
		R32: "16vos",
		R16: "8vos",
		QF: "4tos",
		SF: "Semifinal",
		F: "Final",
		"3RD": "Tercer Puesto",
	};
	const prefix = getRoundPrefix(bracketPosition);
	return map[prefix] ?? "Ronda";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketMatchCard({
	match,
	variant,
	onOpenDetails,
	bracketPosition,
}: BracketMatchCardProps) {
	const styles = VARIANT_STYLES[variant];
	const isInteractive = !!onOpenDetails && !!match.dbMatchId;
	const isLiveMatch = match.slotA.isLive || match.slotB.isLive;
	const hasScore = match.score !== null;
	const winnerName = match.winner;
	const isTbd = !match.slotA.teamName || !match.slotB.teamName;
	const isHero = variant === "hero";

	const handleClick = () => {
		if (onOpenDetails && match.dbMatchId) {
			onOpenDetails(match.dbMatchId);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	const roundLabel = getRoundLabel(match.bracketPosition);
	const ariaLabel = buildAriaLabel(match, roundLabel);

	// ── Card container: layout 2 columnas (slots | logística) ──
	// TBD: dashed border en card completo. Live: ring error/30.
	// Sprint 5D+: data-card-position para CSS targeting del árbol.
	const cardClass = `
		relative w-full ${styles.minHeight}
		${isTbd
			? "bg-surface-container-lowest/30 border border-dashed border-white/15"
			: "bg-surface-container-low/40 border border-white/10"}
		rounded-xl p-2.5
		flex items-stretch gap-2
		${isInteractive ? "cursor-pointer hover:border-white/25 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-[transform,border-color] duration-150" : ""}
		${isLiveMatch ? "ring-1 ring-error/30" : ""}
		${hasScore ? "bg-surface-container-low/60" : ""}
	`.trim();

	const content = (
		<>
			{/* ── Columna izquierda: 2 slots apilados (60%) ── */}
			<div className="flex flex-col justify-center gap-0.5 flex-[3] min-w-0">
				<Slot
					teamName={match.slotA.teamName}
					teamLogo={match.slotA.teamLogo}
					isLive={match.slotA.isLive}
					isWinner={
						winnerName !== null && winnerName === match.slotA.teamName
					}
					score={hasScore && match.score ? match.score.home : null}
					variant={variant}
					tbdLabel={buildTbdLabel(match.slotA.sourceMatchId)}
					showPenalties={
						match.decidedByPenalties &&
						hasScore &&
						match.score?.home === match.score?.away &&
						winnerName === match.slotA.teamName
					}
				/>
				<Slot
					teamName={match.slotB.teamName}
					teamLogo={match.slotB.teamLogo}
					isLive={match.slotB.isLive}
					isWinner={
						winnerName !== null && winnerName === match.slotB.teamName
					}
					score={hasScore && match.score ? match.score.away : null}
					variant={variant}
					tbdLabel={buildTbdLabel(match.slotB.sourceMatchId)}
					showPenalties={
						match.decidedByPenalties &&
						hasScore &&
						match.score?.home === match.score?.away &&
						winnerName === match.slotB.teamName
					}
				/>
			</div>

			{/* ── Columna derecha: logística (40%) ── */}
			<div className="flex-[2] min-w-0 flex items-stretch">
				<MatchLogistics
					stadium={match.stadium}
					kickOff={match.kickOff}
					variant={variant}
				/>
			</div>

			{/* ── Badge Campeón (solo en hero, sobre todo el card) ── */}
			{isHero && winnerName && !isLiveMatch && (
				<div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pitch-green/15 border border-pitch-green/40">
					<span
						className="material-symbols-outlined text-pitch-green"
						style={{ fontSize: "11px" }}
						aria-hidden="true"
					>
						emoji_events
					</span>
					<span className="font-label-caps text-[8px] font-black tracking-widest uppercase text-pitch-green">
						Campeón
					</span>
				</div>
			)}
		</>
	);

	if (isInteractive) {
		return (
			<button
				type="button"
				onClick={handleClick}
				aria-label={ariaLabel}
				data-card-position={bracketPosition}
				className={`${cardClass} text-left`}
			>
				{content}
			</button>
		);
	}

	return (
		<article
			aria-label={ariaLabel}
			data-card-position={bracketPosition}
			className={cardClass}
		>
			{content}
		</article>
	);
}

// React.memo: evita re-renders innecesarios cuando el padre (BracketTree)
// se actualiza por live updates, pero las props de este card no cambiaron.
// Comparador shallow: si match.id, dbMatchId, score, winner, stadium, kickOff
// y sourceMatchId no cambiaron, no re-renderiza. Esto reduce ~32 re-renders
// a solo los cards afectados en cada live update. (Fix QA #2 — Performance)
//
// Sprint 5D: agregamos stadium y kickOff al comparador para que cambios
// en logística (ej. el organizador cambia el estadio) disparen re-render.
export const MemoizedBracketMatchCard = React.memo(
	BracketMatchCard,
	(prevProps, nextProps) => {
		const prev = prevProps.match;
		const next = nextProps.match;
		return (
			prev.id === next.id &&
			prev.dbMatchId === next.dbMatchId &&
			prev.winner === next.winner &&
			prev.score?.home === next.score?.home &&
			prev.score?.away === next.score?.away &&
			prev.decidedByPenalties === next.decidedByPenalties &&
			prev.stadium === next.stadium &&
			prev.kickOff === next.kickOff &&
			prev.slotA.teamName === next.slotA.teamName &&
			prev.slotA.teamLogo === next.slotA.teamLogo &&
			prev.slotA.isLive === next.slotA.isLive &&
			prev.slotA.sourceMatchId === next.slotA.sourceMatchId &&
			prev.slotB.teamName === next.slotB.teamName &&
			prev.slotB.teamLogo === next.slotB.teamLogo &&
			prev.slotB.isLive === next.slotB.isLive &&
			prev.slotB.sourceMatchId === next.slotB.sourceMatchId &&
			prevProps.variant === nextProps.variant &&
			prevProps.onOpenDetails === nextProps.onOpenDetails
		);
	},
);
