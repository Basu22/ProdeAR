/**
 * leagueStandings.ts — Lógica pura para calcular posiciones de formato LIGA
 * (todos contra todos) a partir de los matches de una competición.
 *
 * ============================================================================
 * CONTEXTO
 * ============================================================================
 * Análogo a `worldCupGroups.ts` (que calcula posiciones de fase de grupos
 * del Mundial), pero para competiciones en formato "todos contra todos"
 * (Liga Profesional Argentina, Premier League, etc.).
 *
 * ============================================================================
 * LÓGICA DE LIVE VS FINISHED (consistente con `getGroupTables`)
 * ============================================================================
 * Partido `finished` (con score final):
 *   - PJ += 1, GF += score, GC += score rival, DG = GF - GC
 *   - PG/PE/PP += 1 (según resultado)
 *   - Pts += 3 (victoria) | 1 (empate) | 0 (derrota)
 *
 * Partido `live` (con score parcial):
 *   - PJ += 1, GF += score, GC += score rival, DG = GF - GC
 *   - PG/PE/PP += 1 (según resultado proyectado)
 *   - Pts += 3 (victoria proyectada) | 1 (empate proyectado) | 0 (derrota proyectada)
 *   - `isLive = true` para que la UI muestre "EN JUEGO"
 *
 * Los puntos se asignan de forma proyectada durante el live para que la tabla
 * se reordene en tiempo real. Cuando el partido pasa a finished, el cálculo
 * es idéntico, por lo que no hay "saltos" en la tabla.
 *
 * ============================================================================
 * DESEMPATE
 * ============================================================================
 * Criterios FIFA estándar:
 *   1. Mayor cantidad de puntos
 *   2. Mayor diferencia de gol
 *   3. Mayor cantidad de goles a favor
 *   4. Nombre alfabético (desempate determinista, evita sort aleatorio)
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```ts
 * const matches: Match[] = ...; // partidos de la LPF
 * const standings = calculateLeagueStandings(matches);
 * // standings[0] = equipo en posición 1
 * ```
 *
 * @module lib/leagueStandings
 */

import type { LeagueStanding, Match } from "./types";

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Calcula la tabla de posiciones de una competición en formato "todos contra
 * todos" a partir de los partidos.
 *
 * ============================================================================
 * ALGORITMO
 * ============================================================================
 * 1. Construye un mapa `teamName → LeagueStanding` con stats en cero.
 * 2. Itera sobre cada partido finalizado o en vivo:
 *    a. Suma PJ, GF, GC, DG a ambos equipos (común a live y finished).
 *    b. Suma PG/PE/PP y Pts (proyectado en live, final en finished).
 *    c. Si live, marca `isLive = true` en ambos equipos.
 * 3. Ordena el array por PTS > DG > GF > teamName.
 * 4. Asigna `position` (1-based) en el array ordenado.
 *
 * ============================================================================
 * EQUIPOS SIN PARTIDOS
 * ============================================================================
 * Si un equipo está en `WORLD_CUP_GROUPS_DEF` pero nunca jugó, NO aparece
 * en el resultado (no hay forma de saber de qué equipo se trata sin un
 * match que lo referencie). En formato liga, los equipos "nuevos" se
 * descubren a partir de los matches que ya tenemos cargados.
 *
 * ============================================================================
 * @param matches - Array de partidos de la competición (típicamente de useMatches)
 * @returns Array de `LeagueStanding` ordenados por posición (1 = primero)
 */
export function calculateLeagueStandings(matches: Match[]): LeagueStanding[] {
	// 1. Construir mapa de equipos (se descubren desde los matches)
	const standingsMap: Record<string, LeagueStanding> = {};

	function ensureTeam(teamName: string, logo: string | null): LeagueStanding {
		if (!standingsMap[teamName]) {
			standingsMap[teamName] = {
				teamName,
				logo,
				pj: 0,
				pg: 0,
				pe: 0,
				pp: 0,
				gf: 0,
				gc: 0,
				dg: 0,
				pts: 0,
				isLive: false,
				position: 0,
			};
		}
		// Si la API trae un logo y todavía no teníamos, lo actualizamos
		if (logo && !standingsMap[teamName].logo) {
			standingsMap[teamName].logo = logo;
		}
		return standingsMap[teamName];
	}

	// 2. Iterar partidos
	for (const match of matches) {
		// Solo nos importan partidos con score (live o finished).
		// Upcoming (not_started) y cancelled/postponed no suman stats.
		if (
			(match.status === "finished" || match.status === "live") &&
			match.homeScore !== null &&
			match.awayScore !== null
		) {
			const home = ensureTeam(match.homeTeam, match.homeLogo);
			const away = ensureTeam(match.awayTeam, match.awayLogo);

			const hs = match.homeScore;
			const as = match.awayScore;

			// Común a live y finished: PJ, GF, GC, DG
			home.pj += 1;
			away.pj += 1;
			home.gf += hs;
			home.gc += as;
			away.gf += as;
			away.gc += hs;
			home.dg = home.gf - home.gc;
			away.dg = away.gf - away.gc;

			if (hs > as) {
				home.pg += 1;
				home.pts += 3;
				away.pp += 1;
			} else if (hs < as) {
				away.pg += 1;
				away.pts += 3;
				home.pp += 1;
			} else {
				home.pe += 1;
				away.pe += 1;
				home.pts += 1;
				away.pts += 1;
			}

			if (match.status === "live") {
				home.isLive = true;
				away.isLive = true;
			}
		}
	}

	// 3. Ordenar por PTS > DG > GF > teamName
	const sorted = Object.values(standingsMap).sort((a, b) => {
		if (b.pts !== a.pts) return b.pts - a.pts;
		if (b.dg !== a.dg) return b.dg - a.dg;
		if (b.gf !== a.gf) return b.gf - a.gf;
		return a.teamName.localeCompare(b.teamName);
	});

	// 4. Asignar position (1-based)
	sorted.forEach((standing, index) => {
		standing.position = index + 1;
	});

	return sorted;
}

/**
 * Agrupa los partidos de una competición por "fecha" (matchday) y los ordena
 * cronológicamente. Usado por `GroupMatchesAccordion` en formato `league`
 * para mostrar los partidos debajo de cada grupo/fecha.
 *
 * ============================================================================
 * @param matches - Array de partidos de la competición
 * @returns Map<matchday, Match[]> donde cada matchday tiene sus partidos
 *          ordenados por kickOff ascendente.
 */
export function groupMatchesByMatchday(matches: Match[]): Map<number, Match[]> {
	const grouped = new Map<number, Match[]>();

	for (const match of matches) {
		const matchday = match.matchday;
		if (!grouped.has(matchday)) {
			grouped.set(matchday, []);
		}
		grouped.get(matchday)!.push(match);
	}

	// Ordenar partidos dentro de cada matchday por kickOff
	for (const [, list] of grouped) {
		list.sort(
			(a, b) => new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
		);
	}

	// Retornar en orden de matchday ascendente
	return new Map([...grouped.entries()].sort(([a], [b]) => a - b));
}
