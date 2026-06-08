import { NavLink } from "react-router-dom";

const links = [
	{ to: "/dashboard", icon: "home", label: "Inicio" },
	{ to: "/torneos", icon: "emoji_events", label: "Torneos" },
	{ to: "/ranking", icon: "military_tech", label: "Ranking" },
	{ to: "/liga/comp-2", icon: "leaderboard", label: "Posiciones" },
];

export function BottomNavBar() {
	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-white/10 py-2.5 md:hidden">
			<div className="flex justify-around items-center w-full px-4 max-w-lg mx-auto">
				{links.map((link) => (
					<NavLink
						key={link.to}
						to={link.to}
						className={({ isActive }) =>
							`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-[background-color,color,transform] duration-200 active:scale-[0.96] group ${
								isActive
									? "text-primary bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
									: "text-on-surface-variant hover:text-primary border border-transparent"
							}`
						}
					>
						<span className="material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:scale-105">
							{link.icon}
						</span>
						<span className="font-label-caps text-[9px] mt-1 font-bold tracking-wider uppercase">
							{link.label}
						</span>
					</NavLink>
				))}
			</div>
		</nav>
	);
}
