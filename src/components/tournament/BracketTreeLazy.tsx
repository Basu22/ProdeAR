/**
 * `BracketTreeLazy` — Wrapper de code-splitting para `BracketTree`.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Reduce el bundle principal de la app lazy-cargando `BracketTree` (y todo su
 * árbol de imports: `BracketQuadro`, `BracketHybrid`, `BracketMatchCard`,
 * `BracketColumn`, `BracketRound`, `BracketConnectors`, `RoundChipBar`,
 * `GlobalBracketHeader`, `DetailHeader`, `usePrefersReducedMotion`, etc.).
 *
 * Sin este wrapper, TODO el código del bracket se incluye en el bundle inicial
 * que descarga el usuario al abrir la app, aunque nunca visite la tab LLAVES.
 * Con este wrapper, el código del bracket se descarga solo cuando el usuario
 * navega a una ruta que lo necesita (Ligas, Tournament, PositionsView).
 *
 * ============================================================================
 * IMPLEMENTACIÓN
 * ============================================================================
 * - `React.lazy` crea un componente que se descarga on-demand.
 * - `Suspense` muestra un fallback mientras se carga el chunk.
 * - El fallback es un skeleton simple (un div con altura mínima) para evitar
 *   layout shift cuando el bracket se monta.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * Reemplazar `import { BracketTree } from "./BracketTree"` por
 * `import { BracketTree } from "./BracketTreeLazy"` en los 3 consumers.
 *
 * `BracketTree` (eager) sigue existiendo para los tests.
 *
 * @module components/tournament/BracketTreeLazy
 */

import { lazy, Suspense, type ComponentProps } from "react";

// Renombramos el import lazy para evitar shadowing con el export.
// `LazyBracketTree` es el componente real descargado on-demand.
const LazyBracketTree = lazy(() =>
	import("./BracketTree").then((m) => ({ default: m.BracketTree })),
);

type BracketTreeProps = ComponentProps<typeof LazyBracketTree>;

/**
 * Skeleton mientras se carga el chunk del bracket.
 * Usa `min-h-[200px]` para evitar layout shift cuando se monta.
 */
function BracketFallback() {
	return (
		<div
			role="status"
			aria-label="Cargando árbol de eliminatorias"
			className="
				min-h-[200px]
				flex items-center justify-center
				text-on-surface-variant/60
				font-label-caps text-[10px] uppercase tracking-widest
			"
		>
			<span className="animate-pulse">Cargando bracket...</span>
		</div>
	);
}

/**
 * Wrapper lazy de `BracketTree` con Suspense integrado.
 * Misma API que `BracketTree` original — drop-in replacement.
 */
export function BracketTree(props: BracketTreeProps) {
	return (
		<Suspense fallback={<BracketFallback />}>
			<LazyBracketTree {...props} />
		</Suspense>
	);
}
