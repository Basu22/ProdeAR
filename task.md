# Tablero de Tareas - ProdeAR

## MVP 1.0 (Reglamento ChampSheep)

- [x] **Fase 1: Configuración Inicial & Autenticación**
  - [x] Setup del proyecto SPA con Vite, React y React Router v7.
  - [x] Configuración de variables de entorno y cliente de Supabase.
  - [x] Implementación de Autenticación Híbrida (Google OAuth, Email/Password, fallback a LocalStorage).
  - [x] Estructuración de layouts y componentes visuales base (estilo premium).

- [x] **Fase 2: Fixture & Pronósticos Básicos**
  - [x] Sincronización básica de partidos y visualizador de Fixture.
  - [x] Formulario e interacción para cargar pronósticos.
  - [x] Bloqueo de predicciones al inicio del partido.

- [x] **Fase 3: Torneos Privados e Invitaciones**
  - [x] **Actualizar la API de torneos (`src/lib/api/tournaments.ts`)**:
    - [x] Implementar `createTournament(name, competitionId)` con soporte híbrido (Supabase e inserción en miembros como `admin`, o fallback a LocalStorage).
    - [x] Implementar `joinTournament(code)` con soporte híbrido (Supabase e inserción en miembros como `player`, controlando límite de 50 participantes, o fallback a LocalStorage).
    - [x] Soportar persistencia e hidratación local de torneos y miembros mediante LocalStorage en modo simulación.
  - [x] **Modificar el Dashboard (`src/routes/Dashboard.tsx`)**:
    - [x] Crear card de "Mis Torneos" en la barra lateral con listado de torneos activos del usuario.
    - [x] Integrar botones y modales estilizados con efecto Glassmorphism para "Crear Torneo" y "Unirse a Torneo".
  - [x] **Crear la Ruta de Invitación Directa (`src/routes/JoinTournament.tsx` e integración en `src/App.tsx`)**:
    - [x] Capturar código de invitación por query parameter (`/join?code=AR-XXXX`).
    - [x] Procesar automáticamente el ingreso del usuario al torneo respectivo.
    - [x] Diseñar tarjetas de carga, éxito y error con estética futbolera premium.
  - [x] **Verificación y Pruebas**:
    - [x] Formatear y comprobar el código con Biome.
    - [x] Ejecutar la suite de pruebas unitarias.

- [x] **Fase 4: Motor de Puntuación & Posiciones en Vivo**
  - [x] Implementar trigger/función en Supabase PostgreSQL para recalcular posiciones reales al finalizar partidos.
  - [x] Sincronización periódica de resultados en vivo mediante Edge Functions.
  - [x] Sistema de desempate automático según reglamento ChampSheep.

- [x] **Fase 5: Chat y Notificaciones en Tiempo Real**
  - [x] Canal de chat integrado en torneos vía WebSockets (Supabase Realtime).
  - [x] Notificaciones Push web para avisos de fixtures, goles y rankings.

- [x] **Fase 6: PWA, Web Push & Polish**
  - [x] Configurar PWA en Vite (`vite-plugin-pwa`) con Service Worker offline y manifest móvil.
  - [x] Agregar botón sobrio de instalación de PWA en `NavSidebar.tsx` o perfil.
  - [x] Suscripción Web Push en el cliente con VAPID keys y RLS de base de datos.
  - [x] Lógica de notificaciones push firmadas con VAPID en Edge Functions (sólo para standings y cierres inminentes, sin chat spam).
  - [x] Simulador de push offline: lanzar Toasts animados y reproducir un sonido (`gol_sound.mp3`) ante goles o partidos finalizados.
  - [x] Activar View Transitions nativas en CSS y agregar Loading Skeletons con shimmer effect para partidos, tablas y stats.
  - [x] Configurar meta tags SEO y Error Boundaries de React 19.
  - [x] Skeletons premium con animación Shimmer para carga de tarjetas, tablas y estadísticas.
  - [x] Metatags SEO configurados en `index.html` y Error Boundary de contingencia ("Partido Suspendido").
  - [x] Validación linter y formateador con Biome, y tests unitarios de la lógica de negocio exitosos.

- [x] **Fase 7: Conexión Real & Testing con Amistosos**
  - [x] Crear proyecto en Supabase Cloud y ejecutar `supabase/schema.sql` en el SQL Editor. (¡Completado! Tablas verificadas en producción)
  - [x] Crear cuenta en API-Sports y obtener la API Key para API-Football.
  - [x] Crear el archivo `.env` o `.env.local` en la raíz del proyecto con las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. (¡Completado! Configurado en `.env.local`)
  - [x] Configurar los secretos `API_FOOTBALL_KEY` en la Edge Function de Supabase. (¡Completado! Secretos subidos exitosamente)
  - [x] Desplegar la Edge Function `poll-scores` a Supabase. (¡Completado! Edge function activa)
  - [x] Registrar la competencia de Amistosos Internacionales (ID 10) y Copa del Mundo (ID 1) en la tabla `competitions`. (¡Completado! Ligas sincronizadas)
  - [x] Ejecutar el primer polling de partidos amistosos para poblar la base de datos real. (¡Completado! Sincronización exitosa de partidos)
  - [/] Validar flujos reales de apuestas, chat y notificaciones push en producción. (En progreso - Resolviendo RLS circular)

