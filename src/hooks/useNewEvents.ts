import { useCallback, useEffect, useRef, useState } from "react";
import type { Match, MatchEvent } from "../lib/types";

/**
 * Detecta eventos nuevos comparando IDs contra un Set visto.
 * NO dispara animaciones en el primer render (puebla el Set silenciosamente).
 *
 * @param match - Partido del cual se monitorean eventos
 * @param isLive - Si el partido está en vivo (si no, limpia la cola)
 * @returns Lista de eventos nuevos detectados y función para limpiar uno
 */
export function useNewEvents(match: Match, isLive: boolean) {
	const seenIdsRef = useRef<Set<string>>(new Set());
	const isFirstRenderRef = useRef(true);
	const [newEvents, setNewEvents] = useState<MatchEvent[]>([]);

	useEffect(() => {
		if (!isLive) {
			setNewEvents([]);
			return;
		}

		const events = match.events ?? [];

		if (isFirstRenderRef.current) {
			// Primer render: poblar el Set sin disparar nada
			events.forEach((e) => seenIdsRef.current.add(e.id));
			isFirstRenderRef.current = false;
			return;
		}

		// Detectar eventos nuevos
		const fresh: MatchEvent[] = [];
		for (const e of events) {
			if (!seenIdsRef.current.has(e.id)) {
				seenIdsRef.current.add(e.id);
				fresh.push(e);
			}
		}
		if (fresh.length > 0) {
			setNewEvents((prev) => [...prev, ...fresh]);
		}
	}, [match.events, isLive]);

	const clearEvent = useCallback((id: string) => {
		setNewEvents((prev) => prev.filter((e) => e.id !== id));
	}, []);

	return { newEvents, clearEvent };
}
