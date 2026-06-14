# 📚 API-Football v3 — Referencia para ProdeAR

> **Documento de referencia rápida de la API externa que consume ProdeAR.**
>
> - **Proveedor:** API-Sports (API-Football)
> - **Versión documentada:** 3.9.3
> - **Base URL:** `https://v3.football.api-sports.io`
> - **Docu oficial:** https://www.api-football.com/documentation-v3
> - **Dashboard:** https://dashboard.api-football.com
> - **Última revisión:** Junio 2026
>
> Este documento es un *resumen operativo* de la documentación oficial, ajustado al uso real que hace ProdeAR.

---

## 📑 Índice

1. [Información general](#1-información-general)
2. [Autenticación y reglas de request](#2-autenticación-y-reglas-de-request)
3. [Convención de respuesta (envelope)](#3-convención-de-respuesta-envelope)
4. [Códigos HTTP](#4-códigos-http)
5. [Rate limits y monitoreo](#5-rate-limits-y-monitoreo)
6. [Endpoint de status (free, no consume cuota)](#6-endpoint-de-status-free-no-consume-cuota)
7. [Changelog relevante (3.8.1 → 3.9.3)](#7-changelog-relevante-381--393)
8. [Endpoints por recurso](#8-endpoints-por-recurso)
   - 8.1 [Timezone](#81-timezone)
   - 8.2 [Countries](#82-countries)
   - 8.3 [Leagues](#83-leagues)
   - 8.4 [Teams](#84-teams)
   - 8.5 [Venues](#85-venues)
   - 8.6 [Standings](#86-standings)
   - 8.7 [Fixtures](#87-fixtures)
   - 8.8 [Injuries](#88-injuries)
   - 8.9 [Predictions](#89-predictions)
   - 8.10 [Coachs](#810-coachs-nota-typo-oficial)
   - 8.11 [Players](#811-players)
   - 8.12 [Transfers](#812-transfers)
   - 8.13 [Trophies](#813-trophies)
   - 8.14 [Sidelined](#814-sidelined)
   - 8.15 [Odds (In-Play)](#815-odds-in-play)
   - 8.16 [Odds (Pre-Match)](#816-odds-pre-match)
9. [Sub-endpoints de Fixtures (en detalle)](#9-sub-endpoints-de-fixtures-en-detalle)
10. [CDN de Media — URLs directas de assets](#10-cdn-de-media--urls-directas-de-assets)
   - 10.0.1 [CDN alternativo: `flagcdn.com` (usado en ProdeAR)](#1001-cdn-alternativo-flagcdncom-usado-en-prodear)
   - 10.1 [Estrategia de imágenes en ProdeAR](#101-estrategia-de-imágenes-en-prodear)
11. [Coverage de ligas: features disponibles por competencia](#11-coverage-de-ligas-features-disponibles-por-competencia)
12. [Endpoints actualmente en uso en ProdeAR](#12-endpoints-actualmente-en-uso-en-prodear)
   - 12.1 [Oportunidades de optimización (3.9.2+)](#121-oportunidades-de-optimización-392)
   - 12.2 [Coverage-based skip](#122-coverage-based-skip)
13. [Tips y gotchas](#13-tips-y-gotchas)
14. [Snippets útiles](#14-snippets-útiles)
15. [Referencias cruzadas](#15-referencias-cruzadas)

---

## 1. Información general

| Campo            | Valor                                                          |
| ---------------- | -------------------------------------------------------------- |
| Proveedor        | API-Sports (no es un RapidAPI white-label, es directo)         |
| Producto         | API-Football v3                                                |
| Versión actual   | 3.9.3 (a junio 2026)                                           |
| Base URL         | `https://v3.football.api-sports.io`                            |
| Protocolo        | HTTPS · REST · JSON                                            |
| Auth             | Header `x-apisports-key`                                       |
| Métodos permitidos | **Solo GET**                                                   |
| Headers permitidos | **Solo `x-apisports-key`** (otros generan error)             |
| Cobertura        | ~1.200 ligas, ~50.000 equipos, ~300.000 jugadores              |
| Timezone default | UTC (en fechas de fixtures)                                    |

---

## 2. Autenticación y reglas de request

```http
GET /fixtures?live=all HTTP/1.1
Host: v3.football.api-sports.io
x-apisports-key: TU_API_KEY_AQUI
```

> ⚠️ **Reglas críticas:**
> - **Solo se permite el header `x-apisports-key`**. Cualquier otro header adicional genera error.
> - **Solo se permiten requests GET**. POST/PUT/DELETE devuelven error.
> - **Frameworks JS/Node** agregan headers extra automáticamente — hay que removerlos manualmente.

> 🔐 En ProdeAR, la key se guarda como secret `API_FOOTBALL_KEY` en el panel de Supabase y se inyecta en runtime dentro de la Edge Function `poll-scores`. **Nunca loguear la key.**

---

## 3. Convención de respuesta (envelope)

**Todas** las respuestas exitosas siguen este formato:

```json
{
  "get": "endpoint/path",
  "parameters": ["key1=value1", "key2=value2"],
  "errors": [],
  "results": 129,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": [ ... ]
}
```

| Campo        | Significado                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `get`        | Path del endpoint llamado (eco de la request)                              |
| `parameters` | Array de strings con los query params enviados                              |
| `errors`     | Array de objetos `{request, message}` cuando algo falla del lado de params |
| `results`    | Cantidad de items en `response`                                             |
| `paging`     | `{current, total}` cuando hay paginación                                    |
| `response`   | El payload real. **Puede ser `null`** si no hay resultados, **NO `[]`**      |

> 🛑 **Validación crítica en ProdeAR:** siempre chequear `data.response === null` antes de iterar. Si lo tratás como array vacío directamente te explota el `null.length` en runtime.

---

## 4. Códigos HTTP

| Código | Significado         | Acción sugerida                                       |
| ------ | ------------------- | ----------------------------------------------------- |
| `200`  | OK                  | Continuar, parsear `response`                         |
| `204`  | No Content          | Filtros válidos pero sin resultados → tratar como OK  |
| `499`  | Time Out / Rate     | Backoff exponencial y retry (típico de cuota excedida)|
| `500`  | Internal Server Err | Log + alerta, NO reintentar de inmediato              |

> 📌 El código `499` es propio de la API-Sports (no es HTTP estándar). Se dispara cuando se excede el rate limit del plan.

---

## 5. Rate limits y monitoreo

### Headers de respuesta (todas las requests)

| Header                              | Significado                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `x-ratelimit-requests-limit`        | Requests/día asignados según plan                       |
| `x-ratelimit-requests-remaining`    | Requests/día restantes                                  |
| `X-RateLimit-Limit`                 | Máximo de calls por minuto                               |
| `X-RateLimit-Remaining`             | Calls restantes antes de llegar al límite por minuto    |

> 💡 **ProdeAR debería loguear estos headers** en cada llamada de la Edge Function para detectar cuándo se está cerca del límite diario o por minuto.

### Política de rate limiting

> Si se excede el rate permitido por minuto (ya sea por uso continuo o por picos anormales), el acceso puede ser **temporal o permanentemente bloqueado por el firewall sin aviso previo**. Esto es para garantizar estabilidad y uso justo.

### Plan ProdeAR

> ProdeAR usa plan Pro ($19/mes · 7.500 req/día). Documentado en `walkthrough.md` (Sprint 2). Con el patrón actual de 5–6 calls por partido y ~200 partidos/día → ~1.200 calls/día (~16% de cuota).

---

## 6. Endpoint de status (free, no consume cuota)

```http
GET /status
```

> 🎯 **Este endpoint NO cuenta contra la cuota diaria.** Útil para monitoreo.

**Response:**

```json
{
  "get": "status",
  "parameters": [],
  "errors": [],
  "results": 1,
  "response": {
    "account": {
      "firstname": "xxxx",
      "lastname": "XXXXXX",
      "email": "xxx@xxx.com"
    },
    "subscription": {
      "plan": "Free",
      "end": "2020-04-10T23:24:27+00:00",
      "active": true
    },
    "requests": {
      "current": 12,
      "limit_day": 100
    }
  }
}
```

> 📌 Para ProdeAR, sería ideal implementar un job que llame a `/status` cada 6h y guarde `requests.current` y `subscription.end` en una tabla de monitoreo, para alertar si la cuota se acerca al límite o si la suscripción está por vencer.

---

## 7. Changelog relevante (3.8.1 → 3.9.3)

### 3.9.3 (versión actual)
- ✅ Nuevo endpoint `/players/profiles` — lista de todos los jugadores disponibles
- ✅ Nuevo endpoint `/players/teams` — equipos y temporadas donde jugó un jugador
- ✅ **`/fixtures`** — nuevo campo `extra` (tiempo adicional en cada tiempo)
- ✅ **`/fixtures`** — nuevo campo `standings` (boolean: si la competencia tiene standings)
- ✅ **`/fixtures/rounds`** — nuevo param `dates` que devuelve las fechas de cada round
- ✅ **`/fixtures/statistics`** — nuevo param `half` para estadísticas del entretiempo (datos desde 2024)
- ✅ **`/injuries`** — nuevo param `ids` (max 20 fixtures en una sola call)
- ✅ **`/teams/statistics`** — más stats: Goals Over, Goals Under
- ✅ **`/sidelined`** — nuevos params `players` y `coachs` (max 20 en una sola call)
- ✅ **`/trophies`** — nuevos params `players` y `coachs` (max 20 en una sola call)

### 3.9.2
- ✅ Nuevo endpoint `/odds/live` (cuotas en vivo)
- ✅ Nuevo endpoint `/odds/live/bets`
- ✅ **`/teams`** — nuevos params `code` y `venue`. Nuevo endpoint `/teams/countries`
- ✅ **`/fixtures`** — nuevo param `ids` (max 20): **trae events, lineups, statistics y players en una sola call**
- ✅ **`/fixtures`** — varios status posibles (`?status=NS-PST-FT`)
- ✅ **`/fixtures`** — nuevo param `venue`
- ✅ **`/fixtures/headtohead`** — varios status + param `venue`

### 3.8.1
- ✅ Nuevo endpoint `/injuries`
- ✅ Nuevo endpoint `/players/squads` (plantel actual)
- ✅ Nuevo endpoint `/players/topassists`
- ✅ Nuevo endpoint `/players/topyellowcards`
- ✅ Nuevo endpoint `/players/topredcards`
- ✅ **`/fixtures/lineups`** — posiciones de jugadores en el grid + colores de camiseta
- ✅ **`/fixtures/events`** — eventos VAR (desde 2020-2021)
- ✅ **`/teams`** — agregado tri-code
- ✅ **`/teams/statistics`** — más stats: scoring minute, cards per minute, formation, penalty
- ✅ Fotos de coachs agregadas

---

## 8. Endpoints por recurso

> Cada subsección incluye: método + path, query params, header, update frequency, recommended calls, estructura de `response` y notas de uso en ProdeAR.

---

### 8.1 Timezone

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /timezone`                                                                        |
| **Query params**     | (ninguno)                                                                              |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | No se actualiza (lista fija de 425 timezones)                                          |
| **Recommended calls**| 1 call cuando se necesite                                                             |
| **Response**         | Array de strings con timezones (`"Africa/Abidjan"`, `"Europe/London"`, etc.)         |
| **Notas**            | Usar en otros endpoints como filtro `?timezone=Europe/London`                          |

---

### 8.2 Countries

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /countries`                                                                       |
| **Query params**     | `name` (string), `code` (string, 2-6 chars: `FR`, `GB-ENG`, `IT`…), `search` (3+ chars) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cuando se agrega una nueva liga de un país no cubierto                                |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ name, code, flag }` donde `flag` es URL completa al CDN                    |
| **Notas**            | `name` y `code` pueden usarse como filtros en otros endpoints                          |

**Estructura response:**
```json
{
  "name": "England",
  "code": "GB",
  "flag": "https://media.api-sports.io/flags/gb.svg"
}
```

---

### 8.3 Leagues

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /leagues`                                                                         |
| **Query params**     | `id`, `name`, `country`, `code`, `season`, `team`, `type` (`league`/`cup`), `current` (`true`/`false`), `search` (3+ chars), `last` (max 2 chars) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces al día                                                                    |
| **Recommended calls**| 1 call/hora ⚡ (no por día, este es muy dinámico)                                       |
| **Response**         | Array de `{ league, country, seasons[] }` donde `seasons` tiene `year`, `start`, `end`, `current`, `coverage` |
| **Notas**            | `league.id` es **único en la API** y se mantiene a través de todas las seasons.       |

**Estructura response (season.coverage — MUY IMPORTANTE):**
```json
{
  "league": { "id": 39, "name": "Premier League", "type": "League", "logo": "URL" },
  "country": { "name": "England", "code": "GB", "flag": "URL" },
  "seasons": [{
    "year": 2010,
    "start": "2010-08-14",
    "end": "2011-05-17",
    "current": false,
    "coverage": {
      "fixtures": {
        "events": true,
        "lineups": true,
        "statistics_fixtures": false,
        "statistics_players": false
      },
      "standings": true,
      "players": true,
      "top_scorers": true,
      "top_assists": true,
      "top_cards": true,
      "injuries": true,
      "predictions": true,
      "odds": false
    }
  }]
}
```

> 🎯 **Ver sección 11** sobre cómo interpretar `coverage` para saber qué features están disponibles para cada liga.

---

### 8.4 Teams

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /teams`                                                                           |
| **Query params**     | `id`, `name`, `league`, `season`, `country`, `code` (3 chars), `venue`, `search` (3+ chars) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ team, venue }`                                                            |
| **Notas**            | ⚠️ **Requiere al menos un parámetro.** `team.id` es único en la API.                   |

**Estructura response:**
```json
{
  "team": {
    "id": 33, "name": "Manchester United", "code": "MUN",
    "country": "England", "founded": 1878, "national": false,
    "logo": "URL"
  },
  "venue": {
    "id": 556, "name": "Old Trafford", "address": "Sir Matt Busby Way",
    "city": "Manchester", "capacity": 76212, "surface": "grass",
    "image": "URL"
  }
}
```

#### Sub-endpoints de Teams

| Path                            | Descripción                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `GET /teams/statistics`         | Estadísticas de un equipo en una liga+season. **Requiere** `league`, `season`, `team`. Param opcional `date` para acumular hasta esa fecha. |
| `GET /teams/seasons`            | Temporadas disponibles para un equipo (`?team=X`)            |
| `GET /teams/countries`          | Lista de países con equipos                                  |

---

### 8.5 Venues

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /venues`                                                                          |
| **Query params**     | `id`, `name`, `city`, `country`, `search` (3+ chars)                                  |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ id, name, address, city, country, capacity, surface, image }`            |
| **Notas**            | ⚠️ Requiere al menos un parámetro. `venue.id` es único.                                |

---

### 8.6 Standings

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /standings`                                                                       |
| **Query params**     | `league`, `season` (requerido), `team`                                                |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada hora                                                                              |
| **Recommended calls**| 1 call/hora si hay partidos en curso, 1 call/día si no                                 |
| **Response**         | Array de `{ league, standings[ [ { rank, team, points, ... } ] ] }`                   |
| **Notas**            | Algunas ligas tienen varios rankings (fase de grupos, apertura, clausura).            |

**Estructura de un equipo en la tabla:**
```json
{
  "rank": 1,
  "team": { "id": 40, "name": "Liverpool", "logo": "URL" },
  "points": 70,
  "goalsDiff": 41,
  "group": "Premier League",
  "form": "WWWWW",
  "status": "same",
  "description": "Promotion - Champions League (Group Stage)",
  "all":   { "played": 24, "win": 23, "draw": 1, "lose": 0, "goals": {"for": 56, "against": 15} },
  "home":  { "played": 12, "win": 12, "draw": 0, "lose": 0, "goals": {"for": 31, "against": 9 } },
  "away":  { "played": 12, "win": 11, "draw": 1, "lose": 0, "goals": {"for": 25, "against": 6 } },
  "update": "2020-01-29T00:00:00+00:00"
}
```

> ⚠️ **Estructura anidada especial**: `response[0].league.standings` es un **array de arrays**. Cada sub-array es un grupo/división, y dentro hay un objeto por equipo. En ligas con un solo grupo, hay un solo sub-array.

---

### 8.7 Fixtures

| Campo                | Detalle                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Método + Path**    | `GET /fixtures`                                                                                                                                  |
| **Query params**     | `id`, `ids` (max 20), `live` (`all` o `id-id`), `date` (YYYY-MM-DD), `league`, `season`, `team`, `last` (X últimos), `next` (X próximos), `from`, `to`, `round`, `status` (uno o varios separados por guión), `venue`, `timezone` |
| **Header**           | `x-apisports-key` (requerido)                                                                                                                    |
| **Update frequency** | Cada 15 segundos ⚡                                                                                                                              |
| **Recommended calls**| 1 call/minuto para los partidos en curso, 1 call/día si no                                                                                        |
| **Response**         | Array de `{ fixture, league, teams, goals, score }`                                                                                              |
| **Límite crítico**   | ⚠️ `ids` acepta **máximo 20 IDs** separados por guiones                                                                                          |

#### 🎯 Importante: el param `ids` trae TODO

Desde 3.9.2, cuando llamás `?ids=X-Y-Z`, el response **ya incluye events, lineups, statistics y players** en la misma respuesta. Esto puede simplificar la lógica de fetch.

#### Combinaciones de filtros útiles

| Caso de uso                            | Query                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| Partidos en vivo                       | `?live=all`                                                        |
| Partidos de una liga en una season     | `?league=128&season=2026`                                          |
| Próximos N partidos de un equipo       | `?team=451&next=5`                                                 |
| Partidos entre dos fechas              | `?from=2026-06-10&to=2026-06-20`                                   |
| Buscar por IDs específicos             | `?ids=1035-1036-1037` (máx 20)                                      |
| Partidos de una jornada                | `?league=128&season=2026&round=Regular Season - 5`                 |
| Solo partidos finalizados              | `?league=128&season=2026&status=FT`                                |
| Múltiples status                       | `?status=NS-PST-FT`                                                |

#### Estructura completa de un fixture

```json
{
  "fixture": {
    "id": 1035470,
    "referee": "F. Rapallini",
    "timezone": "UTC",
    "date": "2026-06-15T00:00:00+00:00",
    "timestamp": 1757846400,
    "periods": { "first": null, "second": null },
    "venue": { "id": 1, "name": "Estadio Alberto J. Armando", "city": "Avellaneda" },
    "status": { "long": "Not Started", "short": "NS", "elapsed": null, "extra": null },
    "standings": true   // NUEVO en 3.9.3
  },
  "league": {
    "id": 128, "name": "Liga Profesional Argentina", "country": "Argentina",
    "logo": "URL", "season": 2026, "round": "Regular Season - 5"
  },
  "teams": {
    "home": { "id": 451, "name": "Boca Juniors", "logo": "URL", "winner": null },
    "away": { "id": 455, "name": "River Plate",  "logo": "URL", "winner": null }
  },
  "goals": { "home": null, "away": null },
  "score": {
    "halftime":  { "home": null, "away": null },
    "fulltime":  { "home": null, "away": null },
    "extratime": { "home": null, "away": null },
    "penalty":   { "home": null, "away": null }
  }
}
```

#### Status `short` (valores oficiales)

| Short    | Long                    | Tipo        | Descripción                                  |
| -------- | ----------------------- | ----------- | -------------------------------------------- |
| `TBD`    | Time To Be Defined      | Scheduled   | Fecha/hora aún no conocida                  |
| `NS`     | Not Started             | Scheduled   |                                            |
| `1H`     | First Half              | In Play     | Primer tiempo                              |
| `HT`     | Halftime                | In Play     | Entretiempo                                |
| `2H`     | Second Half             | In Play     | Segundo tiempo                             |
| `ET`     | Extra Time              | In Play     | Tiempo extra                               |
| `BT`     | Break Time              | In Play     | Pausa durante el alargue                   |
| `P`      | Penalty In Progress     | In Play     | Penales                                    |
| `SUSP`   | Match Suspended         | In Play     | Suspendido por el árbitro                  |
| `INT`    | Match Interrupted       | In Play     | Interrumpido                                |
| `LIVE`   | In Progress             | In Play     | En vivo (caso raro, sin datos de tiempo)   |
| `FT`     | Match Finished          | Finished    | Finalizado en tiempo regular                |
| `AET`    | Match Finished          | Finished    | Finalizado en tiempo extra (sin penales)   |
| `PEN`    | Match Finished          | Finished    | Finalizado por penales                     |
| `PST`    | Match Postponed         | Postponed   | Pospuesto                                  |
| `CANC`   | Match Cancelled         | Cancelled   | Cancelado                                  |
| `ABD`    | Match Abandoned         | Abandoned   | Abandonado                                 |
| `AWD`    | Technical Loss          | Not Played  | Pérdida técnica                            |
| `WO`     | WalkOver                | Not Played  | Walkover                                   |

> 📌 En ProdeAR, partidos con `status.short` ∈ `{1H, HT, 2H, ET, P, BT, LIVE}` se consideran **live**. Los terminados en `{FT, AET, PEN}` se consideran **finished**.

> ⚠️ `TBD`, `PST`, `CANC` se revisan y actualizan diariamente. Puede haber delay entre el anuncio oficial y la actualización en la API.

> ⚠️ No todas las competencias tienen livescore — algunas sólo tienen resultado final. En esos casos el status puede permanecer en `NS` hasta 48h después de finalizado.

---

### 8.8 Injuries

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /injuries`                                                                        |
| **Query params**     | `league`, `season`, `fixture`, `team`, `player`, `date`, `ids` (max 20 fixtures), `timezone` |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada 4 horas                                                                           |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ player, team, fixture, league }`                                           |
| **Notas**            | Data disponible desde abril 2021. Tipos: `Missing Fixture` o `Questionable`.           |

**Estructura de un injury:**
```json
{
  "player": {
    "id": 865, "name": "D. Costa", "photo": "URL",
    "type": "Missing Fixture",
    "reason": "Broken ankle"
  },
  "team":   { "id": 157, "name": "Bayern Munich", "logo": "URL" },
  "fixture": { "id": 686314, "timezone": "UTC", "date": "2021-04-07T19:00:00+00:00", "timestamp": 1617822000 },
  "league":  { "id": 2, "season": 2020, "name": "UEFA Champions League", "country": "World", "logo": "URL", "flag": null }
}
```

---

### 8.9 Predictions

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /predictions`                                                                     |
| **Query params**     | `fixture` (integer, **requerido**)                                                    |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada hora                                                                              |
| **Recommended calls**| 1 call/hora si hay partidos en curso, 1 call/día si no                                 |
| **Response**         | `{ predictions, league, teams, comparison, h2h }`                                      |
| **Notas**            | ⚠️ **No usa bookmaker odds**. Algoritmo propio basado en Poisson + stats + h2h.         |

**Estructura response:**
```json
{
  "predictions": {
    "winner":     { "id": 1189, "name": "Deportivo Santani", "comment": "Win or draw" },
    "win_or_draw": true,
    "under_over": "-3.5",
    "goals": { "home": "-2.5", "away": "-1.5" },
    "advice": "Combo Double chance : Deportivo Santani or draw and -3.5 goals",
    "percent": { "home": "45%", "draw": "45%", "away": "10%" }
  },
  "league": { "id": 252, "name": "...", "country": "...", "logo": "URL", "flag": "URL", "season": 2019 },
  "teams": {
    "home": { "id": 1189, "name": "...", "logo": "URL", "last_5": { "form": "60%", "att": "60%", "def": "0%", "goals": { "for": { "total": 3, "average": 0.6 }, "against": { "total": 5, "average": 1 } } }, "league": { ... stats completas ... } },
    "away": { "...": "..." }
  },
  "comparison": {
    "form": { "home": "60%", "away": "40%" },
    "att":  { "home": "43%", "away": "57%" },
    "def":  { "home": "62%", "away": "38%" },
    "poisson_distribution": { "home": "75%", "away": "25%" },
    "h2h":   { "home": "29%", "away": "71%" },
    "goals": { "home": "40%", "away": "60%" },
    "total": { "home": "51.5%", "away": "48.5%" }
  },
  "h2h": [ ... array de fixtures previos entre estos equipos ... ]
}
```

---

### 8.10 Coachs *(nota: typo oficial)*

> ⚠️ **El endpoint oficial se llama `/coachs`** (typo, debería ser `/coaches`). El CDN también usa `/coachs/`. Importante respetar el nombre real del endpoint.

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /coachs`                                                                          |
| **Query params**     | `id`, `team`, `search` (3+ chars)                                                     |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada día                                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ id, name, firstname, lastname, age, birth, nationality, height, weight, photo, team, career[] }` |
| **Notas**            | Foto en CDN: `https://media.api-sports.io/football/coachs/{coach_id}.png`             |

**Estructura response:**
```json
{
  "id": 40, "name": "T. Tuchel",
  "firstname": "Thomas", "lastname": "Tuchel",
  "age": 47,
  "birth": { "date": "1973-08-29", "place": "Krumbach", "country": "Germany" },
  "nationality": "Germany",
  "height": "192 cm", "weight": "85 kg",
  "photo": "https://media.api-sports.io/football/coachs/40.png",
  "team": { "id": 85, "name": "PSG", "logo": "URL" },
  "career": [
    { "team": { "id": 85, "name": "PSG", "logo": "URL" }, "start": "2018-07-01", "end": null },
    { "team": { "id": 165, "name": "Borussia Dortmund", "logo": "URL" }, "start": "2015-07-01", "end": "2017-05-01" }
  ]
}
```

---

### 8.11 Players

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /players`                                                                         |
| **Query params**     | `id`, `team`, `league`, `season`, `search` (4+ chars), `page` (default 1, **20 por página**) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día ⚠️ (no por hora)                                                            |
| **Response**         | Array de `{ player, statistics[] }`                                                    |
| **Notas**            | `search` requiere `league` o `team`. `rating` es calculado por posición. `player.id` único. |

**Estructura response:**
```json
{
  "player": {
    "id": 276, "name": "Neymar",
    "firstname": "Neymar", "lastname": "da Silva Santos Júnior",
    "age": 28,
    "birth": { "date": "1992-02-05", "place": "Mogi das Cruzes", "country": "Brazil" },
    "nationality": "Brazil",
    "height": "175 cm", "weight": "68 kg",
    "injured": false,
    "photo": "https://media.api-sports.io/football/players/276.png"
  },
  "statistics": [{
    "team":  { "id": 85, "name": "Paris Saint Germain", "logo": "URL" },
    "league": { "id": 61, "name": "Ligue 1", "country": "France", "logo": "URL", "flag": "URL", "season": 2019 },
    "games":     { "appearences": 15, "lineups": 15, "minutes": 1322, "number": null, "position": "Attacker", "rating": "8.053333", "captain": false },
    "substitutes": { "in": 0, "out": 3, "bench": 0 },
    "shots":     { "total": 70, "on": 36 },
    "goals":     { "total": 13, "conceded": null, "assists": 6, "saves": 0 },
    "passes":    { "total": 704, "key": 39, "accuracy": 79 },
    "tackles":   { "total": 13, "blocks": 0, "interceptions": 4 },
    "duels":     { "total": null, "won": null },
    "dribbles":  { "attempts": 143, "success": 88, "past": null },
    "fouls":     { "drawn": 62, "committed": 14 },
    "cards":     { "yellow": 3, "yellowred": 1, "red": 0 },
    "penalty":   { "won": 1, "commited": null, "scored": 4, "missed": 1, "saved": null }
  }]
}
```

> ⚠️ **Typos en la API** (documentados así): `appearences` (en lugar de "appearances"), `commited` (en lugar de "committed"). Respetar en el código TS.

#### Sub-endpoints de Players

| Path                          | Descripción                                                  | Paginación |
| ----------------------------- | ------------------------------------------------------------ | ---------- |
| `GET /players/profiles`       | Lista de **todos** los jugadores disponibles                 | **250/página** |
| `GET /players/seasons`        | Temporadas con stats de players disponibles                 |  -         |
| `GET /players/squads`         | `?team=X`: squad actual del equipo · `?player=X`: equipos del jugador | - |
| `GET /players/teams`          | Equipos y temporadas en los que jugó el jugador             | - |
| `GET /players/topscorers`     | Top 20 goleadores de una liga+season                        | - |
| `GET /players/topassists`     | Top 20 asistidores de una liga+season                        | - |
| `GET /players/topyellowcards` | Top 20 amonestados de una liga+season                       | - |
| `GET /players/topredcards`    | Top 20 expulsados de una liga+season                         | - |

> 💡 **Para ProdeAR:** `/players/squads?team=X` es la mejor opción para sincronizar el plantel completo de un equipo (incluye foto, posición, número de camiseta).

---

### 8.12 Transfers

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /transfers`                                                                       |
| **Query params**     | `player`, `team` (al menos uno)                                                        |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ player, update, transfers: [{ date, type, teams: { in, out } }] }`        |

---

### 8.13 Trophies

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /trophies`                                                                        |
| **Query params**     | `player` (int), `players` (string con guiones, max 20), `coach` (int), `coachs` (string, max 20) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ league, country, season, place }`                                         |

**Estructura de un trofeo:**
```json
{
  "league": "Ligue 1",
  "country": "France",
  "season": "2018/2019",
  "place": "Winner"   // "Winner", "2nd Place", "3rd Place", etc.
}
```

> 💡 Con el param `players=id-id-id` podés traer los trofeos de varios jugadores en una sola call (max 20).

---

### 8.14 Sidelined

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /sidelined`                                                                       |
| **Query params**     | `player` (int), `players` (string, max 20), `coach` (int), `coachs` (string, max 20) |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Varias veces a la semana                                                               |
| **Recommended calls**| 1 call/día                                                                             |
| **Response**         | Array de `{ type, start, end }`                                                       |

**Estructura de un sidelined:**
```json
{
  "type": "Suspended",     // "Suspended", "Hamstring", "Groin Strain", "Broken Toe", "Knee Injury", etc.
  "start": "2020-02-26",
  "end": "2020-03-01"
}
```

---

### 8.15 Odds (In-Play)

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /odds/live`                                                                       |
| **Query params**     | `fixture`, `league`, `bet`                                                             |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada 5 segundos ⚡ (rango real: 5-60 seg)                                              |
| **Recommended calls**| Continuo (pero limitado por rate)                                                       |
| **Notas**            | Partidos disponibles 15-5 min antes del kickoff, removidos 5-20 min después del final. **No se guarda historial.** |

**Status fields en el response:**
```json
"status": {
  "stopped": false,    // true si el partido está detenido por el árbitro
  "blocked": false,    // true si las apuestas están temporalmente bloqueadas
  "finished": false    // true si no empezó o si ya terminó
}
```

**Field `main` en los values:**
- Cuando hay varios valores idénticos para el mismo bet, `main: true` marca el que se debe considerar.
- Si el valor es único para el bet, `main` siempre es `false` o `null`.

**Field `suspended`:**
- `true` si esa apuesta específica está temporalmente suspendida.

**Estructura response (resumida):**
```json
{
  "fixture": { "id": 721238, "status": { "long": "Second Half", "elapsed": 62, "seconds": "62:14" } },
  "league":  { "id": 30, "season": 2022 },
  "teams":   { "home": { "id": 1563, "goals": 1 }, "away": { "id": 1565, "goals": 0 } },
  "status":  { "stopped": false, "blocked": false, "finished": false },
  "update":  "2022-01-27T16:21:01+00:00",
  "odds": [{
    "id": 36, "name": "Over/Under Line",
    "values": [
      { "value": "Over", "odd": "1.975", "handicap": "2", "main": true, "suspended": false },
      { "value": "Under", "odd": "1.875", "handicap": "2", "main": true, "suspended": false }
    ]
  }]
}
```

#### Sub-endpoint

| Path                    | Descripción                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `GET /odds/live/bets`   | Lista de bets disponibles en in-play (137 tipos: Match Corners, Asian Handicap, etc.). Update cada 60s. Query: `id`, `search` (3+ chars). |

> ⚠️ **`/odds/live` y `/odds` (pre-match) NO son intercambiables.** Los IDs de bets son distintos entre ambos.

---

### 8.16 Odds (Pre-Match)

| Campo                | Detalle                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Método + Path**    | `GET /odds`                                                                            |
| **Query params**     | `fixture`, `league`, `season`, `date`, `timezone`, `page` (**10 por página**), `bookmaker`, `bet` |
| **Header**           | `x-apisports-key` (requerido)                                                          |
| **Update frequency** | Cada 3 horas                                                                           |
| **Recommended calls**| 1 call cada 3 horas                                                                    |
| **Notas**            | Ofrece odds de 1-14 días antes del partido. **7 días de history.** Paginación: 10 por página. |

**Estructura response:**
```json
{
  "league":   { "id": 116, "name": "...", "country": "...", "logo": "URL", "flag": "URL", "season": 2020 },
  "fixture":  { "id": 326090, "timezone": "UTC", "date": "2020-05-15T15:00:00+00:00", "timestamp": 1589554800 },
  "update":   "2020-05-15T09:49:32+00:00",
  "bookmakers": [{
    "id": 6, "name": "Bwin",
    "bets": [{
      "id": 1, "name": "Match Winner",
      "values": [
        { "value": "Home", "odd": "2.50" },
        { "value": "Draw", "odd": "2.95" },
        { "value": "Away", "odd": "2.95" }
      ]
    }]
  }]
}
```

#### Sub-endpoints de Odds Pre-Match

| Path                  | Descripción                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `GET /odds/mapping`   | Lista de fixtures con odds disponibles (100 por página). Update diario. Solo `?page`. |
| `GET /odds/bookmakers`| Lista de bookmakers (id, name). Update varias veces/semana. 1 call/día. Query: `id`, `search` (3+ chars). |
| `GET /odds/bets`      | Lista de bets pre-match (id string, name). ⚠️ IDs son **strings**, no integers. No compatible con `/odds/live`. |

---

## 9. Sub-endpoints de Fixtures (en detalle)

> Estos son los que **ProdeAR consume activamente** en `poll-scores`, así que van con más profundidad.

### 9.1 `GET /fixtures/rounds`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `league` (requerido), `season` (requerido), `current` (boolean), `dates` (boolean, default false — desde 3.9.3), `timezone` |
| **Update**   | Cada día                                                                               |
| **Calls**    | 1 call/día                                                                             |
| **Response** | Array de strings con nombres de rounds (`"Regular Season - 1"`, etc.)                  |
| **Notas**    | El `round` puede usarse como filtro en `/fixtures`                                    |

### 9.2 `GET /fixtures/headtohead`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `h2h` (string `teamId1-teamId2`, requerido), `date`, `league`, `season`, `last`, `next`, `from`, `to`, `status`, `venue`, `timezone` |
| **Update**   | Cada 15 segundos                                                                       |
| **Calls**    | 1 call/minuto si hay en curso, 1 call/día si no                                       |

### 9.3 `GET /fixtures/statistics`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `fixture` (requerido), `team`, `type` (ej. "Total Shots"), `half` (boolean, desde 2024) |
| **Update**   | Cada minuto                                                                            |
| **Calls**    | 1 call/minuto si hay en curso, 1 call/día si no                                       |

**Stats disponibles (16):**
Shots on Goal · Shots off Goal · Total Shots · Blocked Shots · Shots insidebox · Shots outsidebox · Fouls · Corner Kicks · Offsides · Ball Possession · Yellow Cards · Red Cards · Goalkeeper Saves · Total passes · Passes accurate · Passes %

### 9.4 `GET /fixtures/events`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `fixture` (requerido), `team`, `player`, `type`                                       |
| **Update**   | Cada 15 segundos                                                                       |
| **Calls**    | 1 call/minuto si hay en curso, 1 call/día si no                                       |
| **Tipos**    | `Goal`, `Card`, `Subst`, `Var` (VAR desde 2020-2021)                                  |
| **Detalles** | `Normal Goal`, `Own Goal`, `Penalty`, `Missed Penalty`, `Yellow Card`, `Red Card`, `Substitution 1/2/3...`, `Goal cancelled`, `Penalty confirmed` |

### 9.5 `GET /fixtures/lineups`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `fixture` (requerido), `team`, `player`, `type`                                        |
| **Update**   | Cada 15 minutos                                                                        |
| **Calls**    | 1 call cada 15 min si en curso, 1 call/día si no                                       |
| **Notas**    | Disponible 20-40 min antes del kickoff. Posiciones en grid (X:Y). Colores de camiseta. |

**Estructura (simplificada):**
```json
{
  "team": {
    "id": 50, "name": "Manchester City", "logo": "URL",
    "colors": {
      "player":    { "primary": "5badff", "number": "ffffff", "border": "99ff99" },
      "goalkeeper":{ "primary": "99ff99", "number": "000000", "border": "99ff99" }
    }
  },
  "formation": "4-3-3",
  "startXI": [{ "player": { "id": 617, "name": "Ederson", "number": 31, "pos": "G", "grid": "1:1" } }, ...],
  "substitutes": [...],
  "coach": { "id": 4, "name": "Guardiola", "photo": "URL" }
}
```

> 📌 **Coordenadas grid:** X = fila (1 = arquería, incrementando hacia adelante), Y = columna (1 = izquierda → derecha).

### 9.6 `GET /fixtures/players`

| Campo        | Detalle                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| **Query**    | `fixture` (requerido), `team`                                                          |
| **Update**   | Cada minuto                                                                            |
| **Calls**    | 1 call/minuto si hay en curso, 1 call/día si no                                       |
| **🎯 Importante** | `player.photo` es **URL completa al CDN**. NO requiere segunda llamada.    |

**Estructura de un jugador en el partido:**
```json
{
  "player": { "id": 35931, "name": "Sebastián Sosa", "photo": "URL" },
  "statistics": [{
    "games":     { "minutes": 90, "number": 13, "position": "G", "rating": "6.3", "captain": false, "substitute": false },
    "offsides":  null,
    "shots":     { "total": 0, "on": 0 },
    "goals":     { "total": null, "conceded": 1, "assists": null, "saves": 0 },
    "passes":    { "total": 17, "key": 0, "accuracy": "68%" },
    "tackles":   { "total": null, "blocks": 0, "interceptions": 0 },
    "duels":     { "total": null, "won": null },
    "dribbles":  { "attempts": 0, "success": 0, "past": null },
    "fouls":     { "drawn": 0, "committed": 0 },
    "cards":     { "yellow": 0, "red": 0 },
    "penalty":   { "won": null, "commited": null, "scored": 0, "missed": 0, "saved": 0 }
  }]
}
```

---

## 10. CDN de Media — URLs directas de assets

Todas las imágenes están en `media.api-sports.io/football/...` y se pueden construir a mano con el ID del recurso. **Ahorra 1 request por cada asset** (no hay que pedirlo a la API).

| Recurso              | URL pattern                                                | Tamaño aprox. | Notas                                          |
| -------------------- | ---------------------------------------------------------- | ------------- | ---------------------------------------------- |
| Logo de liga         | `https://media.api-sports.io/football/leagues/{league_id}.png`  | ~200×200      | `league_id` es integer                          |
| Logo de equipo       | `https://media.api-sports.io/football/teams/{team_id}.png`      | ~200×200      | `team_id` es integer                            |
| Foto de jugador      | `https://media.api-sports.io/football/players/{player_id}.png`  | ~150×200      | Headshot/busto, formato PNG                     |
| Foto de coach        | `https://media.api-sports.io/football/coachs/{coach_id}.png`    | ~200×200      | ⚠️ "coachs" (typo oficial)                     |
| Imagen de venue      | `https://media.api-sports.io/football/venues/{venue_id}.png`    | ~800×600      |                                                |
| Bandera de país      | `https://media.api-sports.io/flags/{country_code}.svg`          | Variable      | ⚠️ Usa `code` (GB, FR, AR) en `.svg`, no `.png` |

### 10.0.1 CDN alternativo: `flagcdn.com` (usado en ProdeAR)

ProdeAR usa **`flagcdn.com`** para los grupos del Mundial porque la API no tiene flags específicos por equipo nacional (los logos de `media.api-sports.io/football/teams/{id}.png` son logos de **escudos** de clubes o federaciones, no banderas).

| Asset                  | URL pattern                                                | Notas                                                                                          |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Bandera de país (varios tamaños) | `https://flagcdn.com/w{N}/{code}.png`            | `w20` (20px) · `w40` (40px) · `w80` (80px) · `w160` · `w320` · `w640` · `w1280` · `w2560` |
| Bandera de país (alto fijo)      | `https://flagcdn.com/h{N}/{code}.png`            | `h20` · `h24` · `h40` · etc. Para aspect ratios donde la altura es la constraint           |
| Bandera SVG                     | `https://flagcdn.com/{code}.svg`                 | Vectorial, ideal para HiDPI                                                                   |
| País sin datos                   | `https://flagcdn.com/{code}.png` (404)          | Verificar con la lista oficial en https://flagcdn.com antes de usar                            |

**Códigos soportados:** ISO 3166-1 alpha-2 (AR, BR, MX, US, FR, etc.) + algunos especiales (`gb-eng`, `gb-sct`, `gb-wls` para las selecciones británicas).

**ProdeAR usa:**
- `flagcdn.com/w40/{code}.png` para los logos en las tablas de grupos (40px es el sweet spot entre calidad y bytes).
- El código se obtiene de `COUNTRY_FLAGS` en `src/lib/worldCupGroups.ts:120-164`.

> 💡 **Decisión arquitectónica**: `flagcdn.com` para **selecciones nacionales** (porque solo necesitan el código de país), `media.api-sports.io` para **clubes y federaciones** (porque necesitan el `team_id` específico). Mantener ambos CDNs en paralelo es la decisión correcta en ProdeAR.

### 10.1 Estrategia de imágenes en ProdeAR

> Esta sección consolida las decisiones de arquitectura sobre imágenes. Es el "cómo" detrás del "qué" del §10.

#### 10.1.1 Resolución y bytes

| Caso de uso                | Resolución        | URL pattern                                | Por qué                                                                  |
| -------------------------- | ----------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Bandera en tabla de grupo  | 40×30 px          | `flagcdn.com/w40/{code}.png`               | Sweet spot: legible, < 2KB por imagen                                    |
| Logo en MatchCard          | ~60×60 px (display) | `media.api-sports.io/football/teams/{id}.png` | La API devuelve ~200×200, el browser hace downscale                       |
| Foto de jugador en lineup  | ~40×60 px (display) | `media.api-sports.io/football/players/{id}.png` | La API devuelve ~150×200, queda bien con `object-fit: cover`            |
| Logo de liga en header     | ~40×40 px         | `media.api-sports.io/football/leagues/{id}.png` | Solo en algunos headers                                                  |
| Venue image                | (no usado)        | `media.api-sports.io/football/venues/{id}.png` | **800×600 = 200KB+ por imagen.** No vale la pena salvo pantalla dedicada |

> 📌 **Regla**: el `<img srcset>` no se usa en ProdeAR porque el trafico viene de un solo tamaño de la API. Si en el futuro se quisiera servir imágenes HiDPI/responsive, sería útil un proxy (BunnyCDN, Cloudflare Images, etc.) que genere las variantes on-the-fly.

#### 10.1.2 Lazy loading

**Todas las imágenes en ProdeAR usan `loading="lazy"`** (excepto logos críticos above-the-fold como el header del MatchCard). Implementado en:
- `src/components/match/MatchCard.tsx` (logos de equipos)
- `src/components/tournament/GroupTable.tsx` (logos en standings)
- `src/components/match/LiveMiniScoreboard.tsx` (logos de equipos en vivo)
- `src/lib/playerHelpers.ts` (fotos de jugadores en lineup)

```tsx
<img
  src={standing.logo}
  alt=""
  className="w-4 h-4 object-contain"
  loading="lazy"
/>
```

#### 10.1.3 Fallback strategy (2-tier)

Patrón implementado en componentes como `GroupTable.tsx:43-46`:

```tsx
{standing.logo ? (
  <img src={standing.logo} alt="" className="..." loading="lazy" />
) : (
  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
    flag
  </span>
)}
```

**Tier 1**: Imagen del CDN (90% de los casos).
**Tier 2**: Ícono `flag` de Material Symbols (cuando `logo === null` o falla el fetch).

> 💡 **Mejora futura**: detectar `onError` del `<img>` y swapear al fallback en runtime (no solo al renderizar). Útil cuando una imagen existe en DB pero el CDN está caído.

#### 10.1.4 Caching strategy

ProdeAR **no cachea imágenes** porque:
- Las URLs son CDN-friendly con `Cache-Control: max-age=...` configurado en el edge
- 40×30 px son < 2KB,不值得 en localStorage
- `loading="lazy"` evita peticiones que no se necesitan

Si en el futuro se quisiera cache:
- **BunnyCDN** (recomendado por la docu oficial de API-Sports): pull-zone que cachea `media.api-sports.io` y sirve desde edge cercano al usuario.
- **Service Worker** (ya existe en `src/service-worker.ts`): podría interceptar requests a `media.api-sports.io` y `flagcdn.com` con `CacheStorage`.

#### 10.1.5 Costo y rate limits

> ⚠️ Las llamadas a logos/imágenes **NO cuentan contra la cuota diaria** de la API-Football, pero están sujetas a un rate per second/minute del CDN.

En ProdeAR, el peor caso es:
- 12 grupos × 4 equipos = 48 logos de bandera (en `flagcdn.com`)
- 12 grupos × 4 equipos = 48 logos de escudo (potencialmente en `media.api-sports.io`)
- ~22 jugadores por partido en lineup × partidos live ≈ 100-200 fotos

Con `loading="lazy"`, solo se piden las imágenes que entran en viewport. El browser limita a 6 connections concurrentes por dominio, lo cual previene picos.

> ⚠️ **Sobre uso de logos/marcas**: la API-Sports aclara que no posee derechos sobre los assets visuales y que el uso en tu app puede requerir licencias adicionales de los titulares.
| Foto de coach        | `https://media.api-sports.io/football/coachs/{coach_id}.png`    | ~200×200      | ⚠️ "coachs" (typo oficial)                     |
| Imagen de venue      | `https://media.api-sports.io/football/venues/{venue_id}.png`    | ~800×600      |                                                |
| Bandera de país      | `https://media.api-sports.io/flags/{country_code}.svg`          | Variable      | ⚠️ Usa `code` (GB, FR, AR) en `.svg`, no `.png` |

> 💡 **ProdeAR ya usa este patrón en `mockData.ts` y `poll-scores`** con fallbacks hardcodeados para IDs de equipos argentinos (Boca 451, River 455, Racing 443, etc.).

> ⚠️ Las llamadas a logos/imágenes **NO cuentan contra la cuota diaria** y son gratuitas, pero están sujetas a un rate per second/minute. Se recomienda cachear localmente (BunnyCDN es la solución que recomienda la docu oficial).

> ⚠️ Sobre uso de logos/marcas: la API-Sports aclara que no posee derechos sobre los assets visuales y que el uso en tu app puede requerir licencias adicionales de los titulares.

---

## 11. Coverage de ligas: features disponibles por competencia

Cuando llamás a `/leagues?id=X&season=Y`, el campo `coverage` te dice qué features están disponibles para esa liga en esa temporada:

```json
"coverage": {
  "fixtures": {
    "events": true,                // ¿events disponibles en /fixtures/{id}/events?
    "lineups": true,               // ¿lineups disponibles?
    "statistics_fixtures": false,  // ¿stats del partido disponibles?
    "statistics_players": false    // ¿stats por jugador disponibles?
  },
  "standings": true,              // ¿hay tabla de posiciones?
  "players": true,                // ¿hay datos de jugadores?
  "top_scorers": true,
  "top_assists": true,
  "top_cards": true,
  "injuries": true,
  "predictions": true,
  "odds": false                   // ¿hay odds de bookmakers?
}
```

> 📌 **Interpretación:**
> - Los flags `True/False` reflejan la **disponibilidad al momento de la consulta**. En una competencia que aún no empezó, es normal que todo esté en `False`. Se actualiza cuando arranca.
> - **No garantiza 100% de disponibilidad** — puede variar de season a season.
> - **Friendlies (amistosos) son excepción**: el coverage puede diferir de lo reportado en `/leagues`, dependiendo del partido individual.
> - **Cup competitions**: los fixtures se agregan automáticamente cuando se conocen los equipos. Ej: si la fase actual es 8vos, los 4tos se agregan cuando se conocen los equipos.
> - **Competencias con delay**: pueden tardar en aparecer respecto al anuncio oficial.

> 💡 **Para ProdeAR:** antes de hacer fetch de stats/lineups/events de un partido, podríamos consultar el `coverage` de la liga+season correspondiente y cachearlo. Si `statistics_fixtures: false`, no gastar cuota en `/fixtures/statistics`.

---

## 12. Endpoints actualmente en uso en ProdeAR

> **Fuente:** `supabase/functions/poll-scores/index.ts` (revisado a junio 2026).

| # | Endpoint                                | Modo de uso                            | Calls/partido | Costo (plan Pro) |
| - | --------------------------------------- | -------------------------------------- | ------------- | ---------------- |
| 1 | `GET /fixtures?live=all`                | Polling base (sin scope)               | 1 base        | 1 req            |
| 2 | `GET /fixtures?league=X&season=Y`       | Sync por competencia                   | 1 base        | 1 req            |
| 3 | `GET /fixtures?ids=A-B-C`               | Auto-Heal de partidos huérfanos        | 1 por chunk de 20 | 1 req         |
| 4 | `GET /fixtures/statistics?fixture=X`    | Stats del partido                      | 1 si `needsStats`     | 1 req       |
| 5 | `GET /fixtures/lineups?fixture=X`       | Formaciones                            | 1 si `needsLineups`   | 1 req       |
| 6 | `GET /fixtures/events?fixture=X`        | Eventos del partido                    | 1 si `needsEvents`    | 1 req       |
| 7 | `GET /fixtures/players?fixture=X`       | Jugadores + fotos (Sprint 2)           | 1 si `needsPlayerPhotos` | 1 req    |

**Total:** 5–6 calls por partido en vivo (medido Sprint 2).

> 💡 **Oportunidad de optimización (3.9.2+):** Reemplazar los 4 fetches individuales (`statistics` + `lineups` + `events` + `players`) por un único `GET /fixtures?ids=X-Y-Z` que trae todo. Reduciría de 4 req a 1 req por partido → ~80% menos cuota en este punto.

### Endpoints NO usados (candidatos a futuro)

| Endpoint                      | Uso potencial                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `GET /status`                 | Monitoreo de cuota y suscripción (cron cada 6h)                                |
| `GET /standings`              | Tabla de posiciones en la pantalla de detalle del torneo                       |
| `GET /leagues?current=true`   | Sincronizar la lista de ligas disponibles de la temporada actual              |
| `GET /teams?league=X&season=Y`| Poblar la base de equipos con logos (vía CDN) en lugar de mocks         |
| `GET /players/squads?team=X`  | Sincronizar planteles completos (foto, posición, número)                      |
| `GET /players/topscorers`     | Rankings de goleadores para sección de estadísticas                          |
| `GET /predictions?fixture=X` | Tips pre-partido para los usuarios indecisos                            |
| `GET /injuries?fixture=X`     | Mostrar lesionados/ausentes antes del partido                              |
| `GET /odds?fixture=X`         | Integrar casas de apuestas (⚠️ revisar compatibilidad con Pro)            |
| `GET /odds/live`              | Cuotas en vivo (exclusivo para in-play)                                   |
| `GET /coachs?team=X`          | Info del director técnico (nombre, foto, carrera)                         |

### 12.1 Oportunidades de optimización (3.9.2+)

> ⚠️ **Esta sección está al día con la implementación actual (`poll-scores/index.ts:1287`)**. La migración al patrón `?ids=X-Y-Z` (una sola call en vez de 4 separadas) está documentada pero **NO implementada todavía** en el código.

#### 12.1.1 El problema: 4 fetches por partido

`poll-scores` actualmente hace **hasta 4 calls separados** por cada partido live/finished:

```ts
// En poll-scores/index.ts (líneas 878, 900, 922, 974)
await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${f.fixture.id}`);
await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${f.fixture.id}`);
await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${f.fixture.id}`);
await fetch(`https://v3.football.api-sports.io/fixtures/players?fixture=${f.fixture.id}`);
```

**Cuota resultante** (asumiendo 200 partidos/día con datos completos):
- 200 partidos × 4 calls = **800 calls/día solo para stats/lineups/events/players**
- + 1 call base (live) = 200 calls
- + Auto-Heal ocasional = ~50 calls
- = **~1,050 calls/día** (14% de cuota Pro de 7,500)

#### 12.1.2 La solución: `?ids=X-Y-Z` trae todo desde 3.9.2

A partir de **3.9.2**, el param `ids` de `/fixtures` **incluye events, lineups, statistics y players** en la misma respuesta. Esto permite consolidar los 4 fetches en 1 solo.

**Patrón propuesto** (no implementado todavía, ready para migrar):

```ts
// Phase B: batch fetch con /fixtures?ids=...
// Chunking de 20 IDs por request (límite de la API)
const idsNeedingData = fixtures.filter(f => needsData(f)).map(f => f.fixture.id);

for (let i = 0; i < idsNeedingData.length; i += 20) {
  const chunk = idsNeedingData.slice(i, i + 20).join("-");
  const resp = await fetch(
    `https://v3.football.api-sports.io/fixtures?ids=${chunk}`,
    { headers: { "x-apisports-key": apiFootballKey } }
  );
  // La respuesta ya trae: events, lineups, statistics, players
  // Solo falta extraerlos y mapearlos como hacemos hoy
}
```

**Cuota resultante con la migración**:
- 200 partidos × 1 call (con `?ids=`) = **200 calls/día**
- + 1 call base (live) = 200 calls
- = **~400 calls/día** (5% de cuota Pro)

**Ahorro: 60% en cuota** (1,050 → 400 calls/día), con ~500 calls de margen para crecer (sync de planteles, standings, injuries, odds — ver §12).

#### 12.1.3 Cuándo NO aplicar este patrón

- **Partidos que NO necesitan datos**: partidos con `needsStats = false && needsLineups = false && ...` (ej. partidos que ya tienen todo en DB). El check de "needsData" es **crítico** para no desperdiciar calls.
- **Partidos cancelados/postponed**: no se fetchean (no hay datos para extraer).
- **Edge case de la API**: si la API no incluye los datos en `?ids=` (versión < 3.9.2), el patrón degrada gracefully (campos vacíos en lugar de error).

#### 12.1.4 Plan de migración (3 pasos)

1. **Detectar versión de la API** en runtime (parsear de `/status` o hardcodear `3.9.2`).
2. **Implementar el patrón** detrás de un feature flag `USE_BATCHED_FIXTURE_FETCH` en `poll-scores`.
3. **Comparar resultados** durante 1 semana: cantidad de stats/lineups/events faltantes debería ser 0.
4. **Rollout**: 10% de partidos → 50% → 100% durante 1 semana más.

> 💡 **Tests**: la migración se puede validar con un script que cuente `stats.length / lineups.length / events.length` antes y después, esperando 0 diferencia.

### 12.2 Coverage-based skip (leer `/leagues` antes de fetchar)

> **Idea complementaria a §12.1.** Si la liga no tiene `statistics_fixtures: true`, no tiene sentido fetchear `/fixtures/statistics`. Lo mismo para lineups y players.

#### 12.2.1 El coverage field

Cuando llamás a `/leagues?id=X&season=Y`, el campo `coverage.fixtures` te dice qué features están disponibles para esa liga+season:

```json
"coverage": {
  "fixtures": {
    "events": true,
    "lineups": true,
    "statistics_fixtures": false,  // ← esta liga no tiene stats
    "statistics_players": false
  }
}
```

#### 12.2.2 Patrón propuesto (no implementado)

```ts
// 1. Al sync inicial de una liga, guardar coverage en DB
const { data: league } = await supabase
  .from("competitions")
  .select("id, api_football_id, coverage")
  .eq("api_football_id", leagueId)
  .single();

// 2. En poll-scores, antes de fetchear stats/lineups, check coverage
const needsStats =
  league.coverage.fixtures.statistics_fixtures &&
  (isLive || isNewlyFinished || (!existingMatch?.stats?.length));

const needsLineups =
  league.coverage.fixtures.lineups &&
  (isLive || isNewlyFinished || (!existingMatch?.lineups?.length));
```

#### 12.2.3 Impacto estimado

- **~30% de las ligas** no tienen `statistics_fixtures: true` (ej. Champions League pre-2024, ligas regionales).
- Combinado con §12.1, el ahorro total estimado es **~70-80%** vs la implementación actual.

#### 12.2.4 Cuándo refrescar coverage

El coverage de una liga puede cambiar entre seasons. Recomendación: refresh al arrancar cada season nueva (1 call al año por liga, despreciable).

---

## 13. Tips y gotchas

### 13.1 `player.photo` es URL completa ✅

El campo `player.photo` del endpoint `/fixtures/players` ya viene con la URL completa al CDN:
```
https://media.api-sports.io/football/players/{id}.png
```
**No hace falta** una segunda llamada para resolver la URL. Discovery documentado en `walkthrough.md` (Sprint 2).

### 13.2 Límite de 20 IDs por request ⚠️

`/fixtures?ids=A-B-C...` acepta **máximo 20 IDs** separados por guiones. Para más, chunking en grupos de 20.

```ts
// Patrón ya implementado en poll-scores Auto-Heal
for (let i = 0; i < ids.length; i += 20) {
  const chunk = ids.slice(i, i + 20).join("-");
  await fetch(`https://v3.football.api-sports.io/fixtures?ids=${chunk}`, ...);
}
```

### 13.3 `/fixtures?ids=` trae TODO desde 3.9.2

A partir de 3.9.2, el param `ids` de `/fixtures` **incluye events, lineups, statistics y players** en la misma respuesta. Considerar migrar el patrón de 4 fetches a 1 fetch.

### 13.4 Formato de fechas 📅

Las fechas vienen en ISO 8601 con timezone:
```json
"date": "2026-06-15T00:00:00+00:00"
```
- El `+00:00` es UTC. Argentina (UTC-3) → restar 3h para hora local.
- `timestamp` es Unix epoch en **segundos** (multiplicar por 1000 para `Date` en JS).
- Se puede usar `?timezone=Europe/London` para que la API devuelva las fechas ya en otra zona.

### 13.5 Timezone de seasons 🌍

- **Formato europeo** (la mayoría): `season=2024` empieza en agosto 2024 y termina en junio 2025.
- **Formato año calendario**: la `season` coincide con el año natural (ej. MLS,某些 ligas asiáticas).
- Para "temporada actual" usar `?current=true` en `/leagues` o `?season={año_actual}` en fixtures.

### 13.6 IDs únicos a través de todas las seasons 🔒

- **League IDs** son únicos y se mantienen a través de todas las seasons. Guardar como FK estable.
- **Team IDs** son únicos a través de todas las ligas/copas. Un equipo mantiene su ID aunque juegue en otra liga.
- **Player IDs** son únicos a través de todos los equipos. Un jugador mantiene su ID aún cuando se transfiera.
- **Fixture IDs** son únicos. **Nunca cambian.**

### 13.7 Códigos 204 vs 499 vs 500 🚦

| Código | Cuándo pasa                            | Acción                                  |
| ------ | -------------------------------------- | --------------------------------------- |
| `204`  | Filtros válidos pero sin resultados    | Tratar como OK con `response` vacío     |
| `499`  | Rate limit excedido (plan agotado)     | Backoff exponencial y retry             |
| `500`  | Error del servidor de la API           | Log + alerta, NO reintentar de inmediato |

### 13.8 `response` puede ser `null` 🛑

```ts
// MAL — puede reventar con null.length
for (const f of data.response) { ... }

// BIEN
for (const f of data.response ?? []) { ... }
```

### 13.9 El header de auth NO es Bearer 🔑

```ts
// MAL
{ "Authorization": `Bearer ${apiFootballKey}` }

// BIEN
{ "x-apisports-key": apiFootballKey }
```

### 13.10 Costo actual vs cuota diaria 💰

- Plan Pro: **7.500 requests/día**.
- Sprint 2: ~5–6 calls por partido, asumiendo 200 partidos/día → **~1.200 calls/día** (~16% de cuota).
- Margen amplio para crecer (sync de planteles, standings, injuries, odds).

### 13.11 No usar `/odds` para in-play 🚫

> La docu lo dice explícitamente: **"`/odds` is not compatible with `/odds/live`"**. Para cuotas en vivo usar el endpoint dedicado.

### 13.12 `/status` es gratis 🎁

El endpoint `/status` **no cuenta contra la cuota diaria**. Útil para monitoreo constante de plan y consumo.

### 13.13 Headers de respuesta para rate limit 📊

Siempre loguear `x-ratelimit-requests-remaining` y `X-RateLimit-Remaining` en la Edge Function para detectar:
- Cuota diaria agotándose (alertas cuando < 10% restante)
- Throttling por minuto (pausar polls si `X-RateLimit-Remaining` llega a 0)

### 13.14 Typos en la API (respetar en el código) ✍️

La API tiene typos documentados que hay que respetar al hacer TypeScript:
- `appearences` (en lugar de "appearances") en `/players`
- `commited` (en lugar de "committed") en `/players`
- `coachs` (en lugar de "coaches") en `/coachs` y el CDN
- `extra` en fixtures (sin typo, pero es nuevo en 3.9.3)

### 13.15 Solo GET, solo header x-apisports-key 🚨

Cualquier otro método HTTP o cualquier otro header **genera error**. Frameworks como Axios o el browser agregan headers extra automáticamente — hay que removerlos manualmente o usar `fetch` nativo.

### 13.16 Directiva DB vs API (de Arquitectura §5.1) 🛡️

Antes de mapear un campo nuevo de la API a Supabase:

1. Verificar que la columna exista en `supabase/schema.sql` y en la DB remota.
2. Si falta, generar `ALTER TABLE ... ADD COLUMN ...` y pedir al usuario que lo aplique.
3. Después de la migración, refrescar PostgREST:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
4. Revisar logs de la Edge Function en Supabase Dashboard buscando `Could not find the '...' column of '...' in the schema cache`.

### 13.17 `?ids=` es la navaja suiza para reducir calls 📦

A partir de **3.9.2**, `/fixtures?ids=X-Y-Z` (max 20) **trae TODO**: `events`, `lineups`, `statistics`, `players` en la misma respuesta. Reemplaza 4 calls separados por 1. **Ver §12.1** para el plan de migración y la cuota math.

### 13.18 Image CDN choice: `flagcdn.com` vs `media.api-sports.io` 🏳️

**Regla de decisión** (ver §10.1):
- **Selecciones nacionales** (Mundial, Eurocopa, etc.) → `flagcdn.com/w40/{code}.png`. Solo necesita el código ISO 3166-1 alpha-2.
- **Clubes y federaciones con escudo distintivo** → `media.api-sports.io/football/teams/{id}.png`. Necesita el `team_id` específico de la API.

**Por qué no usar `media.api-sports.io` para todo**: para una selección como "México", el "logo" de la API es el escudo de la Federación Mexicana de Fútbol (poco distintivo en una tabla de grupos). `flagcdn.com` te da la **bandera** que el usuario reconoce instantáneamente.

### 13.19 Pre-fetch de lineups: 20-40 min antes del kickoff ⏱️

`/fixtures/lineups` se populan entre 20 y 40 min antes del partido (cuando los equipos oficializan las alineaciones). **Patrón recomendado** (no implementado):

- T-40min: fetchar `?ids=X` para los partidos que arrancan en los próximos 60 min
- T-0min: ya tenés lineups en DB
- Partido live: solo fetcheás events (1 call), no lineups de nuevo

> Combinado con §12.1, esto permite un solo `?ids=X` por partido en su lifecycle completo.

---

## 14. Snippets útiles

### 14.1 cURL básico

```bash
curl -X GET "https://v3.football.api-sports.io/fixtures?live=all" \
  -H "x-apisports-key: $API_FOOTBALL_KEY"
```

### 14.2 Fetch en Deno (estilo Edge Function de ProdeAR)

```ts
const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY")!;

const response = await fetch(
  `https://v3.football.api-sports.io/fixtures?${apiParams.toString()}`,
  { headers: { "x-apisports-key": apiFootballKey } },
);

if (!response.ok) {
  throw new Error(`API-Football request failed: ${response.statusText}`);
}

const data = await response.json();
const fixtures = data.response ?? [];  // ojo: puede ser null

// Logging de rate limits (recomendado)
console.log({
  "daily-remaining": response.headers.get("x-ratelimit-requests-remaining"),
  "min-remaining":   response.headers.get("X-RateLimit-Remaining"),
});
```

### 14.3 Headers builder reutilizable

```ts
function apiFootballHeaders() {
  const key = Deno.env.get("API_FOOTBALL_KEY");
  if (!key) throw new Error("API_FOOTBALL_KEY no configurada");
  return { "x-apisports-key": key };
}
```

### 14.4 Chunking de IDs (patrón Auto-Heal)

```ts
async function fetchFixturesByIds(ids: number[], headers: Record<string, string>) {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20).join("-");
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?ids=${chunk}`,
      { headers },
    );
    if (r.ok) {
      const d = await r.json();
      out.push(...(d.response ?? []));
    }
  }
  return out;
}
```

### 14.5 Helper para detectar partidos "live"

```ts
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function isLive(fixture: any): boolean {
  return LIVE_STATUSES.has(fixture?.status?.short);
}

function isFinished(fixture: any): boolean {
  return FINISHED_STATUSES.has(fixture?.status?.short);
}
```

### 14.6 Helper para construir URL del CDN

```ts
function leagueLogoUrl(id: number) {
  return `https://media.api-sports.io/football/leagues/${id}.png`;
}
function teamLogoUrl(id: number) {
  return `https://media.api-sports.io/football/teams/${id}.png`;
}
function playerPhotoUrl(id: number) {
  return `https://media.api-sports.io/football/players/${id}.png`;
}
function coachPhotoUrl(id: number) {  // sic: "coachs"
  return `https://media.api-sports.io/football/coachs/${id}.png`;
}
function venueImageUrl(id: number) {
  return `https://media.api-sports.io/football/venues/${id}.png`;
}
function countryFlagUrl(code: string) {  // ⚠️ usa .svg, no .png
  return `https://media.api-sports.io/flags/${code.toLowerCase()}.svg`;
}
```

### 14.7 Monitoreo de cuota (cron cada 6h)

```ts
async function checkApiStatus() {
	const response = await fetch("https://v3.football.api-sports.io/status", {
		headers: { "x-apisports-key": Deno.env.get("API_FOOTBALL_KEY")! },
	});
	const { response: data } = await response.json();

	await supabase.from("api_football_status").upsert({
		checked_at: new Date().toISOString(),
		plan: data.subscription.plan,
		subscription_end: data.subscription.end,
		subscription_active: data.subscription.active,
		requests_current: data.requests.current,
		requests_limit: data.requests.limit_day,
	});
}
```

### 14.8 Fetch optimizado con `?ids=X-Y-Z` (3.9.2+)

> **Reemplaza 4 calls separados (statistics + lineups + events + players) por 1 solo.**
> Patrón ready para migrar — ver §12.1 para el plan completo.

```ts
/**
 * Phase B del poll-scores: trae todo (events/lineups/statistics/players)
 * en una sola request por chunk de hasta 20 IDs.
 *
 * Antes (3 calls separados):
 *   await fetch(`/fixtures/statistics?fixture=${id}`)
 *   await fetch(`/fixtures/lineups?fixture=${id}`)
 *   await fetch(`/fixtures/events?fixture=${id}`)
 *   await fetch(`/fixtures/players?fixture=${id}`)
 *
 * Después (1 call por chunk de 20):
 *   await fetch(`/fixtures?ids=${ids.join("-")}`)
 */
async function fetchFixturesBatched(
	idsNeedingData: number[],
	headers: Record<string, string>,
): Promise<any[]> {
	const out: any[] = [];
	for (let i = 0; i < idsNeedingData.length; i += 20) {
		const chunk = idsNeedingData.slice(i, i + 20).join("-");
		const r = await fetch(
			`https://v3.football.api-sports.io/fixtures?ids=${chunk}`,
			{ headers },
		);
		if (r.ok) {
			const d = await r.json();
			out.push(...(d.response ?? []));
		}
		// Respeto al rate limit: 100ms entre chunks
		if (i + 20 < idsNeedingData.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	return out;
}
```

### 14.9 Image helpers con fallback (2-tier)

> **CDN URL → fallback a Material Symbols icon**.
> Patrón usado en `GroupTable`, `LiveMiniScoreboard`, `MatchCard`, etc.

```tsx
// Helper para imagen con fallback (usado en GroupTable.tsx, MatchCard.tsx)
function TeamLogo({
	src,
	alt = "",
	className = "w-4 h-4 object-contain",
}: {
	src: string | null;
	alt?: string;
	className?: string;
}) {
	if (!src) {
		return (
			<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
				flag
			</span>
		);
	}
	return <img src={src} alt={alt} className={className} loading="lazy" />;
}
```

### 14.10 Coverage-based skip (antes de fetchar stats/lineups)

> **Lee `/leagues` una vez por season. Skip el fetch si la cobertura dice que no hay datos.**
> Patrón ready para migrar — ver §12.2.

```ts
interface LeagueCoverage {
	fixtures: {
		events: boolean;
		lineups: boolean;
		statistics_fixtures: boolean;
		statistics_players: boolean;
	};
}

async function shouldFetchStats(
	supabase: any,
	leagueId: number,
): Promise<boolean> {
	const { data } = await supabase
		.from("competitions")
		.select("coverage")
		.eq("api_football_id", leagueId)
		.maybeSingle();

	const coverage = data?.coverage?.fixtures as LeagueCoverage["fixtures"] | undefined;
	return coverage?.statistics_fixtures ?? false;
}

// Uso en poll-scores:
const needsStats =
	(await shouldFetchStats(supabase, f.league.id)) &&
	(isLive || isNewlyFinished || !existingMatch?.stats?.length);
```

---

## 15. Referencias cruzadas

| Documento                                              | Qué encontrás                                                |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `supabase/functions/poll-scores/index.ts`              | Implementación real que consume estos endpoints              |
| `supabase/schema.sql`                                  | Columnas de la tabla `matches` que reciben los datos         |
| `supabase/schema_functions.sql`                        | Función `calculate_match_points` y triggers                  |
| `Arquitectura.md` §5 (Flujo de Sincronización)         | Diagrama de cómo llega la data de la API a Supabase           |
| `Arquitectura.md` §5.1 (Directiva DB vs API)           | Reglas de oro para no romper el schema con cambios de API     |
| `walkthrough.md` (Sprint 2)                            | Discovery de `player.photo` como URL completa                |
| `task.md` §6 (Foto de jugadores)                       | Backlog original y criterio de aceptación                    |
| `docs/match-bottom-sheet-ux-spec.md`                   | UX de la pantalla de detalle que muestra los datos de fixture |
| `src/lib/worldCupGroups.ts`                            | Constante `COUNTRY_FLAGS` que mapea país → `flagcdn.com` code |
| `src/lib/cdnHelpers.ts`                                | Helpers `teamLogoUrl()`, `playerPhotoUrl()`, etc.            |
| `src/lib/playerHelpers.ts`                             | Enrichment de lineups con fotos de jugadores (`enrichPlayers`) |
| `src/App.tsx` §QueryClient                             | Config de React Query (staleTime, refetchOnWindowFocus)       |
| `src/hooks/useMatches.ts`                              | Polling adaptativo cada 15s si hay partido live               |
| `src/components/match/MatchSheet.tsx`                  | BottomSheet consumidor pasivo de Supabase (NO toca API)       |
| Docu oficial online                                    | https://www.api-football.com/documentation-v3 (protegida con 403 al scraping) |

---

## 📌 Changelog del documento

| Fecha      | Cambio                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Jun 2026   | **Sprint 3**: Agregadas secciones 10.1 (Image Strategy), 12.1 (Optimización `?ids=`), 12.2 (Coverage-based skip). Tips 13.17, 13.18, 13.19. Snippets 14.8, 14.9, 14.10. Tabla de `flagcdn.com` en §10.0.1. §15 expandida con refs a código del frontend. |
| Jun 2026   | Reemplazo completo con datos oficiales de la v3.9.3 (traídos del PDF) |
| Jun 2026   | Creación inicial a partir de 4 capturas de la docu + hallazgos de ProdeAR |
