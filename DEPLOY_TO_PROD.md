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

## 📞 Próximas sesiones

- **Fase 4** (opcional): Tests con `@qa-engineer` para cubrir:
  - Unit de `pushApi` (subscribe, unsubscribe, idempotencia)
  - Test del SW con push event simulado
  - Test de `permission === "denied"` → modal
  - Test de persistencia entre sesiones
  - E2E del flujo de Fase 3
