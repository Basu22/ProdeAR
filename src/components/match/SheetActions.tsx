interface SheetActionsProps {
	shareState: "idle" | "copied" | "error";
	hasUnsavedChanges: boolean;
	canShare: boolean;
	onShare: () => void;
	onClose: () => void;
}

/**
 * Acciones sticky del header del Match Bottom Sheet:
 * - Botón Compartir (con feedback de copiado/error)
 * - Botón Cerrar
 * - Dot pulsante cuando hay cambios sin guardar
 */
export function SheetActions({
	shareState,
	hasUnsavedChanges,
	canShare,
	onShare,
	onClose,
}: SheetActionsProps) {
	return (
		<div className="relative flex items-center justify-end gap-2 px-2 pb-1">
			{hasUnsavedChanges && (
				<span
					className="absolute top-2 right-[6.25rem] w-2 h-2 rounded-full bg-tertiary animate-pulse"
					aria-label="Cambios sin guardar"
				/>
			)}

			{/* Botón Compartir */}
			<button
				type="button"
				onClick={onShare}
				disabled={!canShare}
				aria-label="Compartir predicción al portapapeles"
				className={`w-8 h-8 rounded-full bg-surface-container/60 border flex items-center justify-center transition-colors ${
					shareState === "copied"
						? "border-pitch-green/40 text-pitch-green"
						: shareState === "error"
							? "border-error/40 text-error"
							: "border-white/10 text-on-surface-variant hover:text-white hover:bg-surface-container"
				} disabled:opacity-30 disabled:cursor-not-allowed`}
			>
				{shareState === "copied" ? (
					<svg
						viewBox="0 0 24 24"
						className="w-4 h-4 checkmark-saved"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M5 12l5 5L20 7" />
					</svg>
				) : shareState === "error" ? (
					<span className="material-symbols-outlined text-lg">error</span>
				) : (
					<span className="material-symbols-outlined text-lg">share</span>
				)}
			</button>

			<button
				type="button"
				onClick={onClose}
				aria-label="Cerrar"
				className="w-8 h-8 rounded-full bg-surface-container/60 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-container transition-colors"
			>
				<span className="material-symbols-outlined text-lg">close</span>
			</button>
		</div>
	);
}
