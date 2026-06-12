import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MatchCard } from "../components/match/MatchCard";
import { AlertToggle } from "../components/notifications/AlertToggle";
import { BlockedNotificationsModal } from "../components/notifications/BlockedNotificationsModal";
import { GlassCard } from "../components/ui/GlassCard";
import { MatchCardSkeleton } from "../components/ui/Skeletons";
import { useAlertToggleState } from "../hooks/useAlertToggleState";
import { useGlobalRankings } from "../hooks/useGlobalRankings";
import { useMatches } from "../hooks/useMatches";
import { useAllPredictions } from "../hooks/usePredictions";
import { useTournaments } from "../hooks/useTournament";
import { useUserStats } from "../hooks/useUserStats";
import { useNotificationStore } from "../stores/notificationStore";
import {
	getDayFullName,
	getDayLabel,
	getTodayKey,
	groupMatchesByDay,
} from "../lib/dateHelpers";
import { isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import type { Prediction } from "../lib/types";

export function Dashboard() {
	const { user: currentUser } = useAuthStore();
	const { data: matches, isLoading: matchesLoading } = useMatches();

	// Load user tournaments + all predictions across tournaments
	const { data: tournaments } = useTournaments();
	const { data: allPredictions } = useAllPredictions();

	// Map tournamentId → tournament name for displaying prediction rows
	const tournamentNameMap = useMemo(() => {
		const map = new Map<string, string>();
		tournaments?.forEach((t) => map.set(t.id, t.name));
		return map;
	}, [tournaments]);

	// Group predictions by matchId for the Dashboard multi-torneo view
	const predictionsByMatch = useMemo(() => {
		const map = new Map<string, Prediction[]>();
		allPredictions?.forEach((p) => {
			if (!map.has(p.matchId)) map.set(p.matchId, []);
			map.get(p.matchId)!.push(p);
		});
		return map;
	}, [allPredictions]);

	// Generate today's date key in YYYY-MM-DD format (local time)
	// TODO: Re-evaluar todayKey en cruce de medianoche (no es reactivo).
	const todayKey = useMemo(() => getTodayKey(), []);

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
	const { data: stats } = useUserStats(currentUser?.id);

	const myRanking = rankings.find((r) => r.userId === currentUser?.id);
	const userInTop3 = rankings
		.slice(0, 3)
		.some((r) => r.userId === currentUser?.id);

	const [showBlockedHelp, setShowBlockedHelp] = useState(false);

	// Estado y acciones vienen del notificationStore (Zustand global).
	// El hook `useAlertToggleState` deriva el AlertToggleState desde los facts crudos.
	const pushState = useAlertToggleState();
	const isPushSupported = useNotificationStore((s) => s.isSupported);
	const pushEnabled = useNotificationStore((s) => s.pushEnabled);
	const subscribe = useNotificationStore((s) => s.subscribe);
	const unsubscribe = useNotificationStore((s) => s.unsubscribe);

	const togglePush = async () => {
		if (!currentUser) return;
		try {
			if (pushEnabled) {
				const result = await unsubscribe();
				if (!result.success) {
					console.error("Error al desactivar push:", result.error);
				}
			} else {
				const result = await subscribe(currentUser.id);
				if (!result.success) {
					const prefix = result.blocked ? "🔕" : "❌";
					alert(`${prefix} ${result.error}`);
				}
			}
		} catch (err) {
			console.error(err);
			alert(
				err instanceof Error
					? err.message
					: "Error al configurar notificaciones",
			);
		}
	};

	const renderCaptainStats = () => (
		<GlassCard
			className="p-6 rounded-2xl relative overflow-hidden border-white/10"
			glow
		>
			<div className="absolute top-0 right-0 p-4">
				<span className="font-label-caps text-[9px] bg-tertiary/10 text-tertiary px-2 py-0.5 rounded border border-tertiary/25 font-bold select-none">
					RANK #{myRanking?.rank ?? "-"}
				</span>
			</div>

			<div className="space-y-4">
				<h3 className="font-label-caps text-xs text-on-surface-variant tracking-wider uppercase font-bold select-none">
					ESTADÍSTICAS DEL CAPITÁN
				</h3>

				<div className="flex items-center gap-4">
					<div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xl font-bold select-none">
						{(currentUser?.displayName || "Vos").slice(0, 2).toUpperCase()}
					</div>
					<div>
						<h4 className="font-headline-md text-base text-white truncate max-w-[150px]">
							{currentUser?.displayName || "Vos"}
						</h4>
						<p className="font-body-md text-xs text-on-surface-variant select-none">
							Miembro premium desde 2026
						</p>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3 pt-2">
					<div className="bg-surface-container rounded-lg p-3 border border-white/5 text-center">
						<p className="font-label-caps text-[9px] text-on-surface-variant uppercase select-none">
							ACIERTO EXACTO
						</p>
						<p className="font-stat-value text-xl font-bold text-primary tracking-tight tabular-nums">
							{stats?.exactHits ?? 0}
						</p>
					</div>
					<div className="bg-surface-container rounded-lg p-3 border border-white/5 text-center">
						<p className="font-label-caps text-[9px] text-on-surface-variant uppercase select-none">
							ACIERTO PARCIAL
						</p>
						<p className="font-stat-value text-xl font-bold text-white tracking-tight tabular-nums">
							{stats?.partialHits ?? 0}
						</p>
					</div>
				</div>

				<div className="pt-2">
					<div className="flex justify-between items-center font-label-caps text-[10px] text-on-surface-variant mb-1 select-none">
						<span>EFECTIVIDAD DE PRONÓSTICO</span>
						<span className="text-primary font-bold tabular-nums">
							{stats?.effectiveness ?? 0}%
						</span>
					</div>
					<div className="h-1.5 w-full bg-outline-variant rounded-full overflow-hidden">
						<div
							className="h-full bg-primary rounded-full"
							style={{ width: `${stats?.effectiveness ?? 0}%` }}
						/>
					</div>
				</div>

				{/* Streaks */}
				<div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 mt-3 select-none">
					<div className="bg-surface-container/50 rounded-lg p-2.5 border border-white/5 text-center">
						<p className="font-label-caps text-[8px] text-on-surface-variant uppercase">
							RACHA ACTUAL
						</p>
						<p className="font-stat-value text-lg font-bold text-tertiary tracking-tight tabular-nums">
							{stats?.currentStreak ?? 0} 🔥
						</p>
					</div>
					<div className="bg-surface-container/50 rounded-lg p-2.5 border border-white/5 text-center">
						<p className="font-label-caps text-[8px] text-on-surface-variant uppercase">
							RÉCORD CONSECUTIVO
						</p>
						<p className="font-stat-value text-lg font-bold text-white tracking-tight tabular-nums">
							{stats?.maxStreak ?? 0} ⭐
						</p>
					</div>
				</div>

				{/* Notificaciones Push Toggle */}
				{isPushSupported && (
					<div className="pt-3.5 border-t border-white/5 mt-3.5">
						<AlertToggle
							state={pushState}
							onToggle={togglePush}
							onBlockedClick={() => setShowBlockedHelp(true)}
						/>
					</div>
				)}
			</div>
		</GlassCard>
	);

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
				{/* Editorial welcome banner */}
				<div className="relative w-full overflow-hidden p-6 md:p-8 rounded-2xl glass-card border-white/10 celestial-glow">
					<div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
					<div className="absolute -bottom-16 -left-16 w-48 h-48 bg-tertiary/5 rounded-full blur-2xl" />

					<div className="relative z-10 w-full space-y-3">
						<span className="font-label-caps text-[10px] text-tertiary uppercase tracking-widest text-glowing-gold font-bold">
							ESTADO DEL TORNEO • JORNADA 10
						</span>
						<h1 className="font-display-lg text-2xl md:text-4xl font-extrabold text-white tracking-tight uppercase text-balance">
							BIENVENIDO DE VUELTA, CAPITÁN
						</h1>
						<p className="font-body-md text-sm md:text-base text-secondary max-w-2xl leading-relaxed text-pretty">
							La fecha 10 está en marcha. Hay un partido en vivo ahora mismo y
							las predicciones para los próximos encuentros cierran
							estrictamente 15 minutos antes de cada partido.
						</p>
					</div>
				</div>

				{/* ESTADÍSTICAS DEL CAPITÁN (SÓLO MOBILE) */}
				<div className="block lg:hidden mb-6">{renderCaptainStats()}</div>

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
							{groupedMatches[selectedDay].map((match, idx) => (
								<div
									key={match.id}
									className="animate-enter"
									style={{ animationDelay: `${idx * 60}ms` }}
								>
									<MatchCard
										match={match}
										predictionViewMode={true}
										predictions={predictionsByMatch.get(match.id) || []}
										tournamentNames={tournamentNameMap}
									/>
								</div>
							))}
						</div>
					) : (
						<div className="bg-surface-container/30 border border-white/5 rounded-2xl p-6 text-center py-10">
							<span className="material-symbols-outlined text-amber-500 text-3xl mb-2 stadium-glow-gold">
								calendar_today
							</span>
							<p className="font-headline-md text-sm text-white uppercase tracking-wider">
								{selectedDay === todayKey
									? "No hay partidos programados para HOY"
									: "No hay partidos programados"}
							</p>
							<p className="font-body-md text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
								{selectedDay === todayKey
									? "Navegá entre las fechas usando las flechas para ver los partidos de los próximos días."
									: "Probá seleccionando otro día."}
							</p>
						</div>
					)}
				</section>
			</div>
			<div className="lg:col-span-4 space-y-6 w-full min-w-0">
				{/* ESTADÍSTICAS DEL CAPITÁN (SÓLO ESCRITORIO) */}
				<div className="hidden lg:block">{renderCaptainStats()}</div>

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

			<BlockedNotificationsModal
				isOpen={showBlockedHelp}
				onClose={() => setShowBlockedHelp(false)}
			/>
		</div>
	);
}
