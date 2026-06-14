# Match Bottom Sheet — Especificación UX/UI
**Subagente:** `@uxui-designer` · **Proyecto:** ProdeAR · **Versión:** 1.0
**Estética rectora:** _Stadium Broadcast_ — la pantalla de TV del partido que cabe en tu bolsillo.

---

## 0. TL;DR (para el orquestador)

**Veredicto:** ✅ **Aprobar el approach del usuario con tres correcciones críticas**.

El insight de hacer un **carrusel horizontal de predicciones por torneo** es excelente y desbloquea el caso multi-torneo en mobile sin necesidad de scroll vertical largo. Sin embargo, el approach tiene tres riesgos de diseño si se implementa literal:

1. **El header "más grande" sin contexto pierde impacto.** No alcanza con escalar el score; tiene que haber una **sección de estado + score + equipos con jerarquía clara de 3 niveles**, no solo tipografía grande.
2. **El carrusel como pieza única puede fallar en los bordes.** Con 0 torneos o 1 solo torneo se rompe la metáfora. Hay que tener un **fallback declarativo**.
3. **El sheet se va a hacer largo.** Predicciones + header + secciones de info pueden superar 100vh. Se necesita una **arquitectura de scroll por tabs internos** o **secciones colapsables**, no "scroll vertical único".

**Ideas extra a incluir en v1 (sin sobrecargar):**
- ✅ Mini-timeline de eventos debajo del header (live only)
- ✅ Indicador de puntos ganados por torneo (finished only)
- ✅ Sticky save bar en el bottom del sheet
- ✅ H2H mini (últimos 5 partidos) — opcional
- ❌ Diferir a v2: formaciones completas, stats detalladas, notas personales, simulador de posiciones

**Roadmap de implementación:** 3 fases, ~1 sprint cada una. Ver §12.

---

## 1. Dirección de diseño

### 1.1 Concepto: "Stadium Broadcast"

La estética del sheet debe sentirse como **la toma cerrada del partido** en una transmisión deportiva. No es una card expandida, es **el modo "te acercaste al televisor"**.

**Referencias implícitas:** pantalla gigante de estadio (scoreboard LED), HUD de transmisión de fútbol, apps tipo SofaScore / FotMob pero con la impronta celestial/albiceleste de ProdeAR.

### 1.2 Tokens y dominio

| Elemento | Token | Hex | Uso en el sheet |
|---|---|---|---|
| Predicción / acción | `primary` | `#00e5ff` | Botón save, slide activo, score pronosticado, focos |
| Estado / urgencia | `tertiary` | `#ffd600` | "AMISTOSO" / "FINAL" / badge de fase, countdown |
| Live / error | `error` | `#ff2a2a` | "67'", "EN VIVO", perdiendo, gol del rival |
| Acierto / gol | `pitch-green` | `#00ff41` | Score winner highlighted, "MARCADOR EXACTO", goles |
| Neutro | `on-surface-variant` | `#94a3b8` | Texto secundario, metadata |
| Superficie | `surface-container-high` | `#001e33` | Fondo de cards internas |

### 1.3 Principios de craft aplicados

- **Concentric border radius:** sheet `rounded-t-3xl` (24px) → cards internas `rounded-2xl` (16px) → inputs `rounded-xl` (12px). Siempre `outer = inner + padding`.
- **Optical over geometric:** los logos van centrados ópticamente, no con `items-center` rígido (un escudo con forma de gota se ve bajo si lo centrás geométricamente).
- **Shadows over borders:** `shadow-[0_-8px_32px_rgba(0,0,0,0.4)]` ya existe en BottomSheet. Sumar `shadow-[0_0_40px_rgba(0,229,255,0.08)]` muy sutil en el header cuando está _live_.
- **Tabular numbers:** todos los scores y puntos usan `tabular-nums` para evitar layout shift al cambiar.
- **Interruptible animations:** transiciones CSS (no keyframes bloqueantes) en cambios de slide, edit score, etc.
- **Split & stagger enter:** al abrir el sheet, header → carrusel → secciones se animan con delay 80–120ms.
- **No `transition: all`:** especificar `transition-[background-color,border-color,transform]`.
- **Scale on press 0.96** (nunca menos) en todos los botones interactivos.
- **Font smoothing:** `antialiased` ya está en el body vía Tailwind base. Sumar `text-wrap: balance` en headings y `text-wrap: pretty` en párrafos.

### 1.4 Lo que el sheet NO debe ser

- ❌ Una versión más grande de la MatchCard (es otra cosa: una superficie de **edición + lectura profunda**).
- ❌ Un modal con tabs (sería desktop-pensado, no mobile-first).
- ❌ Un accordion infinito (imposible de descubrir).
- ❌ Una página nueva que reemplaza la navegación (rompe el flujo de scroll de la lista).

---

## 2. Validación del approach del usuario

### 2.1 Lo que funciona

✅ **Carrusel multi-torneo** = pieza central del sheet. Resuelve elegantemente el dolor del usuario que participa en 3+ torneos del mismo partido. Un slide por torneo, cada uno editable independientemente.

✅ **Header más grande que la card** = el sheet debe sentirse "premium" en su primer golpe de vista. Scoreboard gigante es el ancla visual.

✅ **Reutilización del BottomSheet primitive** = respeta el design system, evita divergencia.

### 2.2 Lo que falta o se rompe

⚠️ **Falta definir qué pasa con el sheet en los 3 estados terminales del partido:**
- _upcoming_: el sheet se centra en la edición de predicciones. El score real es "—".
- _live_: el header es el protagonista (minuto, score en tiempo real, eventos). El carrusel está bloqueado, no se puede editar.
- _finished_: el score real es el protagonista. El carrusel muestra puntos ganados por torneo.

⚠️ **Falta definir la arquitectura de scroll** (más detalle en §3.3):
- Si el sheet tiene header (200px) + carrusel (200px) + secciones de info (eventos, stats, H2H = 500px+), el scroll vertical único se vuelve agotador en mobile.
- Necesita **scroll con secciones claramente delimitadas** o **tabs internos**.

⚠️ **Falta definir el patrón de autosave:**
- Opción A: autosave con debounce 800ms (más mágico pero menos control)
- Opción B: botón "Guardar" por slide + indicador de cambios sin guardar (más explícito)
- **Recomendación: híbrido** — el score se autosavea con debounce, el ganador de penales requiere confirmación explícita (porque es una decisión binaria crítica).

### 2.3 Decisiones que tomé sin preguntar (justifico abajo)

| Decisión | Justificación |
|---|---|
| Score con `font-stat-value text-5xl md:text-6xl` | Teko a 48–60px en mobile es impactante pero no rompe el sheet en 320px. |
| Logos a 64px (vs 32-40px en card) | Doble de tamaño = 4× área visual. Equilibra con el score sin que se vea forzado. |
| 1 slide visible + peek del siguiente (16px) | Es el patrón estándar de discovery de carruseles en mobile (Apple, Netflix, etc.). No usar dots-only ni peek-extremo. |
| Dots indicator debajo del carrusel | Combina con el peek para crear affordance clara. |
| Header "sticky" (no desaparece al scrollear) | El score y el estado son la referencia constante. El carrusel y las secciones scrollean debajo. |
| Tabs internos: _Predicciones_ / _Info_ / _Eventos_ | Cuando hay >3 secciones de info, tabs internos evitan el scroll infinito. Ver §3.3. |
| Sticky save bar en el bottom | Cuando el sheet scrollea, el usuario no debería perder de vista el "Guardar". |

---

## 3. Wireframes detallados

### 3.1 HEADER — `MatchSheetHeader`

#### Proporciones concretas (mobile 320-420px)

| Elemento | Mobile | Desktop (≥768px) | Token |
|---|---|---|---|
| Logos equipos | `w-16 h-16` (64px) | `w-20 h-20` (80px) | contenedor circular con outline `ring-1 ring-white/10` |
| Score (Teko) | `text-5xl` (48px) | `text-6xl` (60px) | `font-stat-value font-black tabular-nums` |
| Nombre equipos | `text-sm font-bold uppercase` | `text-base font-bold uppercase` | `font-headline-md text-white tracking-wider` |
| Estado badge | `text-[10px] font-black uppercase` | `text-xs font-black uppercase` | `font-label-caps` |
| Separador ":" | `text-xl text-on-surface-variant/40` | `text-2xl` | mismo tamaño relativo que en card |
| Competición label | `text-[10px] font-bold uppercase tracking-widest` | `text-xs` | `font-label-caps text-on-surface-variant` |
| TV / Estadio | `text-[9px] font-bold uppercase` | `text-[10px]` | `font-label-caps text-secondary bg-white/5 px-2 py-0.5 rounded-full` |
| Minuto live | `text-2xl font-black tabular-nums text-error` | `text-3xl` | `font-stat-value` con `animate-pulse` en el dot |

#### Colores del score según contexto

| Estado del partido | Home score | Away score | Ganador highlight |
|---|---|---|---|
| **upcoming** (no started) | `text-on-surface/30` (gris) | `text-on-surface/30` | ninguno (son "—") |
| **live** — gana home | `text-primary text-glowing` | `text-white` | glow cyan |
| **live** — gana away | `text-white` | `text-primary text-glowing` | glow cyan |
| **live** — empate | `text-white` | `text-white` | ninguno |
| **finished** — gana home | `text-primary` | `text-white/70` | sin glow (es pasado) |
| **finished** — gana away | `text-white/70` | `text-primary` | sin glow |
| **finished** — empate | `text-white` | `text-white` | ninguno |
| **cancelled/postponed** | `text-on-surface/30 line-through` | `text-on-surface/30` | "SUSP" en gris |

#### Wireframe ASCII — HEADER (estado UPCOMING, 360px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════════╗    │
│  ║  [logo]                          [logo]              ║    │
│  ║   64                              64                 ║    │
│  ║                                                      ║    │
│  ║  ARGENTINA        — : —        BRASIL                ║    │
│  ║  (text-sm)                       (text-sm)           ║    │
│  ║                                                      ║    │
│  ║          ⏰ 21:00 · 2h 15min                          ║    │
│  ║          Copa del Mundo · Cuartos de Final          ║    │
│  ║          📺 TyC Sports  🏟 Lusail                    ║    │
│  ╚══════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────┘
```

#### Wireframe ASCII — HEADER (estado LIVE, 360px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════════╗    │
│  ║  [logo]                          [logo]              ║    │
│  ║   64                              64                 ║    │
│  ║                                                      ║    │
│  ║  ARGENTINA        1 : 2         BRASIL   ◀ glowing  ║    │
│  ║  (text-sm)        (text-5xl)    (text-sm)            ║    │
│  ║                                                      ║    │
│  ║  🔴 67' EN VIVO  ·  ⚽ Gol Messi 45'+2              ║    │
│  ║  Copa del Mundo · Cuartos de Final                  ║    │
│  ║  📺 TyC Sports                                      ║    │
│  ╚══════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────┘
```

#### Wireframe ASCII — HEADER (estado FINISHED, 360px viewport)

```
┌──────────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════════╗    │
│  ║  [logo]                          [logo]              ║    │
│  ║   64                              64                 ║    │
│  ║                                                      ║    │
│  ║  ARGENTINA        1 : 2 ✓       BRASIL   ◀ cyan     ║    │
│  ║  (text-sm)        (text-5xl)    (text-sm)            ║    │
│  ║                                                      ║    │
│  ║  FIN  ·  1.578.234 pronósticos en el torneo          ║    │
│  ║  Copa del Mundo · Cuartos de Final                  ║    │
│  ║  📺 TyC Sports  🏟 Lusail                           ║    │
│  ╚══════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────┘
```

#### Estructura JSX (referencia)

