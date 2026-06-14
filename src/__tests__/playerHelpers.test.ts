import { describe, expect, it } from "vitest";
import {
	buildPhotoMap,
	enrichLineupsWithPhotos,
	getPlayerInitials,
	getPlayerPhoto,
} from "../lib/playerHelpers";
import type { PlayerPhoto, TeamLineup, TacticalPlayerInfo } from "../lib/types";

describe("buildPhotoMap", () => {
	it("retorna Map vacío con null", () => {
		expect(buildPhotoMap(null).size).toBe(0);
	});

	it("retorna Map vacío con undefined", () => {
		expect(buildPhotoMap(undefined).size).toBe(0);
	});

	it("retorna Map vacío con array vacío", () => {
		expect(buildPhotoMap([]).size).toBe(0);
	});

	it("construye Map con entries válidos", () => {
		const photos: PlayerPhoto[] = [
			{ player_id: 1, photo: "https://example.com/1.png" },
			{ player_id: 2, photo: "https://example.com/2.png" },
		];
		const map = buildPhotoMap(photos);
		expect(map.size).toBe(2);
		expect(map.get(1)).toBe("https://example.com/1.png");
		expect(map.get(2)).toBe("https://example.com/2.png");
	});

	it("ignora entries sin player_id o photo", () => {
		const photos = [
			{ player_id: 0, photo: "https://example.com/0.png" },
			{ player_id: 1, photo: "" },
		] as PlayerPhoto[];
		const map = buildPhotoMap(photos);
		expect(map.size).toBe(0);
	});
});

describe("getPlayerPhoto", () => {
	const photos: PlayerPhoto[] = [
		{ player_id: 10, photo: "https://cdn.example.com/10.png" },
		{ player_id: 20, photo: "https://cdn.example.com/20.png" },
	];

	it("retorna null con null", () => {
		expect(getPlayerPhoto(10, null)).toBeNull();
	});

	it("retorna null con undefined", () => {
		expect(getPlayerPhoto(10, undefined)).toBeNull();
	});

	it("retorna null con array vacío", () => {
		expect(getPlayerPhoto(10, [])).toBeNull();
	});

	it("encuentra el player_id correcto", () => {
		expect(getPlayerPhoto(10, photos)).toBe("https://cdn.example.com/10.png");
		expect(getPlayerPhoto(20, photos)).toBe("https://cdn.example.com/20.png");
	});

	it("retorna null si el player_id no existe", () => {
		expect(getPlayerPhoto(999, photos)).toBeNull();
	});
});

