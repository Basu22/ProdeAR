-- =============================================================================
-- Migration: 0002_create_notification_log.sql
--
-- Crea la tabla `public.notification_log` para idempotencia de push
-- notifications, y la función RPC `get_closure_notification_recipients`
-- que resuelve destinatarios para los recordatorios de cierre de pronóstico.
--
-- Cuándo correr:
--   - Una sola vez, antes de deployar la Edge Function actualizada.
--
-- Cómo correr:
--   1. Supabase Dashboard → SQL Editor → New query → pegar y Run, o
--   2. CLI:        supabase db push   (si tenés el proyecto linkeado), o
--   3. Local:      psql $DATABASE_URL -f supabase/migrations/0002_create_notification_log.sql
--
-- Idempotente: corre las veces que quieras.
-- =============================================================================

-- ── 1. ENUM para tipos de notificación ──────────────────────────────
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'match_finished',          -- Partido finalizado (push con puntos)
        'prediction_closing_30',   -- Faltan 30 min para el cierre (45 min antes kick_off)
        'prediction_closing_5',    -- Faltan 5 min para el cierre (20 min antes kick_off)
        'match_cancelled'          -- Partido cancelado (futuro)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Tabla principal ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    endpoint TEXT,
    success BOOLEAN DEFAULT true NOT NULL
);

-- ── 3. UNIQUE constraint: idempotencia ─────────────────────────────
-- Un usuario recibe máximo 1 notificación por (partido, tipo).
DO $$ BEGIN
    ALTER TABLE public.notification_log
        ADD CONSTRAINT uq_notification_user_match_type
        UNIQUE (user_id, match_id, type);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Índices para queries rápidas ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notification_log_match_type
    ON public.notification_log (match_id, type);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id
    ON public.notification_log (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
    ON public.notification_log (sent_at);

-- ── 5. Row Level Security ──────────────────────────────────────────
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver SU propio historial de notificaciones
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias notificaciones"
    ON public.notification_log;
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
    ON public.notification_log
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- No se crea policy de INSERT/UPDATE/DELETE para `authenticated`:
-- la Edge Function usa SUPABASE_SERVICE_ROLE_KEY que bypasea RLS.

-- ── 6. Función RPC: destinatarios de notificaciones de cierre ──────
-- Retorna 1 fila por (user, tournament) que:
--   - está en un torneo ACTIVO de la competition del match
--   - tiene suscripción push activa
-- DISTINCT ON (user_id) garantiza 1 push por user (tournament_id informativo)
DROP FUNCTION IF EXISTS public.get_closure_notification_recipients(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_closure_notification_recipients(
    p_match_id UUID,
    p_competition_id INTEGER
)
RETURNS TABLE (
    user_id UUID,
    tournament_id UUID,
    has_prediction BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (tm.user_id)
        tm.user_id,
        tm.tournament_id,
        EXISTS (
            SELECT 1 FROM public.predictions p
            WHERE p.user_id = tm.user_id
              AND p.match_id = p_match_id
        ) AS has_prediction
    FROM public.tournament_members tm
    INNER JOIN public.tournaments t ON t.id = tm.tournament_id
    WHERE t.competition_id = p_competition_id
      AND t.status = 'active'::tournament_status
      AND EXISTS (
          SELECT 1 FROM public.push_subscriptions ps
          WHERE ps.user_id = tm.user_id
      )
    ORDER BY tm.user_id, tm.joined_at ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permiso de ejecución al rol authenticated
GRANT EXECUTE ON FUNCTION public.get_closure_notification_recipients(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_closure_notification_recipients(UUID, INTEGER) TO service_role;

-- =============================================================================
-- Verificación post-creación (opcional, correr aparte):
--
--   SELECT EXISTS (
--     SELECT FROM information_schema.tables
--     WHERE table_schema = 'public'
--     AND table_name = 'notification_log'
--   );
--
--   SELECT EXISTS (
--     SELECT FROM information_schema.routines
--     WHERE routine_schema = 'public'
--     AND routine_name = 'get_closure_notification_recipients'
--   );
--
-- Deberían retornar: true / true
-- =============================================================================
