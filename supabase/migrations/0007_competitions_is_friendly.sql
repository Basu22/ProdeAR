-- ============================================================================
-- Migration 0007: competitions.is_friendly — Filtrar amistosos del selector
-- ============================================================================
-- Fecha: 2026-06-23
-- Feature: Sprint 5 — Selector de competiciones escalable + filtro de amistosos
--
-- Cambios:
--   1. ALTER TABLE competitions ADD COLUMN is_friendly boolean DEFAULT false
--   2. Backfill: marcar como is_friendly=true las competiciones que matcheen
--      criterios de amistoso (nombre contiene "amistoso"/"friendly", o no tienen
--      formato definido — esto último es un fallback defensivo).
--   3. NOTIFY pgrst, 'reload schema' para refrescar cache de PostgREST.
--
-- Decisión:
--   - Se prefiere marcar is_friendly en la DB (explícito) en vez de filtrar
--     por heurística en cliente (más performante y testeable).
--   - El cliente filtra con `WHERE is_friendly = false AND format IS NOT NULL`.
--   - El fallback a format IS NULL es defensivo: si la columna is_friendly no
--     se populó correctamente, las competiciones sin formato se ocultan.
--
-- Idempotente: seguro de correr múltiples veces.
-- ============================================================================

-- 1. Nueva columna is_friendly (default false = "es una liga real")
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS is_friendly boolean DEFAULT false;

COMMENT ON COLUMN competitions.is_friendly IS
  'Si true, la competición es un amistoso y NO se muestra en el selector de ligas. Default: false. Sprint 5 2026-06-23.';

-- 2. Backfill: marcar amistosos existentes
--    Criterio 1: el nombre contiene "amistoso" o "friendly" (case-insensitive)
UPDATE competitions
SET is_friendly = true
WHERE is_friendly = false
  AND (
    LOWER(name) LIKE '%amistoso%'
    OR LOWER(name) LIKE '%amistosa%'
    OR LOWER(name) LIKE '%friendly%'
    OR LOWER(name) LIKE '%friendlies%'
    OR LOWER(name) LIKE '%test match%'
  );

--    Criterio 2: competiciones sin formato definido (defensivo, por si la 0005
--    no se aplicó completamente). Si format IS NULL, asumimos amistoso.
UPDATE competitions
SET is_friendly = true
WHERE is_friendly = false
  AND format IS NULL;

-- 3. Refrescar schema cache de PostgREST para que tome la nueva columna
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRATION (correr manualmente):
--
--   SELECT id, name, country, format, is_friendly
--   FROM competitions
--   ORDER BY is_friendly, id;
--
-- Las competiciones con is_friendly=true NO deben aparecer en /ligas.
-- Las competiciones con format=NULL también quedan ocultas (defensivo).
-- ============================================================================
