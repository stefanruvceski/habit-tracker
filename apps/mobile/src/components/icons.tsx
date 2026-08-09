import Svg, { Circle, Path } from "react-native-svg";

type IconProps = { size?: number; color: string };

function Base({ size = 24, color, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Today — daily check-in. */
export function TodayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8.5 12.3l2.4 2.4 4.6-5" />
    </Base>
  );
}

/** Month — calendar grid. */
export function MonthIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V7A2.5 2.5 0 0 1 6 4.5z" />
      <Path d="M3.5 9h17M8 3v3M16 3v3" />
      <Path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </Base>
  );
}

/** Year — trend / bar chart. */
export function YearIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 20h16" />
      <Path d="M7 20v-5M12 20v-9M17 20v-6" />
    </Base>
  );
}

/** Habits — bulleted list. */
export function HabitsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <Circle cx="4.5" cy="6.5" r="1.3" />
      <Circle cx="4.5" cy="12" r="1.3" />
      <Circle cx="4.5" cy="17.5" r="1.3" />
    </Base>
  );
}

/** Finance — a wallet. */
export function FinanceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M5.5 6h13a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-8A2.5 2.5 0 0 1 5.5 6z" />
      <Path d="M3 9.5h18" />
      <Circle cx="16.5" cy="14" r="1.2" />
    </Base>
  );
}
