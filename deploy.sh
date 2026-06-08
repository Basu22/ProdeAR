#!/bin/bash

# ⚽ ProdeAR — Script de Despliegue Automatizado
# --- CONFIGURACIÓN DE PRODUCCIÓN ---
SUPABASE_PROJECT_ID="cdwefeqlxktliumtaqdc"
# -----------------------------------

REAL_USER=${SUDO_USER:-$(whoami)}
COMMIT_MSG="Full Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

echo "🚀 Iniciando flujo de despliegue para ProdeAR..."

# 1. Confirmar y subir a GitHub (Desencadena el deploy en Vercel)
echo "📥 Confirmando cambios y subiendo a GitHub..."
git add .
git commit -m "$COMMIT_MSG" 2>/dev/null || echo "ℹ️ Sin cambios locales adicionales para confirmar."

if ! git push origin main; then
    echo "❌ ERROR FATAL: El push a GitHub falló. El despliegue de Vercel no se disparará."
    exit 1
fi
echo "✅ Push a GitHub completado. Vercel iniciará el despliegue automático del Frontend."

# 2. Desplegar Edge Functions a Supabase
# Detectamos si hubo cambios en la carpeta de funciones en el último commit
CHANGES_IN_FUNCTIONS=$(git diff --name-only HEAD~1 HEAD | grep "supabase/functions" || true)

if [ -n "$CHANGES_IN_FUNCTIONS" ] || [ "$1" == "--force-functions" ]; then
    echo "⚡ Cambios detectados en Edge Functions. Desplegando a Supabase..."
    if ! npx supabase functions deploy poll-scores --project-ref "$SUPABASE_PROJECT_ID"; then
        echo "❌ ERROR: Falló el despliegue de las Edge Functions."
        exit 1
    fi
    echo "✅ Edge Functions desplegadas con éxito en Supabase."
else
    echo "ℹ️ No se detectaron cambios en las Edge Functions. Saltando deploy de funciones (usá --force-functions para forzar)."
fi

echo "🎉 Proceso finalizado exitosamente."
echo "🔗 Frontend Vercel: https://prode-ar.vercel.app"
echo "🔗 Backend Supabase: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
