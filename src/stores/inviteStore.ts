import { create } from "zustand";

interface TournamentPreview {
	name: string;
	code: string;
	memberCount: number;
}

interface InviteState {
	pendingInviteCode: string | null;
	tournamentPreview: TournamentPreview | null;
	isLoadingPreview: boolean;
	previewError: string | null;
	setPendingInvite: (code: string) => void;
	setTournamentPreview: (preview: TournamentPreview | null) => void;
	setLoadingPreview: (loading: boolean) => void;
	setPreviewError: (error: string | null) => void;
	clearPendingInvite: () => void;
}

export const useInviteStore = create<InviteState>((set) => ({
	pendingInviteCode: null,
	tournamentPreview: null,
	isLoadingPreview: false,
	previewError: null,
	setPendingInvite: (code) => set({ pendingInviteCode: code }),
	setTournamentPreview: (preview) =>
		set({ tournamentPreview: preview, isLoadingPreview: false }),
	setLoadingPreview: (loading) => set({ isLoadingPreview: loading }),
	setPreviewError: (error) =>
		set({ previewError: error, isLoadingPreview: false }),
	clearPendingInvite: () =>
		set({
			pendingInviteCode: null,
			tournamentPreview: null,
			isLoadingPreview: false,
			previewError: null,
		}),
}));
