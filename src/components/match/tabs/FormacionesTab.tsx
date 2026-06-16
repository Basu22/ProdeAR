import { useMemo, useState } from "react";
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
			<div className="glass-card rounded-xl overflow-hidden min-h-[480px] relative pitch-grid border-white/10 shadow-2xl flex flex-col justify-between py-5 max-w-md mx-auto">
				{/* Field Overlay (oscurece levemente para que destaquen las marcas blancas) */}
				<div className="absolute inset-0 bg-black/35 pointer-events-none" />

				{/* === Field Markings (z-0, decorativos) === */}
				{/* Área grande superior (penalty area) */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[64%] h-[28%] border border-white/10 rounded-b-sm pointer-events-none" />
				{/* Área del arquero superior (6-yard box) */}
				<div className="absolute top-[1%] left-1/2 -translate-x-1/2 w-[32%] h-[15%] border border-white/10 rounded-b-sm pointer-events-none" />
				{/* Arco superior (travesaño) */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[14%] h-[2.5%] border border-white/15 border-b-0 pointer-events-none" />
				{/* Círculo central */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] aspect-square border border-white/15 rounded-full pointer-events-none" />
				{/* Línea media */}
				<div className="absolute top-1/2 w-full h-px bg-white/15 pointer-events-none" />
				{/* Arco inferior (travesaño) */}
				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[14%] h-[2.5%] border border-white/15 border-t-0 pointer-events-none" />
				{/* Área del arquero inferior (6-yard box) */}
				<div className="absolute bottom-[1%] left-1/2 -translate-x-1/2 w-[32%] h-[15%] border border-white/10 rounded-t-sm pointer-events-none" />
				{/* Área grande inferior (penalty area) */}
				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[64%] h-[28%] border border-white/10 rounded-t-sm pointer-events-none" />

				{/* Home Team (Top Half, descending rows) */}
				<TacticalTeamFormation lineup={lineups[0]} isHome />

				{/* Away Team (Bottom Half, ascending rows) */}
				<TacticalTeamFormation lineup={lineups[1]} isHome={false} />
			</div>

			{/* Coaches & Substitutes Panel — siempre 2 columnas lado a lado */}
			<div className="grid grid-cols-2 gap-3 bg-surface-container-low/40 rounded-xl p-3 border border-white/5 text-[10px]">
				{/* Home Details */}
				<div className="space-y-2">
					{/* Team name */}
					<p className="font-bold text-secondary uppercase truncate pb-1 border-b border-white/5">
						{match.homeTeam}
					</p>

					{/* Substitutes: photo + number + name (1 por fila, vertical, nombre wrappea) */}
					<ul className="flex flex-col gap-1.5">
						{lineups[0].substitutes.map((s) => (
							<li key={s.player.id} className="flex items-center gap-2 min-w-0">
								<SubstituteAvatar
									name={s.player.name}
									number={s.player.number}
									photo={s.player.photo ?? null}
									isHome={true}
								/>
								<span className="text-[10px] text-white leading-tight min-w-0 flex-1">
									{s.player.name}
								</span>
							</li>
						))}
					</ul>

					{/* DT (coach) at the bottom with photo */}
					<div className="pt-2 border-t border-white/5 flex items-center gap-2">
						<CoachAvatar
							name={lineups[0].coach.name ?? "DT"}
							photo={lineups[0].coach.photo}
							isHome={true}
						/>
						<div className="min-w-0 flex-1">
							<p className="text-[8px] text-on-surface-variant uppercase tracking-wider font-bold">
								DT
							</p>
							<p className="text-[11px] text-white font-bold truncate">
								{lineups[0].coach.name || "No disponible"}
							</p>
						</div>
					</div>
				</div>

				{/* Away Details */}
				<div className="space-y-2">
					{/* Team name */}
					<p className="font-bold text-primary uppercase truncate text-glowing pb-1 border-b border-white/5">
						{match.awayTeam}
					</p>

					{/* Substitutes: photo + number + name (1 por fila, vertical, nombre wrappea) */}
					<ul className="flex flex-col gap-1.5">
						{lineups[1].substitutes.map((s) => (
							<li key={s.player.id} className="flex items-center gap-2 min-w-0">
								<SubstituteAvatar
									name={s.player.name}
									number={s.player.number}
									photo={s.player.photo ?? null}
									isHome={false}
								/>
								<span className="text-[10px] text-white leading-tight min-w-0 flex-1">
									{s.player.name}
								</span>
							</li>
						))}
					</ul>

					{/* DT (coach) at the bottom with photo */}
					<div className="pt-2 border-t border-white/5 flex items-center gap-2">
						<CoachAvatar
							name={lineups[1].coach.name ?? "DT"}
							photo={lineups[1].coach.photo}
							isHome={false}
						/>
						<div className="min-w-0 flex-1">
							<p className="text-[8px] text-on-surface-variant uppercase tracking-wider font-bold">
								DT
							</p>
							<p className="text-[11px] text-white font-bold truncate">
								{lineups[1].coach.name || "No disponible"}
							</p>
						</div>
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

/**
 * Mapa de `flex-basis` + `flex-grow` por fila para que GK y FWD queden
 * compactos contra los extremos (arco y círculo central respectivamente),
 * mientras DEF y MID absorben el espacio sobrante.
 *
 * - GK (rowNum 1) y FWD (rowNum 4): basis 60px + grow bajo → ~80px total
 * - DEF (rowNum 2) y MID (rowNum 3): basis 80px + grow alto → ~140px total
 *
 * Total basis: 60+80+80+60 = 280px. Con grow ratio 0.5+1.5+1.5+0.5=4.0,
 * en una cancha de 480px (440px disponibles) cada grow unit = 40px.
 * → GK: 80px | DEF: 140px | MID: 140px | FWD: 80px (suma 440px ✅).
 */
const ROW_FLEX: Record<number, string> = {
	1: "basis-[60px] grow-[0.5]", // GK
	2: "basis-[80px] grow-[1.5]", // DEF
	3: "basis-[80px] grow-[1.5]", // MID
	4: "basis-[60px] grow-[0.5]", // FWD
};

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
		<div className="relative z-10 flex flex-col flex-1">
			{rows.map((row) => (
				<div
					key={row.rowNum}
					className={`flex items-center w-full px-3 gap-x-2 ${
						row.players.length === 1 ? "justify-center" : "justify-evenly"
					} ${ROW_FLEX[Math.min(row.rowNum, 4)]}`}
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
			<div className="relative w-[50px] h-[50px]">
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
						className={`w-full h-full rounded-full flex items-center justify-center font-stat-value text-[14px] font-black border-2 shadow-md ${pinColors}`}
					>
						{initials}
					</div>
				)}

				{/* Badge del número de camiseta (esquina inferior derecha) */}
				<div
					className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full ${pinColors} flex items-center justify-center text-[10px] font-black border border-white/30 px-1 tabular-nums`}
				>
					{number}
				</div>
			</div>

			{/* Nombre del jugador (debajo del pin) */}
			<span className="font-label-caps text-[11px] text-white/95 bg-black/60 px-1 py-0.5 rounded border border-white/5 mt-1 max-w-[80px] truncate">
				{name}
			</span>
		</div>
	);
}

/* === SubstituteAvatar (foto 20px + número, layout horizontal) === */

/**
 * Avatar compacto de suplente: foto 20px con badge de número en la
 * esquina inferior derecha, en layout horizontal junto al nombre.
 *
 * Reutiliza `useCachedImage` para cachear la foto del CDN.
 * Si no hay foto, muestra iniciales con fondo neutro.
 */
function SubstituteAvatar({
	name,
	number,
	photo,
	isHome,
}: {
	name: string;
	number: number;
	photo: string | null;
	isHome: boolean;
}) {
	const cached = useCachedImage(photo);
	const [imgErrored, setImgErrored] = useState(false);

	const ringClass = isHome ? "ring-secondary/60" : "ring-primary/60";
	const badgeBg = isHome ? "bg-secondary" : "bg-primary";
	const badgeText = isHome ? "text-on-secondary" : "text-on-primary";
	const initialsBg = isHome ? "bg-secondary/30" : "bg-primary/30";
	const initialsText = isHome ? "text-secondary" : "text-primary";

	// Badge del número (esquina inferior derecha) — 18px convención
	const numberBadge = (
		<div
			className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full ${badgeBg} ${badgeText} flex items-center justify-center text-[10px] font-black border border-white/30 px-1 tabular-nums leading-none`}
		>
			{number}
		</div>
	);

	if (!photo || !cached || imgErrored) {
		return (
			<div
				className={`relative w-[50px] h-[50px] rounded-full ring-2 ${ringClass} ${initialsBg} flex items-center justify-center flex-shrink-0`}
				aria-hidden="true"
			>
				<span className={`text-[14px] font-black ${initialsText} leading-none`}>
					{getPlayerInitials(name)}
				</span>
				{numberBadge}
			</div>
		);
	}

	return (
		<div className="relative w-[50px] h-[50px] flex-shrink-0">
			<img
				src={cached}
				alt={name}
				loading="lazy"
				onError={() => setImgErrored(true)}
				className={`w-full h-full rounded-full ring-2 ${ringClass} object-cover`}
			/>
			{numberBadge}
		</div>
	);
}

/* === CoachAvatar (foto 30px sin número, con icono de fallback) === */

/**
 * Avatar del director técnico (DT/Coach): foto 30px sin número, con
 * icono `person` de Material Symbols como fallback cuando no hay foto.
 *
 * Se renderiza en la parte inferior del panel de suplentes junto al
 * nombre y label "DT".
 */
function CoachAvatar({
	name,
	photo,
	isHome,
}: {
	name: string;
	photo: string | null;
	isHome: boolean;
}) {
	const cached = useCachedImage(photo);
	const [imgErrored, setImgErrored] = useState(false);

	const ringClass = isHome ? "ring-secondary/60" : "ring-primary/60";
	const initialsBg = isHome ? "bg-secondary/30" : "bg-primary/30";

	if (!photo || !cached || imgErrored) {
		return (
			<div
				className={`w-[50px] h-[50px] rounded-full ring-2 ${ringClass} ${initialsBg} flex items-center justify-center flex-shrink-0`}
				aria-hidden="true"
			>
				<span className="material-symbols-outlined text-[24px] text-white/60 leading-none">
					person
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
