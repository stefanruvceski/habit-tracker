import {
  addDays,
  daysInMonth,
  fromKey,
  makeKey,
  monthKeys,
  todayKey,
  weekdayOf,
} from "./date";
import type { AppState, Entries, Habit, Mental } from "./types";
import type { Todo } from "./todos";
import { todoCounts } from "./todos";

/** Whether a habit tracks a numeric amount rather than a simple checkbox. */
export function isMeasurable(habit: Habit): boolean {
  return habit.goalType === "measurable";
}

/** Logged amount for a habit on a date (booleans map to 1 / 0). */
export function amountOn(entries: Entries, habitId: string, dateKey: string): number {
  const v = entries[dateKey]?.[habitId];
  if (typeof v === "number") return v;
  return v ? 1 : 0;
}

/**
 * Whether a habit counts as "done" on a date, honouring measurable targets:
 * build reaches the target (amount ≥ target), quit stays under it
 * (amount ≤ target). A measurable habit with no logged amount is not done.
 */
export function isDoneOn(habit: Habit, entries: Entries, dateKey: string): boolean {
  const v = entries[dateKey]?.[habit.id];
  if (habit.goalType === "measurable") {
    if (typeof v !== "number") return false;
    const target = habit.target ?? 0;
    if (target <= 0) return v > 0;
    return habit.type === "quit" ? v <= target : v >= target;
  }
  return Boolean(v);
}

/** Roll up a measurable habit's amounts over the given date keys. */
export function periodAmount(entries: Entries, habit: Habit, keys: string[]): number {
  const vals: number[] = [];
  for (const k of keys) {
    const v = entries[k]?.[habit.id];
    if (typeof v === "number") vals.push(v);
    else if (v) vals.push(1);
  }
  if (vals.length === 0) return 0;
  switch (habit.aggregation ?? "sum") {
    case "avg":
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    case "max":
      return Math.max(...vals);
    case "last":
      return vals[vals.length - 1];
    case "sum":
    default:
      return vals.reduce((a, b) => a + b, 0);
  }
}

/** Whether a habit is "scheduled" (expected) on a given date. */
export function isScheduled(habit: Habit, dateKey: string): boolean {
  const created = habit.createdAt.slice(0, 10);
  if (dateKey < created) return false; // don't count days before it existed
  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return habit.schedule.days.includes(weekdayOf(dateKey));
    case "weekly":
      return true; // any day counts toward a weekly target
  }
}

export function isDone(entries: Entries, habitId: string, dateKey: string): boolean {
  return Boolean(entries[dateKey]?.[habitId]);
}

/** Count of habits done on a date (only among the provided habits). */
export function doneCountOnDate(
  entries: Entries,
  habits: Habit[],
  dateKey: string,
): number {
  let n = 0;
  for (const h of habits) if (isDoneOn(h, entries, dateKey)) n++;
  return n;
}

/** Count of habits scheduled on a date. */
export function scheduledCountOnDate(habits: Habit[], dateKey: string): number {
  let n = 0;
  for (const h of habits) if (isScheduled(h, dateKey)) n++;
  return n;
}

/** Day progress 0..1 based on scheduled habits. */
export function dayProgress(
  entries: Entries,
  habits: Habit[],
  dateKey: string,
): number {
  const scheduled = scheduledCountOnDate(habits, dateKey);
  if (scheduled === 0) return 0;
  let done = 0;
  for (const h of habits) {
    if (isScheduled(h, dateKey) && isDoneOn(h, entries, dateKey)) done++;
  }
  return done / scheduled;
}

/**
 * Combined daily agenda counts: scheduled habits + to-dos dated that day, and
 * how many of each are done. This is the "did I close the day" number.
 */
export function combinedDayCounts(
  entries: Entries,
  habits: Habit[],
  todos: Todo[],
  dateKey: string,
): { done: number; total: number; progress: number } {
  const habitTotal = scheduledCountOnDate(habits, dateKey);
  const habitDone = doneCountOnDate(entries, habits, dateKey);
  const tc = todoCounts(todos, dateKey);
  const total = habitTotal + tc.total;
  const done = habitDone + tc.done;
  return { done, total, progress: total ? done / total : 0 };
}

