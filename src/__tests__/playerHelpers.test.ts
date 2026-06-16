import { describe, expect, it } from "vitest";
import {
	buildPhotoMap,
	enrichLineupsWithPhotos,
	getPlayerInitials,
	getPlayerPhoto,
	getShortPlayerName,
	normalizePlayerName,
	resolvePlayerPhoto,
} from "../lib/playerHelpers";
import type { PlayerPhoto, TacticalPlayerInfo, TeamLineup } from "../lib/types";

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

	function makeLineup(teamName: string, home: boolean): TeamLineup {
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
		expect(result?.[0].startXI[0].player.photo).toBe("https://existing/1.png");
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
		expect(getPlayerInitials("Cristiano Ronaldo dos Santos Aveiro")).toBe("CA");
	});

	it("lowercase se capitaliza", () => {
		expect(getPlayerInitials("juan pérez")).toBe("JP");
	});
});

describe("getShortPlayerName", () => {
	// === Happy paths P0 ===
	it("Lionel Messi → L. Messi (caso estándar de 2 palabras)", () => {
		expect(getShortPlayerName("Lionel Messi")).toBe("L. Messi");
	});

	it("Lautaro Martínez → L. Martínez (acento en apellido se preserva)", () => {
		expect(getShortPlayerName("Lautaro Martínez")).toBe("L. Martínez");
	});

	it("Éder Militão → É. Militão (acento en inicial Y apellido)", () => {
		expect(getShortPlayerName("Éder Militão")).toBe("É. Militão");
	});

	it("3 palabras: Juan Román Riquelme → J. Riquelme (1er nombre + último apellido)", () => {
		expect(getShortPlayerName("Juan Román Riquelme")).toBe("J. Riquelme");
	});

	it("4+ palabras: Cristiano Ronaldo dos Santos Aveiro → C. Aveiro", () => {
		expect(getShortPlayerName("Cristiano Ronaldo dos Santos Aveiro")).toBe(
			"C. Aveiro",
		);
	});

	// === Edge cases P0: 1 palabra / vacío / nullish ===
	it("Neymar → Neymar (1 palabra: no se puede abreviar)", () => {
		expect(getShortPlayerName("Neymar")).toBe("Neymar");
	});

	it("Cavani → Cavani (1 palabra, mock real de ProdeAR)", () => {
		expect(getShortPlayerName("Cavani")).toBe("Cavani");
	});

	it("Gómez → Gómez (1 palabra con acento)", () => {
		expect(getShortPlayerName("Gómez")).toBe("Gómez");
	});

	it('"" → "" (string vacío)', () => {
		expect(getShortPlayerName("")).toBe("");
	});

	it("null → '' (robustez)", () => {
		expect(getShortPlayerName(null)).toBe("");
	});

	it("undefined → '' (robustez)", () => {
		expect(getShortPlayerName(undefined)).toBe("");
	});

	it("whitespace puro '   ' → ''", () => {
		expect(getShortPlayerName("   ")).toBe("");
	});

	// === Edge cases P1: trim + colapso de espacios ===
	it("whitespace se trimea: '  Lionel  Messi  ' → 'L. Messi'", () => {
		expect(getShortPlayerName("  Lionel  Messi  ")).toBe("L. Messi");
	});

	it("múltiples espacios internos se colapsan: 'Juan  Román  Riquelme' → 'J. Riquelme'", () => {
		expect(getShortPlayerName("Juan  Román  Riquelme")).toBe("J. Riquelme");
	});

	// === Edge cases P1: idempotencia (nombres ya abreviados) ===
	it("A. Di María → A. Di María (ya abreviado, se respeta)", () => {
		expect(getShortPlayerName("A. Di María")).toBe("A. Di María");
	});

	it("L. Suárez → L. Suárez (ya abreviado, no se re-abrevia)", () => {
		expect(getShortPlayerName("L. Suárez")).toBe("L. Suárez");
	});

	it("D. Sánchez → D. Sánchez (ya abreviado con acento)", () => {
		expect(getShortPlayerName("D. Sánchez")).toBe("D. Sánchez");
	});

	// === Edge cases P1: Unicode (umlauts, cirílico-friendly) ===
	it("Mesut Özil → M. Özil (umlaut preservado)", () => {
		expect(getShortPlayerName("Mesut Özil")).toBe("M. Özil");
	});

	it("Ángel Di María → Á. Di María (acento en inicial, apellido compuesto)", () => {
		expect(getShortPlayerName("Ángel Di María")).toBe("Á. Di María");
	});

	// === Edge cases P2: partículas en apellido ===
	it("Frenky de Jong → F. de Jong (partícula 'de' se preserva)", () => {
		expect(getShortPlayerName("Frenky de Jong")).toBe("F. de Jong");
	});

	it("Maravilla Martínez → M. Martínez (mock real de Racing Club)", () => {
		expect(getShortPlayerName("Maravilla Martínez")).toBe("M. Martínez");
	});

	// === Edge case P2: lowercase no afecta (no se capitaliza, se respeta casing original) ===
	it("'juan pérez' → 'j. pérez' (no fuerza mayúsculas en la inicial)", () => {
		// getShortPlayerName NO es un capitalizador: respeta el casing del input.
		// La capitalización visual la hace la clase CSS `font-label-caps` (uppercase).
		expect(getShortPlayerName("juan pérez")).toBe("j. pérez");
	});
});

