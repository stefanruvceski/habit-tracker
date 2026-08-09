import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FINANCE_VERSION,
  FinanceState,
  GoalConfig,
  IncomeSource,
  LevelTier,
  Transaction,
  emptyFinanceState,
  fetchFxRates,
  fxRateStale,
  newFinanceId,
} from "@habit/core";

const STORAGE_KEY = "habit-tracker.finance.v1";

function seedFinanceState(): FinanceState {
  const now = new Date().toISOString();
  const base = emptyFinanceState("RSD");
  base.sources = [
    {
      id: newFinanceId("src"),
      name: "Freelance",
      color: "#34d399",
      currency: "EUR",
      archived: false,
      order: 0,
      createdAt: now,
    },
    {
      id: newFinanceId("src"),
      name: "Salary",
      color: "#60a5fa",
      currency: "RSD",
      archived: false,
      order: 1,
      createdAt: now,
    },
  ];
  base.fxRates = [
    { code: "EUR", rate: 117 },
    { code: "USD", rate: 108 },
  ];
  return base;
}

let state: FinanceState = seedFinanceState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let loadStarted = false;
async function load() {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceState;
      if (parsed && Array.isArray(parsed.sources)) {
        state = {
          version: FINANCE_VERSION,
          baseCurrency: parsed.baseCurrency ?? "RSD",
          sources: parsed.sources ?? [],
          transactions: parsed.transactions ?? [],
          fxRates: parsed.fxRates ?? [],
          goal: parsed.goal ?? { target: 0, direction: "reach" },
          levels:
            Array.isArray(parsed.levels) && parsed.levels.length
              ? parsed.levels
              : emptyFinanceState().levels,
        };
      }
    } else {
      await persist();
    }
  } catch {
    // keep seed
  }
  hydrated = true;
  emit();
  void refreshFx(false);
}

// ---- Live FX rates --------------------------------------------------------

let fxRefreshing = false;

function foreignCodes(s: FinanceState): string[] {
  return Array.from(
    new Set(s.sources.map((x) => x.currency).filter((c) => c && c !== s.baseCurrency)),
  );
}

/**
 * Fetch live FX rates. `force` refreshes everything (including manual
 * overrides); otherwise only stale, non-manual rates. Failures are swallowed
 * so the app keeps working offline with the last known rates.
 */
async function refreshFx(force: boolean) {
  if (fxRefreshing) return;
  const codes = foreignCodes(state);
  const toFetch = force
    ? codes
    : codes.filter((c) => {
        const r = state.fxRates.find((x) => x.code === c);
        return !(r && r.manual) && fxRateStale(r);
      });
  if (toFetch.length === 0) return;

  fxRefreshing = true;
  emit();
  try {
    const res = await fetchFxRates(state.baseCurrency, toFetch);
    setState((s) => {
      const map = new Map(s.fxRates.map((r) => [r.code, r]));
      for (const q of res.rates) {
        const prev = map.get(q.code);
        if (!force && prev?.manual) continue;
        map.set(q.code, {
          code: q.code,
          rate: q.rate,
          updatedAt: res.fetchedAt,
          manual: false,
        });
      }
      return { ...s, fxRates: Array.from(map.values()) };
    });
  } catch {
    // keep existing rates
  } finally {
    fxRefreshing = false;
    emit();
  }
}

function setState(updater: (s: FinanceState) => FinanceState) {
  state = updater(state);
  void persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void load();
  return () => {
    listeners.delete(cb);
  };
}

// ---- Hooks ----------------------------------------------------------------

export function useFinanceState(): FinanceState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useFinanceHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated);
}

export function useFxRefreshing(): boolean {
  return useSyncExternalStore(subscribe, () => fxRefreshing);
}

// ---- Mutations ------------------------------------------------------------

export const financeActions = {
  addSource(input: Omit<IncomeSource, "id" | "order" | "archived" | "createdAt">) {
    setState((s) => {
      const order = s.sources.length
        ? Math.max(...s.sources.map((x) => x.order)) + 1
        : 0;
      const src: IncomeSource = {
        ...input,
        id: newFinanceId("src"),
        order,
        archived: false,
        createdAt: new Date().toISOString(),
      };
      return { ...s, sources: [...s.sources, src] };
    });
  },

  updateSource(id: string, patch: Partial<IncomeSource>) {
    setState((s) => ({
      ...s,
      sources: s.sources.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },

  deleteSource(id: string) {
    setState((s) => ({
      ...s,
      sources: s.sources.filter((x) => x.id !== id),
      transactions: s.transactions.filter((t) => t.sourceId !== id),
    }));
  },

  addTransaction(input: Omit<Transaction, "id" | "createdAt">) {
    setState((s) => {
      const tx: Transaction = {
        ...input,
        id: newFinanceId("tx"),
        createdAt: new Date().toISOString(),
      };
      return { ...s, transactions: [...s.transactions, tx] };
    });
  },

  updateTransaction(id: string, patch: Partial<Transaction>) {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  deleteTransaction(id: string) {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  },

  setGoal(goal: GoalConfig) {
    setState((s) => ({ ...s, goal }));
  },

  setBaseCurrency(code: string) {
    setState((s) => ({ ...s, baseCurrency: code }));
  },

  setFxRate(code: string, rate: number) {
    setState((s) => {
      const rest = s.fxRates.filter((r) => r.code !== code);
      return {
        ...s,
        fxRates: [
          ...rest,
          { code, rate, updatedAt: new Date().toISOString(), manual: true },
        ],
      };
    });
  },

  resetFxRate(code: string) {
    setState((s) => ({
      ...s,
      fxRates: s.fxRates.filter((r) => r.code !== code),
    }));
    void refreshFx(false);
  },

  refreshFxRates(force = false) {
    void refreshFx(force);
  },

  setLevels(levels: LevelTier[]) {
    setState((s) => ({ ...s, levels }));
  },

  importFinance(next: FinanceState) {
    setState(() => ({
      version: FINANCE_VERSION,
      baseCurrency: next.baseCurrency ?? "RSD",
      sources: next.sources ?? [],
      transactions: next.transactions ?? [],
      fxRates: next.fxRates ?? [],
      goal: next.goal ?? { target: 0, direction: "reach" },
      levels: next.levels ?? emptyFinanceState().levels,
    }));
  },
};
