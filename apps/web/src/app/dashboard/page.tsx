"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppState, useHabits, useHydrated } from "../../lib/store";
import { availableYears, yearSummary, financeKpis } from "@habit/core";
import { MONTH_NAMES, MONTH_SHORT } from "@habit/core";
import { useFinanceState, useFinanceHydrated } from "../../lib/financeStore";
import { LineChart } from "../../components/LineChart";
import { Card, PageHeader, ProgressRing, pct } from "../../components/ui";

export default function DashboardPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const habits = useHabits();
  const [year, setYear] = useState(new Date().getFullYear());

  const summary = useMemo(
    () => yearSummary(state, habits, year),
    [state, habits, year],
  );

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  const years = availableYears(state);
  const bestMonth = summary.reduce(
    (best, m) => (m.progress > best.progress ? m : best),
    summary[0],
  );
  const activeMonths = summary.filter((m) => m.completed > 0).length;
  const yearAvg =
    activeMonths > 0
      ? summary.filter((m) => m.completed > 0).reduce((s, m) => s + m.progress, 0) /
        activeMonths
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yearly dashboard"
        right={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-bg-elev border border-border rounded-xl px-3 py-2 text-base font-semibold"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        }
      />

      {/* Finance at a glance */}
      <FinanceGlance year={year} />

      {/* Year-level summary */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Avg progress" value={pct(yearAvg)} accent="var(--accent)" />
        <MiniStat
          label="Best month"
          value={bestMonth.completed > 0 ? MONTH_SHORT[bestMonth.month] : "—"}
          accent="var(--accent-2)"
        />
        <MiniStat label="Active months" value={`${activeMonths}/12`} />
      </div>

      {/* Trend chart */}
      <Card>
        <LineChart
          series={[
            {
              color: "var(--accent)",
              values: summary.map((m) => (m.completed > 0 ? m.progress : null)),
              label: "Habit progress",
            },
            {
              color: "var(--accent-2)",
              values: summary.map((m) => (m.mindset > 0 ? m.mindset / 100 : null)),
              label: "Mindset score",
            },
          ]}
          labels={MONTH_SHORT}
          height={220}
        />
      </Card>

      {/* Month cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {summary.map((m) => (
          <Card key={m.month} className="p-3">
            <div className="text-center font-semibold mb-2">
              {MONTH_NAMES[m.month]}
            </div>
            <Row label="Habits" value={String(m.habitCount)} />
            <Row label="Completed" value={String(m.completed)} />
            <RowBar label="Progress" value={m.progress} color="var(--accent)" />
            <RowBar label="Mindset" value={m.mindset / 100} color="var(--accent-2)" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

function FinanceGlance({ year }: { year: number }) {
  const hydrated = useFinanceHydrated();
  const state = useFinanceState();
  const now = new Date();
  const refMonth = year === now.getFullYear() ? now.getMonth() : 11;
  const kpis = useMemo(
    () => financeKpis(state, year, refMonth),
    [state, year, refMonth],
  );

  if (!hydrated) return null;

  const base = state.baseCurrency;
  const hasData = kpis.paidTotal > 0 || kpis.invoicedTotal > 0 || state.goal.target > 0;

  if (!hasData) {
    return (
      <Link
        href="/finance"
        className="block rounded-2xl border border-dashed border-border bg-bg-elev px-4 py-3 text-sm text-text-dim hover:text-text hover:border-accent transition-colors"
      >
        💸 Track your income too →
      </Link>
    );
  }

  return (
    <Link href="/finance" className="block">
      <Card className="hover:border-accent transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-dim">Finance</h2>
          <span className="text-xs text-text-faint">View →</span>
        </div>
        <div className="flex items-center gap-4">
          {state.goal.target > 0 ? (
            <ProgressRing
              value={kpis.progress}
              size={72}
              stroke={8}
              color="var(--accent)"
              label={
                <span className="text-sm font-semibold">{pct(kpis.progress)}</span>
              }
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-text-faint">
              Received {year}
            </div>
            <div className="text-xl font-bold tabular-nums truncate">
              {fmtMoney(kpis.paidTotal, base)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-text-dim">
              {state.goal.target > 0 && (
                <span>Goal {fmtMoney(state.goal.target, base)}</span>
              )}
              {kpis.level && <span>Level {kpis.level.name}</span>}
              {kpis.best && <span>Best {kpis.best.label}</span>}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  accent = "var(--text)",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-bg-elev border border-border px-3 py-2.5 text-center">
      <div className="text-[11px] uppercase tracking-wide text-text-faint">
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-text-dim">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function RowBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-dim">{label}</span>
        <span className="font-medium tabular-nums">{pct(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-elev-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
