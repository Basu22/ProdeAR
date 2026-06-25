#!/usr/bin/env bash
# =============================================================================
# sync-prod-to-dev-pgdump.sh
# Sincroniza PROD -> DEV usando pg_dump + pg_restore (nativo PostgreSQL).
# Es la version "hard core" del script, reemplaza a la version basada en
# la Management API de Supabase.
#
# REQUISITOS:
#   - psql, pg_dump, pg_restore (postgresql-client)
#   - Archivo .env.staging con credenciales
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/sync-pgdump-$(date +%Y%m%d-%H%M%S).log"
DUMP_FILE_PUBLIC=$(mktemp -t prodear-dump-public-XXXXXX.dump)
DUMP_FILE_AUTH=$(mktemp -t prodear-dump-auth-XXXXXX.dump)

mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*" | tee -a "$LOG_FILE" ; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] OK${NC}   $*" | tee -a "$LOG_FILE" ; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARN${NC} $*" | tee -a "$LOG_FILE" ; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERR${NC}  $*" | tee -a "$LOG_FILE" >&2 ; }
fatal(){ err "$*"; cleanup; exit 1; }

cleanup() { rm -f "$DUMP_FILE_PUBLIC" "$DUMP_FILE_AUTH"; log "Dumps temporales borrados"; log "Log: $LOG_FILE"; }
trap cleanup EXIT

usage() {
  cat <<EOF
Uso: $0 [--execute] [--yes] [--help]

Sin flags: dry-run (solo muestra el plan, NO toca nada)
--execute  : ejecuta el sync real
--yes      : no pide confirmacion
EOF
  exit 0
}

DRY_RUN=true
ASSUME_YES=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) DRY_RUN=false; shift ;;
    --yes) ASSUME_YES=true; shift ;;
    --help|-h) usage ;;
    *) err "Flag desconocida: $1"; usage ;;
  esac
done

# Cargar .env.staging
ENV_FILE="${SCRIPT_DIR}/.env.staging"
[ -f "$ENV_FILE" ] && { log "Cargando $ENV_FILE"; set -a; source "$ENV_FILE"; set +a; }

# Validar variables
for v in PROD_PROJECT_REF PROD_DB_PASSWORD DEV_PROJECT_REF DEV_DB_PASSWORD; do
  [ -z "${!v:-}" ] && fatal "Falta variable: $v"
done

# Connection strings
PROD_HOST="db.${PROD_PROJECT_REF}.supabase.co"
DEV_HOST="db.${DEV_PROJECT_REF}.supabase.co"
PROD_CONN="postgresql://postgres:${PROD_DB_PASSWORD}@${PROD_HOST}:5432/postgres"
DEV_CONN="postgresql://postgres:${DEV_DB_PASSWORD}@${DEV_HOST}:5432/postgres"

log "==============================================================================="
log "ProdeAR Sync (pg_dump via Docker): PROD -> DEV"
log "==============================================================================="
log "Modo: $([ "$DRY_RUN" = true ] && echo 'DRY-RUN' || echo 'EJECUCION REAL')"
log "PROD: $PROD_HOST"
log "DEV:  $DEV_HOST"
log "Dump public: $DUMP_FILE_PUBLIC"
log "Dump auth:   $DUMP_FILE_AUTH"

# Guardrail
[ "$PROD_PROJECT_REF" = "$DEV_PROJECT_REF" ] && fatal "PROD == DEV. Abortando."

# Wrapper para correr psql/pg_dump/pg_restore via Docker postgres:17
# stdout = output normal, stderr = errores (separados para que se vean)
run_pg() {
  local cmd="$1"
  local conn="$2"
  docker run --rm -i --network=host postgres:17 "$cmd" "$conn"
}

# Test conectividad (capturando stderr para ver errores)
log "Testeando conectividad (via Docker postgres:17)..."
prod_err=$(echo "SELECT 'PROD_OK';" | run_pg psql "$PROD_CONN" 2>&1 >/dev/null)
[ $? -ne 0 ] && fatal "No se pudo conectar a PROD: $prod_err"
dev_err=$(echo "SELECT 'DEV_OK';"  | run_pg psql "$DEV_CONN"  2>&1 >/dev/null)
[ $? -ne 0 ] && fatal "No se pudo conectar a DEV: $dev_err"
ok "Conectividad OK en ambas DBs"

