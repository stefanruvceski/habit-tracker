import { SVGProps } from "react";

/**
 * Minimal line icons (24×24, stroke = currentColor) used in the bottom nav.
 * They inherit color from the parent, so active/inactive states just change text color.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Today — a daily check-in (check inside a circle). */
export function TodayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5" />
    </Base>
  );
}

/** Month — a calendar grid. */
export function MonthIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </Base>
  );
}

/** Year — a trend / bar chart. */
export function YearIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-5M12 20v-9M17 20v-6" />
    </Base>
  );
}

/** Habits — a bulleted list you configure. */
export function HabitsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1.3" />
      <circle cx="4.5" cy="12" r="1.3" />
      <circle cx="4.5" cy="17.5" r="1.3" />
    </Base>
  );
}
