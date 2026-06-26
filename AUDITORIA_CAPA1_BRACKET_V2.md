# Auditoría QA — Bracket V2 Capa 1

**Fecha**: 2026-06-25  
**Auditor**: @qa-engineer  
**Scope**: Capa 1 del Bracket V2 + incidente del import roto  
**Commit auditado**: `853131b` + fixes posteriores  

---

## Resumen Ejecutivo

**Veredicto: NO-GO para Capa 2** — La Capa 1 tiene una regresión crítica que debe resolverse antes de avanzar.

La implementación del shell `BracketHybrid` es correcta en aislamiento: el feature flag funciona, la URL sync es robusta, la validación de rounds es segura, y la accesibilidad base está cubierta. Sin embargo, la activación de `VITE_BRACKET_V2=true` en `.env.local` **rompe 14 tests existentes** (8 de `BracketTree`, 3 de `PositionsView`, 2 de `hotfixT0`, 1 de `worldCupGroups`) porque `BracketTree` ahora delega a `BracketHybrid` (placeholder) en vez de `BracketQuadro` (implementación real), y los tests existentes buscan elementos DOM de `BracketQuadro` que ya no se renderizan.

Adicionalmente, `tsc -b` reporta **25 errores de compilación** (pre-existentes + 1 nuevo en `BracketColumn.tsx`), no hay CI/CD configurado, no hay pre-commit hooks, y se encontraron **2 imports rotos** en un archivo de test. El hook `usePrefersReducedMotion` es dead code (no se usa en ningún componente).

**Condiciones para avanzar a Capa 2**:
1. Resolver la contaminación del feature flag en tests (mock o env isolation).
2. Arreglar el error TS en `BracketColumn.tsx:171` (`isFirst` prop inexistente).
3. Corregir los 2 imports rotos en `WorldCupBestThirdsSection.test.tsx`.
4. Confirmar que `npm test` y `tsc -b` corren limpio (o documentar las excepciones).

---

## Frente 1: Auditoría del Setup TypeScript + Vite

### 1.1 ¿Por qué `tsc --noEmit` dejó pasar el import roto?

**Respuesta corta**: NO la dejó pasar. El incidente original (`import from "./featureFlags"` en `useFeatureFlag.ts`) **sí habría sido detectado por `tsc -b`** si se hubiera corrido correctamente. El problema fue que el dev corrió `npx tsc --noEmit` (sin `-b`), lo cual usa `tsconfig.json` raíz que tiene `"files": []` y `"references": [...]` — un project-references setup. Sin `-b`, `tsc` no procesa los proyectos referenciados y effectively no chequea nada.

**Evidencia**:
- `tsconfig.json` raíz: `"files": []` → no compila nada por sí solo.
- El script `build` usa `tsc -b` (correcto), pero el dev corrió `tsc --noEmit` manualmente (incorrecto).
- `tsc -b --noEmit` habría detectado el import roto inmediatamente.

### 1.2 Flags de `strict` family ausentes

| Flag | Estado | Impacto |
|------|--------|---------|
| `strict` | **AUSENTE** | Habilita todo el paquete de chequeo estricto. Su ausencia es el gap más grande. |
| `noImplicitAny` | **AUSENTE** (implícito sin `strict`) | Permite variables sin tipo que caen a `any` silencioso. |
| `noImplicitReturns` | **AUSENTE** | No detecta funciones que retornan `undefined` en algunos paths. |
| `noUncheckedIndexedAccess` | **AUSENTE** | Acceso a arrays/objects por índice no marca `undefined` posible. |
| `strictNullChecks` | **AUSENTE** (implícito sin `strict`) | `null` y `undefined` no se consideran incompatibles con otros tipos. |
| `strictFunctionTypes` | **AUSENTE** (implícito sin `strict`) | Parámetros de función no se chequean contravariantemente. |
| `noFallthroughCasesInSwitch` | PRESENTE | OK. |
| `noUnusedLocals` | PRESENTE | OK. |
| `noUnusedParameters` | PRESENTE | OK. |

**Nota**: La ausencia de `strict` NO causó el incidente del import roto (eso fue un error de path), pero sí permite que otros bugs de tipo pasen desapercibidos.

### 1.3 Errores de compilación actuales (`tsc -b`)

**25 errores detectados**, de los cuales los más relevantes son:

