import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
  WEEKDAY_ORDER_MON,
  toKey,
  makeKey,
  fromKey,
  todayKey,
  daysInMonth,
  firstWeekday,
  monthKeys,
  addDays,
  weekdayOf,
  mondayIndex,
  weekOfMonth,
} from "../src/date.ts";

test("month/weekday label arrays have the expected lengths", () => {
  assert.equal(MONTH_NAMES.length, 12);
  assert.equal(MONTH_SHORT.length, 12);
  assert.equal(MONTH_NAMES[0], "January");
  assert.equal(MONTH_SHORT[11], "Dec");
  assert.equal(WEEKDAY_SHORT.length, 7);
  assert.equal(WEEKDAY_LONG.length, 7);
  assert.deepEqual(WEEKDAY_ORDER_MON, [1, 2, 3, 4, 5, 6, 0]);
});

test("toKey / makeKey zero-pad month and day", () => {
  assert.equal(toKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(makeKey(2026, 0, 5), "2026-01-05");
  assert.equal(makeKey(2026, 11, 31), "2026-12-31");
  assert.equal(makeKey(2026, 9, 10), "2026-10-10");
});

test("fromKey round-trips a key to a local date", () => {
  const d = fromKey("2026-03-15");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 15);
  assert.equal(toKey(d), "2026-03-15");
});

test("todayKey matches the local date", () => {
  assert.equal(todayKey(), toKey(new Date()));
});

test("daysInMonth handles leap years", () => {
  assert.equal(daysInMonth(2026, 0), 31); // Jan
  assert.equal(daysInMonth(2026, 1), 28); // Feb 2026
  assert.equal(daysInMonth(2024, 1), 29); // Feb 2024 (leap)
  assert.equal(daysInMonth(2026, 3), 30); // Apr
});

test("firstWeekday returns the getDay() of the 1st", () => {
  assert.equal(firstWeekday(2026, 0), new Date(2026, 0, 1).getDay());
});

test("monthKeys lists every day in order", () => {
  const feb = monthKeys(2026, 1);
  assert.equal(feb.length, 28);
  assert.equal(feb[0], "2026-02-01");
  assert.equal(feb[27], "2026-02-28");
});

test("addDays moves forward and backward across month boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-05-10", 0), "2026-05-10");
});

test("weekdayOf and mondayIndex agree (Monday = 0)", () => {
  // 2026-08-10 is a Monday.
  assert.equal(weekdayOf("2026-08-10"), 1);
  assert.equal(mondayIndex("2026-08-10"), 0);
  // 2026-08-09 is a Sunday.
  assert.equal(weekdayOf("2026-08-09"), 0);
  assert.equal(mondayIndex("2026-08-09"), 6);
});

test("weekOfMonth groups days into 1-based weeks", () => {
  assert.equal(weekOfMonth(2026, 7, 1), 1); // first day
  assert.ok(weekOfMonth(2026, 7, 31) >= 5); // last day is in a later week
});
