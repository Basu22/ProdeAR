/**
 * CompetitionSelector — Selector de competiciones escalable a 20+ ligas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Muestra la competición activa como un TRIGGER (botón con logo + nombre +
 *    chevron). Al click, se despliega un PANEL con la lista completa.
 * 2. La competición seleccionada se persiste en:
 *    - URL (query param `?comp=`) → habilita deep-linking.
 *    - localStorage (`prodear:last-competition`) → persiste entre sesiones.
 * 3. Resolución de la competición inicial (al montar):
 *    a. URL (`?comp=...`) tiene prioridad.
 *    b. Si no hay, localStorage.
 *    c. Si no hay, default = la primera competición (típicamente Mundial).
 *
 * ============================================================================
 * SPRINT 5: FORMATO ESCALABLE
 * ============================================================================
 * Antes: chips horizontales con scroll (no escalaba a 8+ ligas).
 * Ahora: trigger + panel desplegable. Soporta 20+ ligas sin scroll horizontal.
 *
 * - Mobile: panel tipo bottom sheet, scroll vertical con todas las ligas.
 * - Desktop (md+): dropdown anclado debajo del trigger.
 * - Mobile < 768px: el panel se posiciona fixed (bottom sheet).
 * - Desktop >= 768px: el panel se posiciona absolute debajo del trigger.
 *
 * Implementación SIN Radix Popover (cero deps nuevas). Click-outside se
 * maneja con un listener en `document` que ignora clicks dentro del panel.
 *
 * ============================================================================
 * TOUR
 * ============================================================================
 * El trigger tiene `data-tour="competition-selector"` para que el tour de
 * onboarding (driver.js) apunte a este elemento. El tour ya fue actualizado
 * en Sprint 5 para reflejar el nuevo formato.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const { competitions } = useCompetitions();
 * const [selectedId, setSelectedId] = useState("1");
 * <CompetitionSelector
 *   competitions={competitions}
 *   selectedId={selectedId}
 *   onChange={setSelectedId}
 * />
 * ```
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Competition } from "../../lib/types";

interface CompetitionSelectorProps {
	competitions: Competition[];
	selectedId: string;
	onChange: (id: string) => void;
}

const LAST_COMPETITION_KEY = "prodear:last-competition";

/**
 * Devuelve el URL del logo, o null si está vacío.
 */
function getLogoUrl(logoUrl: string | undefined): string | null {
	if (!logoUrl || logoUrl.trim() === "") return null;
	return logoUrl;
}

/**
 * Ícono de fallback por defecto de competición (Material Symbol).
 * Mundial → "emoji_events", resto → "sports_soccer".
 */
function getFallbackIcon(name: string): string {
	if (
		name.toLowerCase().includes("mundo") ||
		name.toLowerCase().includes("world")
	) {
		return "emoji_events";
	}
	return "sports_soccer";
}

