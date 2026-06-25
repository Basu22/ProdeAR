/**
 * BracketQuadro — Carrusel horizontal del árbol de eliminatorias.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Componente principal del Sprint 5C+ que reemplaza la vista "1 ronda +
 * RoundStepper" por un carrusel horizontal con scroll snap:
 * - **Mobile** (< 768px): 2 columnas visibles simultáneamente,
 *   swipe horizontal entre rondas.
 * - **Desktop** (≥ 768px): 5+1 columnas completas en single viewport
 *   (sin scroll horizontal, las 5 rondas + 3RD sub-card de F).
 *
 * ============================================================================
 * ARQUITECTURA
 * ============================================================================
 * ```
 * BracketQuadro
 *   ├── ChampionBanner              (si champion !== null && F visible)
 *   ├── RoundChipBar                (sticky, 6 chips)
 *   ├── DotIndicator                (5+1 dots, mobile only)
 *   ├── <div> carrusel              (overflow-x-auto, snap-x mandatory)
 *   │     ├── BracketColumn[R32]    (data-round="R32", panel-R32)
 *   │     ├── BracketColumn[R16]    (data-round="R16", panel-R16)
 *   │     ├── BracketColumn[QF]     (data-round="QF", panel-QF)
 *   │     ├── BracketColumn[SF]     (data-round="SF", panel-SF)
 *   │     └── BracketColumn[F]      (data-round="F", panel-F)
 *   │           ├── BracketRound    (Final match)
 *   │           └── ThirdPlaceSeparator + 3RD sub-card
 *   └── FadeGradient (left + right, mobile only)
 * ```
 *
 * ============================================================================
 * SINCRONIZACIÓN URL ↔ SCROLL
 * ============================================================================
 * 1. URL `?round=X` → scrollTo(columna X) con `isProgrammaticScroll=true`
 * 2. Scroll manual → IntersectionObserver detecta columna activa →
 *    `setSearchParams({ round: X })` con `replace: true`
 * 3. El flag `isProgrammaticScroll` se resetea con timeout de 600ms o
 *    `scrollend` event (lo que llegue primero). Hard timeout de 800ms
 *    como red de seguridad.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `<section aria-roledescription="carrusel">` con `aria-label` descriptivo
 * - Keyboard nav: ArrowLeft/Right (paso a paso), Home/End (inicio/fin)
 * - Tap targets ≥ 44×44px (en chips, via RoundChipBar)
 * - `prefers-reduced-motion`: scroll-behavior auto, sin transiciones
 * - aria-current="page" en el chip activo (via RoundChipBar)
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - bracket: FullBracket (output de getFullBracket)
 * - onOpenDetails: callback al tocar un partido
 * - interactive: si true, los cards son clickeables
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	getRoundNavigatorState,
	parseRoundParam,
} from "../../lib/bracketNavigation";
import type { FullBracket } from "../../lib/bracketTypes";
import type { RoundAbbreviation } from "../../lib/roundNames";
import { useActiveRound } from "../../hooks/useActiveRound";
import { BracketColumn } from "./BracketColumn";
import { ChampionBanner } from "./ChampionBanner";
import { RoundChipBar } from "./RoundChipBar";

// ============================================================================
// PROPS
// ============================================================================

interface BracketQuadroProps {
	bracket: FullBracket;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Orden cronológico de las rondas (sin 3RD que es sub-card de F).
 */
const ROUND_ORDER: RoundAbbreviation[] = ["R32", "R16", "QF", "SF", "F"];

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Empty state — cuando el bracket no tiene rondas.
 */
function EmptyState() {
	return (
		<div className="text-center py-12 sm:py-16 max-w-md mx-auto">
			<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container border border-white/10 mb-4">
				<span
					className="material-symbols-outlined text-on-surface-variant/50"
					style={{ fontSize: "32px" }}
				>
					sports_soccer
				</span>
			</div>
			<p className="font-headline-md text-base sm:text-lg text-white uppercase tracking-wider font-bold">
				El árbol se completará
			</p>
			<p className="font-body-md text-sm text-on-surface-variant mt-2 max-w-xs mx-auto">
				Cuando termine la fase de grupos, los cruces de eliminatorias se
				definirán automáticamente.
			</p>
		</div>
	);
}

/**
 * Dot indicator — fila de 5+1 puntos arriba del carrusel (mobile only).
 * El dot activo es más ancho y primary color.
 */
interface DotIndicatorProps {
	activeIndex: number;
	total: number;
}

function DotIndicator({ activeIndex, total }: DotIndicatorProps) {
	return (
		<div
			className="flex justify-center gap-1.5 md:hidden py-2"
			aria-hidden="true"
		>
			{Array.from({ length: total }, (_, i) => (
				<span
					key={i}
					className={`
						h-1 rounded-full transition-all duration-300
						${i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-white/20"}
						motion-reduce:transition-none
					`.trim()}
				/>
			))}
		</div>
	);
}

