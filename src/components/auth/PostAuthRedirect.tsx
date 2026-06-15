import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { tournamentsApi } from "../../lib/api/tournaments";
import { useAuthStore } from "../../stores/authStore";
import { useInviteStore } from "../../stores/inviteStore";

export function PostAuthRedirect() {
	const user = useAuthStore((s) => s.user);
	const { pendingInviteCode, clearPendingInvite } = useInviteStore();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const consumedRef = useRef(false);

	// Sprint 3 hygiene: warning dev-only para evitar el bug "bad_oauth_state"
	// que pasa cuando se testea OAuth desde mobile con Site URL en localhost.
	// Si el dev está corriendo en localhost/127.0.0.1 y NO está logueado
	// todavía, le avisamos que necesita ajustar Supabase para mobile testing.
	useEffect(() => {
		if (!import.meta.env.DEV) return;
		if (user) return; // Ya está logueado, no necesitamos el warning
		const isLocal =
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1";
		if (!isLocal) return; // Solo warning si está en dev local
		console.warn(
			"%c⚠️ Dev OAuth warning",
			"color: #ff2a2a; font-weight: bold; font-size: 14px",
		);
		console.warn(
			"Si estás testeando OAuth desde un móvil, asegurate de que el " +
				"Site URL de Supabase apunte a la IP de tu PC (no a localhost). " +
				"Ver: docs/DEPLOY_SPRINT_3.md §1.3 y docs/DEPLOY_SPRINT_3.md §6.1.1",
		);
		console.warn(
			"%cTip: npm run dev:host expone a la LAN. La URL Network aparece en consola.",
			"color: #00e5ff",
		);
	}, [user]);

	useEffect(() => {
		if (!user) {
			consumedRef.current = false;
		}
	}, [user]);

	useEffect(() => {
		if (!user || !pendingInviteCode || consumedRef.current) return;
		consumedRef.current = true;

		const code = pendingInviteCode;
		clearPendingInvite();

		(async () => {
			try {
				const tournament = await tournamentsApi.joinTournament(code);
				queryClient.invalidateQueries({ queryKey: ["tournaments"] });
				navigate(`/torneo/${tournament.id}`, { replace: true });
			} catch {
				navigate("/dashboard", { replace: true });
			}
		})();
	}, [user, pendingInviteCode, clearPendingInvite, navigate, queryClient]);

	return null;
}
