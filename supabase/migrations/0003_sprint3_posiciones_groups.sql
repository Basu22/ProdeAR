-- ============================================================================
-- Migration 0003: Sprint 3 — POSICIONES (Grupos en Vivo del Mundial)
-- ============================================================================
-- Fecha: 2026-06-15
-- Autor: ProdeAR team
-- Feature: POSICIONES tab con 3 sub-pills (Grupos en vivo + Liga 3ros + 16vos)
--
-- Cambios:
--   1. Agrega 3 columnas a `matches`: group_letter, home_team_canonical, away_team_canonical
--   2. Crea tabla nueva `team_aliases` con ~100 aliases del Mundial 2026
--   3. Backfill: popula las columnas nuevas para partidos existentes
--
-- IMPORTANTE:
--   - Esta migration es IDEMPOTENTE: usa IF NOT EXISTS y ON CONFLICT.
--     Se puede re-ejecutar sin errores si algo falla a mitad de camino.
--   - Después de correr, REFRESCAR el schema cache de PostgREST:
--     `NOTIFY pgrst, 'reload schema';`
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE: agregar 3 columnas a matches
-- ============================================================================
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS group_letter CHAR(1),
  ADD COLUMN IF NOT EXISTS home_team_canonical TEXT,
  ADD COLUMN IF NOT EXISTS away_team_canonical TEXT;

-- ============================================================================
-- 2. CREATE TABLE: team_aliases (lookup de normalización)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE,
  group_letter CHAR(1),
  flag_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_team_aliases_alias
  ON team_aliases (LOWER(alias));

CREATE INDEX IF NOT EXISTS idx_team_aliases_group
  ON team_aliases (group_letter)
  WHERE group_letter IS NOT NULL;

-- ============================================================================
-- 3. INSERT: poblar team_aliases con los 48 equipos del Mundial 2026
--    (~120 filas: cada equipo tiene 1-3 aliases según lo que devuelve la API)
-- ============================================================================
INSERT INTO team_aliases (canonical_name, alias, group_letter, flag_code) VALUES
  -- Grupo A
  ('México', 'Mexico', 'A', 'mx'),
  ('México', 'México', 'A', 'mx'),
  ('Corea del Sur', 'South Korea', 'A', 'kr'),
  ('Corea del Sur', 'Corea del Sur', 'A', 'kr'),
  ('Sudáfrica', 'South Africa', 'A', 'za'),
  ('Sudáfrica', 'Sudáfrica', 'A', 'za'),
  ('República Checa', 'Czechia', 'A', 'cz'),
  ('República Checa', 'Czech Republic', 'A', 'cz'),
  ('República Checa', 'República Checa', 'A', 'cz'),

  -- Grupo B
  ('Canadá', 'Canada', 'B', 'ca'),
  ('Canadá', 'Canadá', 'B', 'ca'),
  ('Suiza', 'Switzerland', 'B', 'ch'),
  ('Suiza', 'Suiza', 'B', 'ch'),
  ('Catar', 'Qatar', 'B', 'qa'),
  ('Catar', 'Catar', 'B', 'qa'),
  ('Bosnia y Herzegovina', 'Bosnia and Herzegovina', 'B', 'ba'),
  ('Bosnia y Herzegovina', 'Bosnia & Herzegovina', 'B', 'ba'),
  ('Bosnia y Herzegovina', 'Bosnia y Herzegovina', 'B', 'ba'),

  -- Grupo C
  ('Brasil', 'Brazil', 'C', 'br'),
  ('Brasil', 'Brasil', 'C', 'br'),
  ('Marruecos', 'Morocco', 'C', 'ma'),
  ('Marruecos', 'Marruecos', 'C', 'ma'),
  ('Escocia', 'Scotland', 'C', 'gb-sct'),
  ('Escocia', 'Escocia', 'C', 'gb-sct'),
  ('Haití', 'Haiti', 'C', 'ht'),
  ('Haití', 'Haití', 'C', 'ht'),

  -- Grupo D
  ('Estados Unidos', 'USA', 'D', 'us'),
  ('Estados Unidos', 'United States', 'D', 'us'),
  ('Estados Unidos', 'Estados Unidos', 'D', 'us'),
  ('Paraguay', 'Paraguay', 'D', 'py'),
  ('Australia', 'Australia', 'D', 'au'),
  ('Turquía', 'Turkey', 'D', 'tr'),
  ('Turquía', 'Turquía', 'D', 'tr'),
  ('Turquía', 'Türkiye', 'D', 'tr'),

  -- Grupo E
  ('Alemania', 'Germany', 'E', 'de'),
  ('Alemania', 'Alemania', 'E', 'de'),
  ('Ecuador', 'Ecuador', 'E', 'ec'),
  ('Costa de Marfil', 'Ivory Coast', 'E', 'ci'),
  ('Costa de Marfil', 'Cote d''Ivoire', 'E', 'ci'),
  ('Costa de Marfil', 'Costa de Marfil', 'E', 'ci'),
  ('Curaçao', 'Curacao', 'E', 'cw'),
  ('Curaçao', 'Curaçao', 'E', 'cw'),

  -- Grupo F
  ('Países Bajos', 'Netherlands', 'F', 'nl'),
  ('Países Bajos', 'Países Bajos', 'F', 'nl'),
  ('Japón', 'Japan', 'F', 'jp'),
  ('Japón', 'Japón', 'F', 'jp'),
  ('Túnez', 'Tunisia', 'F', 'tn'),
  ('Túnez', 'Túnez', 'F', 'tn'),
  ('Suecia', 'Sweden', 'F', 'se'),
  ('Suecia', 'Suecia', 'F', 'se'),

  -- Grupo G
  ('Bélgica', 'Belgium', 'G', 'be'),
  ('Bélgica', 'Bélgica', 'G', 'be'),
  ('Egipto', 'Egypt', 'G', 'eg'),
  ('Egipto', 'Egipto', 'G', 'eg'),
  ('Irán', 'Iran', 'G', 'ir'),
  ('Irán', 'Irán', 'G', 'ir'),
  ('Nueva Zelanda', 'New Zealand', 'G', 'nz'),
  ('Nueva Zelanda', 'Nueva Zelanda', 'G', 'nz'),

  -- Grupo H
  ('España', 'Spain', 'H', 'es'),
  ('España', 'España', 'H', 'es'),
  ('Uruguay', 'Uruguay', 'H', 'uy'),
  ('Arabia Saudita', 'Saudi Arabia', 'H', 'sa'),
  ('Arabia Saudita', 'Arabia Saudita', 'H', 'sa'),
  ('Cabo Verde', 'Cape Verde', 'H', 'cv'),
  ('Cabo Verde', 'Cape Verde Islands', 'H', 'cv'),
  ('Cabo Verde', 'Cabo Verde', 'H', 'cv'),

  -- Grupo I
  ('Francia', 'France', 'I', 'fr'),
  ('Francia', 'Francia', 'I', 'fr'),
  ('Senegal', 'Senegal', 'I', 'sn'),
  ('Irak', 'Iraq', 'I', 'iq'),
  ('Irak', 'Irak', 'I', 'iq'),
  ('Noruega', 'Norway', 'I', 'no'),
  ('Noruega', 'Noruega', 'I', 'no'),

  -- Grupo J
  ('Argentina', 'Argentina', 'J', 'ar'),
  ('Argelia', 'Algeria', 'J', 'dz'),
  ('Argelia', 'Argelia', 'J', 'dz'),
  ('Austria', 'Austria', 'J', 'at'),
  ('Jordania', 'Jordan', 'J', 'jo'),
  ('Jordania', 'Jordania', 'J', 'jo'),

  -- Grupo K
  ('Portugal', 'Portugal', 'K', 'pt'),
  ('Colombia', 'Colombia', 'K', 'co'),
  ('Uzbekistán', 'Uzbekistan', 'K', 'uz'),
  ('Uzbekistán', 'Uzbekistán', 'K', 'uz'),
  ('RD Congo', 'Congo DR', 'K', 'cd'),
  ('RD Congo', 'RD Congo', 'K', 'cd'),

  -- Grupo L
  ('Inglaterra', 'England', 'L', 'gb-eng'),
  ('Inglaterra', 'Inglaterra', 'L', 'gb-eng'),
  ('Croacia', 'Croatia', 'L', 'hr'),
  ('Croacia', 'Croacia', 'L', 'hr'),
  ('Ghana', 'Ghana', 'L', 'gh'),
  ('Panamá', 'Panama', 'L', 'pa'),
  ('Panamá', 'Panamá', 'L', 'pa')
