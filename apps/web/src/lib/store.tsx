"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  AppState,
  CURRENT_VERSION,
  Habit,
  MentalDay,
  Todo,
  newId,
  newTodoId,
  seedHabits,
} from "@habit/core";

const STORAGE_KEY = "habit-tracker.v1";

function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    habits: seedHabits(),
    entries: {},
    mental: {},
    todos: [],
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
          todos: parsed.todos ?? [],
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

  /** Set the logged amount for a measurable habit (<= 0 clears the entry). */
  setAmount(habitId: string, dateKey: string, amount: number) {
    setState((s) => {
      const day = { ...(s.entries[dateKey] ?? {}) };
      if (Number.isFinite(amount) && amount > 0) day[habitId] = amount;
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
      return { ...s, habits: s.habits.filter((h) => h.id !== id), entries };
    });
  },

  reorderHabits(orderedIds: string[]) {
    setState((s) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        ...s,
        habits: s.habits.map((h) => ({ ...h, order: pos.get(h.id) ?? h.order })),
      };
    });
  },

  setMental(dateKey: string, patch: Partial<MentalDay>) {
    setState((s) => {
      const prev = s.mental[dateKey] ?? { mood: 0, motivation: 0 };
      return { ...s, mental: { ...s.mental, [dateKey]: { ...prev, ...patch } } };
    });
  },

  // ---- To-dos --------------------------------------------------------------

  addTodo(title: string, dateKey: string, priority = false) {
    const clean = title.trim();
    if (!clean) return;
    setState((s) => {
      const order = s.todos
        .filter((t) => t.date === dateKey)
        .reduce((m, t) => Math.max(m, t.order + 1), 0);
      const todo: Todo = {
        id: newTodoId(),
        title: clean,
        date: dateKey,
        done: false,
        priority,
        order,
        createdAt: new Date().toISOString(),
      };
      return { ...s, todos: [...s.todos, todo] };
    });
  },

  toggleTodo(id: string) {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined }
          : t,
      ),
    }));
  },

  updateTodo(id: string, patch: Partial<Todo>) {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  setTodoPriority(id: string, priority: boolean) {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, priority } : t)),
    }));
  },

  deleteTodo(id: string) {
    setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }));
  },

  /** Move a to-do to another day (used by the overdue → today shortcut). */
  moveTodo(id: string, dateKey: string) {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, date: dateKey } : t)),
    }));
  },

  reorderTodos(dateKey: string, orderedIds: string[]) {
    setState((s) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        ...s,
        todos: s.todos.map((t) =>
          t.date === dateKey ? { ...t, order: pos.get(t.id) ?? t.order } : t,
        ),
      };
    });
  },

  importState(next: AppState) {
    setState(() => ({
      version: CURRENT_VERSION,
      habits: next.habits ?? [],
      entries: next.entries ?? {},
      mental: next.mental ?? {},
      todos: next.todos ?? [],
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

// ---- Sync helpers (used by the cloud sync layer) --------------------------

/** Subscribe to any state change (returns an unsubscribe fn). */
export function subscribeApp(cb: () => void): () => void {
  return subscribe(cb);
}

/** Current AppState snapshot (non-hook). */
export function appSnapshot(): AppState {
  return state;
}

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
