-- ============================================================================
-- SCRIPT: Carga de Equipos + Estadios + Horarios de 16vos de Final (v2)
-- ============================================================================
-- Propósito: Actualizar los 16 partidos de R32 del Mundial 2026 con:
--   • Equipos reales (home_team, away_team) si no están definidos
--   • Estadios confirmados
--   • Horarios oficiales (ISO 8601 con timezone)
--
-- ============================================================================
-- IMPORTANTE: Asignación por orden cronológico
-- ============================================================================
-- Este script asume que el script `reconcile-bracket-positions.sql` YA se
-- ejecutó previamente, y que los partidos R32 tienen bracket_position
-- asignado por orden cronológico (kick_off ASC):
--   • R32-1 = primer partido en jugarse (sábado 28 junio, el más temprano)
--   • R32-16 = último partido (miércoles 2 julio, el más tardío)
--
-- Esto NO coincide con la numeración FIFA oficial (M73-M88), pero los
-- horarios sí están en orden cronológico FIFA (sábado → miércoles).
--
-- ============================================================================
-- Idempotencia
-- ============================================================================
-- • Usa UPDATEs por bracket_position (no INSERTs)
-- • Seguro de correr múltiples veces
-- • Solo actualiza campos que difieren del valor actual
-- • NO toca: api_match_id, stage_name, stage_multiplier, status, scores
--
-- ============================================================================
-- Pre-requisitos
-- ============================================================================
-- 1. La columna bracket_position DEBE existir (migration 0006 aplicada).
-- 2. El script reconcile-bracket-positions.sql DEBE estar ejecutado.
-- 3. Los partidos R32 DEBEN estar cargados (poll-scores ya corrió).
--
-- ============================================================================
-- Ejecutar en
-- ============================================================================
-- 1. SQL Editor de Supabase (dev primero → verificar → prod)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 16 PARTIDOS DE R32 (ordenados por kick_off)
-- ============================================================================
-- Los horarios están en hora LOCAL del estadio (con timezone).
-- PostgreSQL convierte automáticamente a UTC al hacer el UPDATE.
-- ============================================================================

-- R32-1: Sábado 28 junio 12:00 PDT (Los Angeles Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Sudafrica'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Canada'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Los Angeles Stadium'),
  kick_off = '2026-06-28T12:00:00-07:00'
WHERE bracket_position = 'R32-1'
  AND competition_id = 1;

-- R32-2: Lunes 29 junio 12:00 EDT (Houston Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Brasil'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Japon'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Houston Stadium'),
  kick_off = '2026-06-29T12:00:00-05:00'
WHERE bracket_position = 'R32-2'
  AND competition_id = 1;

-- R32-3: Lunes 29 junio 16:30 EDT (Boston Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Alemania'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Paraguay'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Boston Stadium'),
  kick_off = '2026-06-29T16:30:00-04:00'
WHERE bracket_position = 'R32-3'
  AND competition_id = 1;

-- R32-4: Lunes 29 junio 19:00 CST (Monterrey Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Paises Bajos'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Marruecos'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Monterrey Stadium'),
  kick_off = '2026-06-29T19:00:00-06:00'
WHERE bracket_position = 'R32-4'
  AND competition_id = 1;

-- R32-5: Martes 30 junio 12:00 EDT (Dallas Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Costa de Marfil'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Noruega'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Dallas Stadium'),
  kick_off = '2026-06-30T12:00:00-05:00'
WHERE bracket_position = 'R32-5'
  AND competition_id = 1;

-- R32-6: Martes 30 junio 17:00 EDT (New York New Jersey Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Francia'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Suecia'),
  stadium = COALESCE(NULLIF(stadium, ''), 'New York New Jersey Stadium'),
  kick_off = '2026-06-30T17:00:00-04:00'
WHERE bracket_position = 'R32-6'
  AND competition_id = 1;

-- R32-7: Martes 30 junio 19:00 CST (Mexico City Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Mexico'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Ecuador'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Mexico City Stadium'),
  kick_off = '2026-06-30T19:00:00-06:00'
WHERE bracket_position = 'R32-7'
  AND competition_id = 1;

-- R32-8: Miercoles 1 julio 12:00 EDT (Atlanta Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Inglaterra'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Republica Democratica del Congo'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Atlanta Stadium'),
  kick_off = '2026-07-01T12:00:00-04:00'
WHERE bracket_position = 'R32-8'
  AND competition_id = 1;

-- R32-9: Miercoles 1 julio 13:00 PDT (Seattle Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Belgica'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Senegal'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Seattle Stadium'),
  kick_off = '2026-07-01T13:00:00-07:00'
WHERE bracket_position = 'R32-9'
  AND competition_id = 1;

-- R32-10: Miercoles 1 julio 17:00 PDT (San Francisco Bay Area Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Estados Unidos'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Bosnia y Herzegovina'),
  stadium = COALESCE(NULLIF(stadium, ''), 'San Francisco Bay Area Stadium'),
  kick_off = '2026-07-01T17:00:00-07:00'
WHERE bracket_position = 'R32-10'
  AND competition_id = 1;

-- R32-11: Jueves 2 julio 12:00 PDT (Los Angeles Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Espana'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Austria'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Los Angeles Stadium'),
  kick_off = '2026-07-02T12:00:00-07:00'
WHERE bracket_position = 'R32-11'
  AND competition_id = 1;

-- R32-12: Jueves 2 julio 19:00 EDT (Toronto Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Portugal'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Croacia'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Toronto Stadium'),
  kick_off = '2026-07-02T19:00:00-04:00'
WHERE bracket_position = 'R32-12'
  AND competition_id = 1;

-- R32-13: Jueves 2 julio 20:00 PDT (BC Place Vancouver)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Suiza'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Argelia'),
  stadium = COALESCE(NULLIF(stadium, ''), 'BC Place Vancouver'),
  kick_off = '2026-07-02T20:00:00-07:00'
WHERE bracket_position = 'R32-13'
  AND competition_id = 1;

-- R32-14: Viernes 3 julio 13:00 EDT (Dallas Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Australia'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Egipto'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Dallas Stadium'),
  kick_off = '2026-07-03T13:00:00-05:00'
WHERE bracket_position = 'R32-14'
  AND competition_id = 1;

-- R32-15: Viernes 3 julio 18:00 EDT (Miami Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Argentina'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Cabo Verde'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Miami Stadium'),
  kick_off = '2026-07-03T18:00:00-04:00'
WHERE bracket_position = 'R32-15'
  AND competition_id = 1;

-- R32-16: Viernes 3 julio 19:30 EDT (Kansas City Stadium)
UPDATE matches SET
  home_team = COALESCE(NULLIF(home_team, ''), 'Colombia'),
  away_team = COALESCE(NULLIF(away_team, ''), 'Ghana'),
  stadium = COALESCE(NULLIF(stadium, ''), 'Kansas City Stadium'),
  kick_off = '2026-07-03T19:30:00-05:00'
WHERE bracket_position = 'R32-16'
  AND competition_id = 1;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-CARGA
-- ============================================================================
-- Resultado esperado: 16 filas, todas con:
--   • home_team NO NULL
--   • away_team NO NULL
--   • stadium NO NULL
--   • kick_off NO NULL
-- ============================================================================

SELECT
  bracket_position,
  home_team,
  away_team,
  stadium,
  kick_off AT TIME ZONE 'UTC' AS kick_off_utc,
  status
FROM matches
WHERE bracket_position LIKE 'R32-%'
  AND competition_id = 1
ORDER BY bracket_position;
