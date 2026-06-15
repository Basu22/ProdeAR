/**
 * KnockoutBracket — Visualización de los 16 partidos de Dieciseisavos.
 *
 * ============================================================================
 * ALCANCE DE FASE 3 (Simplificado)
 * ============================================================================
 * Por ahora se muestra un grid de 16 cards de partidos (no un árbol visual
 * con líneas conectoras entre rondas). El árbol completo (Octavos → Cuartos →
 * Semis → Final) se puede agregar en una iteración futura.
 *
 * Cada card muestra:
 * - Número de partido (1-16)
 * - Slot A vs Slot B con logos, nombres y badges de live
 * - Estado de completitud (ambos slots resueltos vs TBD)
 * - Indicador del tipo de slot (1°, 2°, o Mejor 3°)
 *
 * ============================================================================
 * ESTADOS VISUALES
 * ============================================================================
 * - Slot resuelto + equipo conocido → fondo normal, nombre + logo
 * - Slot TBD → fondo con stripes diagonales, "TBD" o el tipo de slot
 * - Slot live (equipo jugando ahora) → badge "EN VIVO" pulsante
 *
 * ============================================================================
 * ACCESIBILIDAD
 * ============================================================================
 * - Cada match es un <article> con aria-label descriptivo
 * - Colores complementados con texto ("TBD", "Live", etc.)
 * - Live regions para cambios en vivo (futuro)
 */

import type {
	BracketMatch,
	BracketSlot,
	KnockoutBracket as KnockoutBracketType,
} from "../../lib/worldCupGroups";
import { LiveBadge } from "./LiveBadge";

interface KnockoutBracketProps {
	bracket: KnockoutBracketType;
}

function getSlotLabel(slot: BracketSlot): string {
	if (slot.slotType === "1st") {
		return `1° ${slot.groupLetter}`;
	}
	if (slot.slotType === "2nd") {
		return `2° ${slot.groupLetter}`;
	}
	if (slot.slotType === "best3rd") {
		return `3° #${slot.bestThirdRank}`;
	}
	return "?";
}

function SlotDisplay({
	slot,
	position,
}: {
	slot: BracketSlot;
	position: "A" | "B";
}) {
	const isResolved = slot.teamName !== null;
	const isLive = slot.isLive;

	// Estilo base
	const baseClass = `
		flex items-center gap-2 px-2.5 py-2 rounded-lg min-w-0
		transition-colors duration-200
		${
			isResolved
				? "bg-surface-container-lowest/60 border border-white/5"
				: "bg-surface-container-lowest/30 border border-dashed border-white/10"
		}
		${isLive ? "ring-1 ring-error/40" : ""}
	`.trim();

	if (!isResolved) {
		// TBD slot
		return (
			<div className={baseClass} aria-label={`Slot ${position} pendiente`}>
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant/40">
					help
				</span>
				<div className="flex-1 min-w-0">
					<p className="font-label-caps text-[9px] text-on-surface-variant/50 uppercase tracking-widest font-bold">
						{getSlotLabel(slot)}
					</p>
					<p className="font-body-md text-xs text-on-surface-variant/40 truncate">
						Por definir
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={baseClass}
			aria-label={`Slot ${position}: ${slot.teamName}`}
		>
			{slot.teamLogo ? (
				<img
					src={slot.teamLogo}
					alt=""
					className="w-5 h-5 object-contain flex-shrink-0"
					loading="lazy"
				/>
			) : (
				<span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
					flag
				</span>
			)}
			<div className="flex-1 min-w-0">
				<p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">
					{getSlotLabel(slot)}
				</p>
				<p className="font-body-md text-xs text-white font-bold truncate">
					{slot.teamName}
				</p>
			</div>
			{isLive && <LiveBadge variant="compact" />}
		</div>
	);
}

function MatchCard({ match }: { match: BracketMatch }) {
	const { position, slotA, slotB, isComplete } = match;

	return (
		<article
			aria-label={`Dieciseisavos ${position}: ${slotA.teamName ?? "TBD"} vs ${slotB.teamName ?? "TBD"}`}
			className={`
				relative bg-surface-container-low/40 border rounded-xl p-3 space-y-2
				hover:border-white/20 transition-colors
				${
					isComplete
						? "border-white/10"
						: "border-dashed border-white/5 opacity-70"
				}
			`.trim()}
		>
			{/* Header con número de partido */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span className="font-stat-value text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
						R32 · {position}
					</span>
					{!isComplete && (
						<span
							aria-label="Pendiente"
							className="font-label-caps text-[8px] text-on-surface-variant/50 uppercase tracking-widest"
						>
							· Pendiente
						</span>
					)}
				</div>
				{isComplete && (
					<span className="font-label-caps text-[8px] text-pitch-green/60 uppercase tracking-widest font-bold">
						Definido
					</span>
				)}
			</div>

			{/* Slot A */}
			<SlotDisplay slot={slotA} position="A" />

			{/* VS separator */}
			<div className="flex items-center justify-center">
				<span className="font-stat-value text-[10px] text-on-surface-variant/30 uppercase tracking-widest font-black">
					vs
				</span>
			</div>

			{/* Slot B */}
			<SlotDisplay slot={slotB} position="B" />
		</article>
	);
}

export function KnockoutBracket({ bracket }: KnockoutBracketProps) {
	const { matches, completedMatches, totalMatches, roundName } = bracket;
	const isComplete = completedMatches === totalMatches;

	return (
		<div className="max-w-4xl mx-auto space-y-4">
			{/* Header con contexto */}
			<div className="text-center space-y-1">
				<p className="font-headline-md text-base text-white uppercase tracking-wider">
					{roundName}
				</p>
				<p className="font-body-md text-xs text-on-surface-variant">
					<span className="text-white font-bold">
						{completedMatches} / {totalMatches}
					</span>{" "}
					cruces definidos
					{!isComplete && (
						<span className="text-on-surface-variant/60">
							{" "}
							· se completan a medida que se definen los grupos
						</span>
					)}
				</p>
			</div>

			{/* Grid de 16 partidos (2 columnas en mobile, 4 en desktop) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{matches.map((match) => (
					<MatchCard key={match.id} match={match} />
				))}
			</div>

			{/* Leyenda */}
			<div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 pb-2 text-xs text-on-surface-variant font-bold font-label-caps select-none border-t border-white/5">
				<div className="flex items-center gap-2">
					<span className="font-stat-value text-[9px] uppercase tracking-widest font-black">
						1°X
					</span>
					<span>Primero del grupo</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="font-stat-value text-[9px] uppercase tracking-widest font-black">
						2°X
					</span>
					<span>Segundo del grupo</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="font-stat-value text-[9px] uppercase tracking-widest font-black">
						3°#N
					</span>
					<span>Mejor tercero #N</span>
				</div>
			</div>
		</div>
	);
}
