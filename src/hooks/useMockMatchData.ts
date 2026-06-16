import { useMemo } from "react";
import { PLAYERS } from "../lib/api/mockData";
import { enrichLineupsWithPhotos } from "../lib/playerHelpers";
import type {
	Match,
	MatchEvent,
	PlayerPhoto,
	TacticalPlayerInfo,
	TeamLineup,
	TeamStats,
} from "../lib/types";

/**
 * Datos enriquecidos de un partido con mocks determinísticos como fallback.
 *
 * Sprint 1 Commit 7: extrae los 216 líneas de generadores mock del antiguo
 * `MatchDetailsTabs.tsx` (ya eliminado) a un hook reutilizable.
 *
 * Reglas de fallback:
 * 1. Si `match.events/stats/lineups` tienen datos, usarlos.
 * 2. Si no, y el partido es `live` o `finished`, y estamos en DEV,
 *    generar mocks determinísticos (seeded by match.id).
 * 3. Si no, retornar `null` (la UI muestra empty state).
 *
 * ⚠️ GUARD CRÍTICO: en producción (`!import.meta.env.DEV`), NUNCA se
 * generan mocks. Retorna `null` directamente. Esto previene mostrar
 * stats/lineups inventados a usuarios reales.
 */
export interface MockMatchData {
	events: MatchEvent[] | null;
	stats: TeamStats[] | null;
	lineups: TeamLineup[] | null;
	playerPhotos: PlayerPhoto[];
	isMockedEvents: boolean;
	isMockedStats: boolean;
	isMockedLineups: boolean;
}

