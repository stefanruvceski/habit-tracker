// Core domain types for the habit tracker.

export type HabitType = "build" | "quit";

/**
 * How a habit is measured:
 * - binary: done / not done (a checkbox)
 * - measurable: a numeric amount per day against a target (e.g. 8 glasses,
 *   30 minutes, 10000 steps)
 */
export type HabitGoalType = "binary" | "measurable";

/** How a measurable habit's daily amounts roll up over a period. */
export type Aggregation = "sum" | "avg" | "max" | "last";

/**
 * Scheduling for a habit.
 * - daily: every day
 * - weekdays: specific days of week (0 = Sunday ... 6 = Saturday)
 * - weekly: a target number of times per week (any days count)
 */
export type Schedule =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] }
  | { type: "weekly"; times: number };

export interface Habit {
  id: string;
  name: string;
  /**
   * Built-in icon id from the shared icon set (see icons.ts). When set and it
   * matches a known icon, it is rendered instead of the emoji.
   */
  icon?: string;
  emoji: string; // fallback glyph (any keyboard emoji) when no built-in icon
  color: string; // hex, used for the checkbox / heatmap
  type: HabitType;
  schedule: Schedule;
  archived: boolean;
  order: number;
  createdAt: string; // ISO
  /** Measurement mode (defaults to "binary" when absent). */
  goalType?: HabitGoalType;
  /** Unit label for measurable habits, e.g. "min", "glasses", "steps". */
  unit?: string;
  /** Daily target for measurable habits (reach it for build, stay under for quit). */
  target?: number;
  /** How measurable amounts roll up over a period (defaults to "sum"). */
  aggregation?: Aggregation;
}

/**
 * Per-day entries keyed by date (YYYY-MM-DD) then by habitId.
 * A boolean marks a binary habit done; a number is the logged amount for a
 * measurable habit.
 */
export type EntryValue = boolean | number;
export type Entries = Record<string, Record<string, EntryValue>>;

/** Mental state keyed by date (YYYY-MM-DD). Values 0..100. */
export interface MentalDay {
  mood: number;
  motivation: number;
}
export type Mental = Record<string, MentalDay>;

export interface AppState {
  version: number;
  habits: Habit[];
  entries: Entries;
  mental: Mental;
}

export const CURRENT_VERSION = 1;
