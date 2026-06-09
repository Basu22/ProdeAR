import { useEffect, useState } from "react";
import type { Match } from "../lib/types";

const STORAGE_KEY = "prodear_live_timers";

interface LiveTimerData {
	minute: number;
	savedAt: number;
}

/**
 * Recupera el minuto de juego estimado desde localStorage.
 * Compara el minuto estimado localmente con el de la base de datos y
 * devuelve el mayor para evitar retrocesos por delays en la API de fútbol.
 */
function getSavedLiveMinute(matchId: string, dbMinute: number): number {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return dbMinute;
		const timers: Record<string, LiveTimerData> = JSON.parse(raw);
		const saved = timers[matchId];
		if (!saved) return dbMinute;

		// Si el timer guardado tiene más de 3 horas, está obsoleto
		const now = Date.now();
		const ageMs = now - saved.savedAt;
		if (ageMs > 3 * 60 * 60 * 1000) {
			return dbMinute;
		}

		// Calcular cuántos minutos transcurrieron desde que se guardó
		const elapsedMinutes = Math.floor(ageMs / 60000);
		const estimatedMinute = saved.minute + elapsedMinutes;

		// Si el minuto estimado es mayor al de la DB, lo usamos
		if (estimatedMinute > dbMinute) {
			return estimatedMinute;
		}
	} catch (e) {
		console.error("Error reading saved live minute:", e);
	}
	return dbMinute;
}

/**
 * Guarda el minuto actual del partido en localStorage.
 */
function saveLiveMinute(matchId: string, minute: number) {
	try {
		const raw = localStorage.getItem(STORAGE_KEY) || "{}";
		const timers: Record<string, LiveTimerData> = JSON.parse(raw);
		timers[matchId] = {
			minute,
			savedAt: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
	} catch (e) {
		console.error("Error saving live minute:", e);
	}
}

/**
 * Custom hook to simulate the progress of a live match timer in the frontend.
 * This prevents user anxiety by incrementing the elapsed minute locally between database syncs.
 * It strictly respects football match timing rules:
 * - Capping the first half at 45'
 * - Capping the second half at 90'
 * - Capping extra time at 120'
 * - Displaying "ET" during halftime (rawStatus = 'HT')
 * - Displaying "PEN" during penalty shootout (rawStatus = 'P')
 * - Not ticking during halftime or full-time
 */
export function useLiveMinute(match: Match): number | string | undefined {
	const isLive = match.status === "live";
	const rawStatus = match.rawStatus;

	// Si está en vivo y no es entretiempo ni penales, buscamos si hay un timer guardado localmente más actualizado
	const startMinute = isLive && rawStatus !== "HT" && rawStatus !== "P" && match.minute !== undefined
		? getSavedLiveMinute(match.id, match.minute)
		: match.minute;

	const [liveMinute, setLiveMinute] = useState<number | string | undefined>(
		isLive && rawStatus === "HT"
			? "ET"
			: isLive && rawStatus === "P"
				? "PEN"
				: startMinute,
	);

	useEffect(() => {
		// If rawStatus is halftime or penalty, set state and exit
		if (isLive && rawStatus === "HT") {
			setLiveMinute("ET");
			return;
		}
		if (isLive && rawStatus === "P") {
			setLiveMinute("PEN");
			return;
		}

		// Al recibir una actualización de props, volvemos a evaluar contra localStorage
		const currentStart = isLive && match.minute !== undefined
			? getSavedLiveMinute(match.id, match.minute)
			: startMinute;

		setLiveMinute(currentStart);

		if (!isLive || currentStart === undefined) {
			return;
		}

		// Save the timestamp of when this match update was received
		const lastUpdatedTime = Date.now();

		const interval = setInterval(() => {
			const elapsedMs = Date.now() - lastUpdatedTime;
			const elapsedMinutes = Math.floor(elapsedMs / 60000);

			if (elapsedMinutes > 0) {
				setLiveMinute(() => {
					let nextMinute = currentStart;
					// Football-specific stopwatch capping logic
					if (currentStart > 0 && currentStart < 45) {
						nextMinute = Math.min(currentStart + elapsedMinutes, 45);
					} else if (currentStart === 45) {
						nextMinute = 45;
					} else if (currentStart > 45 && currentStart < 90) {
						nextMinute = Math.min(currentStart + elapsedMinutes, 90);
					} else if (currentStart === 90) {
						nextMinute = 90;
					} else if (currentStart > 90 && currentStart < 120) {
						nextMinute = Math.min(currentStart + elapsedMinutes, 120);
					}

					// Guardar el minuto progresado en localStorage para que no se pierda al recargar
					if (typeof nextMinute === "number") {
						saveLiveMinute(match.id, nextMinute);
					}
					return nextMinute;
				});
			}
		}, 10000); // Check every 10 seconds to update the minute smoothly

		return () => clearInterval(interval);
	}, [match.id, match.minute, isLive, rawStatus, startMinute]);

	return liveMinute;
}
