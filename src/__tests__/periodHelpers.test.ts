import { describe, expect, it } from "vitest";
import {
	getEventPeriod,
	getPeriodLabel,
	groupEventsByPeriod,
} from "../lib/periodHelpers";
import type { MatchEvent } from "../lib/types";

function makeEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
	return {
		id: `evt-${Math.random().toString(36).slice(2)}`,
		type: "goal",
		minute: 10,
		extra: null,
		team: "home",
		playerName: "X",
		assistName: null,
		detail: null,
		comments: null,
		...overrides,
	};
}

describe("getEventPeriod", () => {
	it("1-45 → 1T", () => {
		expect(getEventPeriod(makeEvent({ minute: 1 }))).toBe("1T");
		expect(getEventPeriod(makeEvent({ minute: 30 }))).toBe("1T");
		expect(getEventPeriod(makeEvent({ minute: 45 }))).toBe("1T");
	});

	it("45+3 (con extra) sigue en 1T", () => {
		expect(getEventPeriod(makeEvent({ minute: 45, extra: 3 }))).toBe("1T");
	});

	it("46-90 → 2T", () => {
		expect(getEventPeriod(makeEvent({ minute: 46 }))).toBe("2T");
		expect(getEventPeriod(makeEvent({ minute: 60 }))).toBe("2T");
		expect(getEventPeriod(makeEvent({ minute: 90 }))).toBe("2T");
	});

	it("90+5 (con extra) sigue en 2T", () => {
		expect(getEventPeriod(makeEvent({ minute: 90, extra: 5 }))).toBe("2T");
	});

	it("91-105 → ET1", () => {
		expect(getEventPeriod(makeEvent({ minute: 91 }))).toBe("ET1");
		expect(getEventPeriod(makeEvent({ minute: 105 }))).toBe("ET1");
	});

	it("106-120 → ET2", () => {
		expect(getEventPeriod(makeEvent({ minute: 106 }))).toBe("ET2");
		expect(getEventPeriod(makeEvent({ minute: 120 }))).toBe("ET2");
	});

	it("121+ → PEN", () => {
		expect(getEventPeriod(makeEvent({ minute: 121 }))).toBe("PEN");
		expect(getEventPeriod(makeEvent({ minute: 150 }))).toBe("PEN");
	});

	it("minuto 0 → 1T (pre-partido/kickoff)", () => {
		expect(getEventPeriod(makeEvent({ minute: 0 }))).toBe("1T");
	});

	it("minuto negativo → 1T (clamp)", () => {
		expect(getEventPeriod(makeEvent({ minute: -5 }))).toBe("1T");
	});
});

describe("getPeriodLabel", () => {
	it("retorna labels correctos para cada período", () => {
		expect(getPeriodLabel("1T")).toBe("1T · 0–45'");
		expect(getPeriodLabel("2T")).toBe("2T · 46–90'");
		expect(getPeriodLabel("ET1")).toBe("ET · 91–105'");
		expect(getPeriodLabel("ET2")).toBe("ET · 106–120'");
		expect(getPeriodLabel("PEN")).toBe("PENALES");
	});
});

describe("groupEventsByPeriod", () => {
	it("retorna array vacío con 0 eventos", () => {
		expect(groupEventsByPeriod([])).toEqual([]);
	});

	it("retorna array vacío con null/undefined", () => {
		expect(groupEventsByPeriod(null)).toEqual([]);
		expect(groupEventsByPeriod(undefined)).toEqual([]);
	});

	it("agrupa eventos en el bucket correcto", () => {
		const events: MatchEvent[] = [
			makeEvent({ minute: 10, type: "goal" }),
			makeEvent({ minute: 70, type: "yellow" }),
			makeEvent({ minute: 95, type: "red" }),
		];
		const groups = groupEventsByPeriod(events);
		expect(groups).toHaveLength(3);
		expect(groups[0].id).toBe("1T");
		expect(groups[0].events).toHaveLength(1);
		expect(groups[1].id).toBe("2T");
		expect(groups[1].events).toHaveLength(1);
		expect(groups[2].id).toBe("ET1");
		expect(groups[2].events).toHaveLength(1);
	});

	it("omite períodos sin eventos", () => {
		const events: MatchEvent[] = [
			makeEvent({ minute: 10, type: "goal" }),
			makeEvent({ minute: 70, type: "yellow" }),
		];
		const groups = groupEventsByPeriod(events);
		expect(groups.map((g) => g.id)).toEqual(["1T", "2T"]);
	});

	it("ordena eventos dentro de cada grupo por minuto real", () => {
		const events: MatchEvent[] = [
			makeEvent({ minute: 30, type: "goal" }),
			makeEvent({ minute: 5, type: "goal" }),
			makeEvent({ minute: 20, type: "goal" }),
		];
		const groups = groupEventsByPeriod(events);
		expect(groups[0].events.map((e) => e.minute)).toEqual([5, 20, 30]);
	});

	it("usa el orden canónico de períodos (1T → 2T → ET1 → ET2 → PEN)", () => {
		const events: MatchEvent[] = [
			makeEvent({ minute: 70, type: "goal" }), // 2T
			makeEvent({ minute: 10, type: "goal" }), // 1T
			makeEvent({ minute: 130, type: "goal" }), // PEN
		];
		const groups = groupEventsByPeriod(events);
		expect(groups.map((g) => g.id)).toEqual(["1T", "2T", "PEN"]);
	});

	it("el label del grupo coincide con getPeriodLabel", () => {
		const events: MatchEvent[] = [
			makeEvent({ minute: 10, type: "goal" }),
			makeEvent({ minute: 95, type: "goal" }),
		];
		const groups = groupEventsByPeriod(events);
		expect(groups[0].label).toBe("1T · 0–45'");
		expect(groups[1].label).toBe("ET · 91–105'");
	});
});
