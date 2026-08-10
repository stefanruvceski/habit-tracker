import { test } from "node:test";
import assert from "node:assert/strict";

import type { AppState, Habit } from "../src/types.ts";
import {
  isScheduled,
  isDone,
  doneCountOnDate,
  scheduledCountOnDate,
  dayProgress,
  combinedDayCounts,
  combinedDayProgress,
  monthStats,
  habitMonthRatio,
  currentStreak,
  bestStreak,
  mindsetScore,
  yearSummary,
  availableYears,
} from "../src/stats.ts";
import type { Todo } from "../src/todos.ts";
import { addDays, todayKey } from "../src/date.ts";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
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

function appState(over: Partial<AppState> = {}): AppState {
  return { version: 2, habits: [], entries: {}, mental: {}, todos: [], ...over };
}

test("isScheduled: daily is always on (after creation)", () => {
  const h = habit({ createdAt: "2026-01-01T00:00:00Z" });
  assert.equal(isScheduled(h, "2026-01-01"), true);
  assert.equal(isScheduled(h, "2025-12-31"), false); // before it existed
});

test("isScheduled: weekdays only on listed days", () => {
  const h = habit({ schedule: { type: "weekdays", days: [1, 3, 5] } }); // Mon/Wed/Fri
  assert.equal(isScheduled(h, "2026-08-10"), true); // Monday
  assert.equal(isScheduled(h, "2026-08-11"), false); // Tuesday
});

test("isScheduled: weekly counts any day", () => {
  const h = habit({ schedule: { type: "weekly", times: 3 } });
  assert.equal(isScheduled(h, "2026-08-11"), true);
});

test("isDone reads the entries map", () => {
  const entries = { "2026-08-10": { h1: true } };
  assert.equal(isDone(entries, "h1", "2026-08-10"), true);
  assert.equal(isDone(entries, "h1", "2026-08-11"), false);
  assert.equal(isDone(entries, "h2", "2026-08-10"), false);
});

test("doneCountOnDate and scheduledCountOnDate count across habits", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b", schedule: { type: "weekdays", days: [1] } }); // Monday only
  const entries = { "2026-08-10": { a: true } };
  // 2026-08-10 is Monday: both scheduled, one done.
  assert.equal(scheduledCountOnDate([a, b], "2026-08-10"), 2);
  assert.equal(doneCountOnDate(entries, [a, b], "2026-08-10"), 1);
  // Tuesday: only a scheduled.
  assert.equal(scheduledCountOnDate([a, b], "2026-08-11"), 1);
});

test("dayProgress is done/scheduled, 0 when nothing scheduled", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b" });
  const entries = { "2026-08-10": { a: true } };
  assert.equal(dayProgress(entries, [a, b], "2026-08-10"), 0.5);
  const future = habit({ id: "c", createdAt: "2099-01-01T00:00:00Z" });
  assert.equal(dayProgress({}, [future], "2026-08-10"), 0); // none scheduled
});

test("combinedDayCounts merges habits and to-dos for a day", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b" });
  const entries = { "2026-08-10": { a: true } }; // 1 of 2 habits done
  const todos: Todo[] = [
    { id: "t1", title: "x", date: "2026-08-10", done: true, order: 0, createdAt: "" },
    { id: "t2", title: "y", date: "2026-08-10", done: false, order: 1, createdAt: "" },
    { id: "t3", title: "z", date: "2026-08-11", done: true, order: 0, createdAt: "" },
  ];
  const c = combinedDayCounts(entries, [a, b], todos, "2026-08-10");
  assert.equal(c.total, 4); // 2 habits + 2 todos that day
  assert.equal(c.done, 2); // 1 habit + 1 todo
  assert.equal(c.progress, 0.5);
  assert.equal(combinedDayProgress(entries, [a, b], todos, "2026-08-10"), 0.5);
});

test("combinedDayProgress is 0 when nothing is scheduled or listed", () => {
  assert.equal(combinedDayProgress({}, [], [], "2026-08-10"), 0);
});

test("monthStats aggregates a month", () => {
  const a = habit({ id: "a" });
  const entries: AppState["entries"] = {
    "2026-08-01": { a: true },
    "2026-08-02": { a: true },
  };
  const s = monthStats(appState({ entries }), [a], 2026, 7); // August
  assert.equal(s.habitCount, 1);
  assert.equal(s.totalScheduled, 31);
  assert.equal(s.totalDone, 2);
  assert.ok(Math.abs(s.progress - 2 / 31) < 1e-9);
});

