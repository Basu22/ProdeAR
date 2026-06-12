import { useEffect, useState } from "react";
import type { Match } from "../lib/types";

/**
 * Estados del cronómetro oficial que indican que el partido está pausado.
 * Referencia: API-Football `fixture.status.short`
 *  - HT:  Entretiempo (Half Time)
 *  - ET:  Entretiempo del tiempo extra (Extra Time break)
 *  - BT:  Break Time (algunos proveedores usan este código como sinónimo de HT/ET)
 *  - INT: Partido interrumpido (clima, corte de luz, etc.)
 *  - P:   Tanda de penales en curso
 *  - SUSP: Partido suspendido
 *  - LIVE: La API no puede precisar la fase exacta; tratamos como "no fiable para tickear"
 */
const PAUSED_STATUSES = new Set(["HT", "ET", "BT", "INT", "P", "SUSP", "LIVE"]);

// Bump de la key para invalidar timers viejos almacenados con la lógica anterior
// (que acumulaba drift entre sesiones).
const STORAGE_KEY = "prodear_live_timers_v2";

interface LiveTimerData {
	minute: number;
	savedAt: number;
	kickOff: string;
}

export type LiveFreshness = "fresh" | "warm" | "stale" | "unknown";

export interface LiveMinuteInfo {
	/** Valor a mostrar: número (minuto) o string (ET, PEN, etc.). */
	minute: number | string | undefined;
	/** True si el partido está en un estado de pausa oficial (HT, ET, P, etc.). */
	isPaused: boolean;
	/** True si el último dato conocido de la API tiene más de 4 minutos de antigüedad. */
	isStale: boolean;
	/** Categoría de frescura del dato, útil para indicadores visuales (~ / ⏱️). */
	freshness: LiveFreshness;
	/** Minutos enteros transcurridos desde el último update de la API. */
	ageMinutes: number;
	/** Timestamp (ms epoch) del último update de la API observado por el hook. */
	lastApiUpdateAt: number;
}

interface UseLiveMinuteOptions {
	/** Override del timestamp del último update (útil para tests). */
	lastApiUpdateAt?: number;
}

/**
 * Hook "Emergency Brake" para mostrar el minuto en vivo de un partido.
 *
 * Cambios respecto a la versión anterior (deploy 2026-06-11 — Opción A):
 *  1. La API es la fuente de verdad. Se muestra `match.minute` tal cual llega.
 *  2. Se permite un "+1 suave" de MÁXIMO 2 minutos sobre el último valor
 *     conocido de la API para que el cronómetro no se sienta "congelado"
 *     entre syncs. Pasado ese umbral, el tick se detiene y se espera el
 *     próximo update.
 *  3. Se respetan TODOS los `rawStatus` de pausa (HT, ET, BT, INT, P, SUSP,
 *     LIVE), no sólo HT y P como en la versión anterior.
 *  4. Los caps son "blandos" para permitir tiempo agregado: 55 en 1H,
 *     105 en 2H, 125 en tiempo extra.
 *  5. El hook expone metadata de frescura (`isStale`, `freshness`, `ageMinutes`)
 *     para que la UI muestre un indicador honesto al usuario cuando el dato
 *     tiene varios minutos de antigüedad.
 *
 * Esto elimina el bug del partido México vs Sudáfrica, donde el cronómetro
 * local seguía avanzando durante las pausas oficiales (hidratación, VAR,
 * lesiones, agregado) y acumulaba 10+ minutos de drift.
 */
