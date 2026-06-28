-- ============================================================================
-- Migration 0008: Penalty & Extra Time Scores
-- ============================================================================
-- Fecha: 2026-06-26
-- Sprint: "Llaves Eliminatorias con Penales" (Fase 1: Schema + Sync)
-- Autor: @dev (orquestado por opencode)
--
-- Contexto:
--   La columna `matches.penalty_winner` (migration previa) solo guarda
--   QUIÉN ganó la tanda ("home" | "away" | null), no el score (ej. 4-3).
--   Lo mismo para tiempo extra: no se persiste si un partido fue a 120 min
--   ni cuántos goles se convirtieron en ese período.
--
--   API-Football expone:
--     score.fulltime.home/away    → goles en 90 min (ya mapeado a home_score/away_score)
--     score.extratime.home/away   → goles en 120 min (NO se mapeaba)
--     score.penalty.home/away     → goles en tanda de penales (solo se mapea el winner)
--
--   En partidos de eliminación directa, el resultado en 90 min puede ser
--   empate. Para mostrar "(4-3) PEN" en el bracket visual y darle contexto
--   al usuario sobre cómo se definió el partido, necesitamos persistir los
--   scores completos.
--
-- Reglas de negocio (NO se modifican):
--   - home_score / away_score SIGUEN siendo los goles en 90 min.
--   - El scoring (calculate_match_points) evalúa los goles de 90 min +
--     el bonus de penales (+4 si predice ganador de penales correctamente).
--   - Esta migration NO cambia el scoring. Solo agrega campos para UX.
--
-- Decisión de producto (validada con usuario):
--   - NO se predice el score de penales (4-3, 5-4). Solo el ganador.
--   - NO se predice el score de tiempo extra.
--   - Estos campos son READ-ONLY en la UI (se muestran después del partido).
--
-- ============================================================================
-- IDEMPOTENCIA: Esta migración es segura de correr múltiples veces.
-- Ya aplicada en DEV el 2026-06-26. Pendiente: PROD.
-- ============================================================================

-- 1. Tiempo extra (goles en 120 min)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS extra_time_home INTEGER,
  ADD COLUMN IF NOT EXISTS extra_time_away INTEGER;

COMMENT ON COLUMN public.matches.extra_time_home IS
  'Goles del local en tiempo extra (120 min). NULL si no hubo tiempo extra. Sprint Penales 2026.';
COMMENT ON COLUMN public.matches.extra_time_away IS
  'Goles del visitante en tiempo extra (120 min). NULL si no hubo tiempo extra. Sprint Penales 2026.';

-- 2. Tanda de penales (score detallado)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS penalties_home INTEGER,
  ADD COLUMN IF NOT EXISTS penalties_away INTEGER;

COMMENT ON COLUMN public.matches.penalties_home IS
  'Goles del local en tanda de penales (ej. 4). NULL si no hubo penales. Sprint Penales 2026.';
COMMENT ON COLUMN public.matches.penalties_away IS
  'Goles del visitante en tanda de penales (ej. 3). NULL si no hubo penales. Sprint Penales 2026.';

-- 3. Índice para queries de "partidos con penales" (futuro: stats, badges, etc.)
CREATE INDEX IF NOT EXISTS idx_matches_penalties
  ON public.matches (id)
  WHERE penalties_home IS NOT NULL;

-- 4. Refrescar PostgREST (RLS, types, cache)
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente después):
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   = 'matches'
--     AND column_name IN (
--       'extra_time_home', 'extra_time_away',
--       'penalties_home',  'penalties_away'
--     )
--   ORDER BY column_name;
--
-- Debería devolver 4 filas con:
--   data_type: integer
--   is_nullable: YES
--   column_default: NULL
-- ============================================================================

-- ============================================================================
-- NOTAS PARA FUTURO:
--
-- 1. Si en algún momento se quiere predecir el score exacto de penales
--    (ej. 4-3 en la tanda), hay que agregar:
--      ALTER TABLE public.predictions
--        ADD COLUMN IF NOT EXISTS predicted_penalties_home INTEGER,
--        ADD COLUMN IF NOT EXISTS predicted_penalties_away INTEGER;
--    Y modificar calculate_match_points() para dar +2 pts adicionales
--    si se acierta el score exacto. Decisión de producto pendiente.
--
-- 2. Si en algún momento se quiere predecir el resultado en 120 min,
--    hay que repensar la UX radicalmente (¿2 predicciones por partido?).
--    No recomendado. La regla "90 min + penales" es el estándar del fútbol.
--
-- 3. Backfill retroactivo: si hay partidos finalizados con penales en DB
--    (Mundial 2026 en curso) y se quieren popular los scores, se puede
--    correr un script ad-hoc que llame a /fixtures?id=X de API-Football
--    y haga UPDATE matches SET penalties_home=Y, penalties_away=Z
--    WHERE id=X AND status='finished' AND penalties_home IS NULL.
--    NO se incluye en esta migration por scope.
-- ============================================================================
