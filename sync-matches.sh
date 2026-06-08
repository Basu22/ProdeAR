#!/bin/bash

# ====================================================================
# ProdeAR — Script de Sincronización Automática de Partidos
# ====================================================================
# Uso: 
#   ./sync-matches.sh [id_liga] [temporada]
# Ejemplos:
#   ./sync-matches.sh (corre Amistosos 2026 por defecto)
#   ./sync-matches.sh 1 2026 (corre Copa del Mundo 2026)
# ====================================================================

# 1. Leer variables de entorno desde .env.local
if [ -f .env.local ]; then
  # Cargar las variables ignorando comentarios y líneas vacías
  export $(grep -v '^#' .env.local | xargs)
else
  echo "❌ Error: Archivo .env.local no encontrado en el directorio raíz."
  exit 1
fi

# 2. Verificar que las variables necesarias existan
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidos en .env.local."
  exit 1
fi

# 3. Leer parámetros o asignar valores por defecto
LEAGUE=${1:-10}    # Liga 10 (Amistosos Internacionales) por defecto
SEASON=${2:-2026}  # Temporada 2026 por defecto

echo "🔄 Iniciando sincronización de partidos..."
echo "📍 Destino: $VITE_SUPABASE_URL/functions/v1/poll-scores"
echo "⚽ Liga ID: $LEAGUE"
echo "📅 Temporada: $SEASON"
echo "--------------------------------------------------------"

# 4. Ejecutar cURL de forma segura
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$VITE_SUPABASE_URL/functions/v1/poll-scores?league=$LEAGUE&season=$SEASON" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json")

# 5. Procesar respuesta y estados HTTP
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2)

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ Sincronización completada exitosamente (Status $HTTP_STATUS):"
  echo "$HTTP_BODY" | grep -o '"processedCount":[0-9]*,"upsertedCount":[0-9]*' || echo "$HTTP_BODY"
else
  echo "❌ Error en la sincronización (Status $HTTP_STATUS):"
  echo "$HTTP_BODY"
  exit 1
fi
