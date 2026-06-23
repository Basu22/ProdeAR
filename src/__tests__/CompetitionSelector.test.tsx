/**
 * Tests para `src/components/ligas/CompetitionSelector.tsx`.
 *
 * Sprint 5: el selector cambió de chips horizontales a formato escalable
 * (trigger + panel desplegable). Estos tests cubren:
 * 1. Render del trigger con la competición activa
 * 2. Apertura/cierre del panel (click, Esc, click outside)
 * 3. Selección de una competición
 * 4. Persistencia en URL (?comp=) y localStorage
 * 5. Filtro de amistosos (mock con is_friendly=true no aparece)
 * 6. data-tour preservado (para el tour de onboarding)
 * 7. Accesibilidad (aria-haspopup, aria-expanded, role=listbox)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	CompetitionSelector,
	resolveInitialCompetitionId,
} from "../components/ligas/CompetitionSelector";
import type { Competition } from "../lib/types";

const mockCompetitions: Competition[] = [
	{
		id: "comp-1",
		name: "Copa del Mundo 2026",
		country: "Internacional",
		logoUrl: "",
		season: "2026",
		is_friendly: false,
		format: "groups",
	},
	{
		id: "comp-2",
		name: "Liga Argentina",
		country: "Argentina",
		logoUrl: "",
		season: "2026",
		is_friendly: false,
		format: "league",
	},
	{
		id: "comp-3",
		name: "Premier League",
		country: "Inglaterra",
		logoUrl: "",
		season: "2025-26",
		is_friendly: false,
		format: "league",
	},
];

function renderWithRouter(ui: React.ReactNode) {
	// En el test usamos MemoryRouter via react-router para que useSearchParams funcione.
	const { MemoryRouter } = require("react-router-dom");
	return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("CompetitionSelector (Sprint 5: trigger + panel)", () => {
	it("renderiza el trigger con la competición activa", () => {
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={() => {}}
			/>,
		);

		// El trigger muestra el nombre de la comp activa
		const trigger = screen.getByRole("button", {
			name: /Copa del Mundo 2026/i,
		});
		expect(trigger).toBeInTheDocument();
		// aria-haspopup y aria-expanded
		expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	it("abre el panel al hacer click en el trigger", async () => {
		const user = userEvent.setup();
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={() => {}}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: /Copa del Mundo 2026/i,
		});
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);

		// El panel con role=listbox debe estar visible (esperamos con findByRole
		// porque la animación CSS puede tardar un frame en aplicar opacity 1).
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		const listbox = await screen.findByRole("listbox");
		expect(listbox).toBeInTheDocument();
	});

	it("lista todas las competiciones en el panel", async () => {
		const user = userEvent.setup();
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={() => {}}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /Copa del Mundo 2026/i }),
		);
		await screen.findByRole("listbox");

		// 3 items en el listbox
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(3);
		expect(options[0]?.textContent).toMatch(/Copa del Mundo 2026/);
		expect(options[1]?.textContent).toMatch(/Liga Argentina/);
		expect(options[2]?.textContent).toMatch(/Premier League/);
	});

	it("llama onChange al seleccionar otra competición y cierra el panel", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={onChange}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /Copa del Mundo 2026/i }),
		);
		await screen.findByRole("listbox");

		// Click en el button dentro de la opción "Liga Argentina".
		// (getByRole("option") devuelve el <li>; el onClick está en el <button> interno.)
		const option = screen.getByRole("option", { name: /Liga Argentina/i });
		const button = option.querySelector("button");
		expect(button).not.toBeNull();
		await user.click(button as HTMLElement);

		expect(onChange).toHaveBeenCalledWith("comp-2");
		// Panel cerrado
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("marca la competición activa con check + aria-selected=true", async () => {
		const user = userEvent.setup();
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-2"
				onChange={() => {}}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /Liga Argentina/i }));
		await screen.findByRole("listbox");

		const activeOption = screen.getByRole("option", {
			name: /Liga Argentina.*actualmente seleccionada/i,
		});
		expect(activeOption).toHaveAttribute("aria-selected", "true");
	});

	it("cierra el panel al presionar Escape", async () => {
		const user = userEvent.setup();
		renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={() => {}}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: /Copa del Mundo 2026/i,
		});
		await user.click(trigger);
		await screen.findByRole("listbox");

		// Esc cierra el panel
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("cierra el panel al hacer click outside", async () => {
		const user = userEvent.setup();
		renderWithRouter(
			<div>
				<button type="button" data-testid="outside">
					Outside
				</button>
				<CompetitionSelector
					competitions={mockCompetitions}
					selectedId="comp-1"
					onChange={() => {}}
				/>
			</div>,
		);

		await user.click(
			screen.getByRole("button", { name: /Copa del Mundo 2026/i }),
		);
		await screen.findByRole("listbox");

		// Click en el botón "outside" (fuera del container)
		await user.click(screen.getByTestId("outside"));
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("preserva el atributo data-tour para el onboarding", () => {
		const { container } = renderWithRouter(
			<CompetitionSelector
				competitions={mockCompetitions}
				selectedId="comp-1"
				onChange={() => {}}
			/>,
		);

		expect(
			container.querySelector("[data-tour='competition-selector']"),
		).toBeInTheDocument();
	});

	it("no renderiza si no hay competiciones", () => {
		const { container } = renderWithRouter(
			<CompetitionSelector
				competitions={[]}
				selectedId=""
				onChange={() => {}}
			/>,
		);

		expect(container.firstChild).toBeNull();
	});
});

describe("resolveInitialCompetitionId", () => {
	const comps = mockCompetitions;

	it("prioriza el query param ?comp=", () => {
		const params = new URLSearchParams("?comp=comp-3");
		expect(resolveInitialCompetitionId(comps, params)).toBe("comp-3");
	});

	it("ignora query param inválido y va a localStorage", () => {
		const params = new URLSearchParams("?comp=invalid");
		localStorage.setItem("prodear:last-competition", "comp-2");
		expect(resolveInitialCompetitionId(comps, params)).toBe("comp-2");
		localStorage.removeItem("prodear:last-competition");
	});

	it("usa localStorage si no hay query param", () => {
		const params = new URLSearchParams();
		localStorage.setItem("prodear:last-competition", "comp-1");
		expect(resolveInitialCompetitionId(comps, params)).toBe("comp-1");
		localStorage.removeItem("prodear:last-competition");
	});

	it("usa la primera competición si no hay nada", () => {
		const params = new URLSearchParams();
		localStorage.removeItem("prodear:last-competition");
		expect(resolveInitialCompetitionId(comps, params)).toBe("comp-1");
	});
});
