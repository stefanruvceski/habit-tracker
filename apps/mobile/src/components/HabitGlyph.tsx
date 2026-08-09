import { Text } from "react-native";
import Svg, { Path, Line, Circle, Rect, Polyline } from "react-native-svg";
import { HABIT_ICON_MAP, IconEl } from "@habit/core";

function renderEl(el: IconEl, i: number, color: string) {
  switch (el[0]) {
    case "p":
      return <Path key={i} d={el[1]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />;
    case "P":
      return <Path key={i} d={el[1]} fill={color} />;
    case "l":
      return <Line key={i} x1={el[1]} y1={el[2]} x2={el[3]} y2={el[4]} stroke={color} strokeWidth={1.8} strokeLinecap="round" />;
    case "c":
      return <Circle key={i} cx={el[1]} cy={el[2]} r={el[3]} fill="none" stroke={color} strokeWidth={1.8} />;
    case "C":
      return <Circle key={i} cx={el[1]} cy={el[2]} r={el[3]} fill={color} />;
    case "r":
      return <Rect key={i} x={el[1]} y={el[2]} width={el[3]} height={el[4]} rx={el[5]} fill="none" stroke={color} strokeWidth={1.8} />;
    case "y":
      return <Polyline key={i} points={el[1]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />;
  }
}

/** Renders a habit's built-in icon (colored) or the fallback emoji. */
export function HabitGlyph({
  icon,
  emoji,
  color,
  size = 22,
}: {
  icon?: string;
  emoji?: string;
  color: string;
  size?: number;
}) {
  const def = icon ? HABIT_ICON_MAP[icon] : undefined;
  if (def) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {def.e.map((el, i) => renderEl(el, i, color))}
      </Svg>
    );
  }
  return <Text style={{ fontSize: size * 0.9 }}>{emoji ?? "🎯"}</Text>;
}
