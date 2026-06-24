/**
 * BracketTree — Árbol visual completo de eliminatorias (5 rondas + 3er puesto).
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * - Renderiza las 5 rondas (R32 → R16 → QF → SF → F) apiladas verticalmente
 * - Renderiza el partido por el 3er puesto como apéndice debajo de la Final
 * - Inserta SVG conectores verticales entre rondas (línea de cal visual)
 * - Maneja 3 estados del bracket:
 *   - Con datos: render normal
 *   - Vacío (rounds.length === 0): empty state con mensaje
 *   - TBD (todos los slots pendientes): animación sutil + mensaje
 *
 * ============================================================================
 * LAYOUT MOBILE-FIRST
 * ============================================================================
 * - Las 5 rondas se apilan verticalmente (sin scroll horizontal)
 * - SVG conectores verticales de 2px entre rondas (mobile-friendly)
 * - Cada ronda tiene su grid responsive interno
 *
 * ============================================================================
 * BANNER DEL CAMPEÓN
 * ============================================================================
 * Cuando `bracket.champion !== null`, se renderiza un banner destacado
 * arriba del árbol con el nombre del campeón + ícono de trofeo.
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - bracket: FullBracket (output de getFullBracket)
 * - onOpenDetails: callback al tocar un partido (abre MatchSheet)
 * - interactive: si true, los cards son clickeables (default: true)
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - <section role="region"> con aria-label del árbol
 * - aria-live="polite" en el banner del campeón para usuarios de screen reader
 * - Contraste WCAG AA en todos los textos
 * - Estructura jerárquica: árbol → rondas → partidos → slots
 */

import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import { getRoundLabel, parseRoundParam } from "../../lib/bracketNavigation";
import type { FullBracket } from "../../lib/bracketTypes";
import { BracketMatchCard } from "./BracketMatchCard";
import { BracketRound } from "./BracketRound";
import { RoundStepper } from "./RoundStepper";

// ============================================================================
// PROPS
// ============================================================================

interface BracketTreeProps {
	bracket: FullBracket;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Conector SVG vertical entre rondas.
 * Línea de 2px con gradiente "línea de cal" (primary → error).
 */
function RoundConnector() {
	return (
		<div aria-hidden="true" className="flex justify-center py-1">
			<svg
				width="2"
				height="32"
				viewBox="0 0 2 32"
				xmlns="http://www.w3.org/2000/svg"
				className="overflow-visible"
				role="presentation"
			>
				<title>Conector entre rondas</title>
				<defs>
					<linearGradient
						id="bracket-connector-gradient"
						x1="0%"
						y1="0%"
						x2="0%"
						y2="100%"
					>
						<stop offset="0%" stopColor="rgb(56, 189, 248)" stopOpacity="0.5" />
						<stop offset="50%" stopColor="rgb(255, 215, 0)" stopOpacity="0.4" />
						<stop
							offset="100%"
							stopColor="rgb(239, 68, 68)"
							stopOpacity="0.5"
						/>
					</linearGradient>
				</defs>
				<line
					x1="1"
					y1="0"
					x2="1"
					y2="32"
					stroke="url(#bracket-connector-gradient)"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}

/**
 * Banner del campeón — se muestra cuando bracket.champion !== null
 */
function ChampionBanner({ champion }: { champion: string }) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`¡${champion} es el campeón del torneo!`}
			className="
				relative overflow-hidden
				rounded-2xl border-2 border-tertiary/60
				bg-gradient-to-br from-tertiary/20 via-tertiary/5 to-error/20
				px-4 py-5 sm:px-6 sm:py-6
				text-center
				shadow-[0_0_24px_rgba(255,215,0,0.3)]
			"
		>
			{/* Brillos de fondo */}
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_70%)] pointer-events-none"
			/>

			<div className="relative space-y-2">
				<div className="flex items-center justify-center gap-2">
					<span
						className="material-symbols-outlined text-tertiary text-3xl sm:text-4xl"
						style={{ fontSize: "32px" }}
					>
						emoji_events
					</span>
					<span
						className="material-symbols-outlined text-tertiary text-2xl sm:text-3xl animate-pulse"
						style={{ fontSize: "24px" }}
					>
						workspace_premium
					</span>
				</div>
				<p className="font-label-caps text-[10px] sm:text-xs text-tertiary uppercase tracking-widest font-black">
					¡Campeón del Mundo!
				</p>
				<p className="font-display-lg text-2xl sm:text-4xl font-black text-white uppercase tracking-tight text-balance">
					{champion}
				</p>
			</div>
		</div>
	);
}

