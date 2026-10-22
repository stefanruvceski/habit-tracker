// Daily routine helpers: time-of-day groups, decimal amounts, measurable
// series for charts, and planning time-of-day reminders.

import { addDays, fromKey } from "./date";
import { isDoneOn, isScheduled } from "./stats";
import type { Entries, Habit, TimeOfDay } from "./types";

/** Display order of the day's sections. */
export const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

export const TIME_OF_DAY_ICON: Record<TimeOfDay, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
  anytime: "🕓",
};

/** Default reminder time per section (24h). Anytime nudges in the evening. */
export const DEFAULT_TIME_OF_DAY_REMINDERS: Record<TimeOfDay, { hour: number; minute: number }> = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  evening: { hour: 19, minute: 0 },
  anytime: { hour: 20, minute: 0 },
};

export function timeOfDayOf(habit: Habit): TimeOfDay {
  return habit.timeOfDay ?? "anytime";
}

/** Habits sorted by section (morning → anytime), then by their own order. */
export function sortByTimeOfDay(habits: Habit[]): Habit[] {
  const rank = (h: Habit) => TIME_OF_DAY_ORDER.indexOf(timeOfDayOf(h));
  return [...habits].sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}

export interface TimeOfDayGroup {
  timeOfDay: TimeOfDay;
  habits: Habit[];
}

/** Non-empty sections in display order, habits in their own order inside. */
export function groupByTimeOfDay(habits: Habit[]): TimeOfDayGroup[] {
  const sorted = sortByTimeOfDay(habits);
  return TIME_OF_DAY_ORDER.map((t) => ({
    timeOfDay: t,
    habits: sorted.filter((h) => timeOfDayOf(h) === t),
  })).filter((g) => g.habits.length > 0);
}

/**
 * Parse a user-typed amount: accepts a decimal comma ("82,4") or point,
 * spaces and a trailing unit ("82,4 kg"). Returns null when there's no number.
 */
export function parseAmount(input: string): number | null {
  const m = input.replace(/\s/g, "").replace(",", ".").match(/^[-+]?\d*\.?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Format an amount for display with a decimal comma, up to `decimals` places. */
export function formatAmount(n: number, decimals = 2): string {
  const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return String(rounded).replace(".", ",");
}

export interface SeriesPoint {
  dateKey: string;
  value: number;
}

/** Logged numeric values of a habit between two date keys (inclusive), oldest first. */
export function measurableSeries(
  entries: Entries,
  habitId: string,
  fromKey: string,
  toKey: string,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const k of Object.keys(entries).sort()) {
    if (k < fromKey || k > toKey) continue;
    const v = entries[k]?.[habitId];
    if (typeof v === "number") out.push({ dateKey: k, value: v });
  }
  return out;
}

/** Latest logged value and the change vs. the first value in the series. */
export function seriesSummary(series: SeriesPoint[]): {
  last: number | null;
  first: number | null;
  delta: number | null;
  min: number | null;
  max: number | null;
} {
  if (series.length === 0) return { last: null, first: null, delta: null, min: null, max: null };
  const vals = series.map((p) => p.value);
  const first = vals[0];
  const last = vals[vals.length - 1];
  return { last, first, delta: last - first, min: Math.min(...vals), max: Math.max(...vals) };
}

export interface SectionReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export type TimeOfDayReminderSettings = Record<TimeOfDay, SectionReminderSettings>;

export interface PlannedReminder {
  /** Stable id: `tod-<section>-<dateKey>`. */
  id: string;
  timeOfDay: TimeOfDay;
  dateKey: string;
  at: Date;
  title: string;
  body: string;
}

/**
 * One-off reminders for the next `days` days, one per enabled section that
 * has scheduled habits that day. Times already past are dropped, and a
 * section whose habits are all done is skipped (re-plan after every change).
 */
export function planTimeOfDayReminders(
  habits: Habit[],
  entries: Entries,
  settings: TimeOfDayReminderSettings,
  now: Date,
  today: string,
  days = 7,
): PlannedReminder[] {
  const active = habits.filter((h) => !h.archived);
  const out: PlannedReminder[] = [];
  for (let i = 0; i < days; i++) {
    const dateKey = addDays(today, i);
    for (const t of TIME_OF_DAY_ORDER) {
      const s = settings[t];
      if (!s?.enabled) continue;
      const due = active.filter((h) => timeOfDayOf(h) === t && isScheduled(h, dateKey));
      if (due.length === 0) continue;
      const open = due.filter((h) => !isDoneOn(h, entries, dateKey));
      if (open.length === 0) continue;
      const at = fromKey(dateKey);
      at.setHours(s.hour, s.minute, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      const names = open.map((h) => h.name);
      const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4}` : "");
      out.push({
        id: `tod-${t}-${dateKey}`,
        timeOfDay: t,
        dateKey,
        at,
        title: `${TIME_OF_DAY_ICON[t]} ${TIME_OF_DAY_LABEL[t]} habits`,
        body: open.length === 1 ? `Time for ${shown}` : `${open.length} to go: ${shown}`,
      });
    }
  }
  return out;
}