describe("normalizePlayerName", () => {
	it("lowercase + sin tildes", () => {
		expect(normalizePlayerName("Lautaro Martínez")).toBe("lautaro martinez");
	});

	it("null/undefined/empty → empty", () => {
		expect(normalizePlayerName(null)).toBe("");
		expect(normalizePlayerName(undefined)).toBe("");
		expect(normalizePlayerName("")).toBe("");
	});

	it("trim + colapsa whitespace múltiple", () => {
		expect(normalizePlayerName("  Éder   Militao  ")).toBe("eder militao");
	});

	it("tildes, eñes y acentos varios", () => {
		expect(normalizePlayerName("Ángel Di María")).toBe("angel di maria");
		expect(normalizePlayerName("Hélder")).toBe("helder");
		expect(normalizePlayerName("Ibañez")).toBe("ibanez");
	});

	it("tilde de la ñ se elimina (matching: 'Ibañez' === 'Ibanez')", () => {
		// ñ en NFD se descompone en 'n' + combining tilde (U+0303).
		// El regex strip la elimina, dando 'ibanez'.
		// Esto es lo que queremos: la API de API-Football a veces devuelve
		// "Ibañez" y a veces "Ibanez" para el mismo jugador.
		expect(normalizePlayerName("Ibañez")).toBe("ibanez");
		expect(normalizePlayerName("Año")).toBe("ano");
	});
});

