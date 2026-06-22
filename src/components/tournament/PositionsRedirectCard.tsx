/**
 * PositionsRedirectCard — Componente que se muestra en la tab "POSICIONES"
 * del Torneo (Fase 1 de deprecación).
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Reemplaza la antigua `PositionsView` en la tab "POSICIONES" de
 * `Tournament.tsx`. Anuncia al usuario que las posiciones se movieron
 * a su propia sección independiente ("Ligas") y le da un botón directo
 * para ir.
 *
 * ============================================================================
 * FASE 1 (MVP)
 * ============================================================================
 * Esta card REDIRIGE al usuario. En Fase 2, cuando validemos que la nueva
 * sección funciona, eliminamos la tab "POSICIONES" del Torneo directamente.
 *
 * ============================================================================
 * UX
 * ============================================================================
 * - GlassCard con ícono grande + texto claro + CTA primario.
 * - El CTA navega a `/ligas?comp=<competitionId>` con el `comp` correspondiente
 *   al torneo desde el que se hizo click. Así, si el usuario está en un
 *   torneo de la LPF, al hacer click en "Ir a Ligas" aterriza en la LPF.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <PositionsRedirectCard competitionId="1" />
 * <PositionsRedirectCard competitionId="2" />
 * ```
 */

import { useNavigate } from "react-router-dom";
import { GlassCard } from "../ui/GlassCard";

interface PositionsRedirectCardProps {
	/** ID de la competición del torneo actual (ej. "1" Mundial, "2" LPF) */
	competitionId: string;
}

export function PositionsRedirectCard({
	competitionId,
}: PositionsRedirectCardProps) {
	const navigate = useNavigate();

	const handleGoToLigas = () => {
		navigate(`/ligas?comp=${competitionId}`);
	};

	return (
		<div className="max-w-2xl mx-auto animate-enter">
			<GlassCard
				glow
				className="relative overflow-hidden border-white/10 py-10 sm:py-12 px-6 sm:px-8 text-center"
			>
				{/* Top accent bar (gradiente albiceleste) */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-white to-primary" />

				{/* Badge "NUEVO" en la esquina superior derecha */}
				<div className="absolute top-4 right-4">
					<span
						className="
							inline-flex items-center gap-1
							px-2 py-0.5 rounded-full
							bg-tertiary/15 border border-tertiary/30
							font-label-caps text-[9px] font-black tracking-widest
							text-tertiary uppercase
						"
					>
						<span className="w-1 h-1 rounded-full bg-tertiary animate-live-pulse" />
						NUEVO
					</span>
				</div>

				{/* Ícono grande */}
				<div className="mb-5">
					<div
						className="
							inline-flex items-center justify-center
							w-20 h-20 rounded-2xl
							bg-primary/10 border-2 border-primary/30
							stadium-glow-celeste
						"
					>
						<span className="material-symbols-outlined text-primary text-5xl">
							leaderboard
						</span>
					</div>
				</div>

				{/* Texto principal */}
				<h3 className="font-headline-md text-xl sm:text-2xl text-white uppercase tracking-tight font-bold mb-3">
					Las posiciones viven en su propia sección
				</h3>
				<p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed mb-6">
					Ahora podés ver las tablas y los partidos de cualquier liga
					directamente desde el menú principal, sin necesidad de entrar a un
					torneo.
				</p>

				{/* CTA primario */}
				<button
					type="button"
					onClick={handleGoToLigas}
					className="
						inline-flex items-center justify-center gap-2
						px-6 py-3 rounded-xl
						bg-primary hover:bg-primary/90 text-on-primary
						font-label-caps text-sm font-extrabold tracking-wider uppercase
						shadow-[0_0_20px_rgba(0,229,255,0.3)]
						transition-all duration-200 active:scale-[0.98]
						cursor-pointer
					"
				>
					<span>Ir a Ligas</span>
					<span className="material-symbols-outlined text-[18px]">
						arrow_forward
					</span>
				</button>

				{/* Hint inferior */}
				<p className="font-label-caps text-[10px] text-on-surface-variant/60 tracking-widest uppercase mt-6">
					También disponible desde el menú inferior
				</p>
			</GlassCard>
		</div>
	);
}
