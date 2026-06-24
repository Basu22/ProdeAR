# Changelog

Todos los cambios visibles al usuario y cambios internos relevantes de ProdeAR.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Sprint 5: Refinamientos mobile-first

### Added (visible al usuario)
- 🆕 **Selector de competiciones escalable**: nuevo formato (trigger + panel desplegable) que reemplaza los chips horizontales. Soporta 20+ ligas sin scroll horizontal. Persistencia en `?comp=` y localStorage intactas. Mobile-first con panel tipo listbox.
- 🆕 **Filtro de amistosos**: las competiciones tipo "friendly"/amistoso y las que no tienen formato definido ya no aparecen en el selector. Solo ligas reales (Mundial, LPF, Premier, La Liga, etc.).
- 🆕 **Pills separadas en `/ligas`**: la página ahora tiene 3 pills (GRUPOS | LIGA 3ROS (X/12) | LLAVES (X/16)) en lugar de un scroll vertical gigante. Mismo patrón que el tab POSICIONES del Mundial.
- 🆕 **Navegación con flechas en el bracket**: en lugar de scrollear entre las 5 rondas, ahora hay flechas circulares (◀ →) que cambian la ronda activa. 16vos solo tiene flecha derecha, Final y 3RD solo tienen flecha izquierda. Botones ≥ 40×40px, color primary/disabled, `active:scale-[0.96]`.
- 🆕 **URL params para ronda del bracket**: la ronda activa se persiste en `?round=r32` (deep-linkable, back/forward del browser, refresh preserva la ronda).

### Changed (visible al usuario)
- 🔄 `CompetitionSelector` (chips) → `CompetitionSelector` (trigger + panel). Mantiene `?comp=` y localStorage, pero la UI cambia.
- 🔄 `Ligas.tsx` ahora muestra 1 vista a la vez (pills) en lugar de 3 vistas apiladas.
- 🔄 `BracketTree` ahora soporta vista de 1 ronda por vez con navegador (cuando `?round=` está presente). Sin URL param, mantiene el comportamiento de 5 rondas apiladas (backward compat).