describe("resolvePlayerPhoto", () => {
	const homeLineup: TeamLineup = {
		team: { id: 1, name: "Boca", logo: "" },
		formation: "4-3-3",
		startXI: [
			{
				player: {
					id: 100,
					name: "Lautaro Martínez",
					number: 10,
					pos: "F",
					grid: "4:2",
				},
			},
			{
				player: {
					id: 101,
					name: "Éder Militão",
					number: 3,
					pos: "D",
					grid: "2:2",
					photo: "https://cdn.example.com/eder.png", // tiene photo en el lineup
				},
			},
		],
		substitutes: [
			{
				player: {
					id: 200,
					name: "Julián Álvarez",
					number: 19,
					pos: "F",
					grid: null,
				},
			},
		],
		coach: { id: 999, name: "DT", photo: null },
	};

	const awayLineup: TeamLineup = {
		team: { id: 2, name: "River", logo: "" },
		formation: "4-4-2",
		startXI: [
			{
				player: {
					id: 300,
					name: "Mohamed Naceur",
					number: 7,
					pos: "F",
					grid: "4:1",
				},
			},
			{
				player: {
					id: 301,
					name: "A. Martial",
					number: 9,
					pos: "F",
					grid: "4:2",
				},
			},
		],
		substitutes: [],
		coach: { id: 888, name: "DT", photo: null },
	};

	const lineups: TeamLineup[] = [homeLineup, awayLineup];
	const photos: PlayerPhoto[] = [
		{ player_id: 100, photo: "https://cdn.example.com/lautaro.png" },
		{ player_id: 200, photo: "https://cdn.example.com/julian.png" },
		// ID 101 (Éder) NO está en photos, pero sí en lineup.player.photo
		{ player_id: 300, photo: "https://cdn.example.com/mohamed.png" },
		{ player_id: 301, photo: "https://cdn.example.com/martial.png" },
	];

	it("happy path: nombre matchea titular → devuelve URL de playerPhotos", () => {
		const url = resolvePlayerPhoto(
			{ name: "Lautaro Martínez", team: "home" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/lautaro.png");
	});

	it("match contra suplente", () => {
		const url = resolvePlayerPhoto(
			{ name: "Julián Álvarez", team: "home" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/julian.png");
	});

	it("playerPhotos vacío pero lineup tiene photo → fallback al lineup", () => {
		// Éder Militão: ID 101 no está en photos, pero lineup.player.photo SÍ
		const url = resolvePlayerPhoto(
			{ name: "Éder Militão", team: "home" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/eder.png");
	});

	it("playerPhotos null pero lineup tiene photo → fallback al lineup", () => {
		const url = resolvePlayerPhoto(
			{ name: "Éder Militão", team: "home" },
			lineups,
			null,
		);
		expect(url).toBe("https://cdn.example.com/eder.png");
	});

	it("lineup sin photo Y playerPhotos vacío → null", () => {
		const lineupSinFoto: TeamLineup = {
			...homeLineup,
			startXI: [
				{
					player: {
						id: 999,
						name: "Sin Foto",
						number: 1,
						pos: "G",
						grid: "1:1",
						photo: null,
					},
				},
			],
		};
		const url = resolvePlayerPhoto(
			{ name: "Sin Foto", team: "home" },
			[lineupSinFoto, awayLineup],
			[],
		);
		expect(url).toBeNull();
	});

	it("nombre no matchea ningún lineup → null", () => {
		const url = resolvePlayerPhoto(
			{ name: "Jugador Misterioso", team: "home" },
			lineups,
			photos,
		);
		expect(url).toBeNull();
	});

	it("lineups null → null (no throw)", () => {
		expect(
			resolvePlayerPhoto(
				{ name: "Lautaro Martínez", team: "home" },
				null,
				photos,
			),
		).toBeNull();
	});

	it("team=home busca en lineups[0], team=away busca en lineups[1]", () => {
		const homeUrl = resolvePlayerPhoto(
			{ name: "Lautaro Martínez", team: "home" },
			lineups,
			photos,
		);
		const awayUrl = resolvePlayerPhoto(
			{ name: "Mohamed Naceur", team: "away" },
			lineups,
			photos,
		);
		expect(homeUrl).toBe("https://cdn.example.com/lautaro.png");
		expect(awayUrl).toBe("https://cdn.example.com/mohamed.png");
	});

	it("match insensible a tildes/mayúsculas (Lautaro MARTÍNEZ vs Lautaro Martínez)", () => {
		const url = resolvePlayerPhoto(
			{ name: "LAUTARO MARTÍNEZ", team: "home" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/lautaro.png");
	});

	it("FUZZY: nombre con abreviación 'A. Martial' matchea 'A. Martial' exacto", () => {
		const url = resolvePlayerPhoto(
			{ name: "A. Martial", team: "away" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/martial.png");
	});

	it("FUZZY: 'Anthony Martial' matchea 'A. Martial' del lineup (Levenshtein ≤ 2)", () => {
		// "anthony martial" vs "a. martial" → 5 ediciones (muy lejos)
		// Mejor caso: API devuelve "A. Martial" en lineup y "A. Martial" en event → match exacto
		// Caso real problemático: "MARTIAL" vs "A. Martial"
		const url = resolvePlayerPhoto(
			{ name: "Anthony", team: "away" }, // solo primer nombre
			lineups,
			photos,
		);
		// "anthony" vs "a. martial" → muchas ediciones, no debería matchear
		// (documentamos el límite del fuzzy match)
		expect(url).toBeNull();
	});

	it("FUZZY: 'A.Martial' (sin espacio) matchea 'A. Martial' (Levenshtein = 1)", () => {
		const url = resolvePlayerPhoto(
			{ name: "A.Martial", team: "away" },
			lineups,
			photos,
		);
		expect(url).toBe("https://cdn.example.com/martial.png");
	});

	it("FUZZY: nombre muy diferente (>2 ediciones) → null", () => {
		const url = resolvePlayerPhoto(
			{ name: "Lionel Messi", team: "away" }, // "lionel messi" vs lineup más cercano
			lineups,
			photos,
		);
		expect(url).toBeNull();
	});

	it("nombre vacío → null", () => {
		expect(
			resolvePlayerPhoto({ name: "", team: "home" }, lineups, photos),
		).toBeNull();
	});
});
