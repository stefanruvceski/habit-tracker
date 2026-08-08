"use client";

import { Habit, Entries } from "../lib/types";
import {
  doneCountOnDate,
  isDone,
  isScheduled,
  scheduledCountOnDate,
} from "../lib/stats";
import { WEEKDAY_SHORT, makeKey, todayKey, weekdayOf } from "../lib/date";

/** The spreadsheet-style month grid: habits × days, tap a cell to toggle. */
export function MonthGrid({
  habits,
  entries,
  year,
  month,
  days,
  onToggle,
}: {
  habits: Habit[];
  entries: Entries;
  year: number;
  month: number;
  days: number[];
  onToggle: (habitId: string, dateKey: string) => void;
}) {
  const today = todayKey();

  return (
    <div className="scroll-x -mx-1 px-1">
      <table className="border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-bg-elev text-left text-xs font-medium text-text-faint px-2 py-2 min-w-[128px] rounded-tl-lg">
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
              <td className="sticky left-0 z-10 bg-bg-elev px-2 py-1">
                <div className="flex items-center gap-1.5 min-w-[112px]">
                  <span className="text-base leading-none">{h.emoji}</span>
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
            <td className="sticky left-0 z-10 bg-bg-elev px-2 pt-2 pb-0.5 text-[11px] text-text-faint min-w-[128px]">
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
            <td className="sticky left-0 z-10 bg-bg-elev px-2 py-0.5 text-[11px] text-text-faint min-w-[128px]">
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
