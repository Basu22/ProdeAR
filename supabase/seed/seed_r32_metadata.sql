-- ============================================================================
-- SEED: Metadata de R32 (Round of 32) del Mundial 2026
-- ============================================================================
-- Propósito: Popular stadium + kickOff de los 16 partidos de R32 (M73-M88)
-- ANTES de que API-Football los publique, para que la app muestre dónde y
-- cuándo se juega cada partido.
--
-- Cuándo ejecutar:
--   1. ANTES del primer partido de R32 (28 junio 2026)
--   2. Cuando se ejecute la migración 0008 (bracket_position FIFA)
--
-- Efecto:
--   - Crea 16 nuevos matches con bracket_position R32-1 a R32-16
--   - home_team y away_team quedan con placeholders "TBD" (se actualizan
--     cuando la API publique los cruces definitivos post-fase de grupos)
--   - status = 'scheduled' (no se jugaron todavía)
--   - stage_multiplier = 2 (R32)
--   - stage_name = 'Round of 32' (consistente con API-Football)
--
-- Idempotente: usa ON CONFLICT (api_match_id) DO UPDATE para no duplicar.
--
-- IMPORTANTE: Este seed NO interfiere con los partidos de fase de grupos.
-- Solo agrega los R32.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 16 partidos de R32 (Match 73-88 según numeración oficial FIFA)
-- ============================================================================
-- Datos basados en:
--   - FIFA.com match schedule oficial (diciembre 2025)
--   - Wikipedia: 2026 FIFA World Cup
--   - Calendario: 28 junio - 3 julio 2026
--
-- Las horas son LOCAL TIME del estadio (Eastern Time por defecto en USA/Canadá).
-- Estás son kickoffs tentativos que FIFA ajustará si es necesario.
-- ============================================================================

