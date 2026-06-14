import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { StatsSheet } from "../components/dashboard/StatsSheet";
import { MatchCard } from "../components/match/MatchCard";
import { MatchSheet } from "../components/match/MatchSheet";
import { GlassCard } from "../components/ui/GlassCard";
import { MatchCardSkeleton } from "../components/ui/Skeletons";
import { useGlobalRankings } from "../hooks/useGlobalRankings";
import { useMatches } from "../hooks/useMatches";
import { useAllPredictions } from "../hooks/usePredictions";
import { useTournaments } from "../hooks/useTournament";
import {
	getDayFullName,
	getDayLabel,
	getTodayKey,
	groupMatchesByDay,
} from "../lib/dateHelpers";
import { getNextCloseTime, isMatchPredictable } from "../lib/predictionHelpers";
import {
	deriveEmptyStateVariant,
	type EmptyStateInput,
} from "../lib/emptyStateHelpers";
import { deriveMatchCardState } from "../lib/matchCardState";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Prediction } from "../lib/types";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";

export function Dashboard() {
	const { user: currentUser } = useAuthStore();
	const { data: matches, isLoading: matchesLoading } = useMatches();

	// Load user tournaments + all predictions across tournaments
	const { data: tournaments } = useTournaments();
	const { data: allPredictions } = useAllPredictions();

	// Map tournamentId → tournament name for displaying prediction rows
	const tournamentNameMap = useMemo(() => {
		const map = new Map<string, string>();
		tournaments?.forEach((t) => {
			map.set(t.id, t.name);
		});
		return map;
	}, [tournaments]);

	// Group predictions by matchId for the Dashboard multi-torneo view
	const predictionsByMatch = useMemo(() => {
		const map = new Map<string, Prediction[]>();
		allPredictions?.forEach((p) => {
			if (!map.has(p.matchId)) map.set(p.matchId, []);
			map.get(p.matchId)?.push(p);
		});
		return map;
	}, [allPredictions]);

	// Próximo partido a cerrar — se pasa a la MatchCard correspondiente
	// para mostrar el countdown en su MatchStatusBar.
	const nextClose = useMemo(() => getNextCloseTime(matches), [matches]);

	// Generate today's date key in YYYY-MM-DD format (local time)
	// TODO: Re-evaluar todayKey en cruce de medianoche (no es reactivo).
	const todayKey = useMemo(() => getTodayKey(), []);

	// MatchSheet: id del partido seleccionado (null = sheet cerrado)
	const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
	const selectedMatch = useMemo(
		() => matches?.find((m) => m.id === selectedMatchId) ?? null,
		[matches, selectedMatchId],
	);
	const selectedMatchPredictions = useMemo(
		() =>
			selectedMatchId
				? (predictionsByMatch.get(selectedMatchId) ?? [])
				: [],
		[selectedMatchId, predictionsByMatch],
	);

	// Day filter state - default to today
	const [selectedDay, setSelectedDay] = useState<string>(todayKey);
	const pillsContainerRef = useRef<HTMLDivElement>(null);

	// Group matches by local date and sort chronologically by kick-off
	const { days, groupedMatches } = useMemo(
		() => groupMatchesByDay(matches, todayKey),
		[matches, todayKey],
	);

	// Auto-scroll pills bar to center the selected day.
	// Fix: el useEffect original solo dependía de [selectedDay], pero en el
	// primer render las pastillas no están en el DOM (gate de !matchesLoading),
	// por lo que el scroll nunca se ejecutaba al cargar la app.
	// - Se agrega matchesLoading como dependencia para re-disparar al cargar.
	// - hasScrolledRef garantiza scroll instantáneo en el mount y smooth después.
	// - Se respeta prefers-reduced-motion para accesibilidad.
	const hasScrolledRef = useRef(false);

	useEffect(() => {
		if (matchesLoading) return;

		const container = pillsContainerRef.current;
		if (!container) return;

		const activeBtn = container.querySelector(
			`[data-date="${selectedDay}"]`,
		) as HTMLElement | null;
		if (!activeBtn) return;

		const scrollLeft =
			activeBtn.offsetLeft -
			container.clientWidth / 2 +
			activeBtn.clientWidth / 2;

		const isFirstScroll = !hasScrolledRef.current;
		hasScrolledRef.current = true;

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const behavior = prefersReducedMotion || isFirstScroll ? "auto" : "smooth";

		container.scrollTo({ left: scrollLeft, behavior });
	}, [selectedDay, matchesLoading]);

	const handlePrevDay = () => {
		const currentIndex = days.indexOf(selectedDay);
		if (currentIndex > 0) {
			setSelectedDay(days[currentIndex - 1]);
		}
	};

	const handleNextDay = () => {
		const currentIndex = days.indexOf(selectedDay);
		if (currentIndex < days.length - 1) {
			setSelectedDay(days[currentIndex + 1]);
		}
	};

	// Global Rankings & User stats queries
	const { data: rankings = [], isLoading: rankingsLoading } =
		useGlobalRankings();

	const myRanking = rankings.find((r) => r.userId === currentUser?.id);
	const userInTop3 = rankings
		.slice(0, 3)
		.some((r) => r.userId === currentUser?.id);

	// Fase 2: la lógica de push toggle y la card inline de Captain Stats
	// se eliminaron del Dashboard. Ahora viven en <StatsSheet> (mobile) y
	// son accesibles desde el trigger del TopAppBar.

	// Fase 2: la card inline de Captain Stats se eliminó — ahora vive en <StatsSheet>
	// (mobile) y se mantiene accesible desde el trigger del TopAppBar.

	// Estado del StatsSheet (Fase 2) — leído del store global
	const isStatsSheetOpen = useUIStore((s) => s.isStatsSheetOpen);

	// Empty state enriquecido (Fase 2) — derivado con useMemo
	const { emptyStateVariant, nextMatchDayKey, nextMatchDayLabel } =
		useMemo(() => {
			const dayMatches = groupedMatches[selectedDay];
			const hasMatchesToday = !!dayMatches && dayMatches.length > 0;
			const hasMatchesInSeason = days.some(
				(d) => (groupedMatches[d]?.length ?? 0) > 0,
			);
			const allTodayPredicted =
				hasMatchesToday &&
				dayMatches.every(
					(m) => (predictionsByMatch.get(m.id)?.length ?? 0) > 0,
				);
			const hasPendingCountdown = nextClose !== null;

			// Buscar próximo día con partidos (después de selectedDay)
			const currentIdx = days.indexOf(selectedDay);
			const nextDayEntry =
				days
					.slice(currentIdx + 1)
					.find((d) => (groupedMatches[d]?.length ?? 0) > 0) ?? null;
			const nextDayLabel = nextDayEntry
				? getDayFullName(nextDayEntry, todayKey)
				: undefined;

			const variant = deriveEmptyStateVariant({
				hasMatchesToday,
				hasMatchesInSeason,
				allTodayPredicted,
				hasPendingCountdown,
				nextMatchDay: nextDayEntry,
			} satisfies EmptyStateInput);

			return {
				emptyStateVariant: variant,
				nextMatchDayKey: nextDayEntry,
				nextMatchDayLabel: nextDayLabel,
			};
		}, [
			groupedMatches,
			selectedDay,
			days,
			predictionsByMatch,
			nextClose,
			todayKey,
		]);

	return (
		<div className="px-4 py-8 max-w-container-max mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start relative z-10 w-full min-w-0">
			{/* Ambient glowing effect */}
			<div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			{/* Configuration warning banner */}
			{!isSupabaseConfigured && (
				<div className="lg:col-span-12 bg-red-500/10 border border-red-500/30 text-red-200 px-5 py-4 rounded-2xl flex items-start gap-3.5 animate-enter shadow-[0_0_20px_rgba(239,68,68,0.1)]">
					<span className="material-symbols-outlined text-red-400 text-2xl mt-0.5">
						warning
					</span>
					<div className="text-xs space-y-1">
						<span className="font-label-caps font-black tracking-widest uppercase text-red-400 block text-[10px]">
							Modo Simulación Activo (Offline)
						</span>
						<p className="text-secondary leading-relaxed">
							No se detectaron las variables de entorno de Supabase en el
							cliente. La aplicación está usando datos de simulación local
							(Mocks).
						</p>
						<p className="text-on-surface-variant leading-relaxed">
							Si ya creaste tu archivo{" "}
							<code className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-tertiary">
								.env.local
							</code>
							, detén tu servidor de desarrollo con{" "}
							<code className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-white">
								Ctrl + C
							</code>
							, vuelve a iniciarlo con{" "}
							<code className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-white">
								npm run dev
							</code>{" "}
							y limpia el Local Storage del navegador (o usa modo incógnito).
						</p>
					</div>
				</div>
			)}

			{/* Main Column */}
			<div className="lg:col-span-8 space-y-8 w-full min-w-0">
				{/* Editorial welcome banner (Fase 1 refresh: párrafo eliminado) */}
				<div className="relative w-full overflow-hidden p-6 md:p-8 rounded-2xl glass-card border-white/10 celestial-glow">
					<div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
					<div className="absolute -bottom-16 -left-16 w-48 h-48 bg-tertiary/5 rounded-full blur-2xl" />

					<div className="relative z-10 w-full space-y-3">
						<span className="font-label-caps text-[10px] text-tertiary uppercase tracking-widest text-glowing-gold font-bold">
							PARTIDOS DEL DÍA
						</span>
						<h1 className="font-display-lg text-2xl md:text-4xl font-extrabold text-white tracking-tight uppercase text-balance">
							BIENVENIDO DE VUELTA, CAPITÁN
						</h1>
					</div>
				</div>

				{/* StatsSheet (Fase 2) — montado pero solo visible cuando isStatsSheetOpen */}
				<StatsSheet
					isOpen={isStatsSheetOpen}
					onClose={() => useUIStore.getState().setStatsSheetOpen(false)}
				/>

				{/* MatchSheet (Fase 3) — abre al hacer clic en una MatchCard */}
				<MatchSheet
					match={selectedMatch}
					predictions={selectedMatchPredictions}
					tournaments={tournaments ?? []}
					isOpen={!!selectedMatchId}
					onClose={() => setSelectedMatchId(null)}
				/>

				{/* PRÓXIMOS PARTIDOS */}
				<section className="space-y-4">
					<div className="flex items-center justify-between px-1">
						<h2 className="font-label-caps text-xs text-on-surface-variant font-bold tracking-widest uppercase">
							PRÓXIMOS ENCUENTROS
						</h2>
						<span className="font-label-caps text-[9px] text-primary uppercase text-glowing">
							PREDICCIONES ABIERTAS
						</span>
					</div>

					{/* Day Navigation with Arrows */}
					{!matchesLoading && days.length > 0 && (
						<div className="flex items-center gap-2">
							{/* Left Arrow */}
							<button
								type="button"
								onClick={handlePrevDay}
								disabled={days.indexOf(selectedDay) <= 0}
								className="flex items-center justify-center w-10 h-[52px] rounded-2xl border border-white/5 bg-surface-container/40 text-on-surface-variant hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex-shrink-0"
							>
								<span className="material-symbols-outlined text-lg">
									chevron_left
								</span>
							</button>

							{/* Day Filter Horizontal Scroll Bar */}
							<div
								ref={pillsContainerRef}
								className="flex-1 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none mask-image-horizontal"
							>
								{days.map((dateKey) => {
									const { main, sub } = getDayLabel(dateKey, todayKey);
									const matchCount = groupedMatches[dateKey]?.length ?? 0;
									const isActive = selectedDay === dateKey;
									const isToday = dateKey === todayKey;

									let btnStyle =
										"bg-surface-container/40 border-white/5 text-on-surface-variant hover:border-white/20 hover:text-white";
									if (isActive) {
										btnStyle =
											"bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,229,255,0.15)] scale-[1.03]";
									} else if (isToday) {
										btnStyle =
											"bg-amber-500/10 border-amber-500/30 text-amber-400 hover:border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.05)]";
									}

									const fullName = getDayFullName(dateKey, todayKey);
									const matchCountLabel = `${matchCount} ${matchCount === 1 ? "partido" : "partidos"}`;
									const ariaLabel = `${fullName} ${sub}, ${matchCountLabel}${
										isToday ? ", día actual" : ""
									}${isActive ? ", seleccionado" : ""}`;

									return (
										<button
											key={dateKey}
											type="button"
											data-date={dateKey}
											onClick={() => setSelectedDay(dateKey)}
											aria-label={ariaLabel}
											className={`flex flex-col items-center justify-center min-w-[64px] h-[52px] rounded-2xl border transition-all duration-300 cursor-pointer flex-shrink-0 ${btnStyle}`}
										>
											<span className="font-label-caps text-[9px] font-bold tracking-widest uppercase">
												{main}
											</span>
											<span className="font-stat-value text-xs font-black mt-0.5 tabular-nums">
												{sub}
											</span>
										</button>
									);
								})}
							</div>

							{/* Right Arrow */}
							<button
								type="button"
								onClick={handleNextDay}
								disabled={days.indexOf(selectedDay) >= days.length - 1}
								className="flex items-center justify-center w-10 h-[52px] rounded-2xl border border-white/5 bg-surface-container/40 text-on-surface-variant hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex-shrink-0"
							>
								<span className="material-symbols-outlined text-lg">
									chevron_right
								</span>
							</button>
						</div>
					)}

					{matchesLoading ? (
						<div className="grid gap-4">
							<MatchCardSkeleton />
							<MatchCardSkeleton />
						</div>
					) : groupedMatches[selectedDay] &&
						groupedMatches[selectedDay].length > 0 ? (
						<div className="grid gap-4">
							{groupedMatches[selectedDay].map((match, idx) => {
								const matchPreds = predictionsByMatch.get(match.id) || [];
								const cardState = deriveMatchCardState(
									match,
									matchPreds.length > 0,
									isMatchPredictable(match),
								);
								// Fully predicted: el usuario pronosticó en TODOS los torneos asignados
								// en los que este partido está disponible.
								const isFullyPredicted =
									matchPreds.length >= (tournaments?.length ?? 0) &&
									(tournaments?.length ?? 0) > 0;
								return (
									<div
										key={match.id}
										data-match-id={match.id}
										className="animate-enter"
										style={{ animationDelay: `${idx * 60}ms` }}
									>
										<MatchCard
											match={match}
											predictionViewMode={true}
											predictions={matchPreds}
											tournamentNames={tournamentNameMap}
											cardState={cardState}
											isFullyPredicted={isFullyPredicted}
											predictionCount={matchPreds.length}
											onSelect={setSelectedMatchId}
										/>
									</div>
								);
							})}
						</div>
					) : (
						<DashboardEmptyState
							variant={emptyStateVariant}
							nextMatchDayKey={nextMatchDayKey ?? undefined}
							nextMatchDayLabel={nextMatchDayLabel}
							nextCloseTime={nextClose?.closesAt ?? null}
							onNavigateToNextDay={(dayKey) => setSelectedDay(dayKey)}
						/>
					)}
				</section>
			</div>
			<div className="lg:col-span-4 space-y-6 w-full min-w-0">
				{/* WIDGET RANKING GLOBAL */}
				<GlassCard
					className="p-6 rounded-2xl relative overflow-hidden border-white/10"
					glow
				>
					<div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-label-caps text-xs text-on-surface-variant tracking-wider uppercase font-bold select-none">
								RANKING GENERAL
							</h3>
							<Link
								to="/ranking"
								className="font-label-caps text-[10px] text-primary hover:text-primary/80 transition-colors uppercase font-bold select-none cursor-pointer"
							>
								VER TODO
							</Link>
						</div>

						{rankingsLoading ? (
							<div className="space-y-2 py-2">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="h-11 w-full bg-white/5 rounded-xl border border-white/5 shimmer-bg animate-pulse"
									/>
								))}
							</div>
						) : (
							<div className="space-y-2.5">
								<div className="space-y-2">
									{rankings.slice(0, 3).map((item) => {
										const isMe = item.userId === currentUser?.id;
										const medal =
											item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉";
										return (
											<div
												key={item.userId}
												className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
													isMe
														? "bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(0,229,255,0.05)]"
														: "bg-surface-container/50 border-white/5"
												}`}
											>
												<div className="flex items-center gap-2">
													<span className="text-base select-none">{medal}</span>
													<span
														className={`font-headline-md text-sm font-bold ${
															isMe ? "text-primary text-glowing" : "text-white"
														}`}
													>
														{item.displayName} {isMe && "(Vos)"}
													</span>
												</div>
												<span className="font-stat-value text-sm font-bold text-white tabular-nums">
													{item.totalPoints} PTS
												</span>
											</div>
										);
									})}
								</div>

								{!userInTop3 && myRanking && (
									<>
										<div className="border-t border-dashed border-white/10 my-2" />
										<div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/30 shadow-[0_0_12px_rgba(0,229,255,0.05)]">
											<div className="flex items-center gap-2">
												<span className="font-stat-value text-base text-primary text-glowing font-bold tabular-nums">
													#{myRanking.rank}
												</span>
												<span className="font-headline-md text-sm font-bold text-primary text-glowing">
													{myRanking.displayName} (Vos)
												</span>
											</div>
											<span className="font-stat-value text-sm font-bold text-primary text-glowing tabular-nums">
												{myRanking.totalPoints} PTS
											</span>
										</div>
									</>
								)}
							</div>
						)}
					</div>
				</GlassCard>
			</div>
		</div>
	);
}
