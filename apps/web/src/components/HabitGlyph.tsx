import { HABIT_ICON_MAP, IconEl } from "@habit/core";

/** Render one shared icon element as an SVG node. */
function renderEl(el: IconEl, i: number, color: string) {
  switch (el[0]) {
    case "p":
      return <path key={i} d={el[1]} fill="none" stroke={color} />;
    case "P":
      return <path key={i} d={el[1]} fill={color} stroke="none" />;
    case "l":
      return <line key={i} x1={el[1]} y1={el[2]} x2={el[3]} y2={el[4]} stroke={color} />;
    case "c":
      return <circle key={i} cx={el[1]} cy={el[2]} r={el[3]} fill="none" stroke={color} />;
    case "C":
      return <circle key={i} cx={el[1]} cy={el[2]} r={el[3]} fill={color} stroke="none" />;
    case "r":
      return (
        <rect
          key={i}
          x={el[1]}
          y={el[2]}
          width={el[3]}
          height={el[4]}
          rx={el[5]}
          fill="none"
          stroke={color}
        />
      );
    case "y":
      return <polyline key={i} points={el[1]} fill="none" stroke={color} />;
  }
}

/**
 * Renders a habit's glyph: one of our built-in line icons (when `icon` matches),
 * otherwise the chosen emoji.
 */
export function HabitGlyph({
  icon,
  emoji,
  color = "currentColor",
  size = 22,
}: {
  icon?: string;
  emoji?: string;
  color?: string;
  size?: number;
}) {
  const def = icon ? HABIT_ICON_MAP[icon] : undefined;
  if (def) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {def.e.map((el, i) => renderEl(el, i, color))}
      </svg>
    );
  }
  return (
    <span style={{ fontSize: size * 0.92, lineHeight: 1 }} aria-hidden="true">
      {emoji ?? "🎯"}
    </span>
  );
}
