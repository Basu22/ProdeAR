import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VersionInfo } from "../lib/versionCheck";
import {
	clearStaleCaches,
	clearStaleLocalStorage,
	compareVersions,
	isUpdateAvailable,
	isUpdateForced,
	shouldResurface,
	versionJsonUrl,
} from "../lib/versionCheck";

describe("compareVersions", () => {
	it("returns 0 for equal versions", () => {
		expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
	});

	it("returns 1 when first version is greater (major)", () => {
		expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
	});

	it("returns -1 when first version is lower (major)", () => {
		expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
	});

	it("compares minor versions correctly", () => {
		expect(compareVersions("1.2.0", "1.1.0")).toBe(1);
		expect(compareVersions("1.1.0", "1.2.0")).toBe(-1);
	});

	it("compares patch versions correctly", () => {
		expect(compareVersions("1.0.2", "1.0.1")).toBe(1);
		expect(compareVersions("1.0.1", "1.0.2")).toBe(-1);
	});

	it("handles different length versions with padding", () => {
		expect(compareVersions("1.0", "1.0.0")).toBe(0);
		expect(compareVersions("1.0.0", "1.0")).toBe(0);
		expect(compareVersions("1.0", "1.0.1")).toBe(-1);
	});

	it("handles versions with prefix like v", () => {
		expect(compareVersions("v1.0.0", "v1.0.0")).toBe(0);
		expect(compareVersions("v2.0.0", "v1.0.0")).toBe(1);
	});

	it("handles versions with hash suffix", () => {
		expect(compareVersions("1.0.0-abc123", "1.0.0-def456")).toBe(0);
		expect(compareVersions("1.0.1-abc", "1.0.0-xyz")).toBe(1);
	});
});

describe("isUpdateAvailable", () => {
	it("returns true when server version is newer", () => {
		expect(isUpdateAvailable("1.0.0", "1.1.0")).toBe(true);
	});

	it("returns false when versions are equal", () => {
		expect(isUpdateAvailable("1.0.0", "1.0.0")).toBe(false);
	});

	it("returns false when current is newer (downgrade)", () => {
		expect(isUpdateAvailable("2.0.0", "1.0.0")).toBe(false);
	});
});

describe("isUpdateForced", () => {
	const baseServer: VersionInfo = {
		version: "2.0.0",
		buildTime: "2026-06-18T00:00:00Z",
		minSupportedVersion: "1.0.0",
		forceUpdate: false,
		changelog: "Test",
	};

	it("returns true when forceUpdate flag is true", () => {
		const server = { ...baseServer, forceUpdate: true };
		expect(isUpdateForced("1.5.0", server)).toBe(true);
	});

	it("returns true when client is below minSupportedVersion", () => {
		expect(isUpdateForced("0.9.0", baseServer)).toBe(true);
	});

	it("returns false when client is at or above minSupportedVersion and no force flag", () => {
		expect(isUpdateForced("1.0.0", baseServer)).toBe(false);
		expect(isUpdateForced("1.5.0", baseServer)).toBe(false);
	});

	it("returns true when forceUpdate is true even if client is up to date", () => {
		const server = { ...baseServer, forceUpdate: true };
		expect(isUpdateForced("2.0.0", server)).toBe(true);
	});
});

describe("shouldResurface", () => {
	it("returns true when lastDismissedAt is null", () => {
		expect(shouldResurface(null)).toBe(true);
	});

	it("returns false when dismissed recently (within cooldown)", () => {
		const now = Date.now();
		const recent = new Date(now - 1000).toISOString();
		expect(shouldResurface(recent, now, 24 * 60 * 60 * 1000)).toBe(false);
	});

	it("returns true when dismissed long ago (past cooldown)", () => {
		const now = Date.now();
		const old = new Date(now - 25 * 60 * 60 * 1000).toISOString();
		expect(shouldResurface(old, now, 24 * 60 * 60 * 1000)).toBe(true);
	});

	it("uses default cooldown of 24 hours", () => {
		const now = Date.now();
		const almostExpired = new Date(
			now - 23 * 60 * 60 * 1000 - 59 * 60 * 1000,
		).toISOString();
		expect(shouldResurface(almostExpired, now)).toBe(false);

		const expired = new Date(now - 24 * 60 * 60 * 1000 - 1).toISOString();
		expect(shouldResurface(expired, now)).toBe(true);
	});
});

