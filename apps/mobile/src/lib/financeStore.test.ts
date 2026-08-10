import { beforeEach, describe, test, expect, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FinanceState } from "@habit/core";
import { financeActions } from "./financeStore";

const flush = () => new Promise((r) => setTimeout(r, 20));

async function persisted(): Promise<FinanceState> {
  const raw = await AsyncStorage.getItem("habit-tracker.finance.v1");
  return JSON.parse(raw!);
}

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
    levels: [{ name: "Starter", min: 0 }, { name: "Builder", min: 100000 }],
    fxProvider: "general",
  };
}

beforeEach(async () => {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ date: "2026-08-10", rsd: { eur: 1 / 117 } }),
  })) as unknown as typeof fetch;
  financeActions.importFinance(seed());
  await flush();
});

describe("mobile finance store", () => {
  test("addSource / updateSource / deleteSource", async () => {
    financeActions.addSource({ name: "Consulting", color: "#a78bfa", currency: "USD" });
    let p = await persisted();
    const added = p.sources.at(-1)!;
    expect(added.name).toBe("Consulting");

    financeActions.updateSource(added.id, { name: "Advisory" });
    p = await persisted();
    expect(p.sources.find((s) => s.id === added.id)!.name).toBe("Advisory");

    financeActions.deleteSource(added.id);
    p = await persisted();
    expect(p.sources.find((s) => s.id === added.id)).toBeUndefined();
  });

  test("addTransaction locks a historical rate for a foreign currency", async () => {
    financeActions.addTransaction({
      sourceId: "s1",
      amount: 100,
      currency: "EUR",
      date: "2026-03-15",
      status: "paid",
    });
    await flush();
    const tx = (await persisted()).transactions.at(-1)!;
    expect(Math.round(tx.fxRate!)).toBe(117);
    expect(tx.fxRateDate).toBe("2026-03-15");
  });

  test("base-currency transaction is not rate-locked", async () => {
    financeActions.addTransaction({
      sourceId: "s2",
      amount: 500,
      currency: "RSD",
      date: "2026-03-15",
      status: "paid",
    });
    await flush();
    const tx = (await persisted()).transactions.at(-1)!;
    expect(tx.fxRate).toBeUndefined();
  });

  test("update / delete transaction", async () => {
    financeActions.addTransaction({
      sourceId: "s2",
      amount: 500,
      currency: "RSD",
      date: "2026-03-01",
      status: "paid",
    });
    await flush();
    const id = (await persisted()).transactions[0].id;
    financeActions.updateTransaction(id, { amount: 750 });
    expect((await persisted()).transactions[0].amount).toBe(750);
    financeActions.deleteTransaction(id);
    expect((await persisted()).transactions.length).toBe(0);
  });

  test("setGoal, setFxRate (manual) and resetFxRate", async () => {
    financeActions.setGoal({ target: 5000, direction: "not_exceed" });
    expect((await persisted()).goal).toEqual({ target: 5000, direction: "not_exceed" });

    financeActions.setFxRate("EUR", 120);
    let entry = (await persisted()).fxRates.find((r) => r.code === "EUR")!;
    expect(entry.rate).toBe(120);
    expect(entry.manual).toBe(true);

    financeActions.resetFxRate("EUR");
    await flush();
    entry = (await persisted()).fxRates.find((r) => r.code === "EUR")!;
    expect(entry.manual).toBeFalsy();
  });

  test("refreshFxRates populates from the provider", async () => {
    financeActions.refreshFxRates(true);
    await flush();
    const eur = (await persisted()).fxRates.find((r) => r.code === "EUR");
    expect(eur?.rate).toBeGreaterThan(0);
  });

  test("setBaseCurrency clears base-relative rates and switches base", async () => {
    financeActions.setFxRate("EUR", 120);
    financeActions.setBaseCurrency("EUR");
    await flush();
    expect((await persisted()).baseCurrency).toBe("EUR");
  });

  test("setFxProvider switches provider", async () => {
    financeActions.setFxProvider("nbs");
    await flush();
    expect((await persisted()).fxProvider).toBe("nbs");
  });
});