```tsx
<header className="relative px-6 pt-4 pb-5 border-b border-white/5">
  {/* Línea de estado superior */}
  <div className="flex items-center justify-between mb-3">
    <MatchStatusBadge status={match.status} minute={liveMinute} />
    {match.tvChannel && (
      <span className="font-label-caps text-[9px] text-secondary font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
        📺 {match.tvChannel}
      </span>
    )}
  </div>

  {/* Matchup central */}
  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
    {/* Home */}
    <div className="flex flex-col items-center gap-2 min-w-0">
      <TeamLogo src={match.homeLogo} name={match.homeTeam} size="md" redCards={homeRedCount} />
      <span className="font-headline-md text-sm font-bold text-white uppercase tracking-wider truncate max-w-full text-center">
        {translateTeamName(match.homeTeam)}
      </span>
    </div>

    {/* Score */}
    <div className="flex flex-col items-center gap-1 px-2">
      <span className={`font-stat-value text-5xl font-black tabular-nums leading-none ${
        isLive && isHomeWinning ? "text-primary text-glowing" :
        isLive && isAwayWinning ? "text-white" :
        isFinished && isHomeWinning ? "text-primary" :
        "text-white"
      }`}>{match.homeScore ?? "—"}</span>
      <span className="text-on-surface-variant/30 text-xs font-bold">:</span>
      <span className={`font-stat-value text-5xl font-black tabular-nums leading-none ${
        isLive && isAwayWinning ? "text-primary text-glowing" :
        isLive && isHomeWinning ? "text-white" :
        isFinished && isAwayWinning ? "text-primary" :
        "text-white"
      }`}>{match.awayScore ?? "—"}</span>
    </div>

    {/* Away */}
    <div className="flex flex-col items-center gap-2 min-w-0">
      <TeamLogo src={match.awayLogo} name={match.awayTeam} size="md" redCards={awayRedCount} />
      <span className="font-headline-md text-sm font-bold text-white uppercase tracking-wider truncate max-w-full text-center">
        {translateTeamName(match.awayTeam)}
      </span>
    </div>
  </div>

  {/* Competición + estadio */}
  <div className="flex flex-col items-center gap-1 mt-3 pt-3 border-t border-white/5">
    <p className="font-label-caps text-[10px] text-tertiary font-bold tracking-widest uppercase flex items-center gap-1.5">
      <span className="material-symbols-outlined text-xs">emoji_events</span>
      {competitionLabel}
    </p>
    {match.stadium && (
      <p className="text-[9px] text-on-surface-variant/70 italic">
        🏟 {match.stadium}
      </p>
    )}
  </div>
</header>
```

> **Nota de implementación:** el `MatchStatusBadge` debe ser un sub-componente reutilizable que se usa también en `MatchStatusBar` y `LiveMatchRow`, evitando tres implementaciones divergentes del "67' / FIN / SUSP" pill.

---

### 3.2 CARRUSEL DE PREDICCIONES — `MatchPredictionsCarousel`

#### Concepto

Un **carrusel horizontal swipeable** donde cada slide representa un torneo distinto en el que el usuario pronosticó (o puede pronosticar) este partido. El slide activo es **editable** (si el partido no está locked); los demás son **preview**.

#### Dimensiones y patrón de scroll

| Parámetro | Valor | Justificación |
|---|---|---|
| Slides visibles | 1 completo + peek del siguiente (~16-24px) | Patrón discovery estándar mobile |
| Snap | `snap-x snap-mandatory` con `scroll-snap-align: start` | Snapping a slides completos, sin posición intermedia |
| Gap entre slides | `gap-3` (12px) en mobile, `gap-4` (16px) en tablet | Aire suficiente para que el peek sea claro pero no exagerado |
| Padding horizontal | `px-6` (24px) en cada lado | El primer slide arranca a 24px del borde; permite que el handle del sheet se vea |
| Scrollbar | `hide-scrollbar` utility class (ya existe) | Sin barra visible; dots indicator es la única affordance de scroll |
| Touch target dots | `w-10 h-10` contenedor de `w-2 h-2` dot (40×40px hit area) | Cumplir WCAG 2.5.5 |

#### Indicador de navegación: dots

```
   ●  ●  ○  ○  ○     ← 2/5 activo (los demás son inactivos tenues)
   ^  ^
   |  |_ slide 2 (activo) — color primary con glow
   |____ slide 1 (visto) — color white/40
```

**Comportamiento:**
- 1 slide: no se muestran dots
- 2-7 slides: dots simples
- 8+ slides: dots simples (no scroll infinito, no flechas)
- Slide activo: `w-6 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,229,255,0.6)]`
- Slide inactivo: `w-1.5 h-1.5 bg-white/30 rounded-full`
- Hit area extendida con pseudo-elemento a 40×40px

#### Estructura interna de un slide (1 slide detallado)

```
┌────────────────────────────────────────────────────────┐  ← slide (full width - peek)
│                                                        │
│  ┌─ Header del slide ─────────────────────────────────┐│
│  │ [emoji_events] PRODE DE LA OFICINA         [•••]   ││  ← nombre del torneo + overflow menu
│  │ Liga Profesional · Fecha 14 · Multiplicador x1    ││  ← metadata del torneo en este partido
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌─ Score Pronosticado ──────────────────────────────┐ │
│  │                                                    │ │
│  │  ARG             ┌────┐  :  ┌────┐             BRA │ │  ← stepper con team logos flanqueando
│  │  [logo]          │ -  │     │ -  │         [logo] │ │
│  │  32px            └────┘     └────┘           32px  │ │
│  │                                                    │ │
│  │              [-] 1 [+]       [-] 0 [+]              │ │  ← stepper
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Footer del slide ────────────────────────────────┐ │
│  │ 💡 Si acertás el marcador exacto: +10 pts         │ │  ← hint contextual (solo upcoming)
│  │ ⏱ Cierra en 2h 15min                              │ │  ← countdown solo si <24h
│  │ [toggle] 🔔 Recordarme cuando empiece             │ │  ← notificación toggle
│  └────────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
   ←── peek (16-24px) ──→ │
                          └─ siguiente slide (parcialmente visible)
```

#### Estados del slide

| Estado | Border | Background | Interactivo | Highlight |
|---|---|---|---|---|
| **Activo editable** | `border-primary/40` + `celestial-glow` | `bg-surface-container-high` | ✅ sí | Borde con glow cyan |
| **Adyacente (peek)** | `border-white/5` | `bg-surface-container/40` | ❌ no | Sin glow |
| **Locked (live/finished)** | `border-white/5` | `bg-surface-container/30 opacity-60` | ❌ no | Opacidad 60% |
| **Saving** | `border-primary animate-pulse` | mismo que activo | ❌ no | Pulse en el borde |
| **Saved** | `border-pitch-green/30` | `bg-pitch-green/5` | ❌ no | Mini check (✓) en corner |
| **Dirty (cambios sin guardar)** | `border-tertiary/40` | mismo que activo | ✅ sí | Borde ámbar + dot pulsante en corner |
| **Empty (no pronosticado aún)** | `border-white/5 border-dashed` | `bg-surface-container/20` | ✅ sí | Dashed border, "—" en inputs |

#### Wireframe ASCII — CARRUSEL con 3 slides, 360px viewport

```
┌──────────────────────────────────────────────────────────────┐
│  TUS PRONÓSTICOS (3 torneos)                  [edit-all]    │
│                                                              │
│  ┌────────────────────────────────────────────────┐  ┌─────┐│
│  │  🏆 PRODE DE LA OFICINA              [•••]    │  │PROD ││
│  │  Liga · Fecha 14 · x1                          │  │E DE ││
│  │  ───────────────────────────────────────────   │  │LOS  ││
│  │  [ARG]   - 1 +   :   - 0 +   [BRA]            │  │AMIG ││
│  │  ───────────────────────────────────────────   │  │OS   ││
│  │  💡 Marcador exacto: +10 pts                   │  │     ││
│  │  ⏱ Cierra en 2h 15min                          │  │ peek││
│  │  🔔 Recordarme                          [●━━]  │  └─────┘│
│  └────────────────────────────────────────────────┘         │
│                                                              │
│          ●━━ ●  ○                                            │  ← dots indicator
│          ^  ^  ^                                            │
│          |  |  |__ slide 3 (inactivo)                        │
│          |  |_____ slide 2 (visto)                          │
│          |________ slide 1 (activo, glow cyan)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Wireframe ASCII — CARRUSEL ESTADO LIVE (locked, no editable)

```
┌──────────────────────────────────────────────────────────────┐
│  TUS PRONÓSTICOS (3 torneos)            🔒 Cerrado          │
│                                                              │
│  ┌────────────────────────────────────────────────┐  ┌─────┐│
│  │  🏆 PRODE DE LA OFICINA              [•••]    │  │     ││
│  │  📍 Resultado real: 1 - 2                       │  │peek ││
│  │  ───────────────────────────────────────────   │  │     ││
│  │       [ARG]   1 - 0   [BRA]   ← tu predicción  │  │     ││
│  │  ───────────────────────────────────────────   │  │     ││
│  │  ❌ Resultado Básico — 0 pts                   │  │     ││
│  │  Tu predicción: ARGENTINA ganó (✓)            │  │     ││
│  └────────────────────────────────────────────────┘         │
│                                                              │
│          ●  ●  ○                                             │
└──────────────────────────────────────────────────────────────┘
```

#### Wireframe ASCII — CARRUSEL ESTADO FINISHED (con puntos por slide)

```
┌──────────────────────────────────────────────────────────────┐
│  TUS PRONÓSTICOS (3 torneos)            Σ 28 puntos          │
│                                                              │
│  ┌────────────────────────────────────────────────┐  ┌─────┐│
│  │  🏆 PRODE DE LA OFICINA              [•••]    │  │     ││
│  │  📍 Resultado: ARG 1 - 2 BRA                  │  │peek ││
│  │  ───────────────────────────────────────────   │  │     ││
│  │       [ARG]   1 - 0   [BRA]   ← tu predicción  │  │     ││
│  │  ───────────────────────────────────────────   │  │     ││
│  │  ⚽ Resultado Básico     +3 pts  (x1)          │  │     ││
│  │                                                  │  │     ││
│  │  ┌────────────┐                                 │  │     ││
│  │  │ +3 pts ⚽  │ ← badge grande con glow verde   │  │     ││
│  │  └────────────┘                                 │  │     ││
│  └────────────────────────────────────────────────┘         │
│                                                              │
│          ●  ●  ○                                             │
└──────────────────────────────────────────────────────────────┘
```

#### Detalle del stepper (lo más importante del slide)

```
       [-]  ┌────┐  [+]      ← botones - y +
            │ 1  │            ← input number
       ─────┴────┴─────
              ↑
       w-14 h-14 (56px)     ← ≥44px hit area
       font-stat-value text-2xl font-black
       bg-white text-neutral-900
       border border-white/10 rounded-xl
       focus:ring-2 focus:ring-primary/40
