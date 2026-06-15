import type { MatchEvent } from "./types";

/**
 * Conteo de eventos agrupados por tipo.
 * Usado por F1 (resumen de eventos) y por F11 (cambios emparejados).
 */
export interface EventCounts {
	goals: number;
	yellows: number;
	reds: number;
	substitutions: number;
	var: number;
}

/**
 * Item de resumen para renderizar en el EventSummaryBar (F1).
 * Contiene los datos semánticos (icon, color, label) que la UI necesita.
 */
export interface EventSummaryItem {
	type: "goal" | "yellow" | "red" | "subst" | "var";
	count: number;
	icon: string;
	label: string;
	colorClass: string;
	bgClass: string;
	borderClass: string;
}

/**
 * Par de sustitución emparejada (F11).
 * Representa un cambio como una unidad: sale uno, entra otro.
 *
 * Convención API-Football (verificada en `supabase/functions/poll-scores/index.ts`
 * línea 864 y docs de API-Football v3):
 * - event.type === "subst"
 * - event.playerName = jugador que **ENTRA** (came in)
 * - event.assistName = jugador que **SALE** (came off)
 */
export interface SubPair {
	__type: "subPair";
	id: string;
	minute: number;
	team: "home" | "away";
	/**
	 * Foto del jugador. Se popula en `EventosTab` vía `resolveSubstitutionPhoto`
	 * (que matchea por nombre contra `match.lineups` y busca en `match.playerPhotos`).
	 * Opcional: si es undefined, la UI debe resolverlo o caer a iniciales.
	 */
	playerOut: {
		name: string;
		number: number | null;
		photoUrl?: string | null;
	};
	playerIn: {
		name: string;
		number: number | null;
		photoUrl?: string | null;
	};
}

/**
 * Unión para renderizar en la timeline:
 * - MatchEvent normal (goles, tarjetas, etc.)
 * - SubPair cuando hay 2 sustituciones consecutivas del mismo equipo
 */
export type TimelineItem = MatchEvent | SubPair;

/**
 * Type guard para SubPair.
 */
export function isSubPair(item: TimelineItem): item is SubPair {
	return (item as SubPair).__type === "subPair";
}

/**
 * Cuenta eventos agrupados por tipo. Acepta array nulo o indefinido.
 * Retorna todos los counts en 0 si no hay eventos.
 */
export function countEventsByType(
	events: MatchEvent[] | null | undefined,
): EventCounts {
	const empty: EventCounts = {
		goals: 0,
		yellows: 0,
		reds: 0,
		substitutions: 0,
		var: 0,
	};
	if (!events || events.length === 0) return empty;

	for (const e of events) {
		switch (e.type) {
			case "goal":
				empty.goals += 1;
				break;
			case "yellow":
				empty.yellows += 1;
				break;
			case "red":
				empty.reds += 1;
				break;
			case "subst":
				empty.substitutions += 1;
				break;
			case "var":
				empty.var += 1;
				break;
			// "info" no se cuenta en el resumen principal
		}
	}
	return empty;
}

/**
 * Genera los items de resumen (pills) que se muestran arriba del timeline.
 * Solo incluye items con count > 0, y los VAR solo si count > 0.
 *
 * Orden: Gol → Amarilla → Roja → Cambio → VAR.
 */
export function getEventSummary(
	events: MatchEvent[] | null | undefined,
): EventSummaryItem[] {
	const c = countEventsByType(events);
	const items: EventSummaryItem[] = [];

	if (c.goals > 0) {
		items.push({
			type: "goal",
			count: c.goals,
			icon: "sports_soccer",
			label: c.goals === 1 ? "gol" : "goles",
			colorClass: "text-pitch-green",
			bgClass: "bg-pitch-green/10",
			borderClass: "border-pitch-green/30",
		});
	}
	if (c.yellows > 0) {
		items.push({
			type: "yellow",
			count: c.yellows,
			icon: "square",
			label: c.yellows === 1 ? "amarilla" : "amarillas",
			colorClass: "text-amber-400",
			bgClass: "bg-amber-500/10",
			borderClass: "border-amber-500/30",
		});
	}
	if (c.reds > 0) {
		items.push({
			type: "red",
			count: c.reds,
			icon: "square",
			label: c.reds === 1 ? "roja" : "rojas",
			colorClass: "text-error",
			bgClass: "bg-error/10",
			borderClass: "border-error/30",
		});
	}
	if (c.substitutions > 0) {
		items.push({
			type: "subst",
			count: c.substitutions,
			icon: "change_circle",
			label: c.substitutions === 1 ? "cambio" : "cambios",
			colorClass: "text-sky-400",
			bgClass: "bg-sky-500/10",
			borderClass: "border-sky-500/30",
		});
	}
	if (c.var > 0) {
		items.push({
			type: "var",
			count: c.var,
			icon: "video_camera_back",
			label: c.var === 1 ? "VAR" : "VARs",
			colorClass: "text-purple-400",
			bgClass: "bg-purple-500/10",
			borderClass: "border-purple-500/30",
		});
	}

	return items;
}

