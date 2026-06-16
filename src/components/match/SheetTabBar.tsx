import type { KeyboardEvent } from "react";
import type { SheetTabDef, SheetTabId } from "../../lib/types";

interface SheetTabBarProps {
	tabs: readonly SheetTabDef[];
	activeTab: SheetTabId;
	onChange: (tab: SheetTabId) => void;
	/**
	 * Sprint "Habilitar formations upcoming" (v1.1): si true, muestra un
	 * dot pulsante en la esquina superior derecha del tab "lineups" como
	 * señal de discovery. Solo se renderiza cuando el tab NO está activo
	 * (no necesita discovery lo que ya se está viendo).
	 */
	hasFreshLineups?: boolean;
}

/**
 * Tab bar con 4 tabs icon-stack para el Match Bottom Sheet.
 *
 * Layout: cada tab es un bloque vertical con icono Material Symbol 18px
 * arriba + label 9px uppercase abajo. 4 tabs × flex-1 = caben en 320px
 * sin scroll horizontal.
 *
 * Accesibilidad:
 * - role="tablist" en el contenedor
 * - role="tab" en cada botón
 * - aria-selected según activeTab
 * - aria-controls apunta al panel correspondiente
 * - Navegación por teclado: ← → Home End Enter Space
 * - Focus visible con ring primary
 */
export function SheetTabBar({
	tabs,
	activeTab,
	onChange,
	hasFreshLineups = false,
}: SheetTabBarProps) {
	if (tabs.length === 0) return null;

	const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
		let nextIdx: number | null = null;
		if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
		else if (e.key === "ArrowLeft")
			nextIdx = (idx - 1 + tabs.length) % tabs.length;
		else if (e.key === "Home") nextIdx = 0;
		else if (e.key === "End") nextIdx = tabs.length - 1;

		if (nextIdx !== null) {
			e.preventDefault();
			const nextTab = tabs[nextIdx];
			if (nextTab) {
				onChange(nextTab.id);
				// Mover foco al siguiente botón
				const buttons =
					e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
						'[role="tab"]',
					);
				buttons?.[nextIdx]?.focus();
			}
		}
	};

	return (
		<div
			className="border-b border-white/5 px-1"
			role="tablist"
			aria-label="Secciones del partido"
		>
			<div className="grid grid-cols-4 gap-0">
				{tabs.map((tab, idx) => {
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-controls={`tabpanel-${tab.id}`}
							tabIndex={isActive ? 0 : -1}
							onClick={() => onChange(tab.id)}
							onKeyDown={(e) => handleKeyDown(e, idx)}
							className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 font-label-caps text-[9px] tracking-wider uppercase font-bold transition-colors border-b-2 cursor-pointer select-none ${
								isActive
									? "text-primary text-glowing border-primary bg-primary/5"
									: "text-on-surface-variant/60 border-transparent hover:text-white hover:bg-white/5"
							} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
						>
							<span
								className="material-symbols-outlined text-[18px] leading-none"
								aria-hidden="true"
							>
								{tab.icon}
							</span>
							<span className="leading-none whitespace-nowrap">
								{tab.label}
							</span>
							{/* Sprint "Habilitar formations upcoming" (v1.1):
							    Dot pulsante en la esquina superior derecha del
							    tab "lineups" como señal de discovery. Solo se
							    muestra si hay formations frescas y el tab NO está
							    activo. */}
							{tab.id === "lineups" && hasFreshLineups && !isActive && (
								<span
									className="absolute top-1.5 right-1/2 translate-x-3 w-1.5 h-1.5 rounded-full bg-pitch-green animate-live-pulse"
									aria-label="Formación recién publicada"
								/>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
