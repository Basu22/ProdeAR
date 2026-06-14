import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useBottomSheet } from "../../hooks/useBottomSheet";

export interface BottomSheetProps {
	/** Controla visibilidad */
	isOpen: boolean;
	/** Callback para cerrar (backdrop, swipe-down, Escape) */
	onClose: () => void;
	/** Contenido del sheet */
	children: ReactNode;
	/** Altura máxima del sheet. Default: "70vh" */
	maxHeight?: string;
	/** Aria-label para el dialog */
	ariaLabel: string;
	/** Mostrar handle/grabber visual. Default: true */
	showHandle?: boolean;
	/** Clase CSS adicional para el contenedor del contenido */
	className?: string;
}

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * BottomSheet genérico mobile-first con swipe-down gesture, focus trap y Escape handler.
 * Renderiza via portal a `document.body` con z-index alto.
 */
export function BottomSheet({
	isOpen,
	onClose,
	children,
	maxHeight = "70vh",
	ariaLabel,
	showHandle = true,
	className = "",
}: BottomSheetProps) {
	const sheetRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);
	const { dragHandlers, dragOffset, isDragging } = useBottomSheet({
		onClose,
		closeThreshold: 100,
	});

	// Restore focus + Escape handler + body scroll lock
	useEffect(() => {
		if (!isOpen) return;

		// Guardar el elemento activo antes de abrir
		triggerRef.current = document.activeElement as HTMLElement;

		// Body scroll lock
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		// Escape handler
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
				return;
			}
			// Focus trap
			if (e.key === "Tab" && sheetRef.current) {
				const focusables = Array.from(
					sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
				);
				if (focusables.length === 0) return;
				const first = focusables[0];
				const last = focusables[focusables.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);

		// Foco inicial en el sheet
		setTimeout(() => {
			sheetRef.current?.focus();
		}, 50);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = prevOverflow;
			// Restore focus al trigger
			if (triggerRef.current?.isConnected) {
				triggerRef.current.focus();
			}
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const sheetStyle: React.CSSProperties = {
		maxHeight,
		transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
		transition: isDragging
			? "none"
			: "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
	};

	const content = (
		<>
			{/* Backdrop — siempre full-screen */}
			<div
				className="bottom-sheet-backdrop-enter fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Contenedor externo: mobile=bottom-anchored, desktop=centered */}
			<div
				className="fixed inset-0 z-[60] pointer-events-none
					md:flex md:items-center md:justify-center"
			>
				{/* Sheet */}
				<div
					ref={sheetRef}
					role="dialog"
					aria-modal="true"
					aria-label={ariaLabel}
					tabIndex={-1}
					style={sheetStyle}
					className={`bottom-sheet-enter pointer-events-auto bg-background/95 backdrop-blur-xl outline-none flex flex-col
						/* Mobile: bottom-anchored sheet, full width */
						absolute bottom-0 left-0 right-0 max-h-[90vh] border-t border-white/10 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]
						/* Desktop: centered modal, fixed width */
						md:relative md:bottom-auto md:left-auto md:right-auto md:max-w-2xl md:w-[calc(100%-2rem)] md:max-h-[85vh] md:rounded-2xl md:border md:border-white/10 md:shadow-[0_8px_32px_rgba(0,0,0,0.6)]
						${className}`}
				>
					{/* Handle / grabber */}
					{showHandle && (
						<div
							className="pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none"
							{...dragHandlers}
						>
							<div className="w-10 h-1 rounded-full bg-white/30" />
						</div>
					)}

					{/* Content con safe-area */}
					<div className="flex-1 overflow-y-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
						{children}
					</div>
				</div>
			</div>
		</>
	);

	return createPortal(content, document.body);
}
