-- =============================================================================
-- Migration: 0001_create_push_subscriptions.sql
--
-- Crea la tabla `public.push_subscriptions` para guardar las suscripciones
-- Web Push de los usuarios.
--
-- Cuándo correr:
--   - Si la tabla NO existe en tu proyecto de Supabase.
--   - Si al activar las alertas ves el error:
--     "Could not find the table 'public.push_subscriptions' in the schema
--      cache (code: PGRST205)"
--
-- Cómo correr:
--   1. Supabase Dashboard → SQL Editor → New query → pegar y Run, o
--   2. CLI:        supabase db push   (si tenés el proyecto linkeado), o
--   3. Local:      psql $DATABASE_URL -f supabase/migrations/0001_create_push_subscriptions.sql
--
-- Idempotente: corre las veces que quieras. Si la tabla ya existe, no hace nada.
-- =============================================================================

-- ── 1. Tabla ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, endpoint)
);

-- ── 2. Trigger para mantener updated_at al día ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Índices (performance) ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON public.push_subscriptions (user_id);

-- ── 4. Row Level Security ────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política única: el usuario puede gestionar sus propias suscripciones.
-- Cubre SELECT, INSERT, UPDATE, DELETE en una sola policy.
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propias suscripciones"
    ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden gestionar sus propias suscripciones"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── 5. Grants (por si el rol authenticated necesita acceso explícito) ────
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.push_subscriptions TO authenticated;

-- =============================================================================
-- Verificación post-creación (opcional, correr aparte):
--
--   SELECT EXISTS (
--     SELECT FROM information_schema.tables
--     WHERE table_schema = 'public'
--     AND table_name = 'push_subscriptions'
--   );
--
-- Debería retornar: true
-- =============================================================================
