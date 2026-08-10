import { beforeEach, describe, test, expect } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppState } from "@habit/core";
import { actions } from "./store";

const flush = () => new Promise((r) => setTimeout(r, 10));

async function persisted(): Promise<AppState> {
  await flush(); // let the store's async persist settle
  const raw = await AsyncStorage.getItem("habit-tracker.v1");
  return JSON.parse(raw!);
}

beforeEach(async () => {
  actions.reset();
  await flush();
});

describe("mobile habit store", () => {
  test("reset seeds habits", async () => {
    expect((await persisted()).habits.length).toBeGreaterThan(0);
  });

  test("addHabit appends", async () => {
    const before = (await persisted()).habits.length;
    actions.addHabit({
      name: "Read",
      emoji: "📚",
      color: "#60a5fa",
      type: "build",
      schedule: { type: "daily" },
    });
    const p = await persisted();
    expect(p.habits.length).toBe(before + 1);
    expect(p.habits.at(-1)!.name).toBe("Read");
  });

  test("toggle updates entries on and off", async () => {
    const id = (await persisted()).habits[0].id;
    actions.toggle(id, "2026-08-10");
    expect((await persisted()).entries["2026-08-10"][id]).toBe(true);
    actions.toggle(id, "2026-08-10");
    expect((await persisted()).entries["2026-08-10"]?.[id]).toBeUndefined();
  });

  test("updateHabit / deleteHabit", async () => {
    const id = (await persisted()).habits[0].id;
    actions.updateHabit(id, { name: "Renamed" });
    expect((await persisted()).habits.find((h) => h.id === id)!.name).toBe("Renamed");
    actions.toggle(id, "2026-08-10");
    actions.deleteHabit(id);
    const p = await persisted();
    expect(p.habits.find((h) => h.id === id)).toBeUndefined();
    expect(p.entries["2026-08-10"]?.[id]).toBeUndefined();
  });

  test("reorderHabits applies order", async () => {
    const ids = (await persisted()).habits.map((h) => h.id);
    const reversed = [...ids].reverse();
    actions.reorderHabits(reversed);
    const p = await persisted();
    const first = p.habits.find((h) => h.id === reversed[0])!;
    expect(first.order).toBe(0);
  });

  test("setMental merges", async () => {
    actions.setMental("2026-08-10", { mood: 80 });
    expect((await persisted()).mental["2026-08-10"]).toEqual({ mood: 80, motivation: 0 });
    actions.setMental("2026-08-10", { motivation: 60 });
    expect((await persisted()).mental["2026-08-10"]).toEqual({ mood: 80, motivation: 60 });
  });

  test("todo lifecycle persists (add, toggle, star, move, delete)", async () => {
    actions.addTodo("Call bank", "2026-08-10");
    actions.addTodo("   ", "2026-08-10"); // blank ignored
    let p = await persisted();
    expect(p.todos.length).toBe(1);
    const id = p.todos[0].id;

    actions.toggleTodo(id);
    p = await persisted();
    expect(p.todos[0].done).toBe(true);

    actions.setTodoPriority(id, true);
    actions.moveTodo(id, "2026-08-11");
    p = await persisted();
    expect(p.todos[0].priority).toBe(true);
    expect(p.todos[0].date).toBe("2026-08-11");

    actions.deleteTodo(id);
    p = await persisted();
    expect(p.todos.length).toBe(0);
  });

  test("importState replaces state", async () => {
    actions.importState({
      version: 2,
      habits: [],
      entries: { "2026-01-01": { x: true } },
      mental: {},
      todos: [],
    });
    const p = await persisted();
    expect(p.habits.length).toBe(0);
    expect(p.entries["2026-01-01"].x).toBe(true);
  });
});
