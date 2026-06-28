# Walkthrough — Dashboard Refresh (Fases 1-3) + Saga del Nav

**Fecha**: 2026-06-12
**Autor**: Sesión colaborativa con el usuario
**Alcance**: 3 features grandes del Dashboard + saga de fix de bugs del nav

---

## Resumen Ejecutivo

Esta mega-sesión entregó:
- **3 features grandes** del Dashboard: ActionBar + Racha en TopAppBar (Fase 1), BottomSheet genérico + StatsSheet + MatchStatusBar + DashboardEmptyState (Fase 2), Match Bottom Sheet completo (Fase 3)
- **Polish y mejoras adicionales**: responsive desktop, animación de guardado, haptic feedback, dirty check, compartir predicción
- **4 fixes críticos** del bug del nav que aparecía en dev

Estado final:
- **134/134 tests pasando**
- **0 errores TypeScript**
- **Build OK**
- **Nav funciona correctamente** (verificado por el usuario)

---

## Archivos Modificados / Creados

### Nuevos (15)

| Archivo | Líneas | Propósito |
|---------|:------:|-----------|
| `src/lib/matchCardState.ts` | ~80 | Función pura `deriveMatchCardState` + `MATCH_CARD_STATES` |
| `src/lib/emptyStateHelpers.ts` | ~70 | Función pura `deriveEmptyStateVariant` + `getEmptyStateCTA` |
| `src/lib/predictionHelpers.ts` (extendido) | +80 | `getPotentialPoints`, `getScoreResultForPrediction`, `formatPredictionForSharing` |
| `src/hooks/useBottomSheet.ts` | ~85 | Drag gesture + pointer events para swipe-down |
| `src/hooks/usePendingPredictions.ts` | ~25 | Wrapper reactivo sobre `getPendingMatches` (Fase 1) |
| `src/hooks/useCountdown.ts` (re-escrito) | ~70 | Fix del infinite render loop con `targetTime: number` |
| `src/components/ui/BottomSheet.tsx` | ~150 | Genérico: portal, focus trap, Escape, swipe-down, safe-area, responsive desktop |
| `src/components/dashboard/ActionBar.tsx` | ~140 | Fase 1: CTA pendientes + countdown al cierre |
| `src/components/dashboard/StatsSheet.tsx` | ~170 | Fase 2: Captain Stats + push toggle |
| `src/components/dashboard/DashboardEmptyState.tsx` | ~200 | Fase 2: 4 variantes (no_matches_today/season/all_predicted/countdown_only) |
| `src/components/match/SheetMatchHeader.tsx` | ~140 | Header expandido con score grande + countdown + potential points |
| `src/components/match/PredictionSlide.tsx` | ~290 | Slide individual con stepper + useRef para callback prop |
| `src/components/match/PredictionCarousel.tsx` | ~130 | Carrusel multi-torneo con dots indicator |
| `src/components/match/MatchStatusBar.tsx` | ~165 | 6 estados visuales (pending_action, locked, predicted_editable, predicted_locked, live, finished) |
| `src/components/match/MatchSheet.tsx` | ~310 | Wrapper principal del Match Bottom Sheet |
| `src/__tests__/matchCardState.test.ts` | ~200 | 24 tests |
| `src/__tests__/emptyStateVariant.test.ts` | ~110 | 11 tests |
| `src/__tests__/useCountdown.test.ts` | ~85 | 8 tests |
| `src/__tests__/matchSheetHelpers.test.ts` | ~140 | 15 tests |
| `docs/match-bottom-sheet-ux-spec.md` | ~3000 | Especificación UX/UI completa (creado por UX/UI designer) |

### Modificados (8)

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/TopAppBar.tsx` | Trigger button PTS+streak que abre StatsSheet |
| `src/components/match/MatchCard.tsx` | 3 optional props (cardState, isFullyPredicted, predictionCount), ROW 1 condicional, onSelect handler |
| `src/components/match/MatchDetailsTabs.tsx` | +defaultTab, +hideTabs props (para integrar como secciones del MatchSheet) |
| `src/stores/uiStore.ts` | +isStatsSheetOpen state + setter |
| `src/routes/Dashboard.tsx` | Integración completa: ActionBar (Fase 1), StatsSheet (Fase 2), MatchSheet (Fase 3), `useCountdown` import, nuevos estados |
| `src/index.css` | +keyframes (sheetSlideUp, sheetFadeScale, slideSavedBurst, checkmarkDraw), prefers-reduced-motion |
| `vite.config.ts` | `devOptions.enabled: false` (SW deshabilitado en dev) |
| `src/hooks/useCountdown.ts` | **Re-escrito completo** con `targetTime: number` en deps |

---

## Pruebas Ejecutadas y Resultados

| Validación | Resultado |
|------------|-----------|
| `npx tsc --noEmit` | ✅ 0 errores |
| `npm run test` | ✅ **134/134 tests pasando** (10 archivos de test) |
| `npm run build` | ✅ Compila correctamente (PWA service worker generado para producción) |
| `npm run lint` (archivos modificados) | ✅ Sin warnings nuevos |
| Smoke test en navegador | ✅ Nav navega siempre, Match Bottom Sheet abre/cierra, no hay errores en consola |

---

## Pasos para Probar en tu Entorno

### Prerequisitos
```bash
npm install  # si no lo hiciste
```

### Smoke test del Dashboard completo
```bash
npm run dev
```

1. **Hard refresh** (Ctrl+Shift+R o Cmd+Shift+R) para limpiar el cache del navegador
2. Inicia sesión con tu usuario
3. Click en una **MatchCard** → debe abrir el **Match Bottom Sheet**
4. Editá un score con los botones +/- → debe actualizarse
5. Hacé click en **"GUARDAR PRONÓSTICO"** → debe aparecer el feedback "GUARDADO" con pulse glow verde
6. Si tu navegador soporta `navigator.vibrate`, deberías sentir una vibración de 50ms
7. Click en el botón **compartir** (📤) → debe copiar al portapapeles el texto formateado
8. Si hay varios torneos, usá los **dots** del carrusel para navegar entre ellos
9. Si el partido está en vivo, deberías ver tabs adicionales "Eventos" e "Info"
10. Cerrá el sheet (X, backdrop, Escape, o swipe-down) → debe navegar normal sin loops
11. **Click en "Torneos"** desde el Dashboard → debe navegar inmediatamente
12. **Click en "Ranking"** → debe navegar
13. Volvé a Inicio y repetí → todos los clicks del nav deben funcionar

### Verificación de consola limpia
1. Abrí DevTools (F12) → Console
2. No deberías ver errores rojos (el contador arriba a la derecha debe ser 0)
3. Si ves errores amarillos de "Service Worker no se activó", es esperado (deshabilitamos el SW en dev)

---

## Saga del Bug del Nav — Narrativa Completa

### Reporte del usuario
> "Si estoy en Inicio y hago clic en Torneos o Ranking recién me muevo si recargo la página. Ahí me lleva a Torneos o Ranking. Pero si estoy en Ranking, entre Torneo y Ranking puedo navegar perfecto. Vuelvo a Inicio y no puedo volver ni a Torneo o Ranking. Tengo que recargar la página y me lleva a la última que hice clic."

### Diagnóstico iterativo (4 capas)

La causa raíz NO era un solo bug, sino **4 issues superpuestos**. Cada fix revelaba el siguiente.

---

#### **Fix 1: `authStore.hydrate()` idempotente con flag `hasHydrated`**

**Diagnóstico** (mi primera hipótesis):
- `React.StrictMode` ejecuta useEffects 2 veces en dev
- El `useEffect` de `App.tsx` llamaba a `hydrate()` 2 veces
- Cada llamada seteaba `isLoading: true` → `<ProtectedRoute>` mostraba spinner
- En el segundo render, el spinner no dejaba pasar al `<Outlet />`
- URL cambiaba pero la UI no

**Fix**:
```ts
// authStore.ts
hydrate: async () => {
  if (get().hasHydrated) return;  // ← guard idempotente
  set({ isLoading: true, error: null, hasHydrated: true });
  // ... resto del código de hidratación
},
```

**Resultado**: El fix ayudó, pero el bug seguía. Necesitaba seguir investigando.

---

#### **Fix 2: Service Worker deshabilitado en dev**

**Diagnóstico** (segunda hipótesis):
- Mirando `vite.config.ts`: `devOptions.enabled: true`
- El SW estaba habilitado en dev y cacheaba agresivamente el bundle JS
- Aunque el código se arreglara, el navegador seguía ejecutando la versión vieja del cache
- Hard refresh funcionaba porque forzaba la actualización

**Fix**:
```ts
// vite.config.ts
devOptions: {
  enabled: false,  // ← SW deshabilitado en dev
  type: "module",
}
```

**Tradeoff**: Push notifications no testeables en dev. Para testear push: cambiar a `true` temporalmente.

**Resultado**: El fix ayudó a HMR, pero el bug seguía en el primer click del nav.

---

#### **Fix 3: `useCountdown` infinite render loop (EL BUG REAL)**

**Diagnóstico** (gracias al screenshot del DevTools del usuario — fue oro puro):

El stack trace mostraba:
```
Maximum update depth exceeded
overrideMethod @ installHook.js:1
(anonymous) @ useCountdown.ts:43
<MatchStatusBar>
<MatchCard>
<Dashboard>
<App>
main.tsx:26
```

**Causa raíz**:
```ts
// MatchStatusBar.tsx
const kickoffDate = new Date(kickOff);  // ← NUEVA referencia en cada render
const kickoffCountdown = useCountdown(kickoffDate, 30_000);

