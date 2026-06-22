# Documento de Diseño — ProdeAR
## Liga de Terceros (en /ligas) + Árbol de Llaves Completo

> **Estado del documento:** Wireframes + specs visuales. NO incluye código de implementación.
> **Stack:** React + Tailwind CSS v4, mobile-first PWA, fondo oscuro stadium-blue con glass-morphism.
> **Audiencia del doc:** Implementadores (humanos o IA) que necesiten codear con fidelidad visual al sistema existente.

---

## 0. Exploración de dominio (antes de diseñar)

Antes de tocar una sola decisión, hacemos el viaje obligatorio por el mundo del producto. **No defaults**.

### 0.1 Domain — Conceptos del territorio

El usuario está viendo un Mundial de fútbol. Esto no es un dashboard genérico; es una **transmisión del deporte más popular del planeta** bajada a una PWA. Los conceptos del dominio son:

1. **Fixture / bracket** — El cuadro de llaves, dibujo sagrado del Mundial, casi reverencial. Pintado en pizarrones, en tapas de diario, en servilletas de bar.
2. **Corte / línea roja** — El momento bisagra donde 8 terceros sueñan y 4 quedan eliminados. La tensión dramática del ranking.
3. **Octavos, cuartos, semis, final** — Cada ronda es un capítulo con peso narrativo propio. No es "ronda 2", es **OCTAVOS**, palabra que vibra distinto.
4. **Definido / por definir (TBD)** — Estados narrativos antes que técnicos. "Aún no se define quién pasa" es una promesa, no un error.
5. **Televisación / broadcast** — El Mundial se mira, no se lee. Pensar en términos de "transmisión" (lower-thirds, scorebars, cronómetros) en lugar de "tabla de datos".
6. **Cancha de noche / stadium under floodlights** — Verde césped LED, contraste alto, jerseys saturados, drapeado sobre negro absoluto. El producto ya lleva este ADN (`--color-pitch-green: #00ff41`).
7. **Fixture parcial** — El Mundial se vive en el devenir. Los grupos se cierran, el bracket se va armando en vivo, los cruces se completan progresivamente. **El estado "TBD" no es un bug, es el punto del torneo donde estamos.**

### 0.2 Color world — Los colores del Mundial vistos de noche

Antes de inventar paleta, vamos al mundo:

- Verde LED de cancha (`#00FF41` ya está) — la línea de cal, el pasto iluminado.
- Celeste albiceleste de la pantalla (`#00E5FF` ya está) — la identidad del producto, el highlight de "definido".
- Oro de copa (`#FFD600` ya está) — el trofeo, los campeones, el tertiary. No solo "dorado", es **el metal que se le entrega al campeón**.
- Rojo de tarjeta y de alarma (`#FF2A2A` ya está) — la línea de corte, la eliminación, los penales fallados.
- **Gris pizarra de transmisión** (offscreen 4:3) — el color de los gráficos de ESPN/Fox cuando el partido no se ve, pero los datos sí. En el sistema esto es `bg-surface-container-low/40` y `border-white/5`.
- **Blanco linterna** (`#FFFFFF` para el texto principal) — el reflector en el jugador, la palabra en la pantalla cuando un gol cae.
- **Negro abismo del estadio** (`#000B14` ya está como `--color-background`) — el fondo de la cancha cuando las luces se apagan entre jugadas.

### 0.3 Signature — Un elemento que solo puede existir en ProdeAR

**La "línea de cal"** — un separador horizontal con gradiente `bg-gradient-to-r from-primary to-error` que aparece en 3 momentos clave:
1. Entre los 8 terceros clasificados y los 4 eliminados (la "línea de corte" que ya existe en `BestThirdsTable.tsx:119` con `border-b-2 border-b-error`).
2. Entre cada ronda del árbol (16vos → 8vos → 4tos → semis → final), como si fuera una línea pintada en el pasto de la cancha.
3. En el header del `GlassCard` cuando se va a abrir un modal de eliminación (en `Tournament.tsx:723` ya hay un `bg-gradient-to-r from-primary to-error` de 1px).

Esta firma visual es **la cancha pintada en la pantalla**, y es coherente con la metáfora stadium. Se mantiene siempre: 1px en headers de sección, 2px en cortes, 4px en momentos heroicos (gol, campeón).

### 0.4 Defaults a rechazar

| Default típico | Por qué lo rechazamos | Alternativa ProdeAR |
|---|---|---|
| Mostrar "Próximamente" en sub-pills vacías | Comunica "no hay nada", pero el usuario del Mundial quiere ver los terceros **ahora** | Terceros como **sección real** con datos en vivo, no tab deshabilitada |
| Árbol horizontal gigante con zoom y pan | Requiere JS de zoom/pan, accesibilidad rota, mobile imposible | Árbol **stepped vertical en mobile** (5 bloques), horizontal con scroll nativo en desktop |
| Mostrar todos los cruces vacíos hasta que se jueguen grupos | En el Mundial el bracket se va completando — el usuario quiere verlo **armándose** | Slots TBD visibles con stripes diagonales, animados a medida que se definen |
| Iconos decorativos de copa en cada card | Se vuelven wallpaper | Iconos solo en momentos heroicos: final, campeón, eliminado |
| Etiquetas planas "R32 · 1" | Pierde el dramatismo del "DIECISEISAVOS" | Usar `font-display-lg` con la palabra completa + número al lado en `font-stat-value` |

---

## 1. Reconocimiento del código existente

Antes de diseñar, mapeamos qué se reusa, qué se extiende, qué se crea de cero.

### 1.1 Lo que SE REUSA tal cual

| Componente / Hook | Ubicación | Rol en el nuevo diseño |
|---|---|---|
| `BestThirdsTable` | `src/components/tournament/BestThirdsTable.tsx` | **Se mantiene intacto**. Lo envuelve `ThirdPlacesLeagueSection`. |
| `LiveBadge` | `src/components/tournament/LiveBadge.tsx` | Sigue siendo el indicador rojo pulsante en slots y partidos live. |
| `GlassCard` | `src/components/ui/GlassCard.tsx` | Wrapper de tarjetas. Se usa en headers de ronda, separadores, y CTA vacío. |
| `PillTabs<T>` | `src/components/ui/PillTabs.tsx` | Para tabs internas de navegación entre rondas (si se decide mostrarlas). |
| `Material Symbols` (Outlined) | Global (icon font) | Iconografía consistente en todo el árbol. |
| `useStandings` | `src/hooks/useStandings.ts` | Ya detecta `format === 'groups'`. Se extiende para exponer `bestThirds` cuando aplique. |
| `useGroupStandings` | `src/hooks/useGroupStandings.ts` | Ya calcula `groupTables`. De ahí sale `bestThirds` y `bracket`. |
| `Match` (tipo) | `src/lib/types.ts:128` | Fuente de datos para partidos knockout. Ya tiene `stageName`, `status`, `homeTeam`, `awayTeam`, `homeScore`, `awayScore`, `predictedWinner`, `kickOff`. |
| `isKnockoutMatch` | `src/lib/worldCupGroups.ts:813` | Type guard ya implementado, detecta por `stageName`. |

### 1.2 Lo que SE EXTIENDE (sin romper)

| Componente | Extensión necesaria |
|---|---|
| `useStandings` | Agregar al `StandingsResult` (discriminado) la rama `format === 'groups'` con `bestThirds: BestThirdsTable` y `knockout: KnockoutTree` (ver §2.1). Sin tocar la rama `'league'`. |
| `Ligas.tsx` | Después del `CompetitionSelector`, cuando `result.format === 'groups'`, renderizar `<ThirdPlacesLeagueSection bestThirds={...} />` **antes** del primer grupo. Ver justificación en §1.2. |
| `KnockoutBracket.tsx` | Sigue existiendo como sub-componente de `BracketTree` (la "ronda R32" del árbol). No se rompe. Se reemplaza el grid plano por columnas que conectan. |
| `BestThirdsTable.tsx` | No se toca. Es un componente puro. |
| `CompetitionSelector` | No se toca. |

### 1.3 Lo que SE CREA de cero

Ver §3.

### 1.4 Por qué un wrapper y no re-implementar

`BestThirdsTable` ya tiene:
- La tabla con cortes, badges "CLASIFICA" / "Fuera", línea roja 8°→9°.
- Estados empty, loading, qualified/eliminated visualmente distintos.
- Animación de live pulse en grupos en juego.
- Accesibilidad (aria-label, contraste por texto además de color).

**Re-implementarlo sería un retroceso**. La estrategia correcta es un **wrapper contextual** (`ThirdPlacesLeagueSection`) que:
1. Suma un header de sección (eyebrow + título + subtítulo + leyenda contextual).
2. Suma una separación visual con `border-l-4 border-primary` (mismo patrón que `Tournament.tsx:661`).
3. Suma la posición correcta en `/ligas` (entre el `CompetitionSelector` y los grupos).
4. Suma una prop `variant: 'page' | 'panel'` para que pueda reusarse en otros lugares (ej. tab "POSICIONES" del torneo).
5. Mantiene `BestThirdsTable` como cuerpo sin cambios.

