import { beforeEach, describe, test, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  actions,
  exportState,
  useAppState,
  useHabits,
  useHydrated,
} from "./store";

beforeEach(() => {
  act(() => actions.reset());
});

describe("habit store", () => {
  test("hydrates and seeds habits", () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
    const habits = renderHook(() => useHabits()).result;
    expect(habits.current.length).toBeGreaterThan(0);
  });

  test("addHabit appends with incrementing order", () => {
    const { result } = renderHook(() => useAppState());
    const before = result.current.habits.length;
    act(() =>
      actions.addHabit({
        name: "Read",
        emoji: "📚",
        color: "#60a5fa",
        type: "build",
        schedule: { type: "daily" },
      }),
    );
    expect(result.current.habits.length).toBe(before + 1);
    const added = result.current.habits.at(-1)!;
    expect(added.name).toBe("Read");
    expect(added.archived).toBe(false);
    expect(added.id).toBeTruthy();
  });

  test("toggle and setDone update entries", () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.habits[0].id;
    act(() => actions.toggle(id, "2026-08-10"));
    expect(result.current.entries["2026-08-10"][id]).toBe(true);
    act(() => actions.toggle(id, "2026-08-10")); // toggle off
    expect(result.current.entries["2026-08-10"]?.[id]).toBeUndefined();
    act(() => actions.setDone(id, "2026-08-11", true));
    expect(result.current.entries["2026-08-11"][id]).toBe(true);
    act(() => actions.setDone(id, "2026-08-11", false));
    expect(result.current.entries["2026-08-11"]?.[id]).toBeUndefined();
  });

  test("updateHabit patches fields", () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.habits[0].id;
    act(() => actions.updateHabit(id, { name: "Renamed" }));
    expect(result.current.habits.find((h) => h.id === id)!.name).toBe("Renamed");
  });

  test("deleteHabit removes the habit and its entries", () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.habits[0].id;
    act(() => actions.setDone(id, "2026-08-10", true));
    act(() => actions.deleteHabit(id));
    expect(result.current.habits.find((h) => h.id === id)).toBeUndefined();
    expect(result.current.entries["2026-08-10"]?.[id]).toBeUndefined();
  });

  test("reorderHabits applies the given order", () => {
    const { result } = renderHook(() => useAppState());
    const ids = result.current.habits.map((h) => h.id);
    const reversed = [...ids].reverse();
    act(() => actions.reorderHabits(reversed));
    const sorted = renderHook(() => useHabits()).result.current.map((h) => h.id);
    expect(sorted[0]).toBe(reversed[0]);
  });

  test("setMental merges partial updates", () => {
    const { result } = renderHook(() => useAppState());
    act(() => actions.setMental("2026-08-10", { mood: 80 }));
    expect(result.current.mental["2026-08-10"]).toEqual({ mood: 80, motivation: 0 });
    act(() => actions.setMental("2026-08-10", { motivation: 60 }));
    expect(result.current.mental["2026-08-10"]).toEqual({ mood: 80, motivation: 60 });
  });

  test("importState replaces and exportState serialises", () => {
    const { result } = renderHook(() => useAppState());
    act(() =>
      actions.importState({
        version: 2,
        habits: [],
        entries: { "2026-01-01": { x: true } },
        mental: {},
        todos: [],
      }),
    );
    expect(result.current.habits.length).toBe(0);
    expect(result.current.entries["2026-01-01"].x).toBe(true);
    const json = JSON.parse(exportState());
    expect(json.entries["2026-01-01"].x).toBe(true);
  });

  test("todo lifecycle: add, toggle, star, move, delete", () => {
    const { result } = renderHook(() => useAppState());
    act(() => actions.addTodo("Call bank", "2026-08-10"));
    act(() => actions.addTodo("  ", "2026-08-10")); // blank ignored
    expect(result.current.todos.length).toBe(1);
    const id = result.current.todos[0].id;
    expect(result.current.todos[0].title).toBe("Call bank");
    expect(result.current.todos[0].done).toBe(false);

    act(() => actions.toggleTodo(id));
    expect(result.current.todos[0].done).toBe(true);
    expect(result.current.todos[0].doneAt).toBeTruthy();

    act(() => actions.setTodoPriority(id, true));
    expect(result.current.todos[0].priority).toBe(true);

    act(() => actions.updateTodo(id, { title: "Call the bank" }));
    expect(result.current.todos[0].title).toBe("Call the bank");

    act(() => actions.moveTodo(id, "2026-08-11"));
    expect(result.current.todos[0].date).toBe("2026-08-11");

    act(() => actions.deleteTodo(id));
    expect(result.current.todos.length).toBe(0);
  });

  test("addTodo increments order per day and reorderTodos applies", () => {
    const { result } = renderHook(() => useAppState());
    act(() => actions.addTodo("A", "2026-08-10"));
    act(() => actions.addTodo("B", "2026-08-10"));
    const [a, b] = result.current.todos;
    expect(b.order).toBeGreaterThan(a.order);
    act(() => actions.reorderTodos("2026-08-10", [b.id, a.id]));
    const byId = new Map(result.current.todos.map((t) => [t.id, t.order]));
    expect(byId.get(b.id)!).toBeLessThan(byId.get(a.id)!);
  });

  test("useHabits can include archived", () => {
    const { result } = renderHook(() => useAppState());
    const id = result.current.habits[0].id;
    act(() => actions.updateHabit(id, { archived: true }));
    const visible = renderHook(() => useHabits()).result.current;
    const all = renderHook(() => useHabits(true)).result.current;
    expect(all.length).toBeGreaterThan(visible.length);
  });
});
