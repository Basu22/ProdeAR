import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { VersionInfo } from "../lib/versionCheck";
import { useUpdateStore } from "../stores/updateStore";

describe("updateStore", () => {
	beforeEach(() => {
		act(() => {
			useUpdateStore.getState().reset();
			useUpdateStore.setState({
				clientVersion: null,
				lastDismissedAt: null,
			});
		});
	});

	it("should have correct initial state", () => {
		const state = useUpdateStore.getState();
		expect(state.status).toBe("idle");
		expect(state.clientVersion).toBeNull();
		expect(state.serverVersion).toBeNull();
		expect(state.lastDismissedAt).toBeNull();
		expect(state.errorMessage).toBeNull();
	});

	describe("status transitions", () => {
		const mockServerVersion: VersionInfo = {
			version: "2.0.0",
			buildTime: "2026-06-18T00:00:00Z",
			minSupportedVersion: "1.0.0",
			forceUpdate: false,
			changelog: "New features",
		};

		it("transitions from idle to available", () => {
			expect(useUpdateStore.getState().status).toBe("idle");

			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
			});

			expect(useUpdateStore.getState().status).toBe("available");
			expect(useUpdateStore.getState().serverVersion).toEqual(
				mockServerVersion,
			);
			expect(useUpdateStore.getState().clientVersion).toBe("1.0.0");
			expect(useUpdateStore.getState().errorMessage).toBeNull();
		});

		it("transitions from available to applying", () => {
			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
			});
			expect(useUpdateStore.getState().status).toBe("available");

			act(() => {
				useUpdateStore.getState().setApplying();
			});

			expect(useUpdateStore.getState().status).toBe("applying");
		});

		it("transitions from applying to completed", () => {
			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
				useUpdateStore.getState().setApplying();
			});
			expect(useUpdateStore.getState().status).toBe("applying");

			act(() => {
				useUpdateStore.getState().setCompleted();
			});

			expect(useUpdateStore.getState().status).toBe("completed");
		});

		it("transitions to error state with message", () => {
			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
			});

			act(() => {
				useUpdateStore.getState().setError("Update failed");
			});

			expect(useUpdateStore.getState().status).toBe("error");
			expect(useUpdateStore.getState().errorMessage).toBe("Update failed");
		});

		it("can transition from error back to available", () => {
			act(() => {
				useUpdateStore.getState().setError("Update failed");
			});
			expect(useUpdateStore.getState().status).toBe("error");

			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
			});

			expect(useUpdateStore.getState().status).toBe("available");
			expect(useUpdateStore.getState().errorMessage).toBeNull();
		});
	});

	describe("dismiss", () => {
		it("sets status to idle and records lastDismissedAt", () => {
			const mockServerVersion: VersionInfo = {
				version: "2.0.0",
				buildTime: "2026-06-18T00:00:00Z",
				minSupportedVersion: "1.0.0",
				forceUpdate: false,
				changelog: "New features",
			};

			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.0.0");
			});
			expect(useUpdateStore.getState().status).toBe("available");

			const beforeDismiss = Date.now();
			act(() => {
				useUpdateStore.getState().dismiss();
			});
			const afterDismiss = Date.now();

			expect(useUpdateStore.getState().status).toBe("idle");
			expect(useUpdateStore.getState().lastDismissedAt).not.toBeNull();

			const dismissedTime = new Date(
				useUpdateStore.getState().lastDismissedAt!,
			).getTime();
			expect(dismissedTime).toBeGreaterThanOrEqual(beforeDismiss);
			expect(dismissedTime).toBeLessThanOrEqual(afterDismiss);
		});
	});

	describe("reset", () => {
		it("resets status, serverVersion, and errorMessage but preserves persisted fields", () => {
			const mockServerVersion: VersionInfo = {
				version: "2.0.0",
				buildTime: "2026-06-18T00:00:00Z",
				minSupportedVersion: "1.0.0",
				forceUpdate: false,
				changelog: "New features",
			};

			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.5.0");
				useUpdateStore.getState().dismiss();
			});

			const lastDismissed = useUpdateStore.getState().lastDismissedAt;
			const clientVersion = useUpdateStore.getState().clientVersion;

			act(() => {
				useUpdateStore.getState().reset();
			});

			expect(useUpdateStore.getState().status).toBe("idle");
			expect(useUpdateStore.getState().serverVersion).toBeNull();
			expect(useUpdateStore.getState().errorMessage).toBeNull();
			expect(useUpdateStore.getState().lastDismissedAt).toBe(lastDismissed);
			expect(useUpdateStore.getState().clientVersion).toBe(clientVersion);
		});
	});

	describe("persistence", () => {
		it("persists lastDismissedAt and clientVersion via partialize", () => {
			const mockServerVersion: VersionInfo = {
				version: "2.0.0",
				buildTime: "2026-06-18T00:00:00Z",
				minSupportedVersion: "1.0.0",
				forceUpdate: false,
				changelog: "New features",
			};

			act(() => {
				useUpdateStore.getState().setAvailable(mockServerVersion, "1.5.0");
				useUpdateStore.getState().dismiss();
			});

			const state = useUpdateStore.getState();
			expect(state.lastDismissedAt).not.toBeNull();
			expect(state.clientVersion).toBe("1.5.0");
		});
	});
});
