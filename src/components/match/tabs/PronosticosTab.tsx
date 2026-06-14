import { PredictionCarousel } from "../PredictionCarousel";
import type { Match, Prediction, Tournament } from "../../../lib/types";

interface PronosticosTabProps {
	match: Match;
	predictions: Prediction[];
	tournaments: Tournament[];
	locked: boolean;
	isCancelled: boolean;
	onSlideDirtyChange: (slideId: string, isDirty: boolean) => void;
}

/**
 * Tab "Pronósticos" del Match Bottom Sheet.
 * Muestra el carrusel multi-torneo de predicciones del usuario.
 * Si el partido está cancelado/postergado, muestra un mensaje de estado.
 * Si el usuario no pertenece a ningún torneo, muestra un CTA de unirse.
 */
export function PronosticosTab({
	match,
	predictions,
	tournaments,
	locked,
	isCancelled,
	onSlideDirtyChange,
}: PronosticosTabProps) {
	if (isCancelled) {
		return (
			<div className="text-center py-6 px-4">
				<span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
					event_busy
				</span>
				<p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest">
					Partido {match.status === "cancelled" ? "cancelado" : "postergado"}
				</p>
				<p className="text-xs text-on-surface-variant/60 mt-2">
					Tus pronósticos se mantienen hasta la reprogramación.
				</p>
			</div>
		);
	}

	if (tournaments.length === 0) {
		return (
			<div className="text-center py-6">
				<p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">
					Unite a un torneo para pronosticar
				</p>
			</div>
		);
	}

	return (
		<PredictionCarousel
			match={match}
			predictions={predictions}
			tournaments={tournaments}
			locked={locked}
			onSlideDirtyChange={onSlideDirtyChange}
		/>
	);
}
