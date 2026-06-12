/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// ── Versión del SW (para logs en consola) ───────────────────────────
const SW_VERSION = "1.0.0";

// ── Activación inmediata (no esperar a que todas las tabs cierren) ──
self.skipWaiting();
clientsClaim();

// ── Precaching de assets estáticos ──────────────────────────────────
// `__WB_MANIFEST` es inyectado por vite-plugin-pwa (injectManifest)
// durante el build. Contiene todos los assets con content-hash.
precacheAndRoute(self.__WB_MANIFEST);

// ── Runtime Caching: Google Fonts ──────────────────────────────────
// Preserva el comportamiento original de la config de Workbox.
registerRoute(
	({ url }) => url.origin === "https://fonts.googleapis.com",
	new CacheFirst({
		cacheName: "google-fonts-cache",
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 10,
				maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
			}),
		],
	}),
);

registerRoute(
	({ url }) => url.origin === "https://fonts.gstatic.com",
	new CacheFirst({
		cacheName: "gstatic-fonts-cache",
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 10,
				maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
			}),
		],
	}),
);

// ── Push Event Handler ───────────────────────────────────────────────
interface PushPayload {
	title: string;
	body?: string;
	icon?: string;
	badge?: string;
	url?: string;
	tag?: string;
	renotify?: boolean;
}

self.addEventListener("push", (event: PushEvent) => {
	if (!event.data) return;

	let payload: PushPayload;
	try {
		payload = event.data.json();
	} catch {
		// Si el payload no es JSON, usar el texto crudo como título.
		payload = { title: event.data.text() };
	}

	const {
		title,
		body = "",
		icon = "/logo-192.png",
		badge = "/logo-192.png",
		url = "/",
		tag = "prodear-notification",
		renotify = true,
	} = payload;

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon,
			badge,
			tag,
			renotify,
			vibrate: [100, 50, 100],
			data: { url },
		}),
	);
});

// ── Notification Click Handler (deep-link) ───────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
	event.notification.close();

	const targetUrl = event.notification.data?.url || "/";

	event.waitUntil(
		(async () => {
			// Buscar si ya hay una tab abierta con la URL destino.
			const allClients = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});

			for (const client of allClients) {
				if (client.url.includes(targetUrl) && "focus" in client) {
					return (client as WindowClient).focus();
				}
			}

			// Si no hay tab abierta, abrir una nueva.
			if (self.clients.openWindow) {
				return self.clients.openWindow(targetUrl);
			}
		})(),
	);
});

// ── Install / Activate (logs para debug) ────────────────────────────
self.addEventListener("install", () => {
	console.log(`[SW] ProdeAR SW v${SW_VERSION} installed`);
});

self.addEventListener("activate", () => {
	console.log(`[SW] ProdeAR SW v${SW_VERSION} activated`);
});
