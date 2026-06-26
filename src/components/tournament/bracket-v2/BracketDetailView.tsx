/**
 * `BracketDetailView` — Vista Detalle del Bracket V2.
 *
 * ============================================================================
 * PROPÓSITO (Capa 4)
 * ============================================================================
 * Renderiza UNA sola ronda del bracket en full-width con cards grandes.
 * El usuario puede navegar entre rondas con:
 * - Swipe horizontal (touch, threshold 60px + ratio 1.5× para evitar
 *   conflicto con scroll vertical de la página).
 * - Botones prev/next en el `DetailHeader` (siempre 44×44px).
 * - Arrow keys en teclado (←/→ entre rondas, Esc para volver a Global).
 *
 * El scroll vertical de la página funciona NORMAL (la Vista Detalle NO
 * intercepta scroll vertical). Solo el swipe horizontal activa cambio de
 * ronda, y solo cuando el gesto es predominantemente horizontal.
 *
 * ============================================================================
 * HEADER STICKY
 * ============================================================================
 * - `← Volver al bracket` (z-30) → vuelve a Vista Global
 * - Centro: nombre de ronda + multiplier ×N + counter X/Y
 * - Derecha: botones prev/next con `aria-disabled` en los extremos
 *
 * ============================================================================
 * ANIMACIÓN DE CAMBIO DE RONDA
 * ============================================================================
 * - Slide horizontal sutil (translateX ±20px + fade 0.15s) al swipe/keyboard.
 * - `prefers-reduced-motion: reduce` desactiva la animación (cambio instantáneo).
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `<section aria-roledescription="vista de ronda">` con `aria-label` descriptivo.
 * - Botones prev/next con `aria-disabled` y labels dinámicos.
 * - `role="status" aria-live="polite"` anuncia cambio de ronda.
 * - Tap targets ≥ 44×44px en todos los controles.
 * - Keyboard nav completo: ←/→ entre rondas, Esc vuelve a Global.
 * - Touch targets extendidos con swipe gestures (no es solo para sighted).
 *
 * @module components/tournament/bracket-v2/BracketDetailView
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FullBracket, KnockoutRound } from "../../../lib/bracketTypes";
import { ROUND_CATALOG } from "../../../lib/bracketTypes";
import type { RoundAbbreviation } from "../../../lib/roundNames";
import { getRoundNavigatorState } from "../../../lib/bracketNavigation";
import { BracketRound } from "../BracketRound";
import { BracketMatchCard } from "../BracketMatchCard";
import { RoundChipBar } from "../RoundChipBar";
import { DetailHeader } from "./DetailHeader";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

// ============================================================================
// TYPES
// ============================================================================

interface BracketDetailViewProps {
	bracket: FullBracket;
	activeRound: RoundAbbreviation;
	onActiveRoundChange: (round: RoundAbbreviation) => void;
	onOpenTree: () => void;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Threshold mínimo en px para considerar un swipe como cambio de ronda. */
const SWIPE_THRESHOLD_PX = 60;
/** Ratio mínimo horizontal/vertical para que el swipe cuente como horizontal. */
const SWIPE_DOMINANCE_RATIO = 1.5;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Vista Detalle: una ronda en full-width con cards grandes + swipe gestures.
 */
