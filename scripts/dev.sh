#!/usr/bin/env bash
# =============================================================================
# scripts/dev.sh
#
# Levanta el ambiente de desarrollo completo de ProdeAR.
# Verifica pre-requisitos, instala lo que falte, y arranca Vite con
# el Service Worker activado.
#
# Uso:
#   ./scripts/dev.sh         (con permisos de ejecución)
#   bash scripts/dev.sh      (alternativa)
#   npm run dev:sh           (atajo vía package.json)
#
# Idempotente: lo podés correr cuantas veces quieras.
# =============================================================================

set -euo pipefail

# ── Helpers de output (con fallback si no hay TTY) ─────────────────
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ -n "${TERM:-}" ]] && tput colors >/dev/null 2>&1; then
	RED=$(tput setaf 1)
	GREEN=$(tput setaf 2)
	YELLOW=$(tput setaf 3)
	BLUE=$(tput setaf 4)
	CYAN=$(tput setaf 6)
	BOLD=$(tput bold)
	DIM=$(tput dim)
	RESET=$(tput sgr0)
else
	RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' RESET=''
fi

info() { printf "${BLUE}ℹ${RESET}  %s\n" "$*"; }
ok() { printf "${GREEN}✅${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${RESET}  %s\n" "$*"; }
err() { printf "${RED}❌${RESET} %s\n" "$*" >&2; }
step() { printf "\n${BOLD}${CYAN}▶ %s${RESET}\n" "$*"; }

# ── Banner ─────────────────────────────────────────────────────────
clear
printf "${BOLD}${CYAN}"
cat <<'EOF'
   ___                               
  / _ \ _ __  ___ _ __  _ __   
 | | | | '_ \/ _ \ '_ \| '_ \  
 | |_| | |_)  __/ | | | | | |
  \___/| .__/\___|_| |_|_| |_|
       |_|                      
EOF
printf "${RESET}${DIM}  Ambiente de desarrollo local con Service Worker${RESET}\n\n"

# ── 1. Verificar que estamos en el proyecto correcto ───────────────
step "Verificando directorio del proyecto"

if [[ ! -f "package.json" ]]; then
	err "No se encontró package.json. ¿Estás en la raíz del proyecto ProdeAR?"
	printf "    ${DIM}Tip: cd /home/flink/Documentos/ProdeAR${RESET}\n"
	exit 1
fi
ok "Estamos en $(pwd)"

# ── 2. Verificar versión de Node ──────────────────────────────────
step "Verificando Node.js"

NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
	err "Se requiere Node.js >= 18 (tenés $(node -v 2>/dev/null || echo 'no instalado'))."
	exit 1
fi
ok "Node.js $(node -v)"

# ── 3. Verificar/instalar dependencias ─────────────────────────────
step "Verificando dependencias (node_modules)"

if [[ ! -d "node_modules" ]]; then
	warn "node_modules no existe. Corriendo 'npm install'..."
	npm install
	ok "Dependencias instaladas"
else
	# Detectar si package.json cambió desde la última instalación
	if [[ "package.json" -nt "node_modules" ]]; then
		warn "package.json es más nuevo que node_modules. Corriendo 'npm install'..."
		npm install
		ok "Dependencias actualizadas"
	else
		ok "Dependencias OK"
	fi
fi

# ── 4. Verificar .env.local ───────────────────────────────────────
step "Verificando variables de entorno"

if [[ ! -f ".env.local" ]]; then
	warn ".env.local no existe."
	printf "\n${YELLOW}Necesitás crearlo con esta estructura mínima:${RESET}\n\n"
	cat <<'ENV'
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
ENV
	printf "\n${DIM}Después volvé a correr este script.${RESET}\n"
	exit 1
fi
ok ".env.local existe"

# ── 5. Verificar VAPID keys ───────────────────────────────────────
step "Verificando claves VAPID para Push Notifications"

if ! grep -q "^VITE_VAPID_PUBLIC_KEY=" .env.local 2>/dev/null; then
	warn "VITE_VAPID_PUBLIC_KEY no está en .env.local"
	printf "\n${YELLOW}Necesitás generar las claves VAPID una sola vez:${RESET}\n\n"
	printf "    ${BOLD}npm run generate-vapid${RESET}\n\n"
	printf "${DIM}Esto escribe la clave pública en .env.local y la privada en${RESET}\n"
	printf "${DIM}.vapid-private.txt (con permisos 0600). Después podés borrar${RESET}\n"
	printf "${DIM}ese archivo y configurar los 3 secrets en Supabase Dashboard.${RESET}\n"
	exit 1
fi

VAPID_VALUE=$(grep "^VITE_VAPID_PUBLIC_KEY=" .env.local | cut -d'=' -f2-)
if [[ -z "$VAPID_VALUE" ]]; then
	err "VITE_VAPID_PUBLIC_KEY está vacía en .env.local"
	printf "${DIM}Tip: re-generala con 'npm run generate-vapid'${RESET}\n"
	exit 1
fi
ok "VITE_VAPID_PUBLIC_KEY presente (${#VAPID_VALUE} caracteres)"

# ── 6. Verificar Service Worker custom ─────────────────────────────
step "Verificando Service Worker custom"

if [[ ! -f "src/service-worker.ts" ]]; then
	warn "src/service-worker.ts no existe — el SW va a estar deshabilitado"
else
	SW_HANDLERS=$(grep -c "addEventListener" src/service-worker.ts || echo 0)
	ok "Service Worker custom presente (${SW_HANDLERS} handlers)"
fi

# ── 7. Avisar si el puerto 5173 ya está ocupado ───────────────────
step "Verificando puerto 5173"

if command -v ss >/dev/null 2>&1; then
	if ss -tln 2>/dev/null | grep -q ":5173 "; then
		warn "El puerto 5173 ya está en uso. Vite intentará usar el siguiente disponible."
	fi
elif command -v lsof >/dev/null 2>&1; then
	if lsof -i :5173 >/dev/null 2>&1; then
		warn "El puerto 5173 ya está en uso. Vite intentará usar el siguiente disponible."
	fi
elif command -v netstat >/dev/null 2>&1; then
	if netstat -tln 2>/dev/null | grep -q ":5173 "; then
		warn "El puerto 5173 ya está en uso. Vite intentará usar el siguiente disponible."
	fi
fi

# ── 8. Arrancar Vite con SW activado ──────────────────────────────
step "Arrancando Vite con Service Worker activado"
printf "${DIM}Ctrl+C para detener${RESET}\n\n"

# Trap para mensaje de despedida prolijo
cleanup() {
	printf "\n\n${CYAN}👋 ProdeAR dev detenido.${RESET}\n"
	exit 0
}
trap cleanup INT TERM

# Levantar Vite
VITE_PLUGIN_PWA_DEV=true npm run dev
