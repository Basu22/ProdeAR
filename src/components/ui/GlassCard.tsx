import type { ReactNode } from "react";

interface GlassCardProps {
	children: ReactNode;
	className?: string;
	glow?: boolean;
}

export function GlassCard({ children, className = "", glow }: GlassCardProps) {
	return (
		<div
			className={`glass-card rounded-xl ${glow ? "celestial-glow" : ""} ${className}`}
		>
			{children}
		</div>
	);
}
