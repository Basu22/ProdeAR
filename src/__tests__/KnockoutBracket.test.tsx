/**
 * Tests para `src/components/tournament/KnockoutBracket.tsx`.
 *
 * KnockoutBracket renderiza el grid de 16 partidos de Dieciseisavos con:
 * - Header con "X / 16 cruces definidos" (progress)
 * - Cada match tiene slotA y slotB, con estados TBD o resolved
 * - TBD slots: dashed border + ícono help + "Por definir"
 * - Resolved slots: logo + nombre del equipo + label del tipo (1°X, 2°X, 3°#N)
 * - Live slots: ring rojo + LiveBadge compact
 * - Leyenda al final con los tipos de slot
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnockoutBracket } from "../components/tournament/KnockoutBracket";
import type {
	BracketMatch,
	BracketSlot,
	KnockoutBracket as KnockoutBracketType,
} from "../lib/worldCupGroups";

/**
 * Helper: crea un BracketSlot mock.
 */
function makeSlot(
	overrides: Partial<BracketSlot> = {},
): BracketSlot {
	return {
		slotType: "1st",
		groupLetter: "A",
		bestThirdRank: null,
		teamName: "México",
		teamLogo: "https://flagcdn.com/w40/mx.png",
		isLive: false,
		...overrides,
	};
}

/**
 * Helper: crea un BracketMatch mock.
 */
function makeMatch(
	position: number,
	overrides: Partial<BracketMatch> = {},
): BracketMatch {
	return {
		id: `R32-${position}`,
		position,
		slotA: makeSlot({ groupLetter: "A", teamName: "México" }),
		slotB: makeSlot({
			slotType: "2nd",
			groupLetter: "B",
			teamName: "Canadá",
		}),
		isComplete: true,
		...overrides,
	};
}

/**
 * Helper: crea un KnockoutBracket con N matches (todos resolved por default).
 */
function makeBracket(
	matchCount: number,
	completedCount: number = matchCount,
): KnockoutBracketType {
	const matches: BracketMatch[] = Array.from({ length: matchCount }, (_, i) =>
		makeMatch(i + 1, {
			isComplete: i < completedCount,
		}),
	);
	return {
		roundName: "Dieciseisavos de final",
		matches,
		completedMatches: completedCount,
		totalMatches: matchCount,
	};
}

