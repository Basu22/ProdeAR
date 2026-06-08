import { Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";

const links = [
	{ to: "/dashboard", icon: "home", label: "Inicio" },
	{ to: "/torneos", icon: "emoji_events", label: "Torneos" },
	{ to: "/ranking", icon: "military_tech", label: "Ranking" },
	{ to: "/liga/comp-2", icon: "leaderboard", label: "Posiciones" },
];

export function NavSidebar() {
	const { installPrompt, setInstallPrompt } = useUIStore();

	const handleInstallClick = async () => {
		if (!installPrompt) return;

		try {
			await installPrompt.prompt();
			const { outcome } = await installPrompt.userChoice;
			if (outcome === "accepted") {
				console.log("PWA install accepted");
			}
			setInstallPrompt(null);
		} catch (error) {
			console.error("PWA install failed", error);
		}
	};

	return (
		<aside className="fixed top-16 left-0 bottom-0 w-64 bg-background/50 backdrop-blur-xl border-r border-white/10 p-6 hidden md:flex flex-col justify-between z-40">
			<div className="space-y-6">
				<div className="space-y-1">
					<p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest pl-3 font-bold select-none">
						Navegación
					</p>
					<nav className="space-y-1">
						{links.map((link) => (
							<NavLink
								key={link.to}
								to={link.to}
								className={({ isActive }) =>
									`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] group ${
										isActive
											? "text-primary bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(56,189,248,0.05)] font-bold"
											: "text-on-surface-variant hover:text-primary hover:bg-white/5 border border-transparent"
									}`
								}
							>
								<span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-105">
									{link.icon}
								</span>
								<span className="font-label-caps text-xs tracking-wider uppercase">
									{link.label}
								</span>
							</NavLink>
						))}
					</nav>
				</div>
			</div>

			{installPrompt && (
				<div className="pt-4 border-t border-white/10">
					<button
						type="button"
						onClick={handleInstallClick}
						className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary/90 transition-all duration-200 active:scale-[0.96] text-xs font-bold tracking-wider uppercase cursor-pointer"
					>
						<Download className="w-4 h-4" />
						<span>Instalar App</span>
					</button>
				</div>
			)}
		</aside>
	);
}
