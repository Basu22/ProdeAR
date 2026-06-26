/**
 * Tests para `src/components/ligas/WorldCupBestThirdsSection.tsx`.
 *
 * Sprint 3 — TDD.
 * Cobertura (4 tests):
 * 1. Renderiza BestThirdsTable cuando hay partidos finalizados
 * 2. Muestra placeholder cuando no hay partidos finalizados
 * 3. Pasa los datos de bestThirds correctamente
 * 4. Se actualiza cuando nuevos partidos finalizan (reactividad)
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Match } from "../lib/types";
import type { BestThirdsTable } from "../lib/worldCupGroups";
import { WorldCupBestThirdsSection } from "../components/ligas/WorldCupBestThirdsSection";

// ============================================================================
// HELPERS
// ============================================================================

function makeMatch(overrides: Partial<Match> = {}): Match {
	return {
		id: "m-test",
		competitionId: "1",
		homeTeam: "Argentina",
		awayTeam: "Brasil",
		homeLogo: null,
		awayLogo: null,
		matchday: 1,
		kickOff: "2026-06-11T18:00:00Z",
		homeScore: null,
		awayScore: null,
		penaltyWinner: null,
		stageName: "Group A",
		stageMultiplier: 1,
		status: "not_started",
		...overrides,
	};
}

function makeBestThirds(): BestThirdsTable {
	const standings = Array.from({ length: 12 }, (_, i) => ({
		teamName: `3°-rank${i + 1}`,
		logo: null,
		pj: 3,
		pg: 0,
		pe: 0,
		pp: 0,
		gf: 2,
		gc: 0,
		dg: 0,
		pts: 6 - i * 0.1,
		isLive: false,
		groupLetter: String.fromCharCode(65 + (i % 12)),
		qualifies: i < 8,
		rank: i + 1,
	}));
	return {
		standings,
		qualifyCount: 8,
		cutoffIndex: 7,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("WorldCupBestThirdsSection", () => {
	it("renders BestThirdsTable when at least one group match is finished", () => {
		const finishedMatches: Match[] = [
			makeMatch({
				id: "m-1",
				status: "finished",
				stageName: "Group A",
				stageMultiplier: 1,
				homeScore: 2,
				awayScore: 1,
			}),
		];

		render(
			<WorldCupBestThirdsSection
				bestThirds={makeBestThirds()}
				matches={finishedMatches}
			/>,
		);

		// El header "Mejores Terceros" debe estar visible (puede aparecer
		// en el h2 del section y también en el header interno del BestThirdsTable)
		const mejoresTercerosElements = screen.getAllByText(/mejores terceros/i);
		expect(mejoresTercerosElements.length).toBeGreaterThan(0);
		// El texto "8 mejores" debe estar presente (puede aparecer en el header
		// contextual del section Y en el header interno del BestThirdsTable)
		const ochoMejoresElements = screen.getAllByText(/8 mejores/i);
		expect(ochoMejoresElements.length).toBeGreaterThan(0);
		// El placeholder NO debe estar
		expect(
			screen.queryByText(/se activa cuando se juegue/i),
		).not.toBeInTheDocument();
	});

	it("shows placeholder when no matches are finished", () => {
		const notStartedMatches: Match[] = [
			makeMatch({ id: "m-1", status: "not_started" }),
		];

		render(
			<WorldCupBestThirdsSection
				bestThirds={makeBestThirds()}
				matches={notStartedMatches}
			/>,
		);

		// El placeholder debe estar visible
		expect(screen.getByText(/se activa cuando se juegue/i)).toBeInTheDocument();
		// El header "Mejores Terceros" debe estar visible (en el placeholder también)
		expect(screen.getByText(/liga de mejores terceros/i)).toBeInTheDocument();
		// El texto "8 mejores" NO debe estar (solo aparece en la versión con datos)
		expect(screen.queryByText(/8 mejores/i)).not.toBeInTheDocument();
	});

	it("passes bestThirds data correctly to the table (top 8 marked as qualified)", () => {
		const finishedMatches: Match[] = [
			makeMatch({
				id: "m-1",
				status: "finished",
				stageName: "Group A",
				stageMultiplier: 1,
			}),
		];

		const { container } = render(
			<WorldCupBestThirdsSection
				bestThirds={makeBestThirds()}
				matches={finishedMatches}
			/>,
		);

		// Sprint 5: ya no hay badges "Clasifica" / "Fuera" en la tabla.
		// El clasificado/eliminado se comunica por:
		//   1. Sin opacidad (opacity-60) en filas 1-8 → clasificadas
		//   2. Con opacidad (opacity-60) en filas 9-12 → eliminadas
		const tbody = container.querySelector("tbody");
		if (!tbody) throw new Error("No tbody found");
		const rows = tbody.querySelectorAll("tr");

		// Filas 1-8 NO deben tener opacity-60
		for (let i = 0; i < 8; i++) {
			expect(rows[i]).not.toHaveClass("opacity-60");
		}
		// Filas 9-12 SÍ deben tener opacity-60
		for (let i = 8; i < 12; i++) {
			expect(rows[i]).toHaveClass("opacity-60");
		}

		// La línea de corte (border-b-error) debe estar en la fila 8
		expect(rows[7]).toHaveClass("border-b-2");
		expect(rows[7]).toHaveClass("border-b-error");
	});

	it("ignores knockout matches when determining visibility (only group finished matches count)", () => {
		// Solo hay un partido de knockout finalizado, ninguno de grupo
		const matches: Match[] = [
			makeMatch({
				id: "m-r32-1",
				status: "finished",
				stageName: "Round of 32",
				stageMultiplier: 2,
				homeScore: 2,
				awayScore: 1,
			}),
		];

		render(
			<WorldCupBestThirdsSection
				bestThirds={makeBestThirds()}
				matches={matches}
			/>,
		);

		// El placeholder debe estar visible (porque ningún partido de GRUPO está finished)
		expect(screen.getByText(/se activa cuando se juegue/i)).toBeInTheDocument();
	});
});
