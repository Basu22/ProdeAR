import { create } from "zustand";

// Define custom event interface for PWA installation
export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

interface UIState {
	isDark: boolean;
	activeTab: string;
	setActiveTab: (tab: string) => void;
	installPrompt: BeforeInstallPromptEvent | null;
	setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
	isStatsSheetOpen: boolean;
	setStatsSheetOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
	isDark: true,
	activeTab: "pronosticos",
	setActiveTab: (tab) => set({ activeTab: tab }),
	installPrompt: null,
	setInstallPrompt: (prompt) => set({ installPrompt: prompt }),
	isStatsSheetOpen: false,
	setStatsSheetOpen: (open) => set({ isStatsSheetOpen: open }),
}));
