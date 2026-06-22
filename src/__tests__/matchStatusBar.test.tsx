import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchStatusBar } from "../components/match/MatchStatusBar";

// Mock useCountdown para que sea determinístico en tests.
// Default: kickoff lejano (sin counter al kickoff, "Pendiente").
vi.mock("../hooks/useCountdown", () => ({
	useCountdown: () => ({
		msRemaining: 24 * 60 * 60 * 1000, // 24h
		formatted: "1d 0h",
		isExpired: false,
	}),
}));

const FUTURE_KICKOFF = new Date(Date.now() + 3600_000).toISOString(); // +1h

describe("MatchStatusBar — formations badge (Sprint v1.1)", () => {
	it("muestra badge '11' cuando hasLineupsUpcoming=true en state=predicted_locked", () => {
		render(
			<MatchStatusBar
				state="predicted_locked"
				kickOff={FUTURE_KICKOFF}
				predictionCount={1}
				hasLineupsUpcoming
			/>,
		);
		expect(
			screen.getByLabelText("Formación titular disponible"),
		).toBeInTheDocument();
	});

	it("muestra badge '11' cuando hasLineupsUpcoming=true en state=pending_action (isFullyPredicted=false)", () => {
		render(
			<MatchStatusBar
				state="pending_action"
				kickOff={FUTURE_KICKOFF}
				isFullyPredicted={false}
				hasLineupsUpcoming
			/>,
		);
		expect(
			screen.getByLabelText("Formación titular disponible"),
		).toBeInTheDocument();
	});

	it("NO muestra badge cuando hasLineupsUpcoming=false (backward compat)", () => {
		render(
			<MatchStatusBar
				state="predicted_locked"
				kickOff={FUTURE_KICKOFF}
				predictionCount={1}
			/>,
		);
		expect(
			screen.queryByLabelText("Formación titular disponible"),
		).not.toBeInTheDocument();
	});

	it("NO muestra badge en state=live aunque hasLineupsUpcoming=true (live es live)", () => {
		// Renderiza el badge solo si se llega al bloque de "predicted_locked"
		// o de "isFullyPredicted" o del counter. En live, el componente
		// retorna antes, así que el badge nunca se renderiza.
		render(
			<MatchStatusBar
				state="live"
				kickOff={FUTURE_KICKOFF}
				hasLineupsUpcoming
			/>,
		);
		expect(
			screen.queryByLabelText("Formación titular disponible"),
		).not.toBeInTheDocument();
	});

	it("NO muestra badge en state=finished aunque hasLineupsUpcoming=true", () => {
		render(
			<MatchStatusBar
				state="finished"
				kickOff={FUTURE_KICKOFF}
				hasLineupsUpcoming
			/>,
		);
		expect(
			screen.queryByLabelText("Formación titular disponible"),
		).not.toBeInTheDocument();
	});

	it("el badge tiene title descriptivo para hover/tap largo", () => {
		render(
			<MatchStatusBar
				state="predicted_locked"
				kickOff={FUTURE_KICKOFF}
				predictionCount={1}
				hasLineupsUpcoming
			/>,
		);
		const badge = screen.getByLabelText("Formación titular disponible");
		expect(badge).toHaveAttribute(
			"title",
			"Formación titular disponible — tocá para ver",
		);
	});
});
