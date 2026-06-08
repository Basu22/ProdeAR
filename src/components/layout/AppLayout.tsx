import { Outlet } from "react-router-dom";
import { BottomNavBar } from "./BottomNavBar";
import { NavSidebar } from "./NavSidebar";
import { TopAppBar } from "./TopAppBar";

export function AppLayout() {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			<TopAppBar />
			<div className="flex-1 flex w-full">
				<NavSidebar />
				<main className="flex-1 pt-16 pb-28 md:pb-8 md:pl-64 min-w-0 overflow-x-hidden">
					<Outlet />
				</main>
			</div>
			<BottomNavBar />
		</div>
	);
}