describe("KnockoutBracket", () => {
	it("renderiza el nombre de la ronda en el header", () => {
		render(<KnockoutBracket bracket={makeBracket(16)} />);
		expect(screen.getByText("Dieciseisavos de final")).toBeInTheDocument();
	});

	it("muestra el progreso X / totalMatches", () => {
		const { container } = render(
			<KnockoutBracket bracket={makeBracket(16, 10)} />,
		);

		expect(container.textContent).toMatch(/10\s*\/\s*16/);
	});

	it("renderiza los 16 partidos", () => {
		const { container } = render(
			<KnockoutBracket bracket={makeBracket(16)} />,
		);

		// Cada match es un <article>. Contar.
		const articles = container.querySelectorAll("article");
		expect(articles.length).toBe(16);
	});

	it("muestra 'R32 · N' en el header de cada match", () => {
		const { container } = render(
			<KnockoutBracket bracket={makeBracket(16)} />,
		);

		// Verificar que aparece "R32 · 1" hasta "R32 · 16"
		for (let i = 1; i <= 16; i++) {
			expect(container.textContent).toContain(`R32 · ${i}`);
		}
	});

	it("muestra 'Definido' para matches completos y 'Pendiente' para TBD", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, { isComplete: true }),
				makeMatch(2, {
					isComplete: false,
					slotB: makeSlot({ teamName: null }),
				}),
			],
			completedMatches: 1,
			totalMatches: 2,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		// Match 1 (complete): debe tener "Definido"
		const match1 = container.querySelectorAll("article")[0];
		expect(match1?.textContent).toContain("Definido");
		expect(match1?.textContent).not.toContain("Pendiente");

		// Match 2 (incomplete): debe tener "Pendiente"
		const match2 = container.querySelectorAll("article")[1];
		expect(match2?.textContent).toContain("Pendiente");
		expect(match2?.textContent).not.toContain("Definido");
	});

	it("renderiza slots TBD con dashed border, ícono help y 'Por definir'", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, {
					isComplete: false,
					slotA: makeSlot({ teamName: null, teamLogo: null }),
					slotB: makeSlot({ teamName: null, teamLogo: null }),
				}),
			],
			completedMatches: 0,
			totalMatches: 1,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		const match = container.querySelector("article");
		expect(match).toHaveClass("border-dashed");

		// Ícono help presente
		const helpIcons = match?.querySelectorAll(".material-symbols-outlined");
		expect(helpIcons && helpIcons.length).toBeGreaterThanOrEqual(1);

		// Texto "Por definir" presente
		expect(match?.textContent).toContain("Por definir");
	});

	it("renderiza slots resolved con logo del equipo", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, {
					isComplete: true,
					slotA: makeSlot({
						teamName: "México",
						teamLogo: "https://flagcdn.com/w40/mx.png",
					}),
				}),
			],
			completedMatches: 1,
			totalMatches: 1,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		const img = container.querySelector("article img");
		expect(img).toHaveAttribute("src", "https://flagcdn.com/w40/mx.png");
	});

	it("muestra label del tipo de slot (1°X, 2°X, 3°#N)", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, {
					isComplete: true,
					slotA: makeSlot({ slotType: "1st", groupLetter: "A" }),
					slotB: makeSlot({ slotType: "2nd", groupLetter: "B" }),
				}),
				makeMatch(13, {
					isComplete: true,
					slotA: makeSlot({
						slotType: "best3rd",
						groupLetter: "A",
						bestThirdRank: 1,
					}),
					slotB: makeSlot({
						slotType: "best3rd",
						groupLetter: "B",
						bestThirdRank: 2,
					}),
				}),
			],
			completedMatches: 2,
			totalMatches: 2,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		expect(container.textContent).toContain("1° A");
		expect(container.textContent).toContain("2° B");
		expect(container.textContent).toContain("3° #1");
		expect(container.textContent).toContain("3° #2");
	});

	it("aplica ring de live (ring-error) cuando el slot está en vivo", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, {
					isComplete: true,
					slotA: makeSlot({ isLive: true, teamName: "México" }),
				}),
			],
			completedMatches: 1,
			totalMatches: 1,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		// Buscar el div del slotA (primera slot de la primera match)
		const slots = container.querySelectorAll("article > div");
		expect(slots[1]).toHaveClass("ring-error/40");
	});

	it("muestra leyenda con los 3 tipos de slot (1°, 2°, 3°#N)", () => {
		render(<KnockoutBracket bracket={makeBracket(16)} />);

		expect(screen.getByText("Primero del grupo")).toBeInTheDocument();
		expect(screen.getByText("Segundo del grupo")).toBeInTheDocument();
		expect(screen.getByText(/Mejor tercero #N/i)).toBeInTheDocument();
	});

	it("renderiza aria-label descriptivo en cada match", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, {
					isComplete: true,
					slotA: makeSlot({ teamName: "Argentina" }),
					slotB: makeSlot({ teamName: "Brasil" }),
				}),
				makeMatch(2, {
					isComplete: false,
					slotA: makeSlot({ teamName: null }),
					slotB: makeSlot({ teamName: "Chile" }),
				}),
			],
			completedMatches: 1,
			totalMatches: 2,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		const articles = container.querySelectorAll("article");
		expect(articles[0]?.getAttribute("aria-label")).toContain("Argentina");
		expect(articles[0]?.getAttribute("aria-label")).toContain("Brasil");
		expect(articles[1]?.getAttribute("aria-label")).toContain("TBD");
		expect(articles[1]?.getAttribute("aria-label")).toContain("Chile");
	});

	it("renderiza el match con la opacidad reducida si NO está completo", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [
				makeMatch(1, { isComplete: false }),
			],
			completedMatches: 0,
			totalMatches: 1,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		const match = container.querySelector("article");
		expect(match).toHaveClass("opacity-70");
	});

	it("NO aplica opacity-70 a matches completos", () => {
		const bracket: KnockoutBracketType = {
			roundName: "Dieciseisavos de final",
			matches: [makeMatch(1, { isComplete: true })],
			completedMatches: 1,
			totalMatches: 1,
		};
		const { container } = render(<KnockoutBracket bracket={bracket} />);

		const match = container.querySelector("article");
		expect(match).not.toHaveClass("opacity-70");
	});
});