---

## 2. Wireframe Textual: Liga de Terceros en `/ligas`

### 2.1 Contexto y rol

Cuando el usuario entra a `/ligas` y selecciona el Mundial, hoy ve:
1. Badge "⚽ LIGAS" + h1 "Posiciones y Partidos".
2. `CompetitionSelector` (chips de competiciones).
3. (Loading state si aplica).
4. 12 grupos apilados, cada uno con su `GroupTable` + `GroupMatchesAccordion`.

**Lo que falta:** la **liga de terceros** es una vista del Mundial tan característica como la fase de grupos, y debería ser la **puerta de entrada emocional** al Mundial en esta pantalla, no un tab escondido en "POSICIONES" del torneo.

### 2.2 Posición estratégica (mobile-first)

```
┌─────────────────────────────────────────────┐
│  ⚽ LIGAS                                    │  ← header (existente)
│  Posiciones y Partidos                      │
│  Mirá las tablas y los partidos…            │
├─────────────────────────────────────────────┤
│  [Mundial 2026] [LPF] [Premier]  →          │  ← CompetitionSelector (existente)
├─────────────────────────────────────────────┤
│  MEJORES TERCEROS                  [?]      │  ← ★ NUEVO: ThirdPlacesLeagueSection
│  Los 8 mejores clasifican a 16vos           │
│  ╔═══════════════════════════════════════╗  │
│  ║  1°  GR  SELECCIÓN     PTS  DG  GF   ║  │
│  ║  1   C   🇫🇷 Francia      6  +2   4  ✓ ║  │  ← BestThirdsTable (envuelta)
│  ║  2   A   🇧🇷 Brasil       5  +1   3  ✓ ║  │
│  ║  …                                      ║  │
│  ║  8   H   🇲🇽 México       4   0   2  ✓ ║  │
│  ║  ════════════════════════════════════  ║  │  ← línea de corte
│  ║  9   D   🇩🇪 Alemania     3  -1   2  ✗ ║  │
│  ║  …                                      ║  │
│  ║  12  L   🇨🇳 China        1  -3   1  ✗ ║  │
│  ╚═══════════════════════════════════════╝  │
│  ● Clasifica a 16vos  ● Eliminado           │  ← leyenda
├─────────────────────────────────────────────┤
│  GRUPO A                                    │  ← grupos (existente)
│  [tabla de posiciones]                      │
│  [acordeón de partidos]                     │
├─────────────────────────────────────────────┤
│  GRUPO B                                    │
│  …                                          │
└─────────────────────────────────────────────┘
```

**Decisión clave:** la liga de terceros va **arriba de los grupos** (entre el `CompetitionSelector` y el primer grupo), no como tab interna. Razón:
- Es **la tabla más dramática del Mundial** (la línea roja, la tensión de clasificar). Ocultarla en un tab la diluye.
- Es **resumida**: 12 filas, cabe entera en pantalla en la mayoría de devices. No satura el scroll.
- Es **independiente del grupo que el usuario esté mirando**: muestra el estado agregado de los 12 grupos.
- El usuario que entra a `/ligas` y selecciona Mundial entiende el contexto **de un vistazo** sin tener que hacer click.

### 2.3 Header propio del bloque

```
┌─────────────────────────────────────────────┐
│ ┃ MEJORES TERCEROS                  [ayuda] │  ← border-l-4 primary + label
│ ┃                                           │
│ ┃ Los 8 mejores clasifican a 16vos de final │  ← subtitle
│ ┃                                           │
│ ┃ ⚽ 8 grupos ya finalizados                 │  ← status badge (opcional, si hay datos)
│ ┃ 4 grupos aún en juego                     │
└─────────────────────────────────────────────┘
```

**Tokens usados:**
- `border-l-4 border-primary pl-3` para la barra lateral (consistente con `Tournament.tsx:661`).
- `font-label-caps text-[10px] text-on-surface-variant font-bold tracking-widest uppercase` para el eyebrow.
- `font-headline-md text-base text-white uppercase tracking-wider` para el título (igual que `BestThirdsTable.tsx:56`).
- `font-body-md text-xs text-on-surface-variant` para el subtítulo.
- Botón "ayuda" con `material-symbols-outlined help` que abre un mini-modal con la explicación "¿Cómo se define un mejor tercero?".

**Status opcional (cuando hay partidos en vivo):**
- "8 grupos finalizados · 4 en juego" en un `LiveBadge` compact + texto. Indica al usuario que la tabla puede cambiar.
- Si todos los grupos finalizaron, se muestra un `PitchGreenBadge` "DEFINITIVO" con ícono `lock`.

### 2.4 Comportamiento de scroll

**Mobile (375px+):** bloque completo visible, sin tabs internas. Los 12 terceros caben en una tabla scrolleable horizontal si hace falta (overflow-x-auto en el contenedor de la tabla, ya existe en `BestThirdsTable.tsx:70`).

**Desktop (md+):** mismo layout, contenedor `max-w-2xl mx-auto` (consistente con el resto de la página).

**Comportamiento al cambiar de competición:**
- Si la competición seleccionada NO es formato `groups` (ej. LPF), la sección no se renderiza. Solo se muestra cuando `result.format === 'groups'`.
- Si se cambia del Mundial a la LPF mientras la sección está visible, hace un cross-fade con `animate-tab-enter` (150ms, ya existe en `index.css:591`).

### 2.5 Justificación arquitectónica

**Por qué no ponerlo como tab en `Ligas.tsx` con `PillTabs`:**
- Sería el mismo patrón que `PositionsView` en `Tournament.tsx`, pero ahí la "liga de terceros" complementa a las posiciones de grupo. En `/ligas`, **es la vista principal** de la copa.
- Un `PillTabs` entre "TERCEROS | GRUPOS" obliga a un click extra. En mobile eso es fricción.

**Por qué no re-implementar `BestThirdsTable` dentro del wrapper:**
- Re-implementar duplica 228 líneas de código (`BestThirdsTable.tsx` entero).
- Pierde las mejoras futuras (animaciones, accesibilidad, i18n) que se le hagan al original.
- El wrapper es ~40 líneas de header + composición, mucho más mantenible.

**Por qué arriba y no abajo:**
- Abajo del último grupo obliga a scrollear toda la fase de grupos. El usuario que solo quiere ver "si Argentina clasifica como tercero" se cansa.
- Arriba, el usuario ve primero el resumen, después puede profundizar en los grupos. **Pirámide invertida del periodismo deportivo**: lo más importante primero.

---

## 3. Wireframe Textual: Árbol de Llaves Completo

### 3.1 Estructura de datos esperada

Hoy `KnockoutBracket` solo tiene 16vos (`roundName: "Dieciseisavos de final"` + 16 matches). Necesitamos extender a 5 rondas.

**Tipo nuevo propuesto** (referencia, NO a codear aún):

```
KnockoutTree {
  competitionId: string;
  totalMatches: 31;            // 16 + 8 + 4 + 2 + 1
  rounds: [
    {
      roundId: "R32"           // Dieciseisavos
      roundName: "Dieciseisavos de final",
      shortName: "16VOS",
      matchesCount: 16,
      completedMatches: number,
      matches: BracketMatch[]
    },
    { roundId: "R16",  roundName: "Octavos de final",         shortName: "8VOS",  matchesCount: 8, ... },
    { roundId: "QF",   roundName: "Cuartos de final",         shortName: "4TOS",  matchesCount: 4, ... },
    { roundId: "SF",   roundName: "Semifinales",              shortName: "SEMIS", matchesCount: 2, ... },
    { roundId: "F",    roundName: "Final",                    shortName: "FINAL", matchesCount: 1, ... }
  ]
}
```

**Mapeo a `Match` actual (sin cambiar el backend):**
- `roundId` se infiere de `match.stageName` con un helper `getKnockoutRound(stageName)`: `"Dieciseisavos" → "R32"`, `"Octavos" → "R16"`, `"Cuartos" → "QF"`, `"Semifinal" → "SF"`, `"Final" → "F"`.
- `matches[].slotA.teamName` se llena con `match.homeTeam` cuando el partido ya tiene equipos resueltos; `null` si están TBD.
- `matches[].slotA.teamLogo` ← `match.homeLogo`.
- `matches[].scoreA / scoreB` ← `match.homeScore / awayScore` cuando `status === 'finished' | 'live'`.
- `matches[].winner` ← inferido del score o de `match.predictedWinner` (para penales).
- `matches[].status` ← `match.status` mapeado a `'pending' | 'live' | 'finished' | 'scheduled'`.
- `matches[].isLive` ← `match.status === 'live'`.
- `matches[].kickOff` ← `match.kickOff` (para mostrar fecha/hora del partido cuando no es live).

### 3.2 Layout MOBILE (375px+) — 5 rondas apiladas

