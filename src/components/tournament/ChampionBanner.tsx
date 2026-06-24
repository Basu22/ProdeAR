/**
 * ChampionBanner — Banner destacado del campeón del torneo.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Renderiza un banner hero con el nombre del campeón + íconos de trofeo.
 * Se muestra únicamente cuando `bracket.champion !== null` y la ronda
 * visible es F (Final) — esto evita spoilers en R32/R16/QF/SF.
 *
 * ============================================================================
 * VISUAL DESIGN
 * ============================================================================
 * - Border doble dorado (`border-2 border-tertiary/60`)
 * - Gradient background: dorado → rojo (fuego de Champions)
 * - Glow exterior (`shadow-[0_0_24px_rgba(255,215,0,0.3)]`)
 * - Radial gradient interior para dar profundidad
 * - 2 íconos Material: `emoji_events` (estático) + `workspace_premium` (pulsante)
 * - Tipografía display (font-display-lg) para el nombre del campeón
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - `role="status"` + `aria-live="polite"`: anuncia a screen readers cuando
 *   aparece un nuevo campeón.
 * - `aria-label` descriptivo: "¡Argentina es el campeón del torneo!"
 * - Contraste WCAG AA: blanco sobre gradient oscuro
 * - `prefers-reduced-motion`: la animación `animate-pulse` se desactiva
 *   vía la regla global de `motion-reduce:` en Tailwind.
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - champion: nombre del equipo campeón (string no-vacío)
 */

interface ChampionBannerProps {
	/** Nombre del equipo campeón del Mundial */
	champion: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChampionBanner({ champion }: ChampionBannerProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`¡${champion} es el campeón del torneo!`}
			className="
				relative overflow-hidden
				rounded-2xl border-2 border-tertiary/60
				bg-gradient-to-br from-tertiary/20 via-tertiary/5 to-error/20
				px-4 py-5 sm:px-6 sm:py-6
				text-center
				shadow-[0_0_24px_rgba(255,215,0,0.3)]
			"
		>
			{/* Brillos de fondo (radial gradient) */}
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_70%)] pointer-events-none"
			/>

			<div className="relative space-y-2">
				{/* Íconos de trofeo */}
				<div className="flex items-center justify-center gap-2">
					<span
						className="material-symbols-outlined text-tertiary text-3xl sm:text-4xl"
						style={{ fontSize: "32px" }}
					>
						emoji_events
					</span>
					<span
						className="material-symbols-outlined text-tertiary text-2xl sm:text-3xl animate-pulse motion-reduce:animate-none"
						style={{ fontSize: "24px" }}
					>
						workspace_premium
					</span>
				</div>
				{/* Eyebrow text */}
				<p className="font-label-caps text-[10px] sm:text-xs text-tertiary uppercase tracking-widest font-black">
					¡Campeón del Mundo!
				</p>
				{/* Nombre del campeón */}
				<p className="font-display-lg text-2xl sm:text-4xl font-black text-white uppercase tracking-tight text-balance">
					{champion}
				</p>
			</div>
		</div>
	);
}
