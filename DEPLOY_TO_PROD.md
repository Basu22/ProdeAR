# 🚀 Guía de Deploy a Producción — Feature "Alertas en vivo (Push)"

> Documento de cierre para migrar toda la feature de notificaciones push de TEST → PRODUCCIÓN.
> 
> **Última actualización**: 11 de junio de 2026
> **Feature**: Alertas en vivo (Push) — Fases 0+1+2+3 completas y validadas en TEST DB

---

## 📋 Pre-requisitos

Antes de empezar, asegurate de tener:

- [ ] Acceso a **Supabase Dashboard** del proyecto de **producción** (`cdwefeqlxktliumtaqdc`)
- [ ] **Supabase CLI** instalado y autenticado
- [ ] **VAPID keys** generadas (en TEST ya las tenés, **pero hay que generar NUEVAS para prod**)
- [ ] Backup reciente de la DB de producción (recomendado)

---

## 🔑 Paso 1 — Generar VAPID keys para producción

**Las keys de TEST NO sirven para producción.** Hay que generar nuevas.

```bash
# 1. Generar el par de claves
npm run generate-vapid
```

**Output esperado**:
```
🔐  Generando par de claves VAPID (EC P-256)
🗝️  Clave PRIVADA escrita en: ./.vapid-private.txt (permisos 0600)
✅  Resultado
📦  Clave PÚBLICA VAPID (ya está en .env.local):
   BIXxYz...AbCdEf...
```

El script ya agregó la **pública** a `.env.local`. **PERO** `.env.local` es solo para TEST. La pública para producción va al dashboard de Supabase.

**Guardá los 3 valores** que necesitás:
| Variable | Dónde se usa |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | `.env.local` del frontend (TEST) — ya está |
| `VAPID_PUBLIC_KEY` | Supabase Dashboard → prod → secrets de Edge Function |
| `VAPID_PRIVATE_KEY` | Supabase Dashboard → prod → secrets de Edge Function |
| `VAPID_SUBJECT` | Literal: `mailto:admin@prodear.app` |

```bash
# 2. Borrar la clave privada del filesystem (ya la tenés en el output)
rm .vapid-private.txt
```

---

## 🗄️ Paso 2 — Aplicar migrations a la DB de producción

Andá a **Supabase Dashboard → Proyecto PRODUCCIÓN → SQL Editor → New query**.

### 2.1 — Crear tabla `notification_log` + función RPC

Pegá el contenido de `supabase/migrations/0002_create_notification_log.sql` y corrélo.

**Verificación** post-migration:
```sql
-- Debe retornar: true
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'notification_log'
);

-- Debe retornar: true
SELECT EXISTS (
  SELECT FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = 'get_closure_notification_recipients'
);
```

### 2.2 — Verificar el trigger `check_prediction_lock`

**⚠️ IMPORTANTE**: En TEST DB la función tenía una versión vieja (sin bypass). Verificá en producción:

```sql
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'check_prediction_lock';
```

Si la función dice `IF NOW() >= match_kickoff THEN` (sin bypass) → aplicá la versión correcta (con bypass):

```sql
CREATE OR REPLACE FUNCTION public.check_prediction_lock()
RETURNS TRIGGER AS $$
DECLARE
    match_kickoff TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Permitir actualizaciones que no modifican los pronósticos en sí (ej. cálculo de puntos)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.predicted_home = NEW.predicted_home 
           AND OLD.predicted_away = NEW.predicted_away 
           AND (OLD.predicted_winner IS NOT DISTINCT FROM NEW.predicted_winner) THEN
            RETURN NEW;
        END IF;
    END IF;

    SELECT kick_off INTO match_kickoff
    FROM public.matches
    WHERE id = NEW.match_id;

    IF NOW() >= match_kickoff - INTERVAL '15 minutes' THEN
        RAISE EXCEPTION 'No se pueden registrar o modificar pronósticos menos de 15 minutos antes del inicio del partido.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Si ya tiene la versión con bypass (`IF TG_OP = 'UPDATE' THEN...`) → no tocarla.

### 2.3 — Actualizar `check_and_trigger_poll_scores` (ventana de 75 min)

Pegá y corré:

```sql
CREATE OR REPLACE FUNCTION public.check_and_trigger_poll_scores()
RETURNS VOID AS $$
DECLARE
    has_active_matches BOOLEAN;
    api_url TEXT := 'https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?live=all';
    headers JSONB := jsonb_build_object('Content-Type', 'application/json');
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE
            status = 'live'::match_status
            OR (
                status = 'scheduled'::match_status
                AND kick_off >= NOW() - INTERVAL '4 hours'
                AND kick_off <= NOW() + INTERVAL '75 minutes'
            )
    ) INTO has_active_matches;

    IF has_active_matches THEN
        PERFORM net.http_get(url := api_url, headers := headers);
        RAISE NOTICE 'Sincronización iniciada.';
    ELSE
        RAISE NOTICE 'Sincronización omitida.';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

