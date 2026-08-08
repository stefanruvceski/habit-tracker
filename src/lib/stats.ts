import {
  addDays,
  daysInMonth,
  fromKey,
  makeKey,
  monthKeys,
  todayKey,
  weekdayOf,
} from "./date";
import { AppState, Entries, Habit, Mental } from "./types";

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
  for (const h of habits) if (isDone(entries, h.id, dateKey)) n++;
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
    if (isScheduled(h, dateKey) && isDone(entries, h.id, dateKey)) done++;
  }
  return done / scheduled;
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
      if (isDone(state.entries, h.id, k)) done++;
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
    if (isDone(entries, habit.id, k)) done++;
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
  if (isScheduled(habit, cursor) && !isDone(entries, habit.id, cursor)) {
    cursor = addDays(cursor, -1);
  }
  const start = habit.createdAt.slice(0, 10);
  let guard = 0;
  while (cursor >= start && guard < 3660) {
    guard++;
    if (isScheduled(habit, cursor)) {
      if (isDone(entries, habit.id, cursor)) streak++;
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
      if (isDone(entries, habit.id, cursor)) {
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
