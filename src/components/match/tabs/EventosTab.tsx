import { useState } from "react";
import { useEventPeriods } from "../../../hooks/useEventPeriods";
import { useMockMatchData } from "../../../hooks/useMockMatchData";
import { isSubPair, pairSubstitutions } from "../../../lib/eventHelpers";
import { useCachedImage } from "../../../lib/imageCache";
import {
	getPlayerInitials,
	resolvePlayerPhoto,
} from "../../../lib/playerHelpers";
import type {
	Match,
	MatchEvent,
	PlayerPhoto,
	TeamLineup,
} from "../../../lib/types";

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
	const periodGroups = useEventPeriods(events);
	const { lineups, playerPhotos } = useMockMatchData(match);

	if (events.length === 0) {
		return (
			<div className="text-center py-4">
				<span className="text-[10px] text-on-surface-variant/70 italic uppercase tracking-wider">
					{match.status === "not_started"
						? "El partido no ha comenzado"
						: "No se registraron eventos en este partido"}
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-3">
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
									<SubstitutionPairRow
										key={item.id}
										pair={item}
										lineups={lineups}
										playerPhotos={playerPhotos}
									/>
								) : (
									<EventRow
										key={item.id}
										event={item}
										isHome={item.team === "home"}
										lineups={lineups}
										playerPhotos={playerPhotos}
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

/* === EventRow (con foto del jugador) === */

/**
 * Fila individual de evento en el timeline de 3 columnas.
 * Columna izquierda = equipo LOCAL (alineado a la derecha, hacia el centro).
 * Columna central = minuto del evento (píldora).
 * Columna derecha = equipo VISITANTE (alineado a la izquierda, hacia el centro).
 *
 * Layout de cada evento (con foto del jugador):
 * - HOME: [foto 24px] [nombre + assist opcional] [emoji]      → pegado al centro
 * - AWAY: [emoji] [nombre + assist opcional] [foto 24px]      → pegado al centro
 *
 * La foto se resuelve en runtime vía `resolvePlayerPhoto`, que matchea
 * el nombre del jugador contra `match.lineups` y busca en `match.playerPhotos`.
 * Si no hay match → fallback a iniciales.
 */
function EventRow({
	event,
	isHome,
	lineups,
	playerPhotos,
}: {
	event: MatchEvent;
	isHome: boolean;
	lineups: TeamLineup[] | null;
	playerPhotos: PlayerPhoto[];
}) {
	const playerPhoto = resolvePlayerPhoto(
		{ name: event.playerName, team: event.team },
		lineups,
		playerPhotos,
	);

	return (
		<div className="relative flex items-center py-1.5">
			{/* Columna IZQUIERDA (eventos del LOCAL) */}
			<div
				className={`flex-1 flex items-center gap-1.5 ${isHome ? "justify-end pr-3 md:pr-4" : "invisible"}`}
			>
				{isHome && (
					<>
						<PlayerAvatar
							name={event.playerName}
							photoUrl={playerPhoto}
							isHome={true}
						/>
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
				className={`flex-1 flex items-center gap-1.5 ${!isHome ? "justify-start pl-3 md:pl-4" : "invisible"}`}
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
						<PlayerAvatar
							name={event.playerName}
							photoUrl={playerPhoto}
							isHome={false}
						/>
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

/* === F11: SubstitutionPairRow (formato minimal con foto del jugador) === */

/**
 * Fila de cambio emparejado (F11) — formato minimal con foto del jugador.
 * Inspirado en apps como FotMob/Sofascore: la línea principal muestra la
 * foto + nombre del que SALE (bold), la línea secundaria solo swap + nombre
 * del que ENTRA (dim).
 *
 * Layout 3 columnas (igual que EventRow):
 * - Columna IZQUIERDA: subs del LOCAL (visible solo si isHome)
 * - Columna CENTRAL: píldora con el minuto
 * - Columna DERECHA: subs del VISITANTE (visible solo si !isHome)
 *
 * La foto se resuelve en runtime vía `resolvePlayerPhoto`, que matchea
 * el nombre del jugador contra `match.lineups` y busca en `match.playerPhotos`.
 * Si no hay match → fallback a iniciales (gris).
 */
function SubstitutionPairRow({
	pair,
	lineups,
	playerPhotos,
}: {
	pair: import("../../../lib/eventHelpers").SubPair;
	lineups: TeamLineup[] | null;
	playerPhotos: PlayerPhoto[];
}) {
	const isHome = pair.team === "home";
	const ariaLabel = `Cambio al minuto ${pair.minute}: sale ${pair.playerOut.name}, entra ${pair.playerIn.name}`;

	// Resolver la foto del jugador que SALE (playerOut)
	const outPhoto = resolvePlayerPhoto(
		{ name: pair.playerOut.name, team: pair.team },
		lineups,
		playerPhotos,
	);

	// Contenido reutilizable (mismo markup, se renderiza en la columna del equipo)
	const subContent = (
		<div className="space-y-0.5 min-w-0 max-w-[220px]">
			{/* Sale - bold + foto del jugador */}
			<div
				className={`flex items-center gap-1.5 ${isHome ? "justify-end" : "justify-start"}`}
			>
				<PlayerAvatar
					name={pair.playerOut.name}
					photoUrl={outPhoto}
					isHome={isHome}
				/>
				<span className="text-[15px] font-bold text-white leading-tight truncate min-w-0">
					{pair.playerOut.name}
				</span>
			</div>

			{/* Entra - dim + swap icon */}
			<div
				className={`flex items-center gap-1.5 ${isHome ? "justify-end" : "justify-start"}`}
			>
				<span
					className="material-symbols-outlined text-[14px] text-sky-400 flex-shrink-0"
					aria-hidden="true"
				>
					swap_horiz
				</span>
				<span className="text-[12px] text-white/70 leading-tight truncate min-w-0">
					{pair.playerIn.name}
				</span>
			</div>
		</div>
	);

	return (
		<div
			className="relative flex items-center py-1 animate-sub-pair-enter"
			role="group"
			aria-label={ariaLabel}
		>
			{/* Columna IZQUIERDA (HOME) — visible solo si isHome */}
			<div
				className={`flex-1 flex ${
					isHome ? "justify-end pr-3 md:pr-4" : "invisible"
				}`}
			>
				{isHome && subContent}
			</div>

			{/* Columna CENTRAL — píldora con el minuto (igual que en EventRow) */}
			<div className="flex-none w-12 flex items-center justify-center relative z-10">
				<div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-white/10 flex items-center justify-center font-stat-value text-[12px] font-black text-primary tabular-nums shadow-[0_0_8px_rgba(56,189,248,0.15)]">
					{pair.minute}'
				</div>
			</div>

			{/* Columna DERECHA (AWAY) — visible solo si !isHome */}
			<div
				className={`flex-1 flex ${
					!isHome ? "justify-start pl-3 md:pl-4" : "invisible"
				}`}
			>
				{!isHome && subContent}
			</div>
		</div>
	);
}

/* === PlayerAvatar (foto con fallback a iniciales, reutilizable) === */

/**
 * Avatar circular del jugador con foto y fallback a iniciales.
 * Reutilizable por `EventRow` (size "sm" = 24px) y `SubstitutionPairRow`
 * (size "md" = 28px).
 *
 * - Si `photoUrl` está disponible y el cache lo tiene, muestra la foto.
 * - Si no hay foto, no se cargó aún, o el CDN devolvió error, muestra iniciales.
 * - El ring usa el color del equipo (secondary=home, primary=away).
 *
 * Implementación:
 * - `useCachedImage` para evitar re-fetch de URLs ya cacheadas
 * - `useState` local para `onError` de la imagen (flip a iniciales)
 */
function PlayerAvatar({
	name,
	photoUrl,
	isHome,
}: {
	name: string;
	photoUrl: string | null;
	isHome: boolean;
}) {
	const cached = useCachedImage(photoUrl);
	const [imgErrored, setImgErrored] = useState(false);

	const ringClass = isHome ? "ring-secondary/60" : "ring-primary/60";
	const initialsBg = isHome ? "bg-secondary/30" : "bg-primary/30";
	const initialsText = isHome ? "text-secondary" : "text-primary";

	// Sin foto, sin cached, o imagen rota → iniciales
	if (!photoUrl || !cached || imgErrored) {
		return (
			<div
				className={`w-[50px] h-[50px] rounded-full ring-2 ${ringClass} ${initialsBg} flex items-center justify-center flex-shrink-0`}
				aria-hidden="true"
			>
				<span className={`text-[14px] font-black ${initialsText} leading-none`}>
					{getPlayerInitials(name)}
				</span>
			</div>
		);
	}

	return (
		<img
			src={cached}
			alt={name}
			loading="lazy"
			onError={() => setImgErrored(true)}
			className={`w-[50px] h-[50px] rounded-full ring-2 ${ringClass} object-cover flex-shrink-0`}
		/>
	);
}
