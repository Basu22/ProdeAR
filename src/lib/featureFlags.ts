/**
 * `featureFlags` — Sistema simple de feature flags para ProdeAR.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Permite habilitar/deshabilitar features sin redeploy, tanto en build-time
 * (via `import.meta.env.VITE_*`) como en runtime (via `localStorage`).
 *
 * Para refactors riesgosos (ej. T2-T4 del Mundial 2026), el feature flag
 * permite rollback instantáneo si se detecta un bug crítico en producción.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * - Código no-React:
 *   ```ts
 *   import { isFeatureEnabled } from "@/lib/featureFlags";
 *   if (isFeatureEnabled("BRACKET_V2")) {
 *     // nueva lógica
 *   }
 *   ```
 *
 * - Componentes React (re-renderiza cuando cambia el flag):
 *   ```tsx
 *   import { useFeatureFlag } from "@/lib/featureFlags";
 *   const bracketV2 = useFeatureFlag("BRACKET_V2");
 *   ```
 *
 * - Override en runtime (consola del browser):
 *   ```js
 *   localStorage.setItem("prodear:flag:BRACKET_V2", "true");
 *   location.reload();
 *   ```
 *
 * ============================================================================
 * PRECEDENCIA
 * ============================================================================
 * 1. localStorage override (mayor precedencia, para QA/dev)
 * 2. import.meta.env.VITE_<FLAG> (configurado en build/deploy)
 * 3. default del flag (fallback seguro)
 *
 * @module lib/featureFlags
 */

/**
 * Catálogo de feature flags de ProdeAR.
 *
 * Para agregar uno nuevo:
 * 1. Agregar el nombre al union `FeatureFlag`
 * 2. Agregar el default en `FLAG_DEFAULTS`
 * 3. Documentar el propósito en un comment
 *
 * Convención de naming: SCREAMING_SNAKE_CASE, sin prefijo (los flags son
 * globales al producto, no específicos de un módulo).
 */
export type FeatureFlag =
	/** Habilita el nuevo bracket engine FIFA 2026 (T2-T4). Default: false. */
	| "BRACKET_V2"
	/** Habilita el modal educativo "¿Cómo funciona el bracket?" (T10). */
	| "BRACKET_HELP_MODAL"
	/** Habilita microinteracciones animadas del bracket (T9). */
	| "BRACKET_ANIMATIONS";

/**
 * Defaults seguros para cada flag. En general, flags nuevos arrancan en
 * `false` hasta que se valide la feature en producción.
 */
const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
	BRACKET_V2: false,
	BRACKET_HELP_MODAL: true,
	BRACKET_ANIMATIONS: true,
};

const STORAGE_PREFIX = "prodear:flag:";

/**
 * Lee el valor de un feature flag siguiendo la precedencia:
 * 1. localStorage (override manual)
 * 2. env var (build-time)
 * 3. default
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
	if (typeof window !== "undefined") {
		try {
			const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${flag}`);
			if (stored !== null) {
				return stored === "true";
			}
		} catch {
			// localStorage no disponible (SSR, modo privado, etc.) → sigue al env
		}
	}

	// Env var: VITE_BRACKET_V2, VITE_BRACKET_HELP_MODAL, etc.
	const envKey = `VITE_${flag}`;
	const envValue = import.meta.env[envKey as keyof ImportMetaEnv];
	if (envValue !== undefined && envValue !== null && envValue !== "") {
		return String(envValue) === "true";
	}

	return FLAG_DEFAULTS[flag];
}

/**
 * Setea un override en localStorage para un flag (útil para QA).
 * NO persiste entre sesiones si el usuario limpia localStorage.
 */
export function setFeatureFlag(flag: FeatureFlag, enabled: boolean): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(`${STORAGE_PREFIX}${flag}`, String(enabled));
	} catch {
		// Ignorar errores de localStorage (modo privado, cuota llena, etc.)
	}
}

/**
 * Limpia el override de un flag (vuelve a leer del env/default).
 */
export function clearFeatureFlag(flag: FeatureFlag): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(`${STORAGE_PREFIX}${flag}`);
	} catch {
		// Ignorar
	}
}

/**
 * Snapshot del estado actual de TODOS los flags. Útil para debugging.
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
	const result = {} as Record<FeatureFlag, boolean>;
	for (const flag of Object.keys(FLAG_DEFAULTS) as FeatureFlag[]) {
		result[flag] = isFeatureEnabled(flag);
	}
	return result;
}