/** Combined daily progress (habits + to-dos) as a 0..1 fraction. */
export function combinedDayProgress(
  entries: Entries,
  habits: Habit[],
  todos: Todo[],
  dateKey: string,
): number {
  return combinedDayCounts(entries, habits, todos, dateKey).progress;
}

export interface MonthStats {
  totalScheduled: number;
  totalDone: number;
  progress: number; // 0..1
  habitCount: number;
}

export function monthStats(
  state: AppState,
  habits: Habit[],
  year: number,
  month: number,
): MonthStats {
  const keys = monthKeys(year, month);
  let scheduled = 0;
  let done = 0;
  for (const k of keys) {
    for (const h of habits) {
      if (!isScheduled(h, k)) continue;
      scheduled++;
      if (isDoneOn(h, state.entries, k)) done++;
    }
  }
  return {
    totalScheduled: scheduled,
    totalDone: done,
    progress: scheduled ? done / scheduled : 0,
    habitCount: habits.length,
  };
}

/** Completion ratio for one habit within a month (0..1). */
export function habitMonthRatio(
  entries: Entries,
  habit: Habit,
  year: number,
  month: number,
): number {
  const keys = monthKeys(year, month);
  let scheduled = 0;
  let done = 0;
  for (const k of keys) {
    if (!isScheduled(habit, k)) continue;
    scheduled++;
    if (isDoneOn(habit, entries, k)) done++;
  }
  return scheduled ? done / scheduled : 0;
}

/**
 * Current streak (consecutive scheduled days completed up to today, inclusive).
 * Non-scheduled days are skipped (don't break the streak).
 */
export function currentStreak(entries: Entries, habit: Habit): number {
  let streak = 0;
  let cursor = todayKey();
  // If today is scheduled but not yet done, allow the streak to count from yesterday.
  if (isScheduled(habit, cursor) && !isDoneOn(habit, entries, cursor)) {
    cursor = addDays(cursor, -1);
  }
  const start = habit.createdAt.slice(0, 10);
  let guard = 0;
  while (cursor >= start && guard < 3660) {
    guard++;
    if (isScheduled(habit, cursor)) {
      if (isDoneOn(habit, entries, cursor)) streak++;
      else break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive scheduled+completed days ever. */
export function bestStreak(entries: Entries, habit: Habit): number {
  const dates = Object.keys(entries)
    .filter((k) => entries[k]?.[habit.id])
    .sort();
  if (dates.length === 0) return 0;
  const start = habit.createdAt.slice(0, 10);
  const end = todayKey();
  let best = 0;
  let run = 0;
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 3660) {
    guard++;
    if (isScheduled(habit, cursor)) {
      if (isDoneOn(habit, entries, cursor)) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

/** Mindset score for a month: average of (mood+motivation)/2 over days with data (0..100). */
export function mindsetScore(mental: Mental, year: number, month: number): number {
  const keys = monthKeys(year, month);
  let sum = 0;
  let count = 0;
  for (const k of keys) {
    const m = mental[k];
    if (!m) continue;
    if (m.mood === 0 && m.motivation === 0) continue;
    sum += (m.mood + m.motivation) / 2;
    count++;
  }
  return count ? sum / count : 0;
}

export interface YearMonthSummary {
  month: number;
  habitCount: number;
  completed: number;
  progress: number; // 0..1
  mindset: number; // 0..100
}

export function yearSummary(
  state: AppState,
  habits: Habit[],
  year: number,
): YearMonthSummary[] {
  const out: YearMonthSummary[] = [];
  for (let m = 0; m < 12; m++) {
    const ms = monthStats(state, habits, year, m);
    // Count habits that already existed by the end of this month.
    const monthEnd = makeKey(year, m, daysInMonth(year, m));
    const activeThatMonth = habits.filter(
      (h) => h.createdAt.slice(0, 10) <= monthEnd,
    ).length;
    out.push({
      month: m,
      habitCount: activeThatMonth,
      completed: ms.totalDone,
      progress: ms.progress,
      mindset: mindsetScore(state.mental, year, m),
    });
  }
  return out;
}

/** Distinct years that have any data, plus the current year. */
export function availableYears(state: AppState): number[] {
  const years = new Set<number>();
  years.add(new Date().getFullYear());
  for (const k of Object.keys(state.entries)) years.add(fromKey(k).getFullYear());
  for (const k of Object.keys(state.mental)) years.add(fromKey(k).getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}
