-- ============================================================================
-- Migration 0004: Schema hygiene — Columnas JSONB de matches + lineups_updated_at
-- ============================================================================
-- Fecha: 2026-06-16
-- Sprint: Habilitar formaciones para partidos upcoming
-- Autor: ProdeAR team
--
-- Motivo:
--   Las columnas stats, lineups y player_photos fueron agregadas manualmente
--   en Supabase Dashboard durante Sprint 1 y Sprint 2, pero NUNCA se
--   formalizaron en schema.sql ni en una migration formal. Esta migration
--   es IDEMPOTENTE (usa IF NOT EXISTS) y documenta el estado real de la DB.
--
-- Adicionalmente, agrega `lineups_updated_at` para trackear freshness de
-- formaciones. Usado por `poll-scores` para evitar re-fetches innecesarios
-- (la API-Football publica lineups T-20-40min antes del kickoff, y la
-- formación puede cambiar por lesiones de último momento).
--
-- IMPORTANTE:
--   - Esta migration es IDEMPOTENTE: se puede re-ejecutar sin errores.
--   - Después de correr, refrescar el schema cache de PostgREST:
--     `NOTIFY pgrst, 'reload schema';`
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE: agregar 4 columnas a matches
-- ============================================================================
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lineups JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS player_photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lineups_updated_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- 2. COMMENTS: documentar el propósito de cada columna
-- ============================================================================
COMMENT ON COLUMN matches.stats IS 'Estadísticas del partido (posesión, tiros, etc). Estructura: [{ team, statistics: [{ type, value }] }]';
COMMENT ON COLUMN matches.lineups IS 'Formaciones titulares + suplentes + DT. Estructura: TeamLineup[] (ver src/lib/types.ts)';
COMMENT ON COLUMN matches.player_photos IS 'Map player_id → photo URL. Estructura: [{ player_id: number, photo: string }]';
COMMENT ON COLUMN matches.lineups_updated_at IS 'Última vez que se actualizaron las formaciones desde API-Football. NULL = nunca se fetcheó.';

-- ============================================================================
-- 3. INDEX: acelerar queries de "partidos upcoming sin lineups"
--    Usado por la nueva lógica de poll-scores y por health checks de monitoreo.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_matches_upcoming_no_lineups
  ON matches (kick_off, status)
  WHERE status = 'scheduled' AND (lineups IS NULL OR jsonb_array_length(lineups) < 2);

-- ============================================================================
-- 4. REFRESH: invalidar schema cache de PostgREST para que los nuevos campos
--    sean visibles inmediatamente desde el cliente (Supabase JS, REST API).
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente para confirmar):
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'matches'
--     AND column_name IN ('stats', 'lineups', 'player_photos', 'lineups_updated_at')
--   ORDER BY column_name;
--
--   → Esperado: 4 filas con los tipos jsonb (3) y timestamptz (1).
-- ============================================================================