### Internal (no visible al usuario)
- 🔧 Nueva migración DB: `competitions.is_friendly boolean DEFAULT false` (migration 0007).
- 🔧 Backfill SQL: amistosos existentes (por nombre o `format IS NULL`) marcados con `is_friendly = true`.
- 🔧 `getCompetitions()` en `tournamentsApi` ahora mapea `is_friendly` y `format` desde la DB (fix del QA GAP CRÍTICO #1).
- 🔧 `useCompetitions` filtra en 3 pasos: `is_friendly !== true`, `format != null`, `active === true`.
- 🔧 Nuevo módulo `src/lib/bracketNavigation.ts` con funciones puras (`getRoundNavigatorState`, `getProgressPills`, `getRoundLabel`, `getRoundShortLabel`).
- 🔧 Nuevo componente `src/components/tournament/RoundNavigator.tsx` (flechas circulares 40×40px, header variant).
- 🔧 `BracketTree` usa `useSearchParams` para leer `?round=`. Si está presente, renderiza 1 sola ronda + navegador; si no, renderiza las 5 rondas apiladas (backward compat).
- 🔧 Nuevo tipo `LigasSubTab = "grupos" | "mejores3ros" | "llaves"` en `Ligas.tsx` con `useState` y branching del render.
- 🔧 `WorldCupBestThirdsSection` y `WorldCupKnockoutSection` se renderizan dentro de branches según la pill activa.

### Breaking changes
- ⚠️ El formato visual de `CompetitionSelector` cambió. Si tenías tests E2E que dependían de los chips, hay que actualizarlos.
- ⚠️ `BracketTree` ahora requiere `MemoryRouter` (de `react-router-dom`) cuando se usa en tests porque `useSearchParams` necesita un Router context.
- ⚠️ `PositionsView` ahora requiere `MemoryRouter` por la misma razón.

### Migration notes
- **DB**: ejecutar `supabase/migrations/0007_competitions_is_friendly.sql` en el panel SQL de Supabase antes del deploy del frontend.
- **Tests**: si tenías tests E2E que apuntaban a los chips de `CompetitionSelector`, actualizarlos al nuevo trigger + panel.
- **Backfill**: la migración 0007 marca automáticamente las competiciones con nombre "amistoso"/"friendly" o sin `format` como `is_friendly = true`. Verificar con `SELECT id, name, is_friendly FROM competitions WHERE is_friendly = true;`

---

## [Released] — Sprint 4: POSICIONES (commit `96736f9`, 2026-06-15)

### Added
- 🆕 Tab "POSICIONES" en el Mundial con 3 sub-pills (GRUPOS | LIGA 3ROS | LLAVES).
- 🆕 Liga de terceros visible en `/ligas` con cutoff en top 8.
- 🆕 Llaves eliminatorias completas (5 rondas + 3er puesto).
- 🆕 Server-side canonicalization de equipos (3 columnas nuevas + tabla `team_aliases`).

### Internal
- 🔧 Migration 0006: `matches.bracket_position` + seed de `stage_multiplier` (R32=2, R16=3, QF=4, SF=5, F=6, 3RD=5).
- 🔧 `isKnockoutMatch` ahora detecta "third place" y "tercer".
- 🔧 Feature flag `VITE_ENABLE_FULL_BRACKET` para rollback seguro del bracket completo.

---

## [Released] — Sprint 1+2+3: Lógica + componentes base (commit `96736f9`, 2026-06-15)

### Sprint 3 — Componentes visuales
- 🆕 `BracketMatchCard` con 3 variantes (compact/default/hero) + 5 estados (TBD/resolved/live/finished/penales).
- 🆕 `BracketRound` con header + multiplier + counter + grid responsive.
- 🆕 `BracketTree` con 5 rondas + SVG conectores verticales + ChampionBanner.
- 🆕 `WorldCupBestThirdsSection` y `WorldCupKnockoutSection` para `/ligas`.
- 🆕 QA fixes: `focus-visible`, `React.memo` con comparador shallow, `useId()` para SVG, `variantForRound` por `meta.abbr`.

### Sprint 1+2 — Lógica pura
- 🆕 `roundNames.ts`: normaliza `stageName` → `R32|R16|QF|SF|F|3RD`.
- 🆕 `bracketTypes.ts`: `FullBracket`, `KnockoutRound`, `ExtendedBracketSlot/Match`.
- 🆕 `bracketEngine.ts`: 8 funciones puras (`resolveRoundOf16`, `resolveQuarterFinals`, `resolveSemiFinals`, `resolveFinal`, `resolveThirdPlace`, `getWinnerOfBracketMatch`, `propagateBracketWinners`, `getFullBracket`).

---

## [Released] — FIX-1: columna ESTADO redundante (commit `2c7c8b3`, 2026-06-22)

### Changed
- 🔄 `BestThirdsTable`: removida columna "ESTADO" (badge "Clasifica" / "Fuera") y leyenda al pie. El clasificado/eliminado se comunica exclusivamente por:
  1. Color verde (hover) en filas 1-8
  2. Color rojo (hover) en filas 9-12
  3. Opacidad reducida (opacity-60) en filas eliminadas
  4. Línea roja de corte (border-b-2 border-b-error) en la fila 8

### Internal
- 🔧 Tests actualizados: 3 obsoletos removidos, 2 anti-regresión agregados, 1 reescrito con asserts visuales.

---

## Resumen de tests por sprint

| Sprint | Tests añadidos | Total acumulado |
|---|---|---|
| Sprint 1+2 | 21 | 499 |
| Sprint 3 | 12 | 511 |
| Sprint 4 | 1 fix + 0 nuevos | 511 |
| FIX-1 | -1 +1 (rewrite) | 511 |
| Sprint 5A | 13 | 524 |
| Sprint 5B | 0 (wiring) | 524 |
| Sprint 5C | 10 nuevos + tests actualizados | 534 |
| **Final** | | **528 passing** |

(Nota: el conteo exacto varía porque algunos tests se modificaron en lugar de agregarse.)

---

## Cómo contribuir

1. Cada cambio visible al usuario debe estar en `### Added`, `### Changed`, o `### Fixed`.
2. Cambios internos (refactors, optimizaciones) van en `### Internal`.
3. Breaking changes van en `### Breaking changes` con instrucciones de migration.
4. Commits siguen [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
