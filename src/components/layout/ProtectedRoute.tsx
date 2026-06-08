import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute() {
	const user = useAuthStore((s) => s.user);

	useEffect(() => {
		if (!user) {
			useAuthStore.setState({
				user: {
					id: "user-1",
					email: "demo@prodear.app",
					displayName: "Jugador Demo",
					avatarUrl: null,
				}
			});
		}
	}, [user]);

	return <Outlet />;
}
