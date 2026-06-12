import { useEffect, useState } from "react";
import type { MatchEvent } from "../../lib/types";

interface GoalAnimationProps {
	event: MatchEvent;
	onComplete: () => void;
	isUserGoal?: boolean;
}

type GoalPhase =
	| "ball"
	| "impact"
	| "impact-exit"
	| "detail"
	| "detail-exit"
	| "done";

const BallSVG = ({ direction }: { direction: "ltr" | "rtl" }) => (
	<svg
		width="48"
		height="48"
		viewBox="0 0 48 48"
		className={
			direction === "ltr"
				? "animate-ball-cross-ltr"
				: "animate-ball-cross-rtl"
		}
	>
		<circle
			cx="24"
			cy="24"
			r="22"
			fill="white"
			stroke="#222"
			strokeWidth="1.5"
		/>
		<polygon points="24,10 30,17 28,25 20,25 18,17" fill="#222" />
		<polygon points="24,38 30,31 28,23 20,23 18,31" fill="#222" />
		<polygon points="8,24 14,18 22,20 22,28 14,30" fill="#222" />
		<polygon points="40,24 34,18 26,20 26,28 34,30" fill="#222" />
		<polygon points="16,8 22,14 20,22 12,22 10,14" fill="#222" />
	</svg>
);

const Confetti = () => {
	const particles = Array.from({ length: 18 });
	return (
		<div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
			{particles.map((_, i) => {
				const x = (Math.random() - 0.5) * 200;
				const y = -100 - Math.random() * 150;
				const rot = Math.random() * 720;
				return (
					<span
						key={i}
						className="absolute animate-confetti-fall text-tertiary"
						style={{
							left: `calc(50% + ${(Math.random() - 0.5) * 40}px)`,
							top: "50%",
							animationDelay: `${Math.random() * 0.5}s`,
							animationDuration: `${2 + Math.random() * 1}s`,
							["--confetti-x" as string]: `${x}px`,
							["--confetti-y" as string]: `${y}px`,
							["--confetti-rotation" as string]: `${rot}deg`,
						}}
					>
						⭐
					</span>
				);
			})}
		</div>
	);
};

/**
 * Animación de gol en 4 fases + confetti.
 * Fases:
 *  - "ball" (0.8s): SVG pelota cruza (ltr si home, rtl si away)
 *  - "impact" (0.3s entrada + 2s visible): "¡GOOOOOOOL!" con escala
 *  - "impact-exit" (0.5s): "¡GOOOOOOOL!" sale
 *  - "detail" (0.35s entrada + 8s visible + 0.5s salida): detalle del gol + badge "¡LO ACERTASTE!" si isUserGoal
 */
export function GoalAnimation({
	event,
	onComplete,
	isUserGoal,
}: GoalAnimationProps) {
	const [phase, setPhase] = useState<GoalPhase>("ball");
	const direction = event.team === "home" ? "ltr" : "rtl";

	useEffect(() => {
		const t1 = setTimeout(() => setPhase("impact"), 800);
		const t2 = setTimeout(() => setPhase("impact-exit"), 800 + 2300);
		const t3 = setTimeout(() => setPhase("detail"), 800 + 2300 + 500);
		const t4 = setTimeout(
			() => setPhase("detail-exit"),
			800 + 2300 + 500 + 8350,
		);
		const t5 = setTimeout(
			() => {
				setPhase("done");
				onComplete();
			},
			800 + 2300 + 500 + 8350 + 500,
		);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
			clearTimeout(t5);
		};
	}, [onComplete]);

	if (phase === "done") return null;

	return (
		<div className="absolute inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
			{/* Fase 1: Pelota */}
			{phase === "ball" && <BallSVG direction={direction} />}

			{/* Fase 2 y 3: ¡GOOOOOOOL! */}
			{(phase === "impact" || phase === "impact-exit") && (
				<span
					role="alert"
					className={`text-3xl md:text-5xl font-display-lg font-black text-primary text-glowing ${
						phase === "impact" ? "animate-goal-impact" : "animate-goal-exit"
					}`}
				>
					¡GOOOOOOOL!
				</span>
			)}

			{/* Fase 4: Detalle */}
			{(phase === "detail" || phase === "detail-exit") && (
				<div
					className={`bg-surface-container/90 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 ${
						phase === "detail"
							? "animate-detail-enter"
							: "animate-detail-exit"
					}`}
				>
					<div className="flex items-center gap-3">
						<span className="text-2xl">⚽</span>
						<div>
							<p className="text-white font-bold text-sm">
								{event.playerName}
							</p>
							<p className="text-on-surface-variant text-xs">
								{event.minute}'
								{event.extra ? `+${event.extra}` : ""}
								{event.assistName ? ` · Asist: ${event.assistName}` : ""}
							</p>
						</div>
					</div>
					{isUserGoal && (
						<div className="mt-2 text-center">
							<span className="text-xs font-black text-tertiary text-glowing-gold uppercase animate-pulse">
								🎯 ¡LO ACERTASTE!
							</span>
						</div>
					)}
				</div>
			)}

			{/* Confetti: solo si isUserGoal y durante la fase 2 (impact) */}
			{isUserGoal && phase === "impact" && <Confetti />}
		</div>
	);
}