/**
 * Empareja sustituciones (F11).
 *
 * Reglas:
 * 1. Solo se emparejan eventos con `type === "subst"` y `assistName` no vacío.
 * 2. Dos sustituciones se emparejan si son del MISMO equipo y MISMO minuto (±1 minuto de tolerancia).
 * 3. Si una sustitución no tiene par, se queda como MatchEvent normal.
 *
 * Retorna una lista de TimelineItem (mezcla de MatchEvent y SubPair).
 * La lista está ordenada por minuto real (minute + extra).
 */
export function pairSubstitutions(
	events: MatchEvent[] | null | undefined,
): TimelineItem[] {
	if (!events || events.length === 0) return [];

	const sorted = [...events].sort(
		(a, b) => realMinute(a) - realMinute(b),
	);
	const result: TimelineItem[] = [];
	const consumed = new Set<string>();

	for (let i = 0; i < sorted.length; i++) {
		const e = sorted[i];
		if (consumed.has(e.id)) continue;

		// Solo intentamos emparejar substitutions con assistName
		if (e.type !== "subst" || !e.assistName) {
			result.push(e);
			continue;
		}

		// Buscar un par en el siguiente evento (o dos)
		let pair: MatchEvent | null = null;
		for (let j = i + 1; j < sorted.length; j++) {
			const candidate = sorted[j];
			if (consumed.has(candidate.id)) continue;
			if (candidate.type !== "subst") break; // solo substitutions emparejan entre sí
			if (candidate.team !== e.team) break;
			if (!candidate.assistName) break;
			if (Math.abs(realMinute(candidate) - realMinute(e)) > 1) break;
			pair = candidate;
			break;
		}

		if (pair) {
			consumed.add(e.id);
			consumed.add(pair.id);
			result.push({
				__type: "subPair",
				id: `subpair-${e.id}-${pair.id}`,
				minute: realMinute(e),
				team: e.team,
				// API-Football: player = entra, assist = sale
				playerOut: {
					name: e.assistName,
					number: e.detail ? extractNumber(e.detail) : null,
				},
				playerIn: {
					name: e.playerName,
					number: e.detail ? extractNumber(e.detail) : null,
				},
			});
		} else {
			// No encontramos par. Si tiene assistName (ambos nombres disponibles),
			// sintetizamos un SubPair para que la UI muestre el formato unificado
			// (sale bold / entra dim) en vez del fallback con emoji 🔄.
			// Si no tiene assistName, lo dejamos como evento normal (datos incompletos).
			if (e.assistName) {
				result.push({
					__type: "subPair",
					id: `subpair-single-${e.id}`,
					minute: realMinute(e),
					team: e.team,
					playerOut: {
						name: e.assistName,
						number: e.detail ? extractNumber(e.detail) : null,
					},
					playerIn: {
						name: e.playerName,
						number: e.detail ? extractNumber(e.detail) : null,
					},
				});
			} else {
				result.push(e);
			}
		}
	}

	return result;
}

/**
 * Minuto real de un evento (minute + extra).
 */
function realMinute(e: MatchEvent): number {
	return e.minute + (e.extra ?? 0);
}

/**
 * Intenta extraer un número de jersey de un string tipo "Number 8" o "8".
 * Retorna null si no encuentra un número válido.
 */
function extractNumber(detail: string): number | null {
	const match = detail.match(/\d+/);
	if (!match) return null;
	const n = Number.parseInt(match[0], 10);
	return Number.isNaN(n) ? null : n;
}

/**
 * Helper para que la UI pueda leer el nombre del jugador de un TimelineItem.
 */
export function getItemPrimaryName(item: TimelineItem): string {
	if (isSubPair(item)) return item.playerOut.name;
	return item.playerName;
}

/**
 * Helper para que la UI pueda leer el equipo de un TimelineItem.
 */
export function getItemTeam(item: TimelineItem): "home" | "away" {
	return item.team;
}
