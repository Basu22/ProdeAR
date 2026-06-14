import { useMemo } from "react";
import type { MatchEvent } from "../lib/types";
import { groupEventsByPeriod, type PeriodGroup } from "../lib/periodHelpers";

/**
 * Hook que agrupa eventos por período con memoización.
 * Usado en el tab "Eventos" del Match Bottom Sheet.
 *
 * El cálculo se invalida solo si cambia el array `events` (referencia),
 * NO en cada render.
 */
export function useEventPeriods(
	events: MatchEvent[] | null | undefined,
): PeriodGroup[] {
	return useMemo(() => groupEventsByPeriod(events), [events]);
}