**Notar**: el `api_url` cambió a producción (`cdwefeqlxktliumtaqdc`).

### 2.4 — Recargar esquema

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 🚀 Paso 3 — Deployar la Edge Function a producción

```bash
# 1. Linkear el CLI a producción (si no lo está)
npx supabase link --project-ref cdwefeqlxktliumtaqdc

# 2. Deployar
npx supabase functions deploy poll-scores
```

**Verificar** que diga:
```
Deployed Functions on project cdwefeqlxktliumtaqdc: poll-scores
                                          ^^^^^^^^^^^^^^^^^
                                          ¡PRODUCCIÓN!
```

---

## 🔐 Paso 4 — Configurar secrets de VAPID en producción

**Supabase Dashboard → Proyecto PRODUCCIÓN → Edge Functions → Secrets → Manage secrets**

Agregá 3 secrets:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | La pública que generaste en Paso 1 |
| `VAPID_PRIVATE_KEY` | La privada que generaste en Paso 1 |
| `VAPID_SUBJECT` | `mailto:admin@prodear.app` |

⚠️ **No confundir**: 
- `VITE_VAPID_PUBLIC_KEY` (frontend) ≠ `VAPID_PUBLIC_KEY` (Edge Function)
- La Edge Function usa **sin** el prefijo `VITE_` (Vite solo expone al cliente las que empiezan con `VITE_`)

---

## 🌐 Paso 5 — Configurar VAPID en el frontend (Vercel)

Andá a **Vercel Dashboard → Proyecto → Settings → Environment Variables**

Configurá la VAPID pública de **producción** (la acabás de generar):

| Name | Value | Environments |
|---|---|---|
| `VITE_VAPID_PUBLIC_KEY` | La pública nueva (producción) | Production, Preview |

⚠️ **No uses la misma VAPID de TEST en producción.** Las subscriptions de TEST no van a funcionar con VAPID de prod y viceversa.

---

## ✅ Paso 6 — Verificación end-to-end en producción

### 6.1 — Probar el toggle de alertas (en la app)

1. Hacé deploy a Vercel (`git push` o `vercel --prod`)
2. Abrí la app en producción
3. Andá al Dashboard
4. Click en el toggle de "Alertas en vivo (Push)"
5. **Debería pedir permiso del browser**
6. Aceptá
7. El toggle debe pasar a `on` (cyan con punto pulsante)

### 6.2 — Probar Fase 3 con simulación

**Insertar partido fake** (en el SQL Editor de producción):
```sql
INSERT INTO public.matches (
    id, competition_id, api_match_id, home_team, away_team,
    matchday, kick_off, stage_name, stage_multiplier, status
) VALUES (
    gen_random_uuid(),
    1, 999999,
    'Boca Juniors', 'River Plate',
    1, NOW() + INTERVAL '45 minutes',
    'Test Fase 3', 1, 'scheduled'
);
```

**Disparar simulación** (desde tu terminal local):
```bash
curl "https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?simulate_closure=30min" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps({k:d.get(k) for k in ['simulated','processedMatches','totalSent','totalSkipped','totalFailed'] if k in d}, indent=2))"
```

**Verificar el log**:
```sql
SELECT type, success, sent_at, payload->>'title' AS title
FROM public.notification_log 
ORDER BY sent_at DESC LIMIT 5;
```