describe("versionJsonUrl", () => {
	it("returns correct URL with build ID", () => {
		expect(versionJsonUrl("abc123")).toBe("/version.json?v=abc123");
	});

	it("handles empty build ID", () => {
		expect(versionJsonUrl("")).toBe("/version.json?v=");
	});
});

describe("clearStaleCaches", () => {
	beforeEach(() => {
		const mockCaches = new Map<string, unknown>();
		mockCaches.set("old-cache", {});
		mockCaches.set("google-fonts-cache", {});
		mockCaches.set("gstatic-fonts-cache", {});
		mockCaches.set("workbox-precache-v2", {});
		mockCaches.set("prodear-assets-v1", {});

		vi.stubGlobal("caches", {
			keys: vi.fn().mockResolvedValue(Array.from(mockCaches.keys())),
			delete: vi.fn().mockImplementation(async (name: string) => {
				mockCaches.delete(name);
				return true;
			}),
		});
	});

	it("deletes all caches except whitelisted ones and workbox-precache/prodear-*", async () => {
		const deleted = await clearStaleCaches([
			"google-fonts-cache",
			"gstatic-fonts-cache",
		]);
		expect(deleted).toContain("old-cache");
		expect(deleted).not.toContain("google-fonts-cache");
		expect(deleted).not.toContain("gstatic-fonts-cache");
		// workbox-precache-v2 y prodear-* se preservan (son del SW activo)
		expect(deleted).not.toContain("workbox-precache-v2");
		expect(deleted).not.toContain("prodear-assets-v1");
	});

	it("returns empty array when caches API is not available", async () => {
		vi.stubGlobal("caches", undefined);
		const deleted = await clearStaleCaches();
		expect(deleted).toEqual([]);
	});
});

describe("clearStaleLocalStorage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("removes old namespace keys but preserves current namespace", () => {
		localStorage.setItem("prodear_old_v1_data", "value1");
		localStorage.setItem("prodear_old_v1_settings", "value2");
		localStorage.setItem("prodear_current_data", "value3");

		const deleted = clearStaleLocalStorage("current");
		expect(deleted).toContain("prodear_old_v1_data");
		expect(deleted).toContain("prodear_old_v1_settings");
		expect(deleted).not.toContain("prodear_current_data");
		expect(localStorage.getItem("prodear_current_data")).toBe("value3");
	});

	it("preserves Supabase auth tokens", () => {
		localStorage.setItem("sb-xxx-auth-token", "token");
		localStorage.setItem("sb-xxx-refresh-token", "refresh");
		localStorage.setItem("prodear_old_data", "value");

		const deleted = clearStaleLocalStorage("current");
		expect(deleted).not.toContain("sb-xxx-auth-token");
		expect(deleted).not.toContain("sb-xxx-refresh-token");
		expect(localStorage.getItem("sb-xxx-auth-token")).toBe("token");
	});

	it("preserves push notification and live timer keys", () => {
		localStorage.setItem("prodear_push_enabled", "true");
		localStorage.setItem("prodear_live_timers", "{}");
		localStorage.setItem("prodear_onboarding_done", "true");
		localStorage.setItem("prodear_chat_messages", "[]");
		localStorage.setItem("prodear_old_data", "value");

		const deleted = clearStaleLocalStorage("current");
		expect(deleted).not.toContain("prodear_push_enabled");
		expect(deleted).not.toContain("prodear_live_timers");
		expect(deleted).not.toContain("prodear_onboarding_done");
		expect(deleted).not.toContain("prodear_chat_messages");
	});

	it("does not touch keys without the prodear prefix", () => {
		localStorage.setItem("other_app_data", "value");
		localStorage.setItem("prodear_old_data", "value");

		const deleted = clearStaleLocalStorage("current");
		expect(deleted).not.toContain("other_app_data");
		expect(localStorage.getItem("other_app_data")).toBe("value");
	});
});
