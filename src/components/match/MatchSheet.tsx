import { useCallback, useRef, useState } from "react";
import {
	formatPredictionForSharing,
	isMatchPredictable,
} from "../../lib/predictionHelpers";
import type {
	Match,
	Prediction,
	SheetTabDef,
	SheetTabId,
	Tournament,
} from "../../lib/types";
import { BottomSheet } from "../ui/BottomSheet";
import { SheetActions } from "./SheetActions";
import { SheetMatchHeader } from "./SheetMatchHeader";
import { SheetTabBar } from "./SheetTabBar";
import { EventosTab, FormacionesTab, PronosticosTab, StatsTab } from "./tabs";

export interface MatchSheetProps {
	match: Match | null;
	predictions: Prediction[];
	tournaments: Tournament[];
	isOpen: boolean;
	onClose: () => void;
	/**
	 * Sprint "Amistosos Read-Only" 2026-06-29: si `true`, oculta el tab
	 * "Pronósticos" y deshabilita el botón de compartir predicción.
	 * Se usa para partidos de competiciones amistosas (is_friendly=true
	 * en la DB), donde el usuario NO puede pronosticar.
	 */
	readOnly?: boolean;
}

/**
 * MatchSheet: BottomSheet específico para mostrar el detalle de un partido.
 * Sprint 1 (F10) — refactor:
 * - 4 tabs visibles: Pronósticos / Eventos / Stats / Formaciones
 * - Lazy mount por tab (cada tab se monta solo cuando se visita)
 * - Tab default dinámico según estado del partido
 * - Componentes extraídos a `tabs/` y `SheetTabBar`/`SheetActions`
 * - Elimina el doble mount de MatchDetailsTabs
 *
 * Sprint "Amistosos Read-Only" 2026-06-29:
 * - Si `readOnly === true`, oculta tab "Pronósticos" y deshabilita share
 * - Default tab: "events" si live/finished, "lineups" si upcoming (cuando hay)
 */
