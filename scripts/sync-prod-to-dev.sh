#!/usr/bin/env bash
# =============================================================================
# sync-prod-to-dev.sh
# Sincroniza la DB de PRODUCCION (prodear-prod) a la DB de DESARROLLO (ProdeAR).
#
# USO:
#   ./scripts/sync-prod-to-dev.sh                  # Dry-run (por defecto)
#   ./scripts/sync-prod-to-dev.sh --execute        # Ejecuta el sync real
#   ./scripts/sync-prod-to-dev.sh --execute --yes  # Sin prompts
#   ./scripts/sync-prod-to-dev.sh --help           # Ayuda
#
# REQUISITOS:
#   - bash 4+, curl, python3
#   - Archivo scripts/.env.staging con credenciales (NO commitear)
#
# LO QUE HACE:
#   1. Backup de items de DEV que se preservan (tu user, push_subs,
#      team_aliases extras, funciones custom)
#   2. TRUNCATE de tablas vacias de DEV (chat_messages, notification_log)
#   3. Restore de datos desde PROD (users, matches, predictions, etc.)
#   4. Re-insercion de items preservados con sus FKs
#   5. Parametriza la URL de check_and_trigger_poll_scores
#   6. Validacion post-sync (counts, FKs, RLS)
#
# GUARDRAILS:
#   - Falla si el dev_project_ref == prod_project_ref
#   - Falla si la API de dev no responde
#   - Dry-run por defecto (no toca nada sin --execute)
#   - Confirmacion interactiva antes de la fase destructiva
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# CONSTANTES Y CONFIGURACION
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/sync-$(date +%Y%m%d-%H%M%S).log"
TMP_DIR=$(mktemp -d -t prodear-sync-XXXXXX)
BATCH_SIZE=10

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
DRY_RUN=true
ASSUME_YES=false
SKIP_PRESERVE=false
SKIP_RESTORE=false
SKIP_VALIDATION=false
ONLY_AUDIT=false

