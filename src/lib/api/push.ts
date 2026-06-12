import { isSupabaseConfigured, supabase } from "../supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Helper: envuelve una promise con un timeout. Si la promise no resuelve
 * en `ms` milisegundos, rechaza con un error descriptivo.
 *
 * Vital para evitar "spinners eternos" cuando el SW no se activa o
 * el push service del browser está colgado.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(errorMessage)), ms),
		),
	]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	if (!base64String) {
		throw new Error("VAPID public key está vacía");
	}
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);

	// ArrayBuffer explícito para compatibilidad con tipos estrictos de TS
	// (PushSubscriptionOptionsInit exige ArrayBufferView<ArrayBuffer>, no <ArrayBufferLike>).
	const buffer = new ArrayBuffer(rawData.length);
	const outputArray = new Uint8Array(buffer);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	// Sanity check: una VAPID public key uncompressed debe medir 65 bytes.
	if (outputArray.length !== 65) {
		throw new Error(
			`VAPID public key inválida: esperaba 65 bytes, decodificó ${outputArray.length}. Regenerala con 'npm run generate-vapid'.`,
		);
	}

	return outputArray;
}

export type SubscribeResult = {
	success: boolean;
	error?: string;
	blocked?: boolean;
};

export const pushApi = {
	isSupported(): boolean {
		return (
			typeof window !== "undefined" &&
			"serviceWorker" in navigator &&
			"PushManager" in window
		);
	},

	async getSubscriptionState(): Promise<boolean> {
		if (!this.isSupported()) return false;

		if (!isSupabaseConfigured) {
			return localStorage.getItem("prodear_push_enabled") === "true";
		}

		try {
			const registration = await withTimeout(
				navigator.serviceWorker.ready,
				5000,
				"Timeout: el Service Worker no se activó en 5s.",
			);
			const subscription = await registration.pushManager.getSubscription();
			return !!subscription;
		} catch (err) {
			console.warn(
				"Error checking push subscription, returning local storage fallback:",
				err,
			);
			return localStorage.getItem("prodear_push_enabled") === "true";
		}
	},

	/**
	 * Suscribe al usuario a Push Notifications.
	 *
	 * Robusto contra:
	 * - Suscripción ya existente (idempotente, retorna success sin re-suscribir)
	 * - Service Worker que no se activa (timeout de 10s)
	 * - VAPID key inválida (validación de bytes + mensaje claro)
	 * - Permiso denegado (blocked: true)
	 *
	 * Devuelve `{ success, error?, blocked? }` para que el componente
	 * muestre feedback preciso al usuario.
	 */
	async subscribeUser(userId: string): Promise<SubscribeResult> {
		if (!this.isSupported()) {
			return {
				success: false,
				error: "Las notificaciones Push no están soportadas en este navegador.",
			};
		}

		// Detectar bloqueo ANTES de pedir permiso (el prompt no se vuelve a mostrar
		// si el usuario ya denegó una vez; sólo podemos guiarlos a la config del navegador).
		if (Notification.permission === "denied") {
			return {
				success: false,
				blocked: true,
				error:
					"Las notificaciones están bloqueadas en este navegador. Habilitalas desde la configuración del sitio (ícono de candado en la barra de direcciones).",
			};
		}

		if (!VAPID_PUBLIC_KEY) {
			return {
				success: false,
				error:
					"Clave VAPID no configurada. Contactá al administrador del sitio.",
			};
		}

		// Validar la VAPID key ANTES de pedir permiso (para no molestar al
		// usuario con un prompt si la key está corrupta).
		let applicationServerKey: Uint8Array;
		try {
			applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "VAPID key inválida.";
			return { success: false, error: message };
		}

		// Cast a BufferSource: TS 6 es estricto con ArrayBufferLike vs ArrayBuffer
		// en la firma de PushManager.subscribe. En runtime es indistinto.
		const applicationServerKeyBuffer = applicationServerKey as unknown as BufferSource;

		// Solicitar permisos de notificación.
		// Si ya está "granted" (porque el usuario aceptó antes), retorna
		// "granted" sin mostrar el prompt de nuevo.
		const permission = await Notification.requestPermission();
		if (permission !== "granted") {
			return {
				success: false,
				blocked: permission === "denied",
				error: "Necesitamos permiso para enviarte alertas de tus pronósticos.",
			};
		}

		if (!isSupabaseConfigured) {
			// Modo simulación: persistir el flag localmente.
			localStorage.setItem("prodear_push_enabled", "true");
			return { success: true };
		}

		try {
			// Esperar al SW con timeout (10s) para evitar cuelgues.
			const registration = await withTimeout(
				navigator.serviceWorker.ready,
				10_000,
				"El Service Worker no se activó. Refrescá la página o esperá unos segundos.",
			);

			// Idempotencia: si ya hay suscripción activa, no la duplicamos.
			const existingSubscription = await registration.pushManager.getSubscription();
			if (existingSubscription) {
				const { endpoint, keys } = existingSubscription.toJSON();
				if (endpoint && keys?.p256dh && keys?.auth) {
					// Re-asegurar que esté en la DB (por si el user cambió).
					const { error } = await supabase.from("push_subscriptions").upsert(
						{
							user_id: userId,
							endpoint,
							p256dh: keys.p256dh,
							auth: keys.auth,
						},
						{ onConflict: "user_id, endpoint" },
					);
					if (error) throw error;
				}
				localStorage.setItem("prodear_push_enabled", "true");
				return { success: true };
			}

			// Suscribir con timeout (15s). El push service del browser puede
			// tardar si el SW recién se activó.
			const subscription = await withTimeout(
				registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: applicationServerKeyBuffer,
				}),
				15_000,
				"Timeout al suscribirse al push service. Reintentá en unos segundos.",
			);

			const { endpoint, keys } = subscription.toJSON();
			if (endpoint && keys?.p256dh && keys?.auth) {
				const { error } = await supabase.from("push_subscriptions").upsert(
					{
						user_id: userId,
						endpoint,
						p256dh: keys.p256dh,
						auth: keys.auth,
					},
					{
						onConflict: "user_id, endpoint",
					},
				);
				if (error) throw error;
			}

			localStorage.setItem("prodear_push_enabled", "true");
			return { success: true };
		} catch (err) {
			console.error("Error subscribing to Push Service:", err);
			return { success: false, error: formatError(err, "Error desconocido al suscribirse.") };
		}
	},

	async unsubscribeUser(): Promise<SubscribeResult> {
		if (!this.isSupported()) {
			return { success: false, error: "Push no soportado en este navegador." };
		}

		localStorage.setItem("prodear_push_enabled", "false");

		if (!isSupabaseConfigured) return { success: true };

		try {
			const registration = await withTimeout(
				navigator.serviceWorker.ready,
				5000,
				"Timeout: el Service Worker no respondió.",
			);
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				const endpoint = subscription.endpoint;
				await subscription.unsubscribe();

				const { error } = await supabase
					.from("push_subscriptions")
					.delete()
					.eq("endpoint", endpoint);

				if (error) throw error;
			}
			return { success: true };
		} catch (err) {
			console.error("Error unsubscribing from Push Service:", err);
			return { success: false, error: formatError(err, "Error desconocido al desuscribirse.") };
		}
	},
};

/**
 * Formatea un error desconocido en un mensaje human-readable.
 * Cubre: Error, string, objeto con .message, DOMException, PostgrestError, etc.
 */
function formatError(err: unknown, fallback: string): string {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	if (err && typeof err === "object") {
		// PostgrestError / DOMException / objetos con .message
		if ("message" in err && typeof (err as { message: unknown }).message === "string") {
			const message = (err as { message: string }).message;
			const code = "code" in err ? ` (code: ${String((err as { code: unknown }).code)})` : "";
			const details = "details" in err ? ` — ${String((err as { details: unknown }).details)}` : "";
			return `${message}${code}${details}`;
		}
		try {
			return `${fallback} [${JSON.stringify(err)}]`;
		} catch {
			return fallback;
		}
	}
	return `${fallback} [tipo: ${typeof err}]`;
}
