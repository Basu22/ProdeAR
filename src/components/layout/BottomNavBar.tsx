import { NavLink } from "react-router-dom";

const links = [
	{ to: "/dashboard", icon: "home", label: "Inicio" },
	{ to: "/torneos", icon: "emoji_events", label: "Torneos" },
	{ to: "/ranking", icon: "military_tech", label: "Ranking" },
	// { to: "/liga/comp-2", icon: "leaderboard", label: "Posiciones" }, // ← oculto temporalmente (pendiente de redefinición con @brainstormer)
];

export function BottomNavBar() {
	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-white/10 pt-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] md:hidden">
			<div className="grid grid-cols-3 w-full px-2 max-w-lg mx-auto">
				{links.map((link) => (
					<NavLink
						key={link.to}
						to={link.to}
						className={({ isActive }) =>
							`flex flex-col items-center justify-center py-1.5 rounded-xl transition-[background-color,color,transform] duration-200 active:scale-[0.96] group cursor-pointer w-full ${
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
