import type { Match, MatchEvent } from "../types";
import { INITIAL_MATCHES, PLAYERS } from "./mockData";

class MatchSimulator {
	private static instance: MatchSimulator;
	private matches: Match[];

	private constructor() {
		this.matches = [...INITIAL_MATCHES];
	}

	public static getInstance(): MatchSimulator {
		if (!MatchSimulator.instance) {
			MatchSimulator.instance = new MatchSimulator();
		}
		return MatchSimulator.instance;
	}

	public getMatches(): Match[] {
		return this.matches;
	}

	public setMatches(matches: Match[]) {
		this.matches = matches;
	}

	public tick() {
		this.matches = this.matches.map((match) => {
			if (match.status !== "live") return match;

			// Calculate simulated minute based on real time elapsed since kick-off
			const kickOffTime = new Date(match.kickOff).getTime();
			const now = Date.now();
			const elapsedMs = now - kickOffTime;
			const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

			// Match progresses: either the elapsed minutes or +1 from current, whichever is higher
			const newMinute = Math.max(elapsedMinutes, (match.minute || 0) + 1);

			if (newMinute > 95) {
				return { ...match, status: "finished" as const, minute: 90 };
			}

			const newEvents: MatchEvent[] = [...(match.events || [])];
			let newHomeScore = match.homeScore || 0;
			let newAwayScore = match.awayScore || 0;

			// Probabilidades
			const rand = Math.random();

			if (rand < 0.05) {
				// GOL
				const isHome = Math.random() > 0.5;
				const teamKey = (
					isHome ? match.homeTeam : match.awayTeam
				) as keyof typeof PLAYERS;
				const players = PLAYERS[teamKey] || ["Jugador Desconocido"];
				const playerName = players[Math.floor(Math.random() * players.length)];

				if (isHome) newHomeScore++;
				else newAwayScore++;

				const goalEvent = {
					id: `e-${Math.random().toString(36).substr(2, 9)}`,
					type: "goal" as const,
					minute: newMinute,
					team: isHome ? ("home" as const) : ("away" as const),
					playerName,
				};
				newEvents.push(goalEvent);

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("prodear-local-goal", {
							detail: {
								matchId: match.id,
								homeTeam: match.homeTeam,
								awayTeam: match.awayTeam,
								isHome,
								playerName,
								minute: newMinute,
								homeScore: newHomeScore,
								awayScore: newAwayScore,
							},
						}),
					);
				}
			} else if (rand < 0.08) {
				// Tarjeta
				const isHome = Math.random() > 0.5;
				const isRed = Math.random() < 0.2;
				const teamKey = (
					isHome ? match.homeTeam : match.awayTeam
				) as keyof typeof PLAYERS;
				const players = PLAYERS[teamKey] || ["Jugador"];
				const playerName = players[Math.floor(Math.random() * players.length)];

				newEvents.push({
					id: `e-${Math.random().toString(36).substr(2, 9)}`,
					type: isRed ? "red" : "yellow",
					minute: newMinute,
					team: isHome ? "home" : "away",
					playerName,
				});
			}

			return {
				...match,
				minute: newMinute,
				homeScore: newHomeScore,
				awayScore: newAwayScore,
				events: newEvents,
			};
		});
	}
}

export const simulator = MatchSimulator.getInstance();
