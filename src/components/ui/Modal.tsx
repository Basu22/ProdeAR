import { type ReactNode, useCallback, useEffect, useRef } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	className?: string;
	ariaLabel?: string;
}

export function Modal({
	isOpen,
	onClose,
	children,
	className = "",
	ariaLabel = "Modal",
}: ModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	const handleEsc = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		},
		[onClose],
	);

	useEffect(() => {
		if (!isOpen) return;

		document.addEventListener("keydown", handleEsc);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const prevFocus = document.activeElement as HTMLElement | null;
		contentRef.current?.focus();

		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = prevOverflow;
			prevFocus?.focus();
		};
	}, [isOpen, handleEsc]);

	if (!isOpen) return null;

	return (
		<>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: ESC handled at document level */}
			{/* biome-ignore lint/a11y/useSemanticElements: full-screen overlay cannot be a button */}
			<div
				ref={overlayRef}
				className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-enter"
				onClick={(e) => {
					if (e.target === overlayRef.current) onClose();
				}}
				role="button"
				tabIndex={-1}
			>
				<div
					ref={contentRef}
					role="dialog"
					aria-modal="true"
					aria-label={ariaLabel}
					tabIndex={-1}
					className={`w-full max-w-lg rounded-2xl border-white/10 shadow-2xl relative overflow-hidden ${className}`}
				>
					{children}
				</div>
			</div>
		</>
	);
}
