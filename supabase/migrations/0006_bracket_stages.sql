-- ============================================================================
-- Migration 0006: Full Bracket — bracket_position + stage_multiplier seed
-- ============================================================================
-- Fecha: 2026-06-22
-- Feature: Árbol completo de eliminatorias (R32 → F + 3er puesto)
--
-- Cambios:
--   1. ALTER TABLE matches ADD COLUMN bracket_position TEXT (nullable)
--   2. Seed de stage_multiplier para partidos de eliminatoria existentes
--      (R32=2, R16=3, QF=4, SF=5, F=6, 3RD=5)
--   3. Seed de bracket_position para partidos existentes (R32-1..R32-16, etc.)
--   4. Índice parcial para queries rápidas por bracket_position
--   5. NOTIFY pgrst, 'reload schema' para refrescar cache de PostgREST
--
-- ============================================================================
-- IDEMPOTENCIA: Esta migración es segura de correr múltiples veces.
-- ============================================================================

-- 1. Nueva columna para vincular matches con posición en el bracket visual
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_position TEXT;

COMMENT ON COLUMN matches.bracket_position IS
  'Posición en el bracket eliminatorio (ej. R32-1, R16-3, QF-2, SF-1, F-1, 3RD-1). NULL para partidos de grupo. Sprint "Full Bracket" 2026-06-22.';

-- 2. Seed de stage_multiplier para partidos de eliminatoria ya cargados.
--    WHERE stage_multiplier = 1 protege contra sobreescribir valores manuales
--    (si poll-scores ya seteo el multiplier correcto, no lo toca).
--    También filtra por stage_name para no afectar partidos de grupo.
UPDATE matches
SET stage_multiplier = CASE
    WHEN LOWER(stage_name) LIKE '%round of 32%' OR LOWER(stage_name) LIKE '%dieciseisavos%' OR LOWER(stage_name) LIKE '%32vos%' THEN 2
    WHEN LOWER(stage_name) LIKE '%round of 16%' OR LOWER(stage_name) LIKE '%octavos%' OR LOWER(stage_name) LIKE '%16vos%' THEN 3
    WHEN LOWER(stage_name) LIKE '%quarter%' OR LOWER(stage_name) LIKE '%cuartos%' OR LOWER(stage_name) LIKE '%8vos%' THEN 4
    WHEN LOWER(stage_name) LIKE '%semi%' OR LOWER(stage_name) LIKE '%semifinal%' THEN 5
    WHEN LOWER(stage_name) LIKE '%third place%' OR LOWER(stage_name) LIKE '%tercer%' THEN 5
    WHEN LOWER(stage_name) = 'final' THEN 6
    ELSE stage_multiplier
  END
WHERE stage_multiplier = 1
  AND (
    LOWER(stage_name) LIKE '%round of 32%'
    OR LOWER(stage_name) LIKE '%dieciseisavos%'
    OR LOWER(stage_name) LIKE '%32vos%'
    OR LOWER(stage_name) LIKE '%round of 16%'
    OR LOWER(stage_name) LIKE '%octavos%'
    OR LOWER(stage_name) LIKE '%16vos%'
    OR LOWER(stage_name) LIKE '%quarter%'
    OR LOWER(stage_name) LIKE '%cuartos%'
    OR LOWER(stage_name) LIKE '%8vos%'
    OR LOWER(stage_name) LIKE '%semi%'
    OR LOWER(stage_name) LIKE '%semifinal%'
    OR LOWER(stage_name) = 'final'
    OR LOWER(stage_name) LIKE '%third place%'
    OR LOWER(stage_name) LIKE '%tercer%'
  );

-- 3. Seed de bracket_position para partidos de eliminatoria existentes.
--    Usa ROW_NUMBER() ordenado por kick_off para asignar posiciones
--    (1 = primer partido cronológico, etc).
--    Para "Final" siempre es F-1 (solo hay 1 final).
--    Para "3RD" siempre es 3RD-1 (solo hay 1 partido por el 3er puesto).
WITH numbered AS (
  SELECT
    id,
    stage_name,
    ROW_NUMBER() OVER (PARTITION BY stage_name ORDER BY kick_off) AS rn
  FROM matches
  WHERE bracket_position IS NULL
    AND (
      LOWER(stage_name) LIKE '%round of%'
      OR LOWER(stage_name) LIKE '%dieciseisavos%'
      OR LOWER(stage_name) LIKE '%octavos%'
      OR LOWER(stage_name) LIKE '%cuartos%'
      OR LOWER(stage_name) LIKE '%semi%'
      OR LOWER(stage_name) = 'final'
      OR LOWER(stage_name) LIKE '%third place%'
      OR LOWER(stage_name) LIKE '%tercer%'
    )
)
UPDATE matches m
SET bracket_position = CASE
    WHEN LOWER(n.stage_name) LIKE '%round of 32%' OR LOWER(n.stage_name) LIKE '%dieciseisavos%' OR LOWER(n.stage_name) LIKE '%32vos%' THEN 'R32-' || n.rn
    WHEN LOWER(n.stage_name) LIKE '%round of 16%' OR LOWER(n.stage_name) LIKE '%octavos%' OR LOWER(n.stage_name) LIKE '%16vos%' THEN 'R16-' || n.rn
    WHEN LOWER(n.stage_name) LIKE '%quarter%' OR LOWER(n.stage_name) LIKE '%cuartos%' OR LOWER(n.stage_name) LIKE '%8vos%' THEN 'QF-' || n.rn
    WHEN LOWER(n.stage_name) LIKE '%semi%' OR LOWER(n.stage_name) LIKE '%semifinal%' THEN 'SF-' || n.rn
    WHEN LOWER(n.stage_name) = 'final' THEN 'F-1'
    WHEN LOWER(n.stage_name) LIKE '%third place%' OR LOWER(n.stage_name) LIKE '%tercer%' THEN '3RD-1'
    ELSE NULL
  END
FROM numbered n
WHERE m.id = n.id;

-- 4. Índice parcial para queries rápidas por bracket_position
--    (partial index porque la mayoría de partidos son de grupo → bracket_position IS NULL)
CREATE INDEX IF NOT EXISTS idx_matches_bracket_position
  ON matches (bracket_position)
  WHERE bracket_position IS NOT NULL;

-- 5. Refrescar schema cache de PostgREST para que tome la nueva columna
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente después):
--
--   SELECT bracket_position, stage_multiplier, stage_name
--   FROM matches
--   WHERE bracket_position IS NOT NULL
--   ORDER BY bracket_position;
--
-- Debería devolver 31 partidos en total (16 R32 + 8 R16 + 4 QF + 2 SF + 1 F + 1 3RD)
-- con stage_multiplier consistente (2/3/4/5/6/5 respectivamente).
-- ============================================================================
