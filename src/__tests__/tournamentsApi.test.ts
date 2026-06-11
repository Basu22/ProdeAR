import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tournamentsApi } from "../lib/api/tournaments";

// Mock supabase to ensure we use local mode
vi.mock("../lib/supabase", () => ({
	isSupabaseConfigured: false,
	supabase: {},
}));

describe("tournamentsApi.getTournamentByCode (local mode)", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("should return tournament preview for valid code", async () => {
		const result = await tournamentsApi.getTournamentByCode("AR-9X2F");
		expect(result).not.toBeNull();
		expect(result?.name).toBe("Prode de la Oficina");
		expect(result?.code).toBe("AR-9X2F");
		expect(result?.memberCount).toBe(3); // mockMembers has 3 entries for tournament-1
	});

	it("should be case-insensitive", async () => {
		const result = await tournamentsApi.getTournamentByCode("ar-9x2f");
		expect(result).not.toBeNull();
		expect(result?.name).toBe("Prode de la Oficina");
	});

	it("should trim whitespace from code", async () => {
		const result = await tournamentsApi.getTournamentByCode("  AR-9X2F  ");
		expect(result).not.toBeNull();
		expect(result?.name).toBe("Prode de la Oficina");
	});

	it("should return null for non-existent code", async () => {
		const result = await tournamentsApi.getTournamentByCode("AR-ZZZZ");
		expect(result).toBeNull();
	});

	it("should return null for empty string", async () => {
		const result = await tournamentsApi.getTournamentByCode("");
		expect(result).toBeNull();
	});

	it("should return correct member count", async () => {
		const result = await tournamentsApi.getTournamentByCode("AR-9X2F");
		expect(result?.memberCount).toBe(3);
	});
});

describe("tournamentsApi.joinTournament (local mode)", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("should throw for invalid code", async () => {
		await expect(
			tournamentsApi.joinTournament("AR-ZZZZ"),
		).rejects.toThrow("Código de invitación inválido");
	});

	it("should join tournament with valid code", async () => {
		const result = await tournamentsApi.joinTournament("AR-9X2F");
		expect(result).toBeDefined();
		expect(result.name).toBe("Prode de la Oficina");
	});

	it("should not duplicate membership for existing member", async () => {
		// user-1 is already a member in mockMembers
		const result = await tournamentsApi.joinTournament("AR-9X2F");
		expect(result).toBeDefined();
		expect(result.id).toBe("tournament-1");
	});

	it("should enforce 50 member limit", async () => {
		// Create a tournament and fill it to 50 members
		const tournaments = [
			{
				id: "tournament-full",
				ownerId: "user-1",
				competitionId: "comp-1",
				name: "Full Tournament",
				code: "AR-FULL",
				scoringConfig: {
					exactScore: 10,
					correctWinner: 3,
					correctDraw: 3,
					goalDifference: 6,
					bonusStreak3: 0,
					bonusStreak5: 0,
				},
				status: "active" as const,
			},
		];
		localStorage.setItem("prodear_tournaments", JSON.stringify(tournaments));

		// Create 50 members
		const members = Array.from({ length: 50 }, (_, i) => ({
			id: `tm-full-${i}`,
			tournamentId: "tournament-full",
			userId: `user-${i}`,
			displayName: `User ${i}`,
			totalPoints: 0,
			rank: i + 1,
			role: "player" as const,
		}));
		localStorage.setItem("prodear_tournament_members", JSON.stringify(members));

		// Set a different current user (not in the tournament)
		localStorage.setItem(
			"prodear_user",
			JSON.stringify({
				id: "user-new",
				email: "new@test.com",
				displayName: "New User",
				avatarUrl: null,
			}),
		);

		await expect(
			tournamentsApi.joinTournament("AR-FULL"),
		).rejects.toThrow("El torneo ha alcanzado el límite máximo de 50 participantes.");
	});
});
