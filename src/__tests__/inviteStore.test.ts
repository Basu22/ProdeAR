import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteStore } from "../stores/inviteStore";

describe("inviteStore", () => {
	beforeEach(() => {
		// Reset store state before each test
		act(() => {
			useInviteStore.getState().clearPendingInvite();
		});
	});

	it("should have correct initial state", () => {
		const state = useInviteStore.getState();
		expect(state.pendingInviteCode).toBeNull();
		expect(state.tournamentPreview).toBeNull();
		expect(state.isLoadingPreview).toBe(false);
		expect(state.previewError).toBeNull();
	});

	it("setPendingInvite should set the invite code", () => {
		act(() => {
			useInviteStore.getState().setPendingInvite("AR-TEST");
		});
		expect(useInviteStore.getState().pendingInviteCode).toBe("AR-TEST");
	});

	it("setLoadingPreview should set loading state", () => {
		act(() => {
			useInviteStore.getState().setLoadingPreview(true);
		});
		expect(useInviteStore.getState().isLoadingPreview).toBe(true);
	});

	it("setTournamentPreview should set preview and clear loading", () => {
		act(() => {
			useInviteStore.getState().setLoadingPreview(true);
		});
		expect(useInviteStore.getState().isLoadingPreview).toBe(true);

		const preview = { name: "Test Tournament", code: "AR-TEST", memberCount: 5 };
		act(() => {
			useInviteStore.getState().setTournamentPreview(preview);
		});

		expect(useInviteStore.getState().tournamentPreview).toEqual(preview);
		expect(useInviteStore.getState().isLoadingPreview).toBe(false);
	});

	it("setPreviewError should set error and clear loading", () => {
		act(() => {
			useInviteStore.getState().setLoadingPreview(true);
		});
		expect(useInviteStore.getState().isLoadingPreview).toBe(true);

		act(() => {
			useInviteStore.getState().setPreviewError("Torneo no encontrado");
		});

		expect(useInviteStore.getState().previewError).toBe("Torneo no encontrado");
		expect(useInviteStore.getState().isLoadingPreview).toBe(false);
	});

	it("clearPendingInvite should reset all invite-related state", () => {
		// Set up full state
		act(() => {
			useInviteStore.getState().setPendingInvite("AR-TEST");
			useInviteStore.getState().setTournamentPreview({
				name: "Test",
				code: "AR-TEST",
				memberCount: 3,
			});
		});

		// Verify state is set
		expect(useInviteStore.getState().pendingInviteCode).toBe("AR-TEST");
		expect(useInviteStore.getState().tournamentPreview).not.toBeNull();

		// Clear
		act(() => {
			useInviteStore.getState().clearPendingInvite();
		});

		// Verify all cleared
		const state = useInviteStore.getState();
		expect(state.pendingInviteCode).toBeNull();
		expect(state.tournamentPreview).toBeNull();
		expect(state.isLoadingPreview).toBe(false);
		expect(state.previewError).toBeNull();
	});

	it("setTournamentPreview(null) should clear preview but not loading if not loading", () => {
		act(() => {
			useInviteStore.getState().setTournamentPreview({
				name: "Test",
				code: "AR-TEST",
				memberCount: 1,
			});
		});

		act(() => {
			useInviteStore.getState().setTournamentPreview(null);
		});

		expect(useInviteStore.getState().tournamentPreview).toBeNull();
		expect(useInviteStore.getState().isLoadingPreview).toBe(false);
	});
});
