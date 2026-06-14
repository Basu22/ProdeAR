/**
 * Tests para `useGroupStandings` hook.
 *
 * Cubre:
 * - Cálculo correcto de groupTables a partir de matches
 * - liveGroups / liveMatchesCount
 * - positionChanges (subir/bajar/igual)
 * - Edge cases: matches undefined, sin partidos en vivo, etc.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGroupStandings } from "../hooks/useGroupStandings";
import type { Match } from "../lib/types";
import type { WorldCupMatch } from "../lib/worldCupGroups";

// ============================================================================
// HELPERS
// ============================================================================

function makeMatch(overrides: Partial<WorldCupMatch> = {}): WorldCupMatch {
	return {
		id: "m-test",
		competitionId: "1",
		homeTeam: "México",
		awayTeam: "Corea del Sur",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-11T18:00:00Z",
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		stageName: "Group A",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

const KEY = (group: string, team: string) => `${group}:${team}`;

// ============================================================================
// BASIC COMPUTATION
// ============================================================================

describe("useGroupStandings — basic computation", () => {
	it("returns empty results when matches is undefined", () => {
		const { result } = renderHook(() => useGroupStandings(undefined));
		expect(result.current.groupTables).toHaveLength(12);
		expect(result.current.liveGroupsCount).toBe(0);
		expect(result.current.liveMatchesCount).toBe(0);
		expect(result.current.positionChanges.size).toBe(48); // 12 groups × 4 teams
	});

	it("returns empty results when matches is empty", () => {
		const { result } = renderHook(() => useGroupStandings([]));
		expect(result.current.groupTables).toHaveLength(12);
		expect(result.current.liveGroupsCount).toBe(0);
		// All teams have rank undefined, so all positionChanges = 'same'
		for (const change of result.current.positionChanges.values()) {
			expect(change).toBe("same");
		}
	});

	it("computes groupTables from matches", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 1,
				status: "finished",
			}),
		];

		const { result } = renderHook(() => useGroupStandings(matches));
		const groupA = result.current.groupTables.find(
			(g) => g.groupName === "Grupo A",
		);
		const mexico = groupA?.standings.find((s) => s.teamName === "México");
		expect(mexico?.pts).toBe(3);
	});
});

// ============================================================================
// LIVE TRACKING
// ============================================================================

describe("useGroupStandings — live tracking", () => {
	it("identifies groups with live matches", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 0,
				status: "live",
			}),
		];

		const { result } = renderHook(() => useGroupStandings(matches));
		expect(result.current.liveGroups.has("A")).toBe(true);
		expect(result.current.liveGroupsCount).toBe(1);
		expect(result.current.liveMatchesCount).toBe(1);
	});

	it("counts multiple live matches across groups", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 1,
				awayScore: 0,
				status: "live",
				stageName: "Group A",
			}),
			makeMatch({
				id: "m2",
				homeTeam: "Argentina",
				awayTeam: "Argelia",
				homeScore: 2,
				awayScore: 1,
				status: "live",
				stageName: "Group J", // Grupo J explícito (Argentina/Argelia)
			}),
		];

		const { result } = renderHook(() => useGroupStandings(matches));
		expect(result.current.liveGroups.has("A")).toBe(true);
		expect(result.current.liveGroups.has("J")).toBe(true);
		expect(result.current.liveGroupsCount).toBe(2);
		expect(result.current.liveMatchesCount).toBe(2);
	});

	it("does not count finished matches as live", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 1,
				status: "finished",
			}),
		];

		const { result } = renderHook(() => useGroupStandings(matches));
		expect(result.current.liveGroupsCount).toBe(0);
		expect(result.current.liveMatchesCount).toBe(0);
	});
});

// ============================================================================
// POSITION CHANGES (animation diff)
// ============================================================================

describe("useGroupStandings — position changes", () => {
	it("first render returns all 'same'", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result } = renderHook(() => useGroupStandings(matches));
		for (const change of result.current.positionChanges.values()) {
			expect(change).toBe("same");
		}
	});

	it("detects 'up' when a team moves to a better rank", () => {
		// Initial: México loses 0-2 → pts=0, dg=-2
		const initial: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "Corea del Sur",
				awayTeam: "México",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result, rerender } = renderHook(
			({ matches }: { matches: WorldCupMatch[] }) =>
				useGroupStandings(matches),
			{ initialProps: { matches: initial } },
		);

		// Initial standings:
		// - Corea: 3pts, +2dg → rank 1 (index 0)
		// - Cze: 0pts, 0dg → rank 2 (alphabetical R, before Saf)
		// - Saf: 0pts, 0dg → rank 3 (alphabetical S)
		// - México: 0pts, -2dg → rank 4 (index 3, worst dg among 0pts)
		// México starts at rank 4 because it has the worst goal difference
		// among teams with 0 points (it lost 0-2, the others haven't played).
		const initialRank = result.current.groupTables
			.find((g) => g.groupName === "Grupo A")!
			.standings.findIndex((s) => s.teamName === "México");
		expect(initialRank).toBe(3); // 0-indexed → rank 4

		// Now México wins 3-0 → should move to rank 1
		const updated: WorldCupMatch[] = [
			...initial,
			makeMatch({
				id: "m2",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 3,
				awayScore: 0,
				status: "finished",
			}),
		];

		act(() => {
			rerender({ matches: updated });
		});

		// After update:
		// - México: 3pts, +1dg (3-2) → rank 1
		// - Corea: 3pts, -1dg (2-3) → rank 2
		// México went from rank 4 → rank 1 → 'up'
		const mexicoChange = result.current.positionChanges.get(
			KEY("A", "México"),
		);
		expect(mexicoChange).toBe("up");
	});

	it("detects 'down' when a team moves to a worse rank", () => {
		// Initial: México wins (3 pts, rank 1)
		const initial: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result, rerender } = renderHook(
			({ matches }: { matches: WorldCupMatch[] }) =>
				useGroupStandings(matches),
			{ initialProps: { matches: initial } },
		);

		// Now México loses a heavy match → should drop
		const updated: WorldCupMatch[] = [
			...initial,
			makeMatch({
				id: "m2",
				homeTeam: "Corea del Sur",
				awayTeam: "México",
				homeScore: 5,
				awayScore: 0,
				status: "finished",
			}),
		];

		act(() => {
			rerender({ matches: updated });
		});

		const mexicoChange = result.current.positionChanges.get(
			KEY("A", "México"),
		);
		expect(mexicoChange).toBe("down");
	});

	it("detects 'same' when rank doesn't change", () => {
		const initial: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Sudáfrica",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result, rerender } = renderHook(
			({ matches }: { matches: WorldCupMatch[] }) =>
				useGroupStandings(matches),
			{ initialProps: { matches: initial } },
		);

		// Add an unrelated match (different teams) → México's rank doesn't change
		const updated: WorldCupMatch[] = [
			...initial,
			makeMatch({
				id: "m2",
				homeTeam: "Corea del Sur",
				awayTeam: "República Checa",
				homeScore: 1,
				awayScore: 0,
				status: "finished",
			}),
		];

		act(() => {
			rerender({ matches: updated });
		});

		const mexicoChange = result.current.positionChanges.get(
			KEY("A", "México"),
		);
		expect(mexicoChange).toBe("same");
	});

	it("resets to 'same' on first render after data arrives", () => {
		// Mount with no data
		const { result, rerender } = renderHook(
			({ matches }: { matches: Match[] | undefined }) =>
				useGroupStandings(matches),
			{ initialProps: { matches: undefined as Match[] | undefined } },
		);

		// Now data arrives
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		act(() => {
			rerender({ matches });
		});

		// Even though México is rank 1, positionChanges should be 'same'
		// (no previous rank to compare against)
		for (const change of result.current.positionChanges.values()) {
			expect(change).toBe("same");
		}
	});
});

// ============================================================================
// STABILITY (referential identity)
// ============================================================================

describe("useGroupStandings — stability", () => {
	it("returns stable groupTables reference when matches don't change", () => {
		const matches: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result, rerender } = renderHook(() =>
			useGroupStandings(matches),
		);

		const first = result.current.groupTables;
		rerender();
		const second = result.current.groupTables;
		expect(first).toBe(second); // Same reference (memoized)
	});

	it("returns new groupTables reference when matches change", () => {
		const initial: WorldCupMatch[] = [];
		const updated: WorldCupMatch[] = [
			makeMatch({
				id: "m1",
				homeTeam: "México",
				awayTeam: "Corea del Sur",
				homeScore: 2,
				awayScore: 0,
				status: "finished",
			}),
		];

		const { result, rerender } = renderHook(
			({ matches }: { matches: WorldCupMatch[] }) =>
				useGroupStandings(matches),
			{ initialProps: { matches: initial } },
		);

		const first = result.current.groupTables;
		act(() => {
			rerender({ matches: updated });
		});
		const second = result.current.groupTables;
		expect(first).not.toBe(second);
	});
});
