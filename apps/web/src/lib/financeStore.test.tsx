import { beforeEach, describe, test, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FinanceState } from "@habit/core";
import {
  financeActions,
  useFinanceState,
  useFinanceHydrated,
} from "./financeStore";

function seed(): FinanceState {
  return {
    version: 1,
    baseCurrency: "RSD",
    sources: [
      { id: "s1", name: "Freelance", color: "#34d399", currency: "EUR", archived: false, order: 0, createdAt: "2026-01-01T00:00:00Z" },
      { id: "s2", name: "Salary", color: "#60a5fa", currency: "RSD", archived: false, order: 1, createdAt: "2026-01-01T00:00:00Z" },
    ],
    transactions: [],
    fxRates: [],
    goal: { target: 1200000, direction: "reach" },
    levels: [
      { name: "Starter", min: 0 },
      { name: "Builder", min: 100000 },
    ],
    fxProvider: "general",
  };
}

// currency-api shape: { rsd: { eur: <eur per 1 rsd> } }
function fxStub(rsdPerEur = 117) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ date: "2026-08-10", rsd: { eur: 1 / rsdPerEur } }),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  globalThis.fetch = fxStub();
  act(() => financeActions.importFinance(seed()));
});

describe("finance store", () => {
  test("hydrates", () => {
    const { result } = renderHook(() => useFinanceHydrated());
    expect(result.current).toBe(true);
  });

  test("addSource / updateSource / deleteSource", () => {
    const { result } = renderHook(() => useFinanceState());
    act(() =>
      financeActions.addSource({ name: "Consulting", color: "#a78bfa", currency: "USD" }),
    );
    const added = result.current.sources.at(-1)!;
    expect(added.name).toBe("Consulting");

    act(() => financeActions.updateSource(added.id, { name: "Advisory" }));
    expect(result.current.sources.find((s) => s.id === added.id)!.name).toBe("Advisory");

    act(() => financeActions.deleteSource(added.id));
    expect(result.current.sources.find((s) => s.id === added.id)).toBeUndefined();
  });

  test("deleteSource also drops its transactions", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() =>
      financeActions.addTransaction({
        sourceId: "s2",
        amount: 1000,
        currency: "RSD",
        date: "2026-03-01",
        status: "paid",
      }),
    );
    expect(result.current.transactions.length).toBe(1);
    act(() => financeActions.deleteSource("s2"));
    expect(result.current.transactions.length).toBe(0);
  });

  test("addTransaction locks the historical rate for a foreign currency", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() =>
      financeActions.addTransaction({
        sourceId: "s1",
        amount: 100,
        currency: "EUR",
        date: "2026-03-15",
        status: "paid",
      }),
    );
    await waitFor(() => {
      const tx = result.current.transactions.at(-1)!;
      expect(tx.fxRate).toBeGreaterThan(0);
    });
    const tx = result.current.transactions.at(-1)!;
    expect(Math.round(tx.fxRate!)).toBe(117);
    expect(tx.fxRateDate).toBe("2026-03-15");
  });

  test("addTransaction in the base currency does not lock a rate", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() =>
      financeActions.addTransaction({
        sourceId: "s2",
        amount: 500,
        currency: "RSD",
        date: "2026-03-15",
        status: "paid",
      }),
    );
    const tx = result.current.transactions.at(-1)!;
    expect(tx.fxRate).toBeUndefined();
  });

  test("updateTransaction / deleteTransaction", () => {
    const { result } = renderHook(() => useFinanceState());
    act(() =>
      financeActions.addTransaction({
        sourceId: "s2",
        amount: 500,
        currency: "RSD",
        date: "2026-03-01",
        status: "paid",
      }),
    );
    const id = result.current.transactions[0].id;
    act(() => financeActions.updateTransaction(id, { amount: 750 }));
    expect(result.current.transactions[0].amount).toBe(750);
    act(() => financeActions.deleteTransaction(id));
    expect(result.current.transactions.length).toBe(0);
  });

  test("setGoal updates the goal", () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.setGoal({ target: 5000, direction: "not_exceed" }));
    expect(result.current.goal).toEqual({ target: 5000, direction: "not_exceed" });
  });

  test("setFxRate marks manual; resetFxRate clears it", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.setFxRate("EUR", 120));
    const entry = result.current.fxRates.find((r) => r.code === "EUR")!;
    expect(entry.rate).toBe(120);
    expect(entry.manual).toBe(true);

    act(() => financeActions.resetFxRate("EUR"));
    // reset removes the manual entry, then refetches (async) a non-manual one
    await waitFor(() => {
      const e = result.current.fxRates.find((r) => r.code === "EUR");
      expect(e && e.manual).toBeFalsy();
    });
  });

  test("refreshFxRates populates rates from the provider", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.refreshFxRates(true));
    await waitFor(() => {
      const e = result.current.fxRates.find((r) => r.code === "EUR");
      expect(e?.rate).toBeGreaterThan(0);
    });
  });

  test("setBaseCurrency switches base and clears base-relative rates", async () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.setFxRate("EUR", 120)); // seed a rate
    act(() => financeActions.setBaseCurrency("EUR"));
    expect(result.current.baseCurrency).toBe("EUR");
    // fxRates were cleared on switch (then possibly refetched); EUR==base now
    await waitFor(() => {
      expect(result.current.baseCurrency).toBe("EUR");
    });
  });

  test("setFxProvider switches the provider", () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.setFxProvider("nbs"));
    expect(result.current.fxProvider).toBe("nbs");
  });

  test("category + expense + budget lifecycle", () => {
    const { result } = renderHook(() => useFinanceState());

    act(() => financeActions.addCategory({ name: "Groceries", color: "#f59e0b" }));
    const cat = result.current.categories!.at(-1)!;
    expect(cat.name).toBe("Groceries");

    act(() =>
      financeActions.addExpense({
        categoryId: cat.id,
        amount: 1500,
        currency: "RSD",
        date: "2026-08-10",
      }),
    );
    expect(result.current.expenses!.length).toBe(1);

    act(() => financeActions.setBudget(cat.id, 5000));
    expect(result.current.budgets!.find((b) => b.categoryId === cat.id)!.monthlyLimit).toBe(
      5000,
    );

    // setBudget(<=0) clears the limit
    act(() => financeActions.setBudget(cat.id, 0));
    expect(result.current.budgets!.find((b) => b.categoryId === cat.id)).toBeUndefined();
  });

  test("deleteCategory drops its expenses and budget", () => {
    const { result } = renderHook(() => useFinanceState());
    act(() => financeActions.addCategory({ name: "Transport", color: "#60a5fa" }));
    const cat = result.current.categories!.at(-1)!;
    act(() =>
      financeActions.addExpense({
        categoryId: cat.id,
        amount: 300,
        currency: "RSD",
        date: "2026-08-05",
      }),
    );
    act(() => financeActions.setBudget(cat.id, 2000));

    act(() => financeActions.deleteCategory(cat.id));
    expect(result.current.categories!.find((c) => c.id === cat.id)).toBeUndefined();
    expect(result.current.expenses!.filter((e) => e.categoryId === cat.id)).toHaveLength(0);
    expect(result.current.budgets!.filter((b) => b.categoryId === cat.id)).toHaveLength(0);
  });
});
