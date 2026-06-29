/**
 * `BracketGlobalView` — Vista Global del Bracket V2.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Renderiza el árbol completo de eliminatorias como un bracket continuo:
 * - 5 columnas (R32, R16, QF, SF, F) + sub-card 3er Puesto dentro de F.
 * - Cada columna con grid virtual de 16 filas (igual altura) → invariante
 *   geométrica del árbol se cumple por construcción.
 * - Scroll horizontal contenido (`overscroll-behavior-x: contain`) y
 *   snap-x mandatory.
 * - Reutiliza `BracketColumn` / `BracketRound` / `BracketMatchCard` sin tocarlos.
 *
 * ============================================================================
 * CAPAS (roadmap)
 * ============================================================================
 * - **Capa 2 (esta)**: layout básico con scroll horizontal contenido.
 *   - 5 columnas usando `BracketColumn` existente.
 *   - Sub-card 3RD dentro de F.
 *   - Fade gradients en bordes (mobile only).
 *   - Reutiliza `BracketConnectors` (SVG overlay entre rondas).
 *   - NO incluye header clickeable por columna (eso es Capa 3).
 *   - NO incluye chip bar / dot indicator (eso es Capa 3).
 *
 * - Capa 3: `GlobalBracketHeader` (header clickeable por columna),
 *   `RoundChipBar` (deep-link), `DotIndicator` (5 dots, mobile only),
 *   pulido visual de conectores SVG.
 * - Capa 4: `BracketDetailView` con swipe horizontal.
 * - Capa 5: Animaciones de transición + tokens CSS + pulido final.
 *
 * ============================================================================
 * SCROLL INDEPENDIENTE
 * ============================================================================
 * El contenedor del bracket tiene `overscroll-behavior-x: contain` para
 * que el scroll horizontal NO propague al body (evita el bug clásico donde
 * scrollIntoView afectaba a todos los ancestros scrolleables). Las cards
 * individuales usan `touch-action: pan-y` para permitir scroll vertical
 * normal de la página sin disparar scroll horizontal.
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `aria-roledescription="bracket"`, `aria-label` con la fase del torneo.
 * - Cada columna con `role="region"`, `aria-label="Ronda X"`.
 * - Conectores SVG son `aria-hidden="true"` (decorativos).
 * - Live regions con `role="status" aria-live="polite"` anuncian cambios.
 *
 * ============================================================================
 * RESPONSIVE
 * ============================================================================
 * - Mobile (< 768px): cada columna `w-[168px]` + gap-3 (12px) → 5 cols +
 *   4 gaps = 888px. Scroll horizontal natural con snap. Fade gradients
 *   visibles en bordes.
 * - Tablet (≥ 768px): `md:w-[200px]` + `md:gap-4` (16px) → 1064px. En
 *   pantallas ≥1024px, `md:overflow-x-hidden` desactiva el scroll horizontal
 *   y el bracket cabe completo sin scroll.
 * - Desktop (≥ 1024px): misma distribución que tablet, `max-w-7xl` centrado.
 *
 * @module components/tournament/bracket-v2/BracketGlobalView
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoundAbbreviation } from "../../../lib/roundNames";
import type {
	FullBracket,
	KnockoutRound,
} from "../../../lib/bracketTypes";
import { BracketColumn } from "../BracketColumn";
import { BracketConnectors } from "../BracketConnectors";
import { RoundChipBar } from "../RoundChipBar";

// ============================================================================
// TYPES
// ============================================================================

interface BracketGlobalViewProps {
	bracket: FullBracket;
	activeRound: RoundAbbreviation;
	onBack: () => void;
	onOpenRound?: (round: RoundAbbreviation) => void;
	onOpenDetails?: (matchId: string) => void;
	interactive?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Orden cronológico de las rondas (sin 3RD que es sub-card de F). */
const ROUND_ORDER: RoundAbbreviation[] = ["R32", "R16", "QF", "SF", "F"];

/** Variant visual de cada ronda (consistente con BracketQuadro legacy). */
const VARIANT_FOR_ROUND: Record<
	RoundAbbreviation,
	"compact" | "default" | "hero"