/**
 * Fade gradient en los bordes del carrusel (mobile only).
 * Indica que hay contenido oculto a izquierda/derecha.
 */
function FadeGradient({ side }: { side: "left" | "right" }) {
	const gradientClass =
		side === "left"
			? "left-0 bg-gradient-to-r from-background to-transparent"
			: "right-0 bg-gradient-to-l from-background to-transparent";
	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-8 ${gradientClass} md:hidden`}
		/>
	);
}

// ============================================================================
// HOOKS (custom, definidos inline para cohesión)
// ============================================================================

/**
 * Detecta si el usuario prefiere reduced motion.
 * Usa useState (no useRef) para que el componente re-renderice cuando
 * cambia la preferencia, y así el effect de scroll use el behavior correcto.
 */
function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(mq.matches);
		const handler = (e: MediaQueryListEvent) => {
			setReduced(e.matches);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);
	return reduced;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketQuadro({
	bracket,
	onOpenDetails,
	interactive = true,
}: BracketQuadroProps) {
	const { rounds, thirdPlaceMatch, champion } = bracket;
	const [searchParams, setSearchParams] = useSearchParams();
	const scrollRef = useRef<HTMLDivElement>(null);
	const isProgrammaticScroll = useRef(false);
	const programmaticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const prefersReducedMotion = usePrefersReducedMotion();

	// ── Determinar ronda actual desde URL ──
	const roundParam = searchParams.get("round");
	const normalizedParam = parseRoundParam(roundParam);
	const defaultRound: RoundAbbreviation = rounds[0]?.meta.abbr ?? "R32";
	const currentRound: RoundAbbreviation = normalizedParam ?? defaultRound;

	// ── Helper: navegar a una ronda (escribe URL) ──
	const navigateToRound = useCallback(
		(round: RoundAbbreviation) => {
			const next = new URLSearchParams(searchParams);
			next.set("round", round);
			setSearchParams(next, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	// ── Helper: resetear isProgrammaticScroll con cleanup ──
	const setProgrammaticFlag = useCallback((value: boolean) => {
		isProgrammaticScroll.current = value;
		if (programmaticTimer.current) {
			clearTimeout(programmaticTimer.current);
			programmaticTimer.current = null;
		}
		if (value) {
			// Soft reset: 600ms (después de scroll-smooth típico)
			programmaticTimer.current = setTimeout(() => {
				isProgrammaticScroll.current = false;
			}, 600);
			// Hard reset: 800ms (red de seguridad)
			setTimeout(() => {
				isProgrammaticScroll.current = false;
			}, 800);
		}
	}, []);

	// ── Detectar columna activa + leaving + scrollDirection ──
	// Sprint 5D+: useActiveRound ahora retorna 3 valores para soportar
	// el efecto visual del árbol de eliminatorias con líneas conectoras.
	const { active: activeRound, leaving: leavingRound, scrollDirection } =
		useActiveRound(scrollRef, ROUND_ORDER, isProgrammaticScroll);

	// ── Effect: URL → scroll (cuando cambia ?round=) ──
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		// 3RD es sub-card de F: si el URL es 3RD, scrolleamos a F
		const scrollTarget: RoundAbbreviation = currentRound === "3RD" ? "F" : currentRound;
		const col = container.querySelector<HTMLElement>(
			`[data-round="${scrollTarget}"]`,
		);
		if (!col) return;

		// Verificar si la columna ya está visible horizontalmente (no-op si lo está).
		// Ya no chequeamos visibilidad vertical: scrollTo opera solo sobre el
		// contenedor del carrusel, no toca el body. La posición vertical de la
		// columna es irrelevante para esta decisión.
		const colRect = col.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		if (
			colRect.left >= containerRect.left - 1 &&
			colRect.right <= containerRect.right + 1
		) {
			return;
		}

		// ── Fix Sprint 5D: scrollTo directo sobre el contenedor del carrusel ──
		// ANTES: col.scrollIntoView({ block: "nearest" })
		// PROBLEMA: scrollIntoView afecta a TODOS los ancestros scrolleables.
		// El body scrolleaba verticalmente, "centrando" la columna y ocultando
		// el sticky chip bar (top-16).
		// SOLUCIÓN: scrollTo opera SOLO sobre el contenedor del carrusel.
		// El `scroll-snap-x mandatory` del contenedor alinea al start.
		setProgrammaticFlag(true);
		container.scrollTo({
			left: col.offsetLeft - container.offsetLeft,
			behavior: prefersReducedMotion ? "auto" : "smooth",
		});
	}, [currentRound, prefersReducedMotion, setProgrammaticFlag]);

	// ── Effect: scrollend fallback (resetea flag cuando termina el scroll) ──
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		const onScrollEnd = () => {
			isProgrammaticScroll.current = false;
			if (programmaticTimer.current) {
				clearTimeout(programmaticTimer.current);
				programmaticTimer.current = null;
			}
		};

		// 'scrollend' es experimental pero soportado en Chrome/Edge/Safari 17+
		container.addEventListener("scrollend", onScrollEnd);
		return () => container.removeEventListener("scrollend", onScrollEnd);
	}, []);

	// ── Effect: scroll → URL (cuando IntersectionObserver detecta nueva ronda) ──
	useEffect(() => {
		if (!activeRound || isProgrammaticScroll.current) return;
		if (activeRound === currentRound) return;
		navigateToRound(activeRound);
	}, [activeRound, currentRound, navigateToRound]);

	// ── Detectar rondas con partidos en vivo ──
	const liveRounds = new Set<RoundAbbreviation>();
	for (const r of rounds) {
		if (r.matches.some((m) => m.slotA.isLive || m.slotB.isLive)) {
			liveRounds.add(r.meta.abbr);
		}
	}

	// ── Keyboard navigation global (ArrowLeft/Right, Home/End) ──
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Solo si el foco NO está en un input
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable)
			) {
				return;
			}

			const navState = getRoundNavigatorState(currentRound);
			if (
				e.key === "ArrowLeft" &&
				navState.left.enabled &&
				navState.left.target
			) {
				e.preventDefault();
				navigateToRound(navState.left.target);
			} else if (
				e.key === "ArrowRight" &&
				navState.right.enabled &&
				navState.right.target
			) {
				e.preventDefault();
				navigateToRound(navState.right.target);
			} else if (e.key === "Home") {
				e.preventDefault();
				navigateToRound(ROUND_ORDER[0]!);
			} else if (e.key === "End") {
				e.preventDefault();
				navigateToRound(ROUND_ORDER[ROUND_ORDER.length - 1]!);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [currentRound, navigateToRound]);

	// ── Helper: variant según la ronda ──
	const variantForRound = (abbr: RoundAbbreviation): "compact" | "default" | "hero" => {
		if (abbr === "R32" || abbr === "R16") return "compact";
		if (abbr === "QF" || abbr === "SF") return "default";
		return "hero"; // F
	};

	// ── Si onOpenDetails no se pasa pero interactive es true, no-op silencioso ──
	const handleOpen = interactive ? onOpenDetails : undefined;

	// ── Empty state ──
	if (rounds.length === 0) {
		return (
			<section
				aria-label="Árbol de eliminatorias"
				aria-roledescription="carrusel"
				className="max-w-4xl mx-auto"
			>
				<EmptyState />
			</section>
		);
	}

	// ── Calcular índice activo para dot indicator ──
	const activeIndex = activeRound
		? ROUND_ORDER.indexOf(activeRound)
		: ROUND_ORDER.indexOf(currentRound);
	const totalDots = ROUND_ORDER.length;

	// ── ChampionBanner solo si F es la ronda activa o visible ──
	const showChampion = champion && (activeRound === "F" || currentRound === "F");

	return (
		<section
			aria-label="Rondas del Mundial 2026: 16vos, 8vos, 4tos, Semifinal, Final y 3er Puesto"
			aria-roledescription="carrusel"
			className="max-w-7xl mx-auto"
		>
			{/* Champion Banner (solo si F es visible) */}
			{showChampion && champion && <ChampionBanner champion={champion} />}

			{/* Round Chip Bar (sticky) */}
			<RoundChipBar
				activeRound={activeRound ?? currentRound}
				onChipClick={navigateToRound}
				liveRounds={liveRounds}
			/>

			{/* Dot Indicator (mobile only) */}
			{activeIndex >= 0 && (
				<DotIndicator activeIndex={activeIndex} total={totalDots} />
			)}

			{/* Carrusel horizontal */}
			<div
				ref={scrollRef}
				role="group"
				aria-label={`Ronda actual: ${currentRound}`}
				className="
					relative
					flex gap-3 px-2 pt-2 pb-4
					overflow-x-auto
					snap-x snap-mandatory
					overscroll-behavior-x-contain
					scroll-smooth
					motion-reduce:scroll-auto
					md:gap-4 md:overflow-x-hidden md:snap-none md:px-0
				"
			>
				{/* Fade gradients (mobile only) */}
				<FadeGradient side="left" />
				<FadeGradient side="right" />

				{/* 5 columnas de rondas */}
				{rounds.map((round) => (
					<BracketColumn
						key={round.meta.abbr}
						round={round}
						variant={variantForRound(round.meta.abbr)}
						onOpenDetails={handleOpen}
						thirdPlaceMatch={round.meta.abbr === "F" ? thirdPlaceMatch : undefined}
						isLeaving={leavingRound === round.meta.abbr}
					/>
				))}
			</div>

			{/* Live region para screen readers */}
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				Ronda actual: {activeRound ?? currentRound}
			</div>
		</section>
	);
}
