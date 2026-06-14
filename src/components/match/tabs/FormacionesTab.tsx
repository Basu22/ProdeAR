import { useMemo } from "react";
import { useMockMatchData } from "../../../hooks/useMockMatchData";
import { useCachedImage } from "../../../lib/imageCache";
import { getPlayerInitials } from "../../../lib/playerHelpers";
import type { Match, TacticalPlayerInfo, TeamLineup } from "../../../lib/types";

interface FormacionesTabProps {
	match: Match;
}

/**
 * Tab "Formaciones" del Match Bottom Sheet.
 * Sprint 1:
 * - F10: solo lectura, muestra la cancha con los 11 titulares de cada equipo
 * - F6: pins coloreados por posición G/D/M/F
 * - Commit 7: usa `useMockMatchData` para fallback de mocks en DEV
 */
export function FormacionesTab({ match }: FormacionesTabProps) {
	const { lineups, isMockedLineups } = useMockMatchData(match);

	if (!lineups || lineups.length < 2) {
		return (
			<EmptyState
				icon="search_off"
				message="SIN INFORMACIÓN DISPONIBLE"
				submessage="Las alineaciones se publican cerca del inicio del partido"
			/>
		);
	}

	return (
		<div className="space-y-4">
			{isMockedLineups && <DemoTag />}
			{/* The Tactical Pitch Board */}
			<div className="glass-card rounded-xl overflow-hidden aspect-[3/4] md:aspect-[4/3] relative pitch-grid border-white/10 shadow-2xl flex flex-col justify-between py-4 max-w-md mx-auto">
				{/* Field Overlay & Markings */}
				<div className="absolute inset-0 bg-black/45 pointer-events-none" />
				<div className="absolute top-1/2 w-full h-px bg-white/20 pointer-events-none" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/10 rounded-full pointer-events-none" />

				{/* Home Team (Top Half, descending rows) */}
				<TacticalTeamFormation lineup={lineups[0]} isHome />

				{/* Away Team (Bottom Half, ascending rows) */}
				<TacticalTeamFormation lineup={lineups[1]} isHome={false} />
			</div>

			{/* Coaches & Substitutes Panel */}
			<div className="grid sm:grid-cols-2 gap-3 bg-surface-container-low/40 rounded-xl p-3 border border-white/5 text-[10px]">
				{/* Home Details */}
				<div className="space-y-2">
					<div className="pb-1 border-b border-white/5">
						<p className="font-bold text-secondary uppercase truncate">
							{match.homeTeam}
						</p>
						<p className="text-[9px] text-on-surface-variant">
							DT:{" "}
							<span className="text-white font-bold">
								{lineups[0].coach.name || "No disponible"}
							</span>
						</p>
					</div>
					<div>
						<p className="text-[9px] font-bold text-on-surface-variant/70 mb-1">
							SUPLENTES
						</p>
						<ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/90">
							{lineups[0].substitutes.map((s) => (
								<li key={s.player.id} className="truncate">
									<span className="text-[8px] font-black text-secondary mr-1 bg-white/5 px-1 rounded">
										{s.player.number}
									</span>
									{s.player.name}
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Away Details */}
				<div className="space-y-2">
					<div className="pb-1 border-b border-white/5">
						<p className="font-bold text-primary uppercase truncate text-glowing">
							{match.awayTeam}
						</p>
						<p className="text-[9px] text-on-surface-variant">
							DT:{" "}
							<span className="text-white font-bold">
								{lineups[1].coach.name || "No disponible"}
							</span>
						</p>
					</div>
					<div>
						<p className="text-[9px] font-bold text-on-surface-variant/70 mb-1">
							SUPLENTES
						</p>
						<ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/90">
							{lineups[1].substitutes.map((s) => (
								<li key={s.player.id} className="truncate">
									<span className="text-[8px] font-black text-primary mr-1 bg-primary/10 px-1 rounded">
										{s.player.number}
									</span>
									{s.player.name}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}

interface TacticalTeamFormationProps {
	lineup: TeamLineup;
	isHome: boolean;
}

function TacticalTeamFormation({ lineup, isHome }: TacticalTeamFormationProps) {
	// Group players by row based on coordinate grid "row:col" or pos fallback
	const rows = useMemo(() => {
		const groups: Record<number, TacticalPlayerInfo[]> = {};

		// Grid positional mapping
		for (const p of lineup.startXI) {
			let rowNum = 1;
			if (p.player.grid) {
				const [rStr] = p.player.grid.split(":");
				rowNum = Number.parseInt(rStr, 10) || 1;
			} else {
				// Position fallback
				const pos = p.player.pos.toUpperCase();
				if (pos === "G") rowNum = 1;
				else if (pos === "D") rowNum = 2;
				else if (pos === "M") rowNum = 3;
				else rowNum = 4;
			}

			if (!groups[rowNum]) groups[rowNum] = [];
			groups[rowNum].push(p);
		}

		// Sort columns within rows
		const sortedRowKeys = Object.keys(groups)
			.map(Number)
			.sort((a, b) => a - b);

		const finalRows = sortedRowKeys.map((key) => {
			const rowPlayers = groups[key];
			// Sort left-to-right based on grid column
			rowPlayers.sort((a, b) => {
				const colA = a.player.grid
					? Number.parseInt(a.player.grid.split(":")[1], 10) || 0
					: 0;
				const colB = b.player.grid
					? Number.parseInt(b.player.grid.split(":")[1], 10) || 0
					: 0;
				return colA - colB;
			});
			return { rowNum: key, players: rowPlayers };
		});

		// For home, render row 1 (GK) down to row 4 (FW).
		// For away, render row 4 (FW) down to row 1 (GK) to face each other.
		if (!isHome) {
			finalRows.reverse();
		}

		return finalRows;
	}, [lineup, isHome]);

	return (
		<div className="relative z-10 flex flex-col justify-around h-[45%]">
				{rows.map((row) => (
					<div
						key={row.rowNum}
						className="flex justify-around w-full max-w-xs mx-auto"
					>
						{row.players.map((p) => (
							<TacticalPlayerPin
								key={p.player.id}
								name={p.player.name}
								number={p.player.number}
								pos={p.player.pos}
								photo={p.player.photo ?? null}
								isHome={isHome}
							/>
						))}
					</div>
				))}
		</div>
	);
}

/**
 * Mapea la posición del jugador (G/D/M/F) a clases CSS de color.
 * Sprint 1 F6: pins coloreados por posición.
 * - G (Arquero): gold
 * - D (Defensor): cyan
 * - M (Mediocampista): verde cancha
 * - F (Delantero): rojo
 */
function getPosColorClasses(pos: string, isHome: boolean): string {
	// Away team usa colores con texto blanco; home usa texto negro para mejor contraste
	const posKey = pos.toUpperCase();

	if (posKey === "G") {
		return isHome
			? "bg-pos-g text-on-pos-g border-pos-glow-g/40"
			: "bg-pos-g text-on-pos-g border-pos-glow-g/40";
	}
	if (posKey === "D") {
		return isHome
			? "bg-pos-d text-on-pos-d border-pos-glow-d/40"
			: "bg-pos-d text-on-pos-d border-pos-glow-d/40";
	}
	if (posKey === "M") {
		return isHome
			? "bg-pos-m text-on-pos-m border-pos-glow-m/40"
			: "bg-pos-m text-on-pos-m border-pos-glow-m/40";
	}
	if (posKey === "F") {
		return isHome
			? "bg-pos-f text-on-pos-f border-pos-glow-f/40"
			: "bg-pos-f text-on-pos-f border-pos-glow-f/40";
	}
	// Fallback para posiciones desconocidas
	return isHome
		? "bg-surface-container-high border-white/20 text-white"
		: "bg-primary text-on-primary border-primary-fixed-dim shadow-[0_0_8px_rgba(0,229,255,0.2)]";
}

const POS_FULL_NAME: Record<string, string> = {
	G: "Arquero",
	D: "Defensor",
	M: "Mediocampista",
	F: "Delantero",
};

function TacticalPlayerPin({
	name,
	number,
	pos,
	photo,
	isHome,
}: {
	name: string;
	number: number;
	pos: string;
	photo: string | null;
	isHome: boolean;
}) {
	// Visual styling basado en posición (F6). En home/away solo cambia el outline.
	const pinColors = getPosColorClasses(pos, isHome);
	const posName = POS_FULL_NAME[pos.toUpperCase()] ?? "Jugador";

	// Truncate player name for pin label (e.g. Advíncula -> Advin..)
	const displayName = name.length > 9 ? `${name.substring(0, 8)}.` : name;

	// A11y: aria-label completo con posición, número y nombre
	const ariaLabel = `${posName} número ${number}, ${name}`;

	// Border color según posición (sin fondo) — para usar alrededor de la foto
	const posBorderClass = getPosBorderClass(pos);

	// Iniciales para fallback cuando no hay foto
	const initials = getPlayerInitials(name);

	// Sprint 3 Fix (#5): cache local de imágenes vía useCachedImage
	const cachedPhoto = useCachedImage(photo);

	return (
		<div
			className="pin-pos flex flex-col items-center select-none"
			role="img"
			aria-label={ariaLabel}
		>
			<div className="relative w-8 h-8 md:w-9 md:h-9">
				{/* Foto del jugador o fallback con iniciales */}
				{cachedPhoto ? (
					<img
						src={cachedPhoto}
						alt=""
						className={`w-full h-full rounded-full object-cover border-2 shadow-md ${posBorderClass}`}
						loading="lazy"
					/>
				) : (
					<div
						className={`w-full h-full rounded-full flex items-center justify-center font-stat-value text-[11px] md:text-[12px] font-black border-2 shadow-md ${pinColors}`}
					>
						{initials}
					</div>
				)}

				{/* Badge del número de camiseta (esquina superior derecha) */}
				<div
					className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full ${pinColors} flex items-center justify-center text-[9px] md:text-[10px] font-black border border-white/30 px-1 tabular-nums`}
				>
					{number}
				</div>
			</div>

			{/* Nombre del jugador (debajo del pin) */}
			<span className="font-label-caps text-[7px] md:text-[8px] text-white/95 bg-black/60 px-1 py-0.5 rounded border border-white/5 mt-1 max-w-[56px] truncate">
				{displayName}
			</span>
		</div>
	);
}

/**
 * Border color de la foto del jugador según posición (F6).
 * Solo el border — el fondo del pin se ve a través de la imagen.
 */
function getPosBorderClass(pos: string): string {
	const posKey = pos.toUpperCase();
	if (posKey === "G") return "border-pos-g";
	if (posKey === "D") return "border-pos-d";
	if (posKey === "M") return "border-pos-m";
	if (posKey === "F") return "border-pos-f";
	return "border-white/30";
}

function EmptyState({
	icon,
	message,
	submessage,
}: {
	icon: string;
	message: string;
	submessage?: string;
}) {
	return (
		<div className="text-center py-6 flex flex-col items-center gap-2">
			<span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
				{icon}
			</span>
			<span className="font-label-caps text-[10px] md:text-xs text-on-surface-variant/70 uppercase tracking-widest font-bold">
				{message}
			</span>
			{submessage && (
				<span className="text-[9px] md:text-[10px] text-on-surface-variant/40 leading-relaxed max-w-xs">
					{submessage}
				</span>
			)}
		</div>
	);
}

/**
 * Tag discreto "DEMO" para indicar que los datos son mocks.
 * Solo se renderiza en DEV (cuando `isMocked*` es true).
 * Sprint 1 Commit 7: extraído a patrón reusable (idéntico en StatsTab).
 */
function DemoTag() {
	return (
		<div className="flex justify-end">
			<span className="font-label-caps text-[8px] text-on-surface-variant/50 bg-surface-container-high/40 border border-white/10 px-1.5 py-0.5 rounded tracking-widest">
				DEMO
			</span>
		</div>
	);
}