INSERT INTO matches (
    competition_id,
    api_match_id,
    home_team,
    away_team,
    matchday,
    kick_off,
    home_score,
    away_score,
    penalty_winner,
    stage_name,
    stage_multiplier,
    status,
    stadium,
    tv_channel,
    elapsed,
    raw_status,
    events,
    stats,
    lineups,
    player_photos,
    bracket_position,
    home_team_canonical,
    away_team_canonical
) VALUES
    -- M73: 2°A vs 2°B - Sábado 28 junio
    (1, 1000073, 'TBD-2A', 'TBD-2B', 1, '2026-06-28 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'MetLife Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-1', NULL, NULL),

    -- M74: 1°E vs Mejor 3° (A/B/C/D/F) - Sábado 28 junio
    (1, 1000074, 'TBD-1E', 'TBD-best3rd-74', 1, '2026-06-28 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'AT&T Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-2', NULL, NULL),

    -- M75: 1°F vs 2°C - Sábado 28 junio
    (1, 1000075, 'TBD-1F', 'TBD-2C', 1, '2026-06-28 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'NRG Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-3', NULL, NULL),

    -- M76: 1°C vs 2°F - Sábado 28 junio
    (1, 1000076, 'TBD-1C', 'TBD-2F', 1, '2026-06-28 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'SoFi Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-4', NULL, NULL),

    -- M77: 1°I vs Mejor 3° (C/D/F/G/H) - Domingo 29 junio
    (1, 1000077, 'TBD-1I', 'TBD-best3rd-77', 2, '2026-06-29 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Mercedes-Benz Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-5', NULL, NULL),

    -- M78: 2°E vs 2°I - Domingo 29 junio
    (1, 1000078, 'TBD-2E', 'TBD-2I', 2, '2026-06-29 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Hard Rock Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-6', NULL, NULL),

    -- M79: 1°A vs Mejor 3° (C/E/F/H/I) - Domingo 29 junio
    (1, 1000079, 'TBD-1A', 'TBD-best3rd-79', 2, '2026-06-29 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio Azteca', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-7', NULL, NULL),

    -- M80: 1°L vs Mejor 3° (E/H/I/J/K) - Domingo 29 junio
    (1, 1000080, 'TBD-1L', 'TBD-best3rd-80', 2, '2026-06-29 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio Akron', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-8', NULL, NULL),

    -- M81: 1°D vs Mejor 3° (B/E/F/I/J) - Lunes 30 junio
    (1, 1000081, 'TBD-1D', 'TBD-best3rd-81', 3, '2026-06-30 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Arrowhead Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-9', NULL, NULL),

    -- M82: 1°G vs Mejor 3° (A/E/H/I/J) - Lunes 30 junio
    (1, 1000082, 'TBD-1G', 'TBD-best3rd-82', 3, '2026-06-30 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Lincoln Financial Field', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-10', NULL, NULL),

    -- M83: 2°K vs 2°L - Lunes 30 junio
    (1, 1000083, 'TBD-2K', 'TBD-2L', 3, '2026-06-30 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'BMO Field', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-11', NULL, NULL),

    -- M84: 1°H vs 2°J - Martes 1 julio
    (1, 1000084, 'TBD-1H', 'TBD-2J', 4, '2026-07-01 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'BC Place', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-12', NULL, NULL),

    -- M85: 1°B vs Mejor 3° (E/F/G/I/J) - Martes 1 julio
    (1, 1000085, 'TBD-1B', 'TBD-best3rd-85', 4, '2026-07-01 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Gillette Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-13', NULL, NULL),

    -- M86: 1°J vs 2°H - Martes 1 julio
    (1, 1000086, 'TBD-1J', 'TBD-2H', 4, '2026-07-01 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio BBVA', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-14', NULL, NULL),

    -- M87: 1°K vs Mejor 3° (D/E/I/J/L) - Miércoles 2 julio
    (1, 1000087, 'TBD-1K', 'TBD-best3rd-87', 5, '2026-07-02 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Levi''s Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-15', NULL, NULL),

    -- M88: 2°D vs 2°G - Miércoles 2 julio
    (1, 1000088, 'TBD-2D', 'TBD-2G', 5, '2026-07-02 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'SoFi Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-16', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    -- Solo actualizamos stadium y kickOff (NO sobrescribimos home/away si ya existen)
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- Validaciones post-seed
-- ============================================================================

-- V1: Verificar 16 matches R32 insertados
DO $$
DECLARE
    r32_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO r32_count
    FROM matches
    WHERE bracket_position LIKE 'R32-%';
    IF r32_count != 16 THEN
        RAISE EXCEPTION 'V1 FAILED: Expected 16 R32 matches, found %', r32_count;
    END IF;
    RAISE NOTICE 'V1 OK: 16 R32 matches found';
END $$;

-- V2: Verificar que todos tienen stadium y kickOff
DO $$
DECLARE
    null_stadium INTEGER;
    null_kickoff INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_stadium FROM matches WHERE bracket_position LIKE 'R32-%' AND stadium IS NULL;
    SELECT COUNT(*) INTO null_kickoff FROM matches WHERE bracket_position LIKE 'R32-%' AND kick_off IS NULL;
    IF null_stadium > 0 THEN
        RAISE EXCEPTION 'V2 FAILED: % R32 matches have null stadium', null_stadium;
    END IF;
    IF null_kickoff > 0 THEN
        RAISE EXCEPTION 'V2 FAILED: % R32 matches have null kick_off', null_kickoff;
    END IF;
    RAISE NOTICE 'V2 OK: All R32 matches have stadium and kick_off';
END $$;

-- V3: Verificar fechas dentro del rango correcto (28 jun - 3 jul 2026)
DO $$
DECLARE
    out_of_range INTEGER;
BEGIN
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position LIKE 'R32-%'
      AND (kick_off < '2026-06-28' OR kick_off > '2026-07-04');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V3 FAILED: % R32 matches have kick_off out of range', out_of_range;
    END IF;
    RAISE NOTICE 'V3 OK: All R32 matches have kick_off in 2026-06-28 to 2026-07-04';
END $$;

-- V4: Verificar stage_multiplier = 2
DO $$
DECLARE
    wrong_multiplier INTEGER;
BEGIN
    SELECT COUNT(*) INTO wrong_multiplier
    FROM matches
    WHERE bracket_position LIKE 'R32-%' AND stage_multiplier != 2;
    IF wrong_multiplier > 0 THEN
        RAISE EXCEPTION 'V4 FAILED: % R32 matches have wrong stage_multiplier', wrong_multiplier;
    END IF;
    RAISE NOTICE 'V4 OK: All R32 matches have stage_multiplier = 2';
END $$;

COMMIT;

-- ============================================================================
-- Output final
-- ============================================================================
SELECT
    bracket_position,
    home_team,
    away_team,
    kick_off,
    stadium,
    stage_multiplier
FROM matches
WHERE bracket_position LIKE 'R32-%'
ORDER BY bracket_position;
