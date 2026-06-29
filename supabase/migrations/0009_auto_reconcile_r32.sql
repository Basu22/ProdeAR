-- ============================================================================
-- Migration 0009: Auto-reconciliación de bracket_position para R32
-- ============================================================================
-- Fecha: 2026-06-29
-- Propósito: Crear función RPC que asigna automáticamente bracket_position
--            (R32-1 a R32-16) a partidos de "Round of 32" que aún no lo
--            tengan, ordenados por kick_off ASC.
--
-- Esta función es idempotente y se invoca desde poll-scores después de cada
-- upsert para mantener consistencia sin intervención manual.
--
-- ============================================================================

-- ============================================================================
-- Función: reconcile_r32_bracket_positions(p_competition_id INTEGER)
-- ============================================================================
-- Asigna bracket_position (R32-1 a R32-16) a partidos de R32 con bracket_position
-- NULL, ordenados cronológicamente. Solo afecta partidos de la competición
-- especificada con stage_name = 'Round of 32'.
--
-- Retorna: el número de filas actualizadas.
-- ============================================================================

CREATE OR REPLACE FUNCTION reconcile_r32_bracket_positions(
  p_competition_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH numbered AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY kick_off ASC) AS rn
    FROM matches
    WHERE competition_id = p_competition_id
      AND stage_name = 'Round of 32'
      AND bracket_position IS NULL
  )
  UPDATE matches m
  SET bracket_position = 'R32-' || n.rn
  FROM numbered n
  WHERE m.id = n.id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION reconcile_r32_bracket_positions(INTEGER) IS
  'Asigna bracket_position (R32-1 a R32-16) por orden cronológico a partidos de R32 sin posición. Idempotente. Retorna número de filas actualizadas.';

-- ============================================================================
-- Grant de ejecución a service_role (usado por Edge Functions)
-- ============================================================================
-- Por defecto las funciones están en public pero solo el owner puede ejecutarlas.
-- Necesitamos que el service_role (usado por poll-scores) pueda llamarla.
-- ============================================================================

GRANT EXECUTE ON FUNCTION reconcile_r32_bracket_positions(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION reconcile_r32_bracket_positions(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION reconcile_r32_bracket_positions(INTEGER) TO authenticated;

-- ============================================================================
-- Notificar a PostgREST para que tome la nueva función
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente):
--
--   SELECT reconcile_r32_bracket_positions(1);
--   -- Esperado: 0 (si todos los R32 ya tienen bracket_position)
--   --          o N (si hay R32 nuevos sin asignar)
--
--   SELECT bracket_position, home_team, away_team
--   FROM matches
--   WHERE competition_id = 1 AND stage_name = 'Round of 32'
--   ORDER BY kick_off;
--   -- Esperado: 16 filas con R32-1 a R32-16 asignados
-- ============================================================================
