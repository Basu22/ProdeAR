import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { NotificationToast } from "./components/ui/NotificationToast";
import { Dashboard } from "./routes/Dashboard";
import { JoinTournament } from "./routes/JoinTournament";
import { Landing } from "./routes/Landing";
import { League } from "./routes/League";
import { Rankings } from "./routes/Rankings";
import { Tournament } from "./routes/Tournament";
import { TournamentsRedirect } from "./routes/TournamentsRedirect";
import { useAuthStore } from "./stores/authStore";
import { type BeforeInstallPromptEvent, useUIStore } from "./stores/uiStore";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

function AppContent() {
	const hydrate = useAuthStore((s) => s.hydrate);
	const setInstallPrompt = useUIStore((s) => s.setInstallPrompt);

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setInstallPrompt(e as BeforeInstallPromptEvent);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
		};
	}, [setInstallPrompt]);

	return (
		<>
			<Routes>
				<Route path="/" element={<Landing />} />
				<Route element={<ProtectedRoute />}>
					<Route element={<AppLayout />}>
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/torneos" element={<TournamentsRedirect />} />
						<Route path="/ranking" element={<Rankings />} />
						<Route path="/liga/:id" element={<League />} />
						<Route path="/torneo/:id" element={<Tournament />} />
						<Route path="/join" element={<JoinTournament />} />
					</Route>
				</Route>
			</Routes>
			<NotificationToast />
		</>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<ErrorBoundary>
					<AppContent />
				</ErrorBoundary>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
