-- ============================================================================
-- SEED: Metadata completa de fase eliminatoria — Mundial 2026
-- ============================================================================
-- Propósito: Popular stadium + kickOff de los 32 partidos eliminatorios
-- (R32 + R16 + QF + SF + F + 3RD) ANTES de que API-Football los publique.
--
-- Numeración oficial FIFA:
--   R32 (Match 73-88): 16 partidos (28 jun - 3 jul 2026)
--   R16 (Match 89-96):  8 partidos (4-7 jul 2026)
--   QF  (Match 97-100): 4 partidos (9-11 jul 2026)
--   SF  (Match 101-102): 2 partidos (14-15 jul 2026)
--   3RD (Match 103):     1 partido (18 jul 2026)
--   F   (Match 104):     1 partido (19 jul 2026)
--
-- Idempotente: usa ON CONFLICT (api_match_id) DO UPDATE.
-- NO interfiere con partidos de fase de grupos.
-- ============================================================================

BEGIN;

-- ============================================================================
-- R32 (16 partidos) — 28 jun a 3 jul 2026
-- ============================================================================
-- Stage: 'Round of 32' | Multiplier: 2 | Bracket: R32-1 a R32-16
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- Día 1: Sábado 28 jun
    (1, 1000073, 'TBD-2A', 'TBD-2B',           1, '2026-06-28 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'MetLife Stadium',        NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-1',  NULL, NULL),
    (1, 1000074, 'TBD-1E', 'TBD-best3rd-74',   1, '2026-06-28 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'AT&T Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-2',  NULL, NULL),
    (1, 1000075, 'TBD-1F', 'TBD-2C',           1, '2026-06-28 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'NRG Stadium',           NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-3',  NULL, NULL),
    (1, 1000076, 'TBD-1C', 'TBD-2F',           1, '2026-06-28 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'SoFi Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-4',  NULL, NULL),

    -- Día 2: Domingo 29 jun
    (1, 1000077, 'TBD-1I', 'TBD-best3rd-77',   2, '2026-06-29 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Mercedes-Benz Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-5',  NULL, NULL),
    (1, 1000078, 'TBD-2E', 'TBD-2I',           2, '2026-06-29 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Hard Rock Stadium',     NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-6',  NULL, NULL),
    (1, 1000079, 'TBD-1A', 'TBD-best3rd-79',   2, '2026-06-29 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio Azteca',        NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-7',  NULL, NULL),
    (1, 1000080, 'TBD-1L', 'TBD-best3rd-80',   2, '2026-06-29 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio Akron',         NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-8',  NULL, NULL),

    -- Día 3: Lunes 30 jun
    (1, 1000081, 'TBD-1D', 'TBD-best3rd-81',   3, '2026-06-30 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Arrowhead Stadium',     NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-9',  NULL, NULL),
    (1, 1000082, 'TBD-1G', 'TBD-best3rd-82',   3, '2026-06-30 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Lincoln Financial Field', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-10', NULL, NULL),
    (1, 1000083, 'TBD-2K', 'TBD-2L',           3, '2026-06-30 21:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'BMO Field',             NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-11', NULL, NULL),

    -- Día 4: Martes 1 jul
    (1, 1000084, 'TBD-1H', 'TBD-2J',           4, '2026-07-01 12:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'BC Place',              NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-12', NULL, NULL),
    (1, 1000085, 'TBD-1B', 'TBD-best3rd-85',   4, '2026-07-01 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Gillette Stadium',      NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-13', NULL, NULL),
    (1, 1000086, 'TBD-1J', 'TBD-2H',           4, '2026-07-01 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Estadio BBVA',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-14', NULL, NULL),

    -- Día 5: Miércoles 2 jul
    (1, 1000087, 'TBD-1K', 'TBD-best3rd-87',   5, '2026-07-02 15:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'Levi''s Stadium',       NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-15', NULL, NULL),
    (1, 1000088, 'TBD-2D', 'TBD-2G',           5, '2026-07-02 18:00:00-05', NULL, NULL, NULL, 'Round of 32', 2, 'scheduled', 'SoFi Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R32-16', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- R16 (8 partidos) — 4-7 jul 2026
-- ============================================================================
-- Stage: 'Round of 16' | Multiplier: 3 | Bracket: R16-1 a R16-8
-- Cruces FIFA (de fifaBracketDefinition.ts):
--   R16-1: W(M73) vs W(M75)  |  R16-2: W(M74) vs W(M77)
--   R16-3: W(M76) vs W(M78)  |  R16-4: W(M79) vs W(M80)
--   R16-5: W(M83) vs W(M84)  |  R16-6: W(M81) vs W(M82)
--   R16-7: W(M86) vs W(M88)  |  R16-8: W(M85) vs W(M87)
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- Día 1: Sábado 4 jul
    (1, 1000089, 'TBD-R16-1A', 'TBD-R16-1B', 1, '2026-07-04 12:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'NRG Stadium',           NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-1', NULL, NULL),
    (1, 1000090, 'TBD-R16-2A', 'TBD-R16-2B', 1, '2026-07-04 15:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'AT&T Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-2', NULL, NULL),

    -- Día 2: Domingo 5 jul
    (1, 1000091, 'TBD-R16-3A', 'TBD-R16-3B', 2, '2026-07-05 12:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'Mercedes-Benz Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-3', NULL, NULL),
    (1, 1000092, 'TBD-R16-4A', 'TBD-R16-4B', 2, '2026-07-05 15:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'Hard Rock Stadium',     NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-4', NULL, NULL),

    -- Día 3: Lunes 6 jul
    (1, 1000093, 'TBD-R16-5A', 'TBD-R16-5B', 3, '2026-07-06 15:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'Arrowhead Stadium',     NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-5', NULL, NULL),
    (1, 1000094, 'TBD-R16-6A', 'TBD-R16-6B', 3, '2026-07-06 18:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'Lincoln Financial Field', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-6', NULL, NULL),

    -- Día 4: Martes 7 jul
    (1, 1000095, 'TBD-R16-7A', 'TBD-R16-7B', 4, '2026-07-07 15:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'SoFi Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-7', NULL, NULL),
    (1, 1000096, 'TBD-R16-8A', 'TBD-R16-8B', 4, '2026-07-07 18:00:00-05', NULL, NULL, NULL, 'Round of 16', 3, 'scheduled', 'Levi''s Stadium',       NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'R16-8', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- QF (4 partidos) — 9-11 jul 2026
-- ============================================================================
-- Stage: 'Quarter-finals' | Multiplier: 4 | Bracket: QF-1 a QF-4
-- Cruces FIFA:
--   QF-1: W(R16-1) vs W(R16-2)  |  QF-2: W(R16-5) vs W(R16-6)
--   QF-3: W(R16-3) vs W(R16-4)  |  QF-4: W(R16-7) vs W(R16-8)
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- Día 1: Viernes 10 jul
    (1, 1000097, 'TBD-QF-1A', 'TBD-QF-1B', 1, '2026-07-10 15:00:00-05', NULL, NULL, NULL, 'Quarter-finals', 4, 'scheduled', 'NRG Stadium',           NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'QF-1', NULL, NULL),
    (1, 1000098, 'TBD-QF-2A', 'TBD-QF-2B', 1, '2026-07-10 18:00:00-05', NULL, NULL, NULL, 'Quarter-finals', 4, 'scheduled', 'AT&T Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'QF-2', NULL, NULL),

    -- Día 2: Sábado 11 jul
    (1, 1000099, 'TBD-QF-3A', 'TBD-QF-3B', 2, '2026-07-11 15:00:00-05', NULL, NULL, NULL, 'Quarter-finals', 4, 'scheduled', 'Mercedes-Benz Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'QF-3', NULL, NULL),
    (1, 1000100, 'TBD-QF-4A', 'TBD-QF-4B', 2, '2026-07-11 18:00:00-05', NULL, NULL, NULL, 'Quarter-finals', 4, 'scheduled', 'SoFi Stadium',          NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'QF-4', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- SF (2 partidos) — 14-15 jul 2026
-- ============================================================================
-- Stage: 'Semi-finals' | Multiplier: 5 | Bracket: SF-1 a SF-2
-- Cruces FIFA:
--   SF-1: W(QF-1) vs W(QF-2)  |  SF-2: W(QF-3) vs W(QF-4)
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- SF-1: Martes 14 jul
    (1, 1000101, 'TBD-SF-1A', 'TBD-SF-1B', 1, '2026-07-14 20:00:00-05', NULL, NULL, NULL, 'Semi-finals', 5, 'scheduled', 'AT&T Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'SF-1', NULL, NULL),

    -- SF-2: Miércoles 15 jul
    (1, 1000102, 'TBD-SF-2A', 'TBD-SF-2B', 2, '2026-07-15 20:00:00-05', NULL, NULL, NULL, 'Semi-finals', 5, 'scheduled', 'Mercedes-Benz Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'SF-2', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- 3RD PLACE (1 partido) — Sábado 18 jul 2026
-- ============================================================================
-- Stage: 'Third Place Match' | Multiplier: 4 (T0 hotfix) | Bracket: 3RD-1
-- Cruce: L(SF-1) vs L(SF-2) (perdedores de SF)
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- 3RD-1: Sábado 18 jul
    (1, 1000103, 'TBD-3RD-A', 'TBD-3RD-B', 1, '2026-07-18 15:00:00-05', NULL, NULL, NULL, 'Third Place Match', 4, 'scheduled', 'Hard Rock Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '3RD-1', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- FINAL (1 partido) — Domingo 19 jul 2026 en MetLife Stadium
-- ============================================================================
-- Stage: 'Final' | Multiplier: 6 | Bracket: F-1
-- Cruce: W(SF-1) vs W(SF-2)
-- ============================================================================

INSERT INTO matches (
    competition_id, api_match_id, home_team, away_team, matchday,
    kick_off, home_score, away_score, penalty_winner,
    stage_name, stage_multiplier, status, stadium,
    tv_channel, elapsed, raw_status, events, stats, lineups, player_photos,
    bracket_position, home_team_canonical, away_team_canonical
) VALUES
    -- F-1: Domingo 19 jul
    (1, 1000104, 'TBD-F-A', 'TBD-F-B', 1, '2026-07-19 15:00:00-05', NULL, NULL, NULL, 'Final', 6, 'scheduled', 'MetLife Stadium', NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'F-1', NULL, NULL)

ON CONFLICT (api_match_id) DO UPDATE SET
    stadium = EXCLUDED.stadium,
    kick_off = EXCLUDED.kick_off,
    stage_name = EXCLUDED.stage_name,
    stage_multiplier = EXCLUDED.stage_multiplier,
    bracket_position = EXCLUDED.bracket_position;

-- ============================================================================
-- Validaciones post-seed
-- ============================================================================

-- V1: Verificar 32 matches eliminatorios insertados
DO $$
DECLARE
    elim_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO elim_count
    FROM matches
    WHERE bracket_position IN ('R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8','R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
                                 'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
                                 'QF-1','QF-2','QF-3','QF-4',
                                 'SF-1','SF-2',
                                 '3RD-1','F-1');
    IF elim_count != 32 THEN
        RAISE EXCEPTION 'V1 FAILED: Expected 32 elimination matches, found %', elim_count;
    END IF;
    RAISE NOTICE 'V1 OK: 32 elimination matches found';
END $$;

-- V2: Verificar stage_multiplier por ronda
DO $$
DECLARE
    wrong_mult INTEGER;
BEGIN
    SELECT COUNT(*) INTO wrong_mult
    FROM matches
    WHERE (bracket_position LIKE 'R32-%' AND stage_multiplier != 2)
       OR (bracket_position LIKE 'R16-%' AND stage_multiplier != 3)
       OR (bracket_position LIKE 'QF-%'  AND stage_multiplier != 4)
       OR (bracket_position LIKE 'SF-%'  AND stage_multiplier != 5)
       OR (bracket_position = 'F-1'     AND stage_multiplier != 6)
       OR (bracket_position = '3RD-1'   AND stage_multiplier != 4);
    IF wrong_mult > 0 THEN
        RAISE EXCEPTION 'V2 FAILED: % elimination matches have wrong stage_multiplier', wrong_mult;
    END IF;
    RAISE NOTICE 'V2 OK: All elimination matches have correct stage_multiplier';
END $$;

-- V3: Verificar que todos tienen stadium y kickOff
DO $$
DECLARE
    null_stadium INTEGER;
    null_kickoff INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_stadium FROM matches
    WHERE bracket_position IN ('R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8','R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
                                 'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
                                 'QF-1','QF-2','QF-3','QF-4',
                                 'SF-1','SF-2',
                                 '3RD-1','F-1')
      AND stadium IS NULL;
    SELECT COUNT(*) INTO null_kickoff FROM matches
    WHERE bracket_position IN ('R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8','R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
                                 'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
                                 'QF-1','QF-2','QF-3','QF-4',
                                 'SF-1','SF-2',
                                 '3RD-1','F-1')
      AND kick_off IS NULL;
    IF null_stadium > 0 THEN
        RAISE EXCEPTION 'V3a FAILED: % elimination matches have null stadium', null_stadium;
    END IF;
    IF null_kickoff > 0 THEN
        RAISE EXCEPTION 'V3b FAILED: % elimination matches have null kick_off', null_kickoff;
    END IF;
    RAISE NOTICE 'V3 OK: All elimination matches have stadium and kick_off';
END $$;

-- V4: Verificar que las fechas de R32 caen en 28 jun - 3 jul
DO $$
DECLARE
    out_of_range INTEGER;
BEGIN
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position LIKE 'R32-%'
      AND (kick_off < '2026-06-28' OR kick_off > '2026-07-04');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4a FAILED: % R32 matches have kick_off out of range', out_of_range;
    END IF;
    RAISE NOTICE 'V4a OK: All R32 matches have kick_off in 2026-06-28 to 2026-07-04';

    -- V4b: R16 en 4-7 jul
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position LIKE 'R16-%'
      AND (kick_off < '2026-07-04' OR kick_off > '2026-07-08');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4b FAILED: % R16 matches have kick_off out of range', out_of_range;
    END IF;
    RAISE NOTICE 'V4b OK: All R16 matches have kick_off in 2026-07-04 to 2026-07-08';

    -- V4c: QF en 9-11 jul
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position LIKE 'QF-%'
      AND (kick_off < '2026-07-09' OR kick_off > '2026-07-12');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4c FAILED: % QF matches have kick_off out of range', out_of_range;
    END IF;
    RAISE NOTICE 'V4c OK: All QF matches have kick_off in 2026-07-09 to 2026-07-12';

    -- V4d: SF en 14-15 jul
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position LIKE 'SF-%'
      AND (kick_off < '2026-07-14' OR kick_off > '2026-07-16');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4d FAILED: % SF matches have kick_off out of range', out_of_range;
    END IF;
    RAISE NOTICE 'V4d OK: All SF matches have kick_off in 2026-07-14 to 2026-07-16';

    -- V4e: 3RD en 18 jul
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position = '3RD-1'
      AND (kick_off < '2026-07-18' OR kick_off > '2026-07-19');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4e FAILED: 3RD match has kick_off out of range';
    END IF;
    RAISE NOTICE 'V4e OK: 3RD match has kick_off in 2026-07-18';

    -- V4f: Final en 19 jul
    SELECT COUNT(*) INTO out_of_range
    FROM matches
    WHERE bracket_position = 'F-1'
      AND (kick_off < '2026-07-19' OR kick_off > '2026-07-20');
    IF out_of_range > 0 THEN
        RAISE EXCEPTION 'V4f FAILED: Final match has kick_off out of range';
    END IF;
    RAISE NOTICE 'V4f OK: Final match has kick_off in 2026-07-19';
END $$;

COMMIT;

-- ============================================================================
-- Output final: resumen por ronda
-- ============================================================================
SELECT
    CASE
        WHEN bracket_position LIKE 'R32-%' THEN 'R32'
        WHEN bracket_position LIKE 'R16-%' THEN 'R16'
        WHEN bracket_position LIKE 'QF-%'  THEN 'QF'
        WHEN bracket_position LIKE 'SF-%'  THEN 'SF'
        WHEN bracket_position = 'F-1'     THEN 'F'
        WHEN bracket_position = '3RD-1'   THEN '3RD'
    END AS round,
    stage_name,
    stage_multiplier,
    COUNT(*) AS match_count,
    MIN(kick_off)::date AS first_match,
    MAX(kick_off)::date AS last_match
FROM matches
WHERE bracket_position IN ('R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8','R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
                            'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
                            'QF-1','QF-2','QF-3','QF-4',
                            'SF-1','SF-2',
                            '3RD-1','F-1')
GROUP BY
    CASE
        WHEN bracket_position LIKE 'R32-%' THEN 'R32'
        WHEN bracket_position LIKE 'R16-%' THEN 'R16'
        WHEN bracket_position LIKE 'QF-%'  THEN 'QF'
        WHEN bracket_position LIKE 'SF-%'  THEN 'SF'
        WHEN bracket_position = 'F-1'     THEN 'F'
        WHEN bracket_position = '3RD-1'   THEN '3RD'
    END,
    stage_name,
    stage_multiplier
ORDER BY round;
