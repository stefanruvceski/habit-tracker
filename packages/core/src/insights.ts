import { addDays, todayKey, weekdayOf } from "./date";
import type { Entries, Habit, Mental } from "./types";
import { dayProgress, isDoneOn, isScheduled, scheduledCountOnDate } from "./stats";

/**
 * Automatic "insights" derived from recent history — the patterns you can't see
 * from a single day: which weekday you're strongest, which habit is slipping,
 * and whether completing habits tracks with a better mood.
 *
 * All pure and windowed over the last `days` (default 30) ending today.
 */

/** The last `days` date keys ending at `today` (inclusive), oldest first. */
export function recentKeys(days: number, today: string = todayKey()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(addDays(today, -i));
  return keys;
}

export interface WeekdayStat {
  /** JS weekday index: 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** Average day progress (0..1) across days of this weekday that had habits. */
  progress: number;
  /** How many days of this weekday contributed (had ≥1 scheduled habit). */
  days: number;
}

/**
 * Average habit completion grouped by weekday over the window. Only days with at
 * least one scheduled habit count, so empty days don't drag an average down.
 */
export function completionByWeekday(
  entries: Entries,
  habits: Habit[],
  days = 30,
  today: string = todayKey(),
): WeekdayStat[] {
  const sum = new Array(7).fill(0) as number[];
  const count = new Array(7).fill(0) as number[];
  for (const key of recentKeys(days, today)) {
    if (scheduledCountOnDate(habits, key) === 0) continue;
    const wd = weekdayOf(key);
    sum[wd] += dayProgress(entries, habits, key);
    count[wd] += 1;
  }
  return sum.map((s, wd) => ({
    weekday: wd,
    progress: count[wd] ? s / count[wd] : 0,
    days: count[wd],
  }));
}

/** The weekday with the highest average completion (needs `minDays` samples). */
export function bestWeekday(
  entries: Entries,
  habits: Habit[],
  days = 30,
  today: string = todayKey(),
  minDays = 2,
): WeekdayStat | null {
  const stats = completionByWeekday(entries, habits, days, today).filter(
    (s) => s.days >= minDays,
  );
  if (stats.length === 0) return null;
  return stats.reduce((best, s) => (s.progress > best.progress ? s : best));
}

export interface HabitConsistency {
  habit: Habit;
  scheduled: number;
  done: number;
  /** Completion rate 0..1 over the habit's scheduled days in the window. */
  rate: number;
}

/** One habit's completion rate over its scheduled days in the window. */
export function habitConsistency(
  entries: Entries,
  habit: Habit,
  days = 30,
  today: string = todayKey(),
): HabitConsistency {
  let scheduled = 0;
  let done = 0;
  for (const key of recentKeys(days, today)) {
    if (!isScheduled(habit, key)) continue;
    scheduled += 1;
    if (isDoneOn(habit, entries, key)) done += 1;
  }
  return { habit, scheduled, done, rate: scheduled ? done / scheduled : 0 };
}

/**
 * Habits ranked by completion rate over the window (highest first). Habits with
 * no scheduled days in the window are omitted — there's nothing to say yet.
 */
export function consistencyRanking(
  entries: Entries,
  habits: Habit[],
  days = 30,
  today: string = todayKey(),
): HabitConsistency[] {
  return habits
    .map((h) => habitConsistency(entries, h, days, today))
    .filter((c) => c.scheduled > 0)
    .sort((a, b) => b.rate - a.rate);
}

export interface MoodHabitLink {
  /** Average mood (0..100) on higher-completion days. */
  goodDaysMood: number;
  /** Average mood (0..100) on lower-completion days. */
  offDaysMood: number;
  /** goodDaysMood − offDaysMood (positive = habits track with better mood). */
  delta: number;
  /** Days that had both a habit schedule and a logged mood. */
  samples: number;
}

/**
 * Does completing habits go with a better mood? Splits the window's days at the
 * median completion and compares the average logged mood of the two halves.
 * Returns null when there isn't enough overlapping data to say anything.
 */
export function moodHabitLink(
  entries: Entries,
  habits: Habit[],
  mental: Mental,
  days = 30,
  today: string = todayKey(),
  minSamples = 6,
): MoodHabitLink | null {
  const points: Array<{ progress: number; mood: number }> = [];
  for (const key of recentKeys(days, today)) {
    if (scheduledCountOnDate(habits, key) === 0) continue;
    const m = mental[key];
    if (!m || typeof m.mood !== "number") continue;
    points.push({ progress: dayProgress(entries, habits, key), mood: m.mood });
  }
  if (points.length < minSamples) return null;

  const sorted = [...points].map((p) => p.progress).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const good = points.filter((p) => p.progress >= median);
  const off = points.filter((p) => p.progress < median);
  if (good.length === 0 || off.length === 0) return null; // all equal → no signal

  const avg = (xs: { mood: number }[]) =>
    xs.reduce((s, x) => s + x.mood, 0) / xs.length;
  const goodDaysMood = avg(good);
  const offDaysMood = avg(off);
  return {
    goodDaysMood,
    offDaysMood,
    delta: goodDaysMood - offDaysMood,
    samples: points.length,
  };
}
