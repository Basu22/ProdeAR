import { useMemo } from "react";
import {
	getEventSummary,
	isSubPair,
	pairSubstitutions,
	type EventSummaryItem,
	type TimelineItem,
} from "../../../lib/eventHelpers";
import { useEventPeriods } from "../../../hooks/useEventPeriods";
import type { Match, MatchEvent } from "../../../lib/types";

interface EventosTabProps {
	match: Match;
}

/**
 * Tab "Eventos" del Match Bottom Sheet.
 * Sprint 1:
 * - F10: extrae la timeline base de MatchDetailsTabs
 * - F1: barra de resumen con contadores por tipo de evento
 * - F2: agrupación de eventos por período (1T / 2T / ET / PEN)
 * - F11: cambios emparejados (Queda pendiente para commit 6)
 */
export function EventosTab({ match }: EventosTabProps) {
	const events = match.events ?? [];
	const summary = useMemo(() => getEventSummary(events), [events]);
	const periodGroups = useEventPeriods(events);

	if (events.length === 0) {
		return (
			<div className="space-y-3">
				{summary.length > 0 && <EventSummaryBar items={summary} />}
				<div className="text-center py-4">
					<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
						{match.status === "not_started"
							? "El partido no ha comenzado"
							: "No se registraron eventos en este partido"}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* F1: Resumen de eventos (pills) */}
			{summary.length > 0 && <EventSummaryBar items={summary} />}

			{/* Header con nombres de equipos */}
			<div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
				<span className="font-label-caps text-[10px] font-extrabold tracking-widest uppercase text-secondary truncate max-w-[40%]">
					{match.homeTeam}
				</span>
				<span className="font-label-caps text-[9px] font-bold tracking-widest uppercase text-on-surface-variant/60">
					EVENTOS
				</span>
				<span className="font-label-caps text-[10px] font-extrabold tracking-widest uppercase text-primary text-glowing truncate max-w-[40%]">
					{match.awayTeam}
				</span>
			</div>

			{/* F2: Timeline agrupada por período con separadores + F11: cambios emparejados */}
			<div className="relative py-1 space-y-3">
				{/* Línea vertical central (atraviesa todos los períodos) */}
				<div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2 pointer-events-none" />

				{periodGroups.map((group) => {
					// F11: emparejar substitutions dentro de cada período
					const items = pairSubstitutions(group.events);
					return (
						<div key={group.id} className="space-y-1">
							{/* F2: Separador de período */}
							<PeriodSeparator label={group.label} />

							{/* Items del período (mezcla de MatchEvent y SubPair) */}
							{items.map((item) =>
								isSubPair(item) ? (
									<SubstitutionPairRow key={item.id} pair={item} />
								) : (
									<EventRow
										key={item.id}
										event={item}
										isHome={item.team === "home"}
									/>
								),
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* === F1: EventSummaryBar === */

/**
 * Barra de pills con el conteo de cada tipo de evento.
 * Sprint 1 F1: 4 pills base (gol, amarilla, roja, cambio) + VAR condicional.
 * Layout: grid-cols-4 gap-2, mobile y desktop.
 * Animación: stagger 50ms entre pills, opacity 0→1 + scale 0.92→1.
 * Accesibilidad: role="group" + aria-label por pill.
 */
function EventSummaryBar({ items }: { items: EventSummaryItem[] }) {
	return (
		<div
			className="grid grid-cols-4 gap-2"
			role="group"
			aria-label="Resumen de eventos del partido"
		>
			{items.map((item, idx) => (
				<div
					key={item.type}
					role="button"
					tabIndex={0}
					aria-label={`${item.count} ${item.label}`}
					style={{ animationDelay: `${idx * 50}ms` }}
					className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg border ${item.bgClass} ${item.borderClass} animate-enter`}
				>
					<span
						className={`material-symbols-outlined text-[20px] leading-none ${item.colorClass}`}
						aria-hidden="true"
					>
						{item.icon}
					</span>
					<span
						className={`font-stat-value text-2xl font-black leading-none tabular-nums ${item.colorClass}`}
					>
						{item.count}
					</span>
				</div>
			))}
		</div>
	);
}

/* === F2: PeriodSeparator === */

/**
 * Separador visual entre períodos del timeline (1T, 2T, ET, PEN).
 * Sprint 1 F2: chip centrado entre 2 líneas horizontales.
 * Solo se muestra si el período tiene al menos 1 evento.
 * Accesibilidad: <h4> con texto descriptivo (no role="separator").
 */
function PeriodSeparator({ label }: { label: string }) {
	return (
		<div
			className="flex items-center gap-3 py-1 animate-period-sep"
			aria-hidden="true"
		>
			<div className="flex-1 h-px bg-period-line" />
			<span className="font-label-caps text-[9px] tracking-widest uppercase font-bold text-on-surface-variant bg-period-chip-bg border border-period-chip-border px-3 py-0.5 rounded-full whitespace-nowrap">
				{label}
			</span>
			<div className="flex-1 h-px bg-period-line" />
		</div>
	);
}

/* === EventRow (sin cambios desde Commit 3) === */

/**
 * Fila individual de evento en el timeline de 3 columnas.
 * Columna izquierda = equipo LOCAL (alineado a la derecha, hacia el centro).
 * Columna central = minuto del evento (píldora).
 * Columna derecha = equipo VISITANTE (alineado a la izquierda, hacia el centro).
 */
function EventRow({
	event,
	isHome,
}: {
	event: MatchEvent;
	isHome: boolean;
}) {
	return (
		<div className="relative flex items-center py-1.5">
			{/* Columna IZQUIERDA (eventos del LOCAL) */}
			<div
				className={`flex-1 flex items-center gap-2 ${isHome ? "justify-end pr-3 md:pr-4" : "invisible"}`}
			>
				{isHome && (
					<>
						<div className="text-right min-w-0">
							<div className="text-[13px] text-white font-bold truncate leading-tight">
								{event.playerName}
							</div>
							{event.type === "goal" && event.assistName && (
								<div className="text-[11px] text-on-surface-variant/90 truncate leading-tight">
									Asist: {event.assistName}
								</div>
							)}
							{event.type === "subst" && event.assistName && (
								<div className="text-[11px] text-on-surface-variant/90 truncate leading-tight">
									🔄 {event.assistName}
								</div>
							)}
						</div>
						<span className="text-base flex-shrink-0">
							{getEventEmoji(event.type)}
						</span>
					</>
				)}
			</div>

			{/* Columna CENTRAL — píldora con el minuto */}
			<div className="flex-none w-12 flex items-center justify-center relative z-10">
				<div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-white/10 flex items-center justify-center font-stat-value text-[12px] font-black text-primary tabular-nums shadow-[0_0_8px_rgba(56,189,248,0.15)]">
					{event.minute}'
					{event.extra ? (
						<span className="text-[9px]">+{event.extra}</span>
					) : null}
				</div>
			</div>

			{/* Columna DERECHA (eventos del VISITANTE) */}
			<div
				className={`flex-1 flex items-center gap-2 ${!isHome ? "justify-start pl-3 md:pl-4" : "invisible"}`}
			>
				{!isHome && (
					<>
						<span className="text-base flex-shrink-0">
							{getEventEmoji(event.type)}
						</span>
						<div className="text-left min-w-0">
							<div className="text-[13px] text-white font-bold truncate leading-tight">
								{event.playerName}
							</div>
							{event.type === "goal" && event.assistName && (
								<div className="text-[11px] text-on-surface-variant/90 truncate leading-tight">
									Asist: {event.assistName}
								</div>
							)}
							{event.type === "subst" && event.assistName && (
								<div className="text-[11px] text-on-surface-variant/90 truncate leading-tight">
									🔄 {event.assistName}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function getEventEmoji(type: string): string {
	if (type === "goal") return "⚽";
	if (type === "yellow") return "🟨";
	if (type === "red") return "🟥";
	if (type === "subst") return "🔄";
	if (type === "var") return "🖥️";
	return "📢";
}

/* === F11: SubstitutionPairRow (cambios emparejados) === */

/**
 * Fila de cambio emparejado (F11): muestra "sale X ⬇ / entra Y ⬆" como una
 * sola unidad visual en el timeline, en lugar de 2 eventos separados.
 *
 * Layout:
 * - Card dashed sky, max-width 180px, dentro del lado del equipo
 * - Row SALIENTE: icono north_east (rojo) + número + nombre
 * - Row ENTRANTE: icono south_west (verde) + número + nombre
 * - Dot central: el mismo que el resto del timeline
 *
 * Nota: usamos `north_east`/`south_west` en vez de `arrow_outward`/`arrow_inward`
 * porque estos últimos no se renderizan correctamente en la variante Outlined
 * de Material Symbols que carga el proyecto.
 *
 * Accesibilidad: role="group" con aria-label descriptivo.
 */
function SubstitutionPairRow({
	pair,
}: {
	pair: import("../../../lib/eventHelpers").SubPair;
}) {
	const isHome = pair.team === "home";
	const ariaLabel = `Cambio al minuto ${pair.minute}: sale ${
		pair.playerOut.name
	}${pair.playerOut.number !== null ? ` número ${pair.playerOut.number}` : ""}, entra ${
		pair.playerIn.name
	}${pair.playerIn.number !== null ? ` número ${pair.playerIn.number}` : ""}`;

	return (
		<div
			className="relative flex items-center py-1.5 animate-sub-pair-enter"
			role="group"
			aria-label={ariaLabel}
		>
			{/* Columna del lado del equipo afectado */}
			<div
				className={`flex-1 flex ${
					isHome ? "justify-end pr-3 md:pr-4" : "justify-start pl-3 md:pl-4"
				}`}
			>
				<div className="max-w-[200px] md:max-w-[220px] border border-dashed border-sky-500/40 bg-sky-500/[0.08] rounded-lg px-2.5 py-2 space-y-1 shadow-[0_2px_8px_rgba(56,189,248,0.06)]">
					{/* Row SALIENTE */}
					<div className="flex items-center gap-1.5">
							{isHome ? (
							<>
								<div className="text-right min-w-0 flex-1">
									<div className="text-[12px] text-white/85 truncate font-stat-value leading-tight">
										{pair.playerOut.name}
									</div>
								</div>
								{pair.playerOut.number !== null && (
									<span className="text-[10px] font-black text-white/70 bg-white/10 px-1.5 rounded tabular-nums flex-shrink-0 leading-none">
										{pair.playerOut.number}
									</span>
								)}
								<span
									className="material-symbols-outlined text-[18px] text-error flex-shrink-0"
									aria-hidden="true"
								>
									north_east
								</span>
							</>
						) : (
							<>
								<span
									className="material-symbols-outlined text-[18px] text-error flex-shrink-0"
									aria-hidden="true"
								>
									north_east
								</span>
								{pair.playerOut.number !== null && (
									<span className="text-[10px] font-black text-white/70 bg-white/10 px-1.5 rounded tabular-nums flex-shrink-0 leading-none">
										{pair.playerOut.number}
									</span>
								)}
								<div className="text-left min-w-0 flex-1">
									<div className="text-[12px] text-white/85 truncate font-stat-value leading-tight">
										{pair.playerOut.name}
									</div>
								</div>
							</>
						)}
					</div>

					{/* Row ENTRANTE */}
					<div className="flex items-center gap-1.5">
						{isHome ? (
							<>
								<div className="text-right min-w-0 flex-1">
									<div className="text-[12px] text-white truncate font-stat-value leading-tight">
										{pair.playerIn.name}
									</div>
								</div>
								{pair.playerIn.number !== null && (
									<span className="text-[10px] font-black text-pitch-green bg-pitch-green/15 px-1.5 rounded tabular-nums flex-shrink-0 leading-none">
										{pair.playerIn.number}
									</span>
								)}
								<span
									className="material-symbols-outlined text-[18px] text-pitch-green flex-shrink-0"
									aria-hidden="true"
								>
									south_west
								</span>
							</>
						) : (
							<>
								<span
									className="material-symbols-outlined text-[18px] text-pitch-green flex-shrink-0"
									aria-hidden="true"
								>
									south_west
								</span>
								{pair.playerIn.number !== null && (
									<span className="text-[10px] font-black text-pitch-green bg-pitch-green/15 px-1.5 rounded tabular-nums flex-shrink-0 leading-none">
										{pair.playerIn.number}
									</span>
								)}
								<div className="text-left min-w-0 flex-1">
									<div className="text-[12px] text-white truncate font-stat-value leading-tight">
										{pair.playerIn.name}
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Columna CENTRAL — píldora con el minuto (igual que en EventRow) */}
			<div className="flex-none w-12 flex items-center justify-center relative z-10">
				<div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-white/10 flex items-center justify-center font-stat-value text-[12px] font-black text-primary tabular-nums shadow-[0_0_8px_rgba(56,189,248,0.15)]">
					{pair.minute}'
				</div>
			</div>

			{/* Columna vacía del lado opuesto */}
			<div className="flex-1" />
		</div>
	);
}
