import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { isSupabaseConfigured } from "./lib/supabase";

// Auto-clean simulation data if Supabase is now configured
if (isSupabaseConfigured) {
	const rawMatches = localStorage.getItem("prodear_matches");
	if (rawMatches?.includes("comp-2")) {
		console.log(
			"Supabase detectado. Limpiando datos simulados locales de LocalStorage...",
		);
		localStorage.removeItem("prodear_matches");
		localStorage.removeItem("prodear_predictions");
		localStorage.removeItem("prodear_tournaments");
		localStorage.removeItem("prodear_tournament_members");
	}
}

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist in index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>,
);
