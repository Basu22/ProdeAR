import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeagueTable } from "../components/ligas/LeagueTable";
import type { LeagueStanding } from "../lib/types";

function makeStanding(overrides: Partial<LeagueStanding> = {}): LeagueStanding {
	return {
		teamName: "Argentina",
		logo: null,
		pj: 0,
		pg: 0,
		pe: 0,
		pp: 0,
		gf: 0,
		gc: 0,
		dg: 0,
		pts: 0,
		isLive: false,
		position: 1,
		...overrides,
	};
}

describe("LeagueTable", () => {
	const noStandings: LeagueStanding[] = [];

	it("renderiza el título 'Tabla de posiciones' cuando hay standings", () => {
		const standings = [makeStanding({ teamName: "Boca", position: 1 })];
		render(<LeagueTable standings={standings} />);
		expect(screen.getByText("Tabla de posiciones")).toBeInTheDocument();
	});

	it("muestra empty state cuando no hay standings", () => {
		render(<LeagueTable standings={noStandings} />);
		expect(screen.getByText("Tabla vacía")).toBeInTheDocument();
		expect(
			screen.getByText(/Aún no hay partidos cargados para esta liga/),
		).toBeInTheDocument();
	});

	it("renderiza los 3 equipos con códigos FIFA", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Boca Juniors", pts: 6, position: 1 }),
			makeStanding({ teamName: "River Plate", pts: 4, position: 2 }),
			makeStanding({ teamName: "Racing Club", pts: 1, position: 3 }),
		];
		render(<LeagueTable standings={standings} />);
		// Fallback a primeras 3 letras en mayúsculas (no hay mapping FIFA en
		// COUNTRY_CODES para equipos de LPF, así que se usa el fallback).
		expect(screen.getByText("BOC")).toBeInTheDocument();
		expect(screen.getByText("RIV")).toBeInTheDocument();
		expect(screen.getByText("RAC")).toBeInTheDocument();
	});

	it("muestra PTS, J y +/- correctamente", () => {
		const standings: LeagueStanding[] = [
			makeStanding({
				teamName: "Boca",
				pts: 6,
				pj: 2,
				pg: 2,
				pe: 0,
				pp: 0,
				gf: 4,
				gc: 0,
				dg: 4,
				position: 1,
			}),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("BOC").closest("tr");
		expect(row).toHaveTextContent("6");
		expect(row).toHaveTextContent("2");
		expect(row).toHaveTextContent("4-0");
	});

	it("rank badge verde para posición 1", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Boca", pts: 6, position: 1 }),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("BOC").closest("tr");
		const badge = row?.querySelector("td:first-child > div");
		expect(badge).toHaveClass("bg-tertiary");
	});

	it("rank badge verde para posiciones 2-4", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "River", pts: 4, position: 2 }),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("RIV").closest("tr");
		const badge = row?.querySelector("td:first-child > div");
		expect(badge).toHaveClass("bg-emerald-500");
	});

	it("rank badge ámbar para posiciones 5-6", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Racing", pts: 2, position: 5 }),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("RAC").closest("tr");
		const badge = row?.querySelector("td:first-child > div");
		expect(badge).toHaveClass("bg-amber-500");
	});

	it("rank badge gris para posición 7+", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "San Lorenzo", pts: 0, position: 20 }),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("SAN").closest("tr");
		const badge = row?.querySelector("td:first-child > div");
		expect(badge).toHaveClass("bg-white/10");
	});

	it("color verde cuando gf > gc, rojo cuando gf < gc, neutral cuando gf == gc", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Win", gf: 3, gc: 0, position: 1 }),
			makeStanding({ teamName: "Lose", gf: 0, gc: 2, position: 2 }),
			makeStanding({ teamName: "Draw", gf: 1, gc: 1, position: 3 }),
		];
		render(<LeagueTable standings={standings} />);
		expect(screen.getByText("3-0")).toHaveClass("text-emerald-400");
		expect(screen.getByText("0-2")).toHaveClass("text-red-400");
		expect(screen.getByText("1-1")).toHaveClass("text-on-surface-variant");
	});

	it("renderiza LIVE badge inline para equipos con isLive=true", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Boca", isLive: true, position: 1 }),
		];
		render(<LeagueTable standings={standings} />);
		expect(screen.getByText("LIVE")).toBeInTheDocument();
	});

	it("NO renderiza LIVE badge cuando isLive=false", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Boca", isLive: false, position: 1 }),
		];
		render(<LeagueTable standings={standings} />);
		expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
	});

	it("renderiza ícono de fallback cuando logo es null", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "Boca", logo: null, position: 1 }),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("BOC").closest("tr");
		const icon = row?.querySelector(".material-symbols-outlined");
		expect(icon).toBeInTheDocument();
	});

	it("renderiza logo cuando está disponible", () => {
		const standings: LeagueStanding[] = [
			makeStanding({
				teamName: "Boca",
				logo: "https://example.com/boca.png",
				position: 1,
			}),
		];
		render(<LeagueTable standings={standings} />);
		const row = screen.getByText("BOC").closest("tr");
		const img = row?.querySelector("img");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "https://example.com/boca.png");
	});

	it("incluye el nombre completo en el title del código FIFA (tooltip)", () => {
		const standings: LeagueStanding[] = [
			makeStanding({ teamName: "River Plate", position: 1 }),
		];
		render(<LeagueTable standings={standings} />);
		const code = screen.getByText("RIV");
		expect(code).toHaveAttribute("title", "River Plate");
	});
});
