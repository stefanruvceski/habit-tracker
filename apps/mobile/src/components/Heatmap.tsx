import { useRef } from "react";
import { ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { MONTH_SHORT, addDays, fromKey, mondayIndex, todayKey } from "@habit/core";
import { C } from "../lib/theme";

export type CellState = "done" | "missed" | "off";

/**
 * Full trailing-year contribution heatmap. Columns = weeks; rows = Monday (top)
 * → Sunday (bottom). Subtle month labels above. Horizontally scrollable and
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
  const ref = useRef<ScrollView>(null);
  const step = cell + gap;
  const labelH = 14;

  const end = todayKey();
  const mondayOfWeek = addDays(end, -mondayIndex(end));
  const firstMonday = addDays(mondayOfWeek, -(weeks - 1) * 7);

  const fill = (s: CellState) =>
    s === "done" ? color : s === "missed" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.035)";

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

  const rects = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = addDays(firstMonday, w * 7 + d);
      if (key > end) continue;
      rects.push(
        <Rect key={key} x={w * step} y={labelH + d * step} width={cell} height={cell} rx={3} fill={fill(getState(key))} />,
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
        {labels.map((l) => (
          <SvgText key={`${l.x}-${l.text}`} x={l.x} y={labelH - 4} fontSize={9} fill={C.faint}>
            {l.text}
          </SvgText>
        ))}
        {rects}
      </Svg>
    </ScrollView>
  );
}
