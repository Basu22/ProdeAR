export interface VersionInfo {
	version: string;
	buildTime: string;
	minSupportedVersion: string;
	forceUpdate: boolean;
	changelog: string;
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
	const normalize = (v: string) => v.replace(/^[^0-9]+/, "").split(/[.-]/);
	const partsA = normalize(a);
	const partsB = normalize(b);
	const len = Math.max(partsA.length, partsB.length);

	for (let i = 0; i < len; i++) {
		const numA = Number.parseInt(partsA[i] || "0", 10);
		const numB = Number.parseInt(partsB[i] || "0", 10);

		if (numA > numB) return 1;
		if (numA < numB) return -1;
	}

	return 0;
}

export function isUpdateAvailable(current: string, server: string): boolean {
	return compareVersions(current, server) === -1;
}

export function isUpdateForced(current: string, server: VersionInfo): boolean {
	if (server.forceUpdate) return true;
	return compareVersions(current, server.minSupportedVersion) === -1;
}

export function shouldResurface(
	lastDismissedAt: string | null,
	now?: number,
	cooldownMs: number = 24 * 60 * 60 * 1000,
): boolean {
	if (!lastDismissedAt) return true;
	const timestamp = now ?? Date.now();
	const dismissed = new Date(lastDismissedAt).getTime();
	return timestamp - dismissed >= cooldownMs;
}

export function versionJsonUrl(buildId: string): string {
	return `/version.json?v=${buildId}`;
}

export async function clearStaleCaches(
	keepNames?: string[],
): Promise<string[]> {
	if (typeof caches === "undefined") return [];

	const keepSet = new Set(keepNames || []);
	const cacheNames = await caches.keys();
	const deleted: string[] = [];

	for (const name of cacheNames) {
		// Conservar caches del SW activo (contienen "workbox" o el prefijo de
		// vite-plugin-pwa "prodear-"). Solo borrar caches huérfanos que ya
		// no están en uso.
		if (keepSet.has(name)) continue;
		if (name.includes("workbox")) continue;
		if (name.startsWith("prodear-")) continue;
		try {
			await caches.delete(name);
			deleted.push(name);
		} catch {
			// Ignore deletion errors
		}
	}

	return deleted;
}

export function clearStaleLocalStorage(
	currentNamespace: string,
	prefix: string = "prodear_",
): string[] {
	const preserved = [
		"sb-",
		"prodear_push_enabled",
		"prodear_live_timers",
		"prodear_onboarding",
		"prodear_chat",
	];
	const deleted: string[] = [];
	const keysToRemove: string[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key) continue;

		if (key.startsWith(`${prefix}${currentNamespace}_`)) {
			continue;
		}

		const shouldPreserve = preserved.some((p) => key.startsWith(p));
		if (shouldPreserve) continue;

		if (key.startsWith(prefix)) {
			keysToRemove.push(key);
		}
	}

	for (const key of keysToRemove) {
		localStorage.removeItem(key);
		deleted.push(key);
	}

	return deleted;
}