export function MatchSheet({
	match,
	predictions,
	tournaments,
	isOpen,
	onClose,
	readOnly = false,
}: MatchSheetProps) {
	// === Estado del tab activo ===
	// Tab default dinámico:
	// - live/finished → "events"
	// - upcoming + readOnly + lineups → "lineups"
	// - upcoming + readOnly sin lineups → "stats" (si hay) o primer tab
	// - normal → "predictions"
	const [activeTab, setActiveTab] = useState<SheetTabId>(() => {
		if (!match) return "predictions";
		if (match.status === "live" || match.status === "finished") {
			return "events";
		}
		if (readOnly) {
			// Amistoso: fallback a lineups si hay, sino al primer tab disponible
			if ((match.lineups?.length ?? 0) >= 2) return "lineups";
			return "predictions"; // será filtrado, pero al menos tenemos un default
		}
		return "predictions";
	});

	// Set de tabs ya montados (lazy mount). El tab activo siempre se monta
	// en el primer render; los demás se montan cuando se visitan.
	const mountedTabsRef = useRef<Set<SheetTabId>>(new Set());
	if (match && !mountedTabsRef.current.has(activeTab)) {
		mountedTabsRef.current.add(activeTab);
	}
	const mountedTabs = mountedTabsRef.current;

	const handleTabChange = useCallback((tab: SheetTabId) => {
		setActiveTab(tab);
		mountedTabsRef.current.add(tab);
	}, []);

	// === Dirty check ===
	const [dirtySlides, setDirtySlides] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const hasUnsavedChanges = dirtySlides.size > 0;

	const handleSlideDirtyChange = useCallback(
		(slideId: string, isDirty: boolean) => {
			setDirtySlides((prev) => {
				const next = new Set(prev);
				if (isDirty) {
					next.add(slideId);
				} else {
					next.delete(slideId);
				}
				return next;
			});
		},
		[],
	);

	// === Close con dirty check ===
	const handleClose = useCallback(() => {
		if (hasUnsavedChanges) {
			const confirmed = window.confirm(
				"Tenés cambios sin guardar. ¿Cerrar igual?",
			);
			if (!confirmed) return;
		}
		onClose();
	}, [hasUnsavedChanges, onClose]);

	// === Share ===
	const [shareState, setShareState] = useState<"idle" | "copied" | "error">(
		"idle",
	);

	const copyToClipboard = useCallback(
		async (text: string): Promise<boolean> => {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				try {
					await navigator.clipboard.writeText(text);
					return true;
				} catch {
					// Fallback below
				}
			}
			if (typeof document === "undefined") return false;
			try {
				const ta = document.createElement("textarea");
				ta.value = text;
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				const ok = document.execCommand("copy");
				document.body.removeChild(ta);
				return ok;
			} catch {
				return false;
			}
		},
		[],
	);

	const handleShare = useCallback(async () => {
		if (!match) return;
		const activeTournament = tournaments[0];
		if (!activeTournament) return;
		const pred = predictions.find(
			(p) => p.tournamentId === activeTournament.id,
		);
		if (!pred) return;

		const text = formatPredictionForSharing(match, pred, activeTournament.name);

		const ok = await copyToClipboard(text);
		if (ok) {
			if (navigator.vibrate) navigator.vibrate(30);
			setShareState("copied");
			setTimeout(() => setShareState("idle"), 2000);
		} else {
			setShareState("error");
			setTimeout(() => setShareState("idle"), 2000);
		}
	}, [match, predictions, tournaments, copyToClipboard]);

	// === Early return si no hay match ===
	if (!match) return null;

	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isCancelled =
		match.status === "cancelled" || match.status === "postponed";
	const predictable = isMatchPredictable(match);
	const locked = !predictable;
	const hasLineupsAvailable = (match.lineups?.length ?? 0) >= 2;

	// Sprint "Habilitar formations upcoming" (Fase UX):
	// Label e icono del tab cambian según el contexto. "Formación" es
	// semánticamente más preciso para un XI titular pre-partido;
	// "Equipo" se mantiene en live/finished (consistencia con el
	// comportamiento previo, donde el usuario espera ver "el equipo
	// jugando" con sus cambios posicionales).
	const isUpcomingWithLineups =
		match.status === "not_started" && hasLineupsAvailable;
	const lineupsTabLabel = isUpcomingWithLineups ? "Formación" : "Equipo";
	const lineupsTabIcon = isUpcomingWithLineups ? "groups" : "sports_soccer";

	// === Tabs disponibles según estado del partido ===
	// Sprint "Amistosos Read-Only" 2026-06-29: si readOnly, NO incluir
	// el tab "predictions" (los amistosos no se pueden pronosticar).
	const tabsAvailable: SheetTabDef[] = [
		...(readOnly
			? []
			: [
					{
						id: "predictions" as const,
						label: "Pronós",
						icon: "stadia_controller" as const,
					},
				]),
		...(isLive || isFinished
			? [{ id: "events" as const, label: "Eventos", icon: "bolt" }]
			: []),
		...(isLive || isFinished
			? [{ id: "stats" as const, label: "Stats", icon: "bar_chart_4_bars" }]
			: []),
		// Formaciones: solo si hay lineups O si el partido es live/finished
		...(isLive || isFinished || hasLineupsAvailable
			? [
					{
						id: "lineups" as const,
						label: lineupsTabLabel,
						icon: lineupsTabIcon,
					},
				]
			: []),
	];

	// Si el activeTab ya no está disponible (cambio de estado), fallback al primero.
	// Sprint "Amistosos Read-Only" 2026-06-29: si tabsAvailable está vacío
	// (caso: amistoso upcoming sin lineups), usar null como sentinel para
	// mostrar un empty state en lugar de crashear con tabsAvailable[0].id.
	const safeActiveTab: SheetTabId | null = tabsAvailable.some(
		(t) => t.id === activeTab,
	)
		? activeTab
		: (tabsAvailable[0]?.id ?? null);

	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={handleClose}
			ariaLabel={`Detalle del partido: ${match.homeTeam} vs ${match.awayTeam}`}
			maxHeight="90vh"
		>
			<div className="flex flex-col h-full">
				{/* Header sticky: acciones + match header */}
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl pt-2">
					<SheetActions
						shareState={shareState}
						hasUnsavedChanges={hasUnsavedChanges}
						// Sprint "Amistosos Read-Only" 2026-06-29:
						// Deshabilitar share en modo readOnly (amistosos no
						// tienen predicciones para compartir).
						canShare={predictions.length > 0 && !readOnly}
						onShare={handleShare}
						onClose={handleClose}
					/>
					<SheetMatchHeader match={match} />
				</div>

				{/* Tab bar (solo si hay 2+ tabs) */}
				{tabsAvailable.length > 1 && safeActiveTab && (
					<SheetTabBar
						tabs={tabsAvailable}
						activeTab={safeActiveTab}
						onChange={handleTabChange}
						// Sprint "Habilitar formations upcoming" (v1.1):
						// dot pulsante en el tab "lineups" cuando hay formations
						// en upcoming (señal de discovery).
						hasFreshLineups={isUpcomingWithLineups}
					/>
				)}

				{/* Contenido scrollable: lazy mount por tab con cross-fade */}
				<div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
					{/* Sprint "Amistosos Read-Only" 2026-06-29: empty state
						para partidos amistosos upcoming sin lineups.
						Si safeActiveTab es null, no hay tabs disponibles. */}
					{safeActiveTab === null && (
						<div
							className="flex flex-col items-center justify-center text-center py-12 px-6 space-y-3"
							role="status"
						>
							<span
								className="material-symbols-outlined text-on-surface-variant/40"
								style={{ fontSize: "48px" }}
								aria-hidden="true"
							>
								visibility
							</span>
							<p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest font-bold">
								Amistoso Internacional
							</p>
							<p className="font-body-md text-sm text-on-surface-variant/60 max-w-xs">
								Este partido es solo vista. No hay eventos, estadísticas
								ni formaciones disponibles todavía.
							</p>
						</div>
					)}

					{mountedTabs.has("predictions") &&
						safeActiveTab === "predictions" && (
							<div
								id="tabpanel-predictions"
								role="tabpanel"
								aria-labelledby="tab-predictions"
								className="animate-tab-enter"
								key="panel-predictions"
							>
								<PronosticosTab
									match={match}
									predictions={predictions}
									tournaments={tournaments}
									locked={locked}
									isCancelled={isCancelled}
									onSlideDirtyChange={handleSlideDirtyChange}
									// Sprint "Habilitar formations upcoming" (UX):
									// callback que cambia al tab "lineups" cuando
									// el usuario toca el chip "Formación disponible".
									// Usamos mountedTabsRef + setActiveTab para
									// mantener el patrón lazy mount del tab.
									onLineupsTabRequest={() => {
										mountedTabsRef.current.add("lineups");
										setActiveTab("lineups");
									}}
								/>
							</div>
						)}

					{mountedTabs.has("events") && safeActiveTab === "events" && (
						<div
							id="tabpanel-events"
							role="tabpanel"
							aria-labelledby="tab-events"
							className="space-y-2 animate-tab-enter"
							key="panel-events"
						>
							<h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold px-1">
								⚡ Eventos del partido
							</h3>
							<EventosTab match={match} />
						</div>
					)}

					{mountedTabs.has("stats") && safeActiveTab === "stats" && (
						<div
							id="tabpanel-stats"
							role="tabpanel"
							aria-labelledby="tab-stats"
							className="space-y-2 animate-tab-enter"
							key="panel-stats"
						>
							<h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold px-1">
								📊 Estadísticas
							</h3>
							<StatsTab match={match} />
						</div>
					)}

					{mountedTabs.has("lineups") && safeActiveTab === "lineups" && (
						<div
							id="tabpanel-lineups"
							role="tabpanel"
							aria-labelledby="tab-lineups"
							className="space-y-2 animate-tab-enter"
							key="panel-lineups"
						>
							<h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold px-1">
								🏟️ Formaciones
							</h3>
							<FormacionesTab match={match} />
						</div>
					)}
				</div>
			</div>
		</BottomSheet>
	);
}
