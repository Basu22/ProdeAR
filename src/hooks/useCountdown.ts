import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/predictionHelpers";

export interface UseCountdownResult {
	/** Milisegundos restantes hasta targetDate. 0 si ya pasó o targetDate es null. */
	msRemaining: number;
	/** String formateado: "2h 15min", "45min", "Cerrado", o "" si targetDate es null. */
	formatted: string;
	/** Si el countdown ya expiró (msRemaining <= 0 y targetDate no era null). */
	isExpired: boolean;
}

const EMPTY_RESULT: UseCountdownResult = {
	msRemaining: 0,
	formatted: "",
	isExpired: false,
};

function calculate(targetTime: number): UseCountdownResult {
	const ms = targetTime - Date.now();
	return {
		msRemaining: Math.max(0, ms),
		formatted: formatCountdown(ms),
		isExpired: ms <= 0,
	};
}

/**
 * Hook reactivo de countdown. Se actualiza cada `intervalMs` milisegundos.
 *
 * CRÍTICO: usamos `targetTime: number` en las deps (NO el objeto Date).
 * El padre a menudo pasa `new Date(...)` en cada render, lo cual crea una
 * NUEVA referencia del objeto Date cada vez. Si usáramos `targetDate: Date`
 * en las deps, el useEffect se ejecutaría en cada render, llamaría a
 * `setState(calculate(...))` que retorna un objeto NUEVO, React lo compararía
 * por referencia, vería "state changed", re-renderizaría, y eso causaría
 * un infinite render loop con "Maximum update depth exceeded".
 *
 * Extrayendo `targetTime` (number) de `targetDate` (Date) en cada render,
 * las deps solo cambian cuando el TIMESTAMP realmente cambia, no cuando
 * se crea un nuevo objeto Date con el mismo timestamp.
 *
 * @param targetDate - Fecha objetivo. Si es null, retorna valores vacíos.
 * @param intervalMs - Intervalo de actualización en ms. Default: 30s.
 */
export function useCountdown(
	targetDate: Date | null,
	intervalMs: number = 30_000,
): UseCountdownResult {
	// Extraer el timestamp (number) en cada render para que las deps del useEffect
	// sean estables. Date objects se comparan por referencia; numbers por valor.
	const targetTime = targetDate ? targetDate.getTime() : null;

	const [state, setState] = useState<UseCountdownResult>(() =>
		targetTime !== null ? calculate(targetTime) : EMPTY_RESULT,
	);

	useEffect(() => {
		if (targetTime === null) {
			setState(EMPTY_RESULT);
			return;
		}

		setState(calculate(targetTime));

		const id = setInterval(() => {
			setState(calculate(targetTime));
		}, intervalMs);

		return () => clearInterval(id);
	}, [targetTime, intervalMs]);

	return state;
}