/**
 * Empty state — cuando el bracket no tiene rondas
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BracketTree({
	bracket,
	onOpenDetails,
	interactive = true,
}: BracketTreeProps) {
	const { rounds, thirdPlaceMatch, champion } = bracket;
	// useId: genera un ID único para el gradiente SVG (Fix QA #4 — HTML válido)
	const gradientId = useId();

	// Sprint 5C: URL params para navegación de rondas.
	// Si la URL tiene `?round=r32` (o r16, qf, sf, f, 3rd), se renderiza
	// esa ronda. Si NO tiene, se usa la primera ronda disponible como default
	// (R32 si existe, si no la siguiente) y se renderiza SIEMPRE la vista
	// de 1 ronda + navegador (sin fallback a "5 rondas apiladas" que era
	// el comportamiento pre-Sprint 5C).
	const [searchParams, setSearchParams] = useSearchParams();
	const roundParam = searchParams.get("round");
	const normalizedParam = parseRoundParam(roundParam);

	// Determinar la ronda actual: URL param, o default a la primera disponible
	const defaultRound: RoundAbbreviation = rounds[0]?.meta.abbr ?? "R32";
	const currentRound: RoundAbbreviation = normalizedParam ?? defaultRound;

	const handleNavigate = (round: RoundAbbreviation) => {
		const next = new URLSearchParams(searchParams);
		next.set("round", round);
		setSearchParams(next, { replace: true });
	};

	// Estado vacío: no hay rondas
	if (rounds.length === 0) {
		return (
			<section
				aria-label="Árbol de eliminatorias"
				className="max-w-4xl mx-auto"
			>
				<EmptyState />
			</section>
		);
	}

	// Helper para decidir variante según la abreviación de la ronda (Fix QA #3)
	const variantForRound = (abbr: string): "compact" | "default" | "hero" => {
		if (abbr === "R32" || abbr === "R16") return "compact";
		if (abbr === "QF" || abbr === "SF") return "default";
		return "hero"; // F
	};

	// Si onOpenDetails no se pasa pero interactive es true, no-op silencioso
	const handleOpen = interactive ? onOpenDetails : undefined;

	// ── VISTA DE RONDA ÚNICA + NAVEGADOR (Sprint 5C, default behavior) ──
	// Siempre se renderiza 1 sola ronda + navegador. La "vista completa" de
	// 5 rondas apiladas fue removida porque ya no tiene sentido con el
	// navegador de flechas.
	{
		// 3RD: renderizar el thirdPlaceMatch
		if (currentRound === "3RD") {
			return (
				<section
					aria-label="Partido por el tercer puesto"
					className="max-w-4xl mx-auto space-y-1"
				>
					{/* Breadcrumb */}
					<header className="text-center space-y-1 pt-2 pb-4">
						<p className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none inline-block">
							🏆 Eliminatorias · 3er Puesto
						</p>
					</header>
					{/* Navegador */}
					<div className="flex justify-center py-2">
						<RoundStepper current="3RD" onNavigate={handleNavigate} />
					</div>
					{/* 3RD card (hero variant) */}
					<div className="max-w-md mx-auto pt-2">
						<BracketMatchCard
							match={thirdPlaceMatch}
							variant="hero"
							onOpenDetails={handleOpen}
						/>
					</div>
				</section>
			);
		}

		// Rondas R32/R16/QF/SF/F: renderizar la ronda correspondiente
		const round = rounds.find((r) => r.meta.abbr === currentRound);
		if (!round) {
			// Si el param apunta a una ronda que no existe, fallback a la primera
			const firstRound = rounds[0];
			if (firstRound) {
				const next = new URLSearchParams(searchParams);
				next.set("round", firstRound.meta.abbr);
				setSearchParams(next, { replace: true });
			}
			return null;
		}

		// Detectar rondas con partidos en vivo (para dot rojo pulsante en pills)
		const liveRounds = new Set<RoundAbbreviation>();
		for (const r of rounds) {
			if (r.matches.some((m) => m.slotA.isLive || m.slotB.isLive)) {
				liveRounds.add(r.meta.abbr);
			}
		}

		return (
			<section
				aria-label="Árbol de eliminatorias del Mundial 2026"
				className="max-w-4xl mx-auto space-y-1"
			>
				{/* ChampionBanner: solo en la Final (evita spoilers en R32/R16/etc) */}
				{currentRound === "F" && champion && (
					<ChampionBanner champion={champion} />
				)}

				{/* Header */}
				<header className="text-center space-y-1 pt-2 pb-4">
					<p className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none inline-block">
						🏆 Eliminatorias · {getRoundLabel(currentRound)}
					</p>
					<h2 className="font-display-lg text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
						Camino a la Final
					</h2>
				</header>
				{/* Stepper unificado (flechas + pills de progreso clickeables) */}
				<div className="flex justify-center py-2">
					<RoundStepper
						current={currentRound}
						onNavigate={handleNavigate}
						hasThirdPlace
						liveRounds={liveRounds}
					/>
				</div>
				{/* Una sola ronda (con key para re-animar al cambiar) */}
				<div
					key={currentRound}
					className="transition-all duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:duration-0 motion-reduce:transition-none"
				>
					<BracketRound
						round={round}
						cardVariant={variantForRound(round.meta.abbr)}
						onOpenDetails={handleOpen}
						isFirst={true}
					/>
				</div>
			</section>
		);
	}
}
