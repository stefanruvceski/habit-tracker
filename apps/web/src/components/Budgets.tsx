"use client";

import { useMemo, useState } from "react";
import {
  MONTH_NAMES,
  PALETTE,
  SUPPORTED_CURRENCY_CODES,
  budgetFor,
  budgetStatus,
  monthBudgetSummary,
  todayKey,
} from "@habit/core";
import { useFinanceState, financeActions } from "../lib/financeStore";
import { Card } from "./ui";

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

/**
 * Monthly spending vs budget. Expenses live alongside income (they never touch
 * the income goal/levels). Shows per-category spent/limit bars for the chosen
 * month, with inline expense entry, category management, and limit editing.
 */
export function Budgets({ year }: { year: number }) {
  const state = useFinanceState();
  const now = new Date();
  const [month, setMonth] = useState(
    year === now.getFullYear() ? now.getMonth() : 0,
  );
  const base = state.baseCurrency;

  const status = useMemo(
    () => budgetStatus(state, year, month),
    [state, year, month],
  );
  const summary = useMemo(
    () => monthBudgetSummary(state, year, month),
    [state, year, month],
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-dim">Budgets</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setMonth((m) => (m + 11) % 12)}
            className="w-7 h-7 rounded-lg border border-border bg-bg-elev-2"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="font-medium w-16 text-center">{MONTH_NAMES[month]}</span>
          <button
            onClick={() => setMonth((m) => (m + 1) % 12)}
            className="w-7 h-7 rounded-lg border border-border bg-bg-elev-2"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* Month roll-up */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-dim">
            Spent {fmtMoney(summary.totalSpent, base)}
          </span>
          {summary.totalBudget > 0 && (
            <span className="text-text-faint">
              of {fmtMoney(summary.totalBudget, base)}
            </span>
          )}
        </div>
        {summary.totalBudget > 0 && (
          <div className="h-2 rounded-full bg-bg-elev-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, summary.ratio * 100)}%`,
                background: summary.overCount > 0 ? "#ef4444" : "var(--accent)",
              }}
            />
          </div>
        )}
        {summary.overCount > 0 && (
          <div className="text-xs text-red-400 mt-1">
            ⚠ {summary.overCount} categor{summary.overCount === 1 ? "y" : "ies"} over
            budget
          </div>
        )}
      </div>

      {/* Per-category bars */}
      {status.length === 0 ? (
        <p className="text-sm text-text-faint mb-3">
          No spending or budgets this month yet.
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {status.map((c) => (
            <div key={c.category.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: c.category.color }}
                  />
                  <span className="truncate">{c.category.name}</span>
                </span>
                <span
                  className={`tabular-nums shrink-0 ${c.over ? "text-red-400" : "text-text-dim"}`}
                >
                  {fmtMoney(c.spent, base)}
                  {c.limit > 0 && (
                    <span className="text-text-faint"> / {fmtMoney(c.limit, base)}</span>
                  )}
                </span>
              </div>
              {c.limit > 0 && (
                <div className="h-1.5 rounded-full bg-bg-elev-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, c.ratio * 100)}%`,
                      background: c.over ? "#ef4444" : c.category.color,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddExpense month={month} year={year} />
      <ManageCategories />
    </Card>
  );
}

function AddExpense({ month, year }: { month: number; year: number }) {
  const state = useFinanceState();
  const categories = (state.categories ?? []).filter((c) => !c.archived);
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(state.baseCurrency);
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");

  if (categories.length === 0) {
    return (
      <p className="text-xs text-text-faint">
        Add a category below to start logging expenses.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setCategoryId(categories[0].id);
          // Default the date into the month being viewed.
          const mm = String(month + 1).padStart(2, "0");
          setDate(`${year}-${mm}-${String(new Date().getDate()).padStart(2, "0")}`);
        }}
        className="w-full rounded-xl border border-dashed border-border py-2 text-sm text-text-dim hover:text-text hover:border-accent transition-colors"
      >
        + Add expense
      </button>
    );
  }

  function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!categoryId || !Number.isFinite(value) || value <= 0) return;
    financeActions.addExpense({
      categoryId,
      amount: value,
      currency,
      date,
      note: note.trim() || undefined,
    });
    setAmount("");
    setNote("");
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elev-2 p-3 space-y-2">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="w-full bg-bg-elev border border-border rounded-lg px-3 py-2"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1 bg-bg-elev border border-border rounded-lg px-3 py-2 tabular-nums"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-bg-elev border border-border rounded-lg px-2 py-2"
        >
          {SUPPORTED_CURRENCY_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full bg-bg-elev border border-border rounded-lg px-3 py-2"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full bg-bg-elev border border-border rounded-lg px-3 py-2"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!amount.trim()}
          className="flex-1 rounded-lg bg-accent text-bg font-semibold py-2 disabled:opacity-40"
        >
          Save expense
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-text-dim"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageCategories() {
  const state = useFinanceState();
  const categories = (state.categories ?? []).filter((c) => !c.archived);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-text-dim hover:text-text"
      >
        {open ? "▾" : "▸"} Categories & limits
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: c.color }}
              />
              <span className="flex-1 text-sm truncate">{c.name}</span>
              <LimitInput
                categoryId={c.id}
                current={budgetFor(state, c.id)}
                base={state.baseCurrency}
              />
              <button
                onClick={() => {
                  if (confirm(`Delete "${c.name}" and its expenses?`))
                    financeActions.deleteCategory(c.id);
                }}
                className="text-text-faint hover:text-red-400 px-1"
                aria-label="Delete category"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="rounded-xl border border-border bg-bg-elev-2 p-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New category (e.g. Groceries)"
              className="w-full bg-bg-elev border border-border rounded-lg px-3 py-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-bg-elev-2 ring-text" : ""}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <button
              onClick={() => {
                if (!name.trim()) return;
                financeActions.addCategory({ name: name.trim(), color });
                setName("");
              }}
              disabled={!name.trim()}
              className="w-full rounded-lg bg-accent text-bg font-semibold py-2 disabled:opacity-40"
            >
              Add category
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LimitInput({
  categoryId,
  current,
  base,
}: {
  categoryId: string;
  current: number;
  base: string;
}) {
  const [value, setValue] = useState(current > 0 ? String(current) : "");

  function commit() {
    const n = parseFloat(value.replace(",", "."));
    financeActions.setBudget(categoryId, Number.isFinite(n) ? n : 0);
  }

  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder={`limit ${base}`}
      className="w-24 bg-bg-elev border border-border rounded-lg px-2 py-1 text-sm text-right tabular-nums"
    />
  );
}
