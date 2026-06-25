-- ============================================================================
-- Migration 0007: Add predictions.predicted_penalty_winner
-- ============================================================================
-- Fecha: 2026-06-23
-- Sprint: Sync DB (sincronización PROD → DEV)
--
-- Contexto (schema drift):
--   En PROD la tabla public.predictions tiene una columna adicional
--   `predicted_penalty_winner TEXT` que no existe en DEV. Detectada el
--   2026-06-23 al intentar correr el sync por primera vez: el `pg_restore`
--   fallaba con "column predicted_penalty_winner does not exist".
--
--   Esta columna se usa en `check_prediction_lock` (trigger) y debería
--   haber sido agregada vía migration anterior (no se hizo, fue un ALTER
--   manual en PROD vía el SQL Editor del dashboard de Supabase).
--
-- Cambios:
--   1. ALTER TABLE public.predictions ADD COLUMN predicted_penalty_winner TEXT
--   2. NOTIFY pgrst, 'reload schema' para refrescar PostgREST
--
-- ============================================================================
-- IDEMPOTENCIA: Esta migración es segura de correr múltiples veces.
-- ============================================================================

-- 1. Agregar la columna faltante
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS predicted_penalty_winner TEXT DEFAULT NULL;

COMMENT ON COLUMN public.predictions.predicted_penalty_winner IS
  'Equipo ganador en la tanda de penales (''home'' | ''away''). Nullable. Se setea en la UI cuando el usuario predice empate en un partido de eliminación directa. Schema drift documentado en sprint Sync DB 2026-06-23.';

-- 2. Refrescar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente después):
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   = 'predictions'
--     AND column_name  = 'predicted_penalty_winner';
--
-- Debería devolver una fila con:
--   data_type: text
--   is_nullable: YES
--   column_default: NULL
-- ============================================================================
