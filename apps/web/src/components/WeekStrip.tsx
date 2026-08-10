"use client";

import { addDays, fromKey, mondayIndex, todayKey } from "@habit/core";

const LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * A Mon–Sun strip for the week containing `dateKey`. Each day tints by its
 * completion, so it doubles as a weekly tracker and a planner: tap a day to
 * jump there (e.g. to pre-fill tomorrow's tasks).
 */
export function WeekStrip({
  dateKey,
  onSelect,
  progressFor,
}: {
  dateKey: string;
  onSelect: (key: string) => void;
  progressFor: (key: string) => number;
}) {
  const monday = addDays(dateKey, -mondayIndex(dateKey));
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((key, i) => {
        const selected = key === dateKey;
        const isToday = key === today;
        const p = Math.max(0, Math.min(1, progressFor(key)));
        const future = key > today;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl border transition ${
              selected ? "border-accent bg-accent/10" : "border-transparent"
            }`}
          >
            <span className="text-[10px] text-text-faint">{LABELS[i]}</span>
            <span
              className={`grid place-items-center w-8 h-8 rounded-full text-xs font-semibold tabular-nums ${
                isToday ? "ring-1 ring-accent" : ""
              } ${future ? "opacity-50" : ""}`}
              style={{
                background:
                  p > 0
                    ? `color-mix(in srgb, var(--accent) ${Math.round(p * 100)}%, var(--bg-elev-2))`
                    : "var(--bg-elev-2)",
                color: p >= 0.5 ? "var(--bg)" : "var(--text-dim)",
              }}
            >
              {fromKey(key).getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