# ============================================================================
# AUDITORIA PRE-SYNC
# ============================================================================
log ""
log "FASE 1: Auditoria pre-sync"

audit_db() {
  local label="$1"
  local conn="$2"
  log "Counts en $label:"
  for table in users competitions tournaments tournament_members matches predictions chat_messages notification_log push_subscriptions team_aliases; do
    local count
    count=$(echo "SELECT COUNT(*) FROM public.${table};" | docker run --rm -i --network=host postgres:17 psql "$conn" -tA 2>/dev/null | tr -d ' \n' || echo "ERR")
    [ -z "$count" ] && count="ERR"
    printf "    %-25s %s\n" "$table" "$count" | tee -a "$LOG_FILE"
  done
}

audit_db "PROD" "$PROD_CONN"
audit_db "DEV"  "$DEV_CONN"

[ "$DRY_RUN" = true ] && { ok "DRY-RUN: solo se mostraria el plan. Use --execute para correr."; exit 0; }

# ============================================================================
# DUMP DE PROD
# ============================================================================
log ""
log "FASE 2: pg_dump de PROD (data-only, custom format)"
log "Tablas excluidas: chat_messages, notification_log, push_subscriptions"

# Dump en DOS pasos: primero public, despues auth
# Razon: --table y --schema se pisotean mutuamente en pg_dump, asi que
# hacemos dos dumps separados y los restauramos en orden.

# Dump 1: schema public
docker run --rm -i --network=host postgres:17 pg_dump "$PROD_CONN" \
  --data-only \
  --schema=public \
  --format=custom \
  --no-owner \
  --no-privileges \
  --exclude-table=public.chat_messages \
  --exclude-table=public.notification_log \
  --exclude-table=public.push_subscriptions \
  > "$DUMP_FILE_PUBLIC" 2> >(tee -a "$LOG_FILE" >&2)

dump_size_pub=$(ls -lh "$DUMP_FILE_PUBLIC" 2>/dev/null | awk '{print $5}')
ok "Dump public completado: ${dump_size_pub:-?}"

# Dump 2: auth.users + auth.identities (necesarios para FK desde public.users)
docker run --rm -i --network=host postgres:17 pg_dump "$PROD_CONN" \
  --data-only \
  --table=auth.users \
  --table=auth.identities \
  --format=custom \
  --no-owner \
  --no-privileges \
  > "$DUMP_FILE_AUTH" 2> >(tee -a "$LOG_FILE" >&2)

dump_size_auth=$(ls -lh "$DUMP_FILE_AUTH" 2>/dev/null | awk '{print $5}')
ok "Dump auth completado: ${dump_size_auth:-?}"

# ============================================================================
# PREPARE DEV
# ============================================================================
log ""
log "FASE 3: Preparar DEV (truncar tablas, desactivar triggers)"

# Truncar tablas
docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" <<'SQL' 2>&1 | tee -a "$LOG_FILE"
TRUNCATE public.predictions CASCADE;
TRUNCATE public.tournament_members CASCADE;
TRUNCATE public.tournaments CASCADE;
TRUNCATE public.matches CASCADE;
TRUNCATE public.users CASCADE;
TRUNCATE public.competitions CASCADE;
TRUNCATE public.chat_messages CASCADE;
TRUNCATE public.notification_log CASCADE;
TRUNCATE public.push_subscriptions CASCADE;
TRUNCATE public.team_aliases CASCADE;
TRUNCATE auth.users CASCADE;
TRUNCATE auth.identities CASCADE;
-- Deshabilitar SOLO los triggers de USUARIO (no los de sistema RI que son autogenerados)
-- de las tablas a restaurar, para evitar que bloqueen el bulk insert
-- (check_prediction_lock, check_tournament_member_limit, etc.)
ALTER TABLE public.users DISABLE TRIGGER USER;
ALTER TABLE public.competitions DISABLE TRIGGER USER;
ALTER TABLE public.tournaments DISABLE TRIGGER USER;
ALTER TABLE public.tournament_members DISABLE TRIGGER USER;
ALTER TABLE public.matches DISABLE TRIGGER USER;
ALTER TABLE public.predictions DISABLE TRIGGER USER;
ALTER TABLE public.team_aliases DISABLE TRIGGER USER;
-- NOTA: NO deshabilitamos triggers en auth.users (no somos owners de esa tabla).
-- El problema del trigger on_auth_user_created se resuelve truncando public.users
-- entre los dos restores (ver FASE 4).
SELECT 'Truncate OK' AS status;
SQL

