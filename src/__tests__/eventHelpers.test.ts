import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../lib/types";
import {
	countEventsByType,
	getEventSummary,
	isSubPair,
	pairSubstitutions,
} from "../lib/eventHelpers";

function makeEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
	return {
		id: `evt-${Math.random().toString(36).slice(2)}`,
		type: "goal",
		minute: 10,
		extra: null,
		team: "home",
		playerName: "Jugador X",
		assistName: null,
		detail: null,
		comments: null,
		...overrides,
	};
}

describe("countEventsByType", () => {
	it("retorna todos en 0 con array vacío", () => {
		expect(countEventsByType([])).toEqual({
			goals: 0,
			yellows: 0,
			reds: 0,
			substitutions: 0,
			var: 0,
		});
	});

	it("retorna todos en 0 con null o undefined", () => {
		expect(countEventsByType(null)).toEqual({
			goals: 0,
			yellows: 0,
			reds: 0,
			substitutions: 0,
			var: 0,
		});
		expect(countEventsByType(undefined)).toEqual({
			goals: 0,
			yellows: 0,
			reds: 0,
			substitutions: 0,
			var: 0,
		});
	});

	it("cuenta eventos por tipo correctamente", () => {
		const events: MatchEvent[] = [
			makeEvent({ type: "goal" }),
			makeEvent({ type: "goal" }),
			makeEvent({ type: "yellow" }),
			makeEvent({ type: "red" }),
			makeEvent({ type: "subst" }),
			makeEvent({ type: "var" }),
			makeEvent({ type: "info" }), // no se cuenta
		];
		const counts = countEventsByType(events);
		expect(counts.goals).toBe(2);
		expect(counts.yellows).toBe(1);
		expect(counts.reds).toBe(1);
		expect(counts.substitutions).toBe(1);
		expect(counts.var).toBe(1);
	});
});

describe("getEventSummary", () => {
	it("retorna array vacío con 0 eventos", () => {
		expect(getEventSummary([])).toEqual([]);
	});

	it("solo incluye items con count > 0", () => {
		const events: MatchEvent[] = [
			makeEvent({ type: "goal" }),
			makeEvent({ type: "yellow" }),
			// sin reds, sin subs, sin var
		];
		const summary = getEventSummary(events);
		expect(summary).toHaveLength(2);
		expect(summary.map((s) => s.type)).toEqual(["goal", "yellow"]);
	});

	it("incluye VAR solo si count > 0", () => {
		const events: MatchEvent[] = [makeEvent({ type: "goal" })];
		const summary = getEventSummary(events);
		expect(summary.find((s) => s.type === "var")).toBeUndefined();
	});

	it("usa label singular/plural correcto en español", () => {
		expect(getEventSummary([makeEvent({ type: "goal" })])[0].label).toBe(
			"gol",
		);
		expect(
			getEventSummary([
				makeEvent({ type: "goal" }),
				makeEvent({ type: "goal" }),
			])[0].label,
		).toBe("goles");
	});

	it("mantiene el orden: gol, amarilla, roja, cambio, VAR", () => {
		const events: MatchEvent[] = [
			makeEvent({ type: "var" }),
			makeEvent({ type: "subst" }),
			makeEvent({ type: "goal" }),
			makeEvent({ type: "red" }),
			makeEvent({ type: "yellow" }),
		];
		const summary = getEventSummary(events);
		expect(summary.map((s) => s.type)).toEqual([
			"goal",
			"yellow",
			"red",
			"subst",
			"var",
		]);
	});
});

