/**
 * Cache local de imágenes de API-Sports (CDN de fotos de jugadores, equipos, etc.).
 * Sprint 3 Fix (#5): imagenes escalable.
 *
 * Estrategia: usa la Cache API del browser (disponible globalmente, no requiere
 * Service Worker). Cachea la respuesta HTTP de cada URL por 7 días.
 *
 * Beneficios:
 * - Reduce requests al CDN (que tienen rate limit per second/minute, aunque no consumen cuota diaria)
 * - Mejora perceived performance en mobile (imagen ya cacheada = render inmediato)
 * - Funciona offline (segunda visita sin red)
 * - No requiere Service Worker
 *
 * Patrón de uso:
 *   const src = await getCachedImage(photoUrl); // devuelve blob URL o fallback
 *   <img src={src} />
 */

const CACHE_NAME = "prodear-image-cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const MAX_ENTRIES = 500; // Límite para no acumular infinitamente

/**
 * Cache en memoria con fallback a Cache API.
 * Mantiene una referencia a los blob URLs creados para poder revocarlos.
 */
const blobUrlCache = new Map<string, { url: string; timestamp: number }>();

/**
 * Wrapper que detecta si Cache API está disponible.
 * En SSR/Node, retorna la URL original directamente.
 */
async function getCacheStorage(): Promise<Cache | null> {
	if (typeof caches === "undefined") return null;
	try {
		return await caches.open(CACHE_NAME);
	} catch {
		return null;
	}
}

/**
 * Limpia entradas expiradas del cache en memoria.
 * Se llama periódicamente para evitar memory leaks.
 */
function evictExpiredFromMemory() {
	const now = Date.now();
	for (const [key, entry] of blobUrlCache.entries()) {
		if (now - entry.timestamp > TTL_MS) {
			URL.revokeObjectURL(entry.url);
			blobUrlCache.delete(key);
		}
	}
}

/**
 * Limpia el cache cuando se acerca al límite.
 * Usa una heurística FIFO: elimina el 20% más viejo.
 */
async function evictIfNeeded(cache: Cache) {
	const keys = await cache.keys();
	if (keys.length <= MAX_ENTRIES) return;
	// Eliminar 20% de las entradas más viejas (FIFO aproximado)
	const toDelete = Math.floor(keys.length * 0.2);
	const sortedKeys = keys
		.map((req) => ({
			req,
			timestamp:
				parseInt(req.headers.get("x-cached-at") ?? "0", 10) || 0,
		}))
		.sort((a, b) => a.timestamp - b.timestamp);
	for (let i = 0; i < toDelete; i++) {
		await cache.delete(sortedKeys[i].req);
	}
}

/**
 * Devuelve la URL cacheada de una imagen.
 * Si está en cache (memoria o Cache API), devuelve un blob URL.
 * Si no, descarga, cachea y devuelve la URL original (sin ObjectURL para no
 * tener que limpiar inmediatamente — el browser la cachea como respuesta HTTP).
 *
 * La función es segura de llamar en cualquier render — devuelve la URL
 * original de inmediato y actualiza el estado cuando la cachea.
 *
 * @param url URL original de la imagen
 * @param options.useBlobUrl si true, devuelve un ObjectURL (más rápido para
 *   re-renders múltiples). Si false (default), devuelve la URL original
 *   (más simple, menos memory overhead).
 */
export async function getCachedImage(
	url: string,
	options: { useBlobUrl?: boolean } = {},
): Promise<string> {
	if (!url) return url;

	// SSR / Node fallback
	if (typeof window === "undefined") return url;

	const { useBlobUrl = false } = options;

	// 1. Check memory cache (blob URLs ya creados)
	if (useBlobUrl) {
		const memCached = blobUrlCache.get(url);
		if (memCached) {
			// Re-validate TTL
			if (Date.now() - memCached.timestamp < TTL_MS) {
				return memCached.url;
			}
			// Expirado
			URL.revokeObjectURL(memCached.url);
			blobUrlCache.delete(url);
		}
	}

	// 2. Check Cache API del browser
	const cache = await getCacheStorage();
	if (cache) {
		const cached = await cache.match(url);
		if (cached) {
			const cachedAtHeader = cached.headers.get("x-cached-at");
			const cachedAt = cachedAtHeader ? parseInt(cachedAtHeader, 10) : 0;
			const age = Date.now() - cachedAt;

			// Si está fresco y queremos blob URL, crear
			if (age < TTL_MS) {
				if (useBlobUrl) {
					const blob = await cached.blob();
					const blobUrl = URL.createObjectURL(blob);
					blobUrlCache.set(url, { url: blobUrl, timestamp: Date.now() });
					evictExpiredFromMemory();
					return blobUrl;
				}
				// Re-validar freshness antes de retornar la URL original
				if (age >= 0) return url;
			}
		}
	}

	// 3. No está en cache (o expiró) → fetch y cachear
	try {
		const resp = await fetch(url, { mode: "cors" });
		if (resp.ok) {
			if (cache) {
				// Clonar y agregar header x-cached-at para tracking
				const cloned = resp.clone();
				const newHeaders = new Headers(cloned.headers);
				newHeaders.set("x-cached-at", Date.now().toString());
				const newResp = new Response(await cloned.blob(), {
					status: cloned.status,
					statusText: cloned.statusText,
					headers: newHeaders,
				});
				cache.put(url, newResp).catch(() => {
					// Si falla el cache.put, no importa: seguimos con la URL
				});
				evictIfNeeded(cache);
			}

			if (useBlobUrl) {
				const blob = await resp.blob();
				const blobUrl = URL.createObjectURL(blob);
				blobUrlCache.set(url, { url: blobUrl, timestamp: Date.now() });
				evictExpiredFromMemory();
				return blobUrl;
			}
		}
	} catch {
		// Si falla el fetch, retornar la URL original como fallback
	}

	return url;
}

/**
 * Limpia el cache completamente. Útil para debugging o logout.
 */
export async function clearImageCache(): Promise<void> {
	// Limpiar blob URLs en memoria
	for (const entry of blobUrlCache.values()) {
		URL.revokeObjectURL(entry.url);
	}
	blobUrlCache.clear();

	// Limpiar Cache API
	const cache = await getCacheStorage();
	if (cache) {
		const keys = await cache.keys();
		await Promise.all(keys.map((k) => cache.delete(k)));
	}
}

/**
 * Hook React que devuelve la URL cacheada de una imagen.
 * El componente se re-renderiza con la URL cacheada cuando está disponible.
 */
import { useEffect, useState } from "react";

export function useCachedImage(
	url: string | null,
	options: { useBlobUrl?: boolean } = {},
): string | null {
	const [src, setSrc] = useState<string | null>(url);

	useEffect(() => {
		if (!url) {
			setSrc(null);
			return;
		}
		let cancelled = false;
		getCachedImage(url, options).then((cached) => {
			if (!cancelled) setSrc(cached);
		});
		return () => {
			cancelled = true;
		};
	}, [url, options.useBlobUrl]);

	return src;
}
