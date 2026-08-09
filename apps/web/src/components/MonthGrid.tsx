"use client";

import { useEffect, useRef } from "react";
import { Habit, Entries } from "@habit/core";
import {
  doneCountOnDate,
  isDone,
  isScheduled,
  scheduledCountOnDate,
} from "@habit/core";
import { WEEKDAY_SHORT, makeKey, todayKey, weekdayOf } from "@habit/core";
import { HabitGlyph } from "./HabitGlyph";

/** The spreadsheet-style month grid: habits × days, tap a cell to toggle. */
export function MonthGrid({
  habits,
  entries,
  year,
  month,
  days,
  onToggle,
  autoScrollDay,
}: {
  habits: Habit[];
  entries: Entries;
  year: number;
  month: number;
  days: number[];
  onToggle: (habitId: string, dateKey: string) => void;
  /** Day-of-month to center in view (the current day), or null to start at day 1. */
  autoScrollDay?: number | null;
}) {
  const today = todayKey();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (autoScrollDay == null) {
      el.scrollLeft = 0;
      return;
    }
    // Scroll so ~4 days before today are visible right after the sticky name
    // column, i.e. today sits in the right half showing recent past days.
    // Deterministic (no container-width measurement, which is unreliable at
    // first paint); the browser clamps to the max scroll near month end.
    // Scroll so today sits near the right edge (≈1 day of margin after it), so
    // the recent past days leading up to today are what you see first. rAF lets
    // the grid finish layout before measuring.
    const id = requestAnimationFrame(() => {
      const col = todayColRef.current;
      if (!col) return;
      const cw = el.clientWidth;
      const cell = col.offsetWidth || 32;
      const target = col.offsetLeft + cell * 2 - cw;
      el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - cw));
    });
    return () => cancelAnimationFrame(id);
  }, [autoScrollDay, year, month]);

  return (
    <div ref={scrollRef} className="scroll-x">
      <table className="border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-bg-elev text-left text-xs font-medium text-text-faint pr-2 py-2 min-w-[128px] border-r border-border">
              Habit
            </th>
            {days.map((day) => {
              const key = makeKey(year, month, day);
              const wd = weekdayOf(key);
              const weekend = wd === 0 || wd === 6;
              const isToday = key === today;
              return (
                <th
                  key={day}
                  ref={isToday ? todayColRef : undefined}
                  className={`px-0 py-1 text-center w-9 ${
                    isToday ? "text-accent" : weekend ? "text-text-faint" : "text-text-dim"
                  }`}
                >
                  <div className="text-[10px] leading-none">{WEEKDAY_SHORT[wd]}</div>
                  <div
                    className={`text-xs font-medium leading-tight mt-0.5 ${
                      isToday ? "font-bold" : ""
                    }`}
                  >
                    {day}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => (
            <tr key={h.id}>
              <td className="sticky left-0 z-10 bg-bg-elev pr-2 py-1 border-r border-border">
                <div className="flex items-center gap-1.5 min-w-[112px]">
                  <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={18} />
                  <span className="text-xs truncate max-w-[92px]">{h.name}</span>
                </div>
              </td>
              {days.map((day) => {
                const key = makeKey(year, month, day);
                const done = isDone(entries, h.id, key);
                const scheduled = isScheduled(h, key);
                const future = key > today;
                return (
                  <td key={day} className="p-0.5 text-center">
                    <button
                      onClick={() => onToggle(h.id, key)}
                      disabled={future && !done}
                      aria-label={`${h.name} ${key}`}
                      className={`w-7 h-7 rounded-md border-2 grid place-items-center mx-auto transition ${
                        done ? "pop" : ""
                      } ${!scheduled && !done ? "opacity-30" : ""} ${
                        future && !done ? "opacity-20" : ""
                      }`}
                      style={{
                        borderColor: h.color,
                        background: done ? h.color : "transparent",
                      }}
                    >
                      {done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="sticky left-0 z-10 bg-bg-elev pr-2 pt-2 pb-0.5 text-[11px] text-text-faint min-w-[128px] border-r border-border">
              Done
            </td>
            {days.map((day) => {
              const key = makeKey(year, month, day);
              return (
                <td
                  key={day}
                  className="px-0 pt-2 pb-0.5 text-center w-9 text-[11px] tabular-nums text-text-dim"
                >
                  {doneCountOnDate(entries, habits, key)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-bg-elev pr-2 py-0.5 text-[11px] text-text-faint min-w-[128px] border-r border-border">
              %
            </td>
            {days.map((day) => {
              const key = makeKey(year, month, day);
              const sc = scheduledCountOnDate(habits, key);
              const p = sc
                ? Math.round((doneCountOnDate(entries, habits, key) / sc) * 100)
                : 0;
              return (
                <td
                  key={day}
                  className="px-0 py-0.5 text-center w-9 text-[11px] tabular-nums text-text-faint"
                >
                  {p}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