```
┌─────────────────────────────────────────────┐
│ LLaves del Mundial                          │  ← header de la sección
│ 11 / 31 partidos definidos                  │  ← contador global
│ El bracket se arma en vivo                  │
├─────────────────────────────────────────────┤
│ DIEECISEISAVOS · 16VOS                      │  ← header de ronda 1
│ ▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱  8 / 16 definidos        │  ← progress bar de la ronda
│                                             │
│  [M1]  [M2]                                  │  ← grid 1 col en < 640px
│  [M3]  [M4]                                  │     grid 2 col en sm+
│  [M5]  [M6]                                  │
│  [M7]  [M8]                                  │
│  [M9]  [M10]                                 │
│  [M11] [M12]                                 │
│  [M13] [M14]                                 │
│  [M15] [M16]                                 │
│         │                                    │  ← conector vertical SVG
│         ▼                                    │
├─────────────────────────────────────────────┤
│ OCTAVOS · 8VOS                              │  ← header de ronda 2
│ ▰▰▱▱▱▱▱▱  2 / 8 definidos                 │
│                                             │
│  [M17] [M18]                                 │  ← grid 2 col
│  [M19] [M20]                                 │
│  [M21] [M22]                                 │
│  [M23] [M24]                                 │
│         │                                    │
│         ▼                                    │
├─────────────────────────────────────────────┤
│ CUARTOS · 4TOS                              │  ← header de ronda 3
│ ▰▱▱▱  1 / 4 definidos                      │
│                                             │
│  [M25] [M26]                                 │  ← grid 2 col
│  [M27] [M28]                                 │
│         │                                    │
│         ▼                                    │
├─────────────────────────────────────────────┤
│ SEMIFINALES · SEMIS                         │  ← header de ronda 4
│ ▱▱  0 / 2 definidos                        │
│                                             │
│  [M29]        [M30]                          │  ← grid 2 col (cards más anchas)
│         │                                    │
│         ▼                                    │
├─────────────────────────────────────────────┤
│            🏆 FINAL                          │  ← header de ronda 5 + ícono trofeo
│            ▱  0 / 1                         │
│                                             │
│              [M31]                           │  ← card centrada, más grande
│         "El campeón se define acá"          │
└─────────────────────────────────────────────┘
```

**Detalles por ronda en mobile:**

- **R32 (16vos)**: grid `grid-cols-1 sm:grid-cols-2 gap-2.5`. Cada card es una `BracketMatchCard` compacta (~280px de ancho en sm+, full width en mobile).
- **R16 (8vos)**: grid `grid-cols-1 sm:grid-cols-2 gap-3`. Cards un poco más anchas que R32 (más espacio para scores).
- **QF (4tos)**: grid `grid-cols-1 sm:grid-cols-2 gap-4`. Cards más grandes.
- **SF (semis)**: grid `grid-cols-1 sm:grid-cols-2 gap-5`. Cards con más padding, ícono `workspace_premium` (medalla de plata/bronce).
- **F (final)**: card centrada única, max-width `max-w-sm mx-auto`. Card con tratamiento hero:
  - Borde con gradiente `bg-gradient-to-r from-tertiary via-primary to-tertiary` (1px).
  - Glow `shadow-[0_0_30px_rgba(255,214,0,0.3)]` cuando el campeón está definido.
  - Ícono `emoji_events` de 32px en color `tertiary` arriba del nombre del campeón.
  - Subtítulo "CAMPEÓN DEL MUNDO" en `font-label-caps text-[10px] text-tertiary`.

**Conector entre rondas (mobile):**
- Una línea SVG vertical centrada (`<svg width="2" height="32">` con un `<line>` de color `border-white/10`).
- Aparece debajo del último match de la ronda, antes del header de la siguiente.
- Si la ronda anterior está completa, la línea brilla en `primary/40` (anticipa "se viene la próxima ronda").

### 3.3 Layout DESKTOP (lg+) — horizontal con scroll nativo

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ LLaves del Mundial                                                               │
│ 11 / 31 partidos definidos                                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ◄ scroll ►                                                                       │
│                                                                                  │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│ │ 16VOS   │  │ 8VOS    │  │ 4TOS    │  │ SEMIS   │  │  FINAL  │                 │
│ │ 8/16    │  │ 2/8     │  │ 1/4     │  │ 0/2     │  │  0/1    │                 │
│ │ ───     │  │ ───     │  │ ───     │  │ ───     │  │ 🏆     │                 │
│ │ [M1]   ├──┤ [M17]  ├──┤ [M25]  ├──┤ [M29]  ├──┤ [M31]                  │
│ │ [M2]   │  │ [M18]  │  │ [M26]  │  │ [M30]  │  │         │                 │
│ │ [M3]   ├──┤        │  │        │  │        │  │         │                 │
│ │ [M4]   │  │ [M19]  │  │ [M27]  ├──┤        │  │         │                 │
│ │ [M5]   ├──┤ [M20]  │  │ [M28]  │  │        │  │         │                 │
│ │ [M6]   │  │        │  │        │  │        │  │         │                 │
│ │ [M7]   ├──┤ [M21]  ├──┤        │  │        │  │         │                 │
│ │ [M8]   │  │ [M22]  │  │        │  │        │  │         │                 │
│ │ [M9]   ├──┤        │  │        │  │        │  │         │                 │
│ │ [M10]  │  │ [M23]  ├──┤        │  │        │  │         │                 │
│ │ [M11]  ├──┤ [M24]  │  │        │  │        │  │         │                 │
│ │ [M12]  │  │        │  │        │  │        │  │         │                 │
│ │ [M13]  ├──┤        │  │        │  │        │  │         │                 │
│ │ [M14]  │  │        │  │        │  │        │  │         │                 │
│ │ [M15]  ├──┤        │  │        │  │        │  │         │                 │
│ │ [M16]  │  │        │  │        │  │        │  │         │                 │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘                 │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Detalles del árbol horizontal desktop:**

- **Contenedor**: `flex gap-6 overflow-x-auto pb-4` con `snap-x snap-mandatory` para que el usuario haga scroll por ronda.
- **Cada ronda** = columna vertical con `min-w-[200px] sm:min-w-[240px] flex-shrink-0 snap-start`.
- **Las cards dentro de la columna** se distribuyen con spacing proporcional: en 8vos, cada card tiene `mt-[X]` calculado para alinearse con la mitad entre dos cards de 16vos. Esto se logra con CSS grid `grid-template-rows` o con paddings manuales.
- **Líneas conectoras SVG horizontales**: entre cada par de rondas adyacentes, una línea horizontal con un pequeño "codo" que va de la salida de una card a la entrada de la siguiente. Color: `stroke="rgba(255,255,255,0.1)"` en estado normal, `stroke="rgba(0,229,255,0.4)"` cuando el match de origen está completo.
- **Sticky round header**: en desktop el header de la ronda (con el progress bar y el nombre corto) se mantiene visible mientras se scrollea el contenedor. NO el header global de la página (eso queda arriba).
- **Ancho total estimado**: 5 columnas × 240px + 4 conectores × 24px = 1296px. **No entra en un viewport de 1280px** → scroll horizontal nativo con `overflow-x-auto`. Es la decisión correcta vs. un componente de zoom/pan custom (mala accesibilidad, mala performance).

**Por qué NO se hace zoom/pan:**
- Rompe la lectura secuencial.
- Imposible de navegar con teclado.
- El scroll horizontal nativo con `snap` es la solución estándar y accesible (WCAG 2.1 SC 2.1.1).

### 3.4 Detalle: cómo se ve un partido "completo" (definido, aún sin jugar)

Un partido "completo" = ambos slots resueltos (los dos equipos están definidos), pero el partido aún no se jugó.

```
┌─────────────────────────────────────────────┐
│ DIEECISEISAVOS · M5                19/06 16:00│  ← header de card
│                                             │
│ 🇧🇷 Brasil                                  │  ← slot A
│ 1° GRUPO A                                  │
│ ─────                                       │
│ 🇲🇽 México                                  │  ← slot B
│ 2° GRUPO B                                  │
│                                             │
│ ⏱ 19 de junio · 16:00                       │  ← kickoff
└─────────────────────────────────────────────┘
```

- Card: `bg-surface-container-low/40 border border-white/10 rounded-2xl p-3`.
- Cada slot: `flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-container-lowest/60 border border-white/5`.
- Logo: `w-5 h-5 object-contain`. Si no hay logo, `material-symbols-outlined flag text-[16px] text-on-surface-variant`.
- Label de origen: `font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-bold`. Ej. "1° GRUPO A".
- Nombre: `font-body-md text-xs text-white font-bold truncate`.
- Separador entre slots: `─────` línea con `border-t border-white/5` que cruza la card.
- Footer con kickoff: `font-body-md text-[10px] text-on-surface-variant/60`.
- Tag "DEFINIDO" en header: `font-label-caps text-[8px] text-pitch-green/60 uppercase tracking-widest font-bold` (igual que `KnockoutBracket.tsx:159`).

### 3.5 Detalle: cómo se ve un partido "pendiente" (TBD)

```
┌─────────────────────────────────────────────┐
│ DIEECISEISAVOS · M5                Pendiente │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← stripes diagonales TBD
│ ?  1° GRUPO A                  Por definir  │
│ ─────                                       │
│ ?  2° GRUPO B                  Por definir  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────┘
```

