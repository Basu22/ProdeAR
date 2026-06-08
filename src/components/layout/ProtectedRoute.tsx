import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute() {
	const user = useAuthStore((s) => s.user);

	if (!user) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
