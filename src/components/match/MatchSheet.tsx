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
}

/**
 * MatchSheet: BottomSheet específico para mostrar el detalle de un partido.
 * Sprint 1 (F10) — refactor:
 * - 4 tabs visibles: Pronósticos / Eventos / Stats / Formaciones
 * - Lazy mount por tab (cada tab se monta solo cuando se visita)
 * - Tab default dinámico según estado del partido
 * - Componentes extraídos a `tabs/` y `SheetTabBar`/`SheetActions`
 * - Elimina el doble mount de MatchDetailsTabs
 */
export function MatchSheet({
	match,
	predictions,
	tournaments,
	isOpen,
	onClose,
}: MatchSheetProps) {
	// === Estado del tab activo ===
	// Tab default dinámico: Pronósticos si upcoming, Eventos si live/finished
	const [activeTab, setActiveTab] = useState<SheetTabId>(() => {
		if (match?.status === "live" || match?.status === "finished") {
			return "events";
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

	// === Tabs disponibles según estado del partido ===
	const tabsAvailable: SheetTabDef[] = [
		{ id: "predictions", label: "Pronós", icon: "stadia_controller" },
		...(isLive || isFinished
			? [{ id: "events" as const, label: "Eventos", icon: "bolt" }]
			: []),
		...(isLive || isFinished
			? [{ id: "stats" as const, label: "Stats", icon: "bar_chart_4_bars" }]
			: []),
		// Formaciones: solo si hay lineups O si el partido es live/finished
		...(isLive || isFinished || hasLineupsAvailable
			? [{ id: "lineups" as const, label: "Equipo", icon: "sports_soccer" }]
			: []),
	];

	// Si el activeTab ya no está disponible (cambio de estado), fallback al primero
	const safeActiveTab = tabsAvailable.some((t) => t.id === activeTab)
		? activeTab
		: tabsAvailable[0].id;

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
						canShare={predictions.length > 0}
						onShare={handleShare}
						onClose={handleClose}
					/>
					<SheetMatchHeader match={match} />
				</div>

				{/* Tab bar (solo si hay 2+ tabs) */}
				{tabsAvailable.length > 1 && (
					<SheetTabBar
						tabs={tabsAvailable}
						activeTab={safeActiveTab}
						onChange={handleTabChange}
					/>
				)}

				{/* Contenido scrollable: lazy mount por tab con cross-fade */}
				<div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
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
