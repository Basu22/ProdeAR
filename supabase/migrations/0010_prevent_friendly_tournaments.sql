-- ============================================================================
-- Migration 0010: Bloqueo de torneos sobre competiciones amistosas
-- ============================================================================
-- Fecha: 2026-06-29
-- Sprint: Seguridad / Integridad de datos
-- Issue: "Se pueden crear torneos de una liga de amistosos"
--
-- Problema:
--   Un usuario con conocimientos técnicos puede bypassear el filtro del
--   frontend (useCompetitions) y crear un torneo sobre una competición
--   marcada como is_friendly=true. Esto permite acumular puntos de partidos
--   amistosos, rompiendo el leaderboard y la integridad del juego.
--
-- Solución (defensa en profundidad, 2 capas):
--   CAPA 1 - RLS Policy: modifica la política INSERT de tournaments para
--            rechazar inserciones donde competition_id apunta a una
--            competición con is_friendly=true.
--   CAPA 2 - Trigger BEFORE INSERT: última línea de defensa que aplica a
--            TODOS los roles (incluido service_role, que bypasea RLS).
--
-- Idempotente: segura de correr múltiples veces.
-- No modifica migraciones existentes (0005, 0007).
-- ============================================================================

-- ============================================================================
-- 0. PRE-FLIGHT CHECKS (verificaciones de prerrequisitos)
-- ============================================================================
-- Verificar que la columna is_friendly existe en competitions.
-- Si no existe, la migration 0007 no se aplicó y hay que correrla primero.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitions'
      AND column_name = 'is_friendly'
  ) THEN
    RAISE EXCEPTION 'PREREQUISITE FAILED: Column competitions.is_friendly does not exist. Run migration 0007 first.';
  END IF;
END $$;

-- ============================================================================
-- 1. ÍNDICE: tournaments.competition_id
-- ============================================================================
-- No existe actualmente. Necesario para:
--   a) Performance de la subquery en la RLS policy (EXISTS con JOIN)
--   b) Performance del trigger (SELECT con WHERE competition_id = NEW.competition_id)
--   c) Queries futuras de "torneos por competición"
--
-- Sin este índice, cada INSERT a tournaments haría un sequential scan en
-- competitions (aunque competitions es chica, es buena práctica indexar FKs).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tournaments_competition_id
  ON public.tournaments (competition_id);

-- ============================================================================
-- 2. CAPA 1: RLS Policy — Modificar política INSERT de tournaments
-- ============================================================================
-- La política actual ("Los usuarios pueden crear torneos") solo valida
-- auth.uid() = owner_id. Se agrega la condición de que la competición
-- NO sea amistosa (is_friendly = false).
--
-- Se usa DROP + CREATE (idempotente con IF EXISTS) para reemplazar la
-- política existente sin dejar duplicados.
--
-- NOTA: Esta política NO aplica a service_role (Supabase by design).
-- Por eso necesitamos la Capa 2 (trigger).
-- ============================================================================
DROP POLICY IF EXISTS "Los usuarios pueden crear torneos"
  ON public.tournaments;

CREATE POLICY "Los usuarios pueden crear torneos"
  ON public.tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1
      FROM public.competitions c
      WHERE c.id = competition_id
        AND c.is_friendly = false
    )
  );

-- ============================================================================
-- 3. CAPA 2: Trigger BEFORE INSERT — Última línea de defensa
-- ============================================================================
-- Función: prevent_friendly_tournaments()
--   - Verifica que competition_id NO apunte a una competición amistosa.
--   - En INSERT: siempre verifica.
--   - En UPDATE: solo verifica si cambió competition_id (para no bloquear
--     ediciones cosméticas de torneos cuya competición fue marcada friendly
--     después de la creación).
--   - Mensaje de error claro en español con ERRCODE custom.
--
-- Trigger: trigger_prevent_friendly_tournaments
--   - BEFORE INSERT OR UPDATE ON tournaments
--   - FOR EACH ROW
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_friendly_tournaments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_friendly BOOLEAN;
  v_comp_name TEXT;
BEGIN
  -- Solo verificar si competition_id cambió (o es INSERT)
  IF TG_OP = 'INSERT' OR OLD.competition_id IS DISTINCT FROM NEW.competition_id THEN

    SELECT c.is_friendly, c.name
    INTO v_is_friendly, v_comp_name
    FROM public.competitions c
    WHERE c.id = NEW.competition_id;

    -- Si la competición no existe, la FK constraint ya va a fallar.
    -- No necesitamos manejar ese caso acá.
    IF v_is_friendly = true THEN
      RAISE EXCEPTION 'No se pueden crear torneos sobre competiciones amistosas. La competición "%" (id: %) está marcada como amistosa.',
        v_comp_name, NEW.competition_id
        USING ERRCODE = 'P0001',
              HINT = 'Elegí una competición oficial (no amistosa) para crear tu torneo.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_friendly_tournaments() IS
  'Bloquea la creación/actualización de torneos sobre competiciones amistosas (is_friendly=true). Migration 0010, 2026-06-29.';

-- Drop idempotente + re-creación del trigger
DROP TRIGGER IF EXISTS trigger_prevent_friendly_tournaments
  ON public.tournaments;

CREATE TRIGGER trigger_prevent_friendly_tournaments
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_friendly_tournaments();

-- ============================================================================
-- 4. Refrescar schema cache de PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente):
--
-- Ver sección 4 del documento de diseño.
-- ============================================================================