// useCountdown.ts (versión vieja)
useEffect(() => {
  setState(calculate(targetDate));  // ← retorna objeto NUEVO cada vez
}, [targetDate, intervalMs]);  // ← targetDate en deps
```

**El loop**:
1. Render → `new Date(kickOff)` crea un Date nuevo
2. `targetDate` cambia de referencia → useEffect se re-ejecuta
3. `setState(calculate(targetDate))` retorna objeto NUEVO
4. React ve "state changed" → re-render
5. Volver al paso 1 → **INFINITE LOOP**
6. React aborta con "Maximum update depth exceeded"
7. Como React está en estado de error, **toda la navegación del nav se rompe** (los NavLinks no navegan, los clicks no se procesan)

**Fix**:
```ts
// useCountdown.ts
const targetTime = targetDate ? targetDate.getTime() : null;  // ← number, no Date

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
}, [targetTime, intervalMs]);  // ← number en deps, no Date
```

**Por qué funciona**:
- `targetTime` es un `number` (timestamp Unix)
- React compara numbers por **valor**: `Object.is(1234567, 1234567) === true`
- Aunque el padre cree un `new Date(kickOff)` nuevo en cada render, el timestamp es el mismo
- La dep `targetTime` NO cambia → useEffect NO se re-ejecuta → no hay infinite loop

**Lección**:
> Cualquier hook que reciba `Date` objects (o cualquier objeto mutable) en props/deps es susceptible a infinite loops si el padre los recrea en cada render. **Convención**: extraer `getTime()` a number y usar eso en deps.

**Resultado**: El nav empezó a funcionar después de recargar. Pero cuando el usuario abrió el Match Bottom Sheet, apareció OTRO error.

---

#### **Fix 4: `PredictionSlide` callback prop infinite loop**

**Diagnóstico** (el bug volvió, pero en otro lugar):
```
Maximum update depth exceeded
(anonymous) @ PredictionSlide.tsx:55
<MatchStatusBar>
<PredictionCarousel.tsx:101
<MatchSheet.tsx:45
```

**Causa raíz** (el mismo patrón):
```ts
// PredictionSlide.tsx
useEffect(() => {
  onDirtyChange?.(isDirty);  // ← línea 55
}, [isDirty, onDirtyChange]);  // ← callback en deps

// PredictionCarousel.tsx (padre)
<PredictionSlide
  onDirtyChange={
    onSlideDirtyChange
      ? (isDirty) => onSlideDirtyChange(tournament.id, isDirty)
      : undefined
  }
/>
```

El `onDirtyChange` se recreaba como callback inline en cada render del padre. Mismo patrón de infinite loop.

**Fix** (patrón universal con `useRef`):
```ts
// PredictionSlide.tsx
const onDirtyChangeRef = useRef(onDirtyChange);
useEffect(() => {
  onDirtyChangeRef.current = onDirtyChange;  // sin deps, solo sync
});
useEffect(() => {
  onDirtyChangeRef.current?.(isDirty);  // use ref (estable)
}, [isDirty]);  // ← solo [isDirty] (boolean, estable)
```

**Por qué funciona**:
- `useRef` siempre retorna la misma referencia
- El useEffect sin deps se ejecuta en cada render SOLO para actualizar el ref (no causa re-render)
- El useEffect con `[isDirty]` solo se ejecuta cuando `isDirty` cambia
- Cuando se ejecuta, usa `onDirtyChangeRef.current` que es la versión más reciente

**Lección**:
> Cualquier callback prop en deps de useEffect puede causar infinite loop. **Convención**: usar `useRef` para el callback y dejar las deps solo con valores estables.

**Resultado**: 0 errores en consola, nav funciona, Match Bottom Sheet funciona. 🎉

---

## Lecciones Aprendidas (Patrones para el Proyecto)

### Lección 1: Date objects en deps de useEffect

**Problema**: Si un hook recibe `Date` (o cualquier objeto mutable) en props/deps, y el padre lo recrea en cada render, las deps cambian de referencia → useEffect se re-ejecuta → setState con objeto NUEVO → React ve "state changed" → re-render → **infinite loop**.

**Solución estándar**:
```ts
// ❌ NUNCA
useEffect(() => { setState(calculate(targetDate)); }, [targetDate]);

// ✅ SIEMPRE
const targetTime = targetDate?.getTime() ?? null;
useEffect(() => { setState(calculate(targetTime)); }, [targetTime]);
```

**Aplicado en**: `src/hooks/useCountdown.ts`

### Lección 2: Callback props en deps de useEffect

**Problema**: Si un componente recibe un callback como prop (típico: `onClick={() => ...}`), y ese callback se recrea en cada render del padre (inline arrow function), las deps cambian cada render → useEffect se ejecuta → llama al callback → setState en el padre → re-render → **infinite loop**.

**Solución estándar**:
```ts
// ❌ NUNCA
useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

