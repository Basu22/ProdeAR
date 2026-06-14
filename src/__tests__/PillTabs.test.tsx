/**
 * Tests para `src/components/ui/PillTabs.tsx`.
 *
 * PillTabs es un componente controlado genérico que renderiza un set de pills
 * con soporte para estado activo, disabled, y badge.
 *
 * Cubre:
 * - Render básico de pills con labels
 * - Estado activo (aria-selected, estilos)
 * - Click handler
 * - Estado disabled (no dispara onChange, tooltip "Próximamente")
 * - Badge con live count
 * - Accesibilidad (role="tablist", role="tab", aria-disabled)
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PillTabs } from "../components/ui/PillTabs";

describe("PillTabs", () => {
	const defaultOptions = [
		{ id: "grupos", label: "GRUPOS" },
		{ id: "mejores3ros", label: "LIGA 3ROS" },
		{ id: "dieciseisavos", label: "16VOS", disabled: true },
	] as const;

	it("renderiza todas las pills con sus labels", () => {
		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("GRUPOS")).toBeInTheDocument();
		expect(screen.getByText("LIGA 3ROS")).toBeInTheDocument();
		expect(screen.getByText("16VOS")).toBeInTheDocument();
	});

	it("marca la pill activa con aria-selected=true y el resto con false", () => {
		render(
			<PillTabs
				options={[...defaultOptions]}
				active="mejores3ros"
				onChange={vi.fn()}
			/>,
		);

		const grupos = screen.getByRole("tab", { name: /GRUPOS/i });
		const mejores = screen.getByRole("tab", { name: /LIGA 3ROS/i });
		const dieciseisavos = screen.getByRole("tab", { name: /16VOS/i });

		expect(grupos).toHaveAttribute("aria-selected", "false");
		expect(mejores).toHaveAttribute("aria-selected", "true");
		expect(dieciseisavos).toHaveAttribute("aria-selected", "false");
	});

	it("llama onChange con el id correcto al hacer click en una pill habilitada", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByRole("tab", { name: /LIGA 3ROS/i }));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("mejores3ros");
	});

	it("NO llama onChange al hacer click en una pill disabled", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={onChange}
			/>,
		);

		const dieciseisavos = screen.getByRole("tab", { name: /16VOS/i });

		// El botón está disabled
		expect(dieciseisavos).toBeDisabled();
		// userEvent.click() respeta el atributo disabled y NO dispara el handler
		await user.click(dieciseisavos);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("marca las pills disabled con aria-disabled=true y atributo disabled", () => {
		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		const dieciseisavos = screen.getByRole("tab", { name: /16VOS/i });

		expect(dieciseisavos).toHaveAttribute("aria-disabled", "true");
		expect(dieciseisavos).toBeDisabled();
	});

	it("muestra el título 'Próximamente' en pills disabled", () => {
		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		const dieciseisavos = screen.getByRole("tab", { name: /16VOS/i });
		expect(dieciseisavos).toHaveAttribute("title", "Próximamente");
	});

	it("muestra badge con contador cuando badge > 0", () => {
		render(
			<PillTabs
				options={[
					{ id: "grupos", label: "GRUPOS", badge: 3 },
					{ id: "mejores3ros", label: "LIGA 3ROS" },
				]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		// El badge se renderiza con el número como texto
		const gruposTab = screen.getByRole("tab", { name: /GRUPOS/i });
		expect(gruposTab).toHaveTextContent("3");
		// aria-label descriptivo
		expect(gruposTab).toHaveAccessibleName(/3 en vivo/i);
	});

	it("NO muestra badge cuando badge es 0 o undefined", () => {
		const { container } = render(
			<PillTabs
				options={[
					{ id: "grupos", label: "GRUPOS", badge: 0 },
					{ id: "mejores3ros", label: "LIGA 3ROS" },
				]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		// Contar badges en el container: no debe haber ninguno
		const badges = container.querySelectorAll('[aria-label*="en vivo"]');
		expect(badges).toHaveLength(0);
	});

	it("renderiza role=tablist en el contenedor", () => {
		render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("tablist")).toBeInTheDocument();
	});

	it("aplica className personalizado al contenedor", () => {
		const { container } = render(
			<PillTabs
				options={[...defaultOptions]}
				active="grupos"
				onChange={vi.fn()}
				className="custom-class"
			/>,
		);

		const tablist = container.querySelector('[role="tablist"]');
		expect(tablist).toHaveClass("custom-class");
	});

	it("soporta type safety con genéricos (compila con id union)", () => {
		// Este test es esencialmente de compilación: verifica que el tipado
		// genérico funciona. Si TypeScript no compila, este test no corre.
		type Groups = "grupos" | "mejores3ros" | "dieciseisavos";
		const options: Array<{
			id: Groups;
			label: string;
			disabled?: boolean;
		}> = [
			{ id: "grupos", label: "GRUPOS" },
			{ id: "mejores3ros", label: "LIGA 3ROS" },
			{ id: "dieciseisavos", label: "16VOS", disabled: true },
		];

		const onChange = (id: Groups) => {
			// El tipo de id está restringido al union, no es string
			expect(typeof id).toBe("string");
		};

		render(
			<PillTabs
				options={options}
				active="grupos"
				onChange={onChange}
			/>,
		);

		expect(screen.getByRole("tablist")).toBeInTheDocument();
	});
});
