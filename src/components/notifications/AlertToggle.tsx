import { useId } from "react";

export type AlertToggleState = "off" | "on" | "blocked" | "loading";

export interface AlertToggleProps {
	state: AlertToggleState;
	onToggle: () => void;
	onBlockedClick?: () => void;
	disabled?: boolean;
	/** Clases extra para el wrapper (opcional). */
	className?: string;
}

/**
 * Toggle premium de Alertas Push para ProdeAR.
 *
 * - Controlled component: el estado vive en el padre.
 * - 4 estados visuales: off, on, blocked, loading.
 * - Cross-fade de íconos sin librería (CSS transitions).
 * - Spinner inline SVG.
 * - Hit area 44px de alto por sí solo.
 * - Respeta prefers-reduced-motion vía `motion-reduce:`.
 */
export function AlertToggle({
	state,
	onToggle,
	onBlockedClick,
	disabled = false,
	className = "",
}: AlertToggleProps) {
	const labelId = useId();

	const isOn = state === "on";
	const isBlocked = state === "blocked";
	const isLoading = state === "loading";
	const isInteractive = !disabled && !isBlocked && !isLoading;

	// Mapeo estado → estilos (concentración de variantes en un solo lugar)
	const trackClass = isOn
		? "bg-primary/20 border-primary/40 shadow-[0_0_12px_rgba(0,229,255,0.18)]"
		: isBlocked
			? "bg-amber-500/10 border-amber-500/40"
			: "bg-surface-container-highest border-white/10";

	const thumbClass = isOn
		? "bg-primary shadow-[0_0_10px_rgba(0,229,255,0.85),inset_0_0_0_1px_rgba(255,255,255,0.25)]"
		: isBlocked
			? "bg-amber-500/55 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]"
			: "bg-on-surface-variant/70 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]";

	const ariaLabel =
		state === "off"
			? "Notificaciones push desactivadas. Toca para activarlas."
			: state === "on"
				? "Notificaciones push activadas. Toca para desactivarlas."
				: state === "blocked"
					? "Notificaciones push bloqueadas por el navegador. Toca el ícono de información para ver cómo rehabilitarlas."
					: "Procesando tu solicitud de notificaciones";

	return (
		<div
			className={`flex items-center justify-between gap-3 select-none ${className}`}
		>
			{/* ==== LADO IZQUIERDO: ícono + label + badge ==== */}
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{/* Cross-fade de íconos (ambos en el DOM, absoluto el segundo) */}
				<div className="relative w-[18px] h-[18px] flex-shrink-0">
					{/* Ícono "off/blocked" — visible cuando NO está en on */}
					<span
						aria-hidden="true"
						className={`absolute inset-0 flex items-center justify-center material-symbols-outlined text-[18px]
							transition-[opacity,transform,filter] duration-200 ease-out
							motion-reduce:transition-none
							${
								isOn
									? "opacity-0 scale-[0.25] blur-[4px]"
									: `opacity-100 scale-100 blur-0 ${isBlocked ? "text-amber-500" : "text-on-surface-variant"}`
							}`}
					>
						{isBlocked ? "notifications_paused" : "notifications_off"}
					</span>
					{/* Ícono "on" — visible cuando SÍ está en on */}
					<span
						aria-hidden="true"
						className={`absolute inset-0 flex items-center justify-center material-symbols-outlined text-[18px]
							transition-[opacity,transform,filter] duration-200 ease-out
							motion-reduce:transition-none
							${isOn ? "opacity-100 scale-100 blur-0 text-primary text-glowing" : "opacity-0 scale-[0.25] blur-[4px] text-primary"}`}
					>
						notifications_active
					</span>
				</div>

				{/* Label + sub-badge */}
				<div id={labelId} className="flex flex-col min-w-0 leading-tight">
					<span className="font-label-caps text-[9px] text-on-surface-variant font-bold uppercase tracking-wider truncate">
						Alertas en vivo (Push)
					</span>
					{/* Sub-badge contextual por estado */}
					<span
						aria-hidden="true"
						className={`font-label-caps text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5
							transition-opacity duration-200 ease-out motion-reduce:transition-none
							${
								isOn
									? "opacity-100 text-primary text-glowing"
									: isBlocked
										? "opacity-100 text-amber-500"
										: "opacity-0"
							}`}
					>
						{isOn && (
							<span className="relative inline-flex w-1.5 h-1.5 flex-shrink-0">
								<span className="absolute inset-0 rounded-full bg-primary opacity-75 animate-ping motion-reduce:animate-none" />
								<span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-primary" />
							</span>
						)}
						{isOn ? "Activo" : isBlocked ? "Bloqueado por el navegador" : ""}
					</span>
				</div>
			</div>

			{/* ==== LADO DERECHO: CTA info (blocked) + toggle ==== */}
			<div className="flex items-center gap-1.5 flex-shrink-0">
				{isBlocked && onBlockedClick && (
					<button
						type="button"
						onClick={onBlockedClick}
						aria-label="Cómo rehabilitar las notificaciones del navegador"
						className="relative w-8 h-8 rounded-full flex items-center justify-center
							text-amber-500 hover:bg-amber-500/10 active:bg-amber-500/15
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60
							transition-[background-color,transform] duration-150 ease-out
							active:scale-[0.96] motion-reduce:transition-none cursor-pointer"
					>
						<span className="material-symbols-outlined text-[16px]">info</span>
					</button>
				)}

				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-busy={isLoading}
					aria-labelledby={labelId}
					aria-label={ariaLabel}
					onClick={onToggle}
					disabled={!isInteractive}
					className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border
						transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out
						motion-reduce:transition-none
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface
						active:scale-[0.96] motion-reduce:active:scale-100
						${isInteractive ? "cursor-pointer" : "cursor-not-allowed"}
						${trackClass}`}
				>
					{/* Thumb con spinner overlay en loading */}
					<span
						aria-hidden="true"
						className={`pointer-events-none absolute top-[2px] left-[2px]
							inline-flex items-center justify-center
							h-5 w-5 rounded-full
							transition-[transform,background-color,box-shadow,opacity] duration-200 ease-out
							motion-reduce:transition-none
							${isOn ? "translate-x-5" : "translate-x-0"}
							${isLoading ? "opacity-90" : "opacity-100"}
							${thumbClass}`}
					>
						{isLoading && (
							<svg
								className="animate-spin motion-reduce:animate-none"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								aria-hidden="true"
							>
								<circle
									cx="12"
									cy="12"
									r="9"
									stroke="currentColor"
									strokeOpacity="0.25"
									strokeWidth="3"
								/>
								<path
									d="M21 12a9 9 0 0 0-9-9"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
								/>
							</svg>
						)}
					</span>
				</button>
			</div>
		</div>
	);
}

export default AlertToggle;