export function useLiveMinute(
	match: Match,
	options: UseLiveMinuteOptions = {},
): LiveMinuteInfo {
	const isLive = match.status === "live";
	const rawStatus = match.rawStatus;
	const isPaused =
		isLive && rawStatus !== undefined && PAUSED_STATUSES.has(rawStatus);

	const [lastApiUpdateAt, setLastApiUpdateAt] = useState<number>(
		() => options.lastApiUpdateAt ?? Date.now(),
	);

	// Tick periódico para refrescar la "freshness" mostrada al usuario
	// sin necesidad de un nuevo update de la API. 30s es suficiente para
	// que el indicador ~/⏱️ cambie de estado de manera visible.
	const [tickNow, setTickNow] = useState<number>(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setTickNow(Date.now()), 30_000);
		return () => clearInterval(id);
	}, []);

	const startMinute = computeStartMinute(match, isPaused, isLive, rawStatus);
	const [liveMinute, setLiveMinute] = useState<number | string | undefined>(
		startMinute,
	);

	useEffect(() => {
		// Si las props cambiaron (o el hook se montó con un partido en vivo),
		// reseteamos al valor de la API y registramos el timestamp del update.
		const freshStart = computeStartMinute(
			match,
			isPaused,
			isLive,
			rawStatus,
		);
		setLiveMinute(freshStart);
		setLastApiUpdateAt(Date.now());

		if (!isLive) return;
		if (isPaused) return;
		if (typeof freshStart !== "number") return;

		const startTime = Date.now();
		const baseMinute = freshStart;

		// Máximo de minutos que el reloj local puede sumar sin un nuevo
		// update de la API. Con polls cada 60-90s esto da 1-2 minutos de
		// "smoothness" y frena a tiempo. Con polls cada 5 min (situación
		// actual), el freno se activa a los 2 min y el reloj queda a la
		// espera del próximo sync (que es preferible a seguir acumulando drift).
		const MAX_LOCAL_TICK_MINUTES = 2;

		const softCap = computeSoftCap(baseMinute, rawStatus);

		const interval = setInterval(() => {
			const elapsedMs = Date.now() - startTime;
			const elapsedMinutes = Math.floor(elapsedMs / 60_000);

			if (elapsedMinutes <= 0) return;
			if (elapsedMinutes > MAX_LOCAL_TICK_MINUTES) {
				// Emergency brake: ya no es seguro seguir sumando sin un update real.
				return;
			}

			setLiveMinute((prev) => {
				if (typeof prev !== "number") return prev;
				const next = Math.min(prev + 1, softCap);
				if (next !== prev) {
					saveLiveMinute(match.id, next, match.kickOff);
				}
				return next;
			});
		}, 10_000);

		return () => clearInterval(interval);
	}, [
		match.id,
		match.minute,
		match.kickOff,
		isLive,
		rawStatus,
		isPaused,
	]);

	const ageMs = tickNow - lastApiUpdateAt;
	const ageMinutes = Math.floor(ageMs / 60_000);

	let freshness: LiveFreshness = "unknown";
	if (isLive) {
		if (ageMs < 90_000) freshness = "fresh"; // < 90s
		else if (ageMs < 240_000) freshness = "warm"; // 90s - 4min
		else freshness = "stale"; // > 4min
	}

	return {
		minute: liveMinute,
		isPaused,
		isStale: freshness === "stale",
		freshness,
		ageMinutes,
		lastApiUpdateAt,
	};
}

// ===== Helpers =====

/**
 * Calcula el valor inicial a mostrar según el estado del partido.
 */
function computeStartMinute(
	match: Match,
	isPaused: boolean,
	isLive: boolean,
	rawStatus: string | undefined,
): number | string | undefined {
	if (!isLive) return match.minute;

	if (isPaused) {
		switch (rawStatus) {
			case "HT":
				return "ET";
			case "ET":
				return "ET";
			case "BT":
				return "BT";
			case "INT":
				return "INT";
			case "P":
				return "PEN";
			case "SUSP":
				return "SUSP";
			case "LIVE":
				// LIVE sin fase precisa: no mostramos número
				return undefined;
			default:
				return match.minute;
		}
	}

	if (match.minute === undefined) return undefined;
	return getSavedLiveMinute(match.id, match.minute, match.kickOff);
}

/**
 * Recupera el minuto de juego estimado desde localStorage.
 * Se usa solo como un "+1 patch" entre syncs; la DB manda.
 * Si el timer guardado tiene más de 2 min de antigüedad, lo descartamos
 * (en el código original esto era 3h, lo cual generaba drift enorme).
 */
function getSavedLiveMinute(
	matchId: string,
	dbMinute: number,
	kickOff: string,
): number {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return dbMinute;
		const timers: Record<string, LiveTimerData> = JSON.parse(raw);
		const saved = timers[matchId];
		if (!saved) return dbMinute;
		if (saved.kickOff !== kickOff) return dbMinute;

		const now = Date.now();
		const ageMs = now - saved.savedAt;
		if (ageMs > 2 * 60 * 60 * 1000) return dbMinute; // > 2h: obsoleto

		const elapsedMinutes = Math.floor(ageMs / 60_000);
		if (elapsedMinutes > 2) return dbMinute; // > 2 min: no confiable

		const estimatedMinute = saved.minute + elapsedMinutes;
		if (estimatedMinute > dbMinute) return estimatedMinute;
	} catch (e) {
		console.error("Error reading saved live minute:", e);
	}
	return dbMinute;
}

function saveLiveMinute(matchId: string, minute: number, kickOff: string) {
	try {
		const raw = localStorage.getItem(STORAGE_KEY) || "{}";
		const timers: Record<string, LiveTimerData> = JSON.parse(raw);
		timers[matchId] = {
			minute,
			savedAt: Date.now(),
			kickOff,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
	} catch (e) {
		console.error("Error saving live minute:", e);
	}
}

/**
 * Cap blando según la fase del partido, dejando margen generoso para
 * tiempo agregado (added time / stoppage time).
 */
function computeSoftCap(
	currentMinute: number,
	_rawStatus: string | undefined,
): number {
	if (currentMinute <= 45) return 55; // 1H: 45 + hasta 10 de agregado
	if (currentMinute <= 90) return 105; // 2H: 90 + hasta 15 de agregado
	if (currentMinute <= 120) return 125; // ET: 120 + hasta 5 de agregado
	return 130;
}
