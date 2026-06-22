-- ============================================================================
-- Migration 0005: FASE 1 — Sección "Ligas" (Posiciones + Partidos)
-- ============================================================================
-- Fecha: 2026-06-18
-- Autor: ProdeAR team
-- Feature: Sección independiente de posiciones y partidos por competición,
--          accesible desde el menú principal (tab "Ligas"), sin necesidad de
--          entrar a un torneo específico.
--
-- Cambios:
--   1. ALTER TABLE competitions: agrega columnas `active` y `format`
--      (active: filtra ligas visibles en el selector, format: 'groups'|'league')
--   2. CREATE TABLE match_broadcasters: normaliza canales de TV/streaming
--      por partido (un partido puede ir por TV abierta, cable y streaming)
--   3. CREATE TABLE league_standings: snapshot de tabla oficial sincronizada
--      desde API-Football (futuro edge function `poll-standings`)
--   4. SEED: inserta las competiciones iniciales (Mundial 2026 + LPF) si
--      no existen todavía. Los IDs 1 y 2 son los naturales del SERIAL.
--
-- IMPORTANTE:
--   - Esta migration es IDEMPOTENTE: usa IF NOT EXISTS y ON CONFLICT.
--     Se puede re-ejecutar sin errores si algo falla a mitad de camino.
--   - Después de correr, REFRESCAR el schema cache de PostgREST:
--     `NOTIFY pgrst, 'reload schema';`
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE: competitions — agregar columnas `active` y `format`
-- ============================================================================
-- `active` (BOOLEAN, default true): filtra competiciones visibles en el
-- selector de la nueva sección "Ligas". Si una competición está inactiva
-- (ej. un Mundial ya finalizado), no aparece en el dropdown.
--
-- `format` (TEXT, default 'league', check groups|league): indica cómo se
-- renderizan las posiciones. 'groups' = fase de grupos (Mundial 2026 →
-- 12 grupos de 4 equipos). 'league' = todos contra todos (LPF → tabla
-- única de 28+ equipos).
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'league'
    CHECK (format IN ('groups', 'league'));

-- ============================================================================
-- 2. CREATE TABLE: match_broadcasters
--    Normaliza los canales de TV/streaming por partido.
--    Un partido puede tener múltiples broadcasters (TV abierta + cable + stream).
--    Reemplaza/amplía el campo `tv_channel` (TEXT) que ya existe en matches.
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_broadcasters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  broadcaster_name TEXT NOT NULL,             -- ej. "TV Pública", "TNT Sports", "Star+"
  broadcaster_type TEXT NOT NULL DEFAULT 'tv'
    CHECK (broadcaster_type IN ('tv', 'streaming', 'radio')),
  country TEXT DEFAULT 'AR',                  -- país de la señal (ej. 'AR', 'BR', 'ES')
  url TEXT,                                   -- link al stream (si aplica)
  is_primary BOOLEAN DEFAULT false,           -- canal principal (se muestra primero)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, broadcaster_name, country)
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_match_broadcasters_match
  ON match_broadcasters (match_id);

CREATE INDEX IF NOT EXISTS idx_match_broadcasters_primary
  ON match_broadcasters (match_id)
  WHERE is_primary = true;

-- ============================================================================
-- 3. CREATE TABLE: league_standings
--    Snapshot de la tabla de posiciones oficial sincronizada desde API-Football.
--    Se actualiza por el edge function `poll-standings` (a implementar en Fase 2).
--
--    Diseño:
--    - `competition_id` INTEGER FK a competitions (mismo patrón que matches).
--    - `season` TEXT: temporada (ej. "2026").
--    - `group_name` TEXT NULLABLE: null para formato league (todos contra todos),
--      "Grupo A"..."Grupo L" para formato groups (Mundial/Champions).
--    - `team_name`, `team_logo`, `position`, `played`, `won`, `drawn`, `lost`,
--      `goals_for`, `goals_against`, `goal_difference`, `points`: campos
--      estándar de standing.
--    - `form` TEXT: últimos 5 resultados (ej. "WWDLW"). Para Fase 2/3.
--    - `api_team_id` INTEGER: ID del equipo en API-Football (para cruzar
--      con matches).
--    - `synced_at` TIMESTAMPTZ: cuándo se bajó la última vez de la API.
--
--    En Fase 1 esta tabla queda VACÍA. La fuente primaria de standings es
--    el cálculo local (client-side) desde los matches ya cargados. La
--    sincronización oficial desde API-Football se implementa en Fase 2.
-- ============================================================================
CREATE TABLE IF NOT EXISTS league_standings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id INTEGER REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  season TEXT NOT NULL,                       -- ej. "2026"
  group_name TEXT,                            -- null para league, "Grupo A" para groups
  team_name TEXT NOT NULL,
  team_logo TEXT,
  position INTEGER NOT NULL,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form TEXT,                                  -- ej. "WWDLW" (Fase 2/3)
  -- Metadata de sincronización
  api_team_id INTEGER,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, season, group_name, team_name)
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_league_standings_competition
  ON league_standings (competition_id, season);

