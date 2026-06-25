/**
 * BracketConnectors — SVG overlay que dibuja las líneas conectoras
 * del árbol de eliminatorias entre rondas adyacentes.
 *
 * ============================================================================
 * SPRINT 5D+ — EFECTO VISUAL DEL ÁRBOL
 * ============================================================================
 * Renderiza paths L-shape ("M sx sy H midX V ty H tx") que conectan cada
 * par de partidos de la ronda anterior (R32-1, R32-2) con su partido
 * destino en la ronda siguiente (R16-1).
 *
 * Ejemplo visual:
 *   R32-1 ─┐
 *          ├──► R16-1
 *   R32-2 ─┘
 *
 * La línea va desde el borde derecho de R32-1, hace un quiebre vertical
 * al medio (donde está R16-1), y termina en el borde izquierdo de R16-1.
 * El mismo patrón se aplica para R16→QF, QF→SF, SF→F.
 *
 * ============================================================================
 * ESTADOS DE LAS LÍNEAS
 * ============================================================================
 * - TBD (source o target pendiente): `stroke-dasharray: 4 4`, opacity 0.35
 * - Resuelto: sólido, opacity 0.6
 * - Live (alguno de los source en vivo): sólido + pulse animation
 * - TBD destino: dashed opacity 0.25 (más tenue)
 *
 * ============================================================================
 * PERFORMANCE
 * ============================================================================
 * - Un único `<svg>` overlay con `pointer-events: none` (no interfiere con
 *   clicks en los cards)
 * - ResizeObserver + scroll listener throttled con requestAnimationFrame
 * - Recalcula coords solo cuando el viewport cambia de tamaño o el scroll
 *   supera 1 frame de inactividad
 *
 * ============================================================================
 * 3RD SUB-CARD
 * ============================================================================
 * 3RD no tiene líneas conectoras en esta iteración (decidido con el
 * usuario). Vive dentro de la columna F como sub-card separada por
 * `ThirdPlaceSeparator`.
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * <div ref={scrollRef} className="relative ...">
 *   <BracketConnectors containerRef={scrollRef} rounds={rounds} />
 *   {/* columns con cards *\/}
 * </div>
 * ```
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import type { ExtendedBracketMatch, KnockoutRound } from "../../lib/bracketTypes";

// ============================================================================
// TYPES
// ============================================================================

interface ConnectorLine {
	/** ID del match destino (ej. "R16-1") */
	targetId: string;
	/** Path SVG (formato "M x y H mx V y H x") */
	path: string;
	/** Estado de la línea (afecta stroke-dasharray, opacity, animation) */
	state: "tbd" | "resolved" | "live" | "tbd-dest";
}

