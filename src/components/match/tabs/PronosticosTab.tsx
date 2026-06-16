import type { Match, Prediction, Tournament } from "../../../lib/types";
import { PredictionCarousel } from "../PredictionCarousel";

interface PronosticosTabProps {
	match: Match;
	predictions: Prediction[];
	tournaments: Tournament[];
	locked: boolean;
	isCancelled: boolean;
	onSlideDirtyChange: (slideId: string, isDirty: boolean) => void;
	/**
	 * Sprint "Habilitar formations upcoming" (Fase UX): callback opcional
	 * para cambiar al tab "lineups" cuando el usuario toca el chip
	 * "Formación disponible". Si no se pasa, el chip no se renderiza
	 * (backward compat con tests/usos existentes).
	 */
	onLineupsTabRequest?: () => void;
}

/**
 * Tab "Pronósticos" del Match Bottom Sheet.
 * Muestra el carrusel multi-torneo de predicciones del usuario.
 * Si el partido está cancelado/postergado, muestra un mensaje de estado.
 * Si el usuario no pertenece a ningún torneo, muestra un CTA de unirse.
 *
 * Sprint "Habilitar formations upcoming" (Fase UX): si hay formations
 * disponibles para un partido upcoming, muestra un chip contextual
 * arriba del carrusel invitando a ver la formación antes de pronosticar.
 */
export function PronosticosTab({
	match,
	predictions,
	tournaments,
	locked,
	isCancelled,
	onSlideDirtyChange,
	onLineupsTabRequest,
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

	const hasLineupsAvailable =
		match.status === "not_started" && (match.lineups?.length ?? 0) >= 2;

	return (
		<>
			{hasLineupsAvailable && onLineupsTabRequest && (
				<LineupsChip onClick={onLineupsTabRequest} />
			)}
			<PredictionCarousel
				match={match}
				predictions={predictions}
				tournaments={tournaments}
				locked={locked}
				onSlideDirtyChange={onSlideDirtyChange}
			/>
		</>
	);
}

/**
 * Sprint "Habilitar formations upcoming" (Fase UX): chip contextual
 * que aparece arriba del carrusel de pronósticos cuando hay
 * formations disponibles para un partido upcoming. Invita al usuario
 * a ver la formación ANTES de cerrar su pronóstico (ej. "si juega
 * Messi de titular, apuesto a goles").
 */
function LineupsChip({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full mb-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-[background-color,border-color] duration-200 active:scale-[0.99] flex items-center gap-2 group"
			aria-label="Ver formación titular disponible"
		>
			<span className="material-symbols-outlined text-[16px] text-primary">
				groups
			</span>
			<span className="font-label-caps text-[10px] text-primary uppercase tracking-widest font-bold flex-1 text-left">
				Formación disponible · Ver 11 titulares
			</span>
			<span className="material-symbols-outlined text-[16px] text-primary group-hover:translate-x-0.5 transition-transform duration-200">
				arrow_forward
			</span>
		</button>
	);
}
