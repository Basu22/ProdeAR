/**
 * WorldCupBestThirdsSection — Sección de Liga de Mejores Terceros para /ligas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Wrapper de `BestThirdsTable` con header contextual + visibilidad condicional.
 *
 * - Solo se muestra si hay al menos 1 partido de grupos finalizado en la DB
 *   (antes del primer partido del Mundial, se muestra un placeholder elegante).
 * - Header propio con explicación del corte (top 8 clasifica a 16vos).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <WorldCupBestThirdsSection bestThirds={bestThirds} matches={matches} />
 * ```
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - aria-live="polite" en el placeholder (cambia cuando llega el primer resultado)
 * - role="region" con aria-label descriptivo
 */

import { useMemo } from "react";
import type { Match } from "../../lib/types";
import type { BestThirdsTable as BestThirdsTableType } from "../../lib/worldCupGroups";
import { isKnockoutMatch } from "../../lib/worldCupGroups";
import { BestThirdsTable } from "../tournament/BestThirdsTable";
import { GlassCard } from "../ui/GlassCard";

interface WorldCupBestThirdsSectionProps {
	bestThirds: BestThirdsTableType;
	matches: Match[];
}

export function WorldCupBestThirdsSection({
	bestThirds,
	matches,
}: WorldCupBestThirdsSectionProps) {
	// Detectar si hay partidos finalizados en fase de grupos
	const hasFinishedGroupMatches = useMemo(
		() => matches.some((m) => m.status === "finished" && !isKnockoutMatch(m)),
		[matches],
	);

	// Placeholder antes del primer partido finalizado
	if (!hasFinishedGroupMatches) {
		return (
			<section
				aria-label="Liga de mejores terceros"
				className="max-w-2xl mx-auto"
			>
				<GlassCard glow className="text-center py-10 px-6 border-white/10">
					<span
						className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste inline-block"
						style={{ fontSize: "48px" }}
					>
						sports_score
					</span>
					<h3 className="font-headline-md text-base sm:text-lg text-white uppercase tracking-wider font-bold">
						Liga de Mejores Terceros
					</h3>
					<p className="font-body-md text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
						Se activa cuando se juegue el primer partido de la fase de grupos.
						Mostrará los 12 terceros ordenados con corte en el 8°.
					</p>
				</GlassCard>
			</section>
		);
	}

	return (
		<section
			aria-label="Liga de mejores terceros del Mundial 2026"
			className="space-y-2"
		>
			{/* Header contextual */}
			<header className="text-center space-y-1 px-1">
				<p className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none inline-block">
					🥉 Liga de Terceros
				</p>
				<h2 className="font-display-lg text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
					Mejores Terceros
				</h2>
				<p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
					Los <span className="text-pitch-green font-bold">8 mejores</span>{" "}
					clasifican a 16vos de final. Los 4 peores quedan eliminados.
				</p>
			</header>

			<BestThirdsTable bestThirds={bestThirds} />
		</section>
	);
}
