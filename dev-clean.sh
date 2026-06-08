#!/bin/bash

# ====================================================================
# ProdeAR — Script de Limpieza y Arranque del Servidor de Desarrollo
# ====================================================================
# Uso:
#   ./dev-clean.sh
# ====================================================================

echo "🧹 Deteniendo servidores de desarrollo anteriores..."
# Intentar matar cualquier proceso corriendo en el puerto 5173 (Vite)
PID=$(lsof -t -i:5173 2>/dev/null)
if [ ! -z "$PID" ]; then
  echo "📍 Puerto 5173 en uso por PID $PID. Liberando puerto..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "🚀 Iniciando servidor de desarrollo de Vite (Cargando .env.local)..."
echo "💡 Nota: La app autolimpiará cualquier residuo de mock del LocalStorage al cargar."
echo "--------------------------------------------------------"

# Correr el servidor de desarrollo
npm run dev