> = {
	R32: "compact",
	R16: "compact",
	QF: "default",
	SF: "default",
	F: "hero",
	// 3RD usa compact (mismo tamaño que 16vos/8vos). Solo se usa en
	// BracketColumn con `thirdPlaceMatch`, no en el `rounds[]` array.
	"3RD": "compact",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Vista Global: árbol completo del bracket con scroll horizontal contenido.
 * Capa 2 — reutiliza componentes existentes (`BracketColumn`, `BracketConnectors`).
 */
export function BracketGlobalView({
	bracket,
	activeRound: _activeRound,
	onBack,
	onOpenRound: _onOpenRound,
	onOpenDetails,
	interactive = true,
}: BracketGlobalViewProps) {
	const { rounds, champion } = bracket;
	const scrollRef = useRef<HTMLDivElement>(null);
	const [activeIndex, setActiveIndex] = useState(0);

	// ── Derivar ronda activa para el chip bar (basado en scroll position) ──
	const chipBarRound: RoundAbbreviation = ROUND_ORDER[activeIndex] ?? "R32";

	// ── Handler para chip click → scroll horizontal a la columna ──
	const handleChipClick = useCallback(
		(round: RoundAbbreviation) => {
			const container = scrollRef.current;
			if (!container) return;
			// Para 3RD, scrollear a la columna F (que contiene 3RD como sub-card)
			const targetRound = round === "3RD" ? "F" : round;
			const col = container.querySelector<HTMLElement>(
				`[data-round="${targetRound}"]`,
			);
			if (col) {
				col.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "start",
				});
			}
		},
		[],
	);

	// ── Detectar live rounds (para DotIndicator en Capa 3, placeholder por ahora) ──
	const liveRounds = new Set<RoundAbbreviation>();
	for (const r of rounds) {
		if (r.matches.some((m) => m.slotA.isLive || m.slotB.isLive)) {
			liveRounds.add(r.meta.abbr);
		}
	}

	// ── Detectar ronda activa por scroll (mobile) ──
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		const handleScroll = () => {
			// Encontrar la columna más visible (la que tiene su left más cercano al scroll)
			const scrollLeft = container.scrollLeft;
			const containerWidth = container.clientWidth;
			let bestIndex = 0;
			let bestDistance = Infinity;
			for (let i = 0; i < ROUND_ORDER.length; i++) {
				const col = container.querySelector<HTMLElement>(
					`[data-round="${ROUND_ORDER[i]}"]`,
				);
				if (!col) continue;
				const colLeft = col.offsetLeft - container.offsetLeft;
				const distance = Math.abs(colLeft - scrollLeft);
				if (distance < bestDistance) {
					bestDistance = distance;
					bestIndex = i;
				}
			}
			// Solo actualizar si cambió y la columna está al menos 50% visible
			const visibleThreshold = containerWidth * 0.5;
			const bestCol = container.querySelector<HTMLElement>(
				`[data-round="${ROUND_ORDER[bestIndex]}"]`,
			);
			if (
				bestCol &&
				bestCol.offsetLeft - container.offsetLeft - scrollLeft <
					visibleThreshold
			) {
				setActiveIndex(bestIndex);
			}
		};

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	// ── Empty state ──
	if (rounds.length === 0) {
		return (
			<section
				aria-label="Árbol de eliminatorias"
				className="max-w-md mx-auto text-center py-12 sm:py-16"
			>
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container border border-white/10 mb-4">
					<span
						className="material-symbols-outlined text-on-surface-variant/50"
						style={{ fontSize: "32px" }}
						aria-hidden="true"
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
			</section>
		);
	}

	return (
		<section
			aria-label="Árbol completo de eliminatorias"
			aria-roledescription="bracket"
			className="max-w-7xl mx-auto"
		>
			{/* Champion Banner (si la final está jugada) */}
			{champion && (
				<ChampionBannerInline champion={champion} />
			)}

			{/* Chip bar de navegación (deep-link entre rondas) — sticky top-16 z-20 */}
			<RoundChipBar
				activeRound={chipBarRound}
				onChipClick={handleChipClick}
				liveRounds={liveRounds}
			/>

			{/* Header sticky "← Cerrar" — sticky top-[112px] z-30 (debajo del chip bar) */}
			<header
				className="
					sticky top-[112px] z-30
					backdrop-blur-xl bg-background/85
					border-b border-white/5
					shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]
				"
			>
				<div className="flex items-center gap-2 px-2 py-2">
					{/* Botón "← Cerrar" — vuelve a Vista Detalle */}
					<button
						type="button"
						onClick={onBack}
						aria-label="Cerrar árbol y volver a vista detalle"
						className="
							shrink-0
							min-h-[44px] min-w-[44px]
							inline-flex items-center justify-center gap-1.5
							px-3
							rounded-full
							bg-surface-container/60 border border-white/10
							hover:bg-surface-container-high
							active:scale-[0.96]
							transition-[transform,background-color] duration-200
							motion-reduce:transition-none
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
						"
					>
						<span
							className="material-symbols-outlined text-white"
							style={{ fontSize: "20px" }}
							aria-hidden="true"
						>
							close
						</span>
						<span className="font-label-caps text-xs font-black text-white uppercase tracking-wider">
							Cerrar
						</span>
					</button>

					{/* Centro: título + live indicator */}
					<div className="flex-1 min-w-0 flex items-center justify-center gap-2">
						<h2 className="font-headline-md text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
							Árbol
						</h2>
						<span className="font-label-caps text-[9px] text-on-surface-variant/60 uppercase tracking-widest flex-shrink-0">
							{liveRounds.size > 0
								? `${liveRounds.size} ronda${liveRounds.size > 1 ? "s" : ""} en vivo`
								: bracket.champion
									? "🏆 Finalizado"
									: "Vista global"}
						</span>
					</div>

					{/* Spacer para balancear el layout (mismo ancho que botón cerrar) */}
					<div className="shrink-0 min-w-[44px]" aria-hidden="true" />
				</div>
			</header>

			{/* Bracket grid — scroll horizontal contenido */}
			<div
				ref={scrollRef}
				role="group"
				aria-label={`Rondas del bracket: ${ROUND_ORDER.join(", ")}`}
				className="
					relative
					flex gap-3 px-3 pt-2 pb-6
					overflow-x-auto
					snap-x snap-mandatory
					overscroll-behavior-x-contain
					scroll-smooth
					motion-reduce:scroll-auto
					md:gap-4 md:overflow-x-hidden md:snap-none md:px-0
				"
			>
				{/* Fade gradients en bordes (mobile only) */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent md:hidden z-10"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden z-10"
				/>

				{/* Conectores SVG (reutiliza lógica existente) */}
				<BracketConnectors containerRef={scrollRef} rounds={rounds} />

				{/* 5 columnas de rondas */}
				{rounds.map((round) => (
					<GlobalColumn
						key={round.meta.abbr}
						round={round}
						variant={VARIANT_FOR_ROUND[round.meta.abbr]}
						onOpenDetails={interactive ? onOpenDetails : undefined}
					/>
				))}
			</div>

			{/* Dot indicator mobile (5 dots) — placeholder visual hasta Capa 3 */}
			<div
				className="flex justify-center gap-1.5 md:hidden py-2"
				aria-hidden="true"
			>
				{ROUND_ORDER.map((round, i) => (
					<span
						key={round}
						className={`
							h-1 rounded-full transition-all duration-300
							motion-reduce:transition-none
							${
								i === activeIndex
									? "w-6 bg-primary"
									: "w-1.5 bg-white/20"
							}
						`.trim()}
					/>
				))}
			</div>

			{/* Live region para screen readers */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				Ronda visible: {ROUND_ORDER[activeIndex]}
			</div>
		</section>
	);
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Wrapper de `BracketColumn` para Vista Global.
 * En Capa 3 reemplazaremos el header inline de `BracketColumn` con un
 * `GlobalBracketHeader` clickeable que abre la Vista Detalle.
 */
function GlobalColumn({
	round,
	variant,
	onOpenDetails,
}: {
	round: KnockoutRound;
	variant: "compact" | "default" | "hero";
	onOpenDetails?: (matchId: string) => void;
}) {
	return (
		<div
			data-round={round.meta.abbr}
			className="
				shrink-0
				w-[168px] md:w-[200px]
				snap-start
				md:flex-1
				flex flex-col
			"
		>
			<BracketColumn
				round={round}
				variant={variant}
				onOpenDetails={onOpenDetails}
			/>
		</div>
	);
}

/**
 * Banner simple del campeón (Capa 2 — placeholder hasta Capa 5 que lo pulirá).
 * El componente `ChampionBanner` legacy vive en `../ChampionBanner.tsx`,
 * pero para evitar acoplamiento fuerte lo reimplementamos inline por ahora.
 */
function ChampionBannerInline({ champion }: { champion: string }) {
	return (
		<div
			role="status"
			aria-label={`${champion} es el campeón del torneo`}
			className="
				sticky top-16 z-20
				mx-3 md:mx-0
				mt-2
				flex items-center justify-center gap-2
				px-3 py-2
				rounded-xl
				bg-gradient-to-r from-tertiary/20 via-tertiary/30 to-tertiary/20
				border border-tertiary/40
				backdrop-blur-sm
			"
		>
			<span
				className="material-symbols-outlined text-tertiary"
				style={{ fontSize: "20px" }}
				aria-hidden="true"
			>
				emoji_events
			</span>
			<span className="font-headline-md text-sm sm:text-base font-black text-white uppercase tracking-wider">
				🏆 {champion}
			</span>
		</div>
	);
}
