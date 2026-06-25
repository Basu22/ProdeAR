# Scripts de ProdeAR

## `sync-prod-to-dev.sh`

Sincroniza la DB de **producción** (`cdwefeqlxktliumtaqdc`) a la DB de **desarrollo** (`ijscgcpdfwlkgucjrmna`) para poder probar sobre datos productivos reales.

### Setup (una vez)

1. Copiar el template de credenciales:
   ```bash
   cp scripts/.env.staging.example scripts/.env.staging
   ```
2. Editar `scripts/.env.staging` con los passwords reales de las DBs (los sacás del Dashboard de Supabase de cada proyecto, en Settings > Database).
3. Verificar que `SUPABASE_ACCESS_TOKEN` esté configurado (puede ser el mismo de `.env.local`).
4. **NO commitear** `scripts/.env.staging` (ya está en `.gitignore`).

### Uso

```bash
# Dry-run (audita y muestra plan, NO toca nada)
./scripts/sync-prod-to-dev.sh

# Ejecutar el sync real (pide confirmación)
./scripts/sync-prod-to-dev.sh --execute

# Ejecutar sin prompts (para CI)
./scripts/sync-prod-to-dev.sh --execute --yes

# Solo auditoría pre/post
./scripts/sync-prod-to-dev.sh --only-audit

# O vía npm:
npm run sync:db:dry
npm run sync:db
npm run sync:db:audit
```

### Lo que preserva de DEV

Para no perder tu trabajo de desarrollo, el script **preserva**:
- Tu usuario de `auth.users` y `public.users`
- Tus `push_subscriptions`
- Los `team_aliases` de DEV que no están en prod (merge)
- Las funciones custom `process_match_results` y `check_and_trigger_poll_scores`

### Lo que se copia de PROD

- `competitions`, `users`, `tournaments`, `tournament_members`, `matches`, `predictions`

### Lo que se descarta

- `chat_messages` y `notification_log` de prod (vacía en DEV, no se pierde nada)

### Lo que NO se toca

- `league_coverage`, `match_broadcasters`, `league_standings` (vacías en ambas)
- Estructura de tablas, triggers, RLS policies (se mantienen como están)

### Guardrails

El script **falla y aborta** si:
- `DEV_PROJECT_REF == PROD_PROJECT_REF`
- No se puede conectar a alguna de las dos DBs

### Logs

Los logs se guardan en `scripts/logs/sync-YYYYMMDD-HHMMSS.log`.

### Requisitos

- bash 4+
- `curl`
- `python3` (para procesar JSON)
- `jq` (para parsear respuestas)
- Acceso a internet a `api.supabase.com`

### Después del sync

Recordá que tu frontend local sigue apuntando a DEV (`ijscgcpdfwlkgucjrmna`), así que un `npm run dev` va a usar los datos recién sincronizados. No necesitás cambiar nada.
