interface UpdateProgressBarProps {
	status: "applying" | "completed" | "error";
}

export function UpdateProgressBar({ status }: UpdateProgressBarProps) {
	const getColor = () => {
		switch (status) {
			case "error":
				return "bg-error";
			case "completed":
				return "bg-pitch-green";
			default:
				return "bg-primary";
		}
	};

	return (
		<div
			className="fixed top-0 left-0 right-0 h-1 z-[200] overflow-hidden"
			role="progressbar"
			aria-label="Aplicando actualización"
			aria-valuenow={status === "completed" ? 100 : undefined}
		>
			<div
				className={`h-full ${getColor()} transition-all duration-300 ${
					status === "applying"
						? "w-full animate-pulse"
						: status === "completed"
							? "w-full"
							: "w-full"
				}`}
				style={{
					background:
						status === "applying"
							? "linear-gradient(90deg, transparent, rgba(0,229,255,0.8), transparent)"
							: undefined,
					backgroundSize: "200% 100%",
					animation:
						status === "applying" ? "shimmer 1.5s infinite linear" : undefined,
				}}
			/>
		</div>
	);
}
