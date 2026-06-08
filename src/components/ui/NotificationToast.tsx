import { BellRing, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { playGoalSound } from "../../lib/audio";

interface Toast {
	id: string;
	type: "goal" | "finished";
	title: string;
	body: string;
	homeTeam?: string;
	awayTeam?: string;
	homeScore?: number;
	awayScore?: number;
}

export function NotificationToast() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		const handleGoal = (e: Event) => {
			const detail = (e as CustomEvent).detail;

			// Play the audio cheer/whistle
			playGoalSound();

			const newToast: Toast = {
				id: `toast-${Math.random().toString(36).substring(2, 9)}`,
				type: "goal",
				title: "⚽ ¡GOOOOL SIMULADO!",
				body: `En el min ${detail.minute}': ${detail.homeTeam} ${detail.homeScore} - ${detail.awayScore} ${detail.awayTeam}. ¡Gol de ${detail.playerName}!`,
				homeTeam: detail.homeTeam,
				awayTeam: detail.awayTeam,
				homeScore: detail.homeScore,
				awayScore: detail.awayScore,
			};

			setToasts((prev) => [...prev, newToast]);
		};

		const handleFinished = (e: Event) => {
			const detail = (e as CustomEvent).detail;

			// Play audio cheer/whistle
			playGoalSound();

			const pointsText =
				detail.pointsEarned > 0
					? `¡Sumaste +${detail.pointsEarned} pts!`
					: "Pronóstico errado (0 pts).";

			const ranksText =
				detail.userRanks && detail.userRanks.length > 0
					? ` Posición: ${detail.userRanks.map((ur: { rank: number; tournamentName: string }) => `#${ur.rank} en ${ur.tournamentName}`).join(", ")}.`
					: "";

			const newToast: Toast = {
				id: `toast-${Math.random().toString(36).substring(2, 9)}`,
				type: "finished",
				title: "🏁 PARTIDO FINALIZADO (SIM.)",
				body: `${detail.homeTeam} ${detail.homeScore} - ${detail.awayScore} ${detail.awayTeam}. ${pointsText}${ranksText}`,
				homeTeam: detail.homeTeam,
				awayTeam: detail.awayTeam,
				homeScore: detail.homeScore,
				awayScore: detail.awayScore,
			};

			setToasts((prev) => [...prev, newToast]);
		};

		window.addEventListener("prodear-local-goal", handleGoal);
		window.addEventListener("prodear-local-finished", handleFinished);

		return () => {
			window.removeEventListener("prodear-local-goal", handleGoal);
			window.removeEventListener("prodear-local-finished", handleFinished);
		};
	}, []);

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-[380px] pointer-events-none px-4 md:px-0">
			{toasts.map((toast) => (
				<ToastItem
					key={toast.id}
					toast={toast}
					onClose={() => removeToast(toast.id)}
				/>
			))}
		</div>
	);
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 7000); // Dismiss after 7 seconds

		return () => clearTimeout(timer);
	}, [onClose]);

	const isGoal = toast.type === "goal";

	return (
		<div
			className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-md p-4 flex gap-3.5 shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 ${
				isGoal
					? "bg-surface-container/90 border-primary/30 shadow-primary/5 shadow-2xl"
					: "bg-surface-container/90 border-tertiary/30 shadow-tertiary/5 shadow-2xl"
			}`}
		>
			{/* Icon / Status */}
			<div className="flex-shrink-0 flex items-center justify-center">
				<div
					className={`w-10 h-10 rounded-full flex items-center justify-center ${
						isGoal
							? "bg-primary/10 text-primary"
							: "bg-tertiary/10 text-tertiary"
					}`}
				>
					{isGoal ? (
						<BellRing className="w-5 h-5 animate-bounce" />
					) : (
						<Trophy className="w-5 h-5" />
					)}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 space-y-1 pr-4">
				<h4
					className={`font-label-caps text-xs font-black tracking-wider ${
						isGoal
							? "text-primary text-glowing"
							: "text-tertiary text-glowing-gold"
					}`}
				>
					{toast.title}
				</h4>
				<p className="font-body-md text-xs text-white leading-relaxed font-semibold">
					{toast.body}
				</p>
			</div>

			{/* Close Button */}
			<button
				onClick={onClose}
				type="button"
				className="flex-shrink-0 self-start text-on-surface-variant hover:text-white transition-colors cursor-pointer"
			>
				<X className="w-4 h-4" />
			</button>

			{/* Progress Shimmer Line */}
			<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
				<div
					className={`h-full transition-all ease-linear duration-[7000ms] ${
						isGoal ? "bg-primary" : "bg-tertiary"
					}`}
					style={{
						animation: "toastProgress 7s linear forwards",
					}}
				/>
			</div>

			{/* Inline styling keyframe for toast progress */}
			<style>{`
				@keyframes toastProgress {
					from { width: 100%; }
					to { width: 0%; }
				}
			`}</style>
		</div>
	);
}
