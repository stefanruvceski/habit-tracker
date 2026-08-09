import { ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { addDays, todayKey, weekdayOf } from "@habit/core";
import { C } from "../lib/theme";

export type CellState = "done" | "missed" | "off";

export function Heatmap({
  weeks = 22,
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
  const endWeekday = weekdayOf(end);
  const lastColStart = addDays(end, -endWeekday);
  const firstColStart = addDays(lastColStart, -(weeks - 1) * 7);

  const fill = (s: CellState) =>
    s === "done" ? color : s === "missed" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.035)";

  const width = weeks * (cell + gap);
  const height = 7 * (cell + gap);

  const rects = [];
  for (let w = 0; w < weeks; w++) {
    const colStart = addDays(firstColStart, w * 7);
    for (let d = 0; d < 7; d++) {
      const key = addDays(colStart, d);
      if (key > end) continue;
      rects.push(
        <Rect
          key={key}
          x={w * (cell + gap)}
          y={d * (cell + gap)}
          width={cell}
          height={cell}
          rx={3}
          fill={fill(getState(key))}
        />,
      );
    }
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={width} height={height}>
        {rects}
      </Svg>
    </ScrollView>
  );
}
