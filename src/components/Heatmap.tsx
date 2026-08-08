"use client";

import { addDays, todayKey, weekdayOf } from "../lib/date";

export type CellState = "done" | "missed" | "off";

/**
 * GitHub-style contribution heatmap: weeks as columns, weekdays as rows.
 * Ends on today and spans `weeks` columns back.
 */
export function Heatmap({
  weeks = 26,
  color,
  getState,
  cell = 12,
  gap = 3,
}: {
  weeks?: number;
  color: string;
  getState: (dateKey: string) => CellState;
  cell?: number;
  gap?: number;
}) {
  const end = todayKey();
  // Align the last column so today sits on its correct weekday row.
  const endWeekday = weekdayOf(end);
  const lastColStart = addDays(end, -endWeekday); // Sunday of current week
  const firstColStart = addDays(lastColStart, -(weeks - 1) * 7);

  const cols: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const colStart = addDays(firstColStart, w * 7);
    const days: string[] = [];
    for (let d = 0; d < 7; d++) days.push(addDays(colStart, d));
    cols.push(days);
  }

  const fill = (state: CellState) => {
    if (state === "done") return color;
    if (state === "missed") return "rgba(255,255,255,0.10)";
    return "rgba(255,255,255,0.035)";
  };

  const width = weeks * (cell + gap);
  const height = 7 * (cell + gap);

  return (
    <div className="scroll-x">
      <svg width={width} height={height} className="block">
        {cols.map((days, w) =>
          days.map((key, d) => {
            if (key > end) return null;
            const state = getState(key);
            return (
              <rect
                key={key}
                x={w * (cell + gap)}
                y={d * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                fill={fill(state)}
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
