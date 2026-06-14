import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../hooks/useCountdown";

describe("useCountdown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("retorna valores vacíos si targetDate es null", () => {
		const { result } = renderHook(() => useCountdown(null));
		expect(result.current).toEqual({
			msRemaining: 0,
			formatted: "",
			isExpired: false,
		});
	});

	it("calcula msRemaining correctamente al montar", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

		const { result } = renderHook(() => useCountdown(target));
		expect(result.current.msRemaining).toBe(2 * 60 * 60 * 1000);
	});

	it("formatted usa formatCountdown correctamente (2h 30min)", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(
			now.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000,
		);

		const { result } = renderHook(() => useCountdown(target));
		expect(result.current.formatted).toBe("2h 30min");
	});

	it("isExpired es false cuando falta tiempo", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() + 60 * 60 * 1000); // +1h

		const { result } = renderHook(() => useCountdown(target));
		expect(result.current.isExpired).toBe(false);
	});

	it("isExpired es true cuando ya pasó", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() - 60 * 1000); // -1min

		const { result } = renderHook(() => useCountdown(target));
		expect(result.current.isExpired).toBe(true);
		expect(result.current.msRemaining).toBe(0);
	});

	it("se actualiza cada intervalMs (default 30s)", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() + 60 * 60 * 1000); // +1h

		const { result } = renderHook(() => useCountdown(target));
		const initial = result.current.msRemaining;

		act(() => {
			vi.advanceTimersByTime(30_000);
		});
		expect(result.current.msRemaining).toBe(initial - 30_000);
	});

	it("se actualiza con intervalMs custom (1s)", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() + 60 * 1000); // +1min

		const { result } = renderHook(() => useCountdown(target, 1000));
		const initial = result.current.msRemaining;

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current.msRemaining).toBe(initial - 1000);
	});

	it("cleanup: clearInterval al desmontar", () => {
		const now = new Date("2026-06-12T15:00:00Z");
		vi.setSystemTime(now);
		const target = new Date(now.getTime() + 60 * 60 * 1000);

		const { unmount } = renderHook(() => useCountdown(target));
		unmount();

		// No debe haber errores ni timers activos
		expect(vi.getTimerCount()).toBe(0);
	});
});
