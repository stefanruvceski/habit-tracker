import { test } from "node:test";
import assert from "node:assert/strict";

import type { FinanceState, Expense, ExpenseCategory } from "../src/finance.ts";
import {
  emptyFinanceState,
  expenseBase,
  monthExpenseTotal,
  categoryMonthTotal,
  budgetFor,
  budgetStatus,
  monthBudgetSummary,
} from "../src/finance.ts";

function cat(over: Partial<ExpenseCategory> = {}): ExpenseCategory {
  return {
    id: "c1",
    name: "Groceries",
    color: "#f59e0b",
    order: 0,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

let n = 0;
function exp(over: Partial<Expense> = {}): Expense {
  n += 1;
  return {
    id: `e${n}`,
    categoryId: "c1",
    date: "2026-08-10",
    amount: 1000,
    currency: "RSD",
    createdAt: "2026-08-10T00:00:00.000Z",
    ...over,
  };
}

function state(over: Partial<FinanceState> = {}): FinanceState {
  return { ...emptyFinanceState("RSD"), fxRates: [{ code: "EUR", rate: 117 }], ...over };
}

test("expenseBase converts foreign currency, preferring a locked rate", () => {
  const s = state();
  assert.equal(expenseBase(s, exp({ amount: 10, currency: "EUR" })), 1170); // live rate
  assert.equal(expenseBase(s, exp({ amount: 10, currency: "EUR", fxRate: 120 })), 1200); // locked
  assert.equal(expenseBase(s, exp({ amount: 500 })), 500); // base currency
});

test("monthExpenseTotal and categoryMonthTotal sum only the month/category", () => {
  const s = state({
    categories: [cat(), cat({ id: "c2", name: "Transport" })],
    expenses: [
      exp({ amount: 1000, date: "2026-08-01" }),
      exp({ amount: 500, date: "2026-08-20" }),
      exp({ amount: 999, date: "2026-07-31" }), // different month
      exp({ categoryId: "c2", amount: 300, date: "2026-08-05" }),
    ],
  });
  assert.equal(monthExpenseTotal(s, 2026, 7), 1800); // Aug = month index 7
  assert.equal(categoryMonthTotal(s, 2026, 7, "c1"), 1500);
  assert.equal(categoryMonthTotal(s, 2026, 7, "c2"), 300);
});

test("budgetFor returns the positive limit or 0", () => {
  const s = state({
    budgets: [
      { categoryId: "c1", monthlyLimit: 2000 },
      { categoryId: "c2", monthlyLimit: 0 },
    ],
  });
  assert.equal(budgetFor(s, "c1"), 2000);
  assert.equal(budgetFor(s, "c2"), 0);
  assert.equal(budgetFor(s, "nope"), 0);
});

test("budgetStatus flags over-budget categories and sorts by spend", () => {
  const s = state({
    categories: [cat(), cat({ id: "c2", name: "Transport" })],
    expenses: [
      exp({ amount: 2500, date: "2026-08-10" }), // c1 over its 2000 limit
      exp({ categoryId: "c2", amount: 300, date: "2026-08-10" }),
    ],
    budgets: [
      { categoryId: "c1", monthlyLimit: 2000 },
      { categoryId: "c2", monthlyLimit: 1000 },
    ],
  });
  const status = budgetStatus(s, 2026, 7);
  assert.deepEqual(
    status.map((c) => c.category.id),
    ["c1", "c2"], // sorted by spend desc
  );
  assert.equal(status[0].over, true);
  assert.equal(status[0].remaining, -500);
  assert.equal(status[1].over, false);
  assert.equal(status[1].remaining, 700);
});

test("budgetStatus skips archived and empty/limitless categories", () => {
  const s = state({
    categories: [
      cat({ id: "c1" }),
      cat({ id: "c2", archived: true }),
      cat({ id: "c3", name: "Unused" }), // no spend, no budget
    ],
    expenses: [exp({ categoryId: "c1", amount: 100, date: "2026-08-10" })],
  });
  const status = budgetStatus(s, 2026, 7);
  assert.deepEqual(
    status.map((c) => c.category.id),
    ["c1"],
  );
});

test("monthBudgetSummary rolls up spend, budget and over-count", () => {
  const s = state({
    categories: [cat(), cat({ id: "c2", name: "Transport" })],
    expenses: [
      exp({ amount: 2500, date: "2026-08-10" }),
      exp({ categoryId: "c2", amount: 300, date: "2026-08-10" }),
    ],
    budgets: [
      { categoryId: "c1", monthlyLimit: 2000 },
      { categoryId: "c2", monthlyLimit: 1000 },
    ],
  });
  const sum = monthBudgetSummary(s, 2026, 7);
  assert.equal(sum.totalSpent, 2800);
  assert.equal(sum.totalBudget, 3000);
  assert.equal(sum.overCount, 1);
  assert.ok(Math.abs(sum.ratio - 2800 / 3000) < 1e-9);
});
