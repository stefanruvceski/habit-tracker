import { describe, expect, test } from "vitest";
import type { AppState, Habit } from "@habit/core";
import { progressModel, ringSvg, sparklineSvg, todayModel } from "./model";

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
    habit({ id: "run", name: "Run", order: 0, timeOfDay: "morning" }),
    habit({ id: "med", name: "Meditate", order: 1, goalType: "measurable", unit: "min", timeOfDay: "morning" }),
    habit({ id: "read", name: "Read", order: 2, goalType: "measurable", unit: "pages", target: 20, timeOfDay: "evening" }),
    habit({ id: "water", name: "Water", order: 3 }),
    habit({ id: "old", name: "Old", order: 4, archived: true }),
  ],
  entries: {
    "2026-10-21": { run: true, water: true },
    "2026-10-22": { run: true, med: 15, read: 12 },
  },
  mental: {},
  todos: [],
};

describe("widget models", () => {
  test("todayModel groups by time of day with done counts and details", () => {
    const m = todayModel(state, "2026-10-22");
    expect(m.sections.map((s) => s.timeOfDay)).toEqual(["morning", "evening", "anytime"]);
    expect(m.done).toBe(2); // run + meditate logged
    expect(m.total).toBe(4);
    const morning = m.sections[0];
    expect(morning.done).toBe(2);
    expect(morning.rows.find((r) => r.id === "med")?.detail).toBe("15 min");
    expect(m.sections[1].rows[0].detail).toBe("12 / 20 pages");
  });

  test("progressModel reports ratio, best streak and the next open section", () => {
    const p = progressModel(state, "2026-10-22");
    expect(p.ratio).toBe(0.5);
    expect(p.next).toBe("🌙 Evening · 1 left");
  });

  test("svg helpers produce valid-looking markup", () => {
    expect(sparklineSvg([1, 2, 3], 200, 60, "#fff")).toMatch(/^<svg[\s\S]*<path[\s\S]*<circle[\s\S]*<\/svg>$/);
    expect(sparklineSvg([], 200, 60, "#fff")).toContain("</svg>");
    expect(ringSvg(0.5, 100, "#0f0", "#222", "50%")).toContain("50%");
  });
});
