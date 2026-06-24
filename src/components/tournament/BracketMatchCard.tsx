/**
 * BracketMatchCard — Card de un partido del árbol de eliminatorias.
 *
 * ============================================================================
 * VARIANTES (3)
 * ============================================================================
 * - `compact`  → R32, R16 (16 y 8 partidos): denso, sin score grande
 * - `default`  → QF, SF (4 y 2 partidos): medio, score visible
 * - `hero`     → F, 3RD (1 partido): generoso, score grande, trofeo
 *
 * ============================================================================
 * ESTADOS VISUALES
 * ============================================================================
 * - TBD        → slots vacíos con stripes diagonales, "Por definir"
 * - Resolved   → ambos slots con equipo, sin score (o score parcial en live)
 * - Live       → badge EN VIVO pulsante en uno o ambos slots
 * - Finished   → score final, ganador con check verde
 * - Penalties  → badge "PENALES" pequeño cuando decidedByPenalties
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - <button> clickeable con aria-label descriptivo
 * - Contraste WCAG AA (texto blanco sobre fondos oscuros)
 * - Touch target ≥ 40×40px (regla make-interfaces-feel-better)
 * - Tabular nums para scores (evita layout shift)
 *
 * ============================================================================
 * INTERACCIÓN
 * ============================================================================
 * - onClick → onOpenDetails(matchId) si está provisto
 * - onClick es no-op si onOpenDetails no está definido
 * - hover → sutil highlight de border
 * - active:scale-[0.96] para feedback táctil (regla make-interfaces-feel-better)
 */

import React from "react";
import type { ExtendedBracketMatch } from "../../lib/bracketTypes";
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
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construye el aria-label descriptivo para el card.
 * Ejemplos:
 *  - "16vos 1: Argentina vs Francia"
 *  - "Final: Argentina 3 - 1 Francia"
 *  - "16vos 1: Por definir"
 */
function buildAriaLabel(
	match: ExtendedBracketMatch,
	roundLabel: string,
): string {
	const a = match.slotA.teamName ?? "Por definir";
	const b = match.slotB.teamName ?? "Por definir";
	if (match.score) {
		return `${roundLabel} ${match.position}: ${a} ${match.score.home} - ${match.score.away} ${b}`;
	}
	return `${roundLabel} ${match.position}: ${a} vs ${b}`;
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
	// Mapeo: abreviatura → nombre legible de la ronda
	const ROUND_LABELS: Record<string, string> = {
		R32: "16vos",
		R16: "8vos",
		QF: "4tos",
		SF: "Semis",
		F: "Final",
		"3RD": "3er Puesto",
	};
	const label = ROUND_LABELS[abbr] ?? abbr;
	// SF es el origen del 3RD (perdedores), no ganador
	const prefix = abbr === "SF" ? "Perdedor de" : "Ganador de";
	return `${prefix} ${label} ${pos}`;
}

/**
 * Sizing map por variante.
 * Cada variante define sus propias clases de padding, font-size, etc.
 * Mantener este objeto como single-source-of-truth para consistencia visual.
 */