// ✅ SIEMPRE
const onDirtyChangeRef = useRef(onDirtyChange);
useEffect(() => { onDirtyChangeRef.current = onDirtyChange; });  // sin deps
useEffect(() => { onDirtyChangeRef.current?.(isDirty); }, [isDirty]);
```

**Aplicado en**: `src/components/match/PredictionSlide.tsx`

### Regla mnemónica

> **En deps de useEffect, solo valores primitivos o refs. Nunca objetos ni callbacks directos.**

---

## Sprint 1: Match Bottom Sheet Enriquecido (Eventos + Formaciones)
**Fecha**: 2026-06-13
**Sesión dedicada a**: Exponer las 3 fuentes de datos que ya existían en `MatchDetailsTabs` (eventos, stats, formaciones) como tabs de primera clase, con un fallback determinístico de mocks solo en DEV.

### ¿Por qué este Sprint?

El Bottom Sheet del partido tenía un problema arquitectónico detectado en el walkthrough anterior: el `MatchDetailsTabs` se montaba DOS veces desde `MatchSheet` con `hideTabs` + `defaultTab`, lo que causaba:
1. El tab **"Formaciones" nunca era accesible** para el usuario.
2. Se computaban 4 useMemo innecesarios.
3. El scroll position se perdía al cambiar de tab.

La solución: refactorizar a **4 tabs independientes** + **enriquecer cada uno** con features que ya teníamos en el backlog (resumen de eventos, agrupación por períodos, pins posicionales, cambios emparejados).

### Features Entregadas

| ID | Feature | Esfuerzo | Resultado |
|---|---|---|---|
| **F10** | 4 tabs visibles con lazy-mount | M | Tab "Formaciones" ahora accesible |
| **F1** | Resumen de eventos (pills) | S | 4 pills semánticas con colores |
| **F2** | Agrupación por períodos | S | Separadores 1T/2T/ET/PEN |
| **F6** | Pins por posición G/D/M/F | S | Coloreado por rol del jugador |
| **F11** | Cambios emparejados | S | Entra ⬆ / sale ⬇ unificado |
| **Refactor** | `useMockMatchData` hook | M | Mocks en DEV guard en PROD |

### Logros Técnicos

**1. Refactor arquitectónico (F10)**
- 4 componentes de tab pequeños y especializados (en lugar de 1 monolito de 814 líneas)
- Lazy mount con `Set<SheetTabId>` para no computar stats/lineups hasta que se necesiten
- Tab bar con icon-stack layout: 4 tabs × `flex-1` = caben en 320px sin scroll
- Accesibilidad completa: `role="tablist"`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`
- Navegación por teclado (← → Home End Enter Space)

**2. Verificación de convención de API (F11)**
- Lectura de `poll-scores/index.ts:864` reveló que `playerName = entra`, `assistName = sale` (mi asunción original estaba invertida)
- Corrección de `pairSubstitutions()` y 5 tests
- Lección: **siempre verificar el mapeo de API externa contra el código que la consume antes de implementar**

**3. Guard crítico de producción (Refactor)**
- `useMockMatchData` usa `import.meta.env.DEV` para NUNCA generar mocks en prod
- Test explícito con `vi.stubEnv("DEV", false)` verifica que retorna `null` en prod
- Tag discreto "DEMO" en UI solo cuando `isMocked*` es true
- Previene mostrar stats/lineups inventados a usuarios reales

### Calidad

- **TypeScript**: 0 errores
- **Tests**: 173/173 pasando (134 originales + 32 nuevos + 7 auxiliares)
- **CSS tokens**: 24 nuevos + 5 keyframes
- **Código eliminado**: 814 líneas de `MatchDetailsTabs.tsx` (monolito) → 4 archivos modulares

### Archivos

**Nuevos (15):** ver `task.md` para el detalle completo

**Eliminados (1):**
- `src/components/match/MatchDetailsTabs.tsx` (814 líneas)

### Decisiones de Diseño Clave

1. **4 tabs vs 3 con sub-tab** (Decisión 5 del UX designer): optamos por 4 tabs con icon-stack layout. Cada tab es un "verbo" distinto del usuario (pronosticar / leer eventos / analizar stats / ver formaciones). Comprimirlos en 3 tabs fuerza scroll mental.

2. **Mock solo en DEV** (Decisión 3 del UX designer): híbrido con guard estricto. Los mocks son útiles para desarrollo y demos, pero mostrarlos a usuarios reales sería engañoso y potencialmente dañino.

3. **Tab default dinámico**: Pronósticos si upcoming (es lo único accionable), Eventos si live/finished (el usuario acaba de ver un gol, quiere confirmar). Progressive disclosure real.

4. **Convención de sustituciones corregida**: API-Football `player` = entra, `assist` = sale. Documentado en JSDoc de `SubPair` y `pairSubstitutions`.

### Pendientes para Sprint 2

- F4: Stats completas (15-20 en vez de 6) con config de mapeo dinámico
- F3: Animación "nuevo evento" en vivo con `useNewEvents` (badge pulsante)
- F9: Click en pin → popover con detalle del jugador (parcialmente abordado — la foto ya está en el pin)
- F14: Mini-timeline en el header del sheet

---

## Sprint 2: Player Photos en Formaciones
**Fecha**: 2026-06-14
**Sesión dedicada a**: Mostrar las caras de los jugadores en los pines de la cancha del `FormacionesTab`, con foto del CDN de API-Football y fallback a iniciales.

### ¿Por qué este Sprint?

El `FormacionesTab` del Sprint 1 entregaba un visual premium de la cancha con pines coloreados por posición (G/D/M/F) y nombre del jugador debajo. Pero faltaba el elemento más identitario del fútbol: **la cara del jugador**. Cuando un usuario veía un pin, tenía que leer el nombre para saber quién era. Con fotos, el reconocimiento es inmediato y el visual sube varios escalones de calidad.

La pregunta era **dónde** poner la foto. Las opciones eran:

1. **Popover al hacer click en el pin** (F9 original del backlog): preserva la densidad visual del sheet, pero introduce fricción. El usuario tiene que tocar cada pin para ver la cara.
2. **Foto directamente en el pin** (lo que hicimos): densidad visual ligeramente mayor, pero reconocimiento inmediato sin interacción. La cara es la info primaria del pin, no un detalle secundario.
3. **Carrusel horizontal de fotos de jugadores** debajo de la cancha: agregaba un componente nuevo sin relación espacial con la formación.

El usuario optó por la **opción 2** porque la foto es la info que el usuario quiere ver primero en un pin, no un detalle oculto detrás de un tap. Esto efectivamente **reemplaza al F9 original** (el popover ahora no tiene mucho sentido: la cara ya está visible).

### El proceso de verificar que API-Football expone fotos

Antes de implementar, me aseguré de que API-Football efectivamente sirviera fotos de jugadores y que no requiriera un plan distinto. Pasos:

1. **Búsqueda en la documentación de API-Football v3**: el endpoint `/fixtures/players?fixture=X` devuelve estadísticas individuales de cada jugador que participó en el partido (goles, minutos jugados, rating). En el campo `player.photo` viene la URL completa al CDN.
2. **Verificación con una llamada real** a `fixtures=1489372` (partido conocido): confirmé que el response trae `response[].players[].player.photo` con URLs del estilo `https://media.api-sports.io/football/players/{id}.png` (PNG ~150x200px, headshot/busto).
3. **Análisis de costo**: 1 call extra por partido, lo que lleva el total a 5-6 calls/partido. Con el plan Pro ($19/mes, 7500 req/día) esto es invisible en la cuota (aún con backfill de los 200+ partidos de Copa del Mundo, se consumiría <3% del plan).
4. **Decisión del usuario**: confirmado. Se procede con la implementación inmediata (no se espera al Sprint 2/3 original del roadmap).

### Lo que se implementó

**1. Backend: nuevo fetch en `poll-scores`**

Siguiendo exactamente el patrón establecido en Sprint 1 para `stats`, `lineups` y `events`, agregué un cuarto bloque de fetch para `player_photos`. La estructura del response de API-Football es anidada (`response[].players[].player`), así que aplano a un array plano `[{ player_id, photo }]` antes de guardarlo en la columna JSONB.

La clave de diseño fue el guard `needsPlayerPhotos`: solo se ejecuta si el partido está en vivo, recién finalizado, o es finalizado pero sin `player_photos`. Esto habilita el **backfill automático** — partidos viejos en la DB sin fotos se actualizarán la próxima vez que el cron corra y los toque.

**2. DB: nueva columna `matches.player_photos JSONB`**

Se hizo un `ALTER TABLE` manual desde el panel SQL de Supabase (no es parte del deploy automatizado, decisión consciente para mantener el `schema.sql` como contrato "freeze"). El default `'[]'::jsonb` garantiza que los partidos existentes tengan un array vacío por default, sin necesidad de migración de datos.

