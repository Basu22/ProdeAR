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
import type { FullBracket } from "../../lib/bracketTypes";
import { BracketMatchCard } from "./BracketMatchCard";
import { BracketRound } from "./BracketRound";

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
	// Antes usaba índice positional, lo que causaba bugs si el bracket tenía
	// menos de 5 rondas (ej: durante el mundial, cuando solo R32+R16 están
	// definidos). Ahora es data-driven por meta.abbr.
	const variantForRound = (abbr: string): "compact" | "default" | "hero" => {
		if (abbr === "R32" || abbr === "R16") return "compact";
		if (abbr === "QF" || abbr === "SF") return "default";
		return "hero"; // F
	};

	// Si onOpenDetails no se pasa pero interactive es true, no-op silencioso
	const handleOpen = interactive ? onOpenDetails : undefined;

	return (
		<section
			aria-label="Árbol de eliminatorias del Mundial 2026"
			className="max-w-4xl mx-auto space-y-1"
		>
			{/* Banner del campeón (si hay) */}
			{champion && <ChampionBanner champion={champion} />}

			{/* Header del árbol */}
			<header className="text-center space-y-1 pt-2 pb-4">
				<p className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none inline-block">
					🏆 Eliminatorias
				</p>
				<h2 className="font-display-lg text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
					Camino a la Final
				</h2>
				<p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
					5 rondas. 32 equipos. 1 campeón.
				</p>
			</header>

			{/* 5 rondas apiladas con conectores SVG verticales */}
			<div className="space-y-1">
				{rounds.map((round, index) => (
					<div key={round.meta.abbr}>
						<BracketRound
							round={round}
							cardVariant={variantForRound(round.meta.abbr)}
							onOpenDetails={handleOpen}
							isFirst={index === 0}
						/>
						{/* Conector vertical entre rondas */}
						{index < rounds.length - 1 && <RoundConnector />}
					</div>
				))}
			</div>

			{/* Conector antes del 3er puesto */}
			<RoundConnector />

			{/* Partido por el 3er puesto (apéndice) */}
			<section aria-label="Partido por el tercer puesto" className="space-y-3">
				<header className="flex items-center justify-center gap-2">
					<h3 className="font-headline-md text-sm sm:text-base font-black text-white uppercase tracking-wider">
						Tercer Puesto
					</h3>
					<span
						aria-hidden="true"
						className="
							inline-flex items-center px-2 py-0.5 rounded-full
							bg-tertiary/15 border border-tertiary/40 text-tertiary
							font-label-caps text-[9px] sm:text-[10px]
							font-black tracking-widest uppercase tabular-nums
						"
					>
						×{thirdPlaceMatch.stageMultiplier}
					</span>
				</header>
				<div className="max-w-md mx-auto">
					<BracketMatchCard
						match={thirdPlaceMatch}
						variant="hero"
						onOpenDetails={handleOpen}
					/>
				</div>
			</section>
		</section>
	);
}
