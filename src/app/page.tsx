"use client";

import Link from "next/link";
import { useState } from "react";
import { actions, useAppState, useHabits, useHydrated } from "../lib/store";
import {
  currentStreak,
  dayProgress,
  isDone,
  isScheduled,
  scheduledCountOnDate,
} from "../lib/stats";
import {
  MONTH_NAMES,
  WEEKDAY_LONG,
  addDays,
  fromKey,
  todayKey,
} from "../lib/date";
import { HabitRow } from "../components/HabitRow";
import { Card, ProgressRing } from "../components/ui";

export default function TodayPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const habits = useHabits();
  const [dateKey, setDateKey] = useState(todayKey());

  if (!hydrated) return <LoadingScreen />;

  const d = fromKey(dateKey);
  const isToday = dateKey === todayKey();
  const scheduled = habits.filter((h) => isScheduled(h, dateKey));
  const progress = dayProgress(state.entries, habits, dateKey);
  const doneCount = scheduled.filter((h) => isDone(state.entries, h.id, dateKey)).length;
  const total = scheduledCountOnDate(habits, dateKey);
  const mental = state.mental[dateKey] ?? { mood: 0, motivation: 0 };

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
          onClick={() => !isToday && setDateKey(addDays(dateKey, 1))}
          disabled={isToday}
          className="w-10 h-10 grid place-items-center rounded-xl bg-bg-elev border border-border text-lg disabled:opacity-30"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Progress summary */}
      <Card className="flex items-center gap-4">
        <ProgressRing value={progress} size={76} stroke={8} />
        <div>
          <div className="text-2xl font-bold">
            {doneCount}
            <span className="text-text-faint text-lg font-medium"> / {total}</span>
          </div>
          <div className="text-sm text-text-dim">
            habits done {isToday ? "today" : "this day"}
          </div>
        </div>
      </Card>

      {/* Habit list */}
      {scheduled.length === 0 ? (
        <Card className="text-center py-8">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-text-dim mb-4">
            {habits.length === 0
              ? "No habits yet. Create your first one."
              : "No habits scheduled for this day."}
          </p>
          <Link
            href="/habits"
            className="inline-block rounded-xl bg-accent text-bg font-semibold px-5 py-2.5 text-sm"
          >
            Manage habits
          </Link>
        </Card>
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