export function useMockMatchData(match: Match): MockMatchData {
	// Memoizar por match.id (no por match) para evitar re-generar mocks en cada poll
	return useMemo(() => {
		const isLiveOrFinished =
			match.status === "live" || match.status === "finished";

		// === Events ===
		let events: MatchEvent[] | null = null;
		let isMockedEvents = false;
		if (match.events && match.events.length > 0) {
			events = match.events;
		} else if (isLiveOrFinished && import.meta.env.DEV) {
			// No generamos mocks de eventos (sería demasiado).
			// Si no hay eventos reales, se queda en null.
			events = null;
			isMockedEvents = false;
		}

		// === Stats ===
		let stats: TeamStats[] | null = null;
		let isMockedStats = false;
		if (match.stats && match.stats.length >= 2) {
			stats = match.stats;
		} else if (isLiveOrFinished && import.meta.env.DEV) {
			stats = generateMockStats(match);
			isMockedStats = true;
		}

		// === Lineups ===
		let lineups: TeamLineup[] | null = null;
		let isMockedLineups = false;
		if (match.lineups && match.lineups.length >= 2) {
			lineups = match.lineups;
		} else if (isLiveOrFinished && import.meta.env.DEV) {
			lineups = generateMockLineups(match);
			isMockedLineups = true;
		}

		// === Player Photos (Sprint 2) ===
		// Enriquecer lineups con fotos si hay player_photos en el match.
		// En producción, `match.playerPhotos` viene de la DB via `mapDbMatchToFrontend`.
		// En DEV con mocks, no generamos fotos (el componente muestra iniciales como fallback).
		const playerPhotos: PlayerPhoto[] = match.playerPhotos ?? [];
		if (lineups && playerPhotos.length > 0) {
			lineups = enrichLineupsWithPhotos(lineups, playerPhotos);
		}

		return {
			events,
			stats,
			lineups,
			playerPhotos,
			isMockedEvents,
			isMockedStats,
			isMockedLineups,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		match.id,
		match.status,
		match.events,
		match.stats,
		match.lineups,
		match.playerPhotos,
	]);
}

/* === Generadores determinísticos (seeded by match.id) === */

/**
 * Generador de seed determinístico basado en match.id.
 * Mismo match.id → mismo seed → mismos mocks.
 */
function getSeed(matchId: string): number {
	let seed = 0;
	for (let i = 0; i < matchId.length; i++) {
		seed += matchId.charCodeAt(i);
	}
	return seed;
}

/**
 * PRNG determinístico (Mulberry32) basado en un seed numérico.
 * Retorna función que genera números en [0, 1).
 */
function makeRng(seed: number): () => number {
	let s = seed;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Genera stats mock determinísticas basadas en el match.
 * Reproduce las 6 stats principales que mostraba el antiguo MatchDetailsTabs.
 */
function generateMockStats(match: Match): TeamStats[] {
	const rng = makeRng(getSeed(match.id));
	const homeS = match.homeScore ?? 0;
	const awayS = match.awayScore ?? 0;

	// Posession: 40-60% para el local (resto para el visitante)
	const homePos = 40 + Math.floor(rng() * 20);
	const awayPos = 100 - homePos;

	// Shots
	const homeShots = 5 + homeS * 2 + Math.floor(rng() * 5);
	const awayShots = 5 + awayS * 2 + Math.floor(rng() * 5);

	// Corners: 2-8
	const homeCorners = 2 + Math.floor(rng() * 6);
	const awayCorners = 2 + Math.floor(rng() * 6);

	// Fouls: 8-18
	const homeFouls = 8 + Math.floor(rng() * 10);
	const awayFouls = 8 + Math.floor(rng() * 10);

	// Passes: 320-470
	const homePasses = 320 + Math.floor(rng() * 150);
	const awayPasses = 320 + Math.floor(rng() * 150);

	return [
		{
			team: { id: 1, name: match.homeTeam, logo: match.homeLogo || "" },
			statistics: [
				{ type: "Ball Possession", value: `${homePos}%` },
				{ type: "Shots on Goal", value: homeS + Math.floor(rng() * 3) },
				{ type: "Total Shots", value: homeShots },
				{ type: "Corner Kicks", value: homeCorners },
				{ type: "Fouls", value: homeFouls },
				{ type: "Total Passes", value: homePasses },
			],
		},
		{
			team: { id: 2, name: match.awayTeam, logo: match.awayLogo || "" },
			statistics: [
				{ type: "Ball Possession", value: `${awayPos}%` },
				{ type: "Shots on Goal", value: awayS + Math.floor(rng() * 3) },
				{ type: "Total Shots", value: awayShots },
				{ type: "Corner Kicks", value: awayCorners },
				{ type: "Fouls", value: awayFouls },
				{ type: "Total Passes", value: awayPasses },
			],
		},
	];
}

/**
 * Nombres genéricos para lineups cuando no hay jugadores reales disponibles.
 */
const GENERIC_NAMES_HOME = [
	"Gómez",
	"Rodríguez",
	"López",
	"Fernández",
	"González",
	"Martínez",
	"Pérez",
	"Sánchez",
	"Romero",
	"Díaz",
	"Torres",
	"Álvarez",
];

const GENERIC_NAMES_AWAY = [
	"Silva",
	"Pereira",
	"Santos",
	"Oliveira",
	"Souza",
	"Lima",
	"Araujo",
	"Carvalho",
	"Gomes",
	"Costa",
	"Ribeiro",
	"Martins",
];

/**
 * Genera lineups mock determinísticas con formación 4-3-3 o 4-4-2.
 * Para cada equipo: 11 titulares + 5 suplentes + DT.
 */
function generateMockLineups(match: Match): TeamLineup[] {
	return [
		generateMockLineupForTeam(match, true),
		generateMockLineupForTeam(match, false),
	];
}

function generateMockLineupForTeam(match: Match, isHome: boolean): TeamLineup {
	const teamName = isHome ? match.homeTeam : match.awayTeam;
	const rng = makeRng(getSeed(match.id) + (isHome ? 0 : 123));

	const availablePlayers = PLAYERS[teamName as keyof typeof PLAYERS] || [];
	const genericNames = isHome ? GENERIC_NAMES_HOME : GENERIC_NAMES_AWAY;

	// Elegir formación determinísticamente
	const use433 = rng() > 0.5;
	const formation = use433 ? "4-3-3" : "4-4-2";

	const startXIGrids = use433
		? [
				{ pos: "G", grid: "1:1", num: 1 },
				{ pos: "D", grid: "2:1", num: 4 },
				{ pos: "D", grid: "2:2", num: 2 },
				{ pos: "D", grid: "2:3", num: 6 },
				{ pos: "D", grid: "2:4", num: 3 },
				{ pos: "M", grid: "3:1", num: 8 },
				{ pos: "M", grid: "3:2", num: 5 },
				{ pos: "M", grid: "3:3", num: 10 },
				{ pos: "F", grid: "4:1", num: 7 },
				{ pos: "F", grid: "4:2", num: 9 },
				{ pos: "F", grid: "4:3", num: 11 },
			]
		: [
				{ pos: "G", grid: "1:1", num: 1 },
				{ pos: "D", grid: "2:1", num: 4 },
				{ pos: "D", grid: "2:2", num: 2 },
				{ pos: "D", grid: "2:3", num: 6 },
				{ pos: "D", grid: "2:4", num: 3 },
				{ pos: "M", grid: "3:1", num: 8 },
				{ pos: "M", grid: "3:2", num: 5 },
				{ pos: "M", grid: "3:3", num: 14 },
				{ pos: "M", grid: "3:4", num: 11 },
				{ pos: "F", grid: "4:1", num: 7 },
				{ pos: "F", grid: "4:2", num: 9 },
			];

	const startXI: TacticalPlayerInfo[] = [];
	let mockIdx = 0;
	let genIdx = 0;

	for (let i = 0; i < startXIGrids.length; i++) {
		const gridInfo = startXIGrids[i];
		let name = "";
		if (gridInfo.pos === "F" || gridInfo.pos === "M") {
			if (mockIdx < availablePlayers.length) {
				name = availablePlayers[mockIdx++];
			}
		}
		if (!name) {
			name = genericNames[genIdx % genericNames.length];
			genIdx++;
		}
		startXI.push({
			player: {
				id: isHome ? 100 + i : 200 + i,
				name,
				number: gridInfo.num,
				pos: gridInfo.pos,
				grid: gridInfo.grid,
			},
		});
	}

	const substitutes: TacticalPlayerInfo[] = [];
	for (let i = 0; i < 5; i++) {
		const name = genericNames[(genIdx + i) % genericNames.length];
		substitutes.push({
			player: {
				id: isHome ? 300 + i : 400 + i,
				name,
				number: 12 + i,
				pos: i === 0 ? "G" : i < 3 ? "D" : i < 4 ? "M" : "F",
				grid: null,
			},
		});
	}

	const coach = {
		id: isHome ? 999 : 888,
		name: isHome ? "A. Orfila" : "F. Kudelka",
		photo: null,
	};

	return {
		team: {
			id: isHome ? 1 : 2,
			name: teamName,
			logo: isHome ? match.homeLogo || "" : match.awayLogo || "",
		},
		formation,
		startXI,
		substitutes,
		coach,
		// Sprint "Habilitar formations upcoming": mock con publishedAt
		// determinístico (10 min antes del kickoff) para que el badge
		// "Actualizado" se vea en DEV sin depender de la API real.
		publishedAt: new Date(
			new Date(match.kickOff).getTime() - 10 * 60_000,
		).toISOString(),
	};
}
