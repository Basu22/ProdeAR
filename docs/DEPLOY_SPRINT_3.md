# 🚀 Deploy Guide — Sprint 3: Grupos en Vivo del Mundial

> **Propósito**: checklist paso a paso para hacer el deploy de la feature "POSICIONES" (Grupos en vivo + Mejores 3ros + Bracket 16vos) durante la madrugada.
>
> - **Feature**: POSICIONES tab con 3 sub-pills (GRUPOS, LIGA 3ROS, 16VOS)
> - **Sprint**: 3 (Fases 1+2+3)
> - **Commits ahead**: 4 commits locales sin pushear (verificar con `git log --oneline -5`)
> - **Última revisión**: Junio 2026

---

## 📋 Índice

1. [Pre-deploy checklist (verificación manual)](#1-pre-deploy-checklist)
2. [¿Qué se deploya?](#2-qué-se-deploya)
3. [Pasos de deploy](#3-pasos-de-deploy)
4. [Post-deploy validation (smoke test)](#4-post-deploy-validation)
5. [Rollback plan](#5-rollback-plan)
6. [Known issues / FAQ](#6-known-issues--faq)
7. [Changelog del documento](#7-changelog-del-documento)

---

## 1. Pre-deploy checklist

### 1.1 Verificar estado del repo local

```bash
cd /home/flink/Documentos/ProdeAR
git status
```

**Esperado**:
- Working tree limpio (sin cambios sin commitear)
- 2 archivos `untracked` en `.opencode/agents/` (config local de opencode, **NO se commitea**)

```bash
git log --oneline -5
```

**Esperado** (4 commits ahead de `origin/main`):
```
c226f11 test: add component tests for POSICIONES feature (68 tests)
2acee61 refactor: remove dead matchesApi methods and artificial setTimeout
bf9837a feat: Sprint 1+2+3 - Match Bottom Sheet, Player Photos, API-Football Optimization
d5556b7 docs: add Sprint 1+2+3 documentation (Bottom Sheet, Player Photos, API Optimization)
```

### 1.2 Verificar tests + TypeScript

```bash
npx tsc --noEmit
npm test
```

**Esperado**:
- TypeScript: 0 errores
- Tests: **344/344 pasando** en 21 archivos (incluyendo 68 component tests nuevos)

### 1.3 ⚠️ APLICAR DB migration (CRÍTICO — sin esto el deploy falla)

**Esta migration es REQUERIDA** y debe correrse en el SQL Editor de Supabase **ANTES** del push. Sin ella, la feature POSICIONES no funcionará (los partidos no tendrán `group_letter` populado, las tablas saldrán vacías).

**Archivo**: `supabase/migrations/0003_sprint3_posiciones_groups.sql` (~250 líneas)

**Cómo correrlo**:

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → SQL Editor
2. Abrir el archivo `supabase/migrations/0003_sprint3_posiciones_groups.sql` y copiar todo su contenido
3. Pegar en el SQL Editor y correr (Run)

**Lo que hace la migration** (es idempotente — se puede re-correr):

| # | Acción | Resultado |
|---|---|---|
| 1 | `ALTER TABLE matches ADD COLUMN...` | 3 columnas nuevas: `group_letter`, `home_team_canonical`, `away_team_canonical` |
| 2 | `CREATE TABLE team_aliases` | Nueva tabla lookup con 120+ filas |
| 3 | `INSERT INTO team_aliases...` | Popula aliases de los 48 equipos del Mundial 2026 (con variantes EN/ES/diacríticos) |
| 4 | `UPDATE matches SET...` (backfill) | Popula las columnas nuevas para partidos ya existentes |
| 5 | `NOTIFY pgrst, 'reload schema'` | Refresca el cache de PostgREST (CRÍTICO sin esto las queries no ven las columnas) |

**Tiempo estimado**: 30-60 segundos (incluye el INSERT de ~120 aliases).

### 1.4 Verificar DB migration aplicada

Después de correr la migration, ejecutar las queries de verificación:

```sql
-- 1. Verificar que las columnas existen
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matches'
  AND column_name IN ('group_letter', 'home_team_canonical', 'away_team_canonical')
ORDER BY column_name;

-- Esperado: 3 filas (group_letter, home_team_canonical, away_team_canonical)

-- 2. Verificar que team_aliases está populada
SELECT COUNT(*) AS total_aliases,
       COUNT(DISTINCT group_letter) AS grupos_cubiertos
FROM team_aliases;

-- Esperado: 92 aliases (48 equipos × ~2 aliases promedio), 12 grupos cubiertos

-- 3. Verificar que no hay matches sin group_letter
SELECT COUNT(*) AS unmapped
FROM matches
WHERE stage_name ILIKE '%group%'
  AND group_letter IS NULL;

-- Esperado: 0
```

**Si `unmapped > 0`** después del backfill: ver §6.6.2 (Known issues — alias faltante).

### 1.4 Verificar Supabase env vars

```bash
# En Supabase Dashboard → Edge Functions → poll-scores → Secrets
# Verificar que existan:
#   - API_FOOTBALL_KEY (requerida)
#   - VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (opcional, para push)
```

**Esperado**: `API_FOOTBALL_KEY` configurada. Si no, el `poll-scores` falla al intentar fetchar y los grupos no se actualizan.

---

## 2. ¿Qué se deploya?

### 2.1 Frontend (Vercel auto-deploy)

| Feature | Archivos | Líneas |
|---|---|---|
| POSICIONES tab + sub-pills | `src/components/tournament/PositionsView.tsx` | 155 |
| 12 tablas de grupos en vivo | `src/components/tournament/GroupTable.tsx` | 185 |
| Liga de mejores terceros | `src/components/tournament/BestThirdsTable.tsx` | 231 |
| Bracket 16vos | `src/components/tournament/KnockoutBracket.tsx` | 227 |
| Badge "EN VIVO" pulsante | `src/components/tournament/LiveBadge.tsx` | 42 |
| Mini-scoreboard inline | `src/components/tournament/LiveMiniScoreboard.tsx` | 125 |
| Sub-pills reutilizables | `src/components/ui/PillTabs.tsx` | 118 |
| Keyframes CSS (live-pulse, rank-up/down) | `src/index.css` | +60 |
| **TOTAL** | 8 archivos | **~1140 líneas** |

### 2.2 Backend (Supabase Edge Function)

| Archivo | Cambio |
|---|---|
| `supabase/functions/poll-scores/index.ts` | +canonicalización server-side (`getGroupLetterFromStage`, `loadAliasesCache`, `resolveCanonicalName`) |
| **Líneas agregadas** | ~140 |
| **Comportamiento nuevo** | Cada partido upserted ahora tiene `group_letter`, `home_team_canonical`, `away_team_canonical` populados |

### 2.3 Base de datos (YA aplicada, verificar en §1.3)

| Tabla / Columna | Tipo | Nullable | Notas |
|---|---|---|---|
| `matches.group_letter` | `CHAR(1)` | YES | "A"-"L" para partidos de grupos |
| `matches.home_team_canonical` | `TEXT` | YES | "Corea del Sur" (en vez de "South Korea") |
| `matches.away_team_canonical` | `TEXT` | YES | Idem |
| `team_aliases` (nueva tabla) | — | — | ~120 filas con mapping EN/ES/diacríticos |

### 2.4 Documentación (no se deploya, va al repo)

- `docs/API_FOOTBALL_REFERENCE.md` (1,631 líneas, +350 vs versión anterior)
- `Arquitectura.md` §10 (Sprint 3 — API-Football Optimization, ya incluida en `bf9837a`)

### 2.5 Tests (no se deployan, validadores)

- **68 component tests** nuevos: PillTabs, GroupTable, BestThirdsTable, KnockoutBracket, PositionsView
- **65 lib tests** (worldCupGroups): helpers puros + `calculateBestThirds` + `resolveKnockoutMatchups`
- **13 hook tests** (useGroupStandings)
- **Total**: 344/344 pasando

---

## 3. Pasos de deploy

### 3.1 Verificación final (5 min)

```bash
# 1. Working tree limpio
git status  # debe mostrar solo .opencode/agents/ como untracked

# 2. Verificar 4 commits ahead
git log --oneline origin/main..HEAD
# Esperado: 4 commits (c226f11, 2acee61, bf9837a, d5556b7)

# 3. Última corrida de tests
npm test 2>&1 | tail -5
# Esperado: 344/344 passing
```

### 3.2 Push a GitHub (triggera Vercel auto-deploy)

```bash
git push origin main
```

**Esperado**:
- Los 4 commits se pushean
- Vercel detecta el push y empieza el deploy (tarda ~2-3 min)
- Verificar en https://vercel.com que el deploy pase a "Ready" (verde)

### 3.3 Deploy de Edge Function a Supabase

**Opción A: Auto-deploy via Supabase CLI** (recomendado)

```bash
# Si tenés Supabase CLI configurado
npx supabase functions deploy poll-scores --project-ref TU_PROJECT_REF
```

**Opción B: Auto-deploy via Dashboard** (alternativa)

1. Ir a https://supabase.com/dashboard/project/TU_PROJECT/functions
2. Click en `poll-scores`
3. Click "Deploy new version"
4. Confirmar

**Opción C: Edge Function se auto-deploya en cada cron** ⚠️ NO recomendado

La Edge Function NO se re-deploya automáticamente cuando cambian los archivos. Hay que hacerlo manual (Opción A o B). Si no se deploya, el código viejo sigue corriendo y la canonicalización no se aplica.

### 3.4 Verificación post-push (5 min)

```bash
# 1. Verificar que GitHub tiene los commits
git log --oneline -5  # debe mostrar los 4 commits locales + origin/main

# 2. Verificar que Vercel está deployando
# → https://vercel.com/dashboard → seleccionar proyecto → "Deployments"
# → debe haber un deploy en progreso o "Ready"
```

---

## 4. Post-deploy validation

### 4.1 Smoke test en producción (10 min)

Una vez que Vercel marque "Ready" y Supabase tenga la nueva poll-scores deployada:

**Test 1: Tab POSICIONES accesible**
- [ ] Ir a `https://prodear.app/torneo/[id-de-un-torneo-mundial]`
- [ ] Verificar que el tab "POSICIONES" aparece (entre RANKING y PRONÓSTICOS)
- [ ] Verificar que está highlighted como activo al hacer click

**Test 2: Sub-pill GRUPOS**
- [ ] El sub-pill "GRUPOS" debe estar activo por default
- [ ] Debe mostrar 12 tablas de grupos (A-L)
- [ ] Si hay partidos en vivo, debe mostrar badge rojo con número
- [ ] Los equipos con partido en vivo deben tener punto rojo pulsante

**Test 3: Sub-pill LIGA 3ROS**
- [ ] Click en "LIGA 3ROS"
- [ ] Debe mostrar tabla de 12 terceros
- [ ] Top 8 con badge "Clasifica" (verde)
- [ ] Bottom 4 con badge "Fuera" (rojo, opacidad reducida)
- [ ] Línea de corte visible entre fila 8 y 9

**Test 4: Sub-pill 16VOS**
- [ ] Click en "16VOS"
- [ ] Debe mostrar grid de 16 matches
- [ ] Si los grupos están en juego, algunos slots muestran "TBD" o "Por definir"
- [ ] Header muestra "X / 16 cruces definidos"

**Test 5: Live update** (crítico)
- [ ] Abrir el tab POSICIONES durante un partido en vivo del Mundial
- [ ] Esperar 15 segundos (polling interval)
- [ ] Verificar que la tabla se actualiza automáticamente cuando hay goles
- [ ] Verificar que las filas que cambian de posición se animan (verde al subir, rojo al bajar)

**Test 6: Edge Function logs**
- [ ] Ir a https://supabase.com/dashboard/project/TU_PROJECT/logs/edge-functions
- [ ] Filtrar por `poll-scores`
- [ ] Verificar que el cron corrió en los últimos 10 min
- [ ] Buscar logs con: `daily-remaining=` y `min-remaining=` (rate limit headers)
- [ ] **Si `min-remaining=0`**: throttling esperado, no es bug
- [ ] **Si hay errores 499**: rate limit exceeded, ver §6

**Test 7: DB consistency**
```sql
-- Verificar que los partidos en DB tienen group_letter populado
SELECT
  COUNT(*) AS total,
  COUNT(group_letter) AS with_group,
  COUNT(*) - COUNT(group_letter) AS missing
FROM matches
WHERE stage_name ILIKE '%group%'
  AND kick_off > NOW() - INTERVAL '7 days';
-- Esperado: missing = 0
```

**Test 8: Quota de API-Football**
- [ ] Ir a https://dashboard.api-football.com
- [ ] Verificar que `requests.current` está en valores normales (~5% del límite diario)
- [ ] **Si está cerca del 80%**: contactar al admin, evaluar upgrade de plan

### 4.2 Monitoring post-deploy (primeras 24h)

**Métricas a vigilar**:
- Vercel: errores 5xx en `/torneo/*` y `/dashboard`
- Supabase: errores en `poll-scores` (especialmente timeouts o 429)
- API-Football: cuota diaria (debe ser < 50% para estar tranquilos)

**Si algo falla**:
- Rollback del frontend (Vercel tiene rollback instantáneo, ver §5)
- Rollback de Edge Function (Supabase Dashboard → Functions → poll-scores → "Redeploy previous version")

---

## 5. Rollback plan

### 5.1 Rollback de Frontend (Vercel)

**Opción A: Instant rollback via Dashboard** (recomendado, < 1 min)

1. Ir a https://vercel.com/dashboard → seleccionar proyecto → Deployments
2. Buscar el deploy anterior al actual (debe tener el SHA `bf9837a` o anterior)
3. Click en los 3 puntos → "Promote to Production"
4. Confirmar

**Opción B: Revert via git** (tarda más, ~5 min para el redeploy)

```bash
# 1. Revertir los 4 commits
git revert --no-commit c226f11 2acee61 bf9837a d5556b7
# O un revert único si están contiguos:
git revert --no-commit HEAD~4..HEAD

# 2. Commit del revert
git commit -m "revert: rollback Sprint 3 (Grupos en Vivo + POSICIONES)"

# 3. Push (triggera Vercel redeploy)
git push origin main
```

### 5.2 Rollback de Edge Function (Supabase)

**Opción A: Redeploy versión anterior** (recomendado)

1. Ir a https://supabase.com/dashboard/project/TU_PROJECT/functions/poll-scores
2. Sección "Versions" o "History"
3. Seleccionar la versión anterior (antes del deploy de hoy)
4. Click "Restore" o "Redeploy"

**Opción B: Git revert + manual deploy**

```bash
# Asumiendo que hiciste git revert arriba
npx supabase functions deploy poll-scores --project-ref TU_PROJECT_REF
```

### 5.3 Rollback de DB (no necesario)

Las columnas `group_letter`, `home_team_canonical`, `away_team_canonical` son **NULLABLE**. Si rollbackeas el código que las usa, no pasa nada — los partidos nuevos simplemente tendrán esos campos en NULL.

La tabla `team_aliases` también puede quedar poblada sin problemas. No hay foreign keys que dependan de ella.

**No hay migración de rollback necesaria** para la DB.

### 5.4 Plan de rollback completo (si todo se rompe)

**Orden de rollback** (de más crítico a menos):
1. **Frontend** (Vercel instant) — afecta a usuarios en < 1 min
2. **Edge Function** (Supabase Dashboard) — afecta a datos en < 5 min
3. **DB** — no necesita rollback

**Tiempo total estimado**: 10-15 min para volver al estado pre-deploy.

---

## 6. Known issues / FAQ

### 6.1 "Mi tab POSICIONES no muestra grupos"

**Causa probable**: El torneo no es del Mundial 2026 (no tiene `competitionId` de los IDs hardcodeados `comp-1` o `1`).

**Solución**: Verificar que el torneo esté apuntando a la Copa del Mundo 2026. El tab POSICIONES solo aparece para Mundial.

### 6.2 "Los grupos muestran equipos sin nombres / genéricos"

**Causa probable**: `group_aliases` no cubre algún equipo. La tabla `team_aliases` no se populó con algún alias de la API-Football.

**Diagnóstico**:
```sql
-- Buscar matches que no matchearon con team_aliases
SELECT DISTINCT m.home_team, m.away_team
FROM matches m
WHERE m.stage_name ILIKE '%group%'
  AND m.group_letter IS NULL
  AND m.kick_off > NOW() - INTERVAL '7 days';
```

**Solución**: Agregar los aliases faltantes manualmente:
```sql
INSERT INTO team_aliases (canonical_name, alias, group_letter, flag_code)
VALUES
  ('Nombre Canónico', 'Nombre que devuelve la API', 'X', 'xx'),
  -- ...
ON CONFLICT (alias) DO NOTHING;

-- Refrescar cache
NOTIFY pgrst, 'reload schema';
```

### 6.3 "El badge 'EN VIVO' no aparece en partidos que están jugando"

**Causa probable**: El partido está en vivo pero el polling no se actualizó todavía (latencia de hasta 15s).

**Solución**: Esperar 15 segundos. El badge aparece en el siguiente poll.

### 6.4 "Error 499 de API-Football en logs de poll-scores"

**Causa**: Rate limit exceeded (típicamente en高峰期, varios partidos a la vez).

**Impacto**: Bajo. El código tiene backoff de 5 min en el cooldown de poll-scores.

**Solución**: Esperar 5 minutos para el próximo retry. Si persiste, evaluar upgrade de plan API-Football.

### 6.5 "Las animaciones de cambio de posición no se ven"

**Causa probable**: El usuario tiene `prefers-reduced-motion: reduce` activado en su OS, lo cual deshabilita las animaciones (es el comportamiento correcto para accesibilidad).

**Solución**: No es un bug. Si querés probar las animaciones, desactivá reduced motion en las DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: no-preference".

### 6.6 "Vercel deploy falla con 'Build failed'"

**Causa probable**: TypeScript error que no detectamos localmente.

**Solución**:
```bash
# Local
npx tsc --noEmit
npm run build
```

Si el build local pasa pero Vercel falla, es probable un problema de env vars. Verificar en Vercel:
- `Settings → Environment Variables`
- Asegurarse de que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas

### 6.7 "Después del deploy, los sub-pills de 'LIGA 3ROS' o '16VOS' aparecen deshabilitados"

**Causa probable**: Vercel está sirviendo una versión cacheada del bundle.

**Solución**:
1. Verificar que el commit `c226f11` (que tiene los tests) está en el branch deployado
2. Forzar redeploy en Vercel: Deployments → 3 puntos → "Redeploy"
3. Hard refresh en el browser (Cmd+Shift+R o Ctrl+Shift+F5)

---

## 7. Changelog del documento

| Fecha | Cambio |
|---|---|
| Junio 2026 | Creación inicial — Sprint 3 deploy guide (Grupos en Vivo + POSICIONES) |

---

## 📌 Recordatorio final

```bash
# Antes de push (5 min):
cd /home/flink/Documentos/ProdeAR
git status                                  # working tree limpio
git log --oneline origin/main..HEAD         # 4 commits ahead
npx tsc --noEmit                            # 0 errores
npm test 2>&1 | tail -3                     # 344/344 passing

# SQL crítica (en Supabase):
# SELECT COUNT(*) FROM matches WHERE stage_name ILIKE '%group%' AND group_letter IS NULL;
# → DEBE ser 0

# Push (lo hacés vos por la madrugada):
git push origin main
# → Triggera Vercel auto-deploy
# → Manual: Supabase Dashboard → Edge Functions → poll-scores → Deploy

# Post-deploy (10 min después del push):
# → Vercel: verificar "Ready"
# → Browser: smoke test de las 8 validaciones en §4.1
# → Supabase logs: rate limit headers presentes
```

**Si algo falla**: ver §5 (Rollback plan). El tiempo de rollback estimado es < 15 min.
