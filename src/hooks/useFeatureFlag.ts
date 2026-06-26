/**
 * `useFeatureFlag` — Hook de React para feature flags con re-render reactivo.
 *
 * Si el flag cambia en localStorage (ej. desde devtools), el componente
 * se re-renderiza automáticamente.
 *
 * @example
 * ```tsx
 * const bracketV2 = useFeatureFlag("BRACKET_V2");
 * return bracketV2 ? <NewBracket /> : <LegacyBracket />;
 * ```
 */

import { useEffect, useState } from "react";
import { type FeatureFlag, isFeatureEnabled } from "../lib/featureFlags";

export function useFeatureFlag(flag: FeatureFlag): boolean {
	const [enabled, setEnabled] = useState(() => isFeatureEnabled(flag));

	useEffect(() => {
		// Escuchar cambios manuales de localStorage (devtools / QA)
		const handleStorage = (e: StorageEvent) => {
			if (e.key === `prodear:flag:${flag}`) {
				setEnabled(isFeatureEnabled(flag));
			}
		};
		window.addEventListener("storage", handleStorage);

		// También re-evaluar en foco de ventana (caso típico de QA)
		const handleFocus = () => setEnabled(isFeatureEnabled(flag));
		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("storage", handleStorage);
			window.removeEventListener("focus", handleFocus);
		};
	}, [flag]);

	return enabled;
}
