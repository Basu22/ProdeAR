import type { AlertToggleState } from "../components/notifications/AlertToggle";
import { useNotificationStore } from "../stores/notificationStore";

/**
 * Hook derivador: convierte los "facts" crudos del notificationStore
 * en el `AlertToggleState` que consume el componente <AlertToggle />.
 *
 * Usa un selector de Zustand para que el componente SOLO se re-renderice
 * cuando el `state` derivado cambia (no cuando cambian campos
 * intermedios que no afectan el resultado).
 *
 * Lógica de prioridad:
 *   1. Si el navegador no soporta → "off"
 *   2. Si está loading (subscribe/unsubscribe en curso) → "loading"
 *   3. Si el usuario DENEGÓ permisos → "blocked"
 *   4. Si hay suscripción activa → "on"
 *   5. Caso contrario → "off"
 */
export function useAlertToggleState(): AlertToggleState {
	return useNotificationStore((s) => {
		if (!s.isSupported) return "off";
		if (s.isLoading) return "loading";
		if (s.permission === "denied") return "blocked";
		return s.pushEnabled ? "on" : "off";
	});
}