ON CONFLICT (alias) DO NOTHING;

-- ============================================================================
-- 4. BACKFILL: popular las columnas nuevas para partidos ya existentes
-- ============================================================================
UPDATE matches m
SET
  group_letter = ta.group_letter,
  home_team_canonical = COALESCE(
    (SELECT ta2.canonical_name FROM team_aliases ta2
     WHERE LOWER(TRIM(ta2.alias)) = LOWER(TRIM(m.home_team)) LIMIT 1),
    m.home_team
  ),
  away_team_canonical = COALESCE(
    (SELECT ta3.canonical_name FROM team_aliases ta3
     WHERE LOWER(TRIM(ta3.alias)) = LOWER(TRIM(m.away_team)) LIMIT 1),
    m.away_team
  )
FROM team_aliases ta
WHERE LOWER(TRIM(ta.alias)) = LOWER(TRIM(m.home_team))
  AND ta.group_letter IS NOT NULL
  AND m.group_letter IS NULL;

-- ============================================================================
-- 5. Refrescar schema cache de PostgREST
--    (CRÍTICO: sin esto, las queries via Supabase JS no ven las columnas nuevas)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (opcional, correr después):
-- ============================================================================
-- 1. Verificar columnas:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'matches'
--      AND column_name IN ('group_letter', 'home_team_canonical', 'away_team_canonical');
--    → Esperado: 3 filas
--
-- 2. Verificar team_aliases:
--    SELECT COUNT(*) AS total, COUNT(DISTINCT group_letter) AS grupos
--    FROM team_aliases;
--    → Esperado: ~100 filas, 12 grupos
--
-- 3. Verificar que no hay matches sin group_letter:
--    SELECT COUNT(*) AS unmapped
--    FROM matches
--    WHERE stage_name ILIKE '%group%' AND group_letter IS NULL;
--    → Esperado: 0
-- ============================================================================
