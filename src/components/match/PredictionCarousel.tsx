import { useCallback, useEffect, useRef, useState } from "react";
import type { Match, Prediction, Tournament } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";
import { PredictionSlide } from "./PredictionSlide";

export interface PredictionCarouselProps {
	match: Match;
	predictions: Prediction[];
	tournaments: Tournament[];
	/** Si el match está locked (no se puede editar) */
	locked: boolean;
	/** Callback cuando un slide cambia su estado dirty */
	onSlideDirtyChange?: (slideId: string, isDirty: boolean) => void;
}

export type ViewMode = "editable" | "consult" | "results";

/**
 * Carrusel horizontal de predicciones, 1 slide por torneo.
 * Sprint S3: rediseñado con flechas, counter prominente al centro,
 * keyboard nav, y diferenciación visual entre consulta vs edición.
 */
export function PredictionCarousel({
	match,
	predictions,
	tournaments,
	locked,
	onSlideDirtyChange,
}: PredictionCarouselProps) {
	const currentUser = useAuthStore((s) => s.user);
	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Si el usuario no está logueado, no mostrar nada
	if (!currentUser) return null;

	// Si el usuario no está en ningún torneo, mostrar CTA
	if (tournaments.length === 0) {
		return (
			<div className="px-4 py-6 text-center">
				<p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">
					Unite a un torneo para pronosticar
				</p>
			</div>
		);
	}

	// === Compute viewMode compartido por todos los slides ===
	const viewMode: ViewMode = (() => {
		if (match.status === "finished") return "results";
		if (locked) return "consult";
		return "editable";
	})();

	// Mostrar navegación solo si hay 2+ torneos
	const showNavigation = tournaments.length > 1;
	const isFirst = activeIndex === 0;
	const isLast = activeIndex === tournaments.length - 1;

	// Mapear cada tournament → su prediction (si existe)
	const slides = tournaments.map((tournament) => {
		const prediction = predictions.find(
			(p) => p.tournamentId === tournament.id,
		);
		return { tournament, prediction };
	});

	// === Navegación centralizada ===
	const goToSlide = useCallback(
		(idx: number) => {
			if (!showNavigation) return;
			const clamped = Math.max(0, Math.min(tournaments.length - 1, idx));
			if (clamped === activeIndex) return;
			setActiveIndex(clamped);
			const target = containerRef.current?.children[clamped] as
				| HTMLElement
				| undefined;
			target?.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
				inline: "center",
			});
		},
		[activeIndex, showNavigation, tournaments.length],
	);

	const handlePrev = () => goToSlide(activeIndex - 1);
	const handleNext = () => goToSlide(activeIndex + 1);

	// === Keyboard nav: ←/→/Home/End ===
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			handlePrev();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			handleNext();
		} else if (e.key === "Home") {
			e.preventDefault();
			goToSlide(0);
		} else if (e.key === "End") {
			e.preventDefault();
			goToSlide(tournaments.length - 1);
		}
	};

	// === Sync activeIndex con scroll (corrige el off-by-one del original) ===
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		if (!showNavigation) return;
		const target = e.currentTarget;
		if (target.children.length === 0) return;
		const firstChild = target.children[0] as HTMLElement;
		const slideWidth = firstChild.offsetWidth;
		if (slideWidth === 0) return;
		const gap = 8; // gap-2 = 8px (mantener en sync con la clase Tailwind)
		const newIdx = Math.round(target.scrollLeft / (slideWidth + gap));
		const clamped = Math.max(0, Math.min(tournaments.length - 1, newIdx));
		setActiveIndex((prev) => (prev === clamped ? prev : clamped));
	};

	// Si tournaments.length cambia, reset activeIndex si está fuera de rango
	useEffect(() => {
		if (activeIndex > tournaments.length - 1) {
			setActiveIndex(0);
		}
	}, [tournaments.length, activeIndex]);

	return (
		<section className="space-y-3" aria-label="Predicciones por torneo">
			{/* === CARRUSEL + FLECHAS + COUNTER OVERLAY === */}
			<div
				className="relative"
				role="region"
				aria-roledescription="carrusel"
				aria-label={`Pronósticos por torneo. Slide ${activeIndex + 1} de ${tournaments.length}. Usá las flechas izquierda y derecha para navegar.`}
				onKeyDown={handleKeyDown}
			>
				{/* Counter pill — overlay glass centrado en el top */}
				{showNavigation && (
					<div
						className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-tab-enter"
						aria-hidden="true"
					>
						<div className="px-2.5 py-0.5 rounded-full bg-background/85 backdrop-blur-md border border-white/10 flex items-center gap-1">
							<span
								className="material-symbols-outlined text-[12px] text-primary"
								style={{ fontVariationSettings: "'FILL' 1" }}
							>
								stadia_controller
							</span>
							<span
								className="font-label-caps text-[10px] tracking-widest uppercase tabular-nums"
								aria-live="polite"
							>
								<span className="text-white font-bold">{activeIndex + 1}</span>
								<span className="text-on-surface-variant/60 mx-1">/</span>
								<span className="text-on-surface-variant">
									{tournaments.length}
								</span>
							</span>
						</div>
					</div>
				)}

				{/* Flecha izquierda */}
				{showNavigation && (
					<button
						type="button"
						onClick={handlePrev}
						disabled={isFirst}
						aria-label="Ir al torneo anterior"
						className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/70 backdrop-blur-md border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-on-surface-variant opacity-60 active:opacity-100 active:scale-95 md:opacity-70 md:hover:opacity-100 md:hover:text-primary md:hover:border-primary/30 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-on-surface-variant transition-[opacity,transform,color,border-color] duration-200"
					>
						<span className="material-symbols-outlined text-base md:text-lg">
							chevron_left
						</span>
					</button>
				)}

				{/* Flecha derecha */}
				{showNavigation && (
					<button
						type="button"
						onClick={handleNext}
						disabled={isLast}
						aria-label="Ir al torneo siguiente"
						className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/70 backdrop-blur-md border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-on-surface-variant opacity-60 active:opacity-100 active:scale-95 md:opacity-70 md:hover:opacity-100 md:hover:text-primary md:hover:border-primary/30 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-on-surface-variant transition-[opacity,transform,color,border-color] duration-200"
					>
						<span className="material-symbols-outlined text-base md:text-lg">
							chevron_right
						</span>
					</button>
				)}

				{/* Track scroll-snap */}
				<div
					ref={containerRef}
					data-prediction-carousel
					onScroll={handleScroll}
					style={{ scrollSnapStop: "always" }}
					className="overflow-x-auto snap-x snap-mandatory flex gap-2 pb-1 hide-scrollbar focus:outline-none"
					tabIndex={0}
				>
					{slides.map(({ tournament, prediction }, idx) => (
						<div
							key={tournament.id}
							className="snap-center shrink-0 w-full focus:outline-none"
							aria-hidden={idx !== activeIndex}
						>
							<PredictionSlide
								match={match}
								prediction={prediction}
								tournament={tournament}
								locked={locked}
								viewMode={viewMode}
								onDirtyChange={
									onSlideDirtyChange
										? (isDirty) => onSlideDirtyChange(tournament.id, isDirty)
										: undefined
								}
							/>
						</div>
					))}
				</div>
			</div>

			{/* === DOTS INDICATOR (arreglado, ahora sí funciona) === */}
			{showNavigation && (
				<div
					className="flex items-center justify-center gap-1.5 pt-1"
					role="tablist"
					aria-label="Navegación de torneos"
				>
					{tournaments.map((t, idx) => (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={idx === activeIndex}
							aria-label={`Ir a ${t.name}`}
							onClick={() => goToSlide(idx)}
							className={`h-1.5 rounded-full transition-all duration-200 ${
								idx === activeIndex
									? "w-6 bg-primary shadow-[0_0_6px_rgba(0,229,255,0.4)]"
									: "w-1.5 bg-white/20 hover:bg-white/40"
							}`}
						/>
					))}
				</div>
			)}
		</section>
	);
}
