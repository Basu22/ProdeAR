-- ============================================================================
-- T0 HOTFIX SNAPSHOT — Scoring pre/post hotfix 2026-06-25
-- ============================================================================
-- Propósito: validar que el hotfix del multiplier 3RD (5 → 4) NO rompe
-- el scoring histórico de los usuarios.
--
-- Uso:
--   1. Ejecutar ANTES del hotfix → guardar resultado en `pre_hotfix_scores`
--   2. Aplicar el hotfix
--   3. Ejecutar DESPUÉS del hotfix → guardar resultado en `post_hotfix_scores`
--   4. Comparar ambos CSV con `diff` o spreadsheet
--
-- El hotfix es SAFE porque:
--   - `points_earned` ya está calculado en la DB con multiplier=4 (poll-scores)
--   - El cambio solo afecta el `stage_multiplier` del engine del bracket
--   - Ningún cálculo de scoring futuro cambia (sigue usando 4)
--
-- ⚠️ Si la query post-hotfix muestra DELTAS ≠ 0, hay un bug grave.
-- ============================================================================

-- ============================================================================
-- PASO 1: Snapshot pre-hotfix (ejecutar ANTES de mergear T0)
-- ============================================================================

-- Export del scoring total por usuario
COPY (
    SELECT
        p.user_id,
        u.display_name,
        u.email,
        t.name AS tournament_name,
        SUM(p.points_earned) AS total_points,
        COUNT(*) FILTER (WHERE p.points_earned > 0) AS correct_predictions,
        COUNT(*) AS total_predictions
    FROM predictions p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.points_earned IS NOT NULL
    GROUP BY p.user_id, u.display_name, u.email, t.name
    ORDER BY total_points DESC
) TO '/tmp/pre_hotfix_scores.csv' WITH CSV HEADER;

-- Detalle de predicciones de partidos 3RD (debe ser 0 filas en producción
-- porque el mundial no ha empezado, pero dejamos el check por las dudas)
COPY (
    SELECT
        p.user_id,
        p.match_id,
        m.stage_name,
        m.stage_multiplier,
        p.points_earned,
        p.predicted_home,
        p.predicted_away,
        m.home_score,
        m.away_score,
        p.created_at
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE LOWER(m.stage_name) LIKE '%third place%'
       OR LOWER(m.stage_name) LIKE '%tercer%'
       OR LOWER(m.stage_name) LIKE '%3rd place%'
    ORDER BY p.created_at
) TO '/tmp/pre_hotfix_3rd_predictions.csv' WITH CSV HEADER;

-- Conteo de matches con stage_multiplier inconsistente
SELECT
    stage_multiplier,
    COUNT(*) AS match_count
FROM matches
WHERE LOWER(stage_name) LIKE '%third place%'
   OR LOWER(stage_name) LIKE '%tercer%'
   OR LOWER(stage_name) LIKE '%3rd place%'
GROUP BY stage_multiplier
ORDER BY stage_multiplier;

-- Resultado esperado pre-hotfix:
--   stage_multiplier | match_count
--   -----------------+-------------
--                  4 | X (correcto según poll-scores)
--                  5 | Y (incorrecto, leftover del seed de migración 0006)

-- ============================================================================
-- PASO 2: Aplicar hotfix (cambiar bracketTypes.ts:79 + bracketEngine.ts)
-- ============================================================================

-- ============================================================================
-- PASO 3: Snapshot post-hotfix (ejecutar DESPUÉS del hotfix)
-- ============================================================================

COPY (
    SELECT
        p.user_id,
        u.display_name,
        u.email,
        t.name AS tournament_name,
        SUM(p.points_earned) AS total_points,
        COUNT(*) FILTER (WHERE p.points_earned > 0) AS correct_predictions,
        COUNT(*) AS total_predictions
    FROM predictions p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.points_earned IS NOT NULL
    GROUP BY p.user_id, u.display_name, u.email, t.name
    ORDER BY total_points DESC
) TO '/tmp/post_hotfix_scores.csv' WITH CSV HEADER;

-- ============================================================================
-- PASO 4: Comparación pre vs post
-- ============================================================================
-- Ejecutar localmente:
--   diff /tmp/pre_hotfix_scores.csv /tmp/post_hotfix_scores.csv
--
-- Resultado esperado: 0 diferencias (el hotfix no toca datos de predictions,
-- solo el engine del bracket).
--
-- Si hay diferencias, es porque:
--   (a) poll-scores corrió entre los snapshots y recalculó puntos
--   (b) el hotfix inadvertidamente cambió algún cálculo (BUG GRAVE)
--
-- Caso (a) es normal (puede haber predicciones nuevas en el medio).
-- Caso (b) requiere rollback inmediato del hotfix.
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN RÁPIDA: conteo de predicciones con stage_multiplier=4
-- ============================================================================
-- Después del hotfix, todas las predicciones de 3RD deben tener
-- stage_multiplier=4 (porque el engine las genera con ese valor).
-- ============================================================================

SELECT
    m.stage_multiplier,
    COUNT(p.id) AS predictions_count
FROM predictions p
JOIN matches m ON m.id = p.match_id
WHERE LOWER(m.stage_name) LIKE '%third place%'
   OR LOWER(m.stage_name) LIKE '%tercer%'
   OR LOWER(m.stage_name) LIKE '%3rd place%'
GROUP BY m.stage_multiplier
ORDER BY m.stage_multiplier;
