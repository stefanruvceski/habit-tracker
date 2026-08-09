import { useRef } from "react";
import { ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { addDays, todayKey, weekdayOf } from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * Full trailing-year contribution heatmap (weeks as columns), horizontally
 * scrollable and auto-scrolled to the right so today is visible on open.
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
  const ref = useRef<ScrollView>(null);
  const step = cell + gap;

  const end = todayKey();
  const endWeekday = weekdayOf(end);
  const lastColStart = addDays(end, -endWeekday);
  const firstColStart = addDays(lastColStart, -(weeks - 1) * 7);

  const fill = (s: CellState) =>
    s === "done" ? color : s === "missed" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.035)";

  const svgWidth = weeks * step - gap;
  const height = 7 * step - gap;

  const rects = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = addDays(firstColStart, w * 7 + d);
      if (key > end) continue;
      rects.push(
        <Rect key={key} x={w * step} y={d * step} width={cell} height={cell} rx={3} fill={fill(getState(key))} />,
      );
    }
  }

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
    >
      <Svg width={svgWidth} height={height}>
        {rects}
      </Svg>
    </ScrollView>
  );
}