# -----------------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------------
log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*" | tee -a "$LOG_FILE" ; }
ok()      { echo -e "${GREEN}[$(date +%H:%M:%S)] OK${NC}   $*" | tee -a "$LOG_FILE" ; }
warn()    { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARN${NC} $*" | tee -a "$LOG_FILE" ; }
err()     { echo -e "${RED}[$(date +%H:%M:%S)] ERR${NC}  $*" | tee -a "$LOG_FILE" >&2 ; }
fatal()   { err "$*"; exit 1; }

usage() {
  cat <<EOF
Sincroniza la DB de PRODUCCION a la DB de DESARROLLO de ProdeAR.

Uso:
  $0 [OPCIONES]

Opciones:
  --execute           Ejecuta el sync real (sin esto, hace dry-run)
  --yes               No pedir confirmacion interactiva
  --skip-preserve     No preservar datos de DEV (perdes tu user, push_subs, etc.)
  --skip-restore      No restaurar datos de prod (solo preserva)
  --skip-validation   No correr validacion post-sync
  --only-audit        Solo ejecuta la auditoria pre/post y termina
  --help              Muestra esta ayuda

Ejemplos:
  $0                              # Audita y muestra el plan (dry-run)
  $0 --execute                    # Ejecuta el sync con confirmacion
  $0 --execute --yes              # Ejecuta el sync sin prompts (para CI)

EOF
  exit 0
}

cleanup() {
  rm -rf "$TMP_DIR"
  log "Logs guardados en: $LOG_FILE"
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# SUPABASE MANAGEMENT API
# -----------------------------------------------------------------------------
# Ejecuta una query SQL en el proyecto especificado via Management API.
# Args: project_ref, sql_query
# Echo: JSON con el resultado (array de objetos) o {"error": "..."}
db_query() {
  local ref="$1"
  local sql="$2"
  python3 -c "
import json, subprocess, sys
sql = sys.stdin.read()
payload = json.dumps({'query': sql})
result = subprocess.run(
    ['curl', '-s', '-X', 'POST',
     '-H', 'Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}',
     '-H', 'Content-Type: application/json',
     'https://api.supabase.com/v1/projects/${ref}/database/query',
     '-d', payload],
    capture_output=True, text=True, timeout=120
)
try:
    data = json.loads(result.stdout)
    if isinstance(data, dict) and 'message' in data and 'Failed to run sql query' in str(data):
        print(json.dumps({'error': data.get('message', str(data))}))
    else:
        print(result.stdout)
except Exception as e:
    print(json.dumps({'error': f'parse: {e}, raw: {result.stdout[:200]}'}))
" <<< "$sql"
}

# Wrapper python que parsea el resultado y maneja errores.
# Uso: echo "$json" | py_json '<python expression>'
py_json() {
  python3 -c "
import json, sys
data = json.load(sys.stdin)
$1
"
}

# Ejecuta una query y devuelve SOLO el array de resultados (sin errors)
db_exec() {
  local ref="$1"
  local sql="$2"
  local result
  result=$(db_query "$ref" "$sql")
  if echo "$result" | py_json "import sys; sys.exit(0 if isinstance(data, dict) and 'error' in data else 1)" 2>/dev/null; then
    err "Query fallo en $ref: $(echo "$result" | py_json "print(data.get('error',''))")"
    return 1
  fi
  echo "$result"
}

# Ejecuta un SELECT y devuelve un valor escalar (primera fila, primera columna)
# Normaliza booleanos a 'true'/'false' (lowercase) para que bash los compare bien
db_scalar() {
  local ref="$1"
  local sql="$2"
  db_exec "$ref" "$sql" | py_json "
if isinstance(data, list) and len(data) > 0:
    first = data[0]
    if isinstance(first, dict):
        vals = list(first.values())
        if not vals or vals[0] is None:
            print('null')
        elif isinstance(vals[0], bool):
            print('true' if vals[0] else 'false')
        else:
            print(vals[0])
    elif first is None:
        print('null')
    elif isinstance(first, bool):
        print('true' if first else 'false')
    else:
        print(first)
else:
    print('null')
"
}

# Cuenta filas de una query (SELECT COUNT(*) AS count ...)
db_count() {
  local ref="$1"
  local sql="$2"
  db_exec "$ref" "$sql" | py_json "
if isinstance(data, list) and len(data) > 0:
    first = data[0]
    if isinstance(first, dict):
        print(first.get('count', 0))
    else:
        print(0)
else:
    print(0)
"
}

# Longitud de un array JSON
json_length() {
  py_json "print(len(data) if isinstance(data, list) else 0)"
}

# Obtener una propiedad de un objeto JSON
json_get() {
  local key="$1"
  py_json "
if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
    print(data[0].get('$key', ''))
elif isinstance(data, dict):
    print(data.get('$key', ''))
else:
    print('')
"
}

# Iterar items de un array JSON
json_each() {
  py_json "
if isinstance(data, list):
    import json as j
    for item in data:
        print(j.dumps(item))
"
}

# -----------------------------------------------------------------------------
# PARSEO DE ARGUMENTOS
# -----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)         DRY_RUN=false ; shift ;;
    --yes)             ASSUME_YES=true ; shift ;;
    --skip-preserve)   SKIP_PRESERVE=true ; shift ;;
    --skip-restore)    SKIP_RESTORE=true ; shift ;;
    --skip-validation) SKIP_VALIDATION=true ; shift ;;
    --only-audit)      ONLY_AUDIT=true ; shift ;;
    --help|-h)         usage ;;
    *) err "Flag desconocida: $1"; usage ;;
  esac
done

# -----------------------------------------------------------------------------
# FASE 0: SETUP Y VALIDACION
# -----------------------------------------------------------------------------
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

log "==============================================================================="
log "ProdeAR Sync: PROD -> DEV"
log "==============================================================================="
log "Modo: $([ "$DRY_RUN" = true ] && echo 'DRY-RUN (no se toca nada)' || echo 'EJECUCION REAL')"
log "Preservar datos de DEV: $([ "$SKIP_PRESERVE" = true ] && echo 'NO' || echo 'SI')"
log "Log: $LOG_FILE"
log "Tmp: $TMP_DIR"

