import { test } from "node:test";
import assert from "node:assert/strict";

import type { Todo } from "../src/todos.ts";
import {
  newTodoId,
  todosForDate,
  overdueTodos,
  todoCounts,
} from "../src/todos.ts";

function todo(over: Partial<Todo> = {}): Todo {
  return {
    id: "t1",
    title: "Task",
    date: "2026-08-10",
    done: false,
    order: 0,
    createdAt: "2026-08-10T00:00:00.000Z",
    ...over,
  };
}

test("newTodoId returns unique, prefixed ids", () => {
  const a = newTodoId();
  const b = newTodoId();
  assert.notEqual(a, b);
  assert.match(a, /^t_/);
});

test("todosForDate filters by date and sorts priority-first then order", () => {
  const todos = [
    todo({ id: "a", date: "2026-08-10", order: 2 }),
    todo({ id: "b", date: "2026-08-10", order: 0 }),
    todo({ id: "c", date: "2026-08-10", order: 1, priority: true }),
    todo({ id: "d", date: "2026-08-11", order: 0 }), // other day
  ];
  const list = todosForDate(todos, "2026-08-10");
  assert.deepEqual(
    list.map((t) => t.id),
    ["c", "b", "a"], // priority c first, then by order b(0), a(2)
  );
});

test("overdueTodos returns open past tasks, oldest first", () => {
  const todos = [
    todo({ id: "a", date: "2026-08-08", done: false }),
    todo({ id: "b", date: "2026-08-09", done: true }), // done → excluded
    todo({ id: "c", date: "2026-08-07", done: false }),
    todo({ id: "d", date: "2026-08-10", done: false }), // today → not overdue
  ];
  const list = overdueTodos(todos, "2026-08-10");
  assert.deepEqual(
    list.map((t) => t.id),
    ["c", "a"], // 08-07 before 08-08
  );
});

test("todoCounts counts total and done for a day", () => {
  const todos = [
    todo({ id: "a", date: "2026-08-10", done: true }),
    todo({ id: "b", date: "2026-08-10", done: false }),
    todo({ id: "c", date: "2026-08-11", done: true }),
  ];
  assert.deepEqual(todoCounts(todos, "2026-08-10"), { total: 2, done: 1 });
  assert.deepEqual(todoCounts(todos, "2026-08-12"), { total: 0, done: 0 });
});
