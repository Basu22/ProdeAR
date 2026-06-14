import { useState } from "react";
import { useAlertToggleState } from "../../hooks/useAlertToggleState";
import { useGlobalRankings } from "../../hooks/useGlobalRankings";
import { useUserStats } from "../../hooks/useUserStats";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { AlertToggle } from "../notifications/AlertToggle";
import { BottomSheet } from "../ui/BottomSheet";

export interface StatsSheetProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Contenido específico del bottom sheet de estadísticas.
 * Reutiliza los hooks existentes (useUserStats, useGlobalRankings, useAlertToggleState).
 */
export function StatsSheet({ isOpen, onClose }: StatsSheetProps) {
	const { user: currentUser } = useAuthStore();
	const { data: stats } = useUserStats(currentUser?.id);
	const { data: rankings = [] } = useGlobalRankings();
	const pushState = useAlertToggleState();
	const isPushSupported = useNotificationStore((s) => s.isSupported);
	const pushEnabled = useNotificationStore((s) => s.pushEnabled);
	const subscribe = useNotificationStore((s) => s.subscribe);
	const unsubscribe = useNotificationStore((s) => s.unsubscribe);
	const [pushLoading, setPushLoading] = useState(false);

	const handleTogglePush = async () => {
		if (!currentUser) return;
		setPushLoading(true);
		try {
			if (pushEnabled) {
				await unsubscribe();
			} else {
				await subscribe(currentUser.id);
			}
		} finally {
			setPushLoading(false);
		}
	};

	const myRanking = currentUser
		? rankings.find((r) => r.userId === currentUser.id)
		: null;
	const rank = myRanking?.rank ?? "-";
	const totalPoints = myRanking?.totalPoints ?? 0;
	const currentStreak = stats?.currentStreak ?? 0;
	const exactHits = stats?.exactHits ?? 0;
	const partialHits = stats?.partialHits ?? 0;
	const effectiveness = stats?.effectiveness ?? 0;
	const maxStreak = stats?.maxStreak ?? 0;

	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={onClose}
			ariaLabel="Estadísticas del capitán"
		>
			<div className="space-y-5 pt-2">
				{/* Header */}
				<h2 className="font-label-caps text-xs text-on-surface-variant font-bold tracking-widest uppercase">
					Estadísticas del Capitán
				</h2>

				{/* 3 metric cards principales */}
				<div className="grid grid-cols-3 gap-3">
					<div className="bg-surface-container rounded-xl p-3 border border-white/5 text-center">
						<p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
							RANK
						</p>
						<p className="font-stat-value text-xl font-bold text-primary tabular-nums">
							#{rank}
						</p>
					</div>
					<div className="bg-surface-container rounded-xl p-3 border border-white/5 text-center">
						<p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
							PTS
						</p>
						<p className="font-stat-value text-xl font-bold text-white tabular-nums">
							{totalPoints.toLocaleString()}
						</p>
					</div>
					<div
						className={`bg-surface-container rounded-xl p-3 border text-center ${
							currentStreak >= 3 ? "border-tertiary/30" : "border-white/5"
						}`}
					>
						<p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
							RACHA
						</p>
						<p
							className={`font-stat-value text-xl font-bold tabular-nums ${
								currentStreak >= 3 ? "text-tertiary" : "text-on-surface-variant"
							}`}
						>
							🔥 {currentStreak}
						</p>
					</div>
				</div>

				{/* Detalle */}
				<div className="bg-surface-container/50 rounded-2xl p-4 border border-white/5 space-y-4">
					{/* Aciertos */}
					<div className="grid grid-cols-2 gap-3">
						<div className="text-center">
							<p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
								Exacto
							</p>
							<p className="font-stat-value text-lg font-bold text-primary tabular-nums">
								{exactHits} ⚽
							</p>
						</div>
						<div className="text-center">
							<p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
								Parcial
							</p>
							<p className="font-stat-value text-lg font-bold text-white tabular-nums">
								{partialHits} 🎯
							</p>
						</div>
					</div>

					{/* Efectividad */}
					<div>
						<div className="flex justify-between items-center font-label-caps text-[10px] text-on-surface-variant mb-1.5">
							<span className="uppercase">Efectividad</span>
							<span className="text-primary font-bold tabular-nums">
								{effectiveness}%
							</span>
						</div>
						<div className="h-1.5 w-full bg-outline-variant rounded-full overflow-hidden">
							<div
								className="h-full bg-primary rounded-full transition-all duration-500"
								style={{ width: `${effectiveness}%` }}
							/>
						</div>
					</div>

					{/* Rachas */}
					<div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
						<div className="text-center">
							<p className="font-label-caps text-[8px] text-on-surface-variant uppercase">
								Racha actual
							</p>
							<p className="font-stat-value text-base font-bold text-tertiary tabular-nums">
								🔥 {currentStreak}
							</p>
						</div>
						<div className="text-center">
							<p className="font-label-caps text-[8px] text-on-surface-variant uppercase">
								Récord
							</p>
							<p className="font-stat-value text-base font-bold text-white tabular-nums">
								⭐ {maxStreak}
							</p>
						</div>
					</div>
				</div>

				{/* Push toggle (integrado en sheet) */}
				{isPushSupported && (
					<div className="pt-3 border-t border-white/5">
						<AlertToggle
							state={pushLoading ? "loading" : pushState}
							onToggle={handleTogglePush}
							disabled={pushLoading}
						/>
					</div>
				)}
			</div>
		</BottomSheet>
	);
}
