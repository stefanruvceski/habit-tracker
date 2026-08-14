"use client";

import { useMemo, useState } from "react";
import { Budgets } from "../../components/Budgets";
import {
  MONTH_SHORT,
  financeKpis,
  financeYears,
  monthTotals,
  sourceDistribution,
  todayKey,
  txBase,
  SUPPORTED_CURRENCIES,
} from "@habit/core";
import {
  financeActions,
  useFinanceHydrated,
  useFinanceState,
  useFxRefreshing,
} from "../../lib/financeStore";
import { Card, PageHeader, ProgressRing, pct } from "../../components/ui";

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

export default function FinancePage() {
  const hydrated = useFinanceHydrated();
  const state = useFinanceState();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showInvoiced, setShowInvoiced] = useState(false);

  const now = new Date();
  const refMonth = year === now.getFullYear() ? now.getMonth() : 11;

  const kpis = useMemo(
    () => financeKpis(state, year, refMonth),
    [state, year, refMonth],
  );
  const paidMonths = useMemo(() => monthTotals(state, year, false), [state, year]);
  const invoicedMonths = useMemo(
    () => monthTotals(state, year, true),
    [state, year],
  );
  const dist = useMemo(
    () => sourceDistribution(state, year, showInvoiced),
    [state, year, showInvoiced],
  );

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  const years = financeYears(state);
  const base = state.baseCurrency;
  const p = kpis.projection;
  const displayTotal = showInvoiced ? kpis.invoicedTotal : kpis.paidTotal;
  const displayProgress = showInvoiced ? kpis.progressInvoiced : kpis.progress;
  const maxMonth = Math.max(1, ...invoicedMonths);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        subtitle={`Income tracker · ${base}`}
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

      {/* Paid / invoiced toggle */}
      <div className="inline-flex rounded-xl border border-border bg-bg-elev p-1 text-sm">
        <button
          onClick={() => setShowInvoiced(false)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            !showInvoiced ? "bg-bg-elev-2 text-text" : "text-text-faint"
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => setShowInvoiced(true)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            showInvoiced ? "bg-bg-elev-2 text-text" : "text-text-faint"
          }`}
        >
          + Invoiced
        </button>
      </div>

      {/* KPI hero */}
      <Card>
        <div className="flex items-center gap-4">
          <ProgressRing
            value={displayProgress}
            size={92}
            stroke={9}
            color="var(--accent)"
            label={
              <div className="text-center leading-tight">
                <div className="text-base font-bold">{pct(displayProgress)}</div>
                <div className="text-[10px] text-text-faint">of goal</div>
              </div>
            }
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-text-faint">
              {showInvoiced ? "Paid + invoiced" : "Received"} {year}
            </div>
            <div className="text-2xl font-bold tabular-nums truncate">
              {fmtMoney(displayTotal, base)}
            </div>
            {state.goal.target > 0 && (
              <div className="text-xs text-text-dim mt-0.5">
                Goal {fmtMoney(state.goal.target, base)}
              </div>
            )}
            <div
              className={`inline-flex items-center gap-1.5 mt-2 text-xs font-medium px-2 py-1 rounded-lg ${
                p.onPace
                  ? "text-emerald-300 bg-emerald-500/10"
                  : "text-amber-300 bg-amber-500/10"
              }`}
            >
              {p.onPace ? "On pace" : "Behind pace"}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Level" value={kpis.level?.name ?? "—"} accent="var(--accent-2)" />
        <MiniStat
          label="Best month"
          value={kpis.best ? kpis.best.label : "—"}
        />
        <MiniStat
          label="Projected year"
          value={fmtMoney(p.projected, base)}
        />
        <MiniStat
          label="Months on target"
          value={`${kpis.monthsOnTarget}/12`}
        />
      </div>

      {kpis.next && (
        <Card className="p-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-dim">
              Next level · {kpis.next.name}
            </span>
            <span className="font-medium tabular-nums">
              {fmtMoney(kpis.trailingAvg, base)} / {fmtMoney(kpis.next.min, base)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-elev-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, kpis.next.min ? (kpis.trailingAvg / kpis.next.min) * 100 : 0)}%`,
                background: "var(--accent-2)",
              }}
            />
          </div>
          <div className="text-[10px] text-text-faint mt-1">
            Based on your 3-month average
          </div>
        </Card>
      )}

      {/* Monthly breakdown */}
      <Card>
        <h2 className="text-sm font-semibold mb-3 text-text-dim">By month</h2>
        <div className="space-y-1.5">
          {MONTH_SHORT.map((m, i) => {
            const paid = paidMonths[i];
            const invoiced = invoicedMonths[i];
            const pending = Math.max(0, invoiced - paid);
            return (
              <div key={m} className="flex items-center gap-2">
                <div className="w-8 text-xs text-text-faint">{m}</div>
                <div className="flex-1 h-4 rounded bg-bg-elev-2 overflow-hidden flex">
                  <div
                    className="h-full"
                    style={{
                      width: `${(paid / maxMonth) * 100}%`,
                      background: "var(--accent)",
                    }}
                  />
                  <div
                    className="h-full opacity-40"
                    style={{
                      width: `${(pending / maxMonth) * 100}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                <div className="w-24 text-right text-xs tabular-nums">
                  {invoiced > 0 ? fmtMoney(invoiced, base) : "—"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-text-faint">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--accent)" }} />
            Paid
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block opacity-40" style={{ background: "var(--accent)" }} />
            Invoiced (pending)
          </span>
        </div>
      </Card>

      {/* Source distribution */}
      {dist.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold mb-3 text-text-dim">By source</h2>
          <div className="space-y-2">
            {dist.map((s) => (
              <div key={s.sourceId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </span>
                  <span className="tabular-nums text-text-dim">
                    {fmtMoney(s.total, base)} · {pct(s.share)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bg-elev-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.share * 100}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly budgets & expenses */}
      <Budgets year={year} />

      {/* Recent transactions */}
      <RecentTransactions />

      {/* Quick add */}
      <QuickAdd />

      {/* Settings */}
      <Settings />
    </div>
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
    <div className="rounded-xl bg-bg-elev border border-border px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-text-faint">
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5 tabular-nums truncate" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function RecentTransactions() {
  const state = useFinanceState();
  const sources = new Map(state.sources.map((s) => [s.id, s]));
  const recent = [...state.transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3 text-text-dim">Recent</h2>
      <div className="divide-y divide-border">
        {recent.map((t) => {
          const src = sources.get(t.sourceId);
          return (
            <div key={t.id} className="flex items-center gap-2 py-2 text-sm">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: src?.color ?? "var(--text-faint)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{src?.name ?? "—"}</div>
                <div className="text-[11px] text-text-faint">
                  {t.date} ·{" "}
                  <span className={t.status === "paid" ? "text-emerald-400" : "text-amber-400"}>
                    {t.status}
                  </span>
                  {t.note ? ` · ${t.note}` : ""}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="font-semibold">
                  {fmtMoney(t.amount, t.currency)}
                </div>
                {t.currency !== state.baseCurrency && (
                  <div className="text-[10px] text-text-faint">
                    ≈ {fmtMoney(txBase(state, t), state.baseCurrency)}
                    {t.fxRate ? ` @ ${Number(t.fxRate.toFixed(2))}` : ""}
                  </div>
                )}
              </div>
              <button
                onClick={() => financeActions.deleteTransaction(t.id)}
                className="text-text-faint hover:text-red-400 px-1 text-lg leading-none"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function QuickAdd() {
  const state = useFinanceState();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState(todayKey());
  const [status, setStatus] = useState<"paid" | "invoiced">("paid");
  const [note, setNote] = useState("");

  const activeSources = state.sources.filter((s) => !s.archived);
  const selected = activeSources.find((s) => s.id === (sourceId || activeSources[0]?.id));

  if (activeSources.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-dim">
          Add an income source in Settings below to start logging income.
        </p>
      </Card>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-border bg-bg-elev py-3 text-sm font-medium text-text-dim hover:text-text hover:border-accent transition-colors"
      >
        + Add income
      </button>
    );
  }

  function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    const sid = sourceId || activeSources[0].id;
    const cur = currency || selected?.currency || state.baseCurrency;
    financeActions.addTransaction({
      sourceId: sid,
      amount: value,
      currency: cur,
      date,
      status,
      note: note.trim() || undefined,
    });
    setAmount("");
    setNote("");
    setOpen(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-dim">Add income</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-text-faint text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
      <div className="space-y-2.5">
        <Field label="Source">
          <select
            value={sourceId || activeSources[0].id}
            onChange={(e) => {
              setSourceId(e.target.value);
              const s = activeSources.find((x) => x.id === e.target.value);
              if (s) setCurrency(s.currency);
            }}
            className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
          >
            {activeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Amount">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2 tabular-nums"
            />
          </Field>
          <Field label="Currency">
            <select
              value={currency || selected?.currency || state.baseCurrency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "paid" | "invoiced")}
              className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
            >
              <option value="paid">Paid</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </Field>
        </div>
        <Field label="Note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. October invoice"
            className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
          />
        </Field>
        <button
          onClick={submit}
          className="w-full rounded-xl bg-accent text-bg font-semibold py-2.5 mt-1"
        >
          Save
        </button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-text-faint">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Settings() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-text-faint py-2 hover:text-text-dim"
      >
        Settings
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-dim">Settings</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-text-faint text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
      <BaseCurrencyEditor />
      <div className="h-px bg-border my-4" />
      <GoalEditor />
      <div className="h-px bg-border my-4" />
      <SourceEditor />
      <div className="h-px bg-border my-4" />
      <FxEditor />
    </Card>
  );
}

function BaseCurrencyEditor() {
  const state = useFinanceState();
  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Totals currency</h3>
      <select
        value={state.baseCurrency}
        onChange={(e) => financeActions.setBaseCurrency(e.target.value)}
        className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-text-faint mt-1.5">
        All totals and goals are shown in this currency. Changing it re-fetches
        the exchange rates.
      </p>
    </div>
  );
}

function GoalEditor() {
  const state = useFinanceState();
  const [target, setTarget] = useState(String(state.goal.target || ""));
  const [direction, setDirection] = useState(state.goal.direction);

  function save() {
    const value = parseFloat(target.replace(",", ".")) || 0;
    financeActions.setGoal({ ...state.goal, target: value, direction });
  }

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Yearly goal</h3>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Target (${state.baseCurrency})`}>
          <input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={save}
            className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2 tabular-nums"
          />
        </Field>
        <Field label="Direction">
          <select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as "reach" | "not_exceed");
              financeActions.setGoal({
                ...state.goal,
                target: parseFloat(target.replace(",", ".")) || 0,
                direction: e.target.value as "reach" | "not_exceed",
              });
            }}
            className="w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2"
          >
            <option value="reach">Reach</option>
            <option value="not_exceed">Not exceed</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function SourceEditor() {
  const state = useFinanceState();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(state.baseCurrency);

  function add() {
    if (!name.trim()) return;
    const palette = ["#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f59e0b", "#22d3ee"];
    financeActions.addSource({
      name: name.trim(),
      color: palette[state.sources.length % palette.length],
      currency: currency.toUpperCase() || state.baseCurrency,
    });
    setName("");
  }

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Income sources</h3>
      <div className="space-y-1.5 mb-3">
        {state.sources.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="flex-1">{s.name}</span>
            <span className="text-text-faint text-xs">{s.currency}</span>
            <button
              onClick={() => financeActions.deleteSource(s.id)}
              className="text-text-faint hover:text-red-400 px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New source"
          className="bg-bg-elev-2 border border-border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-20 bg-bg-elev-2 border border-border rounded-lg px-2 py-2 text-sm"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="rounded-lg bg-bg-elev-2 border border-border px-3 text-sm font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function FxEditor() {
  const state = useFinanceState();
  const refreshing = useFxRefreshing();
  const codes = Array.from(
    new Set(state.sources.map((s) => s.currency).filter((c) => c !== state.baseCurrency)),
  );

  const lastUpdated = state.fxRates
    .filter((r) => codes.includes(r.code) && r.updatedAt)
    .map((r) => r.updatedAt as string)
    .sort()
    .pop();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold">
          FX rates (1 unit → {state.baseCurrency})
        </h3>
        {codes.length > 0 && (
          <button
            onClick={() => financeActions.refreshFxRates(true)}
            disabled={refreshing}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-bg-elev-2 border border-border disabled:opacity-50"
          >
            {refreshing ? "Updating…" : "↻ Update"}
          </button>
        )}
      </div>
      <label className="block mb-2">
        <span className="text-[10px] uppercase tracking-wide text-text-faint">
          Rates source
        </span>
        <select
          value={state.fxProvider ?? "general"}
          onChange={(e) => financeActions.setFxProvider(e.target.value as "general" | "nbs")}
          className="mt-1 w-full bg-bg-elev-2 border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="general">Automatic (global rates)</option>
          <option value="nbs">NBS — official middle rate</option>
        </select>
      </label>
      {codes.length === 0 ? (
        <p className="text-xs text-text-faint">No foreign currencies in use.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {codes.map((code) => {
              const entry = state.fxRates.find((r) => r.code === code);
              const rate = entry?.rate ?? 1;
              return (
                <div key={`${code}-${entry?.updatedAt ?? ""}`} className="flex items-center gap-2 text-sm">
                  <span className="w-12 font-medium">{code}</span>
                  <input
                    inputMode="decimal"
                    defaultValue={String(Number(rate.toFixed(4)))}
                    onBlur={(e) =>
                      financeActions.setFxRate(
                        code,
                        parseFloat(e.target.value.replace(",", ".")) || 1,
                      )
                    }
                    className="flex-1 bg-bg-elev-2 border border-border rounded-lg px-3 py-2 tabular-nums"
                  />
                  {entry?.manual ? (
                    <button
                      onClick={() => financeActions.resetFxRate(code)}
                      className="text-[10px] text-accent-2 whitespace-nowrap"
                    >
                      manual · auto
                    </button>
                  ) : (
                    <span className="text-[10px] text-text-faint w-12 text-right">auto</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-faint mt-2">
            {lastUpdated
              ? `Auto-updated ${new Date(lastUpdated).toLocaleDateString()} · rates fetched online`
              : "Rates update automatically when online"}
          </p>
        </>
      )}
    </div>
  );
}