describe("enrichLineupsWithPhotos", () => {
	function makePlayer(id: number, name: string): TacticalPlayerInfo {
		return {
			player: {
				id,
				name,
				number: id,
				pos: "M",
				grid: "3:1",
			},
		};
	}

	function makeLineup(
		teamName: string,
		home: boolean,
	): TeamLineup {
		return {
			team: { id: home ? 1 : 2, name: teamName, logo: "" },
			formation: "4-3-3",
			startXI: [makePlayer(1, "Pérez"), makePlayer(2, "López")],
			substitutes: [makePlayer(3, "Gómez")],
			coach: { id: 1, name: "DT", photo: null },
		};
	}

	it("retorna null con lineups null", () => {
		expect(enrichLineupsWithPhotos(null, [])).toBeNull();
	});

	it("retorna null con lineups undefined", () => {
		expect(enrichLineupsWithPhotos(undefined, [])).toBeNull();
	});

	it("retorna array vacío si lineups está vacío (null coalescing)", () => {
		expect(enrichLineupsWithPhotos([], [])).toBeNull();
	});

	it("no modifica si photos es null", () => {
		const lineups = [makeLineup("Boca", true)];
		const result = enrichLineupsWithPhotos(lineups, null);
		expect(result).toBe(lineups); // misma referencia, no se enriqueció
	});

	it("no modifica si photos es array vacío", () => {
		const lineups = [makeLineup("Boca", true)];
		const result = enrichLineupsWithPhotos(lineups, []);
		expect(result).toBe(lineups);
	});

	it("agrega photo a startXI y substitutes", () => {
		const lineups = [makeLineup("Boca", true)];
		const photos: PlayerPhoto[] = [
			{ player_id: 1, photo: "https://cdn/1.png" },
			{ player_id: 2, photo: "https://cdn/2.png" },
			{ player_id: 3, photo: "https://cdn/3.png" },
		];
		const result = enrichLineupsWithPhotos(lineups, photos);
		expect(result?.[0].startXI[0].player.photo).toBe("https://cdn/1.png");
		expect(result?.[0].startXI[1].player.photo).toBe("https://cdn/2.png");
		expect(result?.[0].substitutes[0].player.photo).toBe("https://cdn/3.png");
	});

	it("preserva photo existente del lineup si no hay en el map", () => {
		const lineups: TeamLineup[] = [
			{
				...makeLineup("Boca", true),
				startXI: [
					{
						player: {
							id: 1,
							name: "Pérez",
							number: 1,
							pos: "M",
							grid: "3:1",
							photo: "https://existing/1.png",
						},
					},
				],
			},
		];
		const result = enrichLineupsWithPhotos(lineups, []);
		// No hay fotos nuevas, pero el lineup tiene una photo existente → se preserva
		expect(result?.[0].startXI[0].player.photo).toBe(
			"https://existing/1.png",
		);
	});

	it("no muta el input (inmutabilidad)", () => {
		const lineups = [makeLineup("Boca", true)];
		const original = lineups[0].startXI[0].player.photo;
		const photos: PlayerPhoto[] = [
			{ player_id: 1, photo: "https://new/1.png" },
		];
		enrichLineupsWithPhotos(lineups, photos);
		expect(lineups[0].startXI[0].player.photo).toBe(original);
	});

	it("enriquece múltiples lineups (home + away)", () => {
		// Cada lineup usa IDs únicos (Boca 1-3, River 11-13) para evitar colisiones
		const homeLineup: TeamLineup = {
			team: { id: 1, name: "Boca", logo: "" },
			formation: "4-3-3",
			startXI: [makePlayer(1, "Pérez"), makePlayer(2, "López")],
			substitutes: [makePlayer(3, "Gómez")],
			coach: { id: 1, name: "DT", photo: null },
		};
		const awayLineup: TeamLineup = {
			team: { id: 2, name: "River", logo: "" },
			formation: "4-4-2",
			startXI: [makePlayer(11, "Borja"), makePlayer(12, "Meza")],
			substitutes: [makePlayer(13, "Echeverri")],
			coach: { id: 2, name: "DT", photo: null },
		};
		const lineups = [homeLineup, awayLineup];
		const photos: PlayerPhoto[] = [
			{ player_id: 1, photo: "https://cdn/1.png" },
			{ player_id: 2, photo: "https://cdn/2.png" },
			{ player_id: 3, photo: "https://cdn/3.png" },
			{ player_id: 11, photo: "https://cdn/11.png" },
			{ player_id: 12, photo: "https://cdn/12.png" },
			{ player_id: 13, photo: "https://cdn/13.png" },
		];
		const result = enrichLineupsWithPhotos(lineups, photos);
		expect(result?.[0].startXI[0].player.photo).toBe("https://cdn/1.png");
		expect(result?.[0].startXI[1].player.photo).toBe("https://cdn/2.png");
		expect(result?.[0].substitutes[0].player.photo).toBe("https://cdn/3.png");
		expect(result?.[1].startXI[0].player.photo).toBe("https://cdn/11.png");
		expect(result?.[1].startXI[1].player.photo).toBe("https://cdn/12.png");
		expect(result?.[1].substitutes[0].player.photo).toBe("https://cdn/13.png");
	});
});

describe("getPlayerInitials", () => {
	it("Lautaro Martínez → LM", () => {
		expect(getPlayerInitials("Lautaro Martínez")).toBe("LM");
	});

	it("Ederson → E (nombre simple)", () => {
		expect(getPlayerInitials("Ederson")).toBe("E");
	});

	it("string vacío → ?", () => {
		expect(getPlayerInitials("")).toBe("?");
	});

	it("whitespace se trimea", () => {
		expect(getPlayerInitials("  Messi  ")).toBe("M");
	});

	it("Cristiano Ronaldo dos Santos Aveiro → CA (primera + última)", () => {
		expect(getPlayerInitials("Cristiano Ronaldo dos Santos Aveiro")).toBe(
			"CA",
		);
	});

	it("lowercase se capitaliza", () => {
		expect(getPlayerInitials("juan pérez")).toBe("JP");
	});
});
