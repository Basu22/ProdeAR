import { useEffect, useState } from "react";
import { useUpdateStore } from "../../stores/updateStore";
import { UpdateIcon } from "./UpdateIcon";

interface UpdateBannerProps {
	onApply: () => void;
	onDismiss: () => void;
}

export function UpdateBanner({ onApply, onDismiss }: UpdateBannerProps) {
	const { status, serverVersion } = useUpdateStore();
	const [isVisible, setIsVisible] = useState(false);
	const [isExiting, setIsExiting] = useState(false);

	useEffect(() => {
		if (status === "available") {
			setIsVisible(true);
		}
	}, [status]);

	useEffect(() => {
		if (status !== "available" && isVisible) {
			setIsExiting(true);
			const timer = setTimeout(() => {
				setIsVisible(false);
				setIsExiting(false);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [status, isVisible]);

	if (!isVisible || status === "forced") return null;

	const getBorderColor = () => {
		switch (status) {
			case "applying":
				return "border-b-primary";
			case "completed":
				return "border-b-pitch-green";
			case "error":
				return "border-b-error";
			default:
				return "border-b-primary";
		}
	};

	const getTitle = () => {
		switch (status) {
			case "applying":
				return "Actualizando...";
			case "completed":
				return "¡Listo!";
			case "error":
				return "Error";
			default:
				return "¡Hay equipo nuevo en la cancha!";
		}
	};

	const getDescription = () => {
		switch (status) {
			case "applying":
				return "Preparando la nueva versión...";
			case "completed":
				return "La actualización se aplicó correctamente.";
			case "error":
				return "No se pudo aplicar. Intentá de nuevo.";
			default:
				return serverVersion?.changelog || "Nueva versión disponible.";
		}
	};

	return (
		<div
			role="status"
			aria-live="polite"
			aria-atomic="true"
			className={`sticky top-16 z-50 w-full border-b-2 ${getBorderColor()} bg-surface-container-high/90 backdrop-blur-md transition-all duration-350 ${
				isExiting
					? "opacity-0 -translate-y-3"
					: "opacity-100 translate-y-0 animate-[slideDown_350ms_ease-out]"
			}`}
			style={{
				animationName: isExiting ? "none" : "slideDown",
			}}
		>
			<div className="broadcast-sweep relative px-4 py-3">
				<div className="flex items-center gap-3 max-w-container-max mx-auto">
					<UpdateIcon status={status} size={20} />

					<div className="flex-1 min-w-0">
						<p className="font-headline-md text-lg uppercase tracking-wide text-on-surface">
							{getTitle()}
						</p>
						<p className="text-sm text-on-surface-variant truncate">
							{getDescription()}
						</p>
					</div>

					<div className="flex items-center gap-2">
						{status === "available" && (
							<button
								type="button"
								onClick={onDismiss}
								className="px-3 py-1.5 text-sm font-body-md text-on-surface-variant hover:text-on-surface transition-colors"
								aria-label="Cerrar notificación de actualización"
							>
								Más tarde
							</button>
						)}

						{(status === "available" || status === "error") && (
							<button
								type="button"
								onClick={onApply}
								className="brutal-button px-4 py-2 text-sm rounded-none"
								aria-label="Actualizar ahora"
							>
								{status === "error" ? "Reintentar" : "Actualizar ahora"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
