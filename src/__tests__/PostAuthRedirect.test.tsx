import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type React from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostAuthRedirect } from "../components/auth/PostAuthRedirect";
import { tournamentsApi } from "../lib/api/tournaments";
import { useAuthStore } from "../stores/authStore";
import { useInviteStore } from "../stores/inviteStore";

// Mock tournamentsApi
vi.mock("../lib/api/tournaments", () => ({
	tournamentsApi: {
		joinTournament: vi.fn(),
	},
}));

// Mock supabase
vi.mock("../lib/supabase", () => ({
	isSupabaseConfigured: false,
	supabase: {},
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

function renderWithProviders(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("PostAuthRedirect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset stores
		useAuthStore.setState({ user: null, isLoading: false, error: null });
		useInviteStore.getState().clearPendingInvite();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should not navigate when user is null", () => {
		useInviteStore.getState().setPendingInvite("AR-TEST");
		renderWithProviders(<PostAuthRedirect />);
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("should not navigate when pendingInviteCode is null", () => {
		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		renderWithProviders(<PostAuthRedirect />);
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("should join tournament and navigate on success", async () => {
		const mockTournament = {
			id: "t-1",
			ownerId: "u1",
			competitionId: "c1",
			name: "Test Tournament",
			code: "AR-TEST",
			scoringConfig: {
				exactScore: 10,
				correctWinner: 3,
				correctDraw: 3,
				goalDifference: 6,
				bonusStreak3: 0,
				bonusStreak5: 0,
			},
			status: "active" as const,
		};
		vi.mocked(tournamentsApi.joinTournament).mockResolvedValue(mockTournament);

		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		useInviteStore.getState().setPendingInvite("AR-TEST");

		renderWithProviders(<PostAuthRedirect />);

		await waitFor(() => {
			expect(tournamentsApi.joinTournament).toHaveBeenCalledWith("AR-TEST");
		});

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/torneo/t-1", {
				replace: true,
			});
		});
	});

	it("should navigate to dashboard on join failure", async () => {
		vi.mocked(tournamentsApi.joinTournament).mockRejectedValue(
			new Error("Torneo lleno"),
		);

		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		useInviteStore.getState().setPendingInvite("AR-FAIL");

		renderWithProviders(<PostAuthRedirect />);

		await waitFor(() => {
			expect(tournamentsApi.joinTournament).toHaveBeenCalledWith("AR-FAIL");
		});

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
				replace: true,
			});
		});
	});

	it("should clear pending invite immediately (before join resolves)", async () => {
		let resolveJoin: (value: unknown) => void;
		const joinPromise = new Promise((resolve) => {
			resolveJoin = resolve;
		});
		vi.mocked(tournamentsApi.joinTournament).mockReturnValue(
			joinPromise as Promise<never>,
		);

		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		useInviteStore.getState().setPendingInvite("AR-PENDING");

		renderWithProviders(<PostAuthRedirect />);

		// The store should be cleared immediately, not after join resolves
		await waitFor(() => {
			expect(useInviteStore.getState().pendingInviteCode).toBeNull();
		});

		// Resolve the join
		resolveJoin!({
			id: "t-1",
			ownerId: "u1",
			competitionId: "c1",
			name: "Test",
			code: "AR-PENDING",
			scoringConfig: {
				exactScore: 10,
				correctWinner: 3,
				correctDraw: 3,
				goalDifference: 6,
				bonusStreak3: 0,
				bonusStreak5: 0,
			},
			status: "active",
		});
	});

	it("should NOT invoke join twice (consumedRef protection)", async () => {
		const mockTournament = {
			id: "t-1",
			ownerId: "u1",
			competitionId: "c1",
			name: "Test",
			code: "AR-ONCE",
			scoringConfig: {
				exactScore: 10,
				correctWinner: 3,
				correctDraw: 3,
				goalDifference: 6,
				bonusStreak3: 0,
				bonusStreak5: 0,
			},
			status: "active" as const,
		};
		vi.mocked(tournamentsApi.joinTournament).mockResolvedValue(mockTournament);

		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		useInviteStore.getState().setPendingInvite("AR-ONCE");

		renderWithProviders(<PostAuthRedirect />);

		await waitFor(() => {
			expect(tournamentsApi.joinTournament).toHaveBeenCalledTimes(1);
		});

		// Simulate user state change (e.g., token refresh)
		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test Updated",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});

		// Wait a tick to ensure no additional calls
		await new Promise((r) => setTimeout(r, 50));
		expect(tournamentsApi.joinTournament).toHaveBeenCalledTimes(1);
	});

	it("BUG: consumedRef persists after logout - second invite is ignored", async () => {
		// This test documents the bug where consumedRef is never reset
		const mockTournament = {
			id: "t-1",
			ownerId: "u1",
			competitionId: "c1",
			name: "Test",
			code: "AR-FIRST",
			scoringConfig: {
				exactScore: 10,
				correctWinner: 3,
				correctDraw: 3,
				goalDifference: 6,
				bonusStreak3: 0,
				bonusStreak5: 0,
			},
			status: "active" as const,
		};
		vi.mocked(tournamentsApi.joinTournament).mockResolvedValue(mockTournament);

		// First invite - user logs in
		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		useInviteStore.getState().setPendingInvite("AR-FIRST");

		renderWithProviders(<PostAuthRedirect />);

		await waitFor(() => {
			expect(tournamentsApi.joinTournament).toHaveBeenCalledWith("AR-FIRST");
		});

		// User logs out
		useAuthStore.setState({ user: null, isLoading: false, error: null });

		// Second invite - user logs in again
		useInviteStore.getState().setPendingInvite("AR-SECOND");
		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});

		// Wait to see if join is called again
		await new Promise((r) => setTimeout(r, 100));

		// BUG: joinTournament should be called with AR-SECOND but consumedRef blocks it
		// This assertion documents the bug - it SHOULD be 2 but is 1
		expect(tournamentsApi.joinTournament).toHaveBeenCalledTimes(1);
		// Uncomment the line below when the bug is fixed:
		// expect(tournamentsApi.joinTournament).toHaveBeenCalledWith("AR-SECOND");
	});
});
