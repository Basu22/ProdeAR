-- ============================================================================
-- SCRIPT: Reconciliación de bracket_position para partidos R32 existentes
-- ============================================================================
-- Propósito: Asignar bracket_position (R32-1 a R32-16) a los 16 partidos
--            de 16vos del Mundial 2026 que actualmente tienen bracket_position
--            en NULL.
--
-- Estrategia:
--   • Asignar por orden cronológico (kick_off ASC): el primer partido en
--     jugarse será R32-1, el segundo R32-2, etc.
--   • Solo aplica a partidos con stage_name = 'Round of 32' y competition_id = 1.
--   • Idempotente: solo actualiza filas con bracket_position IS NULL.
--
-- Pre-requisito:
--   • La columna bracket_position DEBE existir (migration 0006 aplicada).
--   • Los partidos R32 DEBEN estar cargados (poll-scores ya corrió).
--
-- IMPORTANTE sobre numeración FIFA:
--   • Esta asignación NO coincide con la numeración FIFA oficial (M73-M88).
--   • Los api_match_id reales (1561329-1567312) no respetan el orden FIFA
--     porque API-Football los carga en orden cronológico.
--   • Los cruces entre rondas van a ser INTERNAMENTE consistentes
--     (ganador de R32-1 vs ganador de R32-2, etc.) pero pueden no coincidir
--     con la numeración FIFA oficial.
--   • Si querés respetar la numeración FIFA, necesitás el match number FIFA
--     de cada partido (no disponible en la DB actualmente).
--
-- Ejecutar en:
--   1. DEV primero → verificar → PROD
-- ============================================================================

BEGIN;

-- ============================================================================
-- Asignar R32-1 a R32-16 por orden cronológico
-- ============================================================================
-- Usa ROW_NUMBER() sobre los 16 partidos de R32 ordenados por kick_off.
-- Solo actualiza las filas que actualmente tienen bracket_position NULL
-- (idempotente: si ya fueron asignadas, no las toca).
-- ============================================================================

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY kick_off ASC) AS rn
  FROM matches
  WHERE competition_id = 1
    AND stage_name = 'Round of 32'
    AND bracket_position IS NULL
)
UPDATE matches m
SET bracket_position = 'R32-' || n.rn
FROM numbered n
WHERE m.id = n.id;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-RECONCILIACIÓN
-- ============================================================================
-- Debería devolver 16 filas, una por cada R32-1 a R32-16,
-- ordenadas cronológicamente.
-- ============================================================================

SELECT
  bracket_position,
  api_match_id,
  home_team,
  away_team,
  stage_name,
  stage_multiplier,
  stadium,
  kick_off AT TIME ZONE 'UTC' AS kick_off_utc
FROM matches
WHERE competition_id = 1
  AND stage_name = 'Round of 32'
ORDER BY
  CASE
    WHEN bracket_position LIKE 'R32-%' THEN 1
    ELSE 2
  END,
  bracket_position,
  kick_off;

-- ============================================================================
-- QUERY DE SANITY CHECK
-- ============================================================================
-- Verificar que no haya partidos de R32 sin bracket_position.
-- Esperado: 0 filas.
-- ============================================================================

SELECT COUNT(*) AS r32_sin_bracket
FROM matches
WHERE competition_id = 1
  AND stage_name = 'Round of 32'
  AND bracket_position IS NULL;
