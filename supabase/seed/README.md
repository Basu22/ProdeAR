# Seed de metadata de fase eliminatoria — Mundial 2026

## Propósito

Popular `stadium` y `kickOff` de los **32 partidos eliminatorios** (R32 + R16 + QF + SF + F + 3RD) **antes** de que API-Football los publique.

## 📊 Qué hace

Crea 32 partidos placeholder con:

| Ronda | Stage name | Multiplier | Bracket | # Partidos | Fechas |
|-------|-----------|------------|---------|-----------|--------|
| R32 | `Round of 32` | 2 | `R32-1` a `R32-16` | 16 | 28 jun - 3 jul |
| R16 | `Round of 16` | 3 | `R16-1` a `R16-8` | 8 | 4-7 jul |
| QF | `Quarter-finals` | 4 | `QF-1` a `QF-4` | 4 | 9-11 jul |
| SF | `Semi-finals` | 5 | `SF-1` a `SF-2` | 2 | 14-15 jul |
| 3RD | `Third Place Match` | 4 | `3RD-1` | 1 | 18 jul |
| F | `Final` | 6 | `F-1` | 1 | 19 jul |

**Total: 32 partidos, 5 fechas distintas**

Los `home_team` y `away_team` quedan como placeholders (`TBD-1A`, `TBD-2B`, etc.). API-Football los actualizará automáticamente con los cruces reales post-fase de grupos.

## 📋 Requisitos

- Acceso a Supabase Console (https://app.supabase.com)
- Permisos de admin
- Migración `0006_bracket_stages.sql` aplicada

## 🚀 Paso a paso

### 1. Backup

```sql
CREATE TABLE matches_backup_knockout_seed_2026_06_25 AS
SELECT * FROM matches
WHERE bracket_position IN (
  'R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8',
  'R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
  'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
  'QF-1','QF-2','QF-3','QF-4',
  'SF-1','SF-2',
  '3RD-1','F-1'
);
```

### 2. Revisar el script

Abrir `supabase/seed/seed_knockout_metadata.sql` y verificar:

1. **Fechas**: ¿Coinciden con tu zona horaria? (están en UTC-5)
2. **Estadios**: ¿Son los correctos según FIFA?
3. **api_match_id**: ¿Empiezan con `1000` para evitar colisiones?

### 3. Ejecutar

**Opción A — Supabase Console**:
1. SQL Editor → New query
2. Pegar el contenido del archivo
3. Click "Run"

**Opción B — CLI**:
```bash
supabase db execute --file supabase/seed/seed_knockout_metadata.sql
```

### 4. Verificar las 4 validaciones

El script ejecuta 4 validaciones que deben pasar:
- **V1**: 32 matches eliminatorios insertados
- **V2**: `stage_multiplier` correcto por ronda (R32=2, R16=3, QF=4, SF=5, F=6, 3RD=4)
- **V3**: Todos tienen `stadium` y `kick_off`
- **V4**: Fechas dentro de los rangos oficiales FIFA

### 5. Verificar en la app

1. Activar feature flag: `localStorage.setItem("prodear:flag:BRACKET_V2", "true")`
2. Ir a `/ligas` → tab LLAVES
3. Navegar por todas las rondas (16vos, 8vos, 4tos, semis, final, 3er puesto)
4. **Deberías ver stadium y fecha** en cada card

## 🔄 Cuando API-Football publique los cruces reales

La Edge Function `poll-scores` ejecuta upsert por `api_match_id`. Cuando publique:

- `home_team`/`away_team` se actualizan con equipos reales
- `stadium`/`kick_off` se mantienen (los del seed)
- Si FIFA cambia el estadio/horario, se actualizan también

**No hay conflicto** gracias al `ON CONFLICT (api_match_id) DO UPDATE`.

## ⚠️ Rollback

```sql
-- Eliminar TODOS los partidos eliminatorios placeholder
DELETE FROM matches
WHERE bracket_position IN (
  'R32-1','R32-2','R32-3','R32-4','R32-5','R32-6','R32-7','R32-8',
  'R32-9','R32-10','R32-11','R32-12','R32-13','R32-14','R32-15','R32-16',
  'R16-1','R16-2','R16-3','R16-4','R16-5','R16-6','R16-7','R16-8',
  'QF-1','QF-2','QF-3','QF-4',
  'SF-1','SF-2',
  '3RD-1','F-1'
)
AND home_team LIKE 'TBD-%';
```

## 📝 Personalización

### Cambiar timezone

```sql
-- UTC-5 (Eastern Time / NYC) — DEFAULT
'2026-06-28 12:00:00-05'

-- UTC-3 (Argentina)
'2026-06-28 14:00:00-03'

-- UTC (Universal)
'2026-06-28 17:00:00+00'
```

### Cambiar api_match_id base

```sql
-- Cambiar 1000XXXX a otro rango
(1, 9000073, ...)  -- para evitar colisión con API-Football real
```

### Asignar estadios por región

El script actual asigna estadios por ronda:
- **R32 (28 jun - 3 jul)**: 16 estadios diferentes (uno por partido)
- **R16 (4-7 jul)**: 8 estadios principales (2 por día)
- **QF (10-11 jul)**: 4 estadios top (NRG, AT&T, Mercedes, SoFi)
- **SF (14-15 jul)**: AT&T + Mercedes
- **3RD (18 jul)**: Hard Rock
- **F (19 jul)**: MetLife Stadium (confirmado por FIFA)

Si querés cambiar la distribución, modificá el campo `stadium` en cada INSERT.

## 🐛 Troubleshooting

**V1 falla (no encuentra 32 matches)**:
- Verificar que la migración 0006 esté aplicada
- Verificar que la tabla `matches` tenga la columna `bracket_position`

**V2 falla (stage_multiplier incorrecto)**:
- Verificar que la tabla `matches` tenga la columna `stage_multiplier`

**V3 falla (stadium o kick_off null)**:
- Revisar el script — puede haber un INSERT sin esos campos

**V4 falla (kick_off fuera de rango)**:
- Verificar las fechas manualmente contra FIFA.com

**Conflict con API-Football**:
- Si API-Football ya publicó los R32 con `api_match_id` distintos a `1000XXX`, los placeholders no se actualizarán
- Solución: ajustar el rango de `api_match_id` en el seed, o eliminar placeholders antes de que API-Football publique

## 📚 Referencias

- **FIFA Match Schedule**: https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/26/scores-fixtures
- **Wikipedia 2026 FIFA World Cup**: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup
- **API-Football docs**: https://www.api-football.com/documentation
