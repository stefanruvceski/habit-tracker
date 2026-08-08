"use client";

import { useCallback, useSyncExternalStore } from "react";
import { AppState, CURRENT_VERSION, Habit, MentalDay } from "./types";
import { newId, seedHabits } from "./defaults";

const STORAGE_KEY = "habit-tracker.v1";

function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    habits: seedHabits(),
    entries: {},
    mental: {},
  };
}

// ---- Vanilla store with external subscription (SSR-safe) -------------------

let state: AppState = emptyState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy errors
  }
}

function load() {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.habits)) {
        state = {
          version: CURRENT_VERSION,
          habits: parsed.habits,
          entries: parsed.entries ?? {},
          mental: parsed.mental ?? {},
        };
      }
    } else {
      persist(); // first run: save the seed so it is stable
    }
  } catch {
    // corrupt storage -> keep seed
  }
  emit();
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  load();
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return state;
}

// ---- Mutations ------------------------------------------------------------

export const actions = {
  toggle(habitId: string, dateKey: string) {
    setState((s) => {
      const day = { ...(s.entries[dateKey] ?? {}) };
      if (day[habitId]) delete day[habitId];
      else day[habitId] = true;
      return { ...s, entries: { ...s.entries, [dateKey]: day } };
    });
  },

  setDone(habitId: string, dateKey: string, done: boolean) {
    setState((s) => {
      const day = { ...(s.entries[dateKey] ?? {}) };
      if (done) day[habitId] = true;
      else delete day[habitId];
      return { ...s, entries: { ...s.entries, [dateKey]: day } };
    });
  },

  addHabit(input: Omit<Habit, "id" | "order" | "createdAt" | "archived">) {
    setState((s) => {
      const order = s.habits.length
        ? Math.max(...s.habits.map((h) => h.order)) + 1
        : 0;
      const habit: Habit = {
        ...input,
        id: newId(),
        order,
        archived: false,
        createdAt: new Date().toISOString(),
      };
      return { ...s, habits: [...s.habits, habit] };
    });
  },

  updateHabit(id: string, patch: Partial<Habit>) {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  },

  deleteHabit(id: string) {
    setState((s) => {
      const entries: AppState["entries"] = {};
      for (const [dk, day] of Object.entries(s.entries)) {
        const rest = { ...day };
        delete rest[id];
        entries[dk] = rest;
      }
      return {
        ...s,
        habits: s.habits.filter((h) => h.id !== id),
        entries,
      };
    });
  },

  reorderHabits(orderedIds: string[]) {
    setState((s) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        ...s,
        habits: s.habits.map((h) => ({
          ...h,
          order: pos.get(h.id) ?? h.order,
        })),
      };
    });
  },

  setMental(dateKey: string, patch: Partial<MentalDay>) {
    setState((s) => {
      const prev = s.mental[dateKey] ?? { mood: 0, motivation: 0 };
      return {
        ...s,
        mental: { ...s.mental, [dateKey]: { ...prev, ...patch } },
      };
    });
  },

  importState(next: AppState) {
    setState(() => ({
      version: CURRENT_VERSION,
      habits: next.habits ?? [],
      entries: next.entries ?? {},
      mental: next.mental ?? {},
    }));
  },

  reset() {
    setState(() => emptyState());
  },
};

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

// ---- Hooks ----------------------------------------------------------------

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True once localStorage has been read on the client (avoids flash of seed). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function useHabits(includeArchived = false): Habit[] {
  const s = useAppState();
  const filter = useCallback(
    (h: Habit) => includeArchived || !h.archived,
    [includeArchived],
  );
  return s.habits.filter(filter).sort((a, b) => a.order - b.order);
}