| Archivo | Error | Severidad |
|---------|-------|-----------|
| `BracketColumn.tsx:171` | `isFirst` no existe en `BracketRoundProps` | **ALTA** — bug de la Capa 1 |
| `BracketMatchCard.tsx:358` | `bracketPosition` declarada pero no leída (TS6133) | Media |
| `KnockoutBracket.tsx:63` | `position` declarada pero no leída (TS6133) | Baja (deprecated) |
| `useCompetitions.ts:81` | `is_friendly` no existe en `Competition` | **ALTA** — bug de datos |
| `api/tournaments.ts:37` | `null` no asignable a `CompetitionFormat \| undefined` | Media |
| `CompetitionSelector.test.tsx` (×4) | `is_friendly` no existe en `Competition` | Media |
| `WorldCupBestThirdsSection.test.tsx` (×2) | Cannot find module `../../lib/types` | **ALTA** — import roto |
| `bracketEngine.test.ts` (×2) | Unused var + null assign | Baja |
| `hotfixT0.test.ts` | Unused `makeSFMatch` | Baja |
| `worldCupGroups.test.ts` (×8) | Type mismatches en test helpers | Media |

### 1.4 CI/CD y gates de compilación

| Gate | Estado | Detalle |
|------|--------|---------|
| `.github/workflows/` | **NO EXISTE** | No hay CI/CD configurado |
| `.husky/` (pre-commit) | **NO EXISTE** | No hay hooks de pre-commit |
| `npm run build` | `tsc -b && vite build` | Correcto, pero solo se corre manualmente |
| `npm test` | `vitest run` | Correcto, pero solo se corre manualmente |

### 1.5 `tsconfig.app.json` recomendado (propuesta, NO aplicar)

```jsonc
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "WebWorker"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* STRICT — agregar todo el paquete */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["src/service-worker.ts"]
}
```

**Advertencia**: Activar `strict` va a generar **cientos de errores** en el código existente. Se recomienda hacerlo de forma incremental: primero `noImplicitAny`, luego `strictNullChecks`, etc.

### 1.6 Recomendaciones

1. **Gate mínimo obligatorio**: `tsc -b --noEmit` + `vitest run` + `vite build` — los tres deben pasar antes de merge.
2. **Agregar pre-commit hook** con `lint-staged` + `tsc -b --noEmit` (al menos).
3. **Configurar CI** (GitHub Actions) con los 3 gates en cada push/PR.
4. **Documentar** que el comando correcto es `tsc -b` (no `tsc --noEmit` solo).
5. **No activar `strict` de golpe** — hacer un plan de migración incremental.

### 1.7 Conclusión sobre el incidente

La hipótesis del contexto ("`tsc --noEmit` no detecta imports rotos") es **FALSA**. `tsc -b --noEmit` sí los detecta. El problema fue que el dev corrió `tsc --noEmit` sin `-b`, lo cual no procesa los project references y por lo tanto no chequea nada. El gate real debería ser `tsc -b --noEmit` (o simplemente `tsc -b` que ya incluye `noEmit: true` en el tsconfig).

---

## Frente 2: Búsqueda Exhaustiva de Imports Potencialmente Rotos

### 2.1 Metodología