- [x] **Mega-sesión: Dashboard Refresh (Fases 1-3)** *(2026-06-12)*
  - **Fase 1 (Quick wins)**: `ActionBar` (CTA predicciones pendientes + countdown al cierre), Racha en `TopAppBar` cuando `currentStreak >= 3`, Banner simplificado (sin párrafo estático).
  - **Fase 2 (Core UX)**: `BottomSheet` genérico (portal, focus trap, swipe-down, safe-area, responsive), `StatsSheet` (Captain Stats + push toggle), `MatchStatusBar` con 6 estados visuales, `DashboardEmptyState` con 4 variantes.
  - **Fase 3 (Refinamiento + Match Bottom Sheet)**: Match Bottom Sheet completo al hacer click en una MatchCard. Header expandido con score grande, carrusel multi-torneo de predicciones editable, tabs (Pronósticos/Eventos/Info), botón compartir al portapapeles, animación de guardado con pulse glow verde, haptic feedback, dirty check para prevenir close accidental.
  - **Polish**: Responsive desktop (centrado en modal en `md+`), animación "guardado exitoso" con checkmark animado, compartir predicción al portapapeles con `navigator.clipboard`.
  - **Tests añadidos**: 66 nuevos (29 Fase 1 + 37 Fase 2-3) → total **134/134 pasando**.
  - **Archivos nuevos (15)**: `src/lib/matchCardState.ts`, `src/lib/emptyStateHelpers.ts`, `src/hooks/useBottomSheet.ts`, `src/hooks/usePendingPredictions.ts`, `src/components/ui/BottomSheet.tsx`, `src/components/dashboard/StatsSheet.tsx`, `src/components/dashboard/ActionBar.tsx`, `src/components/dashboard/DashboardEmptyState.tsx`, `src/components/match/SheetMatchHeader.tsx`, `src/components/match/PredictionSlide.tsx`, `src/components/match/PredictionCarousel.tsx`, `src/components/match/MatchStatusBar.tsx`, `src/components/match/MatchSheet.tsx`, + 5 tests files.
  - **Archivos modificados (8)**: `src/components/layout/TopAppBar.tsx`, `src/components/match/MatchCard.tsx`, `src/components/match/MatchDetailsTabs.tsx`, `src/stores/uiStore.ts`, `src/routes/Dashboard.tsx`, `src/index.css`, `vite.config.ts`, `src/hooks/useCountdown.ts` (re-escrito).
  - **Spec UX**: `docs/match-bottom-sheet-ux-spec.md` (117KB, creado por UX/UI designer).

## Bugs Corregidos

- [x] **Bug: Logout → Sesión Demo en lugar de pantalla de Login** *(2026-06-08)*
  - **Causa raíz**: `ProtectedRoute.tsx` tenía un `useEffect` que al detectar `user === null` (estado post-logout), forzaba inmediatamente el estado del store a un usuario demo hardcodeado (`demo@prodear.app`), impidiendo que la redirección al login ocurriera.
  - **Archivos modificados**:
    - `src/components/layout/ProtectedRoute.tsx`: Eliminado el `useEffect` de inyección de usuario demo. El componente ahora actúa como un guardia de ruta real: muestra un spinner de carga mientras `isLoading` es `true`, redirige a `/` con `<Navigate replace>` si no hay sesión, y renderiza `<Outlet />` si el usuario está autenticado.
    - `src/stores/authStore.ts`: El estado inicial de `isLoading` cambió de `false` a `true`. Esto garantiza que durante el arranque de la app, el guardia de ruta espere a que `hydrate()` termine de verificar la sesión antes de tomar decisiones de ruteo, evitando redirecciones prematuras al login en un refresh de página.

- [x] **Bug: Nav no navega en dev (saga de 4 fixes)** *(2026-06-12)*

  **Síntoma reportado**: "Estoy en Inicio y hago clic en Torneos o Ranking, no se mueve. Si recargo, ahí va. Pero si ya navegué, vuelvo a Inicio y no puedo volver ni a Torneo ni a Ranking. Tengo que recargar para que vaya a la última."

  **Causa raíz (4 capas)**: El bug era una combinación de 4 issues superpuestos. Cada fix reveló el siguiente.

  **Fix 1: `authStore.hydrate()` idempotente con flag `hasHydrated`** *(2026-06-12)*
  - **Diagnóstico**: Race condition entre `React.StrictMode` y `useAuthStore.hydrate()`. En dev, `StrictMode` ejecuta useEffects 2 veces. La 2da llamada seteaba `isLoading: true` y mostraba el spinner de "Cargando cancha..." en `<ProtectedRoute>`, que NO monta el `<Outlet />`. URL cambiaba pero la UI no.
  - **Fix**: Agregar flag `hasHydrated: boolean` al store. `hydrate()` retorna early si ya está hidratado. Reset en `logout()` para permitir re-hidratación al login.
  - **Archivo**: `src/stores/authStore.ts`

  **Fix 2: Service Worker deshabilitado en dev** *(2026-06-12)*
  - **Diagnóstico**: El Service Worker estaba habilitado en dev con `devOptions.enabled: true`. El SW cacheaba agresivamente el bundle JS. Aunque el código se arreglara, el navegador seguía ejecutando la versión vieja del cache. Hard refresh funcionaba porque forzaba la actualización.
  - **Fix**: `devOptions.enabled: false`. Comentario explicando que para testear push notifications en dev hay que cambiarlo temporalmente.
  - **Tradeoff**: Push notifications no testeables en dev (workbox solo en prod).
  - **Beneficio secundario**: HMR funciona siempre, sin confusión con cache.
  - **Archivo**: `vite.config.ts`

  **Fix 3: `useCountdown` infinite render loop** *(2026-06-12) — EL BUG REAL*
  - **Diagnóstico**: El screenshot del DevTools del usuario fue oro puro. Mostraba `Maximum update depth exceeded` con stack trace `useCountdown.ts:43` (después `useCountdown.ts:53`). Causa raíz:
    1. En `MatchStatusBar.tsx`: `const kickoffDate = new Date(kickOff); const kickoffCountdown = useCountdown(kickoffDate, 30_000);` — el `new Date(kickOff)` se recreaba en cada render.
    2. En `useCountdown.ts`: las deps del `useEffect` incluían `targetDate` (Date object). React compara deps por referencia. `targetDate` cambiaba de referencia en cada render → useEffect se re-ejecutaba → `setState(calculate(targetDate))` retornaba objeto NUEVO → React veía cambio de state → re-render → loop.
  - **Fix**: Extraer `const targetTime = targetDate ? targetDate.getTime() : null;` (number) en cada render. Usar `[targetTime, intervalMs]` como deps del useEffect. Numbers comparan por valor (`Object.is(5, 5) === true`), no por referencia.
  - **Archivo**: `src/hooks/useCountdown.ts` (re-escrito completo).

  **Fix 4: `PredictionSlide` callback prop infinite loop** *(2026-06-12)*
  - **Diagnóstico**: Cuando el usuario abrió el MatchSheet, el error volvió pero en otro lugar: `PredictionSlide.tsx:55` (llamado desde `MatchSheet.tsx:45` y `PredictionCarousel.tsx:101`). Causa: el callback `onDirtyChange` se recreaba en cada render del padre (`PredictionCarousel`):
    ```ts
    onDirtyChange={
      onSlideDirtyChange
        ? (isDirty) => onSlideDirtyChange(tournament.id, isDirty)  // ← nueva función cada render
        : undefined
    }
    ```
    useEffect con `[isDirty, onDirtyChange]` → cuando el padre re-renderizaba, `onDirtyChange` era NUEVA referencia → useEffect se ejecutaba → llamaba al callback → setState en el padre → re-render → loop.
  - **Fix**: Patrón universal con `useRef`:
    ```ts
    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => { onDirtyChangeRef.current = onDirtyChange; });  // sin deps, solo sync
    useEffect(() => { onDirtyChangeRef.current?.(isDirty); }, [isDirty]);  // solo [isDirty]
    ```
  - **Archivo**: `src/components/match/PredictionSlide.tsx`

  **Verificación final**: 134/134 tests pasando, 0 errores en consola del navegador después de hard refresh, nav navega desde cualquier ruta a cualquier otra ruta sin delays.

