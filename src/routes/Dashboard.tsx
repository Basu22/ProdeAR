import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MatchCard } from "../components/match/MatchCard";
import { GlassCard } from "../components/ui/GlassCard";
import { MatchCardSkeleton } from "../components/ui/Skeletons";
import { useGlobalRankings } from "../hooks/useGlobalRankings";
import { useMatches } from "../hooks/useMatches";
import { usePredictions, useSavePrediction } from "../hooks/usePredictions";
import { useTournaments } from "../hooks/useTournament";
import { useUserStats } from "../hooks/useUserStats";
import { pushApi } from "../lib/api/push";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Match } from "../lib/types";
import { useAuthStore } from "../stores/authStore";

export function Dashboard() {
	const { user: currentUser } = useAuthStore();
	const { data: matches, isLoading: matchesLoading } = useMatches();

	// Load user tournaments to find active one for predictions on Dashboard
	const { data: tournaments } = useTournaments();
	const activeTournament = tournaments?.[0];
	const { data: predictions } = usePredictions(activeTournament?.id || "");
	const { mutate: savePrediction } = useSavePrediction();

	// Generate today's date key in YYYY-MM-DD format (local time)
	const todayKey = useMemo(() => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}, []);

	// Day filter state - default to today
	const [selectedDay, setSelectedDay] = useState<string>(todayKey);
	const pillsContainerRef = useRef<HTMLDivElement>(null);

	// Group matches by local date and sort chronologically by kick-off
	const { days, groupedMatches } = useMemo(() => {
		if (!matches) {
			const groups: Record<string, Match[]> = {};
			groups[todayKey] = [];
			return { days: [todayKey], groupedMatches: groups };
		}

		const sorted = [...matches].sort(
			(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
		);

		const groups: Record<string, Match[]> = {};
		const uniqueDays: string[] = [];

		for (const match of sorted) {
			const date = new Date(match.kickOff);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			const dateKey = `${year}-${month}-${day}`;

			if (!groups[dateKey]) {
				groups[dateKey] = [];
				uniqueDays.push(dateKey);
			}
			groups[dateKey].push(match);
		}

		// Ensure today's date is ALWAYS present in the days array
		if (!uniqueDays.includes(todayKey)) {
			uniqueDays.push(todayKey);
			uniqueDays.sort();
		}
		if (!groups[todayKey]) {
			groups[todayKey] = [];
		}

		return { days: uniqueDays, groupedMatches: groups };
	}, [matches, todayKey]);

	// Auto-scroll pills bar to center the selected day
	useEffect(() => {
		const container = pillsContainerRef.current;
		if (!container) return;
		const activeBtn = container.querySelector(
			`[data-date="${selectedDay}"]`,
		) as HTMLElement | null;
		if (activeBtn) {
			const scrollLeft =
				activeBtn.offsetLeft -
				container.clientWidth / 2 +
				activeBtn.clientWidth / 2;
			container.scrollTo({ left: scrollLeft, behavior: "smooth" });
		}
	}, [selectedDay]);

	const getDayLabel = (dateKey: string) => {
		const [year, month, day] = dateKey.split("-").map(Number);
		const d = new Date(year, month - 1, day);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);

		const matchDate = new Date(d);
		matchDate.setHours(0, 0, 0, 0);

		if (matchDate.getTime() === today.getTime()) {
			return { main: "Hoy", sub: String(day) };
		}
		if (matchDate.getTime() === tomorrow.getTime()) {
			return { main: "Mañ", sub: String(day) };
		}

		const main = d
			.toLocaleDateString("es-AR", { weekday: "short" })
			.replace(".", "")
			.toUpperCase();
		return { main, sub: String(day) };
	};

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

	const [pushEnabled, setPushEnabled] = useState(false);
	const [isPushLoading, setIsPushLoading] = useState(false);

	useEffect(() => {
		const checkPushState = async () => {
			if (pushApi.isSupported()) {
				const state = await pushApi.getSubscriptionState();
				setPushEnabled(state);
			}
		};
		checkPushState();
	}, []);

	const togglePush = async () => {
		if (!currentUser) return;
		setIsPushLoading(true);
		try {
			if (pushEnabled) {
				await pushApi.unsubscribeUser();
				setPushEnabled(false);
			} else {
				const success = await pushApi.subscribeUser(currentUser.id);
				if (success) {
					setPushEnabled(true);
				}
			}
		} catch (err) {
			console.error(err);
			alert(
				err instanceof Error
					? err.message
					: "Error al configurar notificaciones",
			);
		} finally {
			setIsPushLoading(false);
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
				{pushApi.isSupported() && (
					<div className="flex items-center justify-between pt-3.5 border-t border-white/5 mt-3.5 select-none">
						<div className="flex items-center gap-2">
							<span
								className={`material-symbols-outlined text-[18px] transition-colors ${pushEnabled ? "text-primary" : "text-on-surface-variant"}`}
							>
								{pushEnabled ? "notifications_active" : "notifications_off"}
							</span>
							<span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
								Alertas en vivo (Push)
							</span>
						</div>
						<button
							type="button"
							onClick={togglePush}
							disabled={isPushLoading}
							className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-white/10 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
								pushEnabled
									? "bg-primary/20 border-primary/40"
									: "bg-surface-container-highest"
							}`}
						>
							<span
								className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
									pushEnabled
										? "translate-x-4 bg-primary shadow-[0_0_8px_rgba(0,229,255,0.8)]"
										: "translate-x-0"
								}`}
							/>
						</button>
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
									const { main, sub } = getDayLabel(dateKey);
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

									return (
										<button
											key={dateKey}
											type="button"
											data-date={dateKey}
											onClick={() => setSelectedDay(dateKey)}
											className={`flex flex-col items-center justify-center min-w-[64px] h-[52px] rounded-2xl border transition-all duration-300 cursor-pointer flex-shrink-0 ${btnStyle}`}
										>
											<span className="font-label-caps text-[9px] font-bold tracking-widest uppercase">
												{main}
											</span>
											<span className="font-stat-value text-xs font-black mt-0.5 tabular-nums">
												{sub}{" "}
												<span className="text-[9px] font-normal opacity-70">
													({matchCount})
												</span>
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
								const pred = predictions?.find((p) => p.matchId === match.id);
								return (
									<div
										key={match.id}
										className="animate-enter"
										style={{ animationDelay: `${idx * 60}ms` }}
									>
								<MatchCard
									match={match}
									predictionViewMode={true}
									tournamentName={activeTournament?.name}
									prediction={pred}
								/>
									</div>
								);
							})}
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
		</div>
	);
}
