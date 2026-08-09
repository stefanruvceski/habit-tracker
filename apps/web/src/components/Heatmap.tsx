"use client";

import { useEffect, useRef } from "react";
import {
  MONTH_SHORT,
  addDays,
  fromKey,
  makeKey,
  mondayIndex,
  todayKey,
} from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * GitHub-style contribution heatmap for a single calendar year. Columns are
 * weeks (Jan → Dec), each column has 7 rows Monday (top) → Sunday (bottom).
 * Subtle month labels sit above the grid. Horizontally scrollable and
 * auto-scrolled so today is near the right edge.
 */
export function Heatmap({
  color,
  getState,
  cell = 13,
  gap = 3,
  year = new Date().getFullYear(),
}: {
  color: string;
  getState: (dateKey: string) => CellState;
  cell?: number;
  gap?: number;
  year?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const step = cell + gap;
  const labelH = 14;
  const padRight = 18; // room so the last month label isn't clipped

  const today = todayKey();
  const jan1 = makeKey(year, 0, 1);
  const dec31 = makeKey(year, 11, 31);
  const firstMonday = addDays(jan1, -mondayIndex(jan1));
  const lastMonday = addDays(dec31, -mondayIndex(dec31));
  const weeks =
    Math.round(
      (fromKey(lastMonday).getTime() - fromKey(firstMonday).getTime()) /
        (7 * 86400000),
    ) + 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Put today near the right edge (if today is within this year), else show
    // the end of the year.
    const mondayToday = addDays(today, -mondayIndex(today));
    const col =
      today >= jan1 && today <= dec31
        ? Math.round(
            (fromKey(mondayToday).getTime() - fromKey(firstMonday).getTime()) /
              (7 * 86400000),
          )
        : weeks - 1;
    const target = (col + 2) * step - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fillFor = (key: string) => {
    if (key > today) return "rgba(255,255,255,0.035)"; // future: empty
    const s = getState(key);
    if (s === "done") return color;
    if (s === "missed") return "rgba(255,255,255,0.10)";
    return "rgba(255,255,255,0.035)";
  };

  // Month labels, placed where each month begins within the year.
  const labels: { x: number; text: string }[] = [];
  let lastMonth = -1;
  let lastLabelCol = -99;
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(firstMonday, w * 7);
    const ref = monday < jan1 ? jan1 : monday;
    const m = fromKey(ref).getMonth();
    if (m !== lastMonth && w - lastLabelCol >= 3) {
      labels.push({ x: w * step, text: MONTH_SHORT[m] });
      lastLabelCol = w;
    }
    lastMonth = m;
  }

  const svgWidth = weeks * step - gap + padRight;
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
            if (key < jan1 || key > dec31) return null; // other-year corners
            return (
              <rect
                key={key}
                x={w * step}
                y={labelH + d * step}
                width={cell}
                height={cell}
                rx={3}
                fill={fillFor(key)}
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
