import { create } from "zustand";
import { authApi, mapSupabaseUser } from "../lib/api/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { User } from "../lib/types";
import { useNotificationStore } from "./notificationStore";

interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	hasHydrated: boolean;
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

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	isLoading: true,
	error: null,
	hasHydrated: false,
	clearError: () => set({ error: null }),

	hydrate: async () => {
		// Idempotente: en dev con StrictMode, useEffect se ejecuta 2 veces.
		// Sin este guard, el segundo set({isLoading: true}) bloquearía la primera
		// navegación (ProtectedRoute muestra spinner y no monta el <Outlet />).
		if (get().hasHydrated) return;
		set({ isLoading: true, error: null, hasHydrated: true });
		if (isSupabaseConfigured) {
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();
				if (error) throw error;

				const user = session?.user ? mapSupabaseUser(session.user) : null;
				set({ user, isLoading: false });

				// Si ya hay sesión al cargar, hidratar notificaciones también.
				if (user) {
					useNotificationStore.getState().hydrate();
				}

				// Listen for auth changes
				supabase.auth.onAuthStateChange((_event, session) => {
					const user = session?.user ? mapSupabaseUser(session.user) : null;
					set({ user, isLoading: false });

					// Sincronizar notificationStore con el ciclo de vida de auth:
					//   - SIGNED_IN  → hidratar (lee suscripción real del navegador)
					//   - SIGNED_OUT → reset (limpia estado al cerrar sesión)
					if (user) {
						useNotificationStore.getState().hydrate();
					} else {
						useNotificationStore.getState().reset();
					}
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

			// En modo simulación también hidratamos (lee localStorage).
			if (user) {
				useNotificationStore.getState().hydrate();
			}
		}
	},

	loginWithGoogle: async () => {
		set({ isLoading: true, error: null });
		try {
			const user = await authApi.loginWithGoogle();
			// Only update state if not in Supabase mode (OAuth redirects browser anyway)
			if (!isSupabaseConfigured) {
				set({ user, isLoading: false });
				// En modo mock, hidratar manualmente.
				useNotificationStore.getState().hydrate();
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
			// Hidratar notificaciones después de login exitoso.
			useNotificationStore.getState().hydrate();
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
			// Hidratar notificaciones después de registro exitoso.
			useNotificationStore.getState().hydrate();
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
			set({ user: null, isLoading: false, hasHydrated: false });
			// Reset del notificationStore al cerrar sesión.
			useNotificationStore.getState().reset();
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Error al cerrar sesión",
				isLoading: false,
			});
		}
	},
}));