test("monthStats progress is 0 when nothing scheduled", () => {
  const future = habit({ createdAt: "2099-01-01T00:00:00Z" });
  const s = monthStats(appState(), [future], 2026, 7);
  assert.equal(s.totalScheduled, 0);
  assert.equal(s.progress, 0);
});

test("habitMonthRatio for a single habit", () => {
  const h = habit({ id: "a", schedule: { type: "weekdays", days: [1] } }); // Mondays
  // August 2026 Mondays: 3,10,17,24,31 → 5. Mark two done.
  const entries = { "2026-08-03": { a: true }, "2026-08-10": { a: true } };
  assert.ok(Math.abs(habitMonthRatio(entries, h, 2026, 7) - 2 / 5) < 1e-9);
  // A month with no scheduled days → 0.
  const none = habit({ createdAt: "2099-01-01T00:00:00Z" });
  assert.equal(habitMonthRatio({}, none, 2026, 7), 0);
});

test("currentStreak counts consecutive completed days up to today", () => {
  const h = habit({ createdAt: "2026-01-01T00:00:00Z" });
  const t = todayKey();
  const entries = {
    [t]: { h1: true },
    [addDays(t, -1)]: { h1: true },
    [addDays(t, -2)]: { h1: true },
  };
  assert.equal(currentStreak(entries, h), 3);
});

test("currentStreak allows today to be pending (counts from yesterday)", () => {
  const h = habit({ createdAt: "2026-01-01T00:00:00Z" });
  const t = todayKey();
  const entries = {
    [addDays(t, -1)]: { h1: true },
    [addDays(t, -2)]: { h1: true },
  };
  // today scheduled but not done → streak counts yesterday + day before = 2
  assert.equal(currentStreak(entries, h), 2);
});

test("currentStreak breaks on a missed scheduled day", () => {
  const h = habit({ createdAt: "2026-01-01T00:00:00Z" });
  const t = todayKey();
  const entries = {
    [t]: { h1: true },
    // yesterday missing → break
    [addDays(t, -2)]: { h1: true },
  };
  assert.equal(currentStreak(entries, h), 1);
});

test("bestStreak finds the longest run, 0 when empty", () => {
  const h = habit({ id: "a", createdAt: "2026-08-01T00:00:00Z" });
  assert.equal(bestStreak({}, h), 0);
  const entries = {
    "2026-08-01": { a: true },
    "2026-08-02": { a: true },
    "2026-08-03": { a: true },
    // gap on 4th
    "2026-08-05": { a: true },
  };
  assert.equal(bestStreak(entries, h), 3);
});

test("mindsetScore averages days with data, skipping empty/zero", () => {
  const mental = {
    "2026-08-01": { mood: 80, motivation: 60 }, // 70
    "2026-08-02": { mood: 0, motivation: 0 }, // skipped
    "2026-08-03": { mood: 100, motivation: 90 }, // 95
  };
  assert.ok(Math.abs(mindsetScore(mental, 2026, 7) - 82.5) < 1e-9);
  assert.equal(mindsetScore({}, 2026, 7), 0);
});

test("yearSummary returns 12 months with per-month active counts", () => {
  const a = habit({ id: "a", createdAt: "2026-06-01T00:00:00Z" });
  const summary = yearSummary(appState({ habits: [a] }), [a], 2026);
  assert.equal(summary.length, 12);
  assert.equal(summary[0].habitCount, 0); // Jan: created in June
  assert.equal(summary[5].habitCount, 1); // June onward
  assert.equal(summary[11].habitCount, 1);
});

test("availableYears includes data years plus the current year, desc", () => {
  const state = appState({
    entries: { "2024-01-01": { a: true } },
    mental: { "2022-05-01": { mood: 50, motivation: 50 } },
  });
  const years = availableYears(state);
  assert.ok(years.includes(2024));
  assert.ok(years.includes(2022));
  assert.ok(years.includes(new Date().getFullYear()));
  for (let i = 1; i < years.length; i++) assert.ok(years[i - 1] > years[i]);
});
