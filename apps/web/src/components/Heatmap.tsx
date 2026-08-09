"use client";

import { useEffect, useRef } from "react";
import { addDays, todayKey, weekdayOf } from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * GitHub-style contribution heatmap: weeks as columns (oldest → newest), each
 * column is a week with 7 rows (Sun → Sat). Shows a full trailing year and is
 * horizontally scrollable, auto-scrolled to the right so today is visible.
 */
export function Heatmap({
  color,
  getState,
  cell = 13,
  gap = 3,
  weeks = 53,
}: {
  color: string;
  getState: (dateKey: string) => CellState;
  cell?: number;
  gap?: number;
  weeks?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start scrolled to the most recent week (today) on the right.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const step = cell + gap;
  const end = todayKey();
  const endWeekday = weekdayOf(end);
  const lastColStart = addDays(end, -endWeekday); // Sunday of current week
  const firstColStart = addDays(lastColStart, -(weeks - 1) * 7);

  const fill = (state: CellState) => {
    if (state === "done") return color;
    if (state === "missed") return "rgba(255,255,255,0.10)";
    return "rgba(255,255,255,0.035)";
  };

  const svgWidth = weeks * step - gap;
  const height = 7 * step - gap;

  return (
    <div ref={scrollRef} className="scroll-x">
      <svg width={svgWidth} height={height} className="block">
        {Array.from({ length: weeks }).map((_, w) =>
          Array.from({ length: 7 }).map((__, d) => {
            const key = addDays(firstColStart, w * 7 + d);
            if (key > end) return null;
            return (
              <rect
                key={key}
                x={w * step}
                y={d * step}
                width={cell}
                height={cell}
                rx={3}
                fill={fill(getState(key))}
              >
                <title>{key}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