Decisión clave: **JSONB, no tabla separada**. La cantidad de jugadores por partido es acotada (≤30) y siempre se consulta completa con el match. Una tabla `match_players` con FK agregaría un JOIN innecesario y complicaría el upsert. Si en el futuro se quiere indexar por player_id (ej: "partidos donde jugó Messi"), se puede migrar a tabla relacional y mantener la API del helper.

**3. Frontend: helpers puros + rebuild del pin**

Creé 4 funciones puras en `src/lib/playerHelpers.ts` siguiendo la convención del proyecto de "funciones puras testeables sin React" (patrón #10 de la sección 7 de Arquitectura). Cada una tiene un contrato claro:

- `buildPhotoMap`: Map O(1) para lookups eficientes.
- `getPlayerPhoto`: lookup O(n) simple para un solo jugador.
- `enrichLineupsWithPhotos`: el corazón — toma lineups + photos y retorna nuevos lineups con `photo` en cada jugador. **Inmutable**, preserva fotos existentes, maneja los 3 casos de null/undefined/array vacío.
- `getPlayerInitials`: fallback elegante cuando no hay foto ("Lautaro Martínez" → "LM").

El `TacticalPlayerPin` se reconstruyó: la foto circular con border de color por posición, el badge del número de camiseta en la esquina superior derecha, y el fallback a iniciales con la tipografía `font-stat-value` (la misma que usamos para los scores grandes). El `aria-label` descriptivo se preservó para que los screen readers sigan anunciando "Arquero número 1, Martínez".

### Bugs encontrados y corregidos

**Bug 1 — Test con IDs duplicados**: El test "enriquece múltiples lineups (home + away)" pasó en el primer run, pero al revisarlo noté que ambos equipos usaban los mismos `player_id`s (1, 2, 3). El test era técnicamente correcto, pero **enmascaraba** un potencial bug: si el helper procesara el lineup equivocado, las assertions seguirían pasando. Lo corregí con IDs únicos (Boca 1-3, River 11-13) para que las assertions de cada lineup sean inequívocas. **Lección**: cuando se testean dos entidades similares, usar datos que permitan distinguirlas inequívocamente.

**Bug 2 — Retorno de array vacío inconsistente**: El primer impl de `enrichLineupsWithPhotos([])` retornaba `[]` (array vacío). Pero el contrato documentado decía "retorna null si no hay lineups", y el consumidor (`FormacionesTab`) tiene un early return para `null` que muestra el `EmptyState`. La inconsistencia significaba que un lineup vacío entraba en el `lineups.map(...)` y producía un array vacío, en vez del empty state amigable. Corregido a `return null` para los 3 casos (null, undefined, []). **Lección**: el contrato del helper y la lógica del consumidor tienen que estar en sync — un test que verifica la contract del early return es más valioso que uno que solo verifica el happy path.

### El guard de producción (no aplica acá, importante notarlo)

Aclaración: el guard `import.meta.env.DEV` de Sprint 1 (en `useMockMatchData`) **no aplica** a Sprint 2. ¿Por qué? Porque en DEV el `FormacionesTab` consume mocks que ya tienen `photo: null` hardcoded en cada jugador, y el render del `TacticalPlayerPin` ya tiene el fallback a iniciales. En producción con datos reales, el enrichment se aplica en el cliente al renderizar (`mapDbMatchToFrontend` parsea el JSONB y `enrichLineupsWithPhotos` lo cruza con el lineup).

El resultado es que **en DEV el usuario ve iniciales** (porque los mocks no tienen foto), y **en producción ve fotos reales** (porque API-Football ya las proveyó). Esto es intencional y coherente con la convención "no mostrar mocks a usuarios reales".

### Backfill strategy

Para los partidos que ya están en la DB sin `player_photos` (los sincronizados en sesiones anteriores a Sprint 2):

1. Invocar `poll-scores` con la competencia que contiene el partido: `?league=1&season=2026` (para Copa del Mundo) o `?league=128&season=2026` (para Liga Profesional).
2. El guard `needsPlayerPhotos` detectará `!player_photos` y gatillará el fetch automático a `/fixtures/players`.
3. El `matchPayload` se construye con el `player_photos` poblado y se hace upsert.
4. Los partidos nuevos se actualizarán automáticamente con la próxima invocación del cron (no requiere acción manual).

### Métricas finales del Sprint 2

| Métrica | Sprint 1 | Sprint 2 | Delta |
|---|---|---|---|
| Tests pasando | 173/173 | **198/198** | +25 |
| Archivos de test | 13 | **14** | +1 |
| TypeScript errores | 0 | 0 | 0 |
| Calls API-Football/partido | 4-5 | **5-6** | +1 |
| Archivos nuevos | 14 | **16** | +2 |
| Archivos modificados | 4 | **8** | +4 |
| Columnas DB nuevas | — | 1 (`player_photos`) | +1 |
| Helpers puros nuevos | 7 | **11** | +4 |

### Archivos

**Nuevos (2):**
- `src/lib/playerHelpers.ts` (82 líneas, 4 funciones puras con JSDoc detallado)
- `src/__tests__/playerHelpers.test.ts` (231 líneas, 25 tests)

**Modificados (4):**
- `supabase/functions/poll-scores/index.ts` (+60 líneas)
- `src/lib/types.ts` (+15 líneas: `PlayerPhoto` interface)
- `src/lib/api/matches.ts` (+6 líneas: parsing en `mapDbMatchToFrontend`)
- `src/components/match/tabs/FormacionesTab.tsx` (refactor del `TacticalPlayerPin`)

**Cambios manuales en DB:**
- `matches.player_photos JSONB` (ALTER TABLE ejecutado por el usuario)

### Decisiones que documentar para futuros devs

1. **Por qué JSONB y no tabla**: explicado arriba — acotado, atómico al partido, sin joins.
2. **Por qué foto + badge en el pin, no popover**: la cara es info primaria, no secundaria. F9 (popover) sigue en el backlog si se quiere agregar interactividad para ver más detalles del jugador (goles en el partido, tarjetas, etc.).
3. **Por qué `enrichLineupsWithPhotos` y no hidratar fotos directamente en `mapDbMatchToFrontend`**: separación de concerns. `mapDbMatchToFrontend` solo parsea JSONB a tipos; `enrichLineupsWithPhotos` es lógica de dominio (cruzar dos fuentes de datos). Esto permite testear cada uno por separado.
4. **Por qué `getPlayerInitials` y no avatar genérico**: las iniciales son identitarias del jugador, no genéricas. "LM" es más reconocible que un ícono de persona.
5. **Por qué `aria-label` se preserva intacto**: el screen reader sigue anunciando "Arquero número 1, Martínez" sin importar si hay foto o no. La información textual es la fuente de verdad para accesibilidad, la foto es decoración visual.

---

## Sprint 3: Optimización de API-Football

### ¿Por qué este Sprint?

Después de Sprint 2 dejamos la app funcionalmente completa: bottom sheet con 4 tabs, fotos de jugadores, todo andando. Pero al mirar las métricas crudas de uso, apareció un problema silencioso: **el cron de `poll-scores` consumía 4 fetches por partido en vivo**. Con un domingo típico de 8 partidos en simultáneo, eso eran ~32 fetches cada 10 minutos, ~1.200 calls/día, y un uso del 16% de la cuota del Plan Pro (7.500/día). No era un problema hoy, pero iba a ser un problema enorme al escalar a Mundial 2026 con 64 partidos en una semana.

Además, descubrimos dos inefficiencies más que estaban ocultas:

1. **El endpoint de API-Football v3.9.2 ya soporta `/fixtures?ids=X-Y-Z`** que trae statistics, lineups, events y players en una sola respuesta — pero el código nuestro seguía haciendo 4 fetches separados.
2. **Algunas ligas (ej. Segunda División de algunos países) no soportan `fixtures/players`** — y nuestro código igual los pedía, devolviendo arrays vacíos y gastando cuota al pedo.

Este Sprint ataca los 3 problemas de raíz: batch fetch, coverage check, y de yapa metemos un image cache local porque las fotos de los jugadores ya eran nuestro asset visual más pesado.

### El refactor de 4 fetches → 1 batch: el insight clave

El endpoint mágico es `GET /fixtures?ids=123-456-789` (máximo 20 IDs por request). Una sola llamada devuelve, para cada fixture:

- `statistics[]` (home + away)
- `lineups[]` (home + away con formation, starters, subs, coach)
- `events[]` (goles, tarjetas, sustituciones)
- `players[]` (stats individuales por jugador con `player.photo`)

Lo que antes costaba 4 calls por partido, ahora es **1 call cada 20 partidos**. La parte interesante fue decidir **cómo estructurar el código** para que fuera testeable y mantenible. La solución fue un pipeline de 4 fases:

1. **Phase A (decision pass)**: antes de hacer cualquier fetch, una query a `matches` arma un array `decisions[]` donde para cada fixture decidimos qué features necesita (`needsStats`, `needsLineups`, `needsEvents`, `needsPlayerPhotos`). Los criterios son: ¿es un partido en vivo? ¿ya tenemos stats? ¿faltan fotos? Etc.
2. **Phase B (batch fetch)**: agrupamos los `api_match_id` en chunks de 20, hacemos UN fetch por chunk a `/fixtures?ids=...`, y guardamos la respuesta en un `Map<id, data>` en memoria.
3. **Phase C (helper)**: una función pura `processBatchDataForFixture(decision, batchData)` toma la decisión + el dato batch y retorna el `matchPayload` listo para upsert.
4. **Phase D (upsert)**: iteramos las decisiones, llamamos a `processBatchDataForFixture`, y hacemos el upsert con service role key.

Lo lindo de este diseño es que **Phase B es la única que hace I/O de red** — las otras 3 son CPU pura en memoria. Esto lo hace fácil de testear con mocks y fácil de debuggear con logs.

### El coverage check: por qué importa para escalar

API-Football tiene una asimetría molesta: **no todas las ligas exponen todos los endpoints**. Por ejemplo, `/fixtures/players` está disponible en Premier League, La Liga, Bundesliga, Ligue 1, Serie A, Libertadores y Mundial — pero NO en la mayoría de las ligas regionales ni copas nacionales chicas.

Antes, si pedíamos `/fixtures/players?fixture=999999` para un partido de una liga que no lo soporta, la API respondía `response: []` (sin error), pero gastábamos 1 call al pedo. Con 20 partidos en una jornada mixta (algunos Premier, otros regionales), podíamos gastar 20 calls para recibir 5 arrays vacíos.

La solución: una nueva tabla `league_coverage` que mapea `(league_id, season) → {events, lineups, statistics_fixtures, statistics_players, standings, players, predictions}`. El campo `coverage` de la respuesta de `/leagues` (un objeto con flags booleanos por feature) es exactamente lo que necesitamos guardar. Cada 24h sincronizamos todas las ligas activas (`COVERAGE_FRESH_MS`).

Antes de pedir una feature en `processBatchDataForFixture`, chequeamos `isFeatureAvailable(coverageMap, leagueId, season, 'players')`. Si retorna `false`, no gastamos el call. **Fail-open**: si la liga no tiene fila en la tabla, asumimos que la feature SÍ está disponible (preferimos gastar 1 call a perder datos). El trade-off fue explícito: como dijo el usuario, *"la app es pequeña y ahí es lo que sea lo más performante y escalable siempre"*.

### La decisión: Cache API vs Service Worker

Para el image cache, evaluamos 2 opciones:

| Opción | Pros | Contras |
|---|---|---|
| **Service Worker** | Podríamos interceptar TODAS las requests de imágenes | Ya hay un SW para push notifications, sumarlo complica el ciclo de vida. Cachea TODO lo que pasa por el SW (agresivo, riesgo de romper HMR en dev). |
| **Cache API directa** | Sin SW adicional, control fino por URL, ideal para casos puntuales | Solo cachea lo que explícitamente le pidamos cachear. |

Elegimos **Cache API directa**. La razón: solo necesitamos cachear las URLs de `player.photo` y `team.logo`, no cualquier imagen de la app. Un SW sería overkill y traería complejidad de deployment (registro, versionado, debugging). Con la API directa, el componente que necesita la imagen llama a `useCachedImage(url)`, el hook verifica si está en cache, si no la descarga y la guarda. Listo.

La estructura del cache:

- **Nombre**: `prodear-image-cache` (namespace dedicado, no contamina otros caches).
- **TTL**: 7 días (`TTL_MS = 7 * 24 * 60 * 60 * 1000`).
- **MAX_ENTRIES**: 500 (con eviction FIFO al 80%, evita que el cache crezca infinito).
- **API**: `getCachedImage(url)`, `clearImageCache()`, `useCachedImage(url)` (hook React).

La integración más vistosa fue en `TacticalPlayerPin`: antes mostraba `<img src={photo} />` que en cada mount del componente refetchaba la foto. Ahora el pin usa `useCachedImage(photo)` y la segunda vez que se ve al mismo jugador, la imagen sale instantáneamente desde el cache local.

### Bugs encontrados y corregidos

1. **Deno logs silenciosos al hacer un `console.log()` dentro de `processBatchDataForFixture`**: durante el refactor de las 4 fases, los logs aparecían en consola de Supabase Dashboard pero con timestamps mal (en UTC cuando esperábamos local). Se ajustó el formateo para usar `new Date().toISOString()` explícito. No era un bug funcional pero molestaba para debuggear en vivo.
2. **Bug de doble mount del `useCachedImage`**: en `React.StrictMode` (dev), el hook se ejecutaba 2 veces y disparaba 2 fetches de la misma imagen. Se agregó un `useRef` para guardar la promesa en curso y evitar requests duplicadas. Mismo patrón que el `hasHydrated` del authStore (ver Sección 7 de Arquitectura).
3. **Coverage no se sincronizaba en la primera invocación del día**: el `syncLeagueCoverage` se llamaba dentro del poll, pero solo si había partidos vivos. En días sin partidos (lunes a miércoles), el coverage quedaba stale. Se agregó un check al inicio de `poll-scores` que sincroniza coverage si la última sync fue hace >24h, independiente de si hay partidos.

### Métricas finales del Sprint 3

| Métrica | Sprint 2 | Sprint 3 | Delta |
|---|---|---|---|
| Calls API-Football/día (cron 10 min) | ~1.200 | **~300** | −75% |
| % cuota Plan Pro (7.500/día) | 16% | **4%** | −12 pp |
| Fetches por partido en vivo | 4-5 | **1 cada 20 partidos** | −95% |
| Cache de imágenes (escudos/fotos) | No | **Sí (7 días, 500 entradas)** | +1 |
| Chequeo de coverage por liga | No | **Sí (sync 24h)** | +1 |
| Tests pasando | 198/198 | **198/198** | 0 (sin tests nuevos aún, ver Sprint 4) |
| Archivos nuevos | 16 | **18** | +2 |
| Archivos modificados | 8 | **10** | +2 |
| Tablas DB nuevas | 1 | **2** | +1 |
| Helpers puros nuevos | 11 | **17** | +6 |

### Archivos

**Nuevos (2):**
- `src/lib/cdnHelpers.ts` (44 líneas, 6 funciones puras con JSDoc detallado)
- `src/lib/imageCache.ts` (220 líneas, Cache API + eviction FIFO + hook React)

**Modificados (2):**
- `supabase/functions/poll-scores/index.ts` (refactor mayor: 4 fetches → 1 batch, ~120 líneas agregadas/modificadas, 3 funciones helper nuevas)
- `src/components/match/tabs/FormacionesTab.tsx` (`TacticalPlayerPin` ahora consume `useCachedImage(photo)`)

**Cambios manuales en DB (1):**
- `CREATE TABLE league_coverage` con PK `(league_id, season)` y 7 flags booleanos

### Decisiones que documentar para futuros devs

1. **Por qué `/fixtures?ids=` y no mantener los 4 fetches**: la API v3.9.2+ expone este endpoint consolidado. Es 1 call en lugar de 4 y los datos vienen atómicos (mismo timestamp), evitando inconsistencias entre statistics y events si la API se actualiza mid-fetch.
2. **Por qué chunks de 20 IDs (no 10 ni 50)**: la API impone un máximo de 20 IDs por request. Usamos exactamente el máximo para minimizar el número de requests. Para 8 partidos en vivo: 1 sola request. Para 25 partidos: 2 requests. Fórmula: `Math.ceil(fixtureIds.length / 20)`.
3. **Por qué coverage check fail-open**: si la liga no tiene fila en `league_coverage`, asumimos que la feature está disponible. Preferimos gastar 1 call al pedo a perder datos (ej. eventos de un partido nuevo). El sync diario de coverage minimiza este caso al 0 en la práctica.
4. **Por qué Cache API y no Service Worker**: el SW ya existe (para push notifications) y agregar responsabilidades extra (image cache) complica el ciclo de vida del SW y su debugging. La Cache API directa es ideal para casos puntuales como el nuestro, sin infraestructura adicional.
5. **Por qué eviction FIFO al 80% de 500**: en una app con 30+ ligas, podemos tener 500+ escudos de equipos únicos. Eviction al 80% (400 entradas) deja margen para no borrar agresivamente pero previene crecimiento infinito. FIFO (no LRU) porque la API de Cache no expone metadata de last-access sin extender la interfaz.
6. **Por qué `coachPhotoUrl` respeta el typo `coachs`**: API-Football tiene el typo oficial en su endpoint (`/coachs` en vez de `/coaches`). Como la URL del CDN es predecible y respeta el mismo typo, lo mantenemos por consistencia. Un comment en el código explica el porqué.
7. **Por qué `useCachedImage` en lugar de hacer cache dentro de `TacticalPlayerPin`**: separación de concerns. El pin no debería saber de la Cache API, solo consumir una URL. El hook es el punto de entrada reutilizable para cualquier otro componente que quiera cachear una imagen (ej. logos de equipos, escudos de ligas).

---

## Próximos Pasos Sugeridos

1. **Commitear** todos los cambios (con tu autorización explícita)
2. **Deployar** a producción (con tu OK explícito, sin deployar hasta que confirmes)
3. **Smoke test exhaustivo** en dev con datos reales de Supabase
4. **Investigar pendientes**:
   - Tests para `useBottomSheet` (hook pendiente de testing, mencionado en el plan del QA)
   - Considerar reemplazar `window.confirm` por UI in-app para el dirty check
   - Refactor `MatchSheet` en custom hooks para mejorar mantenibilidad
5. **Fase 3 del roadmap** (próximas features):
   - Stats del partido en tiempo real en el sheet
   - Notificación push cuando empieza un partido con predicción pendiente
   - Compartir predicción con Web Share API nativa (en vez de clipboard)

---

## Feature POSICIONES: Grupos en Vivo del Mundial

Esta feature (también parte de Sprint 3 en la planificación general) agrega un **centro de comando en vivo** del Mundial 2026 al tab POSICIONES del torneo. Es la pieza de UX más ambiciosa del proyecto: ver tablas de grupos, mejores terceros, y bracket de 16vos moviéndose en tiempo real mientras se juegan los partidos.

### El problema que resolvió

Antes de esta feature, el tab GRUPOS mostraba tablas con stats **estáticas y desactualizadas**: solo se contaban partidos `finished`, por lo que durante los 90+ minutos de un partido live, la tabla quedaba congelada con datos del estado anterior. Si México iba ganando 2-0 al minuto 70, el usuario no veía eso reflejado hasta que el partido terminara.

Adicionalmente, el código tenía un **fuzzy matching frágil de equipos**: 200+ líneas de aliases hardcodeados (ej. "South Korea" → "Grupo A") que se rompían cada vez que la API-Football cambiaba un nombre (como pasó con "Türkiye" vs "Turkiye", "Cape Verde" vs "Cape Verde Islands").

### Lo que se construyó

**3 sub-pills dentro del tab POSICIONES:**

1. **GRUPOS** (default): 12 tablas de grupos (A-L) con partidos live marcados. Cada grupo muestra: 4 equipos con PJ/PG/PE/PP/GF/GC/DG/pts, logos de banderas (vía `flagcdn.com`), badge "EN VIVO" pulsante cuando hay un partido en curso, mini-scoreboard inline con el score parcial + minuto, y animaciones de cambio de posición (verde al subir, rojo al bajar).

2. **LIGA 3ROS**: Tabla de los 12 mejores terceros lugares. Los top 8 con badge verde "Clasifica" y los bottom 4 con badge rojo "Fuera" + opacidad reducida. Línea de corte visual entre la fila 8 y 9 (la "línea roja" del Mundial).

3. **16VOS**: Grid de 16 partidos de Dieciseisavos. Los partidos con grupos ya definidos muestran el cruce (1°A vs 2°B, etc.), los partidos pendientes muestran slots TBD con borde dashed + "Por definir". Header con progreso "X / 16 cruces definidos".

### Decisiones de producto clave

Durante el brainstorming con el usuario, se discutieron y resolvieron 4 decisiones críticas:

1. **¿Partidos live suman puntos parciales?** → **NO**. Los partidos live solo actualizan PJ/GF/GC/DG. Los puntos (pts/pg/pe/pp) se asignan solo cuando el partido termina. Esto evita la confusión de mostrar "3 pts parciales" a un equipo que va 1-0 pero puede terminar perdiendo 1-3.

2. **¿Mini-scoreboard muestra el minuto?** → **SÍ**, formato `MEX 1-0 RSA · 34'`. Usa el campo `match.minute` que ya viene en la API.

3. **¿Placeholder para LIGA 3ROS y 16VOS?** → **Genérico elegante** ("Próximamente" con íconos específicos), no con fecha estimada.

4. **¿El pill GRUPOS muestra contador de partidos en vivo?** → **SÍ**, badge rojo con número (ej. `GRUPOS 🔴 2`).

### El refactor arquitectónico

Lo más interesante de esta feature no es la UI sino el refactor de datos:

- **DB**: 3 columnas nuevas en `matches` (`group_letter`, `home_team_canonical`, `away_team_canonical`) + tabla `team_aliases` con 120+ filas. Ahora el server normaliza nombres canónicos al guardarlos, no al renderizar.
- **Edge Function**: `poll-scores` ahora tiene 3 funciones helper (`getGroupLetterFromStage`, `loadAliasesCache`, `resolveCanonicalName`) que se ejecutan en cada upsert.
- **Cliente**: el fuzzy matching de 200 líneas desapareció. `getGroupTables()` y compañía reciben datos ya normalizados.

### Hallazgo del debugging

Durante el testing en dev, descubrimos que **4 partidos del Mundial no estaban populados** en `group_letter`. El diagnóstico reveló que la API-Football devuelve nombres con variantes no anticipadas:
- `Türkiye` (con diacrítico, no `Turkiye` ASCII)
- `Bosnia & Herzegovina` (con ampersand, no `and`)
- `Cape Verde Islands` (forma larga, no `Cape Verde`)

Fix: agregar 3 aliases a `team_aliases` y re-correr el backfill. Después de eso, **0 unmapped** confirmado. Lección: **siempre incluir el nombre EXACTO de la API** en aliases, no solo la forma "bonita".

### Tests del feature

- **78 tests nuevos** para la lógica pura + hook: `worldCupGroups.test.ts` (65) + `useGroupStandings.test.ts` (13)
- **68 component tests** para los 5 componentes: `PillTabs` (11) + `GroupTable` (16) + `BestThirdsTable` (13) + `KnockoutBracket` (13) + `PositionsView` (15)
- **Total feature**: 146 tests, todos pasando

### Métricas finales

| Métrica | Valor |
|---|---|
| Líneas de código agregadas (lib + hook + components + tests) | ~2,500 |
| Bundle size (MatchCard, con React.lazy de los 3 tabs) | -24KB minified |
| Polling interval | 15s si hay live, 0 si no |
| Latencia de actualización en vivo | ≤ 15s (1 poll cycle) |
| TypeScript errors | 0 |
| Cobertura de tests para los 5 componentes | 100% |

### El rol del sprint dentro del proyecto

Esta feature cierra el ciclo de **"ver el Mundial en vivo en ProdeAR"**. Combinada con el MatchSheet (Sprint 1) que muestra el detalle de cada partido, ahora un usuario puede:
1. Ver el Mundial desde la pantalla principal → tab POSICIONES → 3 sub-pills
2. Tap en un grupo → ver detalle de un partido → MatchSheet con eventos, stats, formaciones
3. Todo se actualiza en vivo (polling 15s + animaciones de cambio de posición)

Es el "comando center" que un fan del fútbol quiere ver durante el Mundial.

---

## Feature: Abreviación Visual de Nombres en Formaciones *(2026-06-16)*

### El problema

En el `FormacionesTab` del Match Bottom Sheet, los nombres de los jugadores se mostraban **completos** debajo de cada pin táctico (`"Lionel Messi"`) y en la lista de suplentes. En una cancha de ~480px de ancho con 11 jugadores por equipo, esto causaba:

- **Truncamientos** (`truncate` con `max-w-[80px]`) en 1-2 jugadores por fila en formaciones estándar 4-3-3 / 4-4-2.
- **Wraps a 2 líneas** en apellidos largos que rompían la grilla horizontal de la cancha (`"Rodrigo De Paul"`, `"Ángel Di María"`, `"Van Dijk"`).
- **Densidad visual** en el panel de suplentes mobile, que scrolleaba más de lo necesario.

Adicionalmente, el panel de suplentes con nombres completos ocupaba ~33% más de altura vertical que con nombres abreviados.

### La decisión

Formato `"Inicial. Apellido"`:
- `"Lionel Messi"` → `"L. Messi"`
- `"Lautaro Martínez"` → `"L. Martínez"`
- `"Neymar"` → `"Neymar"` (1 palabra no se puede abreviar)
- `"Juan Román Riquelme"` → `"J. Riquelme"`
- `"Cristiano Ronaldo dos Santos Aveiro"` → `"C. Aveiro"`

**Idempotencia**: si la API ya devuelve un nombre abreviado (`"A. Di María"`), se respeta tal cual. La detección se hace con la regex `/^[\p{L}]\.\s/u` (Unicode-safe con flag `u`).

**Apellidos con partícula**: para nombres italianos (`"Di"`), holandeses (`"de"`, `"van"`), alemanes (`"von"`), franceses (`"le"`), se detecta la partícula en la penúltima posición y se incluye en el apellido:
- `"Ángel Di María"` → `"Á. Di María"`
- `"Frenky de Jong"` → `"F. de Jong"`
- Set `LASTNAME_PARTICLES` con 22 partículas en 5 idiomas.

**Robustez**: `null` / `undefined` / `""` → `""`. Trim + colapso de whitespace múltiple. Unicode-safe (preserva acentos en la inicial: `"Éder Militão"` → `"É. Militão"`).

### Lo que NO se cambió (decisiones conscientes)

- **Nombres de DTs (coaches)** siguen con el nombre completo. Razonamiento: los DTs no son jugadores, son "staff"; el usuario los busca por nombre entero en su contexto de autoridad.
- **`aria-label` del pin táctico** (línea 319 original) sigue con el nombre completo. Razonamiento a11y: los screen readers deben anunciar el nombre completo para que usuarios con discapacidad visual identifiquen al jugador inequívocamente. La abreviación es puramente visual.

### Microinteracción: tooltip nativo

Para que el usuario pueda ver el nombre completo al hover/tap largo, se agregó el atributo HTML `title={name}` + la clase `cursor-help` en el span del pin táctico. Esto usa el tooltip nativo del browser (0 JS, 0 dependencias, accesible, consistente con la web).

- **Desktop**: aparece tras ~1s de hover.
- **Mobile**: aparece tras ~500ms de long-press.
- **Screen readers**: algunos anuncian el `title` como información adicional.

### Archivos modificados

| Archivo | Líneas | Cambios |
|---|---|---|
| `src/lib/playerHelpers.ts` | +99 | Helper `getShortPlayerName` exportado + `extractLastName` privado + set `LASTNAME_PARTICLES` (22 partículas) |
| `src/components/match/tabs/FormacionesTab.tsx` | +18 / −8 | Import del helper, 3 call-sites (pin táctico, suplente HOME, suplente AWAY), `title={name}` + `cursor-help` en el pin |
| `src/__tests__/playerHelpers.test.ts` | +102 | Nuevo `describe("getShortPlayerName")` con 22 casos |

**Total**: 3 archivos, 219 insertions(+), 8 deletions(-).

### Tests (22 nuevos casos)

| Categoría | # | Casos representativos |
|---|---|---|
| Happy paths (P0) | 5 | `"Lionel Messi" → "L. Messi"`, `"Lautaro Martínez"`, `"Éder Militão"`, `"Juan Román Riquelme"`, `"Cristiano Ronaldo dos Santos Aveiro"` |
| Edge cases 1-palabra/vacío (P0) | 7 | `"Neymar"`, `"Cavani"` (mock real), `"Gómez"`, `""`, `null`, `undefined`, `"   "` |
| Trim/colapso (P1) | 2 | `"  Lionel  Messi  "`, `"Juan  Román  Riquelme"` |
| Idempotencia (P1) | 3 | `"A. Di María"`, `"L. Suárez"`, `"D. Sánchez"` |
| Unicode/partículas (P1-P2) | 5 | `"Mesut Özil"`, `"Ángel Di María"`, `"Frenky de Jong"`, `"Maravilla Martínez"`, lowercase |

### Criterios de aceptación críticos

- ✅ `"Lionel Messi"` → `"L. Messi"` (caso de uso principal)
- ✅ `"Neymar"` → `"Neymar"` (1 palabra: no se rompe)
- ✅ `"A. Di María"` → `"A. Di María"` (idempotente)
- ✅ `null` / `undefined` / `""` → `""` (no crashea)
- ✅ `aria-label` sigue con nombre completo (a11y)
- ✅ DTs no se modifican (alcance correcto)
- ✅ Cero regresiones en EventosTab, MatchCard, MatchSheet

### Evidencia de validación

- `npx tsc --noEmit` → 0 errores
- `npx vitest run src/__tests__/playerHelpers.test.ts` → **66/66 tests** (44 originales + 22 nuevos)
- `npx vitest run` (suite completa) → **387/387 tests** en 21 archivos, 0 regresiones
- `npm run build` → compila OK, PWA + service worker generados

### Riesgos residuales

- **Formaciones 5-3-2 con 5 defensores de apellidos largos** (ej. `C. Christensen` 15 chars en Outfit 11px uppercase) podrían tensionar `max-w-[80px]`. Mitigación si se observa: bajar a `max-w-[72px]` o permitir wrap a 2 líneas solo en ese edge case (requeriría refactor).
- **Dos jugadores con misma inicial + apellido en el mismo equipo** (ej. dos `G. Gómez`): estadísticamente improbable; mitigado por foto + número + posición en grilla.

### Trabajo futuro

- Evaluar Radix UI Tooltip para un tooltip estilizado con `glass-card` (vs el nativo del browser).
- Reveal on tap-and-hold para mobile (cross-fade entre abreviado y completo).
- Considerar aplicar la abreviación también en el tab **Eventos** (goles, tarjetas, sustituciones) si la densidad lo justifica.
- Usar la columna `short_name` que algunas APIs de fútbol exponen si está disponible (evitaría el helper).

---

## Feature: UX/UI Polish — Highlight de Penales + Hide Native Number Arrows *(2026-06-28)*

**Sprint**: "Sprint Penales 2026 — UX/UI Polish" · **Issues resueltos**: 2 · **Tests**: 720 passing, 0 regresiones, 0 errores TS.

### Issue 1 — Highlight del selector de penales

Bloque `src/components/match/PredictionSlide.tsx:257-313` reescrito con estados visuales dinámicos en función de `needsPenalty` (computado como `showPenaltySelector && penaltyWinner === null`).

| Estado | Trigger | Visual |
|---|---|---|
| Atención | `needsPenalty === true` | `bg-primary/10` + `border-primary/40` + `motion-safe:animate-pulse-soft` + icono `bolt` (rayo) en `text-primary text-glowing` + badge `<span role="status" aria-live="polite">Elegí ganador</span>` + hint "Tocá el equipo que creés que gana por penales" |
| Relajado | `penaltyWinner !== null` | `bg-surface-container-high/40` + `border-white/5` + icono `military_tech` (medalla) en `text-tertiary/80 text-glowing-gold` (sin badge, sin hint, sin animación) |
| Oculto | `!isPlayoffs \|\| !isDraw` | No se monta (igual que antes) |

**Accesibilidad**: `prefers-reduced-motion` respetado en 2 capas (`motion-safe:animate-pulse-soft` como wrapper + entrada explícita en `@media (prefers-reduced-motion: reduce)` con `animation: none !important`). Icono decorativo con `aria-hidden="true"`. Badge con `role="status"` + `aria-live="polite"` para que screenreaders anuncien el cambio de estado.

### Issue 2 — Hide native number arrows

Regla global agregada en `src/index.css:170-181` (`@layer base`) que oculta las flechas nativas (▲▼) de **todos** los `input[type="number"]` del proyecto. Cubre:

- `src/components/match/PredictionSlide.tsx:435` (el input del Stepper del bottom modal — el de la captura)
- `src/components/match/MatchCard.tsx:848` y `891` (los 2 inputs del editor inline legacy)

```css
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: none;
}
```

**Decisión**: regla global (no por clase utilitaria) → DRY → cualquier `input[type="number"]` futuro hereda el fix automáticamente.

**Mobile también**: no se dejaron las flechas nativas en mobile. Justificación: el Stepper ya tiene sus propios botones `+`/`-` (líneas 425-451 de `PredictionSlide.tsx` con `material-symbols-outlined` `add`/`remove`), mantener 2 affordances para la misma acción solo genera inconsistencia visual entre plataformas.

### Decisiones técnicas relevantes

1. **Material Symbols sobre `lucide-react`**: el archivo ya usa 9 Material Symbols (incluido el icono actual del selector `military_tech`). Para mantener consistencia, se usó `bolt` (rayo) y se mantuvo `military_tech` (medalla) — ambos con `fontVariationSettings: "'FILL' 1"`. La librería `lucide-react` está instalada y se usa en 4 componentes UI (`UpdateIcon`, `UpdateBlockingModal`, `NotificationToast`, `NavSidebar`), pero romper consistencia en `PredictionSlide.tsx` era peor que la convención local.
2. **Sin nueva dependencia**: 0 paquetes agregados. El highlight se implementó 100% con Tailwind v4 utilities + 1 keyframe CSS de 12 líneas.
3. **Animación `box-shadow` only**: el keyframe `pulseSoft` solo anima `box-shadow` (no `transform` ni `opacity`) para evitar reflow del layout. Duración 2.4s, `ease-in-out`, `infinite`. Esto lo hace amable con la `prefers-reduced-motion` y con componentes que ya tienen otras animaciones en el mismo árbol.
4. **Label "Desempate por Penales"** (sin "(Requerido)"): se quitó el sufijo "(Requerido)" porque el badge "Elegí ganador" + el CTA ámbar del botón Guardar ("⚽ ELEGÍ GANADOR DE PENALES") ya comunican el estado de "falta completar" de forma más rica y accesible.

### Validaciones

| Check | Resultado |
|---|---|
| `npx tsc -b --noEmit` | ✅ 0 errores |
| `npm test` | ✅ 720 passing, 6 fallos pre-existentes (todos `isFeatureEnabled("BRACKET_V2")` en `hotfixT0`, `worldCupGroups`, `PositionsView`; confirmados pre-existentes con `git stash` + test) |
| `biome check` (archivos modificados) | ⚠️ Solo warnings de `!important` (consistentes con patrón existente en `index.css`) |

### Pasos para probar

1. `npm run dev`
2. Login → abrir un partido de **playoffs** (ej. 16vos del Mundial) que esté en estado `not_started` y editable
3. Tocar los botones `+`/`-` del stepper hasta dejar el score 1-1 → debería aparecer el bloque "Desempate por Penales" con **highlight animado** (`bg-primary/10` + `pulse-soft`) + **icono `bolt` celeste** + **badge "Elegí ganador"** + **hint** "Tocá el equipo que creés que gana por penales"
4. Tocar uno de los `PenaltyButton` → el bloque cambia al **estado relajado** (ámbar, icono de medalla, sin animación, sin badge, sin hint)
5. Cambiar el score a 2-1 → el bloque desaparece (porque `isDraw === false`)
6. **Verificar accesibilidad**: el badge anuncia "Elegí ganador" a screen readers (NVDA / VoiceOver). DevTools → Rendering → "Emulate CSS `prefers-reduced-motion: reduce`" → la animación `pulse-soft` debe detenerse y quedar estática con el highlight de color.
7. **Verificar inputs**: NO deben verse flechas ▲▼ a la derecha de los inputs de score ni en el modal ni en las `MatchCard` de la lista, en **Chrome / Edge / Firefox / Safari** y también en mobile (iOS Safari + Chrome Android).

---

## Referencias

- **Spec UX/UI del Match Bottom Sheet**: `docs/match-bottom-sheet-ux-spec.md` (117KB)
- **Task board**: `task.md` (con la saga completa documentada en "Bugs Corregidos" y el Sprint 1 documentado en su sección)
- **Arquitectura**: `Arquitectura.md` (con los nuevos patrones en Sección 7, y la feature POSICIONES detallada en **§11**)
- **API Reference**: `docs/API_FOOTBALL_REFERENCE.md` (1,631 líneas, incluye §10.0.1 sobre `flagcdn.com` y §10.1 sobre estrategia de imágenes)
- **Deploy Guide**: `docs/DEPLOY_SPRINT_3.md` (490 líneas, checklist paso a paso para push nocturno)
- **Tests**: 344/344 pasando en 21 archivos (134 originales + 78 lib/hook POSICIONES + 68 component tests + 64 Sprint 1+2+3)

**Estado del proyecto al cierre de las sesiones Sprint 1+2+3+POSICIONES**: ✅ Nav funciona, ✅ Match Bottom Sheet funciona con 4 tabs enriquecidos, ✅ POSICIONES con 3 sub-pills live, ✅ Documentación completa (Arquitectura, API ref, Deploy guide), ✅ 0 errores en consola, ✅ 344/344 tests, ✅ 0 errores TypeScript, ✅ Build OK, ✅ 6 commits ahead de origin/main listos para push