describe("pairSubstitutions", () => {
	it("retorna array vacío con 0 eventos", () => {
		expect(pairSubstitutions([])).toEqual([]);
	});

	it("no empareja substitutions sin assistName", () => {
		const e1 = makeEvent({ type: "subst", assistName: null });
		const e2 = makeEvent({ type: "subst", assistName: null });
		const result = pairSubstitutions([e1, e2]);
		expect(result).toHaveLength(2);
		expect(result.every((r) => !isSubPair(r))).toBe(true);
	});

	it("empareja 2 substitutions del mismo equipo y mismo minuto", () => {
		// API-Football: playerName = ENTRA, assistName = SALE
		const e1 = makeEvent({
			type: "subst",
			team: "home",
			minute: 62,
			playerName: "López", // entra
			assistName: "Pérez", // sale
		});
		const e2 = makeEvent({
			type: "subst",
			team: "home",
			minute: 62,
			playerName: "Ruiz", // entra
			assistName: "Gómez", // sale
			id: "evt-other",
		});
		const result = pairSubstitutions([e1, e2]);
		expect(result).toHaveLength(1);
		expect(isSubPair(result[0])).toBe(true);
		if (isSubPair(result[0])) {
			expect(result[0].team).toBe("home");
			expect(result[0].minute).toBe(62);
			expect(result[0].playerOut.name).toBe("Pérez");
			expect(result[0].playerIn.name).toBe("López");
		}
	});

	it("acepta tolerancia de ±1 minuto entre substitutions", () => {
		const e1 = makeEvent({
			type: "subst",
			team: "home",
			minute: 62,
			playerName: "López",
			assistName: "Pérez",
		});
		const e2 = makeEvent({
			type: "subst",
			team: "home",
			minute: 63,
			playerName: "Ruiz",
			assistName: "Gómez",
			id: "evt-other",
		});
		const result = pairSubstitutions([e1, e2]);
		expect(result).toHaveLength(1);
		expect(isSubPair(result[0])).toBe(true);
	});

	it("NO empareja substitutions de equipos diferentes (las sintetiza como SubPair individuales)", () => {
		const e1 = makeEvent({
			type: "subst",
			team: "home",
			minute: 62,
			playerName: "López",
			assistName: "Pérez",
		});
		const e2 = makeEvent({
			type: "subst",
			team: "away",
			minute: 62,
			playerName: "Ruiz",
			assistName: "Gómez",
			id: "evt-other",
		});
		const result = pairSubstitutions([e1, e2]);
		// No se emparejan (quedan 2 items), pero cada uno se sintetiza como SubPair
		// para mantener el formato UI unificado.
		expect(result).toHaveLength(2);
		expect(result.every((r) => isSubPair(r))).toBe(true);
		if (isSubPair(result[0]) && isSubPair(result[1])) {
			expect(result[0].team).toBe("home");
			expect(result[0].playerOut.name).toBe("Pérez");
			expect(result[0].playerIn.name).toBe("López");
			expect(result[1].team).toBe("away");
			expect(result[1].playerOut.name).toBe("Gómez");
			expect(result[1].playerIn.name).toBe("Ruiz");
		}
	});

	it("sintetiza SubPair para un único sub con assistName (sin par)", () => {
		const e1 = makeEvent({
			type: "subst",
			team: "home",
			minute: 70,
			playerName: "Ruiz", // entra
			assistName: "Gómez", // sale
		});
		const result = pairSubstitutions([e1]);
		expect(result).toHaveLength(1);
		expect(isSubPair(result[0])).toBe(true);
		if (isSubPair(result[0])) {
			expect(result[0].team).toBe("home");
			expect(result[0].minute).toBe(70);
			expect(result[0].playerOut.name).toBe("Gómez");
			expect(result[0].playerIn.name).toBe("Ruiz");
			expect(result[0].id).toMatch(/^subpair-single-/);
		}
	});

	it("NO sintetiza SubPair para sub sin assistName (datos incompletos)", () => {
		const e1 = makeEvent({
			type: "subst",
			team: "home",
			minute: 70,
			playerName: "Ruiz",
			assistName: null,
		});
		const result = pairSubstitutions([e1]);
		expect(result).toHaveLength(1);
		expect(isSubPair(result[0])).toBe(false);
	});

	it("mezcla eventos normales y sub pairs en el resultado", () => {
		const goal = makeEvent({ type: "goal", minute: 30, team: "home" });
		const sub1 = makeEvent({
			type: "subst",
			minute: 62,
			team: "home",
			playerName: "López",
			assistName: "Pérez",
		});
		const sub2 = makeEvent({
			type: "subst",
			minute: 62,
			team: "home",
			playerName: "Ruiz",
			assistName: "Gómez",
			id: "evt-sub2",
		});
		const yellow = makeEvent({
			type: "yellow",
			minute: 70,
			team: "away",
		});
		const result = pairSubstitutions([goal, sub1, sub2, yellow]);
		expect(result).toHaveLength(3); // goal + subPair + yellow
		const pairs = result.filter(isSubPair);
		expect(pairs).toHaveLength(1);
	});

	it("ordena el resultado por minuto real", () => {
		const sub1 = makeEvent({
			type: "subst",
			minute: 62,
			team: "home",
			playerName: "López",
			assistName: "Pérez",
		});
		const sub2 = makeEvent({
			type: "subst",
			minute: 62,
			team: "home",
			playerName: "Ruiz",
			assistName: "Gómez",
			id: "evt-sub2",
		});
		const goal = makeEvent({ type: "goal", minute: 30, team: "home" });
		// Los pasamos desordenados
		const result = pairSubstitutions([sub1, goal, sub2]);
		expect(result).toHaveLength(2);
		// El primer item debe ser el gol (minuto 30)
		expect((result[0] as MatchEvent).minute).toBe(30);
	});
});