- Slot TBD: fondo con stripes diagonales. Implementación CSS:
  ```
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.02) 0px,
    rgba(255, 255, 255, 0.02) 8px,
    rgba(255, 255, 255, 0.05) 8px,
    rgba(255, 255, 255, 0.05) 16px
  );
  border: 1px dashed rgba(255, 255, 255, 0.1);
  ```
- Ícono: `material-symbols-outlined help text-[16px] text-on-surface-variant/40`.
- Texto label: `font-label-caps text-[9px] text-on-surface-variant/50 uppercase tracking-widest font-bold`.
- Texto "Por definir": `font-body-md text-xs text-on-surface-variant/40 truncate`.
- Card general: `opacity-70` (consistente con `KnockoutBracket.tsx:139`).
- Tag "Pendiente" en header: `font-label-caps text-[8px] text-on-surface-variant/50 uppercase tracking-widest`.

### 3.6 Detalle: cómo se ve un partido "live" (en juego)

```
┌─────────────────────────────────────────────┐
│ DIEECISEISAVOS · M5                🔴 67'    │  ← header con LiveBadge + minuto
│ ╔═════════════════════════════════════════╗ │  ← border error sutil
│ ║ 🇧🇷 Brasil                       2  ✓  ║ │  ← slot A, ganador
│ ║ 1° GRUPO A                              ║ │
│ ║ ─────                                   ║ │
│ ║ 🇲🇽 México                       1     ║ │  ← slot B
│ ║ 2° GRUPO B                              ║ │
│ ╚═════════════════════════════════════════╝ │
│ ⚽ 19 de junio · ESTADIO LUSAIL · TV: TyC   │
└─────────────────────────────────────────────┘
```

**Tokens específicos para live:**

- **Borde de la card**: `border-error/50` con `ring-1 ring-error/30` (consistente con `KnockoutBracket.tsx:75` que ya usa `ring-1 ring-error/40` para slots live).
- **Glow opcional**: `shadow-[0_0_20px_rgba(255,42,42,0.2)]` solo si la card está en viewport (para no quemar GPU constantemente).
- **Slot A con score**: `font-stat-value text-base font-black tabular-nums text-primary` (cuando va ganando) o `text-on-surface-variant/80` (cuando va perdiendo o empatando).
- **Slot B con score**: misma lógica, color según quién va ganando.
- **Indicador de ganador parcial**: al lado del score del equipo que va ganando, un `▸` chevron en `primary` o simplemente el score en `text-white` (vs `text-on-surface-variant/80` del perdedor). **Consistente con el patrón de `MatchMiniRow.tsx:166-188`**.
- **Header**: combina `LiveBadge` (default, no compact) + minuto. Formato: `[🔴 EN VIVO 67']` con el minuto en `font-stat-value text-base tabular-nums text-error`.
- **Animación de pulse del border**: `animate-live-pulse` (1.4s, ya existe en `index.css:716-729`).

### 3.7 Detalle: cómo se ve un partido "finalizado"

```
┌─────────────────────────────────────────────┐
│ DIEECISEISAVOS · M5                FINAL    │
│                                             │
│ 🇧🇷 Brasil                       2  ✓  ✓   │  ← ✓ verde = clasificado
│ 1° GRUPO A                                  │
│ ─────                                       │
│ 🇲🇽 México                       1         │  ← perdedor, atenuado
│ 2° GRUPO B                                  │
│                                             │
│ ⚽ FINAL · penalties 4-3                   │  ← si hubo penales
└─────────────────────────────────────────────┘
```

**Tokens específicos para finalizado:**

- **Card**: `border-white/10` (sin ring de live). Si el partido tuvo penales, `border-error/30` (la línea roja, los penales son drama).
- **Slot del ganador**: `bg-pitch-green/5 border-pitch-green/30`. Nombre en `text-white font-black`. Score en `text-pitch-green font-black`. Marca `✓` a la derecha del score con `material-symbols-outlined check text-pitch-green text-[14px]`.
- **Slot del perdedor**: `bg-surface-container-lowest/30 opacity-70`. Nombre en `text-on-surface-variant`. Score en `text-on-surface-variant`.
- **Tag "FINAL" en header**: `font-label-caps text-[8px] text-on-surface-variant uppercase tracking-widest`.
- **Penales (si aplica)**: debajo del score, una línea adicional `font-label-caps text-[9px] text-error font-bold tracking-widest` con texto `(4-3) PEN` y un ícono `sports_score` o `gavel` (8px). Solo aparece si `match.predictedWinner` está definido y el score está empatado.
- **Sin animación**: ningún pulse. Card estática.

### 3.8 Detalle: header de cada ronda

```
┌─────────────────────────────────────────────┐
│ ⚽ DIEECISEISAVOS DE FINAL                  │  ← nombre completo + ícono
│ DIEECISEISAVOS · 16VOS                      │  ← (opcional) short name
│ 8 / 16 definidos                            │  ← contador
│ ▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱  50%                     │  ← progress bar
└─────────────────────────────────────────────┘
```

**Componentes del header de ronda:**

- **Borde superior de 1px** con gradiente `bg-gradient-to-r from-primary to-error` (la "línea de cal" del signature). Omitir en la primera ronda.
- **Nombre de la ronda**: `font-headline-md text-base md:text-lg text-white uppercase tracking-wider font-black`.
  - "DIECISEISAVOS DE FINAL" (R32) → 22 chars
  - "OCTAVOS DE FINAL" (R16) → 17 chars
  - "CUARTOS DE FINAL" (QF) → 16 chars
  - "SEMIFINALES" (SF) → 12 chars
  - "FINAL" (F) → 5 chars (con tratamiento hero: ícono `emoji_events` color `tertiary`)
- **Contador**: `font-stat-value text-sm text-primary tabular-nums font-black` para el número, `font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest` para el sufijo "definidos".
- **Progress bar**: contenedor `h-1 bg-white/5 rounded-full overflow-hidden`, fill `h-full bg-gradient-to-r from-primary to-pitch-green` con ancho proporcional al % de completitud. Si 0%, la barra no se muestra (ruido visual). Si 100%, la barra brilla con `shadow-[0_0_8px_rgba(0,229,255,0.5)]`.
- **Espaciado**: `mb-4` entre el header y la primera card de la ronda.

### 3.9 Espaciado y ritmo vertical

| Ronda | Mobile (mb entre rondas) | Desktop |
|---|---|---|
| R32 → R16 | 32px (conector SVG 24px + 4px margen) | 16px (gap del flex) |
| R16 → QF | 32px | 16px |
| QF → SF | 40px (semis son "más grandes") | 20px |
| SF → F | 56px (final es el clímax) | 24px |

El espaciado crece a medida que nos acercamos a la final, creando una **pirámide visual** que termina en la final. Es la metáfora stadium: la cancha se va cerrando hasta quedar un solo partido.

---

## 4. Componentes a crear

Lista con propósito, contrato (props) y referencia a lo que se reusa.

### 4.1 `ThirdPlacesLeagueSection.tsx`

**Ubicación:** `src/components/tournament/ThirdPlacesLeagueSection.tsx`

**Propósito:** Wrapper de `BestThirdsTable` que le agrega contexto, header, leyenda y posición estratégica. Es lo que se renderiza en `/ligas` cuando la competición es formato `groups`.

**Props:**

```
interface ThirdPlacesLeagueSectionProps {
  bestThirds: BestThirdsTable;
  /** Cantidad de grupos ya finalizados (para status contextual) */
  groupsFinished: number;
  /** Cantidad de grupos aún en juego */
  groupsInPlay: number;
  /** Variante: 'page' (en /ligas, ancho completo) | 'panel' (dentro de un tab) */
  variant?: "page" | "panel";
  /** Callback cuando el usuario quiere ver detalle de un tercero (futuro) */
  onTeamClick?: (teamName: string) => void;
}
```

**Estructura interna:**
- Header con border-l-4 primary (eyebrow + título + subtítulo).
- Status badge contextual ("X grupos finalizados · Y en juego").
- `BestThirdsTable` (componente actual, sin modificar).
- Leyenda propia (la que ya trae `BestThirdsTable` se puede ocultar con prop o se duplica — recomendación: dejar la de `BestThirdsTable` y no duplicar).
- CTA opcional "Ver detalle de cómo se decide" que abre un mini-modal explicativo.

**Reusa:** `BestThirdsTable`, `LiveBadge`, `GlassCard`.

### 4.2 `BracketTree.tsx`

**Ubicación:** `src/components/tournament/BracketTree.tsx`

**Propósito:** Contenedor principal del árbol completo. Decide si renderiza layout mobile (vertical apilado) o desktop (horizontal con scroll) según el viewport.

**Props:**

```
interface BracketTreeProps {
  tree: KnockoutTree;
  /** Callback cuando el usuario hace click en un partido */
  onMatchClick?: (matchId: string) => void;
  /** Callback cuando el usuario hace click en un equipo (futuro) */
  onTeamClick?: (teamName: string) => void;
  /** Estado de loading (skeleton) */
  isLoading?: boolean;
  /** Estado de error */
  error?: Error | null;
}
```