export function BracketDetailView({
	bracket,
	activeRound,
	onActiveRoundChange,
	onOpenTree,
	onOpenDetails,
	interactive = true,
}: BracketDetailViewProps) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const [direction, setDirection] = useState<"left" | "right" | null>(null);
	const touchStart = useRef<{ x: number; y: number } | null>(null);

	const navState = getRoundNavigatorState(activeRound);

	// ── Resolver datos de la ronda actual ──
	const currentRoundData: KnockoutRound | null =
		activeRound === "3RD"
			? null
			: (bracket.rounds.find((r) => r.meta.abbr === activeRound) ?? null);

	const isThirdPlace = activeRound === "3RD";
	const currentMeta = isThirdPlace
		? ROUND_CATALOG["3RD"]
		: currentRoundData?.meta ?? null;

	// ── Detectar rondas con partidos en vivo (para el chip bar) ──
	const liveRounds = new Set<RoundAbbreviation>();
	for (const r of bracket.rounds) {
		if (r.matches.some((m) => m.slotA.isLive || m.slotB.isLive)) {
			liveRounds.add(r.meta.abbr);
		}
	}
	if (
		bracket.thirdPlaceMatch.slotA.isLive ||
		bracket.thirdPlaceMatch.slotB.isLive
	) {
		liveRounds.add("3RD");
	}

	// ── Handlers de cambio de ronda ──
	const goTo = useCallback(
		(target: RoundAbbreviation | null, dir: "left" | "right") => {
			if (!target) return;
			setDirection(dir);
			onActiveRoundChange(target);
		},
		[onActiveRoundChange],
	);

	// ── Touch handlers para swipe horizontal ──
	const onTouchStart = (e: React.TouchEvent) => {
		const touch = e.touches[0];
		if (!touch) return;
		touchStart.current = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchEnd = (e: React.TouchEvent) => {
		const start = touchStart.current;
		touchStart.current = null;
		if (!start) return;
		const touch = e.changedTouches[0];
		if (!touch) return;
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;
		// Solo swipe horizontal dominante
		if (
			Math.abs(dx) > SWIPE_THRESHOLD_PX &&
			Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE_RATIO
		) {
			if (dx < 0 && navState.right.target) {
				goTo(navState.right.target, "left");
			} else if (dx > 0 && navState.left.target) {
				goTo(navState.left.target, "right");
			}
		}
	};

	// ── Keyboard nav: ←/→ entre rondas, Esc vuelve a Global ──
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable)
			)
				return;
			if (e.key === "ArrowLeft" && navState.left.target) {
				e.preventDefault();
				goTo(navState.left.target, "right");
			} else if (e.key === "ArrowRight" && navState.right.target) {
				e.preventDefault();
				goTo(navState.right.target, "left");
			} else if (e.key === "Escape") {
				// En Vista Detalle directo (default), Esc abre la Vista Global
				// (paralelo al botón "🌳" del DetailHeader).
				e.preventDefault();
				onOpenTree();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [navState, goTo, onOpenTree]);

	// ── Reset direction después de animación ──
	useEffect(() => {
		if (!direction) return;
		const t = setTimeout(() => setDirection(null), 280);
		return () => clearTimeout(t);
	}, [direction]);

	// ── Render ──
	if (!currentMeta) {
		return (
			<section
				aria-label="Ronda no encontrada"
				className="p-4 text-center text-on-surface-variant"
			>
				<p className="text-sm">Ronda no disponible.</p>
				<button
					type="button"
					onClick={onOpenTree}
					className="mt-2 px-3 py-1 rounded-full bg-primary text-on-primary text-xs"
				>
					🌳 Ver árbol
				</button>
			</section>
		);
	}

	const transitionClass = prefersReducedMotion
		? ""
		: direction === "left"
			? "animate-detail-slide-in-left"
			: direction === "right"
				? "animate-detail-slide-in-right"
				: "";

	const completedCount = isThirdPlace
		? bracket.thirdPlaceMatch.score
			? 1
			: 0
		: (currentRoundData?.completedCount ?? 0);
	const totalMatches = isThirdPlace
		? 1
		: (currentRoundData?.matches.length ?? 0);

	return (
		<section
			aria-label={`Detalle de ronda: ${currentMeta.label}`}
			aria-roledescription="vista de ronda"
			className="max-w-3xl mx-auto"
		>
			{/* Chip bar de navegación (deep-link entre rondas) — nav principal */}
			<RoundChipBar
				activeRound={activeRound}
				onChipClick={onActiveRoundChange}
				liveRounds={liveRounds}
			/>
			<DetailHeader
				round={currentMeta}
				completedCount={completedCount}
				totalMatches={totalMatches}
				navState={navState}
				onOpenTree={onOpenTree}
				onPrev={() => goTo(navState.left.target, "right")}
				onNext={() => goTo(navState.right.target, "left")}
			/>

			{/* Contenido scrolleable vertical normal de la página */}
			<div
				className="px-4 pb-24 pt-2"
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				{/* Live region inline para anunciar el cambio de ronda */}
				<div key={activeRound} className={transitionClass}>
					{isThirdPlace ? (
						<div className="max-w-md mx-auto">
							<ThirdPlaceHeader />
							<BracketMatchCard
								match={bracket.thirdPlaceMatch}
								variant="hero"
								onOpenDetails={interactive ? onOpenDetails : undefined}
							/>
						</div>
					) : (
						currentRoundData && (
							<BracketRound
								round={currentRoundData}
								cardVariant="default"
								onOpenDetails={onOpenDetails}
							/>
						)
					)}
				</div>
			</div>

			{/* Live region para screen readers */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				Vista: {currentMeta.label}
			</div>
		</section>
	);
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Header visual para el partido de 3er Puesto en Vista Detalle.
 * Diferencia visual: ícono military_tech + chip "3er Puesto" + dashed separator.
 */
function ThirdPlaceHeader() {
	return (
		<div
			role="separator"
			aria-label="Sección tercer puesto"
			className="flex items-center gap-2 mb-3"
		>
			<div
				aria-hidden="true"
				className="flex-1 border-t border-dashed border-tertiary/30"
			/>
			<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/30">
				<span
					className="material-symbols-outlined text-tertiary"
					style={{ fontSize: "12px" }}
					aria-hidden="true"
				>
					military_tech
				</span>
				<span className="font-label-caps text-[9px] text-tertiary tracking-widest uppercase font-bold">
					3er Puesto
				</span>
			</span>
			<div
				aria-hidden="true"
				className="flex-1 border-t border-dashed border-tertiary/30"
			/>
		</div>
	);
}
