import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VersionInfo } from "../lib/versionCheck";

type UpdateStatus =
	| "idle"
	| "available"
	| "applying"
	| "completed"
	| "error"
	| "forced";

interface UpdateState {
	status: UpdateStatus;
	clientVersion: string | null;
	serverVersion: VersionInfo | null;
	lastDismissedAt: string | null;
	errorMessage: string | null;
	setAvailable: (serverVersion: VersionInfo, clientVersion: string) => void;
	setApplying: () => void;
	setCompleted: () => void;
	setError: (message: string) => void;
	dismiss: () => void;
	reset: () => void;
}

export const useUpdateStore = create<UpdateState>()(
	persist(
		(set) => ({
			status: "idle",
			clientVersion: null,
			serverVersion: null,
			lastDismissedAt: null,
			errorMessage: null,

			setAvailable: (serverVersion, clientVersion) =>
				set({
					status: "available",
					serverVersion,
					clientVersion,
					errorMessage: null,
				}),

			setApplying: () => set({ status: "applying" }),

			setCompleted: () => set({ status: "completed" }),

			setError: (message) => set({ status: "error", errorMessage: message }),

			dismiss: () =>
				set({
					status: "idle",
					lastDismissedAt: new Date().toISOString(),
				}),

			reset: () =>
				set({
					status: "idle",
					serverVersion: null,
					errorMessage: null,
				}),
		}),
		{
			name: "prodear_update_store",
			partialize: (state) => ({
				lastDismissedAt: state.lastDismissedAt,
				clientVersion: state.clientVersion,
			}),
		},
	),
);
