"use client";

import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-bg-elev p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold tracking-tight mb-3">{children}</h2>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-dim mt-0.5">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}

/** SVG progress ring. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color = "var(--accent)",
  label,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-elev-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {label ?? (
          <span className="text-sm font-semibold">
            {Math.round(clamped * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  accent = "var(--text)",
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-bg-elev-2 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-text-faint">
        {label}
      </div>
      <div className="text-xl font-bold mt-0.5" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

export function pct(v: number): string {
  return `${(v * 100).toFixed(v > 0 && v < 0.01 ? 2 : v === 1 ? 0 : 1)}%`;
}
