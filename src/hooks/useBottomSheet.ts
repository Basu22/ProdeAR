import { useCallback, useEffect, useRef, useState } from "react";

export interface UseBottomSheetOptions {
	/** Callback cuando el sheet debe cerrarse */
	onClose: () => void;
	/** Umbral de drag (px) para cerrar. Default: 100 */
	closeThreshold?: number;
}

export interface UseBottomSheetReturn {
	sheetRef: React.RefObject<HTMLDivElement | null>;
	handleRef: React.RefObject<HTMLDivElement | null>;
	dragHandlers: {
		onPointerDown: (e: React.PointerEvent) => void;
		onPointerMove: (e: React.PointerEvent) => void;
		onPointerUp: (e: React.PointerEvent) => void;
		onPointerCancel: () => void;
	};
	dragOffset: number;
	isDragging: boolean;
}

const DEFAULT_THRESHOLD = 100;

/**
 * Hook para manejar el swipe-down gesture de un BottomSheet.
 * Retorna refs y handlers para aplicar al handle/header del sheet.
 */
export function useBottomSheet({
	onClose,
	closeThreshold = DEFAULT_THRESHOLD,
}: UseBottomSheetOptions): UseBottomSheetReturn {
	const sheetRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLDivElement>(null);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const startY = useRef(0);

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		startY.current = e.clientY;
		setIsDragging(true);
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	}, []);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;
			const delta = e.clientY - startY.current;
			// Solo permitir drag hacia abajo (delta > 0)
			setDragOffset(Math.max(0, delta));
		},
		[isDragging],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;
			setIsDragging(false);
			(e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

			if (dragOffset > closeThreshold) {
				onClose();
			}
			// Reset offset (con o sin onClose, vuelve a 0)
			setDragOffset(0);
		},
		[isDragging, dragOffset, closeThreshold, onClose],
	);

	const handlePointerCancel = useCallback(() => {
		setIsDragging(false);
		setDragOffset(0);
	}, []);

	// Cleanup: si el componente se desmonta durante un drag, resetear
	useEffect(() => {
		return () => {
			setIsDragging(false);
			setDragOffset(0);
		};
	}, []);

	return {
		sheetRef,
		handleRef,
		dragHandlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			onPointerCancel: handlePointerCancel,
		},
		dragOffset,
		isDragging,
	};
}
