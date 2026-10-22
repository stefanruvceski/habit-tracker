import { test } from "node:test";
import assert from "node:assert/strict";

import type { Entries, Habit } from "../src/types.ts";
import {
  formatAmount,
  groupByTimeOfDay,
  measurableSeries,
  parseAmount,
  planTimeOfDayReminders,
  seriesSummary,
  sortByTimeOfDay,
  DEFAULT_TIME_OF_DAY_REMINDERS,
  type TimeOfDayReminderSettings,
} from "../src/routine.ts";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "H",
    emoji: "✅",
    color: "#fff",
    type: "build",
    schedule: { type: "daily" },
    archived: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

test("parseAmount accepts decimal comma, point and units", () => {
  assert.equal(parseAmount("82,4"), 82.4);
  assert.equal(parseAmount("82.45"), 82.45);
  assert.equal(parseAmount(" 81,9 kg"), 81.9);
  assert.equal(parseAmount("20"), 20);
  assert.equal(parseAmount(",5"), 0.5);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("kg"), null);
});

test("formatAmount uses a decimal comma and trims", () => {
  assert.equal(formatAmount(82.4), "82,4");
  assert.equal(formatAmount(82), "82");
  assert.equal(formatAmount(82.456), "82,46");
});

test("sort and group by time of day, keeping own order inside", () => {
  const hs = [
    habit({ id: "a", order: 0 }),
    habit({ id: "b", order: 1, timeOfDay: "evening" }),
    habit({ id: "c", order: 2, timeOfDay: "morning" }),
    habit({ id: "d", order: 3, timeOfDay: "morning" }),
  ];
  assert.deepEqual(sortByTimeOfDay(hs).map((h) => h.id), ["c", "d", "b", "a"]);
  const g = groupByTimeOfDay(hs);
  assert.deepEqual(g.map((x) => x.timeOfDay), ["morning", "evening", "anytime"]);
  assert.deepEqual(g[0].habits.map((h) => h.id), ["c", "d"]);
});

test("measurableSeries returns numeric values in range, oldest first", () => {
  const e: Entries = {
    "2026-10-03": { w: 82.1 },
    "2026-10-01": { w: 83 },
    "2026-09-30": { w: 84 },
    "2026-10-02": { other: 1 },
    "2026-10-05": { w: true },
  };
  const s = measurableSeries(e, "w", "2026-10-01", "2026-10-31");
  assert.deepEqual(s, [
    { dateKey: "2026-10-01", value: 83 },
    { dateKey: "2026-10-03", value: 82.1 },
  ]);
  const sum = seriesSummary(s);
  assert.equal(sum.last, 82.1);
  assert.ok(Math.abs((sum.delta ?? 0) + 0.9) < 1e-9);
  assert.equal(seriesSummary([]).last, null);
});

const allOn: TimeOfDayReminderSettings = {
  morning: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.morning },
  afternoon: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.afternoon },
  evening: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.evening },
  anytime: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.anytime },
};

test("planTimeOfDayReminders skips past times, done sections and empty sections", () => {
  const hs = [
    habit({ id: "m1", name: "Weigh in", timeOfDay: "morning", goalType: "measurable" }),
    habit({ id: "e1", name: "Read", timeOfDay: "evening" }),
    habit({ id: "a1", name: "Water" }),
  ];
  const now = new Date(2026, 9, 22, 10, 30); // 22 Oct 10:30, morning reminder already past
  const entries: Entries = { "2026-10-22": { e1: true } }; // evening already done today
  const plan = planTimeOfDayReminders(hs, entries, allOn, now, "2026-10-22", 2);
  const ids = plan.map((p) => p.id);
  assert.deepEqual(ids, [
    "tod-anytime-2026-10-22",
    "tod-morning-2026-10-23",
    "tod-evening-2026-10-23",
    "tod-anytime-2026-10-23",
  ]);
  assert.equal(plan[0].at.getHours(), 20);
  assert.equal(plan[0].body, "Time for Water");
});

test("planTimeOfDayReminders respects disabled sections and lists several habits", () => {
  const hs = ["A", "B", "C", "D", "E"].map((n, i) =>
    habit({ id: n, name: n, order: i, timeOfDay: "afternoon" }),
  );
  const settings = { ...allOn, afternoon: { ...allOn.afternoon, enabled: true } };
  const plan = planTimeOfDayReminders(hs, {}, settings, new Date(2026, 9, 22, 8), "2026-10-22", 1);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].body, "5 to go: A, B, C, D +1");
  const off = { ...allOn, afternoon: { ...allOn.afternoon, enabled: false } };
  assert.equal(planTimeOfDayReminders(hs, {}, off, new Date(2026, 9, 22, 8), "2026-10-22", 1).length, 0);
});
