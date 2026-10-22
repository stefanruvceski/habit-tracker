"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  formatAmount,
  fromKey,
  measurableSeries,
  seriesSummary,
  todayKey,
  MONTH_SHORT,
  type Entries,
  type Habit,
} from "@habit/core";

const RANGES = [
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
  { key: "all", label: "All", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const W = 600;
const H = 170;
const PAD = { l: 38, r: 10, t: 12, b: 22 };

/** Line chart of a measurable habit's values over time (weight, pages…). */
export function TrendChart({ habit, entries }: { habit: Habit; entries: Entries }) {
  const [range, setRange] = useState<RangeKey>("90");
  const today = todayKey();
  const series = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    return measurableSeries(entries, habit.id, r.days ? addDays(today, -(r.days - 1)) : "0000-00-00", today);
  }, [entries, habit.id, range, today]);
  const sum = seriesSummary(series);
  const unit = habit.unit ? ` ${habit.unit}` : "";
  const target = habit.target && habit.target > 0 ? habit.target : null;
  const fmtDate = (k: string) => `${fromKey(k).getDate()} ${MONTH_SHORT[fromKey(k).getMonth()]}`;

  const geo = useMemo(() => {
    if (!series.length) return null;
    const vals = series.map((p) => p.value).concat(target != null ? [target] : []);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
    const t0 = fromKey(series[0].dateKey).getTime();
    const span = Math.max(1, fromKey(series[series.length - 1].dateKey).getTime() - t0);
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const x = (k: string) => (series.length === 1 ? PAD.l + iw / 2 : PAD.l + ((fromKey(k).getTime() - t0) / span) * iw);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * ih;
    const pts = series.map((p) => [x(p.dateKey), y(p.value)] as const);
    const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]},${PAD.t + ih} L${pts[0][0]},${PAD.t + ih} Z` : "";
    return { x, y, pts, line, area, ticks: [hi - pad, (hi + lo) / 2, lo + pad] };
  }, [series, target]);

  const xLabels = series.length > 1 ? [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]] : series;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-extrabold tabular-nums">
            {sum.last != null ? formatAmount(sum.last) : "—"}
            <span className="text-sm text-text-dim font-semibold">{unit}</span>
          </div>
          {sum.delta != null && series.length > 1 && (
            <div className="text-xs text-text-dim">
              {sum.delta > 0 ? "▲" : sum.delta < 0 ? "▼" : "•"} {formatAmount(Math.abs(sum.delta))}
              {unit} since {fmtDate(series[0].dateKey)}
            </div>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-bg-elev-2 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold ${range === r.key ? "text-text" : "text-text-faint"}`}
              style={range === r.key ? { background: `${habit.color}33` } : undefined}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {geo ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <defs>
            <linearGradient id={`g-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={habit.color} stopOpacity={0.28} />
              <stop offset="1" stopColor={habit.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {geo.ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--border)" />
              <text x={PAD.l - 6} y={geo.y(t) + 3} fontSize={10} fill="var(--text-faint)" textAnchor="end">
                {formatAmount(t, 1)}
              </text>
            </g>
          ))}
          {target != null && (
            <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(target)} y2={geo.y(target)} stroke="var(--text-dim)" strokeDasharray="4 4" />
          )}
          {geo.area && <path d={geo.area} fill={`url(#g-${habit.id})`} />}
          <path d={geo.line} stroke={habit.color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {geo.pts.length <= 60 && geo.pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={2.6} fill={habit.color} />)}
          {xLabels.map((p, i) => (
            <text
              key={p.dateKey}
              x={geo.x(p.dateKey)}
              y={H - 6}
              fontSize={10}
              fill="var(--text-faint)"
              textAnchor={xLabels.length === 1 ? "middle" : i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
            >
              {fmtDate(p.dateKey)}
            </text>
          ))}
        </svg>
      ) : (
        <div className="h-28 grid place-items-center rounded-xl border border-dashed border-border text-sm text-text-faint">
          No entries in this range yet.
        </div>
      )}
      {sum.min != null && series.length > 1 && (
        <div className="grid grid-cols-4 gap-2 border-t border-border pt-2 text-xs">
          <Stat label="Low" value={`${formatAmount(sum.min)}${unit}`} />
          <Stat label="High" value={`${formatAmount(sum.max!)}${unit}`} />
          <Stat label="Entries" value={String(series.length)} />
          {target != null && <Stat label="Target" value={`${formatAmount(target)}${unit}`} />}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wide text-text-faint uppercase">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
