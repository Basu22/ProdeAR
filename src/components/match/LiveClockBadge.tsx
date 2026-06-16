import type { LiveMinuteInfo } from "../../hooks/useLiveMinute";

export interface LiveClockBadgeProps {
	/**
	 * Objeto completo retornado por `useLiveMinute(match)`.
	 * Se pasa entero (en vez de props separadas) para garantizar que
	 * `minute`, `freshness` e `isStale` estén siempre consistentes entre sí.
	 */
	live: LiveMinuteInfo;
	/**
	 * Variante visual:
	 * - `"sm"`: pill compacto (MatchCard row 1)
	 * - `"lg"`: cronómetro expandido con "EN VIVO" (SheetMatchHeader)
	 * - `"inline"`: solo el número, sin dot ni pill (LiveMiniScoreboard)
	 */
	size?: "sm" | "lg" | "inline";
	/**
	 * Si true, muestra la etiqueta "EN VIVO" al lado del minuto.
	 * Default: true solo en `size="lg"`.
	 */
	showLiveLabel?: boolean;
	className?: string;
	/**
	 * Highlight de entrada (animación sutil al montar).
	 * Útil para conectar perceptualmente la card del dashboard con el modal.
	 */
	highlightOnMount?: boolean;
}

/**
 * LiveClockBadge — Single source of truth visual para el cronómetro en vivo.
 *
 * Encapsula la presentación del minuto de un partido en vivo en TODAS las
 * vistas de la app (MatchCard, SheetMatchHeader, LiveMiniScoreboard,
 * MatchStatusBar, Scoreboard, LiveMatchRow). Antes de este componente, cada
 * vista implementaba su propio render inline con diferencias de estilo y de
 * reglas de freshness, lo que producía inconsistencias (ej. la card mostraba
 * "73'" y el modal "24'" para el mismo partido).
 *
 * ============================================================================
 * REGLAS
 * ============================================================================
 * - Si `live.minute` es string ("ET", "PEN", "BT", etc.) → se renderiza el
 *   string tal cual, SIN sufijo "'".
 * - Si `live.minute` es number → se renderiza `${prefix}${minute}'`.
 * - Si `live.minute` es undefined → se renderiza "EN VIVO".
 * - Si `live.isStale` → color de texto cambia a amber, prefijo "⏱️ ".
 * - Si `live.freshness === "warm"` → prefijo "~".
 * - El `aria-live="polite"` se aplica solo en `size="lg"` (en `sm`/`inline`
 *   sería ruido porque el contexto ya lo provee el padre).
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `role="status"` para que screen readers anuncien cambios de minuto.
 * - `aria-live="polite"` solo en `lg` (modal/detalle) para no inundar al
 *   usuario con anuncios en cada tick de la card.
 * - `title` con descripción humana de la frescura.
 */
export function LiveClockBadge({
	live,
	size = "sm",
	showLiveLabel,
	className = "",
	highlightOnMount = false,
}: LiveClockBadgeProps) {
	const { minute, isStale, freshness, ageMinutes } = live;

	// Prefijos de freshness (consolidados acá para no duplicarlos en cada consumidor)
	const prefix = isStale ? "⏱️ " : freshness === "warm" ? "~" : "";
	const freshnessTitle = isStale
		? `Última actualización hace ${ageMinutes} min`
		: freshness === "warm"
			? `Actualizado hace ${ageMinutes} min`
			: undefined;

	// Texto del reloj
	const clockText = renderClockText(minute, prefix);

	// Color del texto según frescura
	const textColor = isStale ? "text-amber-400" : "text-error";

	// Default de showLiveLabel: solo true en lg
	const shouldShowLabel =
		showLiveLabel ?? (size === "lg" && minute === undefined);

	const highlightClass = highlightOnMount
		? "animate-[liveBadgeHighlight_1.2s_ease-out_1]"
		: "";

	if (size === "sm") {
		return (
			<span
				className={`flex items-center gap-1 bg-error/10 border border-error/30 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase animate-pulse ${textColor} ${highlightClass} ${className}`}
				title={freshnessTitle}
				role="status"
			>
				<span className="w-1 h-1 rounded-full bg-error inline-block animate-ping" />
				{clockText}
			</span>
		);
	}

	if (size === "inline") {
		// Variante más minimalista: solo el número, sin dot ni pill.
		// Usada en LiveMiniScoreboard (compacto, junto a flags y score).
		return (
			<span
				className={`font-stat-value text-[11px] tabular-nums font-bold ${textColor} ${highlightClass} ${className}`}
				title={freshnessTitle}
			>
				{clockText}
			</span>
		);
	}

	// size === "lg"
	// El "lg" va inline con el texto (no en pill) para respetar el rhythm
	// tipográfico del header del modal (10px font-label-caps tracking-widest).
	return (
		<span
			className={`flex items-center gap-1.5 text-[10px] font-label-caps uppercase tracking-widest font-bold ${textColor} ${highlightClass} ${className}`}
			title={freshnessTitle}
			role="status"
			aria-live="polite"
		>
			<span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
			<span>{clockText}</span>
			{shouldShowLabel && <span>EN VIVO</span>}
		</span>
	);
}

/**
 * Renderiza el texto del reloj según el tipo de `minute`.
 * - string (ET, PEN, BT, INT, SUSP): sin sufijo "'"
 * - number: con prefijo de freshness + sufijo "'"
 * - undefined: "EN VIVO"
 */
function renderClockText(
	minute: number | string | undefined,
	prefix: string,
): string {
	if (minute === undefined) return "EN VIVO";
	if (typeof minute === "string") return minute;
	return `${prefix}${minute}'`;
}
