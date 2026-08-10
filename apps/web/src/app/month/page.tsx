"use client";

import { useMemo, useState } from "react";
import { actions, useAppState, useHabits, useHydrated } from "../../lib/store";
import {
  bestStreak,
  currentStreak,
  dayProgress,
  habitMonthRatio,
  isDoneOn,
  isMeasurable,
  monthStats,
} from "@habit/core";
import { MONTH_NAMES, daysInMonth, makeKey } from "@habit/core";
import { MonthGrid } from "../../components/MonthGrid";
import { LineChart } from "../../components/LineChart";
import { Card, Stat, pct } from "../../components/ui";
import { HabitGlyph } from "../../components/HabitGlyph";

export default function MonthPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const habits = useHabits();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month],
  );

  const stats = useMemo(
    () => monthStats(state, habits, year, month),
    [state, habits, year, month],
  );

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  // Per-day series for charts / footer.
  const progressSeries = days.map((d) =>
    dayProgress(state.entries, habits, makeKey(year, month, d)),
  );
  const moodSeries = days.map((d) => {
    const m = state.mental[makeKey(year, month, d)];
    return m && (m.mood || m.motivation) ? m.mood / 100 : null;
  });
  const motivationSeries = days.map((d) => {
    const m = state.mental[makeKey(year, month, d)];
    return m && (m.mood || m.motivation) ? m.motivation / 100 : null;
  });

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="w-10 h-10 grid place-items-center rounded-xl bg-bg-elev border border-border text-lg"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-bg-elev border border-border rounded-xl px-3 py-2 text-base font-semibold"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-bg-elev border border-border rounded-xl px-3 py-2 text-base font-semibold"
          >
            {yearOptions(now.getFullYear()).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => shift(1)}
          className="w-10 h-10 grid place-items-center rounded-xl bg-bg-elev border border-border text-lg"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Habits" value={stats.habitCount} />
        <Stat label="Completed" value={stats.totalDone} accent="var(--accent)" />
        <Stat label="Progress" value={pct(stats.progress)} accent="var(--accent-2)" />
      </div>
      <div className="h-2.5 rounded-full bg-bg-elev-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${stats.progress * 100}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
          }}
        />
      </div>

      {/* Grid */}
      {habits.length === 0 ? (
        <Card className="text-center py-8 text-text-dim">
          No habits yet — add some on the Habits tab.
        </Card>
      ) : (
        <Card className="px-2 py-3">
          <MonthGrid
            habits={habits}
            entries={state.entries}
            year={year}
            month={month}
            days={days}
            onToggle={(habitId, key) => {
              const h = habits.find((x) => x.id === habitId);
              if (h && isMeasurable(h)) {
                // Quick fill from the grid: done → clear, otherwise set to target.
                actions.setAmount(habitId, key, isDoneOn(h, state.entries, key) ? 0 : h.target ?? 1);
              } else {
                actions.toggle(habitId, key);
              }
            }}
            autoScrollDay={
              year === now.getFullYear() && month === now.getMonth()
                ? now.getDate()
                : null
            }
          />
        </Card>
      )}

      {/* Monthly progress chart */}
      {habits.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-2">Daily progress</h2>
          <LineChart
            series={[{ color: "var(--accent)", values: progressSeries, label: "Progress" }]}
            labels={days.map((d) => String(d))}
            height={180}
          />
        </Card>
      )}

      {/* Per-habit analysis */}
      {habits.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Analysis</h2>
          <div className="space-y-2.5">
            {habits.map((h) => {
              const ratio = habitMonthRatio(state.entries, h, year, month);
              return (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="w-6 grid place-items-center">
                    <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={18} />
                  </span>
                  <span className="text-sm w-28 sm:w-40 truncate">{h.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-elev-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${ratio * 100}%`, background: h.color }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right text-text-dim tabular-nums">
                    {pct(ratio)}
                  </span>
                  <span className="text-xs w-10 text-right text-text-faint tabular-nums">
                    🔥{currentStreak(state.entries, h)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Mental state */}
      <Card>
        <h2 className="font-semibold mb-2">Mental state</h2>
        {moodSeries.some((v) => v !== null) ? (
          <LineChart
            series={[
              { color: "#60a5fa", values: moodSeries, label: "Mood" },
              { color: "var(--accent)", values: motivationSeries, label: "Motivation" },
            ]}
            labels={days.map((d) => String(d))}
            height={180}
            area={false}
          />
        ) : (
          <p className="text-sm text-text-dim">
            No mood/motivation logged this month yet. Add it from the Today tab.
          </p>
        )}
      </Card>

      {/* Streak highlights */}
      {habits.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Best streaks</h2>
          <div className="grid grid-cols-2 gap-2">
            {[...habits]
              .sort((a, b) => bestStreak(state.entries, b) - bestStreak(state.entries, a))
              .slice(0, 4)
              .map((h) => (
                <div key={h.id} className="rounded-xl bg-bg-elev-2 px-3 py-2.5">
                  <div className="text-sm truncate flex items-center gap-1.5">
                    <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={16} />
                    {h.name}
                  </div>
                  <div className="text-lg font-bold" style={{ color: h.color }}>
                    {bestStreak(state.entries, h)}{" "}
                    <span className="text-xs font-medium text-text-faint">best</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function yearOptions(current: number): number[] {
  return [current - 1, current, current + 1];
}
