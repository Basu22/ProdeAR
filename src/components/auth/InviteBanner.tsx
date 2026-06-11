import { useInviteStore } from "../../stores/inviteStore";

export function InviteBanner() {
	const { tournamentPreview, isLoadingPreview, previewError } =
		useInviteStore();

	if (isLoadingPreview) {
		return (
			<div className="mx-4 mb-4 p-4 rounded-2xl bg-tertiary/10 border border-tertiary/30 backdrop-blur-md relative overflow-hidden animate-enter">
				<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tertiary via-primary to-tertiary" />
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center shrink-0">
						<div className="w-5 h-5 border-2 border-tertiary border-t-transparent rounded-full animate-spin" />
					</div>
					<div className="flex-1 space-y-2">
						<div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
						<div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
					</div>
				</div>
			</div>
		);
	}

	if (previewError) {
		return (
			<div className="mx-4 mb-4 p-4 rounded-2xl bg-error/5 border border-error/20 backdrop-blur-md animate-enter">
				<div className="flex items-center gap-3">
					<span className="material-symbols-outlined text-error text-2xl">
						link_off
					</span>
					<div className="flex-1">
						<p className="font-headline-md text-sm text-error uppercase tracking-wider">
							Enlace no válido
						</p>
						<p className="font-body-md text-xs text-on-surface-variant mt-0.5">
							El torneo puede haber sido eliminado o el enlace expiró.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (!tournamentPreview) return null;

	return (
		<div className="mx-4 mb-4 p-4 rounded-2xl bg-tertiary/10 border border-tertiary/30 backdrop-blur-md relative overflow-hidden animate-enter shadow-[0_0_30px_rgba(245,158,11,0.15)]">
			<div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tertiary via-primary to-tertiary" />
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center shrink-0">
					<span
						className="material-symbols-outlined text-tertiary text-xl"
						style={{ filter: "drop-shadow(0 0 6px var(--color-tertiary))" }}
					>
						workspace_premium
					</span>
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-label-caps text-[10px] text-tertiary uppercase tracking-widest font-bold">
						Te invitaron a un torneo
					</p>
					<p className="font-display-lg text-xl text-white uppercase truncate leading-tight mt-0.5">
						{tournamentPreview.name}
					</p>
					<div className="flex items-center gap-3 mt-1">
						<span className="flex items-center gap-1 text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">
							<span className="material-symbols-outlined text-[12px]">
								group
							</span>
							<span className="tabular-nums">
								{tournamentPreview.memberCount} jugador
								{tournamentPreview.memberCount !== 1 ? "es" : ""}
							</span>
						</span>
						<span className="flex items-center gap-1 text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">
							<span className="material-symbols-outlined text-[12px]">tag</span>
							<span className="font-mono">{tournamentPreview.code}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