const VARIANT_STYLES = {
	compact: {
		card: "p-2 gap-1.5",
		headerText: "text-[9px]",
		teamText: "text-[11px]",
		scoreText: "text-sm",
		logoSize: "w-4 h-4",
		padding: "px-2 py-1.5",
		minHeight: "min-h-[64px]",
	},
	default: {
		card: "p-3 gap-2",
		headerText: "text-[10px]",
		teamText: "text-xs",
		scoreText: "text-base",
		logoSize: "w-5 h-5",
		padding: "px-2.5 py-2",
		minHeight: "min-h-[88px]",
	},
	hero: {
		card: "p-4 gap-3",
		headerText: "text-xs",
		teamText: "text-sm",
		scoreText: "text-2xl",
		logoSize: "w-7 h-7",
		padding: "px-3 py-3",
		minHeight: "min-h-[120px]",
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
	/** Label personalizado para slots TBD. Default: "Por definir" */
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
			<div
				className={`
					flex items-center gap-2 ${styles.padding} rounded-lg
					bg-surface-container-lowest/30 border border-dashed border-white/10
				`.trim()}
			>
				<span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">
					help
				</span>
				<span
					className={`${styles.teamText} text-on-surface-variant/40 italic font-medium truncate`}
				>
					{tbdLabel ?? "Por definir"}
				</span>
			</div>
		);
	}

	// Estado: slot resuelto
	const slotClass = isWinner
		? "bg-pitch-green/10 border-pitch-green/40"
		: "bg-surface-container-lowest/60 border-white/5";

	return (
		<div
			className={`
				flex items-center gap-2 ${styles.padding} rounded-lg border
				${slotClass}
				transition-colors duration-200
			`.trim()}
		>
			{/* Logo del equipo */}
			{teamLogo ? (
				<img
					src={teamLogo}
					alt=""
					className={`${styles.logoSize} object-contain flex-shrink-0`}
					loading="lazy"
				/>
			) : (
				<span
					className={`${styles.logoSize} flex items-center justify-center text-on-surface-variant/50 flex-shrink-0 material-symbols-outlined`}
					style={{ fontSize: variant === "hero" ? "20px" : "16px" }}
				>
					flag
				</span>
			)}

			{/* Nombre del equipo */}
			<span
				className={`
					${styles.teamText} font-bold truncate flex-1
					${isWinner ? "text-white" : "text-white/90"}
				`.trim()}
			>
				{teamName}
			</span>

			{/* Score (si está populated) */}
			{score !== null && (
				<span
					className={`
						${styles.scoreText} font-black tabular-nums flex-shrink-0
						${isWinner ? "text-pitch-green" : "text-white/80"}
					`.trim()}
				>
					{score}
				</span>
			)}

			{/* Live badge compact si está en vivo */}
			{isLive && <LiveBadge variant="compact" />}

			{/* Check de ganador */}
			{isWinner && !isLive && (
				<span
					role="img"
					aria-label="Ganador"
					className="material-symbols-outlined text-pitch-green flex-shrink-0"
					style={{ fontSize: variant === "hero" ? "20px" : "16px" }}
				>
					check_circle
				</span>
			)}

			{/* Badge de penales */}
			{showPenalties && (
				<span
					role="img"
					aria-label="Definido por penales"
					className={`
						inline-flex items-center px-1.5 py-0.5 rounded
						bg-tertiary/15 border border-tertiary/40 text-tertiary
						font-label-caps text-[8px] font-black tracking-widest uppercase
					`.trim()}
				>
					PK
				</span>
			)}
		</div>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Render: extrae la ronda del bracketPosition prefix (R32, R16, QF, SF, F, 3RD)
 */
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

export function BracketMatchCard({
	match,
	variant,
	onOpenDetails,
}: BracketMatchCardProps) {
	const styles = VARIANT_STYLES[variant];
	const isInteractive = !!onOpenDetails && !!match.dbMatchId;
	const isLiveMatch = match.slotA.isLive || match.slotB.isLive;
	const hasScore = match.score !== null;
	const winnerName = match.winner;
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

	const cardClass = `
		relative w-full ${styles.minHeight}
		bg-surface-container-low/40 border border-white/10
		rounded-xl ${styles.card}
		flex flex-col
		${isInteractive ? "cursor-pointer hover:border-white/25 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-[transform,border-color] duration-150" : ""}
		${isLiveMatch ? "ring-1 ring-error/30" : ""}
		${hasScore ? "bg-surface-container-low/60" : ""}
	`.trim();

	const content = (
		<>
			{/* Header: R32 · 1 + status badge */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span
						className={`${styles.headerText} font-label-caps uppercase tracking-widest font-bold text-on-surface-variant`}
					>
						{isHero ? "🏆 " : ""}
						{roundLabel} · {match.position}
					</span>
					{isLiveMatch && <LiveBadge variant="default" />}
					{!hasScore && !isLiveMatch && (
						<span
							role="img"
							aria-label="Pendiente"
							className={`${styles.headerText} font-label-caps uppercase tracking-widest text-on-surface-variant/50`}
						>
							· Pendiente
						</span>
					)}
					{hasScore && !isLiveMatch && (
						<span
							role="img"
							aria-label="Finalizado"
							className={`${styles.headerText} font-label-caps uppercase tracking-widest text-pitch-green/70 font-bold`}
						>
							· Final
						</span>
					)}
				</div>
				{/* Multiplier badge */}
				{isHero && (
					<span
						role="img"
						aria-label={`Multiplicador ×${match.stageMultiplier}`}
						className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-tertiary/20 border border-tertiary/40 text-tertiary font-label-caps text-[9px] font-black tracking-widest"
					>
						×{match.stageMultiplier}
					</span>
				)}
			</div>

			{/* Slot A */}
			<Slot
				teamName={match.slotA.teamName}
				teamLogo={match.slotA.teamLogo}
				isLive={match.slotA.isLive}
				isWinner={winnerName !== null && winnerName === match.slotA.teamName}
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

			{/* VS separator */}
			<div className="flex items-center justify-center -my-1">
				<span
					className={`${styles.headerText} font-stat-value uppercase tracking-widest font-black text-on-surface-variant/30`}
				>
					vs
				</span>
			</div>

			{/* Slot B */}
			<Slot
				teamName={match.slotB.teamName}
				teamLogo={match.slotB.teamLogo}
				isLive={match.slotB.isLive}
				isWinner={winnerName !== null && winnerName === match.slotB.teamName}
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
		</>
	);

	if (isInteractive) {
		return (
			<button
				type="button"
				onClick={handleClick}
				aria-label={ariaLabel}
				className={`${cardClass} text-left`}
			>
				{content}
			</button>
		);
	}

	return (
		<article aria-label={ariaLabel} className={cardClass}>
			{content}
		</article>
	);
}

// React.memo: evita re-renders innecesarios cuando el padre (BracketTree)
// se actualiza por live updates, pero las props de este card no cambiaron.
// Comparador shallow: si match.id, dbMatchId, score y winner no cambiaron,
// no re-renderiza. Esto reduce ~32 re-renders a solo los cards afectados
// en cada live update. (Fix QA #2 — Performance ALTO)
//
// Sprint 5D: agregamos `sourceMatchId` al comparador para que cuando un
// slot TBD se resuelva (cambia el `sourceMatchId` o el `teamName`), el
// card re-renderice con el label correcto ("Ganador de 16vos 1" vs
// "Por definir" vs nombre del equipo).
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