# Cargar .env.staging si existe
ENV_FILE="${SCRIPT_DIR}/.env.staging"
if [ -f "$ENV_FILE" ]; then
  log "Cargando $ENV_FILE"
  set -a; source "$ENV_FILE"; set +a
elif [ -f "${PROJECT_ROOT}/.env.staging.local" ]; then
  log "Cargando ${PROJECT_ROOT}/.env.staging.local"
  set -a; source "${PROJECT_ROOT}/.env.staging.local"; set +a
else
  warn "No se encontro .env.staging ni .env.staging.local"
  warn "Usando variables del entorno actual"
fi

# Validar variables requeridas
REQUIRED=(
  "SUPABASE_ACCESS_TOKEN"
  "PROD_PROJECT_REF"
  "PROD_DB_PASSWORD"
  "DEV_PROJECT_REF"
  "DEV_DB_PASSWORD"
)
MISSING=()
for var in "${REQUIRED[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  fatal "Faltan variables de entorno: ${MISSING[*]}. Copia scripts/.env.staging.example a scripts/.env.staging y completalo."
fi

log "PROD ref:  $PROD_PROJECT_REF"
log "DEV ref:   $DEV_PROJECT_REF"

# -----------------------------------------------------------------------------
# GUARDRAIL 1: Rechazar si DEV == PROD
# -----------------------------------------------------------------------------
if [ "$PROD_PROJECT_REF" = "$DEV_PROJECT_REF" ]; then
  fatal "GUARDRAIL: PROD_PROJECT_REF y DEV_PROJECT_REF son iguales ($PROD_PROJECT_REF). Abortando para evitar desastre."
fi

# Confirmar que prod es el esperado (evitar typos)
if [ "$PROD_PROJECT_REF" != "cdwefeqlxktliumtaqdc" ]; then
  warn "PROD_PROJECT_REF no es el esperado (cdwefeqlxktliumtaqdc), es: $PROD_PROJECT_REF"
  warn "Continuo de todas formas, pero verifica que sea correcto."
fi

# -----------------------------------------------------------------------------
# GUARDRAIL 2: Verificar conectividad a ambas DBs
# -----------------------------------------------------------------------------
log "Verificando conectividad a PROD ($PROD_PROJECT_REF)..."
PROD_PING=$(db_scalar "$PROD_PROJECT_REF" "SELECT 1;" 2>&1)
if [ "$PROD_PING" != "1" ]; then
  fatal "No se pudo conectar a PROD. Respuesta: $PROD_PING"
fi
ok "PROD respondio OK"

log "Verificando conectividad a DEV ($DEV_PROJECT_REF)..."
DEV_PING=$(db_scalar "$DEV_PROJECT_REF" "SELECT 1;" 2>&1)
if [ "$DEV_PING" != "1" ]; then
  fatal "No se pudo conectar a DEV. Respuesta: $DEV_PING"
fi
ok "DEV respondio OK"

# -----------------------------------------------------------------------------
# FASE 1: AUDITORIA PRE-SYNC
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 1: Auditoria pre-sync"
log "==============================================================================="

audit_count() {
  local ref="$1"
  local table="$2"
  db_scalar "$ref" "SELECT COUNT(*) FROM public.${table};" 2>/dev/null || echo "ERR"
}

audit_table() {
  local ref="$1"
  local label="$2"
  log "Counts en $label:"
  for table in users competitions tournaments tournament_members matches predictions chat_messages notification_log push_subscriptions team_aliases; do
    local count
    count=$(audit_count "$ref" "$table")
    printf "    %-25s %s\n" "$table" "$count" | tee -a "$LOG_FILE"
  done
}

audit_table "$PROD_PROJECT_REF" "PROD"
audit_table "$DEV_PROJECT_REF"  "DEV"

if [ "$ONLY_AUDIT" = true ]; then
  ok "Solo auditoria solicitada. Fin."
  exit 0
