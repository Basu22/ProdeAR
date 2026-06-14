import { Link } from "react-router-dom";
import { useGlobalRankings } from "../../hooks/useGlobalRankings";
import { useUserStats } from "../../hooks/useUserStats";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";

export function TopAppBar() {
	const user = useAuthStore((s) => s.user);
	const { installPrompt, setInstallPrompt } = useUIStore();
	const { data: rankings = [] } = useGlobalRankings();
	const { data: stats } = useUserStats(user?.id);

	const myRanking = user ? rankings.find((r) => r.userId === user.id) : null;
	const totalPoints = myRanking ? myRanking.totalPoints : 0;
	const currentStreak = stats?.currentStreak ?? 0;

	const handleInstallClick = async () => {
		if (!installPrompt) return;

		try {
			await installPrompt.prompt();
			const { outcome } = await installPrompt.userChoice;
			if (outcome === "accepted") {
				console.log("PWA install accepted");
			}
			setInstallPrompt(null);
		} catch (error) {
			console.error("PWA install failed", error);
		}
	};

	if (!user) return null;

	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
			<div className="flex items-center justify-between px-4 md:px-8 h-16 max-w-container-max mx-auto w-full">
				<Link to="/dashboard" className="flex items-center gap-2 group">
					<img
						src="/logo.png"
						alt="Logo"
						className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
					/>
					<h1 className="font-headline-md text-xl font-black text-white tracking-tighter uppercase select-none flex items-center gap-1.5">
						Prode<span className="text-primary text-glowing">AR</span>
					</h1>
				</Link>

				<div className="flex items-center gap-2 md:gap-4">
					{installPrompt && (
						<button
							type="button"
							onClick={handleInstallClick}
							className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase active:scale-[0.96] transition-all cursor-pointer"
							title="Instalar App"
						>
							<span className="material-symbols-outlined text-sm">
								download
							</span>
							<span>Instalar</span>
						</button>
					)}

					{/* Trigger del StatsSheet (Fase 2): un solo botón que envuelve PTS + racha */}
					<button
						type="button"
						onClick={() => useUIStore.getState().setStatsSheetOpen(true)}
						aria-label={`Ver estadísticas: ${totalPoints.toLocaleString()} puntos${currentStreak >= 3 ? `, racha de ${currentStreak}` : ""}`}
						aria-haspopup="dialog"
						className="flex items-center gap-2 rounded-full hover:bg-white/5 active:scale-[0.97] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 p-1 -m-1"
					>
						<div className="flex items-center gap-2 bg-surface-container px-3.5 py-1.5 rounded-full border border-white/5 shadow-inner">
							<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
							<span className="font-label-caps text-[11px] text-white font-bold select-none tabular-nums">
								{totalPoints.toLocaleString()}{" "}
								<span className="text-primary">PTS</span>
							</span>
						</div>

						{/* E3 — Racha (visible solo si currentStreak >= 3) */}
						{currentStreak >= 3 && (
							<div
								className="flex items-center gap-1.5 bg-tertiary/10 border border-tertiary/25 shadow-[0_0_12px_rgba(255,214,0,0.08)] px-2.5 py-1.5 rounded-full"
								role="status"
								aria-label={`Racha de ${currentStreak} aciertos`}
								title={`Racha de ${currentStreak} aciertos`}
							>
								<span className="material-symbols-outlined text-base text-tertiary text-glowing-gold">
									local_fire_department
								</span>
								<span className="font-stat-value text-sm font-bold text-tertiary tabular-nums">
									{currentStreak}
								</span>
							</div>
						)}
					</button>

					<button
						type="button"
						onClick={() => useAuthStore.getState().logout()}
						className="text-on-surface-variant hover:text-error hover:bg-error/10 p-2.5 rounded-full transition-[background-color,color,transform] duration-200 active:scale-[0.96] cursor-pointer"
						title="Cerrar Sesión"
					>
						<span className="material-symbols-outlined text-lg">logout</span>
					</button>
				</div>
			</div>
		</header>
	);
}
