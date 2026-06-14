/**
 * PositionsView — Vista principal del tab POSICIONES del Mundial.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * 1. Calcula las posiciones con `useGroupStandings(matches)`.
 * 2. Renderiza sub-pills (PillTabs) para navegar entre:
 *    - GRUPOS (vista principal, implementada en esta fase)
 *    - LIGA 3ROS (próximamente)
 *    - 16VOS (próximamente)
 * 3. Muestra contador de partidos en vivo en el pill "GRUPOS".
 * 4. Renderiza grid de GroupTable (12 grupos) o un placeholder elegante
 *    para las vistas no implementadas.
 *
 * ============================================================================
 * SUB-PILLS
 * ============================================================================
 * - "GRUPOS" → habilitado, muestra los 12 grupos
 * - "LIGA 3ROS" → disabled, "Próximamente" (próxima fase)
 * - "16VOS" → disabled, "Próximamente" (próxima fase)
 *
 * Las pills se renderizan con `PillTabs` (reutilizable, accesible).
 *
 * ============================================================================
 * UX: ANIMACIONES DE CAMBIO DE POSICIÓN
 * ============================================================================
 * `useGroupStandings` devuelve un Map<teamKey, 'up' | 'down' | 'same'>.
 * GroupTable aplica `animate-rank-up` / `animate-rank-down` a las filas
 * que cambiaron de posición entre renders. En el primer render, todas
 * son 'same' (no se anima el mount).
 *
 * ============================================================================
 * EMPTY STATE
 * ============================================================================
 * Si no hay partidos cargados o no hay grupos disponibles, se muestra un
 * estado vacío con un ícono de pelota y mensaje claro.
 */

import { useState } from "react";
import { useGroupStandings } from "../../hooks/useGroupStandings";
import type { Match } from "../../lib/types";
import { calculateBestThirds, resolveKnockoutMatchups } from "../../lib/worldCupGroups";
import { GlassCard } from "../ui/GlassCard";
import { PillTabs } from "../ui/PillTabs";
import { BestThirdsTable } from "./BestThirdsTable";
import { GroupTable } from "./GroupTable";
import { KnockoutBracket } from "./KnockoutBracket";

type PositionsSubTab = "grupos" | "mejores3ros" | "dieciseisavos";

interface PositionsViewProps {
	matches: Match[];
}

function ComingSoonPlaceholder({
	title,
	description,
	icon = "lock_clock",
}: {
	title: string;
	description: string;
	icon?: string;
}) {
	return (
		<GlassCard className="max-w-2xl mx-auto py-12 px-6 text-center">
			<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste inline-block">
				{icon}
			</span>
			<h3 className="font-headline-md text-base text-white uppercase tracking-tight mb-2">
				{title}
			</h3>
			<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto">
				{description}
			</p>
			<p className="font-label-caps text-[10px] text-on-surface-variant/60 mt-4 tracking-widest uppercase">
				Próximamente
			</p>
		</GlassCard>
	);
}

export function PositionsView({ matches }: PositionsViewProps) {
	const [subTab, setSubTab] = useState<PositionsSubTab>("grupos");
	const { groupTables, liveMatchesCount, positionChanges } =
		useGroupStandings(matches);

	// Calculamos los mejores terceros y el bracket en cada render.
	// El costo es bajo (~12 items, 16 matches), pero si crece podemos
	// envolver en useMemo.
	const bestThirds = calculateBestThirds(groupTables);
	const bracket = resolveKnockoutMatchups(groupTables, bestThirds);

	return (
		<div className="max-w-4xl mx-auto space-y-6 animate-enter">
			{/* Sub-pills */}
			<PillTabs<PositionsSubTab>
				active={subTab}
				onChange={setSubTab}
				options={[
					{
						id: "grupos",
						label: "GRUPOS",
						badge: liveMatchesCount > 0 ? liveMatchesCount : undefined,
					},
					{ id: "mejores3ros", label: "LIGA 3ROS" },
					{ id: "dieciseisavos", label: "16VOS" },
				]}
			/>

			{/* Contenido según sub-pill */}
			{subTab === "grupos" && (
				<>
					{groupTables.length === 0 ? (
						<ComingSoonPlaceholder
							title="No hay grupos disponibles"
							description="No se encontraron partidos de fase de grupos para este torneo."
							icon="sports_soccer"
						/>
					) : (
						<div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
							{groupTables.map((group) => (
								<GroupTable
									key={group.groupName}
									group={group}
									positionChanges={positionChanges}
								/>
							))}
						</div>
					)}

					{/* Leyenda */}
					{groupTables.length > 0 && (
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 pb-6 text-xs text-on-surface-variant font-bold font-label-caps select-none border-t border-white/5">
							<div className="flex items-center gap-2">
								<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
								<span>Clasifica a 16vos</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
								<span>Posible clasificado (mejor 3°)</span>
							</div>
						</div>
					)}
				</>
			)}

			{subTab === "mejores3ros" && (
				<BestThirdsTable bestThirds={bestThirds} />
			)}

			{subTab === "dieciseisavos" && <KnockoutBracket bracket={bracket} />}
		</div>
	);
}