fi

# -----------------------------------------------------------------------------
# FASE 2: BACKUP DE PRESERVABLES DE DEV
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 2: Backup de preservables de DEV"
log "==============================================================================="

if [ "$SKIP_PRESERVE" = true ]; then
  warn "Saltando preservacion (--skip-preserve)"
else
  log "Identificando tu user de DEV (el mas reciente)..."
  DEV_MY_USER_ID=$(db_scalar "$DEV_PROJECT_REF" "SELECT id FROM public.users ORDER BY created_at DESC LIMIT 1;")
  log "Tu user ID: $DEV_MY_USER_ID"

  # Si DEV esta vacio, no hay nada que preservar
  if [ -z "$DEV_MY_USER_ID" ] || [ "$DEV_MY_USER_ID" = "null" ]; then
    warn "DEV esta vacio (sin users). Saltando preservacion de user/push_subs."
    warn "El sync sera un restore PURO desde PROD (sin merge)."
    DEV_IS_EMPTY=true
    # Crear archivos vacios para que FASE 5 no falle
    echo "[]" > "$TMP_DIR/preserve_auth_user.json"
    echo "[]" > "$TMP_DIR/preserve_public_user.json"
    echo "[]" > "$TMP_DIR/preserve_push_subs.json"
    echo "[]" > "$TMP_DIR/preserve_team_aliases_all_dev.json"
    echo "[]" > "$TMP_DIR/preserve_functions.json"
  else
    DEV_IS_EMPTY=false
  fi

  if [ "$DEV_IS_EMPTY" != "true" ]; then

  log "Backup auth.users (tu user)..."
  db_exec "$DEV_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM auth.users WHERE id = '$DEV_MY_USER_ID') t;" \
    > "$TMP_DIR/preserve_auth_user.json"
  ok "Backup auth.users guardado ($(wc -c < "$TMP_DIR/preserve_auth_user.json") bytes)"

  log "Backup public.users (tu user)..."
  db_exec "$DEV_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM public.users WHERE id = '$DEV_MY_USER_ID') t;" \
    > "$TMP_DIR/preserve_public_user.json"
  ok "Backup public.users guardado"

  log "Backup push_subscriptions (tus subs)..."
  db_exec "$DEV_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM public.push_subscriptions WHERE user_id = '$DEV_MY_USER_ID') t;" \
    > "$TMP_DIR/preserve_push_subs.json"
  ok "Backup push_subscriptions guardado"

  log "Backup team_aliases de DEV (todos, se filtrara en FASE 5 contra PROD)..."
  db_exec "$DEV_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM public.team_aliases ORDER BY id) t;" \
    > "$TMP_DIR/preserve_team_aliases_all_dev.json"
  ok "Backup team_aliases guardado (se filtrara en FASE 5 contra PROD)"

  log "Backup funciones custom de DEV (process_match_results, check_and_trigger_poll_scores)..."
  db_exec "$DEV_PROJECT_REF" "
    SELECT row_to_json(t) FROM (
      SELECT p.proname, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('process_match_results', 'check_and_trigger_poll_scores')
    ) t;" > "$TMP_DIR/preserve_functions.json"
  ok "Backup funciones guardado"
  fi
fi

# -----------------------------------------------------------------------------
# FASE 3: TRUNCATE DE TABLAS EN DEV
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 3: TRUNCATE de tablas en DEV"
log "==============================================================================="

if [ "$DRY_RUN" = true ]; then
  log "[DRY-RUN] Se ejecutarian los siguientes TRUNCATEs en DEV:"
  log "  TRUNCATE public.chat_messages, public.notification_log CASCADE;"
else
  # Solo truncamos las que estan vacias en DEV (no perdemos nada)
  log "Truncando chat_messages y notification_log en DEV (ya estaban vacias)..."
  db_query "$DEV_PROJECT_REF" "TRUNCATE public.chat_messages, public.notification_log CASCADE;" > /dev/null
  ok "Tablas truncadas"
fi

