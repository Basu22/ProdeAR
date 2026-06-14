/**
 * LiveBadge — Badge "EN VIVO" pulsante.
 *
 * Se muestra en el header de GroupTable cuando un grupo tiene un partido
 * en curso. Usa el keyframe `animate-live-pulse` para el punto rojo.
 *
 * Variantes:
 * - `default`: rojo (color: var(--color-error))
 * - `compact`: solo el punto pulsante, sin texto (para espacios reducidos)
 */

interface LiveBadgeProps {
	/** Variante: "default" muestra texto + punto, "compact" solo punto. */
	variant?: "default" | "compact";
	className?: string;
}

export function LiveBadge({ variant = "default", className = "" }: LiveBadgeProps) {
	if (variant === "compact") {
		return (
			<span
				aria-label="En vivo"
				className={`inline-block w-2 h-2 rounded-full bg-error animate-live-pulse shadow-[0_0_8px_rgba(255,42,42,0.6)] ${className}`}
			/>
		);
	}

	return (
		<span
			className={`
				inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
				bg-error/15 border border-error/40
				font-label-caps text-[10px] font-black tracking-widest text-error
				uppercase
				${className}
			`.trim()}
		>
			<span className="w-1.5 h-1.5 rounded-full bg-error animate-live-pulse shadow-[0_0_6px_rgba(255,42,42,0.8)]" />
			En vivo
		</span>
	);
}