export function CompetitionSelector({
	competitions,
	selectedId,
	onChange,
}: CompetitionSelectorProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// ── Click outside: cierra el panel si el click es fuera del container.
	//    Usamos `click` (no `mousedown`) para evitar race conditions con el
	//    mousedown del item que dispara el `onClick` del button interno.
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		// Esc key: cierra el panel.
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("click", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("click", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	// ── Persistencia inversa: si la URL cambia externamente, sincronizar.
	useEffect(() => {
		const compParam = searchParams.get("comp");
		if (compParam && compParam !== selectedId) {
			onChange(compParam);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	if (competitions.length === 0) return null;

	const selectedCompetition = competitions.find((c) => c.id === selectedId);
	const selectedLogoUrl = selectedCompetition
		? getLogoUrl(selectedCompetition.logoUrl)
		: null;

	const handleSelect = (id: string) => {
		onChange(id);
		// Persistir en localStorage
		try {
			localStorage.setItem(LAST_COMPETITION_KEY, id);
		} catch {
			// localStorage no disponible (modo privado, etc) — silencioso
		}
		// Sincronizar URL (preservando otros query params)
		const next = new URLSearchParams(searchParams);
		next.set("comp", id);
		// Limpiar `group` si cambia de competición (no aplica al nuevo comp)
		next.delete("group");
		setSearchParams(next, { replace: true });
		setIsOpen(false);
	};

	const handleTriggerKey = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsOpen((v) => !v);
		}
	};

	return (
		<div
			ref={containerRef}
			data-tour="competition-selector"
			className="relative w-full max-w-md mx-auto"
		>
			{/* TRIGGER: muestra la competición activa */}
			<button
				type="button"
				onClick={() => setIsOpen((v) => !v)}
				onKeyDown={handleTriggerKey}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-label={
					selectedCompetition
						? `Cambiar competición. Actual: ${selectedCompetition.name}`
						: "Seleccionar competición"
				}
				className={`
					group flex items-center justify-between gap-2 w-full
					px-4 py-3 rounded-2xl
					font-label-caps text-xs tracking-wider font-extrabold
					transition-all duration-200 active:scale-[0.98]
					cursor-pointer select-none
					border backdrop-blur-md
					${
						isOpen
							? "bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(0,229,255,0.3)]"
							: "bg-surface-container/60 text-white border-white/10 hover:bg-surface-container-high"
					}
				`.trim()}
			>
				<span className="flex items-center gap-2 min-w-0">
					{selectedLogoUrl ? (
						<img
							src={selectedLogoUrl}
							alt=""
							className="w-5 h-5 object-contain flex-shrink-0"
							loading="lazy"
						/>
					) : (
						<span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0">
							{selectedCompetition
								? getFallbackIcon(selectedCompetition.name)
								: "sports_soccer"}
						</span>
					)}
					<span className="truncate uppercase">
						{selectedCompetition?.name ?? "Seleccionar competición"}
					</span>
				</span>
				<span
					className={`material-symbols-outlined text-[20px] text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${
						isOpen ? "rotate-180" : ""
					}`}
					aria-hidden="true"
				>
					expand_more
				</span>
			</button>

			{/* PANEL: lista de competiciones */}
			{isOpen && (
				<ul
					role="listbox"
					aria-label="Lista de competiciones"
					data-testid="competition-listbox"
					className={`
						absolute z-50
						w-full
						mt-2
						md:left-0 md:right-auto md:min-w-[20rem]
						rounded-2xl
						bg-surface-container-high/95 backdrop-blur-xl
						border border-white/10
						shadow-[0_8px_24px_rgba(0,0,0,0.4)]
						overflow-hidden
						max-h-[60vh] overflow-y-auto
					`.trim()}
					style={{ animation: "enter 200ms cubic-bezier(0.2, 0, 0, 1) both" }}
				>
					{competitions.map((comp) => {
						const isActive = comp.id === selectedId;
						const logoUrl = getLogoUrl(comp.logoUrl);
						const optionLabel = `${comp.name}${comp.country ? `, ${comp.country}` : ""}${comp.format ? `, formato ${comp.format}` : ""}${isActive ? ", actualmente seleccionada" : ""}`;
						return (
							<li
								key={comp.id}
								role="option"
								aria-selected={isActive}
								aria-label={optionLabel}
							>
								<button
									type="button"
									onClick={() => handleSelect(comp.id)}
									// Sin aria-label propio: hereda el del <li> padre
									className={`
								flex items-center gap-3 w-full
								px-3 py-2.5
								text-left
								cursor-pointer
								transition-colors duration-150
								active:scale-[0.98]
								${
									isActive
										? "bg-primary/15 text-primary"
										: "text-white hover:bg-white/5"
								}
							`.trim()}
								>
									{logoUrl ? (
										<img
											src={logoUrl}
											alt=""
											className="w-6 h-6 object-contain flex-shrink-0"
											loading="lazy"
										/>
									) : (
										<span
											className={`material-symbols-outlined text-[20px] flex-shrink-0 ${
												isActive ? "text-primary" : "text-on-surface-variant"
											}`}
										>
											{getFallbackIcon(comp.name)}
										</span>
									)}
									<div className="flex-1 min-w-0">
										<p className="font-headline-md text-sm font-bold truncate">
											{comp.name}
										</p>
										{comp.country && (
											<p className="font-body-md text-[10px] text-on-surface-variant truncate">
												{comp.country} ·{" "}
												{comp.format === "groups"
													? "Grupos + Eliminatorias"
													: "Liga"}
											</p>
										)}
									</div>
									{isActive && (
										<span
											className="material-symbols-outlined text-[18px] text-primary flex-shrink-0"
											aria-hidden="true"
										>
											check
										</span>
									)}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/**
 * Helper para resolver la competición inicial desde URL/localStorage/default.
 * Usar en el componente padre (`Ligas.tsx`).
 */
export function resolveInitialCompetitionId(
	competitions: Competition[],
	searchParams: URLSearchParams,
	defaultId = "1",
): string {
	// 1. URL
	const compParam = searchParams.get("comp");
	if (compParam && competitions.some((c) => c.id === compParam)) {
		return compParam;
	}
	// 2. localStorage
	try {
		const stored = localStorage.getItem(LAST_COMPETITION_KEY);
		if (stored && competitions.some((c) => c.id === stored)) {
			return stored;
		}
	} catch {
		// ignorar
	}
	// 3. Default (primera competición si existe, sino el defaultId)
	return competitions[0]?.id ?? defaultId;
}
