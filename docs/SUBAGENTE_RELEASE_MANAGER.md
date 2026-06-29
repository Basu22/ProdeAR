# 🤖 Subagente `@release-manager`

> **Propósito**: automatizar el flujo de releases de ProdeAR — validar CHANGELOG,
> bumpear versión SemVer, regenerar `public/version.json`, crear tag semántico,
> commit con Conventional Commits, y mantener `RELEASES.md` como índice navegable.
>
> **Creado**: 2026-06-29 (commit `568cdaa`)
> **Modo**: `subagent` (se invoca explícitamente, no es primary)
> **Modelo**: `qwen3.7-max` (razonamiento puro)
> **NO** hace push ni deploy: deja todo listo en local para que vos hagas `./deploy.sh` cuando quieras.

---

## 📋 TL;DR

```text
@release-manager prepará la release del sprint <nombre>
```

El subagente:
1. Valida el CHANGELOG (fusiona `[Unreleased]` duplicadas si las hay).
2. Detecta el rango de commits desde el último tag.
3. Sugiere el bump SemVer (MAJOR/MINOR/PATCH) según los tipos de commit.
4. Muestra el diff propuesto de los 4 archivos (`CHANGELOG.md`, `package.json`,
   `public/version.json`, `RELEASES.md`).
5. Pide OK explícito.
6. Aplica los cambios.
7. Crea commit `chore(release): vX.Y.Z — <sprint>` + tag `vX.Y.Z-<sprint-kebab>`.
8. Devuelve el resumen final con el comando sugerido para pushear.

**El push lo hacés vos** con `git push origin main && git push origin <tag>` o `./deploy.sh`.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  scripts/lib/parse-changelog.mjs  (funciones PURAS)             │
│  ├── extractLatestEntry(text) → { tag, title, body } | null    │
│  ├── summarizeChangelog(body) → string                         │
│  └── cleanTitle(rawTitle) → string                             │
│       ▲                                                         │
│       │ usa                                                     │
│       │                                                         │
│  scripts/sync-version.mjs  ─────┐                               │
│  └── corre CLI:                 │                               │
│      $ npm run version:sync     │                               │
│                                 ▼                               │
│  vite.config.ts  ──►  versionJsonPlugin (build-time)            │
│                                 │                               │
│                                 ▼                               │
│  public/version.json  ──►  src/hooks/useAppVersion.ts           │
│  (cacheado en /public del build)     (polling cada 5 min)       │
│                                          │                      │
│                                          ▼                      │
│                              src/components/update/             │
│                                ├── UpdateBanner.tsx             │
│                                ├── UpdateBlockingModal.tsx      │
│                                └── UpdateProgressBar.tsx        │
│                                                                  │
│  CHANGELOG.md  ◄────  @release-manager  ────►  RELEASES.md      │
│  (single source of truth para el changelog)    (índice)         │
└─────────────────────────────────────────────────────────────────┘
```

**Single source of truth**: el `changelog` del `version.json` se lee SIEMPRE
de la entrada `[Released]` (o `[Unreleased]` fallback) más reciente de
`CHANGELOG.md`. Nunca está hardcodeado.

---

## 🔄 Flujo de trabajo (10 pasos)

### Paso 0 — Pre-checks
- `git status` debe estar limpio. **Si hay cambios sin commitear → BLOQUEA**.
- Branch debe ser `main`. **Si está en otra → BLOQUEA**.

### Paso 1 — Validar CHANGELOG
- Detecta si hay **más de una** entrada `[Unreleased]` y las **fusiona
  automáticamente** (sin pedir OK: es housekeeping mecánico de formato).
- Verifica que la entrada `[Unreleased]` tenga al menos 1 bullet en
  `### Added/Changed/Fixed/Internal`. **Si está vacía → BLOQUEA**.
- Si hay commits con `BREAKING CHANGE:` pero no hay subsección
  `### Breaking changes` en el CHANGELOG → **BLOQUEA** (te pide documentarlo).

