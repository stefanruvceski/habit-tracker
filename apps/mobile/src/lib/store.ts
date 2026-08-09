import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppState,
  CURRENT_VERSION,
  Habit,
  MentalDay,
  newId,
  seedHabits,
} from "@habit/core";
import { enqueue, registerStore } from "./sync";

const STORAGE_KEY = "habit-tracker.v1";

function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    habits: seedHabits(),
    entries: {},
    mental: {},
  };
}

let state: AppState = emptyState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let loadStarted = false;
async function load() {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
      await persist();
    }
  } catch {
    // keep seed
  }
  hydrated = true;
  emit();
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  void persist();
  emit();
}

function replaceState(next: AppState) {
  state = next;
  void persist();
  emit();
}

registerStore({ getState: () => state, replaceState });

function subscribe(cb: () => void) {
  listeners.add(cb);
  void load();
  return () => {
    listeners.delete(cb);
  };
}

// ---- Hooks ----------------------------------------------------------------

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated);
}

export function useHabits(includeArchived = false): Habit[] {
  const s = useAppState();
  return s.habits
    .filter((h) => includeArchived || !h.archived)
    .sort((a, b) => a.order - b.order);
}

// ---- Mutations ------------------------------------------------------------

export const actions = {
  toggle(habitId: string, dateKey: string) {
    let done = false;
    setState((s) => {
      const day = { ...(s.entries[dateKey] ?? {}) };
      if (day[habitId]) {
        delete day[habitId];
        done = false;
      } else {
        day[habitId] = true;
        done = true;
      }
      return { ...s, entries: { ...s.entries, [dateKey]: day } };
    });
    enqueue({ k: "entry_set", habitId, date: dateKey, done });
  },

  addHabit(input: Omit<Habit, "id" | "order" | "createdAt" | "archived">) {
    let created: Habit | null = null;
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
      created = habit;
      return { ...s, habits: [...s.habits, habit] };
    });
    if (created) enqueue({ k: "habit_upsert", habit: created });
  },

  updateHabit(id: string, patch: Partial<Habit>) {
    let updated: Habit | null = null;
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== id) return h;
        updated = { ...h, ...patch };
        return updated;
      }),
    }));
    if (updated) enqueue({ k: "habit_upsert", habit: updated });
  },

  deleteHabit(id: string) {
    setState((s) => {
      const entries: AppState["entries"] = {};
      for (const [dk, day] of Object.entries(s.entries)) {
        const rest = { ...day };
        delete rest[id];
        entries[dk] = rest;
      }
      return { ...s, habits: s.habits.filter((h) => h.id !== id), entries };
    });
    enqueue({ k: "habit_delete", id });
  },

  reorderHabits(orderedIds: string[]) {
    setState((s) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        ...s,
        habits: s.habits.map((h) => ({ ...h, order: pos.get(h.id) ?? h.order })),
      };
    });
    for (const h of state.habits) enqueue({ k: "habit_upsert", habit: h });
  },

  setMental(dateKey: string, patch: Partial<MentalDay>) {
    setState((s) => {
      const prev = s.mental[dateKey] ?? { mood: 0, motivation: 0 };
      return { ...s, mental: { ...s.mental, [dateKey]: { ...prev, ...patch } } };
    });
    const m = state.mental[dateKey];
    enqueue({ k: "mental_upsert", date: dateKey, mood: m.mood, motivation: m.motivation });
  },

  importState(next: AppState) {
    replaceState({
      version: CURRENT_VERSION,
      habits: next.habits ?? [],
      entries: next.entries ?? {},
      mental: next.mental ?? {},
    });
    enqueue({ k: "reset" });
    for (const h of state.habits) enqueue({ k: "habit_upsert", habit: h });
    for (const [date, day] of Object.entries(state.entries)) {
      for (const [habitId, done] of Object.entries(day)) {
        if (done) enqueue({ k: "entry_set", habitId, date, done: true });
      }
    }
    for (const [date, m] of Object.entries(state.mental)) {
      if (m.mood || m.motivation) {
        enqueue({ k: "mental_upsert", date, mood: m.mood, motivation: m.motivation });
      }
    }
  },

  reset() {
    replaceState(emptyState());
    enqueue({ k: "reset" });
    for (const h of state.habits) enqueue({ k: "habit_upsert", habit: h });
  },
};

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}
