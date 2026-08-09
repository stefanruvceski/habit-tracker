"use client";

import { Habit } from "@habit/core";

/** A large tappable row for checking off a habit on a given day (Today view). */
export function HabitRow({
  habit,
  done,
  streak,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
        done ? "border-transparent" : "border-border bg-bg-elev"
      }`}
      style={done ? { background: `${habit.color}1f` } : undefined}
    >
      <span
        className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0"
        style={{ background: `${habit.color}22` }}
      >
        {habit.emoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{habit.name}</span>
        <span className="block text-xs text-text-dim">
          {habit.type === "quit" ? "Avoid · " : ""}
          {streak > 0 ? `🔥 ${streak} day${streak === 1 ? "" : "s"} streak` : "No streak yet"}
        </span>
      </span>
      <span
        className={`grid place-items-center w-8 h-8 rounded-lg border-2 shrink-0 ${
          done ? "pop" : ""
        }`}
        style={{
          borderColor: habit.color,
          background: done ? habit.color : "transparent",
        }}
      >
        {done && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="var(--bg)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