**Estructura interna:**
- Header global: título "Llaves del Mundial" + contador global "X / 31 partidos definidos" + subtítulo.
- En `md+`: contenedor `flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory`.
- En `<md`: contenedor `flex flex-col gap-8`.
- Mapea `tree.rounds` → renderiza un `BracketRoundColumn` por ronda.
- Entre rondas adyacentes, renderiza un `BracketConnector` (SVG).

**Reusa:** `LiveBadge` para partidos live, patrones de `KnockoutBracket.tsx`.

### 4.3 `BracketRoundColumn.tsx`

**Ubicación:** `src/components/tournament/BracketRoundColumn.tsx`

**Propósito:** Renderiza una ronda entera (header + grid de matches). En mobile es un bloque vertical; en desktop es una columna horizontal con snap.

**Props:**

```
interface BracketRoundColumnProps {
  round: KnockoutRound;
  layout: "stacked" | "horizontal";
  onMatchClick?: (matchId: string) => void;
  onTeamClick?: (teamName: string) => void;
}
```

**Estructura interna:**
- Header de ronda: nombre + contador + progress bar.
- Grid de matches: número de columnas según la ronda.
  - R32 (16): 1 col mobile, 2 col sm, 3 col md, 4 col lg.
  - R16 (8): 1 col mobile, 2 col sm, 3 col md.
  - QF (4): 1 col mobile, 2 col sm.
  - SF (2): 1 col mobile, 2 col sm.
  - F (1): max-w-sm mx-auto, sin grid.
- **Espaciado vertical entre cards en desktop** (para alinear con la mitad de la ronda anterior): cada card de R16 tiene `mt-[calc(50%+Xpx)]` donde X se calcula según el tamaño de card. Esto se puede hacer con CSS grid de `grid-template-rows` con filas de tamaño variable, o con un wrapper de padding.

**Reusa:** `BracketMatchCard` (nuevo, ver §4.4).

### 4.4 `BracketMatchCard.tsx`

**Ubicación:** `src/components/tournament/BracketMatchCard.tsx`

**Propósito:** Card individual de un partido del árbol. Reemplaza la `MatchCard` interna de `KnockoutBracket.tsx` (que se mantiene como sub-componente legado o se refactoriza). Tiene 5 estados visuales: pending, partial, complete, live, finished.

**Props:**

```
interface BracketMatchCardProps {
  match: BracketMatchView;  // tipo "enriquecido" con score, status, kickOff
  variant?: "compact" | "default" | "hero";  // compact para R32, default para 8vos/4tos/semis, hero para final
  onClick?: (matchId: string) => void;
  onTeamClick?: (teamName: string) => void;
}
```

**Estados visuales (mapeo a clases Tailwind):**

| Estado | Borde | Slot A | Slot B | Header tag |
|---|---|---|---|---|
| `pending` (ambos TBD) | `border-dashed border-white/5` opacity-70 | stripes TBD | stripes TBD | "Pendiente" |
| `partial` (un slot TBD) | `border-white/5` opacity-70 | stripes TBD o normal | stripes TBD o normal | "Pendiente" |
| `complete` (ambos definidos, no jugado) | `border-white/10` | normal | normal | "Definido" verde |
| `live` | `border-error/50 ring-1 ring-error/30` | normal + live | normal + live | LiveBadge + minuto |
| `finished` (sin penales) | `border-white/10` | ganador con `bg-pitch-green/5 border-pitch-green/30` + ✓ | perdedor atenuado | "FINAL" |
| `finished` (con penales) | `border-error/30` | ganador | perdedor | "FINAL · PEN" |

**Variantes:**
- `compact`: padding `p-2.5`, font del nombre `text-xs`, logo `w-4 h-4`, slots `py-1.5`. Usado en R32.
- `default`: padding `p-3`, font del nombre `text-sm`, logo `w-5 h-5`, slots `py-2`. Usado en R16, QF, SF.
- `hero`: padding `p-4`, font del nombre `text-base`, logo `w-7 h-7`, slots `py-2.5`, ícono `emoji_events` arriba si hay campeón. Usado solo en F.

**Reusa:** patrón de `KnockoutBracket.tsx:127-179` (MatchCard interno), `LiveBadge`, `useLiveMinute` (si la card es live, opcional).

### 4.5 `BracketConnector.tsx`

**Ubicación:** `src/components/tournament/BracketConnector.tsx`

**Propósito:** Renderiza las líneas SVG que conectan rondas. Dos variantes: vertical (mobile) y horizontal con codo (desktop).

**Props:**

```
interface BracketConnectorProps {
  orientation: "vertical" | "horizontal-elbow";
  /** Cuántos matches de la ronda anterior alimentan a esta ronda */
  sourceCount: number;
  /** Cuántos matches de esta ronda reciben */
  targetCount: number;
  /** Si los matches de la ronda anterior están todos completos */
  sourceIsComplete?: boolean;
  /** Color del trazo (default: border-white/10) */
  strokeColor?: string;
  /** Alto del SVG (vertical) o ancho (horizontal) en px */
  size?: number;
}
```

**Implementación:**

- **Vertical (mobile)**: SVG simple de 2px de ancho × N px de alto con un `<line>` vertical centrado. Sin "codo" porque en mobile las rondas están apiladas y la conexión es solo "esta ronda alimenta la próxima".
- **Horizontal con codo (desktop)**: SVG más complejo. Para cada match target, dibuja:
  1. Una línea horizontal que sale del centro vertical del match origen.
  2. Un codo (curva o ángulo recto) que baja al medio entre los dos matches target.
  3. Una línea horizontal que entra al match target.
  
  Color del trazo: `stroke="rgba(255,255,255,0.1)"` por defecto. Si `sourceIsComplete`: `stroke="rgba(0,229,255,0.4)"` con un `filter="drop-shadow(0 0 2px rgba(0,229,255,0.5))"`.

**Detalle técnico del SVG horizontal:**

El SVG se posiciona **entre las dos columnas de rondas**, no absoluto sobre ellas. Esto evita problemas de z-index y de resize. Cada `BracketConnector` es un flex item entre dos `BracketRoundColumn`.

```svg
<!-- Pseudocódigo visual del SVG horizontal entre R32 y R16 -->
<svg width="24" height="500" viewBox="0 0 24 500">
  <!-- Para cada par (M_source, M_target): -->
  <path d="M0,Y_source L12,Y_source L12,Y_target L24,Y_target" 
        stroke="rgba(255,255,255,0.1)" 
        stroke-width="1" 
        fill="none" />
</svg>
```

Donde `Y_source` e `Y_target` son las coordenadas Y (relativas al SVG) del centro vertical de cada match. Esto se calcula con una fórmula:
- `Y_source_i = cardHeight * (i * 2 + 0.5) + gap * i` (asumiendo que cada card de origen alimenta a 1 de cada 2 cards target).
- `Y_target_j = cardHeight * (j + 0.5) + gap * j` (en la ronda target hay `sourceCount/2` cards).

Para que esto funcione bien, el alto de card y el gap entre cards dentro de una ronda deben ser **constantes y conocidos** en CSS. Se documenta en el componente: `cardHeight: 96px`, `cardGap: 16px` (estos valores pueden ser ajustables por prop, pero los defaults son los del sistema).

### 4.6 `EmptyBracketState.tsx`

**Ubicación:** `src/components/tournament/EmptyBracketState.tsx`

**Propósito:** Estado vacío cuando aún no hay datos de partidos knockout (fase de grupos no comenzó o el Mundial aún no tiene cruces).

**Props:**

```
interface EmptyBracketStateProps {
  /** Mensaje contextual ("Aún no hay cruces definidos" vs "Los cruces se arman cuando termine la fase de grupos") */
  variant: "no-data" | "waiting-groups" | "waiting-round";
  /** Ronda a la que se hace referencia (solo para variant='waiting-round') */
  roundName?: string;
}
```

**Visual:**

- `GlassCard glow` con padding generoso `py-12 px-6`.
- Ícono `sports_soccer` o `sports_score` (32px) con `stadium-glow-celeste`.
- Título en `font-headline-md text-base text-white uppercase tracking-tight`.
- Descripción en `font-body-md text-sm text-on-surface-variant max-w-xs mx-auto`.
- CTA opcional "Ir a fase de grupos" (botón con `bg-primary/10 border border-primary/20`).

**Variantes de mensaje:**

- `no-data`: "El Mundial aún no tiene cruces definidos" + ícono `lock_clock`.
- `waiting-groups`: "Los cruces se arman cuando termine la fase de grupos" + ícono `hourglass` + CTA.
- `waiting-round`: "Los partidos de [Nombre Ronda] se juegan a partir del [fecha]" + ícono `event` + countdown opcional (futuro).

### 4.7 Hook `useKnockoutTree` (opcional pero recomendado)

**Ubicación:** `src/hooks/useKnockoutTree.ts`

**Propósito:** Toma la lista plana de `Match[]` de `useMatches` y devuelve un `KnockoutTree` con 5 rondas ya estructuradas. Encapsula el parsing de `stageName` y la agrupación.