### 6.3 — Limpiar

```sql
DELETE FROM public.matches WHERE api_match_id = 999999;
```

---

## 🗂️ Resumen de archivos modificados/creados

### Nuevos archivos
| Archivo | Propósito |
|---|---|
| `scripts/generate-vapid-keys.mjs` | Genera VAPID keys con Node crypto puro |
| `scripts/dev.sh` | Script todo-en-uno para ambiente local con SW |
| `src/components/notifications/AlertToggle.tsx` | Toggle premium con 4 estados |
| `src/components/notifications/BlockedNotificationsModal.tsx` | Modal de ayuda con detección de browser |
| `src/stores/notificationStore.ts` | Store Zustand del estado de push |
| `src/hooks/useAlertToggleState.ts` | Hook derivador del AlertToggleState |
| `src/service-worker.ts` | SW custom con handlers push + notificationclick |
| `supabase/migrations/0002_create_notification_log.sql` | Tabla + RPC para idempotencia |
| `DEPLOY_TO_PROD.md` | Este documento |

### Archivos modificados
| Archivo | Cambios |
|---|---|
| `package.json` | + scripts: `dev:sw`, `dev:sh`, `generate-vapid` |
| `vite.config.ts` | SW activado en dev (`devOptions.enabled: true`) |
| `tsconfig.app.json` | + `"WebWorker"` lib, exclude SW |
| `index.html` | Removido script de desregistración de SW |
| `.gitignore` | + `.vapid-private.txt` |
| `src/lib/api/push.ts` | Type `SubscribeResult`, timeouts, validación VAPID, idempotencia |
| `src/routes/Dashboard.tsx` | Refactor con notificationStore |
| `src/stores/authStore.ts` | Integración con notificationStore (hydrate/reset) |
| `src/App.tsx` | Listener `visibilitychange` |
| `src/routes/Tournament.tsx` | Deep-link con `?match=<id>` (scroll + highlight) |
| `supabase/schema.sql` | Referencia a `notification_log` |
| `supabase/schema_functions.sql` | Ventana de poll ampliada a 75 min |
| `supabase/functions/poll-scores/index.ts` | `notifyUpcomingClosures()` + simulación |
| `Deploy.md` | Documentación de Fase 3 |

---

## 🚨 Rollback

Si algo sale mal en producción:

```bash
# 1. Re-deployar la versión anterior de la Edge Function
npx supabase link --project-ref cdwefeqlxktliumtaqdc
git checkout HEAD~1 -- supabase/functions/poll-scores/
npx supabase functions deploy poll-scores

# 2. (Opcional) Revertir migration
DROP TABLE IF EXISTS public.notification_log CASCADE;
DROP FUNCTION IF EXISTS public.get_closure_notification_recipients;

# 3. Restaurar función original
# Pegar el contenido original de check_prediction_lock desde git
```

---

## 🎯 Estado final de la feature

| Componente | Estado |
|---|---|
| Service Worker con push + notificationclick | ✅ |
| Toggle con 4 estados (off/on/blocked/loading) | ✅ |
| Persistencia entre sesiones (visibilitychange) | ✅ |
| Modal de ayuda con detección de browser | ✅ |
| notificationStore global (Zustand) | ✅ |
| Deep-link con scroll + highlight | ✅ |
| notifyUpcomingClosures con batching paralelo | ✅ |
| notification_log con UNIQUE para idempotencia | ✅ |
| get_closure_notification_recipients RPC | ✅ |
| Endpoint de simulación | ✅ |
| Validado en TEST DB end-to-end | ✅ |
| Documentación completa | ✅ |

**Feature lista para producción.** 🚀

---

## 🗄️ Sincronización de DB: PROD → DEV

> **Última actualización**: 23 de junio de 2026
> **Sprint**: Sync DB — permite testear sobre datos productivos reales sin tocar PROD

### ¿Para qué sirve?

El script `scripts/sync-prod-to-dev-pgdump.sh` (y su versión previa `scripts/sync-prod-to-dev.sh`) sincroniza la base de datos de **PRODUCCIÓN** (`cdwefeqlxktliumtaqdc`) a la de **DESARROLLO** (`ijscgcpdfwlkgucjrmna`) para poder:

- Probar features nuevas con **datos productivos reales** (usuarios, torneos, partidos, predicciones) sin contaminar PROD.
- Reproducir bugs reportados por usuarios en un entorno idéntico.
- Iterar sobre el comportamiento de UI con datasets grandes (ej: Mundial completo).

**El frontend local sigue apuntando a DEV**, así que después del sync un `npm run dev` usa los datos recién sincronizados sin tocar nada.

### Requisitos

| Dependencia | Para qué se usa | Cómo obtenerla |
|---|---|---|
| **Docker** | correr `pg_dump`/`pg_restore` con la imagen oficial `postgres:17` | [docker.com](https://docker.com) |
| **postgresql-client** (opcional) | solo si querés usar `psql` directo (no es estrictamente necesario porque el script ya envuelve `psql` en Docker) | `apt install postgresql-client` |
| **Bash 4+** | ejecutar el script | ya viene en macOS / Linux |

> **Por qué Docker y no el `pg_dump` del sistema**: el de Postgres 17 oficial garantiza **mismo binario mayor** que el servidor de Supabase (que corre 17.x), evitando el error `server version mismatch` o el clásico `unsupported version`. Además, `--network=host` resuelve problemas de IPv6 que aparecen cuando se intenta conectar a `db.<ref>.supabase.co` desde la red bridge de Docker.

### Setup (una vez)

```bash
# 1. Copiar el template de credenciales
cp scripts/.env.staging.example scripts/.env.staging
chmod 600 scripts/.env.staging

# 2. Editar scripts/.env.staging con los valores reales:
#    - SUPABASE_ACCESS_TOKEN  → https://supabase.com/dashboard/account/tokens
#    - PROD_DB_PASSWORD       → Dashboard PROD → Settings → Database
#    - DEV_DB_PASSWORD        → Dashboard DEV  → Settings → Database
#    (PROD_PROJECT_REF y DEV_PROJECT_REF ya vienen en el example)

# 3. Verificar que Docker esté corriendo
docker ps
```

`scripts/.env.staging` está en `.gitignore` — **NUNCA commitear**.

### Uso

```bash
# Solo auditoría (muestra counts de PROD vs DEV, NO toca nada)
npm run sync:db:audit

# Dry-run (audita + muestra el plan, NO toca nada)
npm run sync:db:dry

# Ejecutar el sync real (pide confirmación)
npm run sync:db

# Sin prompts (CI)
./scripts/sync-prod-to-dev-pgdump.sh --execute --yes

# Solo la auditoría inicial
./scripts/sync-prod-to-dev-pgdump.sh --only-audit
```

### ¿Qué se copia de PROD y qué se preserva de DEV?

| Tabla / Schema | Acción | Notas |
|---|---|---|
| `public.users` | **REEMPLAZADO** con los datos de PROD | ⚠️ Perdés el user de DEV. Para loguearte en DEV después, usá cualquier email de PROD con su contraseña real. |
| `public.competitions` | **REEMPLAZADO** | — |
| `public.tournaments` | **REEMPLAZADO** | — |
| `public.tournament_members` | **REEMPLAZADO** | — |
| `public.matches` | **REEMPLAZADO** | — |
| `public.predictions` | **REEMPLAZADO** | ⚠️ Requiere que exista `predicted_penalty_winner` en DEV (ver "Schema drift" abajo). |
| `auth.users` + `auth.identities` | **REEMPLAZADO** | Necesario para que las FKs de `public.users` se satisfagan. |
| `public.chat_messages` | VACIADA | Estaba vacía en DEV, se trunca y queda vacía. |
| `public.notification_log` | VACIADA | Ídem. |
| `public.push_subscriptions` | VACIADA | Ídem. |
| `public.team_aliases` | **PRESERVADA** (merge) | Los de DEV que no estén en PROD se mergean. |
| `league_coverage`, `match_broadcasters`, `league_standings` | NO SE TOCAN | Vacías en ambas DBs. |
| Estructura de tablas, triggers, RLS policies | NO SE TOCAN | El schema queda como está. |

### Estructura del script (5 fases)

```
FASE 1: Auditoría pre-sync          (counts de PROD vs DEV, FALLA si DRY_RUN)
FASE 2: pg_dump de PROD             (2 dumps separados: public + auth)
FASE 3: Preparar DEV                (TRUNCATE de TODAS las tablas + auth.users CASCADE)
FASE 4: pg_restore en DEV           (auth primero, después public, con TRUNCATE intermedio de public.users)
FASE 5: Validación post-sync        (counts, RLS check, FKs huérfanas, rehabilitar trigger)
```

### Decisiones técnicas clave (lecciones aprendidas)

1. **Dos `pg_dump` separados** (`--schema=public` y `--table=auth.users --table=auth.identities`): `pg_dump` no permite combinar `--schema` y `--table` en la misma invocación (se pisan mutuamente). Por eso el script hace dos dumps y los restaura en orden.
2. **Orden de restore: auth antes que public**: la tabla `public.users` tiene FK a `auth.users.id`, así que `auth.users` + `auth.identities` se restauran PRIMERO, después `public`.
3. **TRUNCATE intermedio de `public.users`**: el trigger `on_auth_user_created` se dispara automáticamente al insertar filas en `auth.users` durante el restore y crea duplicados en `public.users` (con `ON CONFLICT DO NOTHING` no funciona porque las filas del trigger y las del dump tienen la misma PK, pero el orden de inserción puede no garantizar unicidad). Se trunca `public.users` DESPUÉS de restaurar `auth` y ANTES de restaurar `public`.
4. **No se puede `ALTER TRIGGER ... DISABLE`** porque Supabase es el owner de `auth.users` y el role `postgres` de DEV no tiene permisos. Por eso se optó por la estrategia de TRUNCATE intermedio en vez de desactivar el trigger.
5. **`TRUNCATE auth.users CASCADE` al inicio**: necesario porque las FKs de `public.users` apuntan a `auth.users.id`. Sin el `CASCADE` el TRUNCATE fallaría por violación de FK.
6. **Re-habilitar el trigger al final**: el script hace `ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created` después del restore para que los nuevos signups en DEV sigan creando la fila en `public.users` automáticamente.
7. **`--network=host` en Docker**: en algunas distros (Ubuntu 22+, Fedora) Docker por defecto intenta resolver DNS por IPv6 y falla al conectar a `db.<ref>.supabase.co` que es solo IPv4. `--network=host` usa la red del host y bypasea el problema.

### Loguearse en DEV después del sync

Una vez completado el sync, DEV tiene los mismos usuarios que PROD. Para loguearte:

1. Abrí la app en `http://localhost:5173` (o el puerto de Vite).
2. Usá **cualquier email que esté en PROD** y la **contraseña real que tenga ese user en PROD**.
3. Si querés un user de "admin" o tu propio user de DEV, asegurate de que ese user exista en PROD (o crealo primero con sign-up normal en PROD y después sincronizá).

> **Tip**: si querés mantener un user de DEV con credenciales conocidas (ej. `dev@prodear.app / dev1234`), creá ese user primero en PROD con un sign-up normal, después corré el sync, y DEV lo va a tener. **La contraseña es la misma que en PROD** (se copia el hash en `auth.users`).

### ⚠️ Schema drift detectado y cómo resolverlo

El 2026-06-23 descubrimos que la tabla `public.predictions` en DEV **no tiene la columna** `predicted_penalty_winner TEXT` que sí existe en PROD. Esa columna:

- Está en `supabase/schema.sql:117` (debería haber sido agregada vía migration, no fue así).
- Se usa en el trigger `check_prediction_lock` (`supabase/schema.sql:299`).
- Se usa en `poll-scores` (line 1409) para setear `penalty_winner`.

**Antes de correr el sync por primera vez**, aplicá la migration 0007 en DEV:

```sql
-- Pegar en el SQL Editor de DEV (https://supabase.com/dashboard/project/ijscgcpdfwlkgucjrmna)
-- Contenido: supabase/migrations/0007_add_predicted_penalty_winner.sql
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS predicted_penalty_winner TEXT DEFAULT NULL;
NOTIFY pgrst, 'reload schema';
```

Sin esto, el `pg_restore` va a fallar con un error tipo `column "predicted_penalty_winner" does not exist` y el sync se aborta.

### Housekeeping — rotar credenciales

Las credenciales de `.env.staging` (`SUPABASE_ACCESS_TOKEN`, `PROD_DB_PASSWORD`, `DEV_DB_PASSWORD`) son **secretas** y de alto privilegio. Recomendaciones:

- **Rotar cada 3-6 meses** el `SUPABASE_ACCESS_TOKEN` (https://supabase.com/dashboard/account/tokens).
- **Rotar cada 6-12 meses** los passwords de DB (Dashboard → Settings → Database → Reset database password). **Cuidado**: rotar el password invalida el `DATABASE_URL` de Vercel y de cualquier consumer que use la URL directa (usar la de connection pooler `6543` que es estable para la mayoría de los casos).
- Después de rotar, actualizar `scripts/.env.staging` y `Vercel → Environment Variables` si aplica.
- **Nunca commitear** `scripts/.env.staging` ni pegarlo en chats / issues. Si se filtra, rotar inmediatamente.

### Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `server version mismatch` | `pg_dump` del sistema (v16 o menor) contra servidor v17 | Usar el script con Docker (ya lo hace por vos) |
| Docker network unreachable / timeout conectando a `db.<ref>.supabase.co` | IPv6 de Docker bridge | El script ya usa `--network=host`. Si igual falla: `docker run --rm --network=host alpine:17 ping db.<ref>.supabase.co` para debug |
| `ERROR: permission denied to disable trigger on_auth_user_created` | Supabase es owner de `auth.users` | El script NO intenta `DISABLE TRIGGER`. Usa TRUNCATE intermedio. |
| `column "predicted_penalty_winner" does not exist` durante el restore | Schema drift, falta la columna en DEV | Aplicar migration 0007 antes del primer sync (ver arriba) |
| `argument list too long` en Management API script | El script viejo usaba batches de 50 → bajado a 10 | Ya está parcheado. Si volvés a ver esto, re-bajar `BATCH_SIZE=5` en `sync-prod-to-dev.sh` |
| `Argument list too long` en shell durante `pg_restore` | Comando muy largo | El script de pgdump no usa `psql` con strings largas. Si pasa, reportar a @documentacion |

### Limitaciones y trabajo futuro

- **No preserva tu user de DEV**: el sync es un **replace** total de `public.users` + `auth.users`. Si querés mantener tu user de DEV, tenés que crearlo primero en PROD.
- **No preserva `chat_messages` ni `notification_log`**: ambas tablas quedan vacías en DEV después del sync. Esto es intencional (eran ruido en DEV).
- **No migra la password de tu user de DEV si lo creaste manualmente** (fuera de Supabase Auth): tenés que setearla desde el SQL Editor de DEV o usar el flujo "forgot password".
- **Backlog**: integrar el script en un `Makefile` o `task` runner (ahora se ejecuta via `npm run sync:db*`). Evaluar opción de `dbmate` o `pgcopydb` para mayor robustez.

---

## 📞 Próximas sesiones

- **Fase 4** (opcional): Tests con `@qa-engineer` para cubrir:
  - Unit de `pushApi` (subscribe, unsubscribe, idempotencia)
  - Test del SW con push event simulado
  - Test de `permission === "denied"` → modal
  - Test de persistencia entre sesiones
  - E2E del flujo de Fase 3

- **Sync DB — Trabajo futuro**:
  - Tests de integración para el script (`scripts/sync-prod-to-dev-pgdump.test.sh` con BATS o similar)
  - CI hook que corra `--only-audit` semanalmente para detectar schema drift
  - Snapshot del estado de DEV pre/post sync (timing + tamaño de tablas) para auditoría
  - Evaluar `pgcopydb` o `dbmate` como reemplazo del script bash
  - Investigar por qué el `package.json` apunta a `sync-prod-to-dev.sh` (Management API, viejo) en vez de `sync-prod-to-dev-pgdump.sh` (Docker, nuevo). Decidir cuál es el canónico y unificar.
