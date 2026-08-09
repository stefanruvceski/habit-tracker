import { useRef } from "react";
import { ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { MONTH_SHORT, addDays, fromKey, makeKey, mondayIndex, todayKey } from "@habit/core";
import { C } from "../lib/theme";

export type CellState = "done" | "missed" | "off";

/**
 * Calendar-year contribution heatmap. Columns = weeks (Jan → Dec); rows =
 * Monday (top) → Sunday (bottom). Subtle month labels above. Horizontally
 * scrollable and auto-scrolled so today is near the right edge.
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
  const ref = useRef<ScrollView>(null);
  const step = cell + gap;
  const labelH = 14;
  const padRight = 18;

  const today = todayKey();
  const jan1 = makeKey(year, 0, 1);
  const dec31 = makeKey(year, 11, 31);
  const firstMonday = addDays(jan1, -mondayIndex(jan1));
  const lastMonday = addDays(dec31, -mondayIndex(dec31));
  const weeks =
    Math.round(
      (fromKey(lastMonday).getTime() - fromKey(firstMonday).getTime()) / (7 * 86400000),
    ) + 1;

  const fillFor = (key: string) => {
    if (key > today) return "rgba(255,255,255,0.035)";
    const s = getState(key);
    if (s === "done") return color;
    if (s === "missed") return "rgba(255,255,255,0.10)";
    return "rgba(255,255,255,0.035)";
  };

  const labels: { x: number; text: string }[] = [];
  let lastMonth = -1;
  let lastLabelCol = -99;
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(firstMonday, w * 7);
    const ref2 = monday < jan1 ? jan1 : monday;
    const m = fromKey(ref2).getMonth();
    if (m !== lastMonth && w - lastLabelCol >= 3) {
      labels.push({ x: w * step, text: MONTH_SHORT[m] });
      lastLabelCol = w;
    }
    lastMonth = m;
  }

  const svgWidth = weeks * step - gap + padRight;
  const height = labelH + 7 * step - gap;

  const rects = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = addDays(firstMonday, w * 7 + d);
      if (key < jan1 || key > dec31) continue;
      rects.push(
        <Rect key={key} x={w * step} y={labelH + d * step} width={cell} height={cell} rx={3} fill={fillFor(key)} />,
      );
    }
  }

  // Auto-scroll so today is near the right edge (fallback: end of year).
  const scrollToToday = (viewW: number) => {
    const mondayToday = addDays(today, -mondayIndex(today));
    const col =
      today >= jan1 && today <= dec31
        ? Math.round(
            (fromKey(mondayToday).getTime() - fromKey(firstMonday).getTime()) / (7 * 86400000),
          )
        : weeks - 1;
    const x = Math.max(0, (col + 2) * step - viewW);
    ref.current?.scrollTo({ x, animated: false });
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => scrollToToday(e.nativeEvent.layout.width)}
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
