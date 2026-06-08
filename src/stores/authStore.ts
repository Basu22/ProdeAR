import { create } from "zustand";
import { authApi, mapSupabaseUser } from "../lib/api/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { User } from "../lib/types";

interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	loginWithGoogle: () => Promise<void>;
	loginWithEmail: (email: string, password: string) => Promise<void>;
	register: (
		email: string,
		password: string,
		displayName: string,
	) => Promise<void>;
	logout: () => Promise<void>;
	hydrate: () => Promise<void>;
	clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoading: false,
	error: null,
	clearError: () => set({ error: null }),

	hydrate: async () => {
		set({ isLoading: true, error: null });
		if (isSupabaseConfigured) {
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();
				if (error) throw error;

				const user = session?.user ? mapSupabaseUser(session.user) : null;
				set({ user, isLoading: false });

				// Listen for auth changes
				supabase.auth.onAuthStateChange((_event, session) => {
					const user = session?.user ? mapSupabaseUser(session.user) : null;
					set({ user, isLoading: false });
				});
			} catch (err) {
				console.error("Error al hidratar autenticación con Supabase:", err);
				set({
					error: err instanceof Error ? err.message : "Error de hidratación",
					isLoading: false,
				});
			}
		} else {
			// Mock mode
			const user = authApi.getPersistedUser();
			set({ user, isLoading: false });
		}
	},

	loginWithGoogle: async () => {
		set({ isLoading: true, error: null });
		try {
			const user = await authApi.loginWithGoogle();
			// Only update state if not in Supabase mode (OAuth redirects browser anyway)
			if (!isSupabaseConfigured) {
				set({ user, isLoading: false });
			}
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Error al iniciar sesión",
				isLoading: false,
			});
		}
	},

	loginWithEmail: async (email, password) => {
		set({ isLoading: true, error: null });
		try {
			const user = await authApi.loginWithEmail(email, password);
			set({ user, isLoading: false });
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Credenciales inválidas",
				isLoading: false,
			});
		}
	},

	register: async (email, password, displayName) => {
		set({ isLoading: true, error: null });
		try {
			const user = await authApi.register(email, password, displayName);
			set({ user, isLoading: false });
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Error al registrarse",
				isLoading: false,
			});
		}
	},

	logout: async () => {
		set({ isLoading: true, error: null });
		try {
			await authApi.logout();
			set({ user: null, isLoading: false });
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Error al cerrar sesión",
				isLoading: false,
			});
		}
	},
}));
