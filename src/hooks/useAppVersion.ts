import { useRegisterSW } from "virtual:pwa-register/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { VersionInfo } from "../lib/versionCheck";
import {
	clearStaleCaches,
	clearStaleLocalStorage,
	isUpdateAvailable,
	isUpdateForced,
	shouldResurface,
	versionJsonUrl,
} from "../lib/versionCheck";
import { useUpdateStore } from "../stores/updateStore";

const POLL_INTERVAL = 5 * 60 * 1000;
const THROTTLE_MS = 30 * 1000;
const MAX_RELOADS = 2;
const RELOAD_WINDOW = 60 * 1000;
const BROADCAST_CHANNEL = "prodear_update_sync";
const RELOAD_STORAGE_KEY = "prodear_reload_timestamps";

export function useAppVersion() {
	const queryClient = useQueryClient();
	const lastFetchRef = useRef<number>(0);
	const {
		status,
		clientVersion,
		serverVersion,
		lastDismissedAt,
		setAvailable,
		setApplying,
		setCompleted,
		setError,
	} = useUpdateStore();

	const {
		needRefresh: [needRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(r: ServiceWorkerRegistration | undefined) {
			if (r) {
				checkForUpdates();
			}
		},
		onRegisterError(error: any) {
			console.error("[SW] Registration error:", error);
		},
	});

	const getReloadTimestamps = (): number[] => {
		try {
			const stored = sessionStorage.getItem(RELOAD_STORAGE_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	};

	const saveReloadTimestamp = (timestamps: number[]) => {
		try {
			sessionStorage.setItem(RELOAD_STORAGE_KEY, JSON.stringify(timestamps));
		} catch {
			// Ignore storage errors
		}
	};

	const checkForUpdates = useCallback(async () => {
		if (!navigator.onLine) return;

		const now = Date.now();

		if (now - lastFetchRef.current < THROTTLE_MS) {
			return;
		}

		const buildId = import.meta.env.VITE_APP_VERSION || "dev";
		const url = versionJsonUrl(buildId);

		try {
			const response = await fetch(url, { cache: "no-store" });
			if (!response.ok) return;

			const serverInfo: VersionInfo = await response.json();
			const currentVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";

			if (isUpdateAvailable(currentVersion, serverInfo.version)) {
				const isForced = isUpdateForced(currentVersion, serverInfo);

				// Incluso updates forzados respetan un cooldown mínimo (1h) para evitar spam
				const forcedCooldownMs = 60 * 60 * 1000;
				const canShowForced = shouldResurface(
					lastDismissedAt,
					Date.now(),
					forcedCooldownMs,
				);

				if (isForced && canShowForced) {
					setAvailable(serverInfo, currentVersion);
					useUpdateStore.setState({ status: "forced" });
				} else if (!isForced && shouldResurface(lastDismissedAt)) {
					setAvailable(serverInfo, currentVersion);
				}
			}

			lastFetchRef.current = now;
		} catch (error) {
			console.error("[VersionCheck] Fetch error:", error);
		}
	}, [lastDismissedAt, setAvailable]);

	const waitForMutations = async (timeout = 10000): Promise<boolean> => {
		const start = Date.now();
		while (queryClient.isMutating() > 0 && Date.now() - start < timeout) {
			await new Promise((r) => setTimeout(r, 500));
		}
		return queryClient.isMutating() === 0;
	};

	const applyUpdate = useCallback(async () => {
		const timestamps = getReloadTimestamps();
		const recentTimestamps = timestamps.filter(
			(t) => Date.now() - t < RELOAD_WINDOW,
		);

		if (recentTimestamps.length >= MAX_RELOADS) {
			setError("Demasiados intentos de recarga. Recargá manualmente.");
			return;
		}

		const mutationsComplete = await waitForMutations();
		if (!mutationsComplete) {
			setError(
				"Operaciones en curso no pudieron completarse. Intentá de nuevo en unos segundos.",
			);
			return;
		}

		setApplying();

		try {
			if (needRefresh) {
				await updateServiceWorker(true);
			}

			const currentNamespace = import.meta.env.VITE_APP_VERSION || "current";
			clearStaleLocalStorage(currentNamespace);
			// Limpiar caches huérfanos. Conservamos los caches del SW activo
			// (workbox-*) y del prefijo de vite-plugin-pwa (prodear-*).
			await clearStaleCaches(["google-fonts-cache", "gstatic-fonts-cache"]);

			const newTimestamps = [...recentTimestamps, Date.now()];
			saveReloadTimestamp(newTimestamps);

			if (typeof BroadcastChannel !== "undefined") {
				const channel = new BroadcastChannel(BROADCAST_CHANNEL);
				channel.postMessage({ type: "reload" });
				channel.close();
			} else {
				localStorage.setItem("prodear_update_sync", "reload");
				localStorage.removeItem("prodear_update_sync");
			}

			setCompleted();

			setTimeout(() => {
				window.location.reload();
			}, 500);
		} catch (error) {
			console.error("[VersionCheck] Apply error:", error);
			setError("Error al aplicar la actualización. Recargá manualmente.");
		}
	}, [
		needRefresh,
		updateServiceWorker,
		queryClient,
		setApplying,
		setCompleted,
		setError,
	]);

	useEffect(() => {
		if (needRefresh && status === "idle") {
			checkForUpdates();
		}
	}, [needRefresh, status, checkForUpdates]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				checkForUpdates();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [checkForUpdates]);

	useEffect(() => {
		const interval = setInterval(() => {
			checkForUpdates();
		}, POLL_INTERVAL);

		return () => clearInterval(interval);
	}, [checkForUpdates]);

	useEffect(() => {
		if (typeof BroadcastChannel !== "undefined") {
			const channel = new BroadcastChannel(BROADCAST_CHANNEL);
			channel.onmessage = (event) => {
				if (event.data?.type === "reload") {
					window.location.reload();
				}
			};

			return () => channel.close();
		} else {
			const handleStorage = (e: StorageEvent) => {
				if (e.key === "prodear_update_sync" && e.newValue === "reload") {
					window.location.reload();
				}
			};

			window.addEventListener("storage", handleStorage);
			return () => window.removeEventListener("storage", handleStorage);
		}
	}, []);

	return {
		status,
		serverVersion,
		clientVersion,
		applyUpdate,
		dismiss: useUpdateStore.getState().dismiss,
	};
}