# ============================================================================
# RESTORE EN DEV
# ============================================================================
log ""
log "FASE 4: pg_restore en DEV"
log "Restaurando datos (puede tomar 1-2 minutos)..."

log "Restaurando auth.users + auth.identities (PRIMERO, para que las FKs se satisfagan)..."
docker run --rm -i --network=host postgres:17 pg_restore \
  --dbname="$DEV_CONN" \
  --data-only \
  --no-owner \
  --no-privileges \
  --single-transaction \
  < "$DUMP_FILE_AUTH" 2> >(tee -a "$LOG_FILE" >&2)

# El trigger on_auth_user_created crea automaticamente filas en public.users
# al insertar en auth.users. Como no podemos deshabilitar el trigger (Supabase
# es owner de auth), truncamos public.users antes de restaurar el schema public.
log "Limpiando public.users (creadas por el trigger durante el restore de auth)..."
echo "TRUNCATE public.users CASCADE;" \
  | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" 2>&1 | tee -a "$LOG_FILE"

log "Restaurando schema public..."
docker run --rm -i --network=host postgres:17 pg_restore \
  --dbname="$DEV_CONN" \
  --data-only \
  --no-owner \
  --no-privileges \
  --single-transaction \
  < "$DUMP_FILE_PUBLIC" 2> >(tee -a "$LOG_FILE" >&2)

ok "Restore completado"

# ============================================================================
# VALIDACION
# ============================================================================
log ""
log "FASE 5: Validacion post-sync"
log "Counts en DEV despues del sync:"
for table in users competitions tournaments tournament_members matches predictions chat_messages notification_log push_subscriptions team_aliases; do
  count=$(echo "SELECT COUNT(*) FROM public.${table};" | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" -tA 2>/dev/null | tr -d ' ' || echo "ERR")
  printf "    %-25s %s\n" "$table" "$count" | tee -a "$LOG_FILE"
done

# RLS check
log "Verificando RLS..."
rls_ok=$(echo "SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';" \
  | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" -tA 2>/dev/null | tr -d ' ')
[ "$rls_ok" = "t" ] && ok "RLS activo en 100% de las tablas" || warn "RLS: $rls_ok"

# FKs huerfanas
log "Verificando FKs huerfanas..."
orphan_pred=$(echo "SELECT COUNT(*) FROM public.predictions p LEFT JOIN public.matches m ON m.id = p.match_id WHERE m.id IS NULL;" \
  | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" -tA 2>/dev/null | tr -d ' ')
orphan_tm=$(echo "SELECT COUNT(*) FROM public.tournament_members tm LEFT JOIN public.tournaments t ON t.id = tm.tournament_id WHERE t.id IS NULL;" \
  | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" -tA 2>/dev/null | tr -d ' ')
log "  predictions->matches huerfanas: $orphan_pred"
log "  tournament_members->tournaments huerfanas: $orphan_tm"
[ "$orphan_pred" = "0" ] && [ "$orphan_tm" = "0" ] && ok "Sin FKs huerfanas" || warn "Hay FKs huerfanas"

# Rehabilitar los triggers deshabilitados
log "Rehabilitando triggers..."
echo "ALTER TABLE public.users ENABLE TRIGGER USER;
ALTER TABLE public.competitions ENABLE TRIGGER USER;
ALTER TABLE public.tournaments ENABLE TRIGGER USER;
ALTER TABLE public.tournament_members ENABLE TRIGGER USER;
ALTER TABLE public.matches ENABLE TRIGGER USER;
ALTER TABLE public.predictions ENABLE TRIGGER USER;
ALTER TABLE public.team_aliases ENABLE TRIGGER USER;" \
  | docker run --rm -i --network=host postgres:17 psql "$DEV_CONN" 2>&1 | tee -a "$LOG_FILE"

log ""
log "==============================================================================="
ok "SYNC COMPLETADO EXITOSAMENTE"
log "DEV ahora tiene los datos de PROD"
log "==============================================================================="
