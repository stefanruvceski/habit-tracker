"use client";

import Link from "next/link";
import { useState } from "react";
import { actions, useAppState, useHabits, useHydrated } from "../lib/store";
import {
  currentStreak,
  combinedDayCounts,
  combinedDayProgress,
  isDone,
  isScheduled,
  todosForDate,
  overdueTodos,
} from "@habit/core";
import {
  MONTH_NAMES,
  WEEKDAY_LONG,
  addDays,
  fromKey,
  todayKey,
} from "@habit/core";
import { HabitRow } from "../components/HabitRow";
import { TodoRow } from "../components/TodoRow";
import { WeekStrip } from "../components/WeekStrip";
import { Card, ProgressRing } from "../components/ui";

export default function TodayPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const habits = useHabits();
  const [dateKey, setDateKey] = useState(todayKey());
  const [newTask, setNewTask] = useState("");

  if (!hydrated) return <LoadingScreen />;

  const d = fromKey(dateKey);
  const isToday = dateKey === todayKey();
  const scheduled = habits.filter((h) => isScheduled(h, dateKey));
  const todos = todosForDate(state.todos, dateKey);
  const overdue = isToday ? overdueTodos(state.todos, todayKey()) : [];
  const counts = combinedDayCounts(state.entries, habits, state.todos, dateKey);
  const mental = state.mental[dateKey] ?? { mood: 0, motivation: 0 };

  function addTask() {
    actions.addTodo(newTask, dateKey);
    setNewTask("");
  }

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDateKey(addDays(dateKey, -1))}
          className="w-10 h-10 grid place-items-center rounded-xl bg-bg-elev border border-border text-lg"
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-text-faint">
            {WEEKDAY_LONG[d.getDay()]}
          </div>
          <div className="text-lg font-semibold">
            {isToday ? "Today" : `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`}
          </div>
        </div>
        <button
          onClick={() => setDateKey(addDays(dateKey, 1))}
          className="w-10 h-10 grid place-items-center rounded-xl bg-bg-elev border border-border text-lg"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Week strip — tap a day to plan ahead */}
      <WeekStrip
        dateKey={dateKey}
        onSelect={setDateKey}
        progressFor={(k) => combinedDayProgress(state.entries, habits, state.todos, k)}
      />

      {/* Progress summary (habits + to-dos) */}
      <Card className="flex items-center gap-4">
        <ProgressRing value={counts.progress} size={76} stroke={8} />
        <div>
          <div className="text-2xl font-bold">
            {counts.done}
            <span className="text-text-faint text-lg font-medium"> / {counts.total}</span>
          </div>
          <div className="text-sm text-text-dim">
            done {isToday ? "today" : "this day"}
          </div>
        </div>
      </Card>

      {/* Overdue tasks (today only) */}
      {overdue.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-amber-300 mb-2">
            Overdue · {overdue.length}
          </h2>
          <div className="space-y-1.5">
            {overdue.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-sm rounded-lg bg-bg-elev-2 px-3 py-2"
              >
                <span className="flex-1 truncate">{t.title}</span>
                <span className="text-[11px] text-text-faint">
                  {MONTH_NAMES[fromKey(t.date).getMonth()].slice(0, 3)} {fromKey(t.date).getDate()}
                </span>
                <button
                  onClick={() => actions.moveTodo(t.id, todayKey())}
                  className="text-xs font-medium text-accent whitespace-nowrap"
                >
                  → Today
                </button>
                <button
                  onClick={() => actions.toggleTodo(t.id)}
                  className="text-xs text-text-dim"
                  aria-label="Complete"
                >
                  ✓
                </button>
                <button
                  onClick={() => actions.deleteTodo(t.id)}
                  className="text-text-faint hover:text-red-400 text-lg leading-none"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* To-dos for the day */}
      <Card>
        <h2 className="text-sm font-semibold text-text-dim mb-3">
          To-dos {isToday ? "today" : "this day"}
        </h2>
        <div className="space-y-2">
          {todos.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              onToggle={() => actions.toggleTodo(t.id)}
              onStar={() => actions.setTodoPriority(t.id, !t.priority)}
              onDelete={() => actions.deleteTodo(t.id)}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder={`Add a task for ${isToday ? "today" : MONTH_NAMES[d.getMonth()] + " " + d.getDate()}…`}
            className="flex-1 bg-bg-elev-2 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="rounded-xl bg-accent text-bg font-semibold px-4 text-sm disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </Card>

      {/* Habit list */}
      {scheduled.length === 0 ? (
        habits.length === 0 ? (
          <Card className="text-center py-6">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-text-dim mb-4 text-sm">No habits yet.</p>
            <Link
              href="/habits"
              className="inline-block rounded-xl bg-accent text-bg font-semibold px-5 py-2.5 text-sm"
            >
              Add habits
            </Link>
          </Card>
        ) : (
          <p className="text-center text-sm text-text-faint py-2">
            No habits scheduled for this day.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {scheduled.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              done={isDone(state.entries, h.id, dateKey)}
              streak={currentStreak(state.entries, h)}
              onToggle={() => actions.toggle(h.id, dateKey)}
            />
          ))}
        </div>
      )}

      {/* Mental state */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Mental state</h2>
          <span className="text-sm text-text-dim">
            Score {Math.round((mental.mood + mental.motivation) / 2)}%
          </span>
        </div>
        <Slider
          label="Mood"
          emoji="🙂"
          value={mental.mood}
          onChange={(v) => actions.setMental(dateKey, { mood: v })}
        />
        <Slider
          label="Motivation"
          emoji="⚡"
          value={mental.motivation}
          onChange={(v) => actions.setMental(dateKey, { motivation: v })}
        />
      </Card>
    </div>
  );
}

function Slider({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-text-dim">
          {emoji} {label}
        </span>
        <span className="font-medium">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-text-faint">
      Loading…
    </div>
  );
}