- [x] **Lecciones aprendidas** *(2026-06-12)*

  **Lección 1: Date objects en deps de useEffect son un foot-gun**
  - **Convención**: Cualquier hook que reciba `Date` (o cualquier objeto mutable) en props/deps es susceptible a infinite loops si el padre los recrea en cada render.
  - **Solución estándar**: Extraer el valor primitivo (`getTime()` para Date) en cada render y usar eso en las deps.
  - **Aplicado en**: `src/hooks/useCountdown.ts` (JSDoc explica el "por qué").

  **Lección 2: Callback props en deps de useEffect son un foot-gun**
  - **Convención**: Cualquier callback prop en deps de useEffect puede causar infinite loop si el padre lo recrea en cada render (que es el caso común con callbacks inline como `onClick={() => ...}`).
  - **Solución estándar**: Usar `useRef` para el callback y dejar las deps solo con valores estables (primitivos, useState, useMemo).
  - **Aplicado en**: `src/components/match/PredictionSlide.tsx` (JSDoc explica el "por qué").

- [x] **Sprint 1: Match Bottom Sheet Enriquecido (Eventos + Formaciones)** *(2026-06-13)*

  Refactor profundo del `MatchSheet` para exponer las 3 fuentes de datos que ya existían en `MatchDetailsTabs` (eventos, stats, formaciones) como tabs de primera clase, con un fallback determinístico de mocks solo en DEV.

  - [x] **F10: Unificación de 4 tabs con lazy-mount y keyboard nav**
    - 4 tab components independientes en `src/components/match/tabs/` (`PronosticosTab`, `EventosTab`, `StatsTab`, `FormacionesTab`).
    - `SheetTabBar` con 4 tabs icon-stack (icono + label 9px) que caben en 320px sin scroll.
    - Lazy mount con `Set<SheetTabId>` en `MatchSheet` para no computar stats/lineups hasta que se necesitan.
    - Tab default dinámico: `Pronósticos` si upcoming, `Eventos` si live/finished.
    - Accesibilidad: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `aria-labelledby`, navegación con ← → Home End.
    - Animación `tabContentEnter` (150ms cross-fade) entre tabs.
    - **Eliminado** `MatchDetailsTabs.tsx` (814 líneas) tras migración de `MatchCard.tsx`.

  - [x] **F1: Resumen de eventos (pills)**
    - `EventSummaryBar` con 4 pills base (gol/amarilla/roja/cambio) + 5to VAR condicional.
    - Layout `grid-cols-4 gap-2`, stagger 50ms entre pills.
    - Iconos Material Symbols + colores semánticos desde tokens CSS.
    - Accesibilidad: `role="group"`, `aria-label` por pill ("2 goles", "3 amarillas").
    - Helper puro `getEventSummary()` en `lib/eventHelpers.ts`.

  - [x] **F2: Agrupación de eventos por período (1T/2T/ET/PEN)**
    - `PeriodSeparator` con chip centrado entre 2 líneas horizontales sutiles.
    - Solo se muestra si el período tiene ≥1 evento.
    - Convención de fútbol: `45+3` sigue siendo 1T, `90+5` sigue siendo 2T.
    - Animación `periodSepEnter` (250ms scaleX 0.8→1).
    - Helpers puros: `getEventPeriod()`, `getPeriodLabel()`, `groupEventsByPeriod()`.
    - Hook `useEventPeriods` con memoización.

  - [x] **F6: Pins de formación coloreados por posición (G/D/M/F)**
    - Mapeo de posición a color: G=gold, D=cyan, M=pitch-green, F=error.
    - Tamaño subido de 24px a 28px (mobile) / 32px (desktop).
    - `aria-label` descriptivo: "Arquero número 1, Martínez".
    - A11y: redundancia textual (no depender solo del color).
    - Daltónicos OK por luminancia distinta de los 4 colores.

  - [x] **F11: Cambios emparejados (entra ⬆ / sale ⬇)**
    - Verificada convención de API-Football en `poll-scores/index.ts:864`: `playerName = entra`, `assistName = sale`.
    - `SubstitutionPairRow` con card dashed sky, 2 rows (sale arrow_outward rojo / entra arrow_inward verde).
    - Helper `pairSubstitutions()` empareja substitutions del mismo equipo y mismo minuto (±1 min tolerancia).
    - Discriminador de tipo con `isSubPair()` para type safety.
    - Animación `subPairEnter` (350ms slide-up + stagger interno 30ms).

  - [x] **Refactor: `useMockMatchData` hook con guard de producción**
    - Hook extrae los 216 líneas de generadores mock determinísticos.
    - **Guard crítico** `import.meta.env.DEV`: en producción, retorna `null` (no muestra stats/lineups inventados a usuarios reales).
    - PRNG determinístico (Mulberry32) seeded por `match.id` → mismos mocks en cada render.
    - 6 stats mock (possession, shots, corners, fouls, passes).
    - 2 formaciones posibles (4-3-3 o 4-4-2) con 11 titulares + 5 suplentes + DT.
    - Tag discreto `DEMO` en los tabs que muestran mocks.
    - 7 tests nuevos verifican guard con `vi.stubEnv("DEV", false)`, determinismo, y fallback solo en DEV.

  - [x] **Tests añadidos**: 32 nuevos (15 eventHelpers + 10 periodHelpers + 7 useMockMatchData) → **173/173 pasando**
  - [x] **TypeScript**: 0 errores
  - [x] **Build**: sin cambios (sigue compilando OK)

  **Archivos nuevos (15):**
  - `src/lib/eventHelpers.ts` (228 líneas)
  - `src/lib/periodHelpers.ts` (99 líneas)
  - `src/hooks/useEventPeriods.ts` (16 líneas)
  - `src/hooks/useMockMatchData.ts` (270 líneas)
  - `src/__tests__/eventHelpers.test.ts` (15 tests)
  - `src/__tests__/periodHelpers.test.ts` (10 tests)
  - `src/__tests__/useMockMatchData.test.ts` (7 tests)
  - `src/components/match/tabs/PronosticosTab.tsx`
  - `src/components/match/tabs/EventosTab.tsx`
  - `src/components/match/tabs/StatsTab.tsx`
  - `src/components/match/tabs/FormacionesTab.tsx`
  - `src/components/match/tabs/index.ts`
  - `src/components/match/SheetTabBar.tsx`
  - `src/components/match/SheetActions.tsx`
  - `src/components/match/CardDetailsTabs.tsx` (inline en `MatchCard.tsx`)

  **Archivos modificados (4):**
  - `src/lib/types.ts` (+12 líneas: `SheetTabId`, `SheetTabDef`)
  - `src/index.css` (+60 líneas: 24 tokens, 5 keyframes, 5 utility classes)
  - `src/components/match/MatchSheet.tsx` (refactor completo con lazy-mount)
  - `src/components/match/MatchCard.tsx` (migración a `CardDetailsTabs` local)

  **Archivos eliminados (1):**
  - `src/components/match/MatchDetailsTabs.tsx` (814 líneas → 4 archivos modulares)

  **Pendientes para Sprint 2** (próximas sesiones):
  - F4: Stats completas (15-20 en vez de 6) con config de mapeo dinámico
  - F3: Animación "nuevo evento" en vivo con `useNewEvents` (badge pulsante)
  - F9: Click en pin → popover con detalle del jugador (parcialmente abordado — la foto ya está en el pin)
  - F14: Mini-timeline en el header del sheet (barra 0-90' con dots)

- [x] **Sprint 2: Player Photos en Formaciones** *(2026-06-14)*

  Reconstrucción visual del `TacticalPlayerPin` en el `FormacionesTab` del Match Bottom Sheet: los pines de la cancha ahora muestran la **foto circular** del jugador (de API-Football CDN), **border de color** por posición (G=gold, D=cyan, M=verde, F=rojo — heredado de Sprint 1 F6), **badge del número de camiseta** en la esquina superior derecha, y fallback a iniciales con `getPlayerInitials()` cuando la foto no está disponible.

  ### Decisiones del usuario

  1. **Plan Pro de API-Football** (sin límite de cuota, $19/mes con 7500 req/día) — habilita el +1 call por partido sin riesgo.
  2. **Implementación inmediata** (no esperar al Sprint 2/3 original del roadmap).
  3. **Reconstrucción visual** del pin con foto + número (en vez del F9 original que era foto solo en popover al click).
  4. **Aceptó el ALTER TABLE manual** que se aplicó en Supabase para agregar `matches.player_photos`.

  - [x] **Endpoint nuevo de API-Football: `GET /fixtures/players?fixture=X`**
    - Devuelve stats individuales + foto de cada jugador que participó en el partido.
    - URL de foto expuesta: `https://media.api-sports.io/football/players/{player_id}.png` (PNG ~150x200px headshot/busto, **URL completa**, no requiere 2da llamada).
    - 1 call extra por partido (incremento de +25-33% en quota — irrelevant con plan Pro).

  - [x] **Edge Function `poll-scores`: nuevo fetch a `/fixtures/players`**
    - Variable `player_photos` declarada al inicio del loop por partido (línea ~755): `let player_photos = existingMatch?.player_photos || [];` — sigue el mismo patrón que `stats` / `lineups` / `events`.
    - Bloque de fetch (líneas ~875-915): llamada a `/fixtures/players?fixture=X` con delay 100ms (mismo rate-limiting que los otros endpoints). Try/catch independiente con `console.error` — un fallo aquí no rompe el upsert del match.
    - Aplanamiento de la estructura anidada: `response[].players[].player` → array plano `[{ player_id: number, photo: string }]`.
    - Guard `needsPlayerPhotos`: solo se ejecuta si `isLive || isNewlyFinished || (mappedStatus === "finished" && (!player_photos || player_photos.length === 0))`. Garantiza backfill automático de partidos finalizados sin fotos.
    - `player_photos` agregado al `matchPayload` (línea ~938) para que se persista en el upsert.

  - [x] **DB: nueva columna `matches.player_photos JSONB`**
    - SQL ejecutado **manualmente** por el usuario en el panel SQL de Supabase (no parte del deploy automatizado):
      ```sql
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_photos JSONB DEFAULT '[]'::jsonb;
      COMMENT ON COLUMN matches.player_photos IS 'Map de player_id → photo URL. Estructura: [{ player_id: number, photo: string }]';
      ```
    - Decisión arquitectónica: JSONB en lugar de tabla separada (ver "Decisiones de diseño" abajo).
    - Se ejecutó `NOTIFY pgrst, 'reload schema';` para refrescar PostgREST.

  - [x] **Helpers nuevos en `src/lib/playerHelpers.ts`** (4 funciones puras, 82 líneas)
    - `buildPhotoMap(photos)`: retorna `Map<player_id, photo_url>` para lookups O(1). Ignora entries sin `player_id` o sin `photo`.
    - `getPlayerPhoto(playerId, photos)`: lookup O(n) simple. Retorna `null` si no encuentra.
    - `enrichLineupsWithPhotos(lineups, photos)`: **inmutable**, retorna nuevo array de lineups con `photo` en cada `TacticalPlayerInfo.player`. Preserva `photo` existente si no hay en el map. Si `lineups` es null/undefined/array vacío → `null`. Si no hay `photos` → retorna los mismos `lineups` sin modificar.
    - `getPlayerInitials(name)`: "Lautaro Martínez" → "LM", "Ederson" → "E", "Cristiano Ronaldo dos Santos Aveiro" → "CA" (primera + última palabra). Trim de whitespace, mayúsculas.

  - [x] **Rebuild visual del `TacticalPlayerPin`** (`src/components/match/tabs/FormacionesTab.tsx`)
    - Tamaño del pin: 32px (mobile `w-8 h-8`) / 36px (desktop `md:w-9 md:h-9`) — antes era 24px.
    - Foto circular con `object-cover`, `border-2` y color de borde por posición (helper `getPosBorderClass`).
    - Badge del número de camiseta: absolute `-top-1 -right-1`, `min-w-[18px] h-[18px]`, fondo con `pinColors`, `tabular-nums`, `font-black`.
    - Fallback sin foto: iniciales renderizadas con `font-stat-value text-[11px] md:text-[12px] font-black`.
    - `loading="lazy"` en `<img>` para no bloquear el render inicial del sheet.
    - `aria-label` completo preservado: "Arquero número 1, Martínez" (sigue siendo accesible para screen readers).
    - Nombre del jugador debajo sin cambios (`font-label-caps`, truncado a 8 chars + ".").

  - [x] **Tipos nuevos en `src/lib/types.ts`**
    - `PlayerPhoto` interface: `{ player_id: number; photo: string }`.
    - `TacticalPlayerInfo.player.photo?: string | null` (campo opcional para soportar fallback).
    - `Match.playerPhotos?: PlayerPhoto[]` (campo opcional, no rompe partidos sin fotos).

  - [x] **Parsing en `mapDbMatchToFrontend`** (`src/lib/api/matches.ts`)
    - Import del tipo `PlayerPhoto`.
    - Parsing del campo `m.player_photos` con la misma técnica que `events`/`stats`/`lineups`: si es string → `JSON.parse`, si es objeto → lo usa directo. Default `undefined` si la columna es null.

  - [x] **Tests añadidos**: 25 nuevos en `src/__tests__/playerHelpers.test.ts`:
    - 5 tests `buildPhotoMap` (null, undefined, array vacío, válido, ignora inválidos)
    - 5 tests `getPlayerPhoto` (null, undefined, vacío, encuentra, no encuentra)
    - 10 tests `enrichLineupsWithPhotos` (null, undefined, vacío, sin fotos, enriquece, preserva existente, inmutabilidad, múltiples lineups, fallback a photo existente)
    - 5 tests `getPlayerInitials` (LM, E simple, string vacío, whitespace, lowercase)
  - [x] **Total tests**: **198/198 pasando en 14 archivos** (173 anteriores + 25 nuevos)
  - [x] **TypeScript**: 0 errores
  - [x] **Build**: sin cambios (sigue compilando OK)
  - [x] **Linter (Biome)**: sin warnings nuevos

  **Archivos nuevos (2):**
  - `src/lib/playerHelpers.ts` (82 líneas, 4 funciones puras con JSDoc)
  - `src/__tests__/playerHelpers.test.ts` (231 líneas, 25 tests)

  **Archivos modificados (4):**
  - `supabase/functions/poll-scores/index.ts` (+60 líneas: declaración `player_photos`, bloque fetch #4, campo en `matchPayload`)
  - `src/lib/types.ts` (+15 líneas: `PlayerPhoto` interface, `Match.playerPhotos`, `TacticalPlayerInfo.player.photo` opcional)
  - `src/lib/api/matches.ts` (+6 líneas: import `PlayerPhoto`, parsing en `mapDbMatchToFrontend`)
  - `src/components/match/tabs/FormacionesTab.tsx` (refactor: `TacticalPlayerPin` rebuild con foto + badge + iniciales, helper `getPosBorderClass`)

  **Cambios en DB (1, manual por el usuario):**
  - `matches.player_photos JSONB DEFAULT '[]'::jsonb` con COMMENT descriptivo.

  ### Bugs corregidos durante el Sprint 2

  1. **Test con IDs duplicados** *(mismo día)*: El test "enriquece múltiples lineups (home + away)" usaba los mismos `player_id`s (1, 2, 3) para ambos equipos. El test pasaba pero las assertions no distinguían bien a qué lineup correspondía cada foto (un bug enmascarado). **Corrección**: IDs únicos (Boca 1-3, River 11-13) para que las assertions de cada lineup sean inequívocas.
  2. **Retorno de array vacío en `enrichLineupsWithPhotos([])`** *(mismo día)*: Inicialmente retornaba `[]` cuando `lineups` era array vacío. Inconsistente con el contrato documentado del helper ("retorna null si no hay lineups") y con el empty state del `FormacionesTab` (`if (!lineups || lineups.length < 2) → EmptyState`). **Corrección**: ahora retorna `null` para los 3 casos (null, undefined, []) → 1 test ajustado.

  ### Backfill strategy para partidos existentes

  Para poblar `player_photos` en partidos ya finalizados en la DB que no tengan fotos (ej: `api_match_id=1489372`):
  1. Invocar `poll-scores` con la competencia que contiene el partido: `?league=1&season=2026` (para Copa del Mundo).
  2. El guard `needsPlayerPhotos` detectará `(!player_photos || player_photos.length === 0)` y gatillará el fetch automático.
  3. El `matchPayload` se construye con el `player_photos` poblado y se hace upsert.
  4. Los partidos nuevos se actualizarán automáticamente con la próxima invocación del cron (no requiere acción manual).

  ### Decisiones de diseño clave

  1. **JSONB en lugar de tabla separada `match_players`**: la cantidad de jugadores por partido es acotada (≤30 entre titulares y suplentes) y siempre se consulta completa, lo que hace innecesaria una tabla relacional con FK. Reduce JOINs, simplifica el upsert y mantiene la foto atómica al partido. Si en el futuro se quiere indexar por player_id, se puede migrar a tabla y mantener la API del helper.
  2. **Foto + badge número directamente en el pin (no popover)**: en vez del F9 original (popover al hacer click), optamos por reconstruir el pin para mostrar la foto y el número directamente. Razón: el pin ya es un elemento visual y la cara del jugador es la info primaria; agregar un popover introducía fricción extra para mostrar la foto que ya querés ver primero. F9 sigue en el backlog si se quiere agregar interactividad.
  3. **Fallback a iniciales (no logo del equipo)**: cuando no hay foto, las iniciales son más representativas del jugador individual que el escudo del equipo. Además son renderizables sin recursos externos y no fallan en offline.
  4. **Inmutabilidad del helper `enrichLineupsWithPhotos`**: siempre retorna nuevos arrays/objetos (nunca muta el input). Esto permite que React detecte cambios de referencia y haga re-render correctamente. Tradeoff: 1 alloc extra por enrich, pero el costo es despreciable (≤30 jugadores por partido).
  5. **Verificación del endpoint de API-Football**: se confirmó que `/fixtures/players` expone `player.photo` como URL completa al CDN (`media.api-sports.io/football/players/{id}.png`), no como un path relativo. Esto evita 1 llamada extra para resolver la URL.
  6. **Tamaños de pin diferenciados mobile/desktop**: 32px/36px (antes 24px uniforme) — se ajustó para que la foto + badge del número sean legibles en mobile sin solaparse con la línea de la cancha.
  7. **`useMockMatchData` con mocks en DEV**: en DEV el `FormacionesTab` consume los mocks (que ya tenían `photo: null` por jugador). El helper `enrichLineupsWithPhotos` no se ejecuta sobre mocks porque el flujo es `useMockMatchData → lineups directo → TacticalPlayerPin` (los mocks bypassean el enrichment). En producción con datos reales de Supabase, el enrichment se aplica en el lado del cliente al renderizar.

---

## Sprint 3: Optimización de API-Football — Batch Fetch, Coverage e Image Cache *(2026-06-14)*

**Resumen**: Reducir drásticamente el consumo de cuota de API-Football pasando de 4 fetches por partido a 1 batch cada 20 partidos, agregar chequeo de coverage por liga/season para evitar requests inútiles, e introducir cache local de imágenes con la Cache API del browser. Impacto neto: de ~1.200 calls/día (16% cuota Pro) a ~300 calls/día (4% cuota Pro).

### Features implementadas

- [x] **#1 — Batch fetch con `/fixtures?ids=` en Edge Function**
  - Archivo: `supabase/functions/poll-scores/index.ts`
  - Refactor: 4 fetches separados por partido (`/statistics`, `/lineups`, `/events`, `/players`) → 1 fetch cada 20 IDs a `/fixtures?ids=X-Y-Z` (disponible desde v3.9.2 de la API).
  - 3 fases en el refactor:
    - **Phase A (decision pass)**: pre-query a DB, se construye `decisions[]` con flags `needsStats/Lineups/Events/PlayerPhotos`.
    - **Phase B (batch fetch)**: chunks de 20 IDs, se construye `Map<id, data>`.
    - **Phase C (helper)**: `processBatchDataForFixture()` extrae los 4 tipos.
    - **Phase D (upsert)**: itera decisiones, extrae del batch, hace upsert.

- [x] **#2 — CDN Helpers para logos/fotos**
  - Archivo NUEVO: `src/lib/cdnHelpers.ts` (44 líneas).
  - 6 helpers: `leagueLogoUrl`, `teamLogoUrl`, `playerPhotoUrl`, `coachPhotoUrl` (typo oficial `coachs`), `venueImageUrl`, `countryFlagUrl` (SVG).
  - Constante: `CDN_BASE = "https://media.api-sports.io/football"`.
  - Patrones predecibles de URL que no requieren llamada extra a la API.

- [x] **#3 — Rate limit logging en Edge Function**
  - Cada batch loggea: `[poll-scores] ids chunk N/M status=200 daily-remaining=X min-remaining=Y`.
  - Headers inspeccionados: `x-ratelimit-requests-remaining` y `X-RateLimit-Remaining`.
  - Permite detección temprana de throttling y alertas de cuota.

- [x] **#4 — Coverage Check por liga/season**
  - Nueva tabla SQL (ejecutada en prod): `league_coverage` con PK `(league_id, season)`.
  - 3 funciones helper en Edge Function:
    - `syncLeagueCoverage(key, supabase)`: 1 call por liga stales, upsert con campo `coverage` de `/leagues`.
    - `loadCoverageCache(supabase)`: carga todo en `Map<`${leagueId}-${season}`, coverage>`.
    - `isFeatureAvailable(map, leagueId, season, feature)`: retorna `true` si no hay info (fail-open).
  - Integración en `processBatchDataForFixture`: chequea `isFeatureAvailable()` antes de procesar cada feature.
  - Constante: `COVERAGE_FRESH_MS = 24 * 60 * 60 * 1000` (24h TTL).
  - Log: `[poll-scores] Synced coverage for N league/seasons`.

- [x] **#5 — Local Image Cache (Cache API del browser)**
  - Archivo NUEVO: `src/lib/imageCache.ts` (220 líneas).
  - Usa la **Cache API nativa** (NO Service Worker, NO librerías externas).
  - TTL: 7 días. `MAX_ENTRIES = 500`, eviction FIFO al 80% de capacidad.
  - Constantes: `CACHE_NAME = "prodear-image-cache"`, `TTL_MS = 7 * 24 * 60 * 60 * 1000`.
  - Funciones expuestas:
    - `getCachedImage(url, options)`: retorna blob URL cacheado o URL original si miss.
    - `clearImageCache()`: util para debug.
    - `useCachedImage(url, options)`: hook React con estado de carga.
  - Integración: `FormacionesTab.tsx` → `TacticalPlayerPin` ahora usa `useCachedImage(photo)`.

### Métricas de impacto

| Métrica | Sprint 2 | Sprint 3 | Delta |
|---|---|---|---|
| Calls/día (cron 10 min) | ~1.200 | **~300** | −75% |
| % cuota Plan Pro (7.500/día) | 16% | **4%** | −12 pp |
| Fetches por partido en vivo | 4-5 | **1 cada 20 partidos** | −95% |
| Cache de imágenes (escudos/fotos) | No | **Sí (7 días, 500 entradas)** | +1 |
| Chequeo de coverage por liga | No | **Sí (sync diaria)** | +1 |
| Archivos nuevos | 16 | **18** | +2 |
| Archivos modificados | 8 | **10** | +2 |
| Tablas DB nuevas | 1 | **2** | +1 |
| Helpers puros nuevos | 11 | **17** | +6 |

### Decisiones del usuario documentadas

1. **Cobertura en TODAS las ligas** (#4): *"deberíamos hacerlo en todas las ligas ya que hoy la app es pequeña y ahí es lo que sea lo más performante y escalable siempre"*. Razón: la app es chica, el costo de un fetch extra de `/leagues` para todas las ligas activas es marginal comparado con el beneficio de nunca pedir features no soportadas. Se eligió el approach fail-open (`isFeatureAvailable` retorna `true` cuando no hay info) para no romper ligas recién agregadas a la DB.
2. **Image Cache escalable** (#5): *"Hoy las imágenes no tardan en cargar pero la idea es que esto sea escalable"*. Se optó por Cache API nativa del browser (en lugar de Service Worker) por simplicidad operativa: no requiere infra adicional, no interfiere con HMR en dev, y se limpia sola con TTL.

### Archivos del Sprint 3

**Nuevos (2):**
- `src/lib/cdnHelpers.ts` (44 líneas, 6 funciones puras con JSDoc).
- `src/lib/imageCache.ts` (220 líneas, Cache API + eviction FIFO + hook React).

**Modificados (2):**
- `supabase/functions/poll-scores/index.ts` (refactor mayor: 4 fetches → 1 batch, ~120 líneas agregadas/modificadas, 3 funciones helper nuevas).
- `src/components/match/tabs/FormacionesTab.tsx` (`TacticalPlayerPin` ahora consume `useCachedImage(photo)`).

**Cambios manuales en DB (1):**
- `CREATE TABLE league_coverage` con PK `(league_id, season)` y 7 flags booleanos.

### Pendientes para Sprint 4

- [ ] Tests unitarios para `cdnHelpers.ts` (6 funciones puras, fácil cobertura).
- [ ] Tests para `imageCache.ts` (mockear `caches.open()` con fake-indexeddb o similar).
- [ ] Tests de integración para el nuevo flujo batch en `poll-scores` (mockear fetch de Deno).
- [ ] Monitoreo: armar dashboard en Supabase o script que alerte si `daily-remaining < 1000`.
- [ ] Considerar mover la sincronización de `league_coverage` a un cron diario separado (ahora se hace en el primer poll del día).
- [ ] Evaluar migración de `coachPhotoUrl` a `coach_photo_url` (typo oficial `coachs` está en todos lados, pero la columna en DB sigue el snake_case normal).
- [ ] Refactor: extraer el helper `processBatchDataForFixture` a un módulo separado para testeo aislado.

---

## Feature: Abreviación de Nombres en Formaciones *(2026-06-16)*

Iteración UX post-Sprint 3 sobre el `FormacionesTab` del Match Bottom Sheet. Los nombres de los jugadores se muestran en formato `"Inicial. Apellido"` (`"Lionel Messi" → "L. Messi"`) para mejorar la legibilidad en la cancha (~480px) y en el panel de suplentes mobile.

### Resumen

- **Formato**: `"X. Apellido"`. 1 palabra → tal cual. Idempotente (nombres ya abreviados se respetan). Soporta partículas en apellidos italianos, holandeses, alemanes, franceses (`"Á. Di María"`, `"F. de Jong"`).
- **Aplicado en**: 11 titulares (pins tácticos) + lista de suplentes (HOME y AWAY).
- **NO aplicado en**: nombres de DTs/coaches (siguen completos), `aria-label` del pin (sigue completo para a11y).
- **Microinteracción**: `title={name}` HTML nativo en el pin → tooltip con nombre completo al hover/tap largo.

### Archivos

**Nuevos (0) / Modificados (3):**
- `src/lib/playerHelpers.ts` (+99): helper `getShortPlayerName` + set `LASTNAME_PARTICLES` (22 partículas) + helper privado `extractLastName`.
- `src/components/match/tabs/FormacionesTab.tsx` (+18 / −8): import del helper, 3 call-sites, `title` + `cursor-help` en el pin.
- `src/__tests__/playerHelpers.test.ts` (+102): nuevo `describe("getShortPlayerName")` con 22 casos.

### Decisiones de diseño

1. **Helper puro con detección de partículas**: la lista `LASTNAME_PARTICLES` cubre 5 idiomas (es/pt, it, nl, de, fr) con 22 partículas. Crítico para italianos (`"Di María"`) y holandeses (`"de Jong"`).
2. **Idempotencia explícita**: regex `/^[\p{L}]\.\s/u` para detectar nombres ya abreviados y NO re-abreviar (`"A. Di María"` → `"A. Di María"`).
3. **Tooltip nativo vs Radix**: optamos por `title` HTML nativo (0 JS, 0 deps, accesible). Radix UI Tooltip queda como trabajo futuro si se quiere estilizar.
4. **NO tocar DTs ni `aria-label`**: la abreviación es puramente visual. Screen readers siguen anunciando el nombre completo. Los DTs son "staff" no jugadores.
5. **Cero cambios de CSS**: se mantiene `font-label-caps`, `text-[11px]`, `max-w-[80px]`, `truncate` en el pin; `text-[10px]`, `flex-1` en suplentes. La grilla de la cancha y la altura del bottom sheet no se ven afectadas.

### Validación

- `npx tsc --noEmit` → 0 errores
- `npx vitest run` → **387/387 tests** (66 en `playerHelpers.test.ts`, 0 regresiones)
- `npm run build` → OK (PWA + service worker)

### Pendientes

- Evaluar Radix UI Tooltip para tooltip estilizado (vs nativo del browser).
- Reveal on tap-and-hold para mobile (cross-fade abreviado ↔ completo).
- Considerar abreviación en el tab **Eventos** si la densidad lo justifica.
- Usar `short_name` de la API si está disponible (evitaría el helper).

---

## Resumen Sprint 1-5 + FIX-1 *(2026-06-12 a 2026-06-23)*

**Estado consolidado al cierre del feature Bracket Completo + Liga de Terceros** (7 commits locales, sin push):

- ✅ **Sprint 1+2+3+4** (commit `96736f9`): Lógica pura + 5 componentes visuales + integración en /ligas + Tournament + PositionsView
- ✅ **FIX-1** (commit `2c7c8b3`): Quitada columna "ESTADO" redundante de la Liga de 3ros (los colores + línea roja son suficientes)
- ✅ **Sprint 5A** (commit `bfb736e`): Selector de competiciones escalable (trigger + panel) + filtro de amistosos (migration 0007)
- ✅ **Sprint 5B** (commit `629d4d4`): Pills separadas en /ligas (GRUPOS | LIGA 3ROS (X/12) | LLAVES (X/16))
- ✅ **Sprint 5C** (commit `a36d70b`): Navegación con flechas en el bracket (URL params `?round=`, 16vos solo der, Final solo izq)
- ✅ **Sprint 5D** (commit `f18e99c`): CHANGELOG.md con todas las entradas
- ✅ **biome style** (commit `b223745`): Fixes automáticos de formato

**Tests**: 528/528 pasando en 32 archivos. **TypeScript**: 0 errores. **Build**: OK.

### Decisiones del usuario aplicadas

1. Selector escalable → trigger + panel (NO bottom sheet, NO Radix Popover)
2. Filtro de amistosos → columna DB `is_friendly` (NO heurística runtime)
3. State de pills del bracket → URL params `?round=` (NO useState local)
4. Posición de flechas en mobile → header variant (NO bottom-fixed)
5. CHANGELOG → creado en raíz (formato Keep a Changelog)

### Migration SQL pendiente (te toca a vos)

```sql
-- 0006_bracket_stages.sql (YA aplicada según conversación previa)
-- 0007_competitions_is_friendly.sql (NUEVA, pendiente de aplicar)
--   ALTER TABLE competitions ADD COLUMN is_friendly boolean DEFAULT false;
--   UPDATE competitions SET is_friendly = true WHERE LOWER(name) LIKE '%amistoso%' OR format IS NULL;
```

### Push al origin (te toca a vos)

```bash
git push origin main
```

### Próximos pasos sugeridos (próximo turno)

1. **Aplicar migration 0007** en Supabase (SQL Editor)
2. **Push manual** de los 7 commits
3. **Smoke test en producción**: abrir /ligas con Mundial → ver 3 pills + selector escalable. Abrir /torneo → tab LLAVES → ver flechas.
4. **Considerar agregar más ligas** (LPF, Premier) — ahora el selector soporta 20+ sin scroll horizontal
5. **Refactor opcional**: `KnockoutBracket.tsx` está marcado `@deprecated` desde Sprint 4. Considerar eliminarlo si nadie lo usa.

---

## Sprint Penales 2026 — UX/UI Polish *(2026-06-28)*

Issues resueltos en el bottom modal de predicción de partido (`PredictionSlide.tsx` + `index.css`):

- [x] **Issue 1**: Highlight visual del selector de penales cuando hay empate en playoffs (`src/components/match/PredictionSlide.tsx:257-313`). Dos estados: "atención" (primary + `pulse-soft` + icono `bolt` + badge "Elegí ganador" con `aria-live="polite"`) y "relajado" (tertiary + icono `military_tech`). `prefers-reduced-motion` respetado en 2 capas (`motion-safe:` + override en `@media`).
- [x] **Issue 2**: Ocultar flechas nativas del `<input type="number">` globalmente en `@layer base` (`src/index.css:170-181`). Cubre `PredictionSlide.tsx:435` y `MatchCard.tsx:848,891` sin tocarlos individualmente.
- [x] Soporte CSS: keyframe `pulseSoft` + clase `animate-pulse-soft` (`src/index.css:593-608`) + entrada en `@media (prefers-reduced-motion: reduce)` (línea 856).

### Pendiente (P1)

- [ ] Considerar si el mismo highlight aplica al `src/components/match/MatchCard.tsx:962-985` cuando `isPlayoffs && isDraw && penaltyWinner === null` — para mantener paridad visual entre card y modal. Por ahora solo se aplicó al `PredictionSlide` del modal, no a las cards inline del dashboard.

### Validaciones

| Check | Resultado |
|---|---|
| `npx tsc -b --noEmit` | ✅ 0 errores |
| `npm test` | ✅ 720 passing, 6 fallos pre-existentes (todos `isFeatureEnabled("BRACKET_V2")` en `hotfixT0`, `worldCupGroups`, `PositionsView`; confirmados pre-existentes con `git stash` + test) |
| `biome check` (archivos modificados) | ⚠️ Solo warnings de `!important` (consistentes con patrón existente en `index.css`) |

### Archivos modificados

```
M src/components/match/PredictionSlide.tsx  (+30 / -3)
M src/index.css                              (+34 / 0)
M task.md                                    (esta entrada)
M CHANGELOG.md                               (entrada [Unreleased] arriba de Sprint 5)
M walkthrough.md                             (nueva sección "Feature: UX/UI Polish")
```