**Firma:**

```
function useKnockoutTree(matches: Match[] | undefined): {
  tree: KnockoutTree | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Lógica interna:**

1. Filtra `matches` con `isKnockoutMatch(matches[i])`.
2. Para cada match, deriva `roundId` con un helper `getKnockoutRoundId(stageName)`.
3. Agrupa por `roundId` → 5 grupos.
4. Por cada grupo, ordena los matches por `kickOff` (los que se juegan antes, arriba).
5. Enriquece cada match a `BracketMatchView` (slots, score, status, kickOff, predictedWinner).
6. Calcula `completedMatches` por ronda y global.
7. Retorna `KnockoutTree`.

Este hook se usa en `BracketTree.tsx` y en cualquier otro lugar donde se necesite el árbol (futuro: pantalla de detalle de pronóstico, share, etc.).

### 4.8 Diagrama de dependencias

```
Ligas.tsx
  └─ ThirdPlacesLeagueSection
       └─ BestThirdsTable (existente, sin cambios)
       └─ LiveBadge (existente)

Tournament.tsx (tab "POSICIONES" → "LLAVES")
  └─ PositionsView (existente, extendido)
       └─ BracketTree  ← reemplaza KnockoutBracket directo
            └─ BracketRoundColumn (×5)
            │    └─ BracketMatchCard (×31)
            └─ BracketConnector (×4)
            └─ EmptyBracketState (condicional)
            └─ useKnockoutTree (hook)
```

---

## 5. Tokens visuales a usar

Todos los valores ya están en el sistema. No se agregan nuevos tokens; se combinan los existentes.

### 5.1 Border radius

| Elemento | Clase | Notas |
|---|---|---|
| `BracketMatchCard` | `rounded-2xl` (16px) | Consistente con `GroupTable`, `MatchCard` |
| `BracketMatchCard` slots internos | `rounded-xl` (12px) | Concéntrico: outer 16px - padding 4px = 12px |
| `BracketRoundColumn` header | `rounded-2xl` | |
| `BracketConnector` SVG | N/A (path) | |
| Badges "DEFINIDO" / "PENDIENTE" | `rounded-full` | Consistente con todos los badges del sistema |
| Botón CTA final | `rounded-2xl` | |
| Líneas divisorias de slot | N/A (border-t) | `border-t border-white/5` |

### 5.2 Colores (semánticos)

| Concepto | Token | Notas |
|---|---|---|
| Campeón (final) | `text-tertiary` `#FFD600` + glow `shadow-[0_0_30px_rgba(255,214,0,0.3)]` | |
| Slot definido / clasificado | `border-pitch-green/30 bg-pitch-green/5` + texto `text-pitch-green` | Reusar patrón de `BestThirdsTable.tsx:111-129` |
| Ganador de partido | `text-pitch-green font-black` + ícono `check` | Reusar patrón de `MatchMiniRow.tsx:166-188` |
| Perdedor / eliminado | `text-on-surface-variant opacity-70` | Reusar patrón de `BestThirdsTable.tsx:112` |
| Live (en juego) | `border-error/50 ring-1 ring-error/30` + `text-error` para badge | Reusar `KnockoutBracket.tsx:75` |
| Penales (drama) | `border-error/30` + texto `text-error` con `sports_score` | |
| Slot TBD | stripes `rgba(255,255,255,0.02)/rgba(255,255,255,0.05)` + `border-dashed border-white/10` | Nuevo, pero sigue la estética de los stripes existentes |
| Línea de cal (signature) | `bg-gradient-to-r from-primary to-error` 1-2px | |
| Conector SVG completo | `stroke="rgba(0,229,255,0.4)"` con `drop-shadow` cyan | |
| Conector SVG pendiente | `stroke="rgba(255,255,255,0.1)"` | |

### 5.3 Iconografía Material Symbols (Outlined)

| Concepto | Ícono | Tamaño | Color |
|---|---|---|---|
| Fútbol general (empty) | `sports_soccer` | 32px | `text-primary` con `stadium-glow-celeste` |
| Trofeo (final) | `emoji_events` | 32px | `text-tertiary` con glow |
| Medalla semifinal | `military_tech` | 20px | `text-on-surface-variant` |
| Medalla cuarto | `workspace_premium` | 20px | `text-on-surface-variant` |
| Ganador (check) | `check` | 14px | `text-pitch-green` |
| Perdedor (x) | `close` | 14px | `text-error/60` |
| Pendiente / TBD | `help` | 16px | `text-on-surface-variant/40` |
| Live (badge) | `circle` (con animate-live-pulse) | 6px | `bg-error` |
| Penales | `sports_score` o `gavel` | 10px | `text-error` |
| TV (broadcaster) | `live_tv` | 12px | `text-primary` |
| Lock (definitivo) | `lock` | 12px | `text-pitch-green` |
| Hourglass (esperando) | `hourglass_empty` | 24px | `text-on-surface-variant/60` |
| Flecha conectora | `chevron_right` | 14px | `text-on-surface-variant/40` (opcional, decorativo) |

### 5.4 Animaciones

Todas las animaciones ya existen en `src/index.css`. Se documenta cuándo aplicar cada una:

| Animación | Cuándo | Archivo |
|---|---|---|
| `animate-enter` (fadeInSlideUp 0.35s) | Mount inicial del árbol completo | `index.css:250-252` |
| `animate-tab-enter` (150ms) | Cambio de ronda seleccionada (si se usan tabs internas) | `index.css:580-592` |
| `animate-live-pulse` (1.4s infinite) | Punto rojo de `LiveBadge`, slots live | `index.css:716-729` |
| `animate-rank-up` (800ms) | Cuando un slot TBD se define y "sube" en el orden de aparición (raro, opcional) | `index.css:732-748` |
| `animate-pill-pulse` (600ms) | Cuando el contador "X/16 definidos" incrementa | `index.css:595-608` |
| `slide-saved-burst` (800ms) | Después de guardar un pronóstico en un match del árbol | `index.css:296-317` |
| `goalImpact` + `goalExit` (0.3s + 0.5s) | Si el usuario está mirando un match del árbol y entra un gol | `index.css:423-456` |

**Para el árbol se agregan dos animaciones nuevas** (a definir en `index.css` con `@keyframes` y expuestas como utility classes):

1. **`animate-slot-reveal`** (350ms ease-out): cuando un slot TBD pasa a tener equipo, hace un fade-in + slight scale-up.
   ```
   @keyframes slotReveal {
     from { opacity: 0; transform: scale(0.96); }
     to { opacity: 1; transform: scale(1); }
   }
   ```

2. **`animate-round-pulse`** (1.2s, one-shot): cuando una ronda se completa (todos los matches finalizados), un pulso de glow en el header de la ronda.
   ```
   @keyframes roundPulse {
     0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4); }
     100% { box-shadow: 0 0 0 20px rgba(0, 229, 255, 0); }
   }
   ```

3. **`animate-champion-reveal`** (1.5s con `ease-out-spring`): cuando se define el campeón del mundo. La card de la final hace un glow dorado expansivo + el trofeo hace un `scale(0)` → `scale(1.15)` → `scale(1)` con bounce. **Es el momento más emocional del Mundial**, vale la pena la animación.
   ```
   @keyframes championReveal {
     0% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0); }
     50% { box-shadow: 0 0 0 30px rgba(255, 214, 0, 0.4); }
     100% { box-shadow: 0 0 30px 10px rgba(255, 214, 0, 0.3); }
   }
   ```

**Importante:** todas las animaciones nuevas deben respetar `prefers-reduced-motion: reduce` con duración 0.15s linear (patrón ya establecido en `index.css:786-838`).

### 5.5 Sombras y elevaciones

| Elemento | Sombra |
|---|---|
| `BracketMatchCard` default | (ninguna, solo border) |
| `BracketMatchCard` live | `shadow-[0_0_20px_rgba(255,42,42,0.2)]` |
| `BracketMatchCard` hover (desktop) | `shadow-[0_0_15px_rgba(0,229,255,0.15)]` + border `white/20` |
| `BracketMatchCard` final (con campeón) | `shadow-[0_0_30px_rgba(255,214,0,0.3)]` |
| Round header cuando completa | `shadow-[0_0_8px_rgba(0,229,255,0.5)]` en la progress bar |
| GlassCard (wrapper de sección) | el ya existente `celestial-glow` cuando lleva `glow` prop |

### 5.6 Tipografía

