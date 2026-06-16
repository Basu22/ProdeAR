import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMockMatchData } from "../hooks/useMockMatchData";
import type { Match } from "../lib/types";

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: `match-${Math.random()}`,
		competitionId: "comp-1",
		homeTeam: "Boca Juniors",
		awayTeam: "River Plate",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-12T18:00:00Z",
		homeScore: 1,
		awayScore: 0,
		penaltyWinner: null,
		stageName: "GROUP_STAGE",
		stageMultiplier: 1,
		status: "finished",
		...overrides,
	};
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("useMockMatchData", () => {
	it("retorna los datos reales si match.events/stats/lineups tienen contenido", () => {
		const match = makeMatch({
			events: [
				{
					id: "e1",
					type: "goal",
					minute: 30,
					extra: null,
					team: "home",
					playerName: "Cavani",
				},
			],
			stats: [
				{
					team: { id: 1, name: "Boca", logo: "" },
					statistics: [{ type: "Ball Possession", value: "55%" }],
				},
				{
					team: { id: 2, name: "River", logo: "" },
					statistics: [{ type: "Ball Possession", value: "45%" }],
				},
			],
			lineups: [
				{
					team: { id: 1, name: "Boca", logo: "" },
					formation: "4-3-3",
					startXI: [],
					substitutes: [],
					coach: { id: 1, name: "DT", photo: null },
				},
				{
					team: { id: 2, name: "River", logo: "" },
					formation: "4-4-2",
					startXI: [],
					substitutes: [],
					coach: { id: 2, name: "DT", photo: null },
				},
			],
		});

		vi.stubEnv("DEV", true);
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.isMockedEvents).toBe(false);
		expect(result.current.isMockedStats).toBe(false);
		expect(result.current.isMockedLineups).toBe(false);
		expect(result.current.events).toHaveLength(1);
		expect(result.current.stats).toHaveLength(2);
		expect(result.current.lineups).toHaveLength(2);
	});

	it("retorna null para stats/lineups en producción (DEV=false)", () => {
		vi.stubEnv("DEV", false);
		const match = makeMatch({ stats: undefined, lineups: undefined });
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.stats).toBeNull();
		expect(result.current.lineups).toBeNull();
		expect(result.current.isMockedStats).toBe(false);
		expect(result.current.isMockedLineups).toBe(false);
	});

	it("genera mocks en DEV cuando es finished y no hay datos reales", () => {
		vi.stubEnv("DEV", true);
		const match = makeMatch({
			stats: undefined,
			lineups: undefined,
			status: "finished",
		});
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.stats).not.toBeNull();
		expect(result.current.lineups).not.toBeNull();
		expect(result.current.isMockedStats).toBe(true);
		expect(result.current.isMockedLineups).toBe(true);
	});

	it("NO genera mocks para partidos not_started", () => {
		vi.stubEnv("DEV", true);
		const match = makeMatch({ status: "not_started" });
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.stats).toBeNull();
		expect(result.current.lineups).toBeNull();
	});

	it("es determinístico: mismo match.id → mismos mocks", () => {
		vi.stubEnv("DEV", true);
		const match1 = makeMatch({ id: "fixture-123" });
		const match2 = makeMatch({ id: "fixture-123" });

		const { result: r1 } = renderHook(() => useMockMatchData(match1));
		const { result: r2 } = renderHook(() => useMockMatchData(match2));

		expect(r1.current.stats?.[0].statistics).toEqual(
			r2.current.stats?.[0].statistics,
		);
		expect(r1.current.lineups?.[0].formation).toBe(
			r2.current.lineups?.[0].formation,
		);
	});

	it("genera lineups con 11 titulares y 5 suplentes", () => {
		vi.stubEnv("DEV", true);
		const match = makeMatch({ status: "finished" });
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.lineups?.[0].startXI).toHaveLength(11);
		expect(result.current.lineups?.[0].substitutes).toHaveLength(5);
	});

	it("genera lineups con formación 4-3-3 o 4-4-2", () => {
		vi.stubEnv("DEV", true);
		const match = makeMatch({ id: "fixture-xyz" });
		const { result } = renderHook(() => useMockMatchData(match));
		const formation = result.current.lineups?.[0].formation;
		expect(["4-3-3", "4-4-2"]).toContain(formation);
	});

	// Sprint "Habilitar formations upcoming": cubrir el caso en que
	// poll-scores ya populó lineups reales para un partido upcoming
	// (dentro de la ventana T-2h). El hook debe devolver los datos
	// reales tal cual, sin generar mocks ni retornar null.
	it("retorna lineups reales para upcoming (sin generar mocks)", () => {
		vi.stubEnv("DEV", true);
		const realLineups = [
			{
				team: { id: 1, name: "Boca", logo: "" },
				formation: "4-3-3",
				startXI: [],
				substitutes: [],
				coach: { id: 1, name: "DT Boca", photo: null },
			},
			{
				team: { id: 2, name: "River", logo: "" },
				formation: "4-4-2",
				startXI: [],
				substitutes: [],
				coach: { id: 2, name: "DT River", photo: null },
			},
		];
		const match = makeMatch({
			status: "not_started",
			lineups: realLineups,
		});
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.lineups).toBe(realLineups);
		expect(result.current.isMockedLineups).toBe(false);
	});

	it("retorna null de lineups para upcoming sin data real (ni siquiera mocks)", () => {
		vi.stubEnv("DEV", true);
		const match = makeMatch({ status: "not_started", lineups: undefined });
		const { result } = renderHook(() => useMockMatchData(match));
		expect(result.current.lineups).toBeNull();
		expect(result.current.isMockedLineups).toBe(false);
	});
});