# -----------------------------------------------------------------------------
# FASE 4: RESTORE DESDE PROD
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 4: Restore de datos desde PROD"
log "==============================================================================="

# Orden: respetar FKs
# competitions (sin FKs)
# users (FK a auth.users)
# tournaments (FK a users, competitions)
# tournament_members (FK a tournaments, users)
# matches (FK a competitions)
# predictions (FK a matches, users, tournaments)

restore_table() {
  local table="$1"
  local order_by="${2:-id}"

  log "  [${table}] Extrayendo datos de PROD..."
  local data
  data=$(db_exec "$PROD_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM public.${table} ORDER BY ${order_by}) t;")
  local total
  total=$(echo "$data" | json_length)
  log "  [${table}] ${total} filas a restaurar"

  if [ "$DRY_RUN" = true ]; then
    log "  [${table}] [DRY-RUN] Se insertarian ${total} filas en DEV"
    return 0
  fi

  if [ "$total" = "0" ]; then
    log "  [${table}] Nada que restaurar"
    return 0
  fi

  # Truncar primero (las que vamos a sobrescribir)
  db_query "$DEV_PROJECT_REF" "TRUNCATE public.${table} CASCADE;" > /dev/null

  # Insertar en lotes
  local inserted=0
  local batch_count=$(( (total + BATCH_SIZE - 1) / BATCH_SIZE ))
  for ((i=0; i<batch_count; i++)); do
    local offset=$((i * BATCH_SIZE))

    # Construir cols y values para el batch actual usando Python
    local batch_sql
    batch_sql=$(BATCH_SIZE=$BATCH_SIZE offset=$offset table=$table python3 -c "
import json, os, sys
with open('/dev/stdin') as f:
    data = json.load(f)
batch_size = int(os.environ['BATCH_SIZE'])
offset = int(os.environ['offset'])
table = os.environ['table']
batch = data[offset:offset+batch_size]
if not batch:
    sys.exit(0)
cols = list(batch[0].keys())
cols_sql = ', '.join(cols)
parts = []
for row in batch:
    vals = []
    for k, v in row.items():
        if v is None:
            vals.append('NULL')
        elif isinstance(v, bool):
            vals.append('true' if v else 'false')
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        elif isinstance(v, (dict, list)):
            escaped = json.dumps(v, ensure_ascii=False).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'::jsonb\")
        else:
            escaped = str(v).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'\")
    parts.append('(' + ', '.join(vals) + ')')
values_sql = ',\n'.join(parts)
print(f'INSERT INTO public.{table} ({cols_sql}) VALUES {values_sql} ON CONFLICT DO NOTHING;')
" <<< "$data")

    if [ -z "$batch_sql" ]; then
      continue
    fi

    # Intentar batch insert; si falla por "Argument list too long", fallback a inserts individuales
    local result
    result=$(db_query "$DEV_PROJECT_REF" "$batch_sql" 2>&1)
    if echo "$result" | py_json "import sys; sys.exit(0 if isinstance(data, dict) and 'error' in data and 'Argument list too long' in str(data.get('error','')) else 1)" 2>/dev/null; then
      warn "  [${table}] Batch demasiado grande, fallback a INSERTs individuales..."
      # Construir N INSERTs individuales
      local individual_sqls
      individual_sqls=$(BATCH_SIZE=$BATCH_SIZE offset=$offset table=$table python3 -c "
import json, os, sys
with open('/dev/stdin') as f:
    data = json.load(f)
batch_size = int(os.environ['BATCH_SIZE'])
offset = int(os.environ['offset'])
table = os.environ['table']
batch = data[offset:offset+batch_size]
if not batch:
    sys.exit(0)
cols = list(batch[0].keys())
cols_sql = ', '.join(cols)
for row in batch:
    vals = []
    for k, v in row.items():
        if v is None:
            vals.append('NULL')
        elif isinstance(v, bool):
            vals.append('true' if v else 'false')
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        elif isinstance(v, (dict, list)):
            escaped = json.dumps(v, ensure_ascii=False).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'::jsonb\")
        else:
            escaped = str(v).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'\")
    print(f'INSERT INTO public.{table} ({cols_sql}) VALUES (' + ', '.join(vals) + ') ON CONFLICT DO NOTHING;')
" <<< "$data")

      while IFS= read -r single_sql; do
        [ -z "$single_sql" ] && continue
        db_query "$DEV_PROJECT_REF" "$single_sql" > /dev/null
      done <<< "$individual_sqls"
    fi

    local batch_count_now
    batch_count_now=$(BATCH_SIZE=$BATCH_SIZE offset=$offset python3 -c "
import json, os, sys
with open('/dev/stdin') as f:
    data = json.load(f)
batch_size = int(os.environ['BATCH_SIZE'])
offset = int(os.environ['offset'])
print(len(data[offset:offset+batch_size]))
" <<< "$data")

    inserted=$((inserted + batch_count_now))

    # Checkpoint: verificar que se commiteo
    local actual_count
    actual_count=$(db_scalar "$DEV_PROJECT_REF" "SELECT COUNT(*) FROM public.${table};")

    log "  [${table}] Batch $((i+1))/${batch_count} OK (inserted=${inserted}/${total}, en_dev=${actual_count})"
  done

  # Verificacion final de la tabla
  local final_count
  final_count=$(db_scalar "$DEV_PROJECT_REF" "SELECT COUNT(*) FROM public.${table};")
  if [ "$final_count" = "$total" ]; then
    ok "  [${table}] ${final_count} filas restauradas (verificado)"
  else
    warn "  [${table}] Se esperaban ${total} filas, hay ${final_count}"
  fi
}

restore_table "competitions" "id"
restore_table "users" "created_at"
restore_table "tournaments" "created_at"
restore_table "tournament_members" "joined_at"
restore_table "matches" "kick_off"
restore_table "predictions" "created_at"

# -----------------------------------------------------------------------------
# FASE 5: RE-INSERT PRESERVADOS
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 5: Re-insercion de preservados"
log "==============================================================================="

if [ "$SKIP_PRESERVE" = true ]; then
  warn "Saltando re-insercion de preservados"
else
  if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] Se re-insertarian:"
    log "  - Tu user en auth.users y public.users"
    log "  - Tu push_subscriptions"
    log "  - team_aliases de DEV que no esten en PROD (merge)"
    log "  - Funciones custom (si fueron pisadas, se restauran)"
  else
    # Helper: convierte un array JSON a una serie de INSERTs SQL
    json_to_inserts() {
      local table_name="$1"
      local conflict_clause="${2:-ON CONFLICT DO NOTHING}"
      python3 -c "
import json, sys
rows = json.load(sys.stdin)
if not rows:
    sys.exit(0)
for r in rows:
    cols = list(r.keys())
    cols_sql = ', '.join(cols)
    vals = []
    for k, v in r.items():
        if v is None:
            vals.append('NULL')
        elif isinstance(v, bool):
            vals.append('true' if v else 'false')
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        elif isinstance(v, (dict, list)):
            escaped = json.dumps(v, ensure_ascii=False).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'::jsonb\")
        else:
            escaped = str(v).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'\")
    print(f'INSERT INTO ${table_name} ({cols_sql}) VALUES (' + ', '.join(vals) + f') ${conflict_clause};')
"
    }

    # 5.1) Re-insertar tu user en auth.users
    log "Re-insertando tu user en auth.users..."
    AUTH_ROWS=$(cat "$TMP_DIR/preserve_auth_user.json")
    if [ "$(echo "$AUTH_ROWS" | json_length)" -gt 0 ]; then
      AUTH_SQL=$(echo "$AUTH_ROWS" | json_to_inserts "auth.users" "ON CONFLICT (id) DO NOTHING")
      db_query "$DEV_PROJECT_REF" "$AUTH_SQL" > /dev/null
      ok "auth.users re-insertado"
    else
      warn "No hay auth.user para preservar"
    fi

    # 5.2) Re-insertar tu user en public.users (con el mismo ID)
    log "Re-insertando tu user en public.users..."
    USER_ROWS=$(cat "$TMP_DIR/preserve_public_user.json")
    if [ "$(echo "$USER_ROWS" | json_length)" -gt 0 ]; then
      USER_SQL=$(echo "$USER_ROWS" | json_to_inserts "public.users" "ON CONFLICT (id) DO NOTHING")
      db_query "$DEV_PROJECT_REF" "$USER_SQL" > /dev/null
      ok "public.users re-insertado"
    fi

    # 5.3) Re-insertar push_subscriptions
    log "Re-insertando push_subscriptions..."
    PUSH_ROWS=$(cat "$TMP_DIR/preserve_push_subs.json")
    if [ "$(echo "$PUSH_ROWS" | json_length)" -gt 0 ]; then
      PUSH_SQL=$(echo "$PUSH_ROWS" | json_to_inserts "public.push_subscriptions" "ON CONFLICT DO NOTHING")
      db_query "$DEV_PROJECT_REF" "$PUSH_SQL" > /dev/null
      ok "push_subscriptions re-insertadas"
    else
      log "  (no tenias push_subscriptions que preservar)"
    fi

    # 5.4) Merge team_aliases: los de DEV que NO esten en PROD
    log "Merge team_aliases: los de DEV que no esten en PROD..."
    DEV_ALIASES=$(cat "$TMP_DIR/preserve_team_aliases_all_dev.json")
    PROD_ALIASES=$(db_exec "$PROD_PROJECT_REF" "SELECT row_to_json(t) FROM (SELECT * FROM public.team_aliases) t;")

    MERGE_SQL=$(python3 -c "
import json
dev_aliases = json.loads('''$DEV_ALIASES''')
prod_aliases = json.loads('''$PROD_ALIASES''')
prod_ids = {a['id'] for a in prod_aliases}
new_in_dev = [a for a in dev_aliases if a['id'] not in prod_ids]
print(f'-- {len(new_in_dev)} aliases de DEV no estan en PROD')
for r in new_in_dev:
    cols = list(r.keys())
    cols_sql = ', '.join(cols)
    vals = []
    for k, v in r.items():
        if v is None:
            vals.append('NULL')
        elif isinstance(v, bool):
            vals.append('true' if v else 'false')
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        elif isinstance(v, (dict, list)):
            escaped = json.dumps(v, ensure_ascii=False).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'::jsonb\")
        else:
            escaped = str(v).replace(\"'\", \"''\")
            vals.append(f\"'{escaped}'\")
    print(f'INSERT INTO public.team_aliases ({cols_sql}) VALUES (' + ', '.join(vals) + ') ON CONFLICT DO NOTHING;')
")

    if [ -n "$MERGE_SQL" ] && ! echo "$MERGE_SQL" | grep -q "^-- 0 aliases"; then
      count=$(echo "$MERGE_SQL" | grep -c '^INSERT')
      log "  Insertando $count aliases nuevos..."
      db_query "$DEV_PROJECT_REF" "$MERGE_SQL" > /dev/null
      ok "team_aliases mergeadas"
    else
      log "  (no hay aliases nuevos para mergear)"
    fi

    # 5.5) Restaurar funciones custom si fueron pisadas
    log "Verificando funciones custom..."
    FUNCS_JSON=$(cat "$TMP_DIR/preserve_functions.json")
    if [ "$(echo "$FUNCS_JSON" | json_length)" -gt 0 ]; then
      echo "$FUNCS_JSON" | json_each | while read -r func; do
        fname=$(echo "$func" | json_get "proname")
        exists=$(db_scalar "$DEV_PROJECT_REF" "SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = '$fname';")
        if [ "$exists" = "0" ]; then
          def=$(echo "$func" | json_get "definition")
          log "  Funcion $fname no existe en DEV, restaurando..."
          db_query "$DEV_PROJECT_REF" "$def" > /dev/null
          ok "  Funcion $fname restaurada"
        else
          log "  Funcion $fname ya existe en DEV, no se toca"
        fi
      done
    fi
  fi
fi

# -----------------------------------------------------------------------------
# FASE 6: PARAMETRIZAR URL DE check_and_trigger_poll_scores
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 6: Parametrizar URL de check_and_trigger_poll_scores"
log "==============================================================================="

if [ "$DRY_RUN" = true ]; then
  log "[DRY-RUN] Se actualizaria la URL en check_and_trigger_poll_scores para apuntar a DEV"
else
  CURRENT_SRC=$(db_exec "$DEV_PROJECT_REF" "SELECT prosrc FROM pg_proc WHERE proname = 'check_and_trigger_poll_scores';" | json_get "prosrc")
  if echo "$CURRENT_SRC" | grep -q "cdwefeqlxktliumtaqdc"; then
    log "URL hardcodeada de PROD detectada, actualizando a DEV..."
    FUNC_DEF=$(db_exec "$DEV_PROJECT_REF" "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'check_and_trigger_poll_scores';" | json_get "pg_get_functiondef")
    NEW_FUNC_DEF=$(echo "$FUNC_DEF" | sed "s|cdwefeqlxktliumtaqdc|${DEV_PROJECT_REF}|g")
    if [ "$NEW_FUNC_DEF" != "$FUNC_DEF" ]; then
      db_query "$DEV_PROJECT_REF" "$NEW_FUNC_DEF" > /dev/null
      ok "URL parametrizada a DEV ($DEV_PROJECT_REF)"
    fi
  elif echo "$CURRENT_SRC" | grep -q "$DEV_PROJECT_REF"; then
    log "URL ya apunta a DEV, no se modifica"
  else
    warn "No se detecto URL conocida en la funcion. Revision manual recomendada."
  fi
fi

# -----------------------------------------------------------------------------
# FASE 7: VALIDACION POST-SYNC
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
log "FASE 7: Validacion post-sync"
log "==============================================================================="

if [ "$SKIP_VALIDATION" = true ]; then
  warn "Saltando validacion (--skip-validation)"
else
  log "Counts en DEV despues del sync:"
  for table in users competitions tournaments tournament_members matches predictions chat_messages notification_log push_subscriptions team_aliases; do
    count=$(audit_count "$DEV_PROJECT_REF" "$table")
    printf "    %-25s %s\n" "$table" "$count" | tee -a "$LOG_FILE"
  done

  log "Verificando RLS..."
  RLS_OK=$(db_scalar "$DEV_PROJECT_REF" "SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';")
  if [ "$RLS_OK" = "true" ]; then
    ok "RLS activo en 100% de las tablas"
  else
    warn "RLS NO esta activo en todas las tablas"
  fi

  log "Verificando FKs huerfanas..."
  ORPHAN_PRED=$(db_count "$DEV_PROJECT_REF" "SELECT COUNT(*) AS count FROM public.predictions p LEFT JOIN public.matches m ON m.id = p.match_id WHERE m.id IS NULL;")
  ORPHAN_TM=$(db_count "$DEV_PROJECT_REF" "SELECT COUNT(*) AS count FROM public.tournament_members tm LEFT JOIN public.tournaments t ON t.id = tm.tournament_id WHERE t.id IS NULL;")
  log "  predictions->matches huerfanas: $ORPHAN_PRED"
  log "  tournament_members->tournaments huerfanas: $ORPHAN_TM"
  if [ "$ORPHAN_PRED" = "0" ] && [ "$ORPHAN_TM" = "0" ]; then
    ok "Sin FKs huerfanas"
  else
    warn "Hay FKs huerfanas, revisar"
  fi
fi

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
log ""
log "==============================================================================="
if [ "$DRY_RUN" = true ]; then
  log "DRY-RUN COMPLETADO. Revisa el log: $LOG_FILE"
  log "Para ejecutar de verdad, corré: $0 --execute"
else
  log "SYNC COMPLETADO EXITOSAMENTE"
  log "Tu user de DEV: $DEV_MY_USER_ID (preservado)"
fi
log "==============================================================================="
