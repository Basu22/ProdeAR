import { create } from "zustand";
import { pushApi, type SubscribeResult } from "../lib/api/push";

/**
 * Fuente de verdad única para el estado de las Alertas Push.
 *
 * Antes: 3 sources dispersos (useState en Dashboard + localStorage + Supabase).
 * Ahora: 1 store global que hidrata, sincroniza, y expone todo de forma reactiva.
 *
 * Se hidrata en 3 momentos (ver authStore.ts + App.tsx):
 *   1. Al montar la app
 *   2. Cuando el usuario se loguea (SIGNED_IN)
 *   3. Cuando el usuario vuelve a la app (visibilitychange → visible)
 *
 * Si al hidratar detecta inconsistencia (localStorage dice "on" pero la
 * suscripción real no existe), el componente puede llamar a `subscribe()`
 * y el store se auto-cura.
 */

interface NotificationState {
	// ── Estado crudo (lo que viene del navegador) ──
	isSupported: boolean;
	permission: NotificationPermission;
	pushEnabled: boolean;
	isLoading: boolean;

	// ── Acciones ──
	/**
	 * Lee el estado actual del navegador (suscripción real de PushManager +
	 * Notification.permission). No modifica nada, solo refleja.
	 */
	hydrate: () => Promise<void>;

	/**
	 * Suscribe al usuario. Setea isLoading=true durante la operación.
	 * Si la suscripción tiene éxito → actualiza pushEnabled y permission.
	 * Si falla con blocked → actualiza permission="denied".
	 * Retorna el SubscribeResult para que el caller muestre feedback al usuario.
	 */
	subscribe: (userId: string) => Promise<SubscribeResult>;

	/**
	 * Desuscribe al usuario. Setea isLoading=true durante la operación.
	 * Si tiene éxito → actualiza pushEnabled=false.
	 */
	unsubscribe: () => Promise<SubscribeResult>;

	/**
	 * Resetea el store al estado inicial. Llamar en logout.
	 */
	reset: () => void;
}

const initialState = {
	// isSupported es síncrono (no requiere await), así que lo evaluamos
	// en el initialState para evitar un "flash" donde el toggle no se renderiza
	// durante el primer render antes de que hydrate() complete.
	isSupported:
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window,
	// permission también es síncrono (es una propiedad estática de Notification).
	permission:
		typeof Notification !== "undefined" ? Notification.permission : ("default" as NotificationPermission),
	pushEnabled: false,
	isLoading: false,
};

export const useNotificationStore = create<NotificationState>((set) => ({
	...initialState,

	hydrate: async () => {
		// SSR guard
		if (typeof window === "undefined") return;

		const isSupported = pushApi.isSupported();
		if (!isSupported) {
			set({ isSupported: false, permission: "default", pushEnabled: false });
			return;
		}

		try {
			// Permission es síncrono.
			const permission = Notification.permission;
			// getSubscriptionState lee de PushManager (real) o localStorage (fallback).
			const pushEnabled = await pushApi.getSubscriptionState();
			set({ isSupported: true, permission, pushEnabled });
		} catch (err) {
			console.error("Error hidratando notification store:", err);
			// En caso de error, no rompemos la app: dejamos el estado default.
			set({ isSupported: true, permission: Notification.permission });
		}
	},

	subscribe: async (userId: string) => {
		set({ isLoading: true });
		try {
			const result = await pushApi.subscribeUser(userId);
			if (result.success) {
				set({ pushEnabled: true, permission: "granted" });
			} else if (result.blocked) {
				set({ permission: "denied" });
			}
			return result;
		} finally {
			set({ isLoading: false });
		}
	},

	unsubscribe: async () => {
		set({ isLoading: true });
		try {
			const result = await pushApi.unsubscribeUser();
			if (result.success) {
				set({ pushEnabled: false });
			}
			return result;
		} finally {
			set({ isLoading: false });
		}
	},

	reset: () => set(initialState),
}));

// ── Helper no-react para llamar desde fuera de componentes ────────
// Útil para authStore.ts y App.tsx donde no podemos usar hooks.
export const notificationStore = useNotificationStore;
