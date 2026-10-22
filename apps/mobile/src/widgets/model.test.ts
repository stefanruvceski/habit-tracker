import { describe, expect, test } from "vitest";
import type { AppState, Habit } from "@habit/core";
import { pickWeightHabit, progressModel, ringSvg, sparklineSvg, todayModel, weightModel } from "./model";

function habit(over: Partial<Habit>): Habit {
  return {
    id: "x",
    name: "X",
    emoji: "✅",
    color: "#34d399",
    type: "build",
    schedule: { type: "daily" },
    archived: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const state: AppState = {
  version: 2,
  habits: [
    habit({ id: "gym", name: "Gym", order: 0, timeOfDay: "morning" }),
    habit({ id: "kg", name: "Kilaža", order: 1, goalType: "measurable", unit: "kg", timeOfDay: "morning" }),
    habit({ id: "read", name: "Read", order: 2, goalType: "measurable", unit: "pages", target: 20, timeOfDay: "evening" }),
    habit({ id: "water", name: "Water", order: 3 }),
    habit({ id: "old", name: "Old", order: 4, archived: true }),
  ],
  entries: {
    "2026-10-01": { kg: 84 },
    "2026-10-15": { kg: 83.2 },
    "2026-10-21": { gym: true, water: true },
    "2026-10-22": { gym: true, kg: 82.4, read: 12 },
  },
  mental: {},
  todos: [],
};

describe("widget models", () => {
  test("todayModel groups by time of day with done counts and details", () => {
    const m = todayModel(state, "2026-10-22");
    expect(m.sections.map((s) => s.timeOfDay)).toEqual(["morning", "evening", "anytime"]);
    expect(m.done).toBe(2); // gym + weight logged
    expect(m.total).toBe(4);
    const morning = m.sections[0];
    expect(morning.done).toBe(2);
    expect(morning.rows.find((r) => r.id === "kg")?.detail).toBe("82,4 kg");
    expect(m.sections[1].rows[0].detail).toBe("12 / 20 pages");
  });

  test("progressModel reports ratio, best streak and the next open section", () => {
    const p = progressModel(state, "2026-10-22");
    expect(p.ratio).toBe(0.5);
    expect(p.next).toBe("🌙 Evening · 1 left");
  });

  test("weightModel follows the kg habit and reports the 30-day change", () => {
    expect(pickWeightHabit(state)?.id).toBe("kg");
    const w = weightModel(state, "2026-10-22")!;
    expect(w.last).toBe("82,4");
    expect(w.loggedToday).toBe(true);
    expect(w.values).toEqual([84, 83.2, 82.4]);
    expect(w.change).toBe("▼ 1,6 kg / 30d");
  });

  test("weightModel is null without measurable habits", () => {
    expect(weightModel({ ...state, habits: [habit({ id: "a" })] }, "2026-10-22")).toBeNull();
  });

  test("svg helpers produce valid-looking markup", () => {
    expect(sparklineSvg([1, 2, 3], 200, 60, "#fff")).toMatch(/^<svg[\s\S]*<path[\s\S]*<circle[\s\S]*<\/svg>$/);
    expect(sparklineSvg([], 200, 60, "#fff")).toContain("</svg>");
    expect(ringSvg(0.5, 100, "#0f0", "#222", "50%")).toContain("50%");
  });
});
