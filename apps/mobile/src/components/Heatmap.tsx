import { useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { addDays, todayKey, weekdayOf } from "@habit/core";

export type CellState = "done" | "missed" | "off";

/**
 * Contribution heatmap that fits the container width (most recent weeks ending
 * today), so the latest days are always visible without horizontal scrolling.
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
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const step = cell + gap;
  const weeks = Math.max(6, Math.min(maxWeeks, Math.floor((width + gap) / step)));

  const end = todayKey();
  const endWeekday = weekdayOf(end);
  const lastColStart = addDays(end, -endWeekday);
  const firstColStart = addDays(lastColStart, -(weeks - 1) * 7);

  const fill = (s: CellState) =>
    s === "done" ? color : s === "missed" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.035)";

  const svgWidth = weeks * step - gap;
  const height = 7 * step - gap;

  const rects = [];
  if (width > 0) {
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const key = addDays(firstColStart, w * 7 + d);
        if (key > end) continue;
        rects.push(
          <Rect key={key} x={w * step} y={d * step} width={cell} height={cell} rx={3} fill={fill(getState(key))} />,
        );
      }
    }
  }

  return (
    <View onLayout={onLayout} style={{ width: "100%" }}>
      {width > 0 && (
        <Svg width={svgWidth} height={height}>
          {rects}
        </Svg>
      )}
    </View>
  );
}
