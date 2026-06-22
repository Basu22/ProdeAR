import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PostAuthRedirect } from "./components/auth/PostAuthRedirect";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { NotificationToast } from "./components/ui/NotificationToast";
import { UpdatePrompt } from "./components/update/UpdatePrompt";
import { Dashboard } from "./routes/Dashboard";
import { JoinTournament } from "./routes/JoinTournament";
import { Landing } from "./routes/Landing";
import { League } from "./routes/League";
import { Ligas } from "./routes/Ligas";
import { Rankings } from "./routes/Rankings";
import { Tournament } from "./routes/Tournament";
import { TournamentsRedirect } from "./routes/TournamentsRedirect";
import { useAuthStore } from "./stores/authStore";
import { useNotificationStore } from "./stores/notificationStore";
import { type BeforeInstallPromptEvent, useUIStore } from "./stores/uiStore";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Sprint 3 hygiene: subido de 30s → 5min. El polling activo de
			// useMatches (15s si hay live) cubre la freshness necesaria;
			// un staleTime de 5min evita refetches innecesarios al cambiar
			// de tab o volver del background.
			staleTime: 1000 * 60 * 5,
			// No refetchear cada vez que el user vuelve a la tab: el polling
			// en background ya mantiene la data fresca.
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

function AppContent() {
	const hydrate = useAuthStore((s) => s.hydrate);
	const setInstallPrompt = useUIStore((s) => s.setInstallPrompt);
	const user = useAuthStore((s) => s.user);

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

	// ── Persistencia entre sesiones: re-hidratar cuando el usuario
	// vuelve a la app (cambia de tab, vuelve del background, desbloquea el cel).
	// Esto cubre el caso de "abrí la app, la dejé en background un rato, y al
	// volver quiero ver el toggle en el estado REAL" (no el que tenía al irme).
	useEffect(() => {
		if (!user) return;

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				useNotificationStore.getState().hydrate();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [user]);

	return (
		<>
			<PostAuthRedirect />
			<Routes>
				<Route path="/" element={<Landing />} />
				<Route element={<ProtectedRoute />}>
					<Route element={<AppLayout />}>
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/torneos" element={<TournamentsRedirect />} />
						<Route path="/ranking" element={<Rankings />} />
						<Route path="/ligas" element={<Ligas />} />
						<Route path="/liga/:id" element={<League />} />
						<Route path="/torneo/:id" element={<Tournament />} />
						<Route path="/join" element={<JoinTournament />} />
					</Route>
				</Route>
			</Routes>
			<NotificationToast />
			<UpdatePrompt />
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