```

**Comportamiento del stepper:**
- Tap en `+`: incrementa con bounce (scale 0.96 → 1.0 en 120ms)
- Tap en `-`: decrementa con bounce
- Long press (≥400ms): repeat cada 80ms (aceleración para llegar rápido a 5-0)
- Cambia el valor: el input pulsa brevemente con `ring-pitch-green/40` (200ms)
- Sin foco: muestra el número en `bg-white text-neutral-900` (alto contraste)
- Con foco: ring primary aparece
- Disabled (locked): `bg-neutral-800 text-white/50 cursor-not-allowed`

#### Autosave vs save explícito (decisión híbrida recomendada)

**Score (goles):** autosave con debounce 600ms. Mientras tipea, no se guarda. Cuando deja de tocar por 600ms, se persiste.

**Ganador de penales (playoffs con empate):** require tap explícito en uno de los dos botones. Es una decisión binaria, no incremental. Autosave instantáneo al tocar.

**Feedback de save (toast/inline):**
- Saving: `border-primary animate-pulse` en el slide + spinner inline en el footer del slide
- Saved: `border-pitch-green/30` + ✓ en corner del slide, dura 1.5s y vuelve a normal
- Error: shake horizontal del slide (200ms × 3 oscilaciones) + toast con mensaje

#### Empty state: 0 predicciones registradas

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  TUS PRONÓSTICOS                                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │            [edit_note icon, 48px, dim]                 │  │
│  │                                                        │  │
│  │     TODAVÍA NO PRONOSTICASTE ESTE PARTIDO              │  │
│  │     Anotá tu marcador y sumá puntos en tus torneos.   │  │
│  │                                                        │  │
│  │     ┌──────────────────────────────────────────────┐  │  │
│  │     │  ▶ EMPEZAR A PRONOSTICAR                     │  │  │
│  │     └──────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

> El botón "Empezar a pronosticar" abre el slide vacío en modo edición (dashed border).

#### Fallback: 1 solo torneo (sin carrusel, solo slide estático)

Si el usuario solo participa en 1 torneo para este partido, **no hay carrusel**: se renderiza directamente el slide (sin peek, sin dots) ocupando el ancho completo. Esto evita la metáfora rota de "carrusel de 1".

---

### 3.3 ESTRUCTURA GLOBAL — recomendación

#### Análisis de las 4 opciones

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Acordeones verticales** | Compacto, escroleable | Imposible de descubrir, mucho scroll | ❌ Descartado |
| **B. Tabs horizontales (Resumen / Predicciones / Eventos / Formaciones)** | Familiar, descubrible | Rompe el pedido del usuario de "carrusel de predicciones como protagonista" si Predicciones es solo 1 tab de 4 | ❌ Parcialmente bueno |
| **C. Scroll vertical con secciones apiladas (header sticky + carrusel sticky + secciones que scrollean)** | Mobile-first natural, header siempre visible | Si hay muchas secciones se hace largo (700px+ scroll) | ⚠️ Bueno pero con límite |
| **D. Vista condicional según estado del partido** | Máxima relevancia contextual | Tres implementaciones diferentes | ⚠️ Complementario |

#### **Opción recomendada: C + tabs internos**

El sheet tiene **3 zonas sticky** (no scrollean) más **contenido scrollable**:

```
┌──────────────────────────────────────────────┐
│  [Handle]                                    │  ← siempre visible (BottomSheet primitive)
├──────────────────────────────────────────────┤
│                                              │
│  HEADER (sticky)                             │  ← siempre visible: status, score, equipos
│  ─────────────────                           │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  TABS INTERNOS sticky:                       │  ← tabs que scrollean con el contenido
│  ┌──────┬──────┬───────┐                     │     pero mantienen el active highlighted
│  │PRONOS│EVENTS│INFO   │                     │
│  └──────┴──────┴───────┘                     │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  CONTENIDO (scrollable)                      │  ← solo esto scrollea
│                                              │
│  [Tab activo según selección]                │
│                                              │
└──────────────────────────────────────────────┘
```

**Tabs internos propuestos (3, no 4):**

1. **PRONÓSTICOS** (default) — el carrusel multi-torneo + sticky save bar
2. **EVENTOS** (timeline + stats) — el contenido de `MatchDetailsTabs` actual
3. **INFO** — H2H, estadio, TV, link externo, share

> **¿Por qué no "Formaciones" como tab separado?** Porque:
> 1. No aplica en `upcoming` (las formaciones se publican ~1h antes).
> 2. Solo 1 de cada 5 partidos tiene formaciones detalladas útiles.
> 3. Si están disponibles, viven dentro de "Eventos" como un sub-acordeón.
>
> Si el feedback indica que los usuarios SÍ las quieren prominentes, se puede split en 4 tabs.

#### Wireframe ASCII — ESTRUCTURA GLOBAL con tabs internos

```
┌──────────────────────────────────────────────────────────────┐
│  ─────                                                       │  ← handle (40×4px)
│                                                              │
│  ╔══════════════════════ HEADER (sticky) ══════════════════╗  │
│  ║  [FIN]                       [📺 TyC Sports]            ║  │
│  ║  [ARG]          1 : 2          [BRA]                    ║  │
│  ║  ARGENTINA                              BRASIL          ║  │
│  ║  🏆 Copa del Mundo · Cuartos · 🏟 Lusail                ║  │
│  ╚════════════════════════════════════════════════════════╝  │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  ╔══════════════════════ TABS (sticky) ═══════════════════╗  │
│  ║  ━━━━━━━ ━━━━━━━ ━━━━━━━                                 ║  │
│  ║   PRONOS    EVENTOS    INFO                               ║  │
│  ║   (active)                                                ║  │
│  ╚═════════════════════════════════════════════════════════╝  │
│                                                              │
│  ╔═════════════════════ CONTENIDO (scroll) ═══════════════╗  │
│  ║                                                          ║  │
│  ║  TUS PRONÓSTICOS (3 torneos)                             ║  │
│  ║                                                          ║  │
│  ║  ┌──────────────────────────────────┐  ┌────┐            ║  │
│  ║  │ 🏆 PRODE DE LA OFICINA          │  │peek│            ║  │
│  ║  │ ...                              │  └────┘            ║  │
│  ║  └──────────────────────────────────┘                    ║  │
│  ║  ●━━ ●  ○                                                ║  │
│  ║                                                          ║  │
│  ║  ┌──────────────────────────────────────────────────┐    ║  │
│  ║  │  💡 Si acertás: Marcador Exacto +10 pts (x1)     │    ║  │
│  ║  │  Diferencia de Goles +6 pts (x1)                  │    ║  │
│  ║  └──────────────────────────────────────────────────┘    ║  │
│  ║                                                          ║  │
│  ║  ┌──────────────────────────────────────────────────┐    ║  │
│  ║  │  ⏱ CIERRA EN 2h 15min                             │    ║  │
│  ║  │  [🔔 Recordame cuando empiece]                    │    ║  │
│  ║  └──────────────────────────────────────────────────┘    ║  │
│  ║                                                          ║  │
│  ║  ──── fin contenido tab PRONÓSTICOS ────                 ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
│                                                              │
│  ╔══════════════════ STICKY SAVE BAR ══════════════════════╗  │
│  ║  2 cambios sin guardar        [DESCARTAR] [GUARDAR]     ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         ↑ env(safe-area-inset-bottom, 0px) en padding-bottom
```

#### Wireframe ASCII — Tab EVENTOS (live)

```
┌──────────────────────────────────────────────────────────────┐
│  [HEADER sticky] [TABS sticky: PRONOS · EVENTOS · INFO]    │
│  ════════════════════════════════════════════════════════    │
│                                                              │
│  ╔═══════════ TIMELINE DE EVENTOS ════════════════╗         │
│  ║                                               ║         │
│  ║  ARG                              BRA         ║         │
│  ║  ────────────────────────────────             ║         │
│  ║                                               ║         │
│  ║              ┌──┐  67'                        ║         │
│  ║  Messi ⚽ ─── │  │ ─── ⚽ Vini Jr.            ║         │
│  ║              └──┘                             ║         │
│  ║              ┌──┐  45'+2                      ║         │
│  ║  Montiel 🟨 ─│  │                            ║         │
│  ║              └──┘                             ║         │
│  ║              ┌──┐  22'                        ║         │
│  ║              │  │ ─── 🟥 Romero              ║         │
│  ║              └──┘                             ║         │
│  ║                                               ║         │
│  ╚═══════════════════════════════════════════════╝         │
│                                                              │
│  ╔═══════════ ESTADÍSTICAS DESTACADAS ═════════════╗         │
│  ║  Posesión        45% ──●── 55%                 ║         │
│  ║  Remates al arco   3 ──●── 5                    ║         │
│  ║  Tiros de esquina  4 ──●── 2                    ║         │
│  ║  Faltas            8 ──●── 11                   ║         │
│  ╚═════════════════════════════════════════════════╝         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Wireframe ASCII — Tab INFO

```
┌──────────────────────────────────────────────────────────────┐
│  [HEADER sticky] [TABS sticky: PRONOS · EVENTOS · INFO]    │
│  ════════════════════════════════════════════════════════    │
│                                                              │
│  ╔═══════════ ÚLTIMOS ENFRENTAMIENTOS (H2H) ═══════════╗    │
│  ║                                                    ║    │
│  ║  2024-11-21  BRA 1-0 ARG                          ║    │
│  ║  2023-03-23  ARG 2-0 BRA                          ║    │
│  ║  2022-02-11  BRA 0-1 ARG                          ║    │
│  ║  2021-07-10  ARG 1-0 BRA  ⚽ Final Copa América    ║    │
│  ║  2019-07-02  BRA 2-0 ARG  Semifinal               ║    │
│  ║                                                    ║    │
│  ║  Historial: ARG 3 - 1 - 1 BRA                     ║    │
│  ╚════════════════════════════════════════════════════╝    │
│                                                              │
│  ╔═══════════ DETALLES DEL PARTIDO ═════════════════╗       │
│  ║  🏟 Estadio: Lusail Stadium (80.000)            ║       │
│  ║  📺 TV: TyC Sports                              ║       │
│  ║  ⏰ Kickoff: 21:00 ART (02:00 UTC)               ║       │
│  ║  🌡 Clima: 24°C, despejado                      ║       │
│  ║  👤 Árbitro: Jesús Gil Manzano                   ║       │
│  ╚═════════════════════════════════════════════════╝         │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ 📤 COMPARTIR    │  │ 🔗 VER FUENTE   │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Ideas EXTRA para el sheet

### 4.1 Tabla de ideas

| # | Idea | Incluir en v1 | Visual / ubicación | Valor de UX |
|---|---|---|---|---|
| 1 | **Mini-timeline de eventos** (live/finished) | ✅ Sí | Header contextual, debajo del estado | Alto — refuerza urgencia live, no necesita tab propio |
| 2 | **Indicador de puntos por slide** (finished) | ✅ Sí | Footer de cada slide del carrusel | Alto — feedback inmediato de la apuesta |
| 3 | **Sticky save bar en el bottom** | ✅ Sí | Siempre visible cuando hay cambios sin guardar | Alto — evita perder cambios al scrollear |
| 4 | **Toggle de recordatorio** (upcoming) | ✅ Sí | Footer del slide | Medio — engagement pre-kickoff |
| 5 | **H2H mini carrusel** (5 últimos partidos) | ✅ Sí (en tab INFO) | Tab INFO, primer bloque | Medio — context deportivo para el pronostico |
| 6 | **Stats destacadas** (posesión, tiros, corners) | ✅ Sí (compactas) | Tab EVENTOS, debajo del timeline | Alto — engagement live sin saturar |
| 7 | **Share del pronóstico** (botón) | ✅ Sí | Tab INFO, al final | Medio — viralidad |
| 8 | **Countdown al kickoff** en el header | ✅ Sí | Header, debajo del score (reemplaza el "VS") | Alto — urgencia |
| 9 | **Multiplicador visible por torneo** | ✅ Sí | Header del slide ("x1", "x2", "x6") | Alto — educa al usuario sobre el valor de cada partido |
| 10 | **Stats de otros usuarios del grupo** | ❌ Diferir v2 | — | RLS ya lo bloquea (15min pre-kickoff) |
| 11 | **Notas personales** del partido | ❌ Diferir v2 | — | Bajo, no es core |
| 12 | **Link a fuente externa** (Wikipedia, FIFA) | ✅ Sí (link discreto) | Tab INFO, footer | Bajo |
| 13 | **Formaciones tácticas completas** | ❌ Diferir v2 (link a página) | — | Bajo engagement, alto costo |
| 14 | **Simulador "qué pasa si..."** | ❌ Diferir v2 | — | Feature de power user |
| 15 | **Acceso directo al chat del partido** | ⚠️ Considerar (botón flotante contextual si hay chat activo) | FAB o header tab | Medio — engagement social |
| 16 | **Estado del clima / árbitro** | ❌ Diferir v2 | — | Bajo, datos poco confiables |

### 4.2 Detalle de las ideas v1 que requieren wireframe

#### 4.2.1 Mini-timeline (live only)

Aparece debajo del header cuando `match.status === "live"`. Es una versión horizontal del timeline actual de `MatchDetailsTabs`.

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─ Última jugada ────────────────────────────────────────┐ │
│  │  [BRA logo] Vini Jr. ⚽  67'  ← gol del visitante     │ │
│  │  Asist: Rodrygo  →  Resultado: 1-2                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Eventos anteriores:  ⚽ 45'+2 (Messi) · 🟨 38' (Mac Allister)│
│  Toca para ver timeline completo →                            │
└──────────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Solo visible si `match.status === "live"` o `=== "finished"`.
- Toca el bloque → scroll a tab EVENTOS con scroll anclado al evento.
- Los eventos anteriores son links inline (texto dim) que también scrollean.

#### 4.2.2 Indicador de puntos por slide (finished only)

```
┌────────────────────────────────────────────┐
│  🏆 PRODE DE LA OFICINA           [•••]   │
│  ─────────────────────────────────────     │
│  Tu pred:  ARG 1 - 0 BRA                   │
│  Real:     ARG 1 - 2 BRA                   │
│  ─────────────────────────────────────     │
│                                             │
│  ┌────────────┐  ┌────────────┐             │
│  │ ✅ +3 pts  │  │ ❌ 0 pts   │ ← solo se  │
│  │  Básico    │  │  Marcador  │   muestra   │
│  └────────────┘  └────────────┘   si hay    │
│  Resultado básico                          puntos       │
│  (x1)                                       ganados      │
└────────────────────────────────────────────┘
```

> **¿Por qué badges separados en lugar de uno solo acumulado?** Porque el usuario quiere ver **el desglose** (acerté el resultado, no el marcador), no solo el total. Es transparencia del sistema de puntos, que es el corazón del engagement.

#### 4.2.3 Sticky save bar

```tsx
<div className="sticky bottom-0 left-0 right-0 px-6 py-3
                bg-background/95 backdrop-blur-xl
                border-t border-white/10
                flex items-center justify-between gap-3
                shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
  <span className="font-label-caps text-[10px] font-bold text-tertiary uppercase tracking-widest">
    {dirtyCount} {dirtyCount === 1 ? "cambio" : "cambios"} sin guardar
  </span>
  <div className="flex items-center gap-2">
    <button onClick={onDiscard}
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase
                       text-on-surface-variant border border-white/10
                       active:scale-[0.96] transition-transform">
      Descartar
    </button>
    <button onClick={onSave} disabled={isSaving}
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase
                       bg-primary text-on-primary border border-primary
                       active:scale-[0.96] transition-transform
                       disabled:opacity-50">
      {isSaving ? "Guardando..." : "Guardar"}
    </button>
  </div>
