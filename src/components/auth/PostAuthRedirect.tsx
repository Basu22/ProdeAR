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
