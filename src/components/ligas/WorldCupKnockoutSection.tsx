/**
 * WorldCupKnockoutSection — Sección de Eliminatorias para /ligas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Wrapper de `BracketTree` con header contextual. Renderiza el árbol completo
 * de 5 rondas + partido por el 3er puesto.
 *
 * ============================================================================
 * PROPS
 * ============================================================================
 * - bracket: FullBracket (output de getFullBracket)
 * - onOpenDetails: callback al tocar un partido (abre MatchSheet)
 *
 * ============================================================================
 * DIFERENCIA CON BRACKET TREE EN TOURNAMENT
 * ============================================================================
 * Este wrapper es semánticamente "read-only + interactivo" para /ligas.
 * La decisión de hacer /ligas interactiva (P2 = B del usuario) significa que
 * tocar un partido también abre el MatchSheet, igual que en Tournament.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <WorldCupKnockoutSection bracket={bracket} onOpenDetails={setSelectedMatchId} />
 * ```
 */

import type { FullBracket } from "../../lib/bracketTypes";
import { BracketTree } from "../tournament/BracketTree";

interface WorldCupKnockoutSectionProps {
	bracket: FullBracket;
	onOpenDetails: (matchId: string) => void;
}

export function WorldCupKnockoutSection({
	bracket,
	onOpenDetails,
}: WorldCupKnockoutSectionProps) {
	return (
		<section
			aria-label="Llaves eliminatorias del Mundial 2026"
			className="pt-4"
		>
			<BracketTree bracket={bracket} onOpenDetails={onOpenDetails} />
		</section>
	);
}