</div>
```

**Cuándo se muestra:**
- Solo si hay `dirtyCount > 0` (cambios pendientes en algún slide).
- Se oculta cuando todos los slides están sincronizados.
- Si el sheet se cierra con cambios sin guardar → modal de confirmación "Tenés cambios sin guardar, ¿descartar?".

#### 4.2.4 Toggle de recordatorio (upcoming only)

```tsx
<button onClick={toggleReminder}
        className="flex items-center justify-between w-full
                   px-3 py-2 rounded-xl bg-surface-container/40
                   border border-white/5 hover:border-white/10
                   active:scale-[0.98] transition-all">
  <span className="flex items-center gap-2">
    <span className="material-symbols-outlined text-base text-tertiary">
      notifications_active
    </span>
    <span className="font-label-caps text-[10px] font-bold uppercase tracking-widest text-white">
      Recordame cuando empiece
    </span>
  </span>
  <span className={`relative w-9 h-5 rounded-full transition-colors
                    ${enabled ? "bg-primary" : "bg-white/10"}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white
                      transition-transform duration-200
                      ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
  </span>
</button>
```

> Reutilizar el componente `AlertToggle` que ya existe (de `StatsSheet`).

#### 4.2.5 H2H mini carrusel (5 últimos partidos)

```
┌──────────────────────────────────────────────────────────────┐
│  ÚLTIMOS ENFRENTAMIENTOS              Historial 3V-1E-1D     │
│                                                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                         │
│  │2-0 │ │1-0 │ │1-1 │ │0-2 │ │2-0 │                         │
│  │ARG │ │BRA │ │ARG │ │BRA │ │ARG │                         │
│  │W 🏆│ │L   │ │D   │ │L   │ │W   │                         │
│  │'24 │ │'24 │ │'23 │ │'22 │ │'22 │                         │
│  └────┘ └────┘ └────┘ └────┘ └────┘                         │
│  ◀                                                    ▶     │
│  Vertical swipe (peek del siguiente)                         │
└──────────────────────────────────────────────────────────────┘
```

- 5 cards visibles en una fila horizontal scrollable (no necesitan carrusel dedicado, son pequeñas).
- Cada card es cuadrada `w-16 h-16` con `W/L/D` (Win/Loss/Draw) coloreado.
- Toca la card → modal con detalles del partido histórico.

#### 4.2.6 Stats destacadas (compactas, tab EVENTOS)

```
┌──────────────────────────────────────────────────────────────┐
│  ESTADÍSTICAS                                                │
│                                                              │
│  Posesión            45% ●━━━━━━━━━━ 55%                     │
│  Remates al arco      3 ●━━━ 5                                │
│  Tiros de esquina     4 ●━━━ 2                                │
│  Faltas               8 ●━━━ 11                               │
│  Pases completados  412 ●━━━━━━━━━━ 489                       │
│                                                              │
│  (Versión compacta, sin barras gruesas como en MatchDetailsTabs)│
└──────────────────────────────────────────────────────────────┘
```

Reutilizar el componente `StatProgressRow` que ya existe en `MatchDetailsTabs.tsx`, pero con menos padding para que entre en el sheet sin scrollear demasiado.

#### 4.2.7 Share del pronóstico

```tsx
<button onClick={handleShare}
        className="flex items-center gap-2 w-full
                   px-4 py-3 rounded-xl bg-surface-container/40
                   border border-white/5 hover:border-primary/30
                   active:scale-[0.98] transition-all">
  <span className="material-symbols-outlined text-primary">share</span>
  <span className="font-label-caps text-[10px] font-bold uppercase tracking-widest text-white">
    Compartir mi pronóstico
  </span>
  <span className="ml-auto text-[10px] text-on-surface-variant">
    ARG 1-0 BRA
  </span>
</button>
```

Al tocar, abre el `navigator.share()` nativo con un texto prearmado:
```
⚽ Mi pronóstico en ProdeAR:
🇦🇷 Argentina 1-0 Brasil 🇧🇷
🏆 Copa del Mundo · Cuartos de Final
Sumá puntos en prodear.app
```

Si `navigator.share` no está disponible, fallback a copiar al clipboard con un toast "Copiado al portapapeles".

---

## 5. Especificaciones técnicas de diseño

### 5.1 Header — tokens exactos

```tsx
<header className="
  relative
  px-6 pt-3 pb-5                       /* spacing del header */
  bg-background/95                     /* fallback si no hay backdrop-blur */
  border-b border-white/5              /* separador del tabs bar */
  /* Sin shadow propio — el sheet ya tiene shadow-[0_-8px_32px] */
">

  {/* Línea superior: status + TV */}
  <div className="flex items-center justify-between mb-4">
    {/* MatchStatusBadge: reusar el patrón de MatchStatusBar */}
    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                    bg-error/10 border border-error/30
                    font-label-caps text-[10px] font-bold uppercase
                    text-error animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-error" />
      <span className="font-stat-value text-sm tabular-nums">{liveMinute}'</span>
      <span>EN VIVO</span>
    </div>

    {match.tvChannel && (
      <span className="font-label-caps text-[9px] font-bold uppercase
                       text-secondary tracking-widest
                       bg-white/5 border border-white/10
                       px-2 py-0.5 rounded-full">
        📺 {match.tvChannel}
      </span>
    )}
  </div>

  {/* Matchup: 3 columnas */}
  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 md:gap-6">
    {/* HOME */}
    <div className="flex flex-col items-center gap-2 min-w-0">
      <TeamLogo src={match.homeLogo} name={match.homeTeam} size="lg" redCards={homeRedCount} />
      <span className="font-headline-md text-sm md:text-base font-bold text-white
                       uppercase tracking-wider text-center
                       truncate max-w-full px-1">
        {translateTeamName(match.homeTeam)}
      </span>
    </div>

    {/* SCORE */}
    <div className="flex flex-col items-center px-2">
      <div className="flex items-baseline gap-1">
        <span className={`font-stat-value text-5xl md:text-6xl font-black
                          tabular-nums leading-none
                          ${getHomeScoreColor(match)}`}>
          {match.homeScore ?? "—"}
        </span>
        <span className="text-on-surface-variant/30 text-2xl md:text-3xl font-bold px-1">:</span>
        <span className={`font-stat-value text-5xl md:text-6xl font-black
                          tabular-nums leading-none
                          ${getAwayScoreColor(match)}`}>
          {match.awayScore ?? "—"}
        </span>
      </div>
      {/* Mini status debajo del score */}
      <div className="mt-2 min-h-[20px]">
        {isUpcoming && kickoffCountdown && (
          <span className="font-label-caps text-[10px] font-bold uppercase
                           text-tertiary tracking-widest">
            ⏰ {kickoffTime} · {kickoffCountdown.formatted}
          </span>
        )}
        {isLive && lastEvent && (
          <span className="font-label-caps text-[10px] font-bold uppercase
                           text-white/80 tracking-widest truncate max-w-[180px] inline-block">
            ⚽ {lastEvent.minute}' {lastEvent.playerName}
          </span>
        )}
        {isFinished && (
          <span className="font-label-caps text-[10px] font-bold uppercase
                           text-on-surface-variant tracking-widest">
            FINAL · {match.awayScore > match.homeScore ? "GANÓ BRA" :
                     match.homeScore > match.awayScore ? "GANÓ ARG" : "EMPATE"}
          </span>
        )}
      </div>
    </div>

    {/* AWAY */}
    <div className="flex flex-col items-center gap-2 min-w-0">
      <TeamLogo src={match.awayLogo} name={match.awayTeam} size="lg" redCards={awayRedCount} />
      <span className="font-headline-md text-sm md:text-base font-bold text-white
                       uppercase tracking-wider text-center
                       truncate max-w-full px-1">
        {translateTeamName(match.awayTeam)}
      </span>
    </div>
  </div>

  {/* Competición */}
  <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/5">
    <span className="material-symbols-outlined text-sm text-tertiary">emoji_events</span>
    <span className="font-label-caps text-[10px] md:text-xs text-on-surface-variant
                     font-bold uppercase tracking-widest truncate">
      {competitionLabel}
    </span>
  </div>

  {/* Estadio (opcional, debajo de competición) */}
  {match.stadium && (
    <div className="flex items-center justify-center gap-1 mt-1">
      <span className="text-[9px] text-on-surface-variant/60 italic">
        🏟 {match.stadium}
      </span>
    </div>
  )}
</header>
```

### 5.2 Carrusel — tokens exactos

```tsx
<section aria-label="Predicciones del partido" className="py-4">
  {/* Header del carrusel */}
  <div className="flex items-center justify-between px-6 mb-3">
    <div>
      <h3 className="font-label-caps text-[10px] font-bold uppercase text-tertiary tracking-widest">
        TUS PRONÓSTICOS
      </h3>
      <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
        {tournamentsCount === 1
          ? tournamentName
          : `${tournamentsCount} torneos`}
      </p>
    </div>
    {isFinished && totalPoints > 0 && (
      <span className="font-stat-value text-base font-black text-pitch-green text-glowing tabular-nums">
        Σ +{totalPoints} pts
      </span>
    )}
  </div>

  {/* Viewport del carrusel */}
  <div className="overflow-x-auto hide-scrollbar snap-x snap-mandatory">
    <div className="flex gap-3 px-6 pb-2">
      {tournaments.map((t, idx) => (
        <PredictionSlide
          key={t.id}
          tournament={t}
          prediction={predictions.get(t.id)}
          isActive={idx === activeIndex}
          isLocked={isLocked}
          onEdit={(home, away, penalty) => updatePrediction(t.id, home, away, penalty)}
          matchMultiplier={match.stageMultiplier}
        />
      ))}
    </div>
  </div>

  {/* Dots indicator */}
  {tournamentsCount > 1 && (
    <div className="flex items-center justify-center gap-1.5 mt-3"
         role="tablist" aria-label="Navegación entre torneos">
      {tournaments.map((t, idx) => (
        <button
          key={t.id}
          onClick={() => scrollToSlide(idx)}
          role="tab"
          aria-selected={idx === activeIndex}
          aria-label={`Ir a ${t.name}`}
          className="
            relative h-10 w-10 flex items-center justify-center
            cursor-pointer rounded-full
            focus-visible:ring-1 focus-visible:ring-primary
          ">
          <span className={`
            block rounded-full transition-all duration-200
            ${idx === activeIndex
              ? 'w-6 h-1.5 bg-primary shadow-[0_0_8px_rgba(0,229,255,0.6)]'
              : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}
          `} />
        </button>
      ))}
    </div>
  )}
</section>
```

### 5.3 Slide individual — tokens exactos

```tsx
<article
  className={`
    flex-none w-[calc(100vw-72px)] md:w-[400px]
    snap-start
    rounded-2xl p-4
    border transition-all duration-200
    ${isActive
      ? 'bg-surface-container-high border-primary/40 celestial-glow'
      : 'bg-surface-container/30 border-white/5 opacity-70'}
  `}
  aria-hidden={!isActive}
>
  {/* Header del slide */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      <span className="material-symbols-outlined text-base text-tertiary flex-shrink-0">
        emoji_events
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-label-caps text-[10px] font-bold uppercase tracking-widest
                      text-tertiary truncate">
          {tournament.name}
        </p>
        <p className="text-[9px] text-on-surface-variant/60 truncate">
          Multiplicador ×{match.stageMultiplier}
        </p>
      </div>
    </div>
    {/* Overflow menu (icon button) */}
    <button aria-label="Más opciones"
            className="w-8 h-8 flex items-center justify-center
                       text-on-surface-variant hover:text-white
                       rounded-lg active:scale-[0.96] transition-transform">
      <span className="material-symbols-outlined text-lg">more_vert</span>
    </button>
  </div>

  {/* Stepper central */}
  <div className="flex items-center justify-center gap-2 py-2">
    {/* Home team mini-logo + stepper */}
    <TeamMiniLogo team={match.homeTeam} logo={match.homeLogo} />
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={() => increment('home')}
              disabled={isLocked}
              aria-label="Sumar gol local"
              className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700
                         text-white rounded-lg flex items-center justify-center
                         font-bold text-sm transition-colors
                         active:scale-[0.96] disabled:opacity-30
                         disabled:cursor-not-allowed">
        +
      </button>
      <input type="number" min="0" max="20"
             value={predictedHome}
             onChange={(e) => setHome(e.target.value)}
             disabled={isLocked}
             aria-label={`Goles pronosticados para ${match.homeTeam}`}
             className="w-14 h-14 bg-white text-center
                        font-stat-value text-2xl font-black
                        text-neutral-900 rounded-xl
                        border border-white/10
                        shadow-inner outline-none
                        focus:ring-2 focus:ring-primary/40
                        disabled:bg-neutral-800 disabled:text-white/50
                        transition-colors tabular-nums" />
      <button onClick={() => decrement('home')}
              disabled={isLocked}
              aria-label="Restar gol local"
              className="w-12 h-8 bg-neutral-800 hover:bg-neutral-700
                         text-white rounded-lg flex items-center justify-center
                         font-bold text-sm transition-colors
                         active:scale-[0.96] disabled:opacity-30
                         disabled:cursor-not-allowed">
        −
      </button>
    </div>

    <span className="text-on-surface-variant/40 text-2xl font-bold px-1">:</span>

    {/* Away stepper */}
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={() => increment('away')} disabled={isLocked}
              aria-label="Sumar gol visitante"
              className="...">+</button>
      <input type="number" min="0" max="20"
             value={predictedAway}
             onChange={(e) => setAway(e.target.value)}
             disabled={isLocked}
             aria-label={`Goles pronosticados para ${match.awayTeam}`}
             className="..." />
      <button onClick={() => decrement('away')} disabled={isLocked}
              aria-label="Restar gol visitante"
              className="...">−</button>
    </div>
    <TeamMiniLogo team={match.awayTeam} logo={match.awayLogo} />
  </div>

  {/* Penales selector (playoffs con empate) */}
  {showPenaltySelector && (
    <div className="mt-3 pt-3 border-t border-white/5 animate-fade-in">
      <p className="font-label-caps text-[9px] text-tertiary font-bold uppercase
                    text-center mb-2 text-glowing-gold tracking-widest">
        Desempate por penales (requerido)
      </p>
      <div className="flex gap-2">
        <PenaltyButton side="home" selected={penaltyWinner === "home"}
                       onClick={() => setPenalty('home')} />
        <PenaltyButton side="away" selected={penaltyWinner === "away"}
                       onClick={() => setPenalty('away')} />
      </div>
    </div>
  )}

  {/* Footer contextual */}
  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
    {isUpcoming && !isFullyPredicted && (
      <>
        <p className="font-label-caps text-[9px] text-on-surface-variant
                      font-bold uppercase tracking-widest text-center">
          💡 Marcador exacto: +{10 * match.stageMultiplier} pts
        </p>
        {showCountdown && (
          <p className="font-label-caps text-[9px] text-tertiary
                        font-bold uppercase tracking-widest text-center">
            ⏱ Cierra en {countdown.formatted}
          </p>
        )}
      </>
    )}
    {isFinished && pointsEarned !== null && (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {pointsEarned > 0 ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black
                           bg-pitch-green/15 border border-pitch-green/30
                           text-pitch-green uppercase tracking-widest
                           shadow-[0_0_12px_rgba(0,255,65,0.2)]
                           flex items-center gap-1">
            ⚽ +{pointsEarned} pts
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                           bg-error/10 border border-error/20
                           text-error/80 uppercase tracking-widest">
            ❌ 0 pts
          </span>
        )}
      </div>
    )}
  </div>
</article>
```

### 5.4 Tabs internos — tokens exactos

```tsx
<nav className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl
                border-y border-white/5"
     role="tablist" aria-label="Secciones del partido">
  <div className="flex px-6">
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={isActive}
          aria-controls={`panel-${tab.id}`}
          onClick={() => setActiveTab(tab.id)}
          className={`
            relative flex-1 py-3 cursor-pointer
            font-label-caps text-[10px] tracking-widest
            font-extrabold uppercase
            transition-[color,transform] duration-200
            active:scale-[0.98]
            ${isActive
              ? 'text-primary text-glowing'
              : 'text-on-surface-variant hover:text-white'}
          `}>
          <span className="flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-base">
              {tab.icon}
            </span>
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full
                                bg-primary/20 text-primary text-[8px]">
                {tab.badge}
              </span>
            )}
          </span>
          {/* Underline indicator */}
          {isActive && (
            <span className="absolute bottom-0 left-1/4 right-1/4
                             h-0.5 bg-primary rounded-full
                             shadow-[0_0_8px_rgba(0,229,255,0.6)]
                             transition-all duration-200" />
          )}
        </button>
      );
    })}
  </div>
</nav>
```

### 5.5 Espaciado global del sheet

| Sección | Padding | Margin/Gap |
|---|---|---|
| Header | `px-6 pt-3 pb-5` | `mb-4` al final antes del border |
| Tabs nav | `px-6` | sin margin, el border-y ya separa |
| Contenido de cada tab | `px-6 py-4` | `space-y-4` entre bloques |
| Sticky save bar | `px-6 py-3` | `border-t` con `shadow-[0_-4px_16px]` |
| Bottom safe-area | `pb-[env(safe-area-inset-bottom)]` | ya existe en BottomSheet primitive |

### 5.6 Border-radius

| Elemento | Radio | Tailwind | Por qué |
|---|---|---|---|
| Sheet completo | 24px top | `rounded-t-3xl` | (en BottomSheet) |
| Cards internas (slides, secciones) | 16px | `rounded-2xl` | `24 - 8 (padding)` |
| Inputs / botones | 12px | `rounded-xl` | `16 - 4 (padding)` |
| Pills / badges | 9999px | `rounded-full` | siempre |
| Stepper input | 12px | `rounded-xl` | consistente con inputs |

> **Concentric check:** sheet 24 → slide 16 (gap 8) → input 12 (gap 4). ✅

### 5.7 Sombras y glows

| Elemento | Shadow / Glow |
|---|---|
| Sheet (existente) | `shadow-[0_-8px_32px_rgba(0,0,0,0.4)]` |
| Slide activo (celestial) | `shadow-[0_0_24px_rgba(0,229,255,0.15)]` (suave) |
| Sticky save bar | `shadow-[0_-4px_16px_rgba(0,0,0,0.4)]` |
| Tabs underline activo | `shadow-[0_0_8px_rgba(0,229,255,0.6)]` |
| Score "live ganador" | `text-shadow: 0 0 12px rgba(0,229,255,0.5)` (text-glowing) |
| Badge puntos ganados | `shadow-[0_0_12px_rgba(0,255,65,0.2)]` (verde neón) |
| Stadium glow live | `celestial-glow border-primary/20 bg-primary/5` (igual que MatchCard) |

### 5.8 Animaciones

| Momento | Animación | Duración | Easing | Reduce-motion |
|---|---|---|---|---|
| Sheet open (entrada) | `bottom-sheet-enter` (slide-up) | 350ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 150ms linear (ya existe) |
| Backdrop fade-in | `bottom-sheet-backdrop-enter` | 250ms | `ease-out` | 150ms linear (ya existe) |
| Header stagger | `animate-enter` con delay 0ms | 350ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 150ms linear |
| Carrusel stagger | `animate-enter` con delay 80ms | 350ms | mismo | 150ms |
| Tabs stagger | delay 160ms | 350ms | mismo | 150ms |
| Slide swipe | CSS scroll-snap nativo | — | — | — |
| Score change feedback | `ring-pitch-green/40` 200ms in/out | 200ms | `ease-out` | sin animation |
| Slide saved | border `border-pitch-green/30` + check 1.5s fade | 200ms in, 1.5s visible, 200ms out | `ease-out` | instantáneo |
| Slide save error | `translateX` shake ×3 | 200ms | `ease-in-out` | instantáneo |
| Stepper +/− bounce | `scale(0.96 → 1)` en active | 120ms | `ease-out` | sin animation |
| Tab change | contenido fade-in | 200ms | `ease-out` | instantáneo |
| Save bar appear | slide-up desde bottom | 200ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | instantáneo |

> **Importante:** las animaciones de cambio de score (cuando se autosavea) deben ser `transition`, no `@keyframes` bloqueantes, para que se puedan interrumpir. Ver `make-interfaces-feel-better` §"Interruptible animations".

---

## 6. Mobile-first considerations

### 6.1 Viewports objetivo

| Viewport | Dispositivo | Comportamiento |
|---|---|---|
| 320px | iPhone SE 1ª gen | Base: el sheet ocupa 85vh, padding reducido a px-4 |
| 360-414px | iPhone estándar, Android medio | Default mobile: sheet ocupa 80vh |
| 414-768px | iPhone Plus, iPad mini | Sheet se ve bien con el default |
| 768-1023px | Tablet portrait | Sheet sigue siendo bottom-anchored pero más ancho (max-w-2xl centrado) |
| ≥1024px | Desktop, tablet landscape | **El sheet se transforma en modal centrado** de `max-w-xl` (576px) — ver §10.2 |

### 6.2 Touch targets

Todos los elementos interactivos deben tener **hit area ≥ 44×44px**:

- Stepper `+` y `−`: `w-12 h-8` (48×32 visible) → hit area extendida con padding a 48×48.
- Dots indicator: contenedor `w-10 h-10` con dot `w-2 h-2` centrado (hit area 40×40 — borderline, **subir a 44×44**).
- Botones de slide (overflow menu, recordatorio): `min-w-11 min-h-11` (44×44).
- Tabs: `py-3` da ~44px de alto con el texto. ✅
- Sticky save bar botones: `py-2` da ~36px → **subir a `py-2.5`**.

### 6.3 Espaciado para dedos

- **Padding lateral del sheet:** `px-6` (24px) en mobile. Es el mínimo cómodo para que el pulgar no toque accidentalmente el borde.
- **Gap entre secciones:** `space-y-4` (16px). Suficiente para que el dedo no confunda dos áreas.
- **Gap entre elementos en una fila:** `gap-3` mínimo (12px).

### 6.4 Sheet no ocupa toda la pantalla

- `max-height: 85vh` (en lugar de 100vh) para que **siempre se vea un poco del backdrop y la app detrás** en la parte superior.
- Esto es importante porque:
  1. Recuerda al usuario que está en un sheet, no en una página nueva.
  2. El handle siempre está visible.
  3. Si el sheet tiene scroll interno, el indicador de "hay más contenido abajo" es el final del sheet, no el final de la pantalla.

### 6.5 iOS safe-area

- Bottom padding del sheet: `pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]` (ya existe en BottomSheet).
- Sticky save bar: agregar `pb-[env(safe-area-inset-bottom)]` para que el contenido no quede pegado al home indicator.

### 6.6 Landscape mobile

En landscape (≤812px alto), el sheet pasa a `max-height: 95vh` y el header se hace más compacto:
- Logos `w-12 h-12` (en lugar de 64px)
- Score `text-4xl` (en lugar de 48px)
- Padding `px-4 py-3` (en lugar de px-6 py-5)

> Considerar mostrar el sheet como **modal centrado** en landscape mobile (≥640px ancho y <500px alto) para aprovechar mejor el espacio.

### 6.7 Scroll dentro del sheet

- El contenido del sheet scrollea con `overflow-y-auto` (ya en BottomSheet primitive).
- **Sticky elements** dentro del contenido: header del sheet (no se mueve), tabs nav (sticky `top-0` dentro del scroll container).
- Sticky save bar: posicionada al **final del contenido scrollable** (no fixed al viewport), para que aparezca cuando el usuario scrollea hacia abajo.
- En iOS, usar `-webkit-overflow-scrolling: touch` (Tailwind lo maneja con la utility de scroll).

---

## 7. Accesibilidad (WCAG 2.1 AA)

### 7.1 Focus management

- **Al abrir el sheet:** foco se mueve al sheet container (`tabindex="-1"`, `role="dialog"`, `aria-modal="true"`). ✅ Ya existe.
- **Focus trap:** Tab cicla entre los focusables internos. ✅ Ya existe.
- **Al cerrar:** foco vuelve al elemento que disparó la apertura (la card). ✅ Ya existe.
- **Initial focus:** no forzar foco al primer input del carrusel — es disruptivo. Dejar el foco en el sheet container para que screen readers anuncien el contenido.

### 7.2 ARIA

| Elemento | ARIA |
|---|---|
| Sheet container | `role="dialog"` `aria-modal="true"` `aria-labelledby="match-title"` |
| Título del match (oculto visualmente) | `<h2 id="match-title" className="sr-only">{homeTeam} vs {awayTeam}</h2>` |
| Tabs nav | `role="tablist"` con `aria-label="Secciones del partido"` |
| Cada tab | `role="tab"` `id="tab-X"` `aria-selected` `aria-controls="panel-X"` `tabindex={isActive ? 0 : -1}` |
| Cada panel | `role="tabpanel"` `id="panel-X"` `aria-labelledby="tab-X"` `tabindex={isActive ? 0 : -1}` |
| Carrusel | `role="region"` `aria-roledescription="carrusel"` `aria-label="Predicciones por torneo"` |
| Cada slide | `role="group"` `aria-roledescription="slide"` `aria-label="Torneo X, predicción Y"` |
| Dots indicator | `role="tablist"` (no `aria-hidden`), cada dot es `role="tab"` con `aria-label` |
| Stepper `+` | `aria-label="Sumar gol a {homeTeam}"` |
| Stepper `−` | `aria-label="Restar gol a {homeTeam}"` |
| Input number | `aria-label="Goles pronosticados para {team}"` `inputmode="numeric"` |
| Sticky save bar | `role="status"` `aria-live="polite"` para anunciar "2 cambios sin guardar" |
| Toggle recordatorio | `role="switch"` `aria-checked={enabled}` con label |
| Live status badge | `aria-live="polite"` `aria-atomic="true"` para anunciar cambios de minuto |

### 7.3 Contraste

| Texto | Fondo | Ratio | WCAG |
|---|---|---|---|
| `text-white` | `bg-background` (#000b14) | 19.4:1 | AAA ✅ |
| `text-on-surface-variant` (#94a3b8) | `bg-background` | 7.1:1 | AAA ✅ |
| `text-primary` (#00e5ff) | `bg-background` | 11.2:1 | AAA ✅ |
| `text-tertiary` (#ffd600) | `bg-background` | 14.8:1 | AAA ✅ |
| `text-error` (#ff2a2a) | `bg-background` | 5.0:1 | AA ✅ (borderline para texto pequeño) |
| `text-pitch-green` (#00ff41) | `bg-background` | 14.5:1 | AAA ✅ |

**Precauciones:**
- El score `text-5xl` es grande pero con `text-glowing` (text-shadow) puede reducir contraste percibido. Verificar manualmente en 2 fondos distintos.
- El badge "EN VIVO" rojo sobre `bg-error/10` (10% opacidad) tiene contraste bajo: subir a `bg-error/20` o usar un background más opaco.

### 7.4 Navegación por teclado

| Tecla | Acción |
|---|---|
| `Tab` | Cicla entre focusables: header → tabs → carrusel → save bar |
| `Enter` / `Space` en tab | Cambia al tab correspondiente |
| `Tab` dentro del carrusel | Mueve foco entre dots (que son tabs) y luego al slide activo |
| `Enter` / `Space` en dot | Scroll al slide correspondiente |
| `Tab` dentro de un slide | Input home → botones +/− → input away → botones +/− → botón overflow → footer |
| `ArrowUp` / `ArrowDown` en input number | Cambia el valor (comportamiento nativo) |
| `Escape` | Cierra el sheet (ya implementado) |
| `Cmd/Ctrl + Enter` en slide | Equivale a "Guardar" el slide activo |

### 7.5 Screen reader announcements

Al abrir el sheet, el screen reader debe anunciar:
- "Diálogo. {homeTeam} contra {awayTeam}. {competition}. {status}. {score}."

Al cambiar de tab:
- "{Tab label} tab, selected. {tabCount} de {totalTabs}."

Al cambiar de slide:
- "Torneo {tournamentName}. Predicción actual: {homeScore} a {awayScore}. Slide {idx} de {total}."

Al guardar predicción:
- "Predicción guardada para {tournamentName}. {puntosEstimados} puntos posibles."

### 7.6 `prefers-reduced-motion`

Todas las animaciones de entrada se reducen a 150ms linear (ya está implementado para `bottom-sheet-enter`, `animate-enter`). Agregar:

```css
@media (prefers-reduced-motion: reduce) {
  .match-sheet-stagger-1,
  .match-sheet-stagger-2,
  .match-sheet-stagger-3 {
    animation: none !important;
  }
  .score-saved-pulse,
  .slide-shake-error {
    animation: none !important;
  }
  /* Sticky save bar aparece instantáneamente */
  .save-bar-enter {
    animation-duration: 0.01ms !important;
  }
}
```

---

## 8. Sistema de animación

### 8.1 Resumen de animaciones

| # | Momento | Tipo | Trigger | CSS | Duración |
|---|---|---|---|---|---|
| 1 | Sheet open | Entrada sheet completo | `isOpen: false → true` | `.bottom-sheet-enter` | 350ms |
| 2 | Backdrop fade | Entrada backdrop | `isOpen: false → true` | `.bottom-sheet-backdrop-enter` | 250ms |
| 3 | Header stagger | Entrada contenido | mount con `delay 0ms` | `animate-enter` | 350ms |
| 4 | Carrusel stagger | Entrada contenido | mount con `delay 80ms` | `animate-enter` | 350ms |
| 5 | Tabs stagger | Entrada contenido | mount con `delay 160ms` | `animate-enter` | 350ms |
| 6 | Tab change | Cambio de tab | `activeTab` cambia | `transition-opacity` | 200ms |
| 7 | Slide snap | Scroll snap | swipe / dot click | nativo CSS snap | — |
| 8 | Score change | Feedback autosave | `predictedHome/Away` cambia | `transition-[box-shadow]` | 200ms |
| 9 | Stepper +/− | Tap feedback | tap | `active:scale-[0.96]` | 120ms |
| 10 | Slide saved | Confirmación | save success | `ring-pitch-green/40` fade | 200ms in / 1.5s / 200ms out |
| 11 | Slide error | Error | save fail | shake `translateX` | 200ms |
| 12 | Save bar appear | Aparición | `dirtyCount > 0` | `slide-up` | 200ms |
| 13 | Live badge pulse | Loop | live | `animate-pulse` | 2s infinite |
| 14 | Live minute update | Cambio de número | `liveMinute` cambia | sin animation (solo tabular-nums) | — |
| 15 | Sheet close | Salida | `isOpen: true → false` | reverse de #1 | 350ms |

### 8.2 Curvas de easing

| Contexto | Curva | Razonamiento |
|---|---|---|
| Entrada del sheet | `cubic-bezier(0.2, 0.8, 0.2, 1)` (la "system" del proyecto) | Deceleración suave, se siente "premium" |
| Cambio de slide | nativa CSS snap | El browser hace el mejor easing posible |
| Tap feedback | `ease-out` (Tailwind default) | Respuesta inmediata |
| Score change | `ease-out` | Confirmación rápida |
| Save bar appear | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Coherente con la entrada del sheet |
| Stadium glow (live) | `ease-in-out infinite` | Respiración del borde |
| **NUNCA usar** | `linear` (excepto reduce-motion), `spring`, `bounce` | Se siente amateur/inestable |

### 8.3 Lo que se desactiva con `prefers-reduced-motion: reduce`

- ❌ Stagger animations (todo aparece junto)
- ❌ Stadium glow pulse
- ❌ Live badge pulse (se mantiene el color, no la animación)
- ❌ Shake de error (se muestra el mensaje sin movimiento)
- ❌ Save bar slide-up (aparece instantáneo)
- ✅ Slide snap (sigue funcionando, es funcional no decorativo)
- ✅ Cambios de score (instantáneo)
- ✅ Tab change (instantáneo)

---

## 9. Estados del sheet según el partido

### 9.1 Matriz de estados

| Estado del partido | Header | Tab PRONÓSTICOS | Tab EVENTOS | Tab INFO | Sticky save bar |
|---|---|---|---|---|---|
| **`not_started`** (upcoming) | "VS" + countdown al kickoff | Carrusel editable (todos los slides con steppers) | Empty state ("El partido no ha comenzado") | H2H + detalles + recordatorio toggle | Solo si hay cambios |
| **`live`** | Score real + minuto + último evento | Carrusel bloqueado (steppers disabled, muestra predicción vs real) | Timeline de eventos (activo) | Mismo H2H (sin recordatorio) | No se muestra |
| **`finished`** | Score final + badge "FIN" | Carrusel con badges de puntos ganados por slide | Timeline + stats finales | Mismo H2H | No se muestra |
| **`cancelled`** | "SUSP" gris + line-through en score | Carrusel bloqueado + badge "Partido suspendido" | Empty state ("Partido suspendido") | Mismo H2H | No se muestra |
| **`postponed`** | "PPTO" gris + "REPROGRAMADO" sub-label | Carrusel con banner "Tu predicción se mantiene válida" | Empty state ("Partido postergado") | Mismo H2H | Solo si el usuario quiere editar |

### 9.2 Wireframes por estado

#### UPCOMING (modo edición)

```
┌────────────────────────────────────────┐
│  HEADER (sticky)                       │
│  ╔════════════════════════════════╗    │
│  ║  [FIN? no → sin badge]         ║    │
│  ║  [ARG]    — : —    [BRA]       ║    │
│  ║         ⏰ 21:00 · 2h 15min     ║    │
│  ║  Copa del Mundo · Cuartos      ║    │
│  ╚════════════════════════════════╝    │
│                                        │
│  TABS: [PRONOS] [EVENTOS] [INFO]       │
│                                        │
│  ╔═══════ PRONÓSTICOS (tab activo) ══╗ │
│  ║ TUS PRONÓSTICOS                   ║ │
│  ║ [Carrusel editable con steppers]  ║ │
│  ║ Dots ●━━ ●  ○                     ║ │
│  ║                                   ║ │
│  ║ 💡 Marcador exacto: +10 pts      ║ │
│  ║ ⏱ Cierra en 2h 15min             ║ │
│  ║ 🔔 Recordarme              [●━]  ║ │
│  ╚═══════════════════════════════════╝ │
│                                        │
│  [STICKY SAVE BAR si hay cambios]      │
└────────────────────────────────────────┘
```

#### LIVE (modo lectura + verificación)

```
┌────────────────────────────────────────┐
│  HEADER (sticky)                       │
│  ╔════════════════════════════════╗    │
│  ║  [🔴 67' EN VIVO]   [📺 TyC]  ║    │
│  ║  [ARG]    1 : 2    [BRA] ◀GLOW║    │
│  ║  ⚽ 67' Vini Jr. (Asist Rodrygo)║    │
│  ║  Copa del Mundo · Cuartos      ║    │
│  ╚════════════════════════════════╝    │
│                                        │
│  TABS: [PRONOS] [EVENTOS] [INFO]       │
│                                        │
│  ╔═══════ PRONÓSTICOS (tab activo) ══╗ │
│  ║ 🔒 Predicciones cerradas         ║ │
│  ║ [Carrusel con slides bloqueados]  ║ │
│  ║   Slide 1: tu pred 1-0 / real 1-2║ │
│  ║   ⚠️ Diferencia no coincide       ║ │
│  ║   (acumulás si hay más goles)     ║ │
│  ║                                   ║ │
│  ║ [STATS en vivo compactas]         ║ │
│  ║   Posesión 45% ━━━ 55%            ║ │
│  ║   Remates 3 ━━━ 5                 ║ │
│  ╚═══════════════════════════════════╝ │
│                                        │
│  (Sin sticky save bar)                 │
└────────────────────────────────────────┘
```

#### FINISHED (modo resultado)

```
┌────────────────────────────────────────┐
│  HEADER (sticky)                       │
│  ╔════════════════════════════════╗    │
│  ║  [FIN]                [📺 TyC] ║    │
│  ║  [ARG]    1 : 2 ✓   [BRA]     ║    │
│  ║  FINAL · GANÓ BRASIL            ║    │
│  ║  Copa del Mundo · Cuartos      ║    │
│  ╚════════════════════════════════╝    │
│                                        │
│  TABS: [PRONOS] [EVENTOS] [INFO]       │
│                                        │
│  ╔═══════ PRONÓSTICOS (tab activo) ══╗ │
│  ║ Σ +18 puntos en 3 torneos        ║ │
│  ║ [Carrusel con badges de puntos]  ║ │
│  ║   Slide 1: +6 pts (Diferencia)   ║ │
│  ║   Slide 2: 0 pts                 ║ │
│  ║   Slide 3: +12 pts (Exacto x2)   ║ │
│  ╚═══════════════════════════════════╝ │
│                                        │
└────────────────────────────────────────┘
```

#### CANCELLED / POSTPONED

```
┌────────────────────────────────────────┐
│  HEADER (sticky)                       │
│  ╔════════════════════════════════╗    │
│  ║  [SUSP]                          ║    │
│  ║  [ARG]    — : —    [BRA]        ║    │
│  ║  Partido suspendido              ║    │
│  ║  Copa del Mundo · Cuartos      ║    │
│  ╚════════════════════════════════╝    │
│                                        │
│  TABS: [PRONOS] [EVENTOS] [INFO]       │
│                                        │
│  ╔═══════ PRONÓSTICOS (tab activo) ══╗ │
│  ║                                   ║ │
│  ║  [edit_note icon, dim]            ║ │
│  ║                                   ║ │
│  ║  PARTIDO SUSPENDIDO               ║ │
│  ║  El sistema determinará cómo se   ║ │
│  ║  resuelven los puntos cuando se   ║ │
│  ║  reprograme o cancele definitiva- ║ │
│  ║  mente.                           ║ │
│  ║                                   ║ │
│  ║  Tu predicción se mantiene:       ║ │
│  ║  ARG 1 - 0 BRA                    ║ │
│  ║                                   ║ │
│  ╚═══════════════════════════════════╝ │
│                                        │
└────────────────────────────────────────┘
```

---

## 10. Wireframes finales

### 10.1 MOBILE — 360px viewport, estado UPCOMING, tab PRONÓSTICOS

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │  ← backdrop (oscurecido)
│                                                              │
│                                                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ─────                                                 │  │  ← handle (40×4px, white/30)
│  │                                                        │  │
│  │  ╔══════════════ HEADER (sticky) ══════════════════╗  │  │
│  │  ║  ⏰ 21:00 · 2h 15min      📺 TyC Sports         ║  │  │
│  │  ║                                                ║  │  │
│  │  ║  [ARG logo]              [BRA logo]            ║  │  │
│  │  ║   64px                      64px                ║  │  │
│  │  ║                                                ║  │  │
│  │  ║  ARGENTINA      — : —      BRASIL              ║  │  │
│  │  ║  text-sm           text-5xl    text-sm         ║  │  │
│  │  ║                                                ║  │  │
│  │  ║  ⏰ 21:00 · 2h 15min                            ║  │  │
│  │  ║                                                ║  │  │
│  │  ║  ────────────────────────────────────────       ║  │  │
│  │  ║  🏆 Copa del Mundo · Cuartos de Final          ║  │  │
│  │  ║  🏟 Lusail Stadium                             ║  │  │
│  │  ╚════════════════════════════════════════════════╝  │  │
│  │                                                        │  │
│  │  ╔══════════════ TABS (sticky) ══════════════════╗   │  │
│  │  ║   ━━━━━━━ ━━━━━━━ ━━━━━━━                      ║   │  │
│  │  ║   🎯PRONOS  📅EVENTOS  ℹINFO                  ║   │  │
│  │  ║            ^^^^^^^                              ║   │  │
│  │  ╚════════════════════════════════════════════════╝   │  │
│  │                                                        │  │
│  │  ╔══════════ CONTENIDO SCROLL ═══════════════════╗   │  │
│  │  ║                                                ║   │  │
│  │  ║  TUS PRONÓSTICOS                Σ 0 pts        ║   │  │
│  │  ║                                                ║   │  │
│  │  ║  ┌──────────────────────────────────────┐ ┌──┐║   │  │
│  │  ║  │ 🏆 PRODE DE LA OFICINA       [•••]   │ │pe│║   │  │
│  │  ║  │ Liga · Fecha 14 · Multiplicador ×1    │ │ek│║   │  │
│  │  ║  │ ──────────────────────────────────    │ └──┘║   │  │
│  │  ║  │  [ARG] [-]  1  [+]   :   [-]  0  [+] [BRA]║  │  │
│  │  ║  │  32px                                    │  │  │
│  │  ║  │ ──────────────────────────────────       │  │  │
│  │  ║  │  💡 Marcador exacto: +10 pts             │  │  │
│  │  ║  │  ⏱ Cierra en 2h 15min                    │  │  │
│  │  ║  │  🔔 Recordarme            [●━━━━]        │  │  │
│  │  ║  └──────────────────────────────────────────┘  │  │
│  │  ║                                                ║   │  │
│  │  ║      ●━━━━━  ●  ○                              ║   │  │
│  │  ║                                                ║   │  │
│  │  ║  ┌──────────────────────────────────────────┐  │   │  │
│  │  ║  │  💡 Si acertás: Marcador Exacto +10 pts  │  │   │  │
│  │  ║  │     Diferencia de Goles +6 pts           │  │   │  │
│  │  ║  │  Multiplicador de fase: ×1               │  │   │  │
│  │  ║  └──────────────────────────────────────────┘  │   │  │
│  │  ║                                                ║   │  │
│  │  ║  ┌──────────────────────────────────────────┐  │   │  │
│  │  ║  │  ⏱ CIERRA EN 2h 15min                     │  │   │  │
│  │  ║  │  [🔔 Recordame cuando empiece]            │  │   │  │
│  │  ║  └──────────────────────────────────────────┘  │   │  │
│  │  ║                                                ║   │  │
│  │  ║                                                ║   │  │
│  │  ║  [paddin-bottom para safe-area]                ║   │  │
│  │  ╚════════════════════════════════════════════════╝   │  │
│  │                                                        │  │
│  │  ╔══════════ STICKY SAVE BAR ══════════════════════╗  │  │
│  │  ║  2 cambios sin guardar  [DESCARTAR] [GUARDAR]   ║  │  │
│  │  ╚══════════════════════════════════════════════════╝  │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 DESKTOP — 1280px viewport, estado FINISHED, tab PRONÓSTICOS

```
┌──────────────────────────────────────────────────────────────────────┐
│  [backdrop con blur — app detrás oscurecida]                         │
│                                                                      │
│              ┌──────────────────────────────────────┐                │
│              │  ────                               │                │
│              │                                      │                │
│              │  ╔══════════ HEADER ════════════╗   │                │
│              │  ║  [FIN]            [📺 TyC]    ║   │                │
│              │  ║                                  ║   │                │
│              │  ║  [ARG 80]    1 : 2     [BRA 80]║   │                │
│              │  ║  ARGENTINA              BRASIL  ║   │                │
│              │  ║                                  ║   │                │
│              │  ║  FINAL · GANÓ BRASIL             ║   │                │
│              │  ║                                  ║   │                │
│              │  ║  🏆 Copa del Mundo · Cuartos     ║   │                │
│              │  ║  🏟 Lusail Stadium               ║   │                │
│              │  ╚══════════════════════════════════╝   │                │
│              │                                      │                │
│              │  ╔══════════ TABS ═══════════════╗   │                │
│              │  ║  ━ PRONOS  EVENTOS  INFO      ║   │                │
│              │  ╚════════════════════════════════╝   │                │
│              │                                      │                │
│              │  ╔══════ CONTENIDO SCROLL ═══════╗   │                │
│              │  ║                                ║   │                │
│              │  ║  TUS PRONÓSTICOS   Σ +18 pts  ║   │                │
│              │  ║                                ║   │                │
│              │  ║  ┌──────────────────────────┐  ║   │                │
│              │  ║  │ 🏆 PRODE DE LA OFICINA  │  ║   │                │
│              │  ║  │  ARG 1 - 0 BRA (tu pred)│  ║   │                │
│              │  ║  │  Real: ARG 1 - 2 BRA     │  ║   │                │
│              │  ║  │                          │  ║   │                │
│              │  ║  │  ┌─────┐  ┌─────┐       │  ║   │                │
│              │  ║  │  │+3pts│  │ 0pts│       │  ║   │                │
│              │  ║  │  │Básico│  │     │       │  ║   │                │
│              │  ║  │  └─────┘  └─────┘       │  ║   │                │
│              │  ║  └──────────────────────────┘  ║   │                │
│              │  ║       ●━━━━  ●  ●  ●          ║   │                │
│              │  ║                                ║   │                │
│              │  ║  [otros slides + detalle]     ║   │                │
│              │  ║                                ║   │                │
│              │  ╚════════════════════════════════╝   │                │
│              │                                      │                │
│              └──────────────────────────────────────┘                │
│                 max-w-xl (576px)                                    │
│                 mx-auto, mt-[5vh], rounded-t-3xl                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

> **En desktop, el BottomSheet se transforma en un modal centrado con `max-w-xl`**, `mt-[5vh]`, `mb-[5vh]`, `rounded-2xl` (todos los corners, no solo top), y un backdrop con más blur. Esto ya se puede hacer extendiendo el BottomSheet con props adicionales (`centeredOnDesktop` o `variant="modal-desktop"`).

---

## 11. Riesgos de diseño

### 11.1 Matriz de riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | **Sobrecarga visual** (header + carrusel + 3 tabs + secciones = mucho) | Alta | Alto | Tabs internos con jerarquía clara. Default tab PRONÓSTICOS, los otros son opt-in. |
| 2 | **Inconsistencia con la MatchCard** (score grande vs chico) | Media | Medio | Mantener las **proporciones** (no el tamaño): VS pill arriba del score, score centrado, equipos flanqueando. Mismo orden, distinta escala. |
| 3 | **Performance del carrusel** (re-renders al cambiar slide) | Media | Medio | Usar `React.memo` en `PredictionSlide`, snap nativo (no librerías), debounce en autosave. Verificar con React DevTools. |
| 4 | **Accesibilidad del carrusel** (no es un patrón estándar) | Media | Alto | Implementar como `role="region"` + `aria-roledescription="carrusel"`, dots como `role="tab"`, slides como `role="group"`. Testear con VoiceOver. |
| 5 | **El sheet se hace demasiado grande** | Alta | Alto | Tabs internos. Si en testing el sheet >100vh, evaluar mover "Estadísticas" y "H2H" a una sub-pantalla (link). |
| 6 | **El carrusel no funciona con 1 solo torneo** | Alta | Bajo | Fallback declarativo: si `tournamentsCount === 1`, renderizar el slide solo sin dots, sin peek, ancho completo. |
| 7 | **Autosave con errores de red** | Media | Alto | Cola de reintentos. Si falla, mostrar banner "Sin conexión — tus cambios se guardarán cuando vuelvas a estar online" con icono. |
| 8 | **Conflicto con la propagación del touch** (swipe del sheet vs swipe del carrusel) | Alta | Alto | Implementar swipe horizontal SOLO en el área del carrusel (no en todo el sheet). El swipe vertical sigue cerrando el sheet. Testear con `touch-action: pan-y` en el carrusel. |
| 9 | **El usuario edita una predicción que está a punto de cerrar (<15min)** | Media | Medio | Banner de advertencia en el slide: "⚠️ Esta predicción cierra en 12 min. Después no se puede editar." |
| 10 | **El estado "dirty" se pierde al cambiar de tab** | Media | Alto | El dirty state se mantiene en el state del slide (no en el tab). Cambiar de tab NO resetea el form. Indicador de cambios se ve siempre en la sticky save bar. |
| 11 | **El score real se actualiza en vivo pero el header no lo refleja** | Baja | Alto | El header debe usar `useLiveMinute` (hook existente) + Supabase Realtime. Verificar conexión Realtime al abrir el sheet. |
| 12 | **El H2H mini no tiene data en muchos partidos** | Alta | Bajo | Empty state: "No hay historial reciente entre estos equipos" con icono `history_toggle_off`. |

### 11.2 Tests de usabilidad sugeridos (pre-launch)

1. **Task: "Pronostica este partido en 3 torneos diferentes."** — ¿Cuántos taps? ¿El carrusel es descubrible?
2. **Task: "Cambiá tu pronóstico de 1-0 a 2-1 a 5 minutos del cierre."** — ¿El countdown es visible? ¿La advertencia aparece?
3. **Task: "Fijate cuántos puntos sacaste en este partido finalizado."** — ¿El desglose es claro? ¿Cuántos puntos ganaste en cada torneo?
4. **Task: "Abrí el sheet, scrolleá a la tab EVENTOS, volvé a PRONÓSTICOS."** — ¿El estado del slide se mantiene?
5. **Task con un usuario con discapacidad visual:** ¿El sheet es navegable por teclado? ¿Los screen readers anuncian los cambios?

---

## 12. Recomendación final

### 12.1 ¿Aprobar el approach del usuario?

**✅ SÍ, con tres correcciones críticas:**

1. **Cambiar "scroll vertical único" por tabs internos.** El sheet se va a hacer largo, y el usuario mobile-first no debería scrollear 800px para llegar al botón de guardar.

2. **Cambiar "input de score con [-][+]" por stepper explícito (botones + y − con input central).** Reutilizar el patrón que ya existe en `MatchCard.tsx` líneas 766-912. Es familiar para el usuario, accesible, y tiene hit area grande.

3. **Cambiar "header del sheet = card escalada" por "header rediseñado con score ENORME y sub-status contextual."** No es la card más grande, es una nueva pieza con jerarquía distinta.

### 12.2 ¿Qué ideas EXTRA incluir de entrada?

| Prioridad | Idea | Justificación |
|---|---|---|
| 🔴 MUST | Mini-timeline debajo del header (live) | Engagement crítico en live |
| 🔴 MUST | Badges de puntos por slide (finished) | Transparencia del sistema de puntos |
| 🔴 MUST | Sticky save bar | Evita pérdida de cambios |
| 🟡 SHOULD | Tabs internos (3 tabs) | Manejo de scroll + información jerarquizada |
| 🟡 SHOULD | H2H mini (5 partidos) en tab INFO | Context deportivo |
| 🟡 SHOULD | Stats destacadas compactas (live) | Engagement live |
| 🟡 SHOULD | Share del pronóstico | Viralidad |
| 🟢 COULD | Toggle recordatorio | Engagement pre-kickoff |
| 🟢 COULD | Multiplicador visible por slide | Educación del sistema |
| 🟢 COULD | Link a fuente externa | Bajo costo, alto valor percibido |
| ❌ NO (v2) | Stats de otros usuarios | RLS lo bloquea, mejor post-MVP |
| ❌ NO (v2) | Notas personales | Feature de power user, baja demanda |
| ❌ NO (v2) | Formaciones completas | Link a página, no inline |
| ❌ NO (v2) | Simulador "qué pasa si..." | Power user, alto costo |

### 12.3 ¿Algún cambio crítico al diseño?

| Cambio crítico | Por qué | Solución propuesta |
|---|---|---|
| **Carrusel como sección única** sin tabs puede saturar el sheet | Con 3+ torneos y secciones de info, >100vh scroll | Tabs internos (PRONOS / EVENTOS / INFO) |
| **Sticky save bar al final del contenido** (no fixed) | Fixed al viewport tapa el contenido | Sticky al final del container scrollable |
| **El sheet debe soportar "cerrar con confirmación" si hay cambios** | Evita pérdida accidental | Modal de confirmación con 3 opciones: guardar, descartar, cancelar |
| **El header debe ser sticky arriba** (no scrollear) | El score es la referencia constante | Usar `sticky top-0` en el header dentro del sheet |
| **Los inputs de score deben ser autosave con debounce 600ms** | Edición rápida sin fricción | Custom hook `useDebouncedAutoSave` |

### 12.4 Roadmap de implementación

#### **Fase 1: Match Sheet MVP (sprint 1, ~1 semana)**

**Scope mínimo:**
- ✅ Componente `MatchBottomSheet` que envuelve el `BottomSheet` primitive
- ✅ Header con score grande + status contextual (3 estados)
- ✅ Tabs internos (3 tabs)
- ✅ Carrusel de predicciones con fallback para 1/0 torneos
- ✅ Stepper editable con autosave
- ✅ Sticky save bar
- ✅ Cierre con confirmación si hay cambios

**Componentes nuevos:**
- `MatchBottomSheet.tsx`
- `MatchSheetHeader.tsx`
- `MatchSheetTabs.tsx` (tabs internos)
- `MatchPredictionsCarousel.tsx`
- `PredictionSlide.tsx`
- `MatchSheetSaveBar.tsx` (sticky)

**Hooks nuevos:**
- `useDebouncedAutoSave.ts`
- `useSheetConfirmClose.ts` (intercepta cierre con cambios)

**Componentes reutilizados:**
- `BottomSheet` primitive
- `TeamLogo` (existente, refactor para aceptar `size="lg"`)
- `MatchStatusBadge` (extraer de `MatchStatusBar`)
- `StatProgressRow` (de `MatchDetailsTabs`)

**Criterios de aceptación:**
- [ ] Tap en MatchCard abre el sheet con animación
- [ ] El header muestra el score + equipos + estado correctamente en upcoming/live/finished
- [ ] El carrusel tiene 1 visible + peek, dots indicator funcional
- [ ] Stepper con +/− funciona, autosave con debounce 600ms
- [ ] Tabs cambian el contenido con animación
- [ ] Sticky save bar aparece al editar, desaparece al guardar
- [ ] Cerrar con cambios muestra confirmación
- [ ] Funciona en 320px viewport sin overflow horizontal
- [ ] Funciona con VoiceOver / TalkBack

#### **Fase 2: Enrichment (sprint 2, ~1 semana)**

**Scope:**
- ✅ Mini-timeline de eventos en tab EVENTOS
- ✅ Badges de puntos ganados por slide (finished)
- ✅ Stats destacadas compactas
- ✅ H2H mini carrusel
- ✅ Toggle de recordatorio
- ✅ Indicador de multiplicador en header del slide
- ✅ Animación de score change (green pulse al guardar)
- ✅ Countdown al kickoff en header (upcoming)

**Componentes nuevos:**
- `MatchMiniTimeline.tsx`
- `H2HCarousel.tsx`
- `MatchSheetStats.tsx`

**Criterios de aceptación:**
- [ ] Live: aparece el último evento debajo del score
- [ ] Finished: cada slide muestra su badge de puntos
- [ ] Tab EVENTOS tiene timeline + stats
- [ ] Tab INFO tiene H2H + recordatorio toggle
- [ ] Header muestra countdown si faltan <24h

#### **Fase 3: Polish + Desktop + v2 candidates (sprint 3, ~1 semana)**

**Scope:**
- ✅ Variante desktop (modal centrado `max-w-xl`)
- ✅ Share del pronóstico (Web Share API)
- ✅ Link a fuente externa
- ✅ Optimización de performance (memo, lazy load de tabs no activos)
- ✅ Auditoría de accesibilidad completa (Lighthouse, axe)
- ✅ Documentación del componente en Storybook (si existe) o README

**Componentes nuevos:**
- `MatchBottomSheet.desktop.tsx` (o wrapper con prop `variant`)
- `SharePredictionButton.tsx`

**Criterios de aceptación:**
- [ ] Desktop: el sheet aparece como modal centrado
- [ ] Share funciona en iOS Safari, Chrome Android, fallback a clipboard
- [ ] Lighthouse Accessibility score ≥ 95
- [ ] Lighthouse Performance score ≥ 90
- [ ] Bundle size del MatchBottomSheet < 15kb gzipped

---

## 13. Resumen ejecutivo (1 párrafo)

El **Match Bottom Sheet** es una superficie de **edición + lectura profunda** que se abre al tocar una `MatchCard`. Tiene un **header sticky con scoreboard gigante** (logos 64px, score 48-60px en `font-stat-value`), un sistema de **3 tabs internos** (PRONÓSTICOS / EVENTOS / INFO), y dentro del tab PRONÓSTICOS un **carrusel horizontal multi-torneo** (1 slide visible + peek, dots indicator) que permite editar o ver la predicción del usuario para cada torneo en el que participa. Cada slide incluye un **stepper de score** con autosave debounced 600ms, un **selector de ganador de penales** condicional (playoffs con empate), y un **footer contextual** (countdown, recordatorio, puntos ganados). El sheet reutiliza el `BottomSheet` primitive existente (animación slide-up, focus trap, escape, swipe-down, safe-area), respeta los tokens de diseño (primary cyan, tertiary amber, error red, pitch-green), e implementa **stagger animations, autosave, y `prefers-reduced-motion`**. En desktop, se transforma en un **modal centrado de `max-w-xl`** con backdrop blur. La implementación se divide en 3 sprints (MVP → Enrichment → Polish), manteniendo compatibilidad con la `MatchCard` actual sin romper el flujo de scroll del Dashboard.

---

## 14. Próximos pasos para el orquestador

1. ✅ Aprobar este documento.
2. 🔄 Pasar al `@code-architect` para diseñar la arquitectura de componentes y props.
3. 🔄 Pasar al `@react-engineer` para implementar Fase 1.
4. 🔄 Coordinar con `@qa-engineer` para los tests de usabilidad sugeridos en §11.2.
5. 🔄 Coordinar con `@i18n-specialist` para los strings de los nuevos textos (ya hay keys en `es-AR` con voseo, hay que revisar las nuevas).

---

**Fin del documento.**

_Subagente: `@uxui-designer` · Listo para feedback del orquestador._
