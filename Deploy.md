# Guía de Despliegue y Mantenimiento de Producción — ProdeAR

Este documento detalla el entorno de producción, la arquitectura serverless implementada para **ProdeAR** (React + Vite + Supabase), y la guía paso a paso para el mantenimiento de la aplicación.

---

## 1. Arquitectura de Producción

La infraestructura de producción está diseñada bajo un enfoque **100% Serverless** para garantizar gratuidad inicial, máxima disponibilidad (99.9%) y escalabilidad automática:

```
┌─────────────────────────────────┐
│       Frontend (Vercel)         │
│   (SPA estática en CDN global)  │
└────────────────┬────────────────┘
                 │ (Consultas HTTPS / WebSockets)
                 ▼
┌─────────────────────────────────┐
│       Backend (Supabase)        │
│  - PostgreSQL DB & Auth         │
│  - Realtime (WebSockets)        │
│  - Edge Functions (Deno)        │
└─────────────────────────────────┘
```

* **Frontend (Vercel):** Hospeda los archivos estáticos de la SPA (`prode-ar.vercel.app`). El despliegue es continuo desde la rama `main` de GitHub.
* **Backend & DB (Supabase):** Aloja la base de datos PostgreSQL de producción (`cdwefeqlxktliumtaqdc`), la autenticación (Google OAuth y Email) y el servicio de tiempo real.
* **Sincronizador (Edge Functions):** La función `poll-scores` se ejecuta en la nube de Supabase y actualiza los marcadores y rankings consultando a **API-Football**.

---

## 2. Despliegue Automatizado (`deploy.sh`)

Para subir cambios sin complicaciones, contás con el script de automatización `./deploy.sh` en la raíz del proyecto:

### ¿Qué hace el script?
1. **GitHub Push:** Confirma los cambios locales con un commit fechado y los sube a la rama `main` de GitHub. Esto dispara la compilación automática del Frontend en Vercel.
2. **Detección Inteligente de Cambios en Funciones:** Compara los cambios locales contra el último commit de Git. Si detecta cambios en la carpeta `supabase/functions/`, realiza el despliegue automático de las Edge Functions a Supabase usando tu Access Token de cuenta. De lo contrario, se salta este paso para ahorrar tiempo.

### Cómo ejecutarlo:
```bash
./deploy.sh
```
*Si deseás forzar el despliegue de las Edge Functions a pesar de no haber cambiado el código de las mismas, podés ejecutar: `./deploy.sh --force-functions`*

> [!NOTE]  
> Tu token de acceso de Supabase (`SUPABASE_ACCESS_TOKEN`) se lee automáticamente desde el archivo local `.env.local` (el cual está en el `.gitignore` y nunca se subirá a GitHub, garantizando la seguridad de tus credenciales).

---

## 3. Inicialización y Sincronización de Datos (Seeding)

Al crear una base de datos de producción nueva, los catálogos y partidos deben ser importados desde la API. Dado que la Edge Function de producción tiene deshabilitado el JWT, se puede realizar directo desde el navegador o mediante cURL:

1. **Inicializar Ligas (Seeding):**
   Crea la "Copa del Mundo 2026" y los "Amistosos Internacionales" en la tabla `competitions`:
   👉 `https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?seed=true`
2. **Importar Fixture de Amistosos Internacionales 2026 (Liga 10):**
   👉 `https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?league=10&season=2026`
3. **Importar Fixture de Copa del Mundo 2026 (Liga 1):**
   👉 `https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?league=1&season=2026`

---

## 4. Automatización de Partidos en Vivo (Cron Job)

La base de datos de producción actualiza sus marcadores en vivo de forma autónoma mediante la extensión `pg_cron` de PostgreSQL en Supabase, llamando a la función inteligente de comprobación cada 10 minutos para optimizar la cuota de la API:

```sql
-- Habilitar extensiones requeridas
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Programar sincronización periódica optimizada (Smart Sync)
select cron.schedule(
  'sincronizar-partidos-cron',
  '*/10 * * * *',
  $$
  select public.check_and_trigger_poll_scores();
  $$
);
```
*Nota: Para que el Cron Job funcione sin autenticación hardcodeada, la verificación JWT para la función `poll-scores` debe estar deshabilitada en la configuración de la Edge Function en el panel de Supabase (desplegada usando la opción `--no-verify-jwt`).*

---

## 5. Directiva de Consistencia DB vs. API (Mantenimiento)

Si en el desarrollo del proyecto se requiere agregar nuevas columnas o tablas que provengan de API-Football:

1. **Alteración de DB en Producción:** Creá el script SQL de migración y aplicalo en el **SQL Editor** de Supabase de producción *antes* de desplegar el código.
2. **Recarga de PostgREST:** Cada vez que alteres la estructura de tablas de Supabase, recordá ejecutar en el SQL Editor el comando de recarga de esquema de la API para que PostgREST y Deno lo detecten inmediatamente:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. **Caché del Frontend en Vercel:** Para evitar que los navegadores de los usuarios finales almacenen en caché el sitio de forma obsoleta, `vercel.json` tiene configurados encabezados de revalidación forzada (`Cache-Control: public, max-age=0, must-revalidate`) para `index.html` y el Service Worker. Esto asegura que todos los clientes reciban las actualizaciones al instante en su próxima visita.
