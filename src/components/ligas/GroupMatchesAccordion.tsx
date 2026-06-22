/**
 * GroupMatchesAccordion — Acordeón colapsable de partidos por grupo (Mundial)
 * o por fecha (LPF / formato liga).
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Renderiza UN acordeón (un grupo o una fecha) con:
 *   - Header (summary) con:
 *     - Nombre del grupo/fecha
 *     - Badge de partidos en vivo (si hay)
 *     - Chevron animado que rota cuando está expandido
 *   - Body (details content) con la lista de partidos como `MatchMiniRow`.
 *
 * ============================================================================
 * LAZY RENDER
 * ============================================================================
 * Los partidos solo se montan cuando el acordeón está expandido. Esto
 * optimiza la performance con muchos grupos (Mundial: 12 grupos × 6
 * partidos = 72 partidos en total, pero solo 6-12 en pantalla).
 *
 * Implementación: usamos `<details>` HTML nativo + renderizamos el body
 * solo si está abierto (chequeamos `detailsRef.current?.open`).
 *
 * ============================================================================
 * DEEP-LINKING
 * ============================================================================
 * El padre (`Ligas.tsx`) puede forzar que un acordeón esté abierto
 * pasándole `isOpen={true}` (típicamente desde `?group=A` o `?matchday=1`).
 *
 * ============================================================================
 * TOUR
 * ============================================================================
 * El primer acordeón de la lista debe tener `highlightForTour` para que
 * el tour de driver.js lo apunte (`data-tour="group-accordion-trigger"`).
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <GroupMatchesAccordion
 *   title="Grupo A"
 *   matches={groupMatches}
 *   liveCount={1}
 *   onOpenDetails={(id) => setSelectedMatchId(id)}
 *   highlightForTour
 * />
 * ```
 */

import { useEffect, useRef, useState } from "react";
import type { Match } from "../../lib/types";
import { MatchMiniRow } from "./MatchMiniRow";

interface GroupMatchesAccordionProps {
	/** Título del acordeón: "Grupo A", "Fecha 15", etc. */
	title: string;
	/** Subítulo opcional: "11/06 - 18/06", "Argentina vs rivales", etc. */
	subtitle?: string;
	/** Partidos de este grupo/fecha */
	matches: Match[];
	/** Cantidad de partidos en vivo en este grupo (para badge) */
	liveCount?: number;
	/** Callback al hacer click en un partido */
	onOpenDetails: (matchId: string) => void;
	/** Si true, abre el acordeón por default (modo no controlado) */
	defaultOpen?: boolean;
	/**
	 * Si se pasa (true/false), el componente es CONTROLADO: el padre decide
	 * el estado de apertura. Si NO se pasa (undefined), el componente es
	 * NO CONTROLADO y maneja su propio estado interno.
	 */
	isOpen?: boolean;
	/** Callback cuando cambia el estado de apertura */
	onOpenChange?: (isOpen: boolean) => void;
	/** Si true, agrega data-tour para el primer acordeón (tour) */
	highlightForTour?: boolean;
	/** ID del primer partido (para el tour que apunta a un partido específico) */
	tourMatchId?: string;
}

export function GroupMatchesAccordion({
	title,
	subtitle,
	matches,
	liveCount = 0,
	onOpenDetails,
	defaultOpen = false,
	isOpen: controlledIsOpen,
	onOpenChange,
	highlightForTour = false,
	tourMatchId,
}: GroupMatchesAccordionProps) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const isControlled = controlledIsOpen !== undefined;
	const [internalOpen, setInternalOpen] = useState(defaultOpen);

	// Estado efectivo: controlado o no controlado
	const isOpen = isControlled ? controlledIsOpen : internalOpen;

	// Sincronizar prop controlado con el DOM (para deep-link)
	// Solo aplica cuando el componente es controlado Y el prop cambia.
	useEffect(() => {
		if (!isControlled || !detailsRef.current) return;
		if (controlledIsOpen !== detailsRef.current.open) {
			// Forzar el estado del DOM
			detailsRef.current.open = controlledIsOpen;
		}
	}, [isControlled, controlledIsOpen]);

	const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
		const newOpen = e.currentTarget.open;
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		onOpenChange?.(newOpen);
	};

	if (matches.length === 0) {
		// No renderizar acordeones vacíos (mantiene la UI limpia)
		return null;
	}

	return (
		<details
			ref={detailsRef}
			open={isOpen}
			onToggle={handleToggle}
			className="
				group rounded-xl overflow-hidden
				bg-surface-container/40 border border-white/5
				transition-colors duration-200
				open:bg-surface-container/60 open:border-white/10
			"
		>
			<summary
				data-tour={highlightForTour ? "group-accordion-trigger" : undefined}
				className="
					flex items-center justify-between gap-3
					px-3 sm:px-4 py-3
					cursor-pointer select-none
					hover:bg-white/[0.02] transition-colors
					list-none [&::-webkit-details-marker]:hidden
				"
			>
				<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
					{/* Chevron animado */}
					<span
						className="
							material-symbols-outlined text-on-surface-variant
							text-[18px] shrink-0
							transition-transform duration-200
							group-open:rotate-90
						"
					>
						chevron_right
					</span>

					{/* Título + subtítulo */}
					<div className="min-w-0 flex-1">
						<h4 className="font-headline-md text-sm sm:text-base font-bold text-white uppercase tracking-wider truncate">
							{title}
						</h4>
						{subtitle && (
							<p className="font-body-md text-[10px] sm:text-xs text-on-surface-variant truncate">
								{subtitle}
							</p>
						)}
					</div>
				</div>

				{/* Meta: partidos + live count */}
				<div className="flex items-center gap-2 shrink-0">
					{liveCount > 0 && (
						<span
							className="
								inline-flex items-center gap-1
								px-1.5 sm:px-2 py-0.5 rounded-full
								bg-error/20 text-error
								text-[9px] sm:text-[10px] font-black tracking-wider
							"
						>
							<span className="w-1 h-1 rounded-full bg-current animate-live-pulse" />
							{liveCount} EN VIVO
						</span>
					)}
					<span
						className="
							inline-flex items-center
							px-1.5 sm:px-2 py-0.5 rounded-full
							bg-white/5 text-on-surface-variant
							text-[9px] sm:text-[10px] font-bold tracking-wider tabular-nums
						"
					>
						{matches.length} {matches.length === 1 ? "PARTIDO" : "PARTIDOS"}
					</span>
				</div>
			</summary>

			{/* Body: lista de partidos (lazy render) */}
			{isOpen && (
				<div className="px-2 sm:px-3 pb-3 pt-1 space-y-1.5 animate-enter">
					{matches.map((match) => (
						<MatchMiniRow
							key={match.id}
							match={match}
							onOpenDetails={onOpenDetails}
							// Solo el primer partido del primer acordeón lleva el highlight
							highlightForTour={highlightForTour && match.id === tourMatchId}
						/>
					))}
				</div>
			)}
		</details>
	);
}
