"use client";

import { useEffect, useRef } from "react";
import { MONTH_SHORT, addDays, fromKey, mondayIndex, todayKey } from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * GitHub-style contribution heatmap. Columns are weeks (oldest → newest); each
 * column has 7 rows, Monday (top) → Sunday (bottom). Subtle month labels sit
 * above the grid. Shows a full trailing year, horizontally scrollable and
 * auto-scrolled to the right so today is visible.
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const step = cell + gap;
  const labelH = 14;
  const end = todayKey();
  const mondayOfWeek = addDays(end, -mondayIndex(end));
  const firstMonday = addDays(mondayOfWeek, -(weeks - 1) * 7);

  const fill = (state: CellState) => {
    if (state === "done") return color;
    if (state === "missed") return "rgba(255,255,255,0.10)";
    return "rgba(255,255,255,0.035)";
  };

  // Month labels: mark a column when its (Monday) month differs from the
  // previous labelled one, keeping a minimum spacing so they don't crowd.
  const labels: { x: number; text: string }[] = [];
  let lastMonth = -1;
  let lastLabelCol = -99;
  for (let w = 0; w < weeks; w++) {
    const m = fromKey(addDays(firstMonday, w * 7)).getMonth();
    if (m !== lastMonth && w - lastLabelCol >= 3) {
      labels.push({ x: w * step, text: MONTH_SHORT[m] });
      lastLabelCol = w;
    }
    lastMonth = m;
  }

  const svgWidth = weeks * step - gap;
  const height = labelH + 7 * step - gap;

  return (
    <div ref={scrollRef} className="scroll-x">
      <svg width={svgWidth} height={height} className="block">
        {labels.map((l) => (
          <text
            key={`${l.x}-${l.text}`}
            x={l.x}
            y={labelH - 4}
            fontSize="9"
            fill="var(--text-faint)"
          >
            {l.text}
          </text>
        ))}
        {Array.from({ length: weeks }).map((_, w) =>
          Array.from({ length: 7 }).map((__, d) => {
            const key = addDays(firstMonday, w * 7 + d);
            if (key > end) return null;
            return (
              <rect
                key={key}
                x={w * step}
                y={labelH + d * step}
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
