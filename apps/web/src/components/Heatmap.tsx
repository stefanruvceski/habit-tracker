"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, todayKey, weekdayOf } from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * GitHub-style contribution heatmap: weeks as columns, weekdays as rows.
 * Ends on today and fits the container width (most recent weeks), so the
 * latest days are always visible without horizontal scrolling.
 */
export function Heatmap({
  color,
  getState,
  cell = 13,
  gap = 3,
  maxWeeks = 30,
}: {
  color: string;
  getState: (dateKey: string) => CellState;
  cell?: number;
  gap?: number;
  maxWeeks?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const step = cell + gap;
  const weeks = Math.max(6, Math.min(maxWeeks, Math.floor((width + gap) / step)));

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
    <div ref={ref} className="w-full">
      {width > 0 && (
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
      )}
    </div>
  );
}
