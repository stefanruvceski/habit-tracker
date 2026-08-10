"use client";

import type { Todo } from "@habit/core";

/** A single to-do row: checkbox, title, star (priority) and delete. */
export function TodoRow({
  todo,
  onToggle,
  onStar,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elev px-3 py-2.5">
      <button
        onClick={onToggle}
        aria-label={todo.done ? "Mark not done" : "Mark done"}
        className={`w-6 h-6 rounded-md border-2 grid place-items-center shrink-0 transition ${
          todo.done ? "pop" : ""
        }`}
        style={{
          borderColor: "var(--accent)",
          background: todo.done ? "var(--accent)" : "transparent",
        }}
      >
        {todo.done && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="var(--bg)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <span
        className={`flex-1 text-sm ${
          todo.done ? "line-through text-text-faint" : "text-text"
        }`}
      >
        {todo.title}
      </span>
      <button
        onClick={onStar}
        aria-label={todo.priority ? "Unstar" : "Star"}
        className="text-base leading-none px-1"
        style={{ color: todo.priority ? "var(--accent-2)" : "var(--text-faint)" }}
      >
        {todo.priority ? "★" : "☆"}
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="text-text-faint hover:text-red-400 text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
}
