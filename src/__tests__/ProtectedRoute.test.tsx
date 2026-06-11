import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { useAuthStore } from "../stores/authStore";

vi.mock("../lib/supabase", () => ({
	isSupabaseConfigured: false,
	supabase: {},
}));

function LocationDisplay() {
	const location = useLocation();
	return (
		<span data-testid="location-display">
			{location.pathname}
			{location.search}
		</span>
	);
}

function renderProtected(initialPath: string) {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route element={<ProtectedRoute />}>
					<Route
						path="/dashboard"
						element={<div data-testid="protected-content">Dashboard</div>}
					/>
					<Route
						path="/join"
						element={<div data-testid="protected-content">Join</div>}
					/>
				</Route>
				<Route path="/" element={<LocationDisplay />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("ProtectedRoute", () => {
	beforeEach(() => {
		useAuthStore.setState({ user: null, isLoading: true, error: null });
	});

	afterEach(() => {
		useAuthStore.setState({ user: null, isLoading: false, error: null });
	});

	it("should show loading spinner while auth is loading", () => {
		useAuthStore.setState({ user: null, isLoading: true, error: null });
		renderProtected("/dashboard");
		expect(screen.getByText("Cargando cancha...")).toBeInTheDocument();
	});

	it("should redirect to landing when user is not authenticated", () => {
		useAuthStore.setState({ user: null, isLoading: false, error: null });
		renderProtected("/dashboard");
		expect(screen.getByTestId("location-display")).toBeInTheDocument();
	});

	it("should preserve query params when redirecting to landing", async () => {
		useAuthStore.setState({ user: null, isLoading: false, error: null });
		renderProtected("/join?code=AR-TEST");
		await waitFor(() => {
			const loc = screen.getByTestId("location-display");
			expect(loc.textContent).toBe("/?code=AR-TEST");
		});
	});

	it("should render protected content when user is authenticated", () => {
		useAuthStore.setState({
			user: {
				id: "u1",
				email: "test@test.com",
				displayName: "Test",
				avatarUrl: null,
			},
			isLoading: false,
			error: null,
		});
		renderProtected("/dashboard");
		expect(screen.getByTestId("protected-content")).toBeInTheDocument();
		expect(screen.getByText("Dashboard")).toBeInTheDocument();
	});

	it("should redirect to / (without search) when no query params present", async () => {
		useAuthStore.setState({ user: null, isLoading: false, error: null });
		renderProtected("/dashboard");
		await waitFor(() => {
			const loc = screen.getByTestId("location-display");
			expect(loc.textContent).toBe("/");
		});
	});
});
