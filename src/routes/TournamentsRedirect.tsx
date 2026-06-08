import { Navigate } from "react-router-dom";
import { useTournaments } from "../hooks/useTournament";

export function TournamentsRedirect() {
	const { data: tournaments, isLoading } = useTournaments();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh] relative z-10">
				<div className="relative w-10 h-10">
					<div className="absolute inset-0 rounded-full border-4 border-primary/20" />
					<div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary animate-spin" />
				</div>
			</div>
		);
	}

	if (tournaments && tournaments.length > 0) {
		return <Navigate to={`/torneo/${tournaments[0].id}`} replace />;
	}

	return <Navigate to="/join" replace />;
}
