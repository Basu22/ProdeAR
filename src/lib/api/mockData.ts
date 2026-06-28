import type { Match } from "../types";

// Helper to generate ISO string dates relative to current time
const getRelativeDateStr = (hoursOffset: number) => {
	const date = new Date();
	date.setHours(date.getHours() + hoursOffset);
	return date.toISOString();
};

const LOGOS = {
	boca: "https://media.api-sports.io/football/teams/451.png",
	river: "https://media.api-sports.io/football/teams/455.png",
	racing: "https://media.api-sports.io/football/teams/443.png",
	independiente: "https://media.api-sports.io/football/teams/446.png",
	san_lorenzo: "https://media.api-sports.io/football/teams/449.png",
	huracan: "https://media.api-sports.io/football/teams/444.png",
};

const STADIUMS = {
	boca: "Estadio Alberto J. Armando 'La Bombonera'",
	river: "Estadio Mâs Monumental",
	racing: "Estadio Presidente Perón 'El Cilindro'",
	independiente: "Estadio Libertadores de América",
	san_lorenzo: "Estadio Pedro Bidegain 'El Nuevo Gasómetro'",
	huracan: "Estadio Tomás Adolfo Ducó 'El Palacio'",
};

export const INITIAL_MATCHES: Match[] = [
	{
		id: "m-1",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "Boca Juniors",
		awayTeam: "River Plate",
		homeLogo: LOGOS.boca,
		awayLogo: LOGOS.river,
		matchday: 10,
		kickOff: new Date().toISOString(),
		homeScore: 1,
		awayScore: 0,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "live",
		stadium: STADIUMS.boca,
		tvChannel: "TNT Sports",
		minute: 42,
		events: [
			{
				id: "e-1",
				type: "goal",
				minute: 12,
				team: "home",
				playerName: "Edinson Cavani",
			},
		],
	},
	{
		id: "m-2",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "Racing Club",
		awayTeam: "Independiente",
		homeLogo: LOGOS.racing,
		awayLogo: LOGOS.independiente,
		matchday: 10,
		kickOff: new Date().toISOString(),
		homeScore: 0,
		awayScore: 0,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "live",
		stadium: STADIUMS.racing,
		tvChannel: "ESPN Premium",
		minute: 15,
		events: [],
	},
	{
		id: "m-3",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "San Lorenzo",
		awayTeam: "Huracán",
		homeLogo: LOGOS.san_lorenzo,
		awayLogo: LOGOS.huracan,
		matchday: 10,
		kickOff: new Date().toISOString(),
		homeScore: 0,
		awayScore: 1,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "live",
		stadium: STADIUMS.san_lorenzo,
		tvChannel: "TNT Sports",
		minute: 65,
		events: [
			{
				id: "e-2",
				type: "goal",
				minute: 34,
				team: "away",
				playerName: "Ignacio Pussetto",
			},
		],
	},
	// PRÓXIMOS ENCUENTROS - HOY
	{
		id: "m-4",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "Boca Juniors",
		awayTeam: "Racing Club",
		homeLogo: LOGOS.boca,
		awayLogo: LOGOS.racing,
		matchday: 11,
		kickOff: getRelativeDateStr(2), // Hoy en 2 horas
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.boca,
		tvChannel: "ESPN Premium",
	},
	{
		id: "m-5",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "River Plate",
		awayTeam: "San Lorenzo",
		homeLogo: LOGOS.river,
		awayLogo: LOGOS.san_lorenzo,
		matchday: 11,
		kickOff: getRelativeDateStr(4), // Hoy en 4 horas
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.river,
		tvChannel: "TNT Sports",
	},
	// PRÓXIMOS ENCUENTROS - MAÑANA
	{
		id: "m-6",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "Independiente",
		awayTeam: "Huracán",
		homeLogo: LOGOS.independiente,
		awayLogo: LOGOS.huracan,
		matchday: 11,
		kickOff: getRelativeDateStr(25), // Mañana
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.independiente,
		tvChannel: "ESPN Premium",
	},
	{
		id: "m-7",
		competitionId: "comp-2",
		competitionName: "Liga Profesional Argentina",
		homeTeam: "Boca Juniors",
		awayTeam: "Huracán",
		homeLogo: LOGOS.boca,
		awayLogo: LOGOS.huracan,
		matchday: 11,
		kickOff: getRelativeDateStr(29), // Mañana
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Fase de Grupos",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.boca,
		tvChannel: "TNT Sports",
	},
	// PRÓXIMOS ENCUENTROS - PASADO MAÑANA
	{
		id: "m-8",
		competitionId: "comp-1",
		competitionName: "Copa del Mundo 2026",
		homeTeam: "Racing Club",
		awayTeam: "River Plate",
		homeLogo: LOGOS.racing,
		awayLogo: LOGOS.river,
		matchday: 1,
		kickOff: getRelativeDateStr(49), // Pasado mañana
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Grupo A",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.racing,
		tvChannel: "TyC Sports",
	},
	{
		id: "m-9",
		competitionId: "comp-1",
		competitionName: "Copa del Mundo 2026",
		homeTeam: "San Lorenzo",
		awayTeam: "Independiente",
		homeLogo: LOGOS.san_lorenzo,
		awayLogo: LOGOS.independiente,
		matchday: 1,
		kickOff: getRelativeDateStr(53), // Pasado mañana
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		// Sprint "Llaves Eliminatorias con Penales" 2026 (migration 0008).
		// NULL en mock data porque estos partidos de Fase de Grupos
		// no tienen ni tiempo extra ni penales.
		extraTimeHome: null,
		extraTimeAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		stageName: "Grupo A",
		stageMultiplier: 1,
		status: "not_started",
		stadium: STADIUMS.san_lorenzo,
		tvChannel: "TV Pública",
	},
];

export const PLAYERS = {
	"Boca Juniors": ["Cavani", "Merentiel", "Zenon", "Advíncula"],
	"River Plate": ["Borja", "Colidio", "Meza", "Echeverri"],
	"Racing Club": ["Maravilla Martínez", "Quintero", "Almendra"],
	Independiente: ["Ávalos", "Mancuello", "Lomónaco"],
	"San Lorenzo": ["Muniain", "Cuello", "Reali"],
	Huracán: ["Pussetto", "Mazzantti", "Echeverría"],
};