| Elemento | Clase | Notas |
|---|---|---|
| Título de sección "LLAVES DEL MUNDIAL" | `font-headline-md text-xl md:text-2xl text-white uppercase tracking-wider font-black` | Consistente con headers de otras secciones |
| Subtítulo de sección | `font-body-md text-xs text-on-surface-variant` | |
| Nombre de ronda (R32, R16…) | `font-headline-md text-base md:text-lg text-white uppercase tracking-wider font-black` | |
| Short name de ronda (16VOS) | `font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold` | |
| Contador "X/Y" | `font-stat-value text-sm text-primary tabular-nums font-black` | |
| Slot label (origen: "1° GRUPO A") | `font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest font-bold` | Reusar `KnockoutBracket.tsx:115` |
| Slot nombre equipo | `font-body-md text-xs text-white font-bold truncate` | Reusar `KnockoutBracket.tsx:118` |
| Score en slot | `font-stat-value text-base font-black tabular-nums` (color según ganador) | Reusar `MatchMiniRow.tsx:74-79` |
| Tag header card ("DEFINIDO", "FINAL", "PENDIENTE") | `font-label-caps text-[8px] uppercase tracking-widest font-bold` | Reusar `KnockoutBracket.tsx:159` |
| Minuto en live | `font-stat-value text-sm tabular-nums text-error font-black` | |
| Penales | `font-label-caps text-[9px] text-error font-bold tracking-widest` | |
| Empty state título | `font-headline-md text-base text-white uppercase tracking-tight` | Reusar patrón existente |
| Empty state descripción | `font-body-md text-sm text-on-surface-variant max-w-xs mx-auto` | Reusar patrón existente |

---

## 6. Especificación de estados por componente

Para CADA componente nuevo, los 7 estados canónicos:

### 6.1 `ThirdPlacesLeagueSection`

| Estado | Cuándo | Visual |
|---|---|---|
| **Empty** | `bestThirds.standings.length === 0` (no hay terceros) | Mensaje centrado con ícono `sports_soccer` + texto "Esperando que se jueguen partidos de la fase de grupos". Mismo patrón que `BestThirdsTable.tsx:39-49`. |
| **Loading** | `isLoading === true` | Skeleton: bloque con `shimmer-bg` que imita la tabla (12 filas, 6 columnas). Sin header propio (asumimos que el header de la página ya da contexto). |
| **Partial** | Hay 1-11 terceros definidos | Render normal de `BestThirdsTable` con los datos disponibles. El componente ya soporta esto sin cambios. |
| **Complete** | 12 terceros definidos | Render normal. La línea de corte 8°→9° se muestra con más énfasis (`shadow-[0_0_8px_rgba(255,42,42,0.4)]`). |
| **Live** | Al menos un grupo con partidos en vivo | `BestThirdsTable` ya muestra el `LiveBadge` en las filas correspondientes. El wrapper agrega un status badge "X grupos en juego" arriba. |
| **Finished (definitivo)** | Los 12 grupos finalizaron, tabla estable | Tag `lock DEFINITIVO` en `pitch-green` al lado del status. |
| **Error** | `error !== null` | `GlassCard` con ícono `error`, texto "No se pudieron cargar los terceros", botón "Reintentar". |

### 6.2 `BracketTree`

| Estado | Cuándo | Visual |
|---|---|---|
| **Empty** | `tree.rounds.every(r => r.matches.length === 0)` | Renderiza `EmptyBracketState variant="no-data"`. |
| **Loading** | `isLoading === true` | Skeleton: 5 bloques con `shimmer-bg` imitando headers de ronda + grids de cards. Sin SVG conectores. |
| **Partial** | Algunas rondas tienen matches, otras no | Render normal; las rondas vacías se ocultan (no se renderiza su header). Las que están en juego muestran progress bar parcial. |
| **Complete** | Todas las rondas tienen matches | Render normal. |
| **Live** | Al menos un match en cualquier ronda está `live` | Render normal; los `BracketMatchCard` correspondientes ya tienen el ring de error. El header global muestra un contador "🔴 X en vivo". |
| **Finished** | El último match del árbol (la final) está `finished` | Render normal. La card de la final entra en estado "hero" con el `animate-champion-reveal`. |
| **Error** | `error !== null` | `GlassCard` con ícono `cloud_off` + texto + botón reintentar. |

### 6.3 `BracketMatchCard`

| Estado | Cuándo | Visual |
|---|---|---|
| **Empty** | N/A (siempre hay al menos un slot) | No aplica. |
| **Loading** | N/A (la card se renderiza con datos; el loading es del padre) | No aplica. |
| **Partial** | `match.status === 'scheduled'` y solo un slot resuelto | Bordes atenuados, slot TBD con stripes, tag "Pendiente". |
| **Complete** | `match.status === 'scheduled'` y ambos slots resueltos | Bordes normales, slots con nombre+logo, tag "DEFINIDO" en `pitch-green/60`. |
| **Live** | `match.status === 'live'` | Borde `error/50`, ring `error/30`, slots con score parcial, header con `LiveBadge` + minuto. |
| **Finished** | `match.status === 'finished'` | Slots con score final, ganador destacado, perdedor atenuado, tag "FINAL" (o "FINAL · PEN" si penales). |
| **Error** | N/A (la card no tiene estado de error propio) | No aplica. Si el partido no existe en la lista, simplemente no se renderiza. |

### 6.4 `BracketConnector`

| Estado | Cuándo | Visual |
|---|---|---|
| **Empty** | N/A (siempre hay source y target) | No aplica. |
| **Pending** | `sourceIsComplete === false` | Stroke `rgba(255,255,255,0.1)`, sin glow. |
| **Active** | `sourceIsComplete === true` | Stroke `rgba(0,229,255,0.4)`, drop-shadow cyan. |
| **Loading/Error** | N/A | No aplica. |

### 6.5 `EmptyBracketState`

| Estado | Cuándo | Visual |
|---|---|---|
| **no-data** | Sin matches knockout | Ícono `lock_clock` + "El Mundial aún no tiene cruces definidos". |
| **waiting-groups** | Hay estructura pero los grupos no terminaron | Ícono `hourglass_empty` + "Los cruces se arman cuando termine la fase de grupos" + CTA "Ver fase de grupos". |
| **waiting-round** | La ronda actual no comenzó | Ícono `event` + "Los [Ronda] se juegan a partir del [fecha]". |

---

## 7. Accesibilidad

### 7.1 WCAG AA mínimo

