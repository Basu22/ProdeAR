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

- [/] **Fase 7: Conexión Real & Testing con Amistosos**
  - [x] Crear proyecto en Supabase Cloud y ejecutar `supabase/schema.sql` en el SQL Editor. (¡Completado! Tablas verificadas en producción)
  - [x] Crear cuenta en API-Sports y obtener la API Key para API-Football.
  - [x] Crear el archivo `.env` o `.env.local` en la raíz del proyecto con las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. (¡Completado! Configurado en `.env.local`)
  - [x] Configurar los secretos `API_FOOTBALL_KEY` en la Edge Function de Supabase. (¡Completado! Secretos subidos exitosamente)
  - [x] Desplegar la Edge Function `poll-scores` a Supabase. (¡Completado! Edge function activa)
  - [x] Registrar la competencia de Amistosos Internacionales (ID 10) y Copa del Mundo (ID 1) en la tabla `competitions`. (¡Completado! Ligas sincronizadas)
  - [x] Ejecutar el primer polling de partidos amistosos para poblar la base de datos real. (¡Completado! Sincronización exitosa de partidos)
  - [/] Validar flujos reales de apuestas, chat y notificaciones push en producción. (En progreso - Resolviendo RLS circular)
