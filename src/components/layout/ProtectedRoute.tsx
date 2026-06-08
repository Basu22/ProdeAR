import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute() {
	const user = useAuthStore((s) => s.user);
	const isLoading = useAuthStore((s) => s.isLoading);

	if (isLoading) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="font-label-caps text-xs text-on-surface-variant tracking-wider uppercase font-bold">
						Cargando cancha...
					</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
