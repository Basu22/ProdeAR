interface SolDeMayoCardProps {
	onClick: () => void;
}

export function SolDeMayoCard({ onClick }: SolDeMayoCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full glass-card rounded-xl p-5 border-white/10 relative overflow-hidden bg-gradient-to-br from-tertiary/10 to-transparent cursor-pointer group hover:border-tertiary/30 transition-all duration-300 active:scale-[0.99]"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="material-symbols-outlined text-tertiary text-3xl stadium-glow-gold">
						workspace_premium
					</span>
					<div className="text-left">
						<h4 className="font-headline-md text-sm text-white uppercase tracking-tight font-bold">
							Sol de Mayo Club
						</h4>
						<p className="font-body-md text-xs text-on-surface-variant">
							Reglas personalizadas de puntuación. Tocá para ver más.
						</p>
					</div>
				</div>
				<span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary group-hover:translate-x-0.5 transition-all duration-300">
					chevron_right
				</span>
			</div>
			<div className="absolute inset-0 bg-tertiary/0 group-hover:bg-tertiary/[0.03] transition-colors duration-300 pointer-events-none" />
		</button>
	);
}
