import { RefreshCw } from "lucide-react";

interface UpdateIconProps {
	status: "idle" | "available" | "applying" | "completed" | "error" | "forced";
	size?: number;
}

export function UpdateIcon({ status, size = 24 }: UpdateIconProps) {
	const getColor = () => {
		switch (status) {
			case "applying":
				return "text-primary";
			case "completed":
				return "text-pitch-green";
			case "error":
				return "text-error";
			case "forced":
				return "text-error";
			default:
				return "text-primary";
		}
	};

	const getGlow = () => {
		switch (status) {
			case "applying":
				return "drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]";
			case "completed":
				return "drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]";
			case "error":
			case "forced":
				return "drop-shadow-[0_0_8px_rgba(255,42,42,0.6)]";
			default:
				return "drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]";
		}
	};

	return (
		<div className="relative inline-flex items-center justify-center">
			<RefreshCw
				size={size}
				className={`${getColor()} ${getGlow()} ${status === "applying" ? "animate-spin" : ""}`}
				aria-hidden="true"
			/>
		</div>
	);
}