Se recorrieron todos los archivos `.ts` y `.tsx` en `src/`, extrayendo cada import relativo (`./X` o `../X`) y verificando que el archivo destino exista con alguna de las extensiones válidas (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.ts`, etc.).

### 2.2 Imports rotos encontrados

| # | Archivo | Línea | Import | Severidad | Estado |
|---|---------|-------|--------|-----------|--------|
| 1 | `src/__tests__/WorldCupBestThirdsSection.test.tsx` | 14 | `from "../../lib/types"` | **CRÍTICA** | Roto — el path correcto es `../lib/types` |
| 2 | `src/__tests__/WorldCupBestThirdsSection.test.tsx` | 15 | `from "../../lib/worldCupGroups"` | **CRÍTICA** | Roto — el path correcto es `../lib/worldCupGroups` |

**Causa**: El archivo está en `src/__tests__/` (1 nivel de profundidad desde `src/`), pero usa `../../` (2 niveles), lo cual apunta fuera de `src/`. `tsc -b` lo confirma con error TS2307.

**Impacto**: Este archivo de test NO compila y probablemente NO corre (o corre con errores de import). Los 4 tests que contiene pueden estar fallando silenciosamente o skippeándose.

### 2.3 Imports sospechosos (no rotos pero frágiles)

No se encontraron imports adicionales que apunten a archivos inexistentes. El codebase tiene ~500+ imports relativos y todos resuelven correctamente (excepto los 2 de arriba).

### 2.4 Recomendación

- **Fix inmediato**: Cambiar `../../lib/types` → `../lib/types` y `../../lib/worldCupGroups` → `../lib/worldCupGroups` en `WorldCupBestThirdsSection.test.tsx`.
- **Prevención**: Un pre-commit hook con `tsc -b --noEmit` habría detectado esto antes de commitear.

---

## Frente 3: Validación End-to-End de la Capa 1

### 3.1 Checklist de validación

| Punto | Estado | Detalle |
|-------|--------|---------|
| **Feature flag** | OK | `useFeatureFlag("BRACKET_V2")` se llama correctamente en `BracketHybrid` y `BracketTree`. La delegación funciona. |
| **URL sync (lectura)** | OK | `searchParams.get("view")` y `searchParams.get("round")` leen correctamente. |
| **URL sync (escritura)** | OK | `setSearchParams(next, { replace: true })` actualiza sin contaminar el historial. |
| **Validación de round** | OK | `isValidRound()` usa `value in ROUND_CATALOG` — valores inválidos caen a `"R32"` default. |
| **Race conditions URL** | OK | `useCallback` con deps `[searchParams, setSearchParams]` es correcto. No hay race conditions porque React serializa los state updates. |
| **SSR safety** | OK | No hay acceso a `window` sin guard. `usePrefersReducedMotion` tiene `typeof window === "undefined"` check. El proyecto usa Vite (SPA), no hay SSR real. |
| **Accesibilidad — aria-label** | OK | `<section aria-label="Bracket V2 (capa 1 — shell)">`, `ViewToggle` tiene `role="group" aria-label="Modo de vista del bracket"`. |
| **Accesibilidad — aria-pressed** | OK | Todos los botones de ronda y view toggle tienen `aria-pressed={isActive}`. |
| **Accesibilidad — tap targets** | PARCIAL | `min-h-[36px]` cumple el mínimo de WCAG AA (24px) pero NO el AAA (44px). Los botones de ronda tienen `px-2.5 py-1` que puede ser < 44px de ancho en textos cortos ("F"). |
| **Reduced motion** | OK | `motion-reduce:transition-none` en todos los botones con transiciones. |
| **Tipografía** | OK | Usa `font-headline-md`, `font-label-caps`, `font-body-md`, `font-mono` — todos del design system. |
| **Colores** | OK | Usa tokens semánticos: `text-primary`, `text-white`, `text-on-primary`, `text-on-surface-variant`, `border-primary/40`, `bg-surface-container/40`, etc. Sin colores hardcodeados. |
| **Memory leaks** | OK | `useFeatureFlag` limpia `storage` y `focus` listeners. `usePrefersReducedMotion` limpia `change` listener. |
| **TypeScript estricto** | OK | Props tipadas, `RoundAbbreviation` type-safe, `isValidRound` es type guard. |

### 3.2 Issues concretos a resolver antes de Capa 2

#### Issue #1 — CRÍTICO: `.env.local` contamina los tests (14 tests rotos)

**Archivo**: `.env.local:13`  
**Problema**: `VITE_BRACKET_V2=true` hace que `isFeatureEnabled("BRACKET_V2")` retorne `true` durante los tests. Esto causa que `BracketTree` delegue a `BracketHybrid` (placeholder) en vez de `BracketQuadro`, rompiendo todos los tests que buscan elementos DOM de `BracketQuadro`.

**Tests afectados**:
- `BracketTree.test.tsx` — **8/8 tests fallan** (todos)
- `PositionsView.test.tsx` — **3 tests fallan** (los que renderizan la vista LLAVES)
- `hotfixT0.test.ts` — **2 tests fallan** (feature flag defaults)
- `worldCupGroups.test.ts` — **1 test falla** (clearFeatureFlag reset)

**Total: 14 tests rotos por esta causa.**

**Fix recomendado** (elegir uno):
- **Opción A** (preferida): Los tests de `BracketTree` deben mockear `useFeatureFlag` para forzar `BRACKET_V2=false` y así testear la path legacy. Agregar un `describe` separado para la path V2.
- **Opción B**: Crear `.env.test` con `VITE_BRACKET_V2=false` y configurar Vitest para usarlo.
- **Opción C**: Los tests deben limpiar `localStorage` Y mockear `import.meta.env.VITE_BRACKET_V2` en el `beforeEach`.

#### Issue #2 — MEDIA: `BracketColumn.tsx:171` pasa prop inexistente `isFirst`

**Archivo**: `src/components/tournament/BracketColumn.tsx:171`  
**Error TS**: `Property 'isFirst' does not exist on type 'IntrinsicAttributes & BracketRoundProps'`  
**Problema**: Se pasa `isFirst={true}` a `<BracketRound>` pero `BracketRoundProps` no tiene esa propiedad. Probablemente es un remanente de un refactor.  
**Fix**: Eliminar `isFirst={true}` de la llamada, o agregar `isFirst?: boolean` a `BracketRoundProps` si es necesario.

#### Issue #3 — BAJA: `usePrefersReducedMotion` es dead code

**Archivo**: `src/hooks/usePrefersReducedMotion.ts`  
**Problema**: El hook standalone no se importa en ningún componente. `BracketQuadro.tsx` tiene su propia implementación inline (línea 177-190) que es funcionalmente idéntica.  
**Fix**: En Capa 2, cuando `BracketHybrid` necesite reduced motion detection, importar el hook standalone. Considerar refactorizar `BracketQuadro` para usar el hook compartido y eliminar la duplicación.

### 3.3 Observaciones menores

- **`aria-roledescription="bracket"`** en el `<section>`: no es un rol ARIA estándar. Es válido como `roledescription` pero los screen readers pueden ignorarlo. No es un bug, pero es worth noting.
- **`active:scale-[0.96]`** en botones: es un efecto visual que no respeta `motion-reduce`. Debería agregarse `motion-reduce:active:scale-100` o similar.
- **El `<dl>` de debug cells** usa `<dt>` y `<dd>` correctamente (semántica HTML), lo cual es bueno para accesibilidad.

---

## Frente 4: Plan de Testing Priorizado

### 4.1 Convención del proyecto

Los tests van en `src/__tests__/` (carpeta centralizada), NO co-located. Hay 37 archivos de test en ese directorio. Framework: **Vitest** + `@testing-library/react` + `jsdom`. Setup global en `src/__tests__/setup.ts`.

### 4.2 Tests P0 — Críticos (antes de Capa 2)

Estos tests deben existir y pasar para considerar la Capa 1 completa.

| # | Archivo | Test | Prioridad |
|---|---------|------|-----------|
| 1 | `BracketTree.test.tsx` | **Fix existing**: mockear `useFeatureFlag("BRACKET_V2")` → `false` para que los 8 tests existentes sigan testeando la path legacy (`BracketQuadro`). | P0 |
| 2 | `BracketHybrid.test.tsx` (nuevo) | Con `BRACKET_V2=true`, renderiza el placeholder con los debug cells correctos (view, round, rounds, champion). | P0 |
| 3 | `BracketHybrid.test.tsx` (nuevo) | Con `BRACKET_V2=false`, retorna `null` (no renderiza nada). | P0 |
| 4 | `BracketHybrid.test.tsx` (nuevo) | `?round=invalid` cae al default `R32`. | P0 |
| 5 | `featureFlags.test.ts` (nuevo o extender `hotfixT0`) | Los tests de feature flags deben aislar `import.meta.env` — mockear `VITE_BRACKET_V2` para que no contamine desde `.env.local`. | P0 |

### 4.3 Tests P1 — Importantes (antes de Capa 3)

| # | Archivo | Test | Prioridad |
|---|---------|------|-----------|
| 6 | `BracketHybrid.test.tsx` | La URL sync actualiza `?view=detail` al clickear "Detalle" y elimina `?view` al clickear "Global". | P1 |
| 7 | `BracketHybrid.test.tsx` | La URL sync actualiza `?round=QF` al clickear el chip QF. | P1 |
| 8 | `BracketHybrid.test.tsx` | Los chips de ronda tienen `aria-pressed` correcto (activo en la ronda seleccionada, inactivo en las demás). | P1 |
| 9 | `BracketHybrid.test.tsx` | El toggle de vista tiene `role="group"` y `aria-label`. | P1 |
| 10 | `useFeatureFlag.test.ts` (nuevo) | Lee el flag desde localStorage si está (override manual). | P1 |
| 11 | `useFeatureFlag.test.ts` (nuevo) | Lee del env si no hay localStorage. | P1 |
| 12 | `useFeatureFlag.test.ts` (nuevo) | Usa el default si no hay nada. | P1 |
| 13 | `useFeatureFlag.test.ts` (nuevo) | El listener de `storage` re-renderiza cuando cambia el flag en otra tab. | P1 |

### 4.4 Tests P2 — Nice-to-have (antes de Capa 4)

| # | Archivo | Test | Prioridad |
|---|---------|------|-----------|
| 14 | `usePrefersReducedMotion.test.ts` (nuevo) | En SSR (sin `window`) retorna `false`. | P2 |
| 15 | `usePrefersReducedMotion.test.ts` (nuevo) | En cliente, lee la media query correctamente (`matches: true` → retorna `true`). | P2 |
| 16 | `usePrefersReducedMotion.test.ts` (nuevo) | Cuando cambia la preferencia (evento `change`), re-renderiza con el nuevo valor. | P2 |
| 17 | `useFeatureFlag.test.ts` | El listener de `focus` re-evalúa el flag cuando la ventana recupera foco. | P2 |
| 18 | `BracketHybrid.test.tsx` | Navegación por teclado: Tab cicla entre chips de ronda y toggle de vista. | P2 |

### 4.5 Tests existentes que necesitan fix inmediato

| Archivo | Problema | Fix |
|---------|----------|-----|
| `BracketTree.test.tsx` | 8/8 fallan por `VITE_BRACKET_V2=true` en env | Mockear `useFeatureFlag` para forzar `false` |
| `PositionsView.test.tsx` | 3 tests fallan por la misma causa | Idem |
| `hotfixT0.test.ts` | 2 tests de feature flags fallan | Limpiar `import.meta.env` en `beforeEach` |
| `worldCupGroups.test.ts` | 1 test de feature flag falla | Idem |
| `WorldCupBestThirdsSection.test.tsx` | 2 imports rotos (`../../lib/` → `../lib/`) | Corregir paths |

---

## Bonus: Verificación de Consumidores de BracketTree

### Consumidores verificados

| Consumidor | Archivo | Firma usada | Compatible |
|------------|---------|-------------|------------|
| `Tournament.tsx` | `src/routes/Tournament.tsx:631` | `<BracketTree bracket={...} onOpenDetails={...} interactive />` | **SI** — la API pública no cambió |
| `PositionsView.tsx` | `src/components/tournament/PositionsView.tsx:156` | `<BracketTree bracket={bracket} />` | **SI** |
| `WorldCupKnockoutSection.tsx` | `src/components/ligas/WorldCupKnockoutSection.tsx:48` | `<BracketTree bracket={...} onOpenDetails={...} />` | **SI** |

Los 3 consumidores usan la interfaz `BracketTreeProps` invariante (`bracket`, `onOpenDetails?`, `interactive?`). El wrapper `BracketTree` mantiene el mismo named export y la misma firma. **No hay breaking changes en la API pública.**

### Referencias hardcodeadas a "Bracket" que necesitarán actualización

| Ubicación | Texto | Acción futura |
|-----------|-------|---------------|
| `BracketTree.test.tsx:163` | `describe("BracketTree (Sprint 5D: wrapper de BracketQuadro)")` | Actualizar a "wrapper de BracketHybrid/BracketQuadro" |
| `BracketTree.tsx:2` | `BracketTree — Wrapper retrocompatible para BracketQuadro` | Actualizar docstring para mencionar BracketHybrid |
| `KnockoutBracket.tsx:4` | `@deprecated Sprint 4: Reemplazado por BracketTree` | OK, no necesita cambio |
| `BracketMatchCard.tsx:479` | `React.memo: evita re-renders innecesarios cuando el padre (BracketTree)` | OK, sigue siendo cierto |

---

## Veredicto Final

### ¿El dev puede arrancar la Capa 2 (`BracketGlobalView`)?

**NO todavía.** Debe cumplir estas condiciones antes:

### Condiciones bloqueantes (P0)

1. **Arreglar la contaminación de tests por feature flag**: Los 14 tests rotos deben volver a pasar. La solución recomendada es mockear `useFeatureFlag` en los tests de `BracketTree` y `PositionsView` para forzar `BRACKET_V2=false`, y agregar un `describe` separado para la path V2.

2. **Corregir `BracketColumn.tsx:171`**: Eliminar la prop `isFirst={true}` que no existe en `BracketRoundProps` (error TS2322).

3. **Corregir imports rotos en `WorldCupBestThirdsSection.test.tsx`**: Cambiar `../../lib/` → `../lib/`.

### Condiciones recomendadas (P1, no bloqueantes pero deseables)

4. **Configurar pre-commit hook** con `tsc -b --noEmit` para prevenir futuros imports rotos.
5. **Escribir los tests P0** de `BracketHybrid` (4 tests propuestos arriba).
6. **Documentar** que el comando correcto de typecheck es `tsc -b` (no `tsc --noEmit` solo).

### Condiciones diferibles (P2, pueden hacerse en paralelo con Capa 2)

7. Consolidar `usePrefersReducedMotion` (eliminar duplicación con `BracketQuadro`).
8. Escribir tests P1 de URL sync y accesibilidad.
9. Plan de migración incremental a `strict: true`.

---

*Fin de la auditoría. Generada el 2026-06-25 por @qa-engineer.*
