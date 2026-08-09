// Core domain types for the habit tracker.

export type HabitType = "build" | "quit";

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
  emoji: string;
  color: string; // hex, used for the checkbox / heatmap
  type: HabitType;
  schedule: Schedule;
  archived: boolean;
  order: number;
  createdAt: string; // ISO
}

/** Completions keyed by date (YYYY-MM-DD) then by habitId. */
export type Entries = Record<string, Record<string, boolean>>;

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