CREATE INDEX IF NOT EXISTS idx_league_standings_group
  ON league_standings (competition_id, season, group_name)
  WHERE group_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_league_standings_position
  ON league_standings (competition_id, season, position);

-- ============================================================================
-- 4. SEED: competiciones iniciales (idempotente)
-- ============================================================================
-- Mundial 2026 (api_football_id = 1, FIFA World Cup → formato groups)
INSERT INTO competitions (id, name, country, logo_url, api_football_id, season, active, format)
VALUES (1, 'Copa del Mundo 2026', 'Internacional', '', 1, '2026', true, 'groups')
ON CONFLICT (id) DO UPDATE SET
  active = EXCLUDED.active,
  format = EXCLUDED.format,
  name = EXCLUDED.name;

-- Liga Profesional Argentina (api_football_id = 128, Liga Profesional → formato league)
INSERT INTO competitions (id, name, country, logo_url, api_football_id, season, active, format)
VALUES (2, 'Liga Profesional Argentina', 'Argentina', '', 128, '2026', true, 'league')
ON CONFLICT (id) DO UPDATE SET
  active = EXCLUDED.active,
  format = EXCLUDED.format,
  name = EXCLUDED.name;

-- Resetear la secuencia para que el próximo INSERT siga después del MAX(id).
-- (PostgreSQL: el SERIAL no se autoincrementa al hacer ON CONFLICT DO NOTHING,
-- pero aquí usamos DO UPDATE, así que ya está OK. Este setval es defensivo
-- por si la tabla competitions tenía datos previos con IDs más altos.)
SELECT setval(
  pg_get_serial_sequence('competitions', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM competitions), 2)
);

-- ============================================================================
-- 5. RLS: habilitar y crear políticas
-- ============================================================================
ALTER TABLE match_broadcasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;

-- match_broadcasters: lectura pública para usuarios autenticados.
-- Escritura: solo vía service role (no se exponen endpoints de inserción
-- a usuarios; se mantienen manualmente en el Dashboard o vía script).
CREATE POLICY "Cualquier usuario autenticado puede leer broadcasters"
ON match_broadcasters FOR SELECT TO authenticated USING (true);

-- league_standings: lectura pública para usuarios autenticados.
-- Escritura: solo vía service role (lo escribe `poll-standings`).
CREATE POLICY "Cualquier usuario autenticado puede leer standings"
ON league_standings FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 6. Refrescar schema cache de PostgREST
--    (CRÍTICO: sin esto, las queries via Supabase JS no ven las columnas nuevas)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr después para confirmar):
-- ============================================================================
-- 1. SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'competitions' AND column_name IN ('active', 'format');
--    → Esperado: 2 filas (active boolean, format text)
--
-- 2. SELECT COUNT(*) FROM match_broadcasters;   → Esperado: 0 (vacía, se popula manualmente)
-- 3. SELECT COUNT(*) FROM league_standings;     → Esperado: 0 (vacía, se popula por poll-standings en Fase 2)
-- 4. SELECT id, name, format, active FROM competitions ORDER BY id;
--    → Esperado: al menos 2 filas (id=1 Mundial groups / id=2 LPF league)
--
-- 5. SELECT tablename, policyname FROM pg_policies
--    WHERE tablename IN ('match_broadcasters', 'league_standings');
--    → Esperado: 2 filas (1 policy por tabla)
-- ============================================================================
