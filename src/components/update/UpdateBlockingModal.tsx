import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useUpdateStore } from "../../stores/updateStore";

interface UpdateBlockingModalProps {
	onApply: () => void;
}

export function UpdateBlockingModal({ onApply }: UpdateBlockingModalProps) {
	const { status, serverVersion } = useUpdateStore();
	const modalRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (status === "forced") {
			buttonRef.current?.focus();
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [status]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (status !== "forced") return;

			if (e.key === "Tab") {
				e.preventDefault();
				buttonRef.current?.focus();
			}

			if (e.key === "Escape") {
				e.preventDefault();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [status]);

	if (status !== "forced") return null;

	return (
		<div
			className="fixed inset-0 z-[300] flex items-center justify-center bg-background/95 backdrop-blur-sm"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="update-modal-title"
			aria-describedby="update-modal-description"
		>
			<div
				ref={modalRef}
				className="relative w-full max-w-md mx-4 border-3 border-error bg-surface-container-high shadow-2xl"
			>
				<div className="broadcast-sweep absolute inset-0 opacity-30 pointer-events-none" />

				<div className="relative p-6 space-y-4">
					<div className="flex items-center gap-3">
						<AlertTriangle
							size={32}
							className="text-error drop-shadow-[0_0_12px_rgba(255,42,42,0.6)]"
							aria-hidden="true"
						/>
						<h2
							id="update-modal-title"
							className="font-headline-md text-2xl uppercase tracking-wide text-on-surface"
						>
							Actualización obligatoria
						</h2>
					</div>

					<div className="space-y-2">
						<p
							id="update-modal-description"
							className="text-on-surface-variant"
						>
							Hay una versión crítica disponible. Debés actualizar para
							continuar usando la app.
						</p>
						{serverVersion?.changelog && (
							<p className="text-sm text-on-surface-variant/80">
								{serverVersion.changelog}
							</p>
						)}
					</div>

					<button
						ref={buttonRef}
						type="button"
						onClick={onApply}
						className="brutal-button w-full py-3 text-base bg-error border-error hover:bg-error/90 rounded-none"
						aria-label="Actualizar ahora"
					>
						Actualizar ahora
					</button>
				</div>
			</div>
		</div>
	);
}
