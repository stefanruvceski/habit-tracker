// One-off, dated to-do items. They live alongside habits so the daily
// close-out ritual covers both recurring habits and today's tasks.

export interface Todo {
  id: string;
  title: string;
  /** The day this task is for (YYYY-MM-DD, local). */
  date: string;
  done: boolean;
  /** ISO timestamp when it was completed (set when done flips to true). */
  doneAt?: string;
  /** Starred tasks sort to the top of their day. */
  priority?: boolean;
  order: number;
  createdAt: string; // ISO
}

let seq = 0;
export function newTodoId(): string {
  seq += 1;
  return `t_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 6)}`;
}

/** To-dos for a given day, sorted priority-first then by order. */
export function todosForDate(todos: Todo[], dateKey: string): Todo[] {
  return todos
    .filter((t) => t.date === dateKey)
    .sort((a, b) => {
      const pa = a.priority ? 1 : 0;
      const pb = b.priority ? 1 : 0;
      if (pa !== pb) return pb - pa; // priority first
      return a.order - b.order;
    });
}

/** Open (not done) to-dos dated before `todayKey`, oldest first. */
export function overdueTodos(todos: Todo[], todayKey: string): Todo[] {
  return todos
    .filter((t) => !t.done && t.date < todayKey)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
}

/** Counts of to-dos for a day. */
export function todoCounts(
  todos: Todo[],
  dateKey: string,
): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const t of todos) {
    if (t.date !== dateKey) continue;
    total++;
    if (t.done) done++;
  }
  return { total, done };
}