- **Contraste texto/fondo:** todos los textos pasan AA en sus estados normales.
  - `text-on-surface` (#FFFFFF) sobre `bg-surface-container-low` (#000F1A) → ratio 18.5:1 ✓
  - `text-on-surface-variant` (#94A3B8) sobre `bg-surface-container-low` (#000F1A) → ratio 9.3:1 ✓
  - `text-pitch-green` (#00FF41) sobre `bg-pitch-green/5` (#000F1A con tinte verde) → ratio 17.1:1 ✓
  - `text-tertiary` (#FFD600) sobre `bg-surface-container-low` → ratio 14.8:1 ✓
  - `text-error` (#FF2A2A) sobre `bg-surface-container-low` → ratio 5.1:1 ✓ (AA, no AAA)
- **No información solo por color:** todos los estados (clasificado, eliminado, live, definido) tienen texto o ícono además del color. Reusar patrón de `BestThirdsTable.tsx:185-205` (badges con ícono check/close).

### 7.2 ARIA

- **`BracketTree`** tiene `role="tree"` (estructura jerárquica) con `aria-label="Llaves del Mundial"`.
- **`BracketRoundColumn`** tiene `role="treeitem"` con `aria-level="1"`, `aria-label="Octavos de final, 2 de 8 definidos"`, `aria-expanded` (si la ronda es colapsable en mobile).
- **`BracketMatchCard`** tiene `role="treeitem"` con `aria-level="2"`, `aria-label` descriptivo: `"Dieciseisavos, partido 5: Brasil vs México, programado para 19 de junio a las 16:00"`.
- **Slots** tienen `aria-label` propio: `"Equipo A: Brasil, primero del grupo A"` / `"Equipo B: pendiente, segundo del grupo B"`.
- **Live regions**: el contador "X / Y definidos" tiene `aria-live="polite"` para que screen readers anuncien cambios cuando se actualiza. El estado del partido (live → finished) se anuncia con `aria-live="assertive"` (es información urgente).
- **Progress bars** de cada ronda tienen `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax={matchesCount}`, `aria-label="Progreso de la ronda"`.

### 7.3 Navegación por teclado

- **Tab order**: header → progress bars (no focuseables) → cards de R32 → cards de R16 → cards de QF → cards de SF → card de Final.
- **Cada `BracketMatchCard` focuseable** (`<button>` o `tabIndex={0}`) con foco visible: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- **Atajos** (futuro, opcional):
  - `1` → scroll a R32.
  - `2` → scroll a R16.
  - `3` → scroll a QF.
  - `4` → scroll a SF.
  - `5` → scroll a Final.
  - `j/k` → siguiente/anterior card dentro de la ronda enfocada.
  - `Enter` → abrir `MatchSheet` del partido enfocado.

### 7.4 Lectura de pantalla del árbol

La estructura jerárquica debe ser explícita:

```
Llaves del Mundial, 11 de 31 partidos definidos
  Dieciseisavos de final, 8 de 16 definidos
    Partido 1: Francia vs Argentina, definido
    Partido 2: Brasil vs México, en vivo minuto 67
    ...
  Octavos de final, 2 de 8 definidos
    Partido 17: Francia vs Brasil, programado para 5 de julio
    ...
  ...
  Final
    Partido 31: pendiente
```

### 7.5 Touch targets

- Toda `BracketMatchCard` tiene `min-h-[44px]` (consistente con el principio de `make-interfaces-feel-better` skill: mínimo 40×40px, llevamos a 44×44px para ser generosos).
- Los slots dentro de la card son tappeables independientemente y tienen `min-h-[44px]` cada uno.
- Los badges e íconos pequeños (check, help, etc.) son **decorativos**: se ocultan con `aria-hidden="true"`. La información está en el texto adyacente.

### 7.6 Reduced motion

Todas las animaciones nuevas (§5.4) respetan `@media (prefers-reduced-motion: reduce)` con duración 0.15s linear (patrón de `index.css:786-838`).

---

## 8. Interacción

### 8.1 Tap en un partido

**Comportamiento:** abre el `MatchSheet` con el detalle del partido (eventos, stats, formaciones, predicciones del torneo). Mismo patrón que `MatchCard` en `MatchMiniRow.tsx:127`.

**Detalle mobile:** el sheet se desliza desde abajo (`bottom-sheet-enter` 350ms, ya existe en `index.css:273-275`). El usuario puede scrollear el árbol detrás.

**Detalle desktop (md+):** el sheet aparece como modal centrado con `sheetFadeScale` 280ms (ya existe en `index.css:284-293`).

**Manejo del scroll lock:** al abrir el sheet, el body no debe scrollear. Esto ya está manejado en `MatchSheet` (asumimos; verificar implementación).

### 8.2 Tap en un equipo (dentro de un slot)

**Comportamiento:** navega al perfil del equipo (futuro). Por ahora, NO implementado — solo se loguea el evento en analytics. La card entera ya es tappeable, así que el tap en un slot específicamente NO abre nada (el click se delega al contenedor).

**Decisión:** mantener el tap en el slot = tap en la card para evitar comportamientos inesperados. El "long press" puede ser el lugar para opciones contextuales por equipo (ver §8.3).

### 8.3 Long press

**Comportamiento:** NO implementado en esta fase. Reservado para futuro.

**Comportamiento futuro (opcional):** al mantener presionado un partido, mostrar un menú contextual con:
- "Copiar enlace del partido" (deep link al `MatchSheet`).
- "Ver perfil del equipo A" / "Ver perfil del equipo B" (futuro).
- "Reportar error" (link a soporte).

**Justificación de NO implementarlo ahora:** long press es discoverability-poor. Si se necesita, se prefiere un `...` button visible en la card (desktop) o un swipe gesture (mobile) con affordance visible.

### 8.4 Haptic feedback

**Cuándo vibrar (usando `navigator.vibrate` cuando esté disponible):**

| Momento | Patrón | Justificación |
|---|---|---|
| Slot TBD → definido (live update) | `vibrate(20)` (un pulso corto) | Feedback sutil de "pasó algo" |
| Match live → finished | `vibrate([30, 50, 30])` (doble pulso) | El partido que estabas mirando terminó |
| Click en partido | NO haptic | El `active:scale-[0.96]` ya da feedback visual |
| Campeón definido | `vibrate([100, 50, 100, 50, 200])` (celebración) | El momento más emocional |
| Error de carga | `vibrate([50, 30, 50])` (alerta) | Algo falló |

**Implementación:** wrapper `useHaptic()` hook que wrappea `navigator.vibrate` con fallback silencioso. Solo se invoca si `navigator.vibrate` existe (PWA en mobile, no en desktop). Respeta `prefers-reduced-motion` también (si está activo, NO haptic).

### 8.5 Gestos adicionales

- **Swipe left/right en mobile (entre rondas)**: no necesario porque el árbol en mobile es vertical (apilado, no scrollea horizontalmente). En desktop el scroll horizontal es nativo.
- **Pinch-to-zoom**: NO soportado. No tiene sentido en este layout.
- **Pull-to-refresh**: el feed de partidos (`useMatches`) se refresca con `refetch()` de React Query, no con pull-to-refresh. Si en el futuro se quiere, se integra con `react-query-refresh-on-pull` o similar.

---

## 9. Plan de implementación sugerido

Orden de ejecución, priorizando valor al usuario y minimizando regresiones:

### Fase 1 — `ThirdPlacesLeagueSection` (valor alto, riesgo bajo)

1. Crear `ThirdPlacesLeagueSection.tsx` con header + `BestThirdsTable` envuelto.
2. Extender `useStandings` para exponer `bestThirds` cuando `format === 'groups'`.
3. Modificar `Ligas.tsx` para renderizar la sección cuando aplica.
4. Tests: renderiza cuando es Mundial, no renderiza cuando es LPF, estado empty, leyenda.
5. **Output:** los usuarios de `/ligas` ven la liga de terceros arriba de los grupos del Mundial.

### Fase 2 — `useKnockoutTree` hook (lógica pura, sin UI)

1. Crear el tipo `KnockoutTree` y `BracketMatchView` en `src/lib/worldCupGroups.ts` (o archivo nuevo).
2. Crear `src/hooks/useKnockoutTree.ts` con la lógica de agrupación y enriquecimiento.
3. Tests unitarios: 31 matches → 5 rondas correctas, orden por kickOff, scores, predictedWinner.
4. **Output:** la lógica de armado del árbol está probada y lista para usarse en cualquier componente.

### Fase 3 — `BracketMatchCard` (componente base)

1. Crear `BracketMatchCard.tsx` con los 5 estados visuales + 3 variantes.
2. Reusar patrón de `MatchCard` interno de `KnockoutBracket.tsx`.
3. Tests: cada estado renderiza correctamente, accesibilidad, contraste.
4. **Output:** un componente robusto, testeado, listo para componer.

### Fase 4 — `BracketRoundColumn` + `BracketTree` (composición)

1. Crear `BracketRoundColumn.tsx` con header + grid.
2. Crear `BracketTree.tsx` con layout mobile/desktop + responsive switch.
3. Decidir si se reemplaza el uso directo de `KnockoutBracket` en `PositionsView.tsx` o se mantiene el antiguo como fallback.
4. **Output:** el árbol completo renderiza en pantalla.

### Fase 5 — `BracketConnector` (SVG lines)

1. Crear `BracketConnector.tsx` con las dos variantes (vertical y horizontal con codo).
2. Insertar entre rondas.
3. Tests visuales: el SVG conecta correctamente, el responsive funciona.
4. **Output:** el árbol tiene líneas conectoras como un bracket tradicional.

### Fase 6 — `EmptyBracketState` + estados

1. Crear `EmptyBracketState.tsx`.
2. Integrar en `BracketTree` para los estados empty/error.
3. **Output:** el árbol maneja todos los estados gracefully.

### Fase 7 — Polish

1. Animaciones nuevas (`slot-reveal`, `round-pulse`, `champion-reveal`).
2. Haptic feedback.
3. Reduced motion.
4. Onboarding tour actualizado.
5. Documentación en Storybook (si existe) o MDX.

### Fase 8 — Telemetry & A/B

1. Analytics: contar clicks en cards, clicks en slots, taps en headers de ronda, scrolls horizontales.
2. Medir tiempo hasta que el usuario encuentre un partido específico.
3. A/B test: árbol vertical mobile vs. tabs de ronda.

---

## 10. Resumen ejecutivo

**Qué se entrega:**

- `ThirdPlacesLeagueSection`: una sección wrapper que lleva la Liga de Terceros (ya construida) a la pantalla `/ligas` del Mundial, en posición protagonista (arriba de los grupos).
- `BracketTree` + 5 sub-componentes: el árbol completo de llaves (16vos → 8vos → 4tos → semis → final) con líneas conectoras SVG, layout mobile (5 bloques apilados) y desktop (horizontal con scroll nativo).
- Hook `useKnockoutTree` que encapsula la lógica de agrupación y enriquecimiento.
- `EmptyBracketState` para manejar los casos sin datos.
- Estados visuales definidos para los 7 estados canónicos por componente.
- Accesibilidad WCAG AA con roles ARIA, navegación por teclado y touch targets de 44×44px.
- Interacción con haptic feedback para momentos clave (slot definido, campeón, error).
- Animaciones nuevas que respetan `prefers-reduced-motion`.

**Qué NO se entrega (fuera de scope):**

- Zoom/pan del árbol (rechazado por accesibilidad).
- Perfil de equipo por tap (futuro).
- Long press contextual (futuro).
- Notificaciones push cuando un slot se define (futuro).
- Bracket oficial FIFA 2026 con cruces específicos entre grupos (la spec actual usa una versión pedagógica; se documenta en `worldCupGroups.ts:1070-1099`).

**Firma visual:** la "línea de cal" (`bg-gradient-to-r from-primary to-error`) aparece en 3 momentos clave: separador de rondas, línea de corte de la liga de terceros, y header de modales de eliminación. Es la cancha pintada en la pantalla.

**Token estrella:** la `shadow-[0_0_30px_rgba(255,214,0,0.3)]` en la final con el `animate-champion-reveal` es el momento más emocional del producto. Vale la pulgada cuadrada de diseño que cuesta.

---

*Fin del documento.*