### Paso 2 — Detectar rango de commits
- `git log --oneline <último-tag>..HEAD`
- Clasifica por tipo (`feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `chore`).
- Excluye commits `Full Deploy: <fecha>` (son automáticos del `deploy.sh`).

### Paso 3 — Decidir bump SemVer
- `BREAKING CHANGE:` → **MAJOR** (X.0.0)
- `feat:` → **MINOR** (0.X.0)
- Solo `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:` → **PATCH** (0.0.X)
- Si no hay commits nuevos → **BLOQUEA**

### Paso 4 — Inferir sprint name (kebab-case)
- Lee el título de la entrada `[Unreleased]`.
- Convierte a kebab-case: `"Sprint Penales 2026: UX/UI Polish"` →
  `sprint-penales-2026`.
- Tag final: `vX.Y.Z-<sprint-kebab>` (ej: `v0.2.0-sprint-penales-2026`).

### Paso 5 — Generar diffs propuestos (en memoria)
Muestra 4 archivos con su contenido nuevo:
- `CHANGELOG.md`: rename `[Unreleased] → [Released]` + insert nueva `[Unreleased]` vacía con template.
- `package.json`: bump `"version": "<actual>" → "<nueva>"`.
- `public/version.json`: regenerado vía `node scripts/sync-version.mjs`.
- `RELEASES.md`: nueva fila en la tabla con `(#, versión, fecha, sprint, commits, tag, SHA)`.

### Paso 6 — OK explícito
Muestra todo al usuario y **espera OK antes de escribir nada**.

### Paso 7 — Aplicar cambios
- Edita los 4 archivos.
- Corre `node scripts/sync-version.mjs` para regenerar `public/version.json`.
- Valida con `git status` y `git diff --stat`.

### Paso 8 — Commit + tag
```bash
git add CHANGELOG.md package.json public/version.json RELEASES.md
git commit -m "chore(release): v<nueva> — <sprint name>" \
  -m "Release <nueva> del sprint '<sprint name>'.

Commits incluidos (<#count>):
$(git log --oneline <último-tag>..HEAD | sed 's/^/  - /')"
git tag -a v<nueva>-<sprint-kebab> -m "Release v<nueva> — <sprint name>"
```

### Paso 9 — Resumen final
Devuelve:
- Versión nueva + bump type
- Tag
- # de commits
- SHA
- Archivos modificados con stat
- Comando sugerido: `git push origin main && git push origin <tag>` o `./deploy.sh`
- Recordatorio: **NO** se pusheó automáticamente.

---

## 🧪 Casos borde

| Caso | Comportamiento |
|---|---|
| **No hay tags previos** | Toma el primer commit del repo. Nombre: `v<nueva>-initial`. |
| **Usuario insiste en PATCH cuando hay `feat:`** | Lo respeta pero advierte con warning. |
| **`BREAKING CHANGE:` sin documentar en CHANGELOG** | **BLOQUEA** hasta que se documente. |
| **Commits `Full Deploy: <fecha>`** | Excluidos del conteo y del body del commit de release. |
| **2+ entradas `[Unreleased]`** | Fusión automática, sin pedir OK. |
| **Working tree sucio** | **BLOQUEA** hasta que se commitee o stashee. |
| **Revertir release** | Nuevo commit `chore(release): revert vX.Y.Z` + bump PATCH. NO se borra tag. |

---

## 🛠️ Comandos relacionados

```bash
# Regenerar version.json manualmente (sin hacer release)
npm run version:sync
# o
node scripts/sync-version.mjs

# Verificar el contenido del changelog que se va a publicar
node -e "import('./scripts/lib/parse-changelog.mjs').then(m => { const fs = require('fs'); const text = fs.readFileSync('CHANGELOG.md', 'utf-8'); const entry = m.extractLatestEntry(text); console.log('Entry:', entry); console.log('Summary:', m.summarizeChangelog(entry?.body || '')); })"
```

---

## 🚀 Ejemplo de invocación

```text
@release-manager prepará la release del sprint penales-2026
```

**Output esperado** (resumido):
```
🔍 Pre-checks: OK (main limpia, 3 commits ahead de v0.1.0-sprint-penales-2026)
🧹 CHANGELOG: 1 entrada [Unreleased] encontrada, body completo.
📦 Bump sugerido: 0.1.0 → 0.2.0 (MINOR, 1 feat + 1 test + 1 docs)
🏷️  Tag propuesto: v0.2.0-sprint-penales-2026

Diff propuesto:
  CHANGELOG.md:         rename [Unreleased] → [Released] (commit 568cdaa, 2026-06-29)
                        + nueva entrada [Unreleased] vacía con template
  package.json:         "version": "0.1.0" → "0.2.0"
  public/version.json:  regenerado (changelog: "Highlight del selector de penales...")
  RELEASES.md:          + fila #1

¿Procedo? (OK / ajustar)
```

---

## 🔗 Integración con otros subagentes

- **@dev**: NO invocado desde acá.
- **@documentacion**: NO reemplaza su cierre de tareas. El `@release-manager`
  solo se invoca cuando vos pedís explícitamente "prepará la release de X".
- **@planner**: NO necesario para releases rutinarias.

---

## 📚 Archivos creados / modificados por este subagente

| Archivo | Tipo | Propósito |
|---|---|---|
| `.opencode/agents/release-manager.md` | nuevo | El prompt del subagente |
| `scripts/lib/parse-changelog.mjs` | nuevo | Funciones puras de parsing |
| `scripts/lib/parse-changelog.d.mts` | nuevo | Tipos companion para TS |
| `scripts/sync-version.mjs` | nuevo | Script CLI |
| `RELEASES.md` | nuevo | Índice de releases |
| `vite.config.ts` | modificado | `versionJsonPlugin` lee CHANGELOG real |
| `tsconfig.node.json` | modificado | Include del `.d.mts` |
| `package.json` | modificado | Script `version:sync` |
| `public/version.json` | regenerado | Changelog real (no más hardcodeado) |
| `docs/SUBAGENTE_RELEASE_MANAGER.md` | nuevo | Este doc |

---

## 📌 Pendientes para futuras iteraciones

1. **Tests unitarios** para `parse-changelog.mjs` (casos: 1 [Released] + 1 [Unreleased],
   2 [Unreleased], 0 entradas, body con bullets, body sin bullets, body vacío).
2. **Migrar `deploy.sh`** para que use un mensaje de commit con Conventional Commits
   (ej: `chore(deploy): vX.Y.Z`) en vez del genérico `Full Deploy: <fecha>`.
3. **Resolver los 4 errores TS pre-existentes** del sprint Bracket V2
   (no son scope de este subagente).
4. **Limpiar el `dev.md`** con los `frontend-react` y `ts-expert` allowlist
   (quedó unstaged en el commit `568cdaa`).
