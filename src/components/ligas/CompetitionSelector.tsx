/**
 * CompetitionSelector — Dropdown con logos de competiciones activas.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Muestra chips horizontales scrolleables con logo + nombre de cada
 *    competición activa (retornada por `useCompetitions`).
 * 2. La competición seleccionada se persiste en:
 *    - URL (query param `?comp=`) → habilita deep-linking.
 *    - localStorage (`prodear:last-competition`) → persiste entre sesiones.
 * 3. Resolución de la competición inicial (al montar):
 *    a. URL (`?comp=...`) tiene prioridad.
 *    b. Si no hay, localStorage.
 *    c. Si no hay, default = la primera competición (típicamente Mundial).
 *
 * ============================================================================
 * UX
 * ============================================================================
 * - Chips horizontal-scrollables (mobile-friendly, no requieren abrir
 *   un menú). El usuario desliza para ver más.
 * - En desktop todos los chips caben en una fila (justify-center).
 * - El chip activo tiene borde + glow primary.
 *
 * ============================================================================
 * TOUR
 * ============================================================================
 * El contenedor tiene `data-tour="competition-selector"` para que el
 * tour de onboarding (driver.js) apunte a este elemento.
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

import { useEffect } from "react";
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
 * driver.js (tour) ignora src="" pero img alt="" sí; usamos fallback visual.
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

	// ── Persistencia inversa: si la URL cambia externamente, sincronizar.
	useEffect(() => {
		const compParam = searchParams.get("comp");
		if (compParam && compParam !== selectedId) {
			onChange(compParam);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	if (competitions.length === 0) return null;

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
	};

	return (
		<div data-tour="competition-selector" className="relative -mx-4 sm:mx-0">
			<div
				className="
					flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar
					px-4 sm:px-0 sm:flex-wrap sm:justify-center
					py-2
				"
				role="tablist"
				aria-label="Selector de competición"
			>
				{competitions.map((comp) => {
					const isActive = comp.id === selectedId;
					const logoUrl = getLogoUrl(comp.logoUrl);
					return (
						<button
							key={comp.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => handleSelect(comp.id)}
							className={`
								flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
								font-label-caps text-xs tracking-wider font-extrabold
								transition-all duration-200 active:scale-[0.96]
								cursor-pointer select-none whitespace-nowrap
								border backdrop-blur-md
								${
									isActive
										? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,229,255,0.3)]"
										: "bg-surface-container/60 text-on-surface-variant border-white/10 hover:bg-surface-container-high hover:text-white"
								}
							`.trim()}
						>
							{logoUrl ? (
								<img
									src={logoUrl}
									alt=""
									className={`w-4 h-4 object-contain ${isActive ? "" : "opacity-80"}`}
									loading="lazy"
									onError={(e) => {
										// Si el logo falla, ocultar img (el span del fallback aparece)
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							) : (
								<span
									className={`material-symbols-outlined text-[16px] ${
										isActive ? "" : "text-on-surface-variant"
									}`}
								>
									{getFallbackIcon(comp.name)}
								</span>
							)}
							<span className="uppercase">{comp.name}</span>
						</button>
					);
				})}
			</div>

			{/* Hint visual de scroll en mobile (degradado en el borde derecho) */}
			{competitions.length > 2 && (
				<div
					className="
						absolute top-0 right-0 bottom-0 w-8
						bg-gradient-to-l from-background to-transparent
						pointer-events-none sm:hidden
					"
					aria-hidden="true"
				/>
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
