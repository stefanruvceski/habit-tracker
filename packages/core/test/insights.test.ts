import { test } from "node:test";
import assert from "node:assert/strict";

import type { Entries, Habit, Mental } from "../src/types.ts";
import {
  recentKeys,
  completionByWeekday,
  bestWeekday,
  habitConsistency,
  consistencyRanking,
  moodHabitLink,
} from "../src/insights.ts";
import { addDays } from "../src/date.ts";

const TODAY = "2026-08-13"; // a Thursday

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

/** Mark a daily habit done on the given keys. */
function entriesDoneOn(habitId: string, keys: string[]): Entries {
  const e: Entries = {};
  for (const k of keys) e[k] = { [habitId]: true };
  return e;
}

test("recentKeys returns the window ending today, oldest first", () => {
  const keys = recentKeys(3, TODAY);
  assert.deepEqual(keys, [addDays(TODAY, -2), addDays(TODAY, -1), TODAY]);
});

test("completionByWeekday averages progress per weekday, ignoring empty days", () => {
  const h = habit();
  // Done only on the last 7 days → each weekday appears with full progress.
  const done = recentKeys(7, TODAY);
  const stats = completionByWeekday(entriesDoneOn(h.id, done), [h], 7, TODAY);
  // Every weekday that occurred in the window is at 100%.
  for (const s of stats) {
    if (s.days > 0) assert.equal(s.progress, 1);
  }
  // Exactly 7 weekday-days contributed across the week.
  assert.equal(
    stats.reduce((n, s) => n + s.days, 0),
    7,
  );
});

test("bestWeekday picks the highest-average weekday", () => {
  const h = habit();
  // Over 14 days, complete only Thursdays (today is a Thursday).
  const keys = recentKeys(14, TODAY);
  const thursdays = keys.filter((k) => new Date(k + "T00:00:00").getDay() === 4);
  const best = bestWeekday(entriesDoneOn(h.id, thursdays), [h], 14, TODAY, 1);
  assert.ok(best);
  assert.equal(best!.weekday, 4); // Thursday
  assert.equal(best!.progress, 1);
});

test("bestWeekday returns null without enough samples", () => {
  const h = habit();
  assert.equal(bestWeekday({}, [h], 30, TODAY, 99), null);
});

test("habitConsistency counts scheduled vs done in the window", () => {
  const h = habit();
  const done = recentKeys(30, TODAY).slice(0, 15); // 15 of 30 done
  const c = habitConsistency(entriesDoneOn(h.id, done), h, 30, TODAY);
  assert.equal(c.scheduled, 30);
  assert.equal(c.done, 15);
  assert.equal(c.rate, 0.5);
});

test("consistencyRanking sorts by rate and drops unscheduled habits", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b" });
  // Future-created habit has no scheduled days in the window → dropped.
  const c = habit({ id: "c", createdAt: "2099-01-01T00:00:00.000Z" });
  const win = recentKeys(30, TODAY);
  const entries: Entries = {};
  for (const k of win) entries[k] = { a: true }; // a always done
  for (const k of win.slice(0, 6)) entries[k].b = true; // b rarely done
  const ranking = consistencyRanking(entries, [a, b, c], 30, TODAY);
  assert.deepEqual(
    ranking.map((r) => r.habit.id),
    ["a", "b"],
  );
  assert.equal(ranking[0].rate, 1);
  assert.ok(ranking[1].rate < ranking[0].rate);
});

test("moodHabitLink links higher completion to higher mood", () => {
  const h = habit();
  const win = recentKeys(10, TODAY);
  const entries: Entries = {};
  const mental: Mental = {};
  win.forEach((k, i) => {
    const good = i >= 5; // second half = done + happy
    if (good) entries[k] = { [h.id]: true };
    mental[k] = { mood: good ? 80 : 40, motivation: 50 };
  });
  const link = moodHabitLink(entries, [h], mental, 10, TODAY);
  assert.ok(link);
  assert.ok(link!.delta > 0);
  assert.equal(link!.goodDaysMood, 80);
  assert.equal(link!.offDaysMood, 40);
});

test("moodHabitLink returns null without enough overlapping data", () => {
  const h = habit();
  assert.equal(moodHabitLink({}, [h], {}, 30, TODAY), null);
});