interface BracketConnectorsProps {
	containerRef: RefObject<HTMLDivElement | null>;
	rounds: KnockoutRound[];
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Calcula las líneas conectoras para un par de rondas adyacentes
 * (R32→R16, R16→QF, etc.). Itera sobre los matches destino y busca
 * sus 2 source matches en la ronda anterior.
 */
function computeLinesForRoundPair(
	targetRound: KnockoutRound,
	sourceRound: KnockoutRound,
	containerRect: DOMRect,
): ConnectorLine[] {
	const lines: ConnectorLine[] = [];
	const sourceById = new Map<string, ExtendedBracketMatch>();
	for (const m of sourceRound.matches) {
		sourceById.set(m.id, m);
	}

	for (const target of targetRound.matches) {
		// Cada slot del target tiene un sourceMatchId (null en R32).
		const srcIdA = target.slotA.sourceMatchId;
		const srcIdB = target.slotB.sourceMatchId;
		if (!srcIdA || !srcIdB) continue;

		const srcA = sourceById.get(srcIdA);
		const srcB = sourceById.get(srcIdB);
		if (!srcA || !srcB) continue;

		// Buscar las cards en el DOM por data-card-position
		const targetEl = document.querySelector(
			`[data-round="${targetRound.meta.abbr}"] [data-card-position="${target.position}"]`,
		);
		const sourceAEl = document.querySelector(
			`[data-round="${sourceRound.meta.abbr}"] [data-card-position="${srcA.position}"]`,
		);
		const sourceBEl = document.querySelector(
			`[data-round="${sourceRound.meta.abbr}"] [data-card-position="${srcB.position}"]`,
		);
		if (!targetEl || !sourceAEl || !sourceBEl) continue;

		const tRect = targetEl.getBoundingClientRect();
		const saRect = sourceAEl.getBoundingClientRect();
		const sbRect = sourceBEl.getBoundingClientRect();

		// Coordenadas relativas al contenedor del carrusel
		const tx = tRect.left - containerRect.left;
		const ty = tRect.top - containerRect.top + tRect.height / 2;
		const sax = saRect.right - containerRect.left;
		const say = saRect.top - containerRect.top + saRect.height / 2;
		const sbx = sbRect.right - containerRect.left;
		const sby = sbRect.top - containerRect.top + sbRect.height / 2;

		// Forma "trident" / "comb" clásica de bracket:
		//   sourceA ─┐
		//            ├──► target
		//   sourceB ─┘
		// 4 subpaths: sourceA→midX, sourceB→midX, midX vertical, midX→target
		const midX = (sax + tx) / 2;
		const path =
			`M ${sax} ${say} H ${midX} ` +
			`M ${sbx} ${sby} H ${midX} ` +
			`M ${midX} ${Math.min(say, sby)} V ${Math.max(say, sby)} ` +
			`M ${midX} ${ty} H ${tx}`;

		// Determinar el estado
		const isSourceTbd =
			!srcA.slotA.teamName || !srcA.slotB.teamName ||
			!srcB.slotA.teamName || !srcB.slotB.teamName;
		const isTargetTbd = !target.slotA.teamName || !target.slotB.teamName;
		const isLive =
			srcA.slotA.isLive || srcA.slotB.isLive ||
			srcB.slotA.isLive || srcB.slotB.isLive;

		let state: ConnectorLine["state"];
		if (isTargetTbd) state = "tbd-dest";
		else if (isLive) state = "live";
		else if (isSourceTbd) state = "tbd";
		else state = "resolved";

		lines.push({ targetId: target.id, path, state });
	}

	return lines;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BracketConnectors({
	containerRef,
	rounds,
}: BracketConnectorsProps) {
	const [lines, setLines] = useState<ConnectorLine[]>([]);
	const lastUpdateRef = useRef(0);
	const rafRef = useRef<number | null>(null);

	// Recalcular las líneas (con throttle via rAF)
	const recalculate = () => {
		const container = containerRef.current;
		if (!container) {
			setLines([]);
			return;
		}

		const containerRect = container.getBoundingClientRect();
		const allLines: ConnectorLine[] = [];

		// Para cada par de rondas adyacentes (R32→R16, R16→QF, QF→SF, SF→F)
		for (let i = 0; i < rounds.length - 1; i++) {
			const sourceRound = rounds[i]!;
			const targetRound = rounds[i + 1]!;
			allLines.push(
				...computeLinesForRoundPair(
					targetRound,
					sourceRound,
					containerRect,
				),
			);
		}

		setLines(allLines);
		lastUpdateRef.current = Date.now();
	};

	// Throttled recalculate via rAF
	const scheduleRecalculate = () => {
		if (rafRef.current !== null) return; // ya hay un rAF pendiente
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			recalculate();
		});
	};

	// Recalcular en mount, resize, y scroll
	useEffect(() => {
		recalculate();

		const container = containerRef.current;
		if (!container) return;

		// Scroll listener (pasivo, throttled con rAF)
		const onScroll = () => {
			scheduleRecalculate();
		};
		container.addEventListener("scroll", onScroll, { passive: true });

		// ResizeObserver
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => {
				scheduleRecalculate();
			});
			resizeObserver.observe(container);
			// Observar también las cards (pueden cambiar de altura si TBD→resolved)
			container.querySelectorAll("[data-card-position]").forEach((el) => {
				resizeObserver?.observe(el);
			});
		}

		return () => {
			container.removeEventListener("scroll", onScroll);
			resizeObserver?.disconnect();
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [containerRef, rounds]);

	if (lines.length === 0) return null;

	return (
		<svg
			className="absolute inset-0 pointer-events-none"
			aria-hidden="true"
			role="presentation"
			style={{ width: "100%", height: "100%" }}
		>
			{lines.map((line) => {
				const style: React.CSSProperties = {};
				let className = "bracket-line";
				switch (line.state) {
					case "tbd":
						className += " bracket-line-tbd";
						style.strokeDasharray = "4 4";
						style.strokeOpacity = 0.35;
						break;
					case "tbd-dest":
						className += " bracket-line-tbd-dest";
						style.strokeDasharray = "4 4";
						style.strokeOpacity = 0.25;
						break;
					case "live":
						className += " bracket-line-live";
						style.strokeOpacity = 1.0;
						break;
					case "resolved":
						className += " bracket-line-resolved";
						style.strokeOpacity = 0.6;
						break;
				}
				return (
					<path
						key={line.targetId}
						d={line.path}
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						vectorEffect="non-scaling-stroke"
						strokeLinecap="round"
						style={style}
						className={className}
					/>
				);
			})}
		</svg>
	);
}
