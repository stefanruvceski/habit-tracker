import { test } from "node:test";
import assert from "node:assert/strict";

import type { FinanceState, Transaction } from "../src/finance.ts";
import {
  emptyFinanceState,
  rateFor,
  toBase,
  txBase,
  monthTotals,
  yearTotal,
  sourceDistribution,
  bestMonth,
  normalizedDistribution,
  expectedToDate,
  progress,
  projection,
  monthsOnTarget,
  levelForAmount,
  nextLevel,
  trailingAverage,
  currentLevel,
  financeKpis,
  financeYears,
  DEFAULT_LEVELS,
  parseFxResponse,
  fetchFxRates,
  fetchFxRateOn,
  fxRateStale,
  fxEndpoints,
  SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
  nbsEndpoints,
  parseNbsResponse,
  fetchNbsRates,
  fetchRates,
} from "../src/finance.ts";

let idc = 0;
function tx(partial: Partial<Transaction>): Transaction {
  idc += 1;
  return {
    id: `t${idc}`,
    sourceId: "s1",
    date: "2026-01-15",
    amount: 100,
    currency: "RSD",
    status: "paid",
    createdAt: "2026-01-15T00:00:00.000Z",
    ...partial,
  };
}

function baseState(overrides: Partial<FinanceState> = {}): FinanceState {
  return {
    ...emptyFinanceState("RSD"),
    sources: [
      { id: "s1", name: "Client A", color: "#34d399", currency: "RSD", archived: false, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "s2", name: "Client B", color: "#60a5fa", currency: "EUR", archived: false, order: 1, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    fxRates: [{ code: "EUR", rate: 117 }],
    ...overrides,
  };
}

test("rateFor: base is 1, known rate returned, unknown falls back to 1", () => {
  const s = baseState();
  assert.equal(rateFor(s, "RSD"), 1);
  assert.equal(rateFor(s, "EUR"), 117);
  assert.equal(rateFor(s, "GBP"), 1);
});

test("toBase converts using the manual FX rate", () => {
  const s = baseState();
  assert.equal(toBase(s, 10, "EUR"), 1170);
  assert.equal(toBase(s, 500, "RSD"), 500);
});

test("monthTotals sums per month in base currency, paid only by default", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2026-01-10", amount: 1000, currency: "RSD", status: "paid" }),
      tx({ date: "2026-01-20", amount: 10, currency: "EUR", status: "paid" }), // 1170
      tx({ date: "2026-02-05", amount: 500, currency: "RSD", status: "paid" }),
      tx({ date: "2026-03-01", amount: 999, currency: "RSD", status: "invoiced" }), // excluded
    ],
  });
  const totals = monthTotals(s, 2026);
  assert.equal(totals[0], 1000 + 1170);
  assert.equal(totals[1], 500);
  assert.equal(totals[2], 0); // invoiced not counted
  assert.equal(totals.length, 12);
});

test("monthTotals includes invoiced when requested", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2026-03-01", amount: 999, currency: "RSD", status: "invoiced" }),
    ],
  });
  assert.equal(monthTotals(s, 2026, true)[2], 999);
  assert.equal(monthTotals(s, 2026, false)[2], 0);
});

test("yearTotal respects year and status", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2026-01-10", amount: 1000, status: "paid" }),
      tx({ date: "2026-06-10", amount: 500, status: "invoiced" }),
      tx({ date: "2025-12-31", amount: 9999, status: "paid" }), // other year
    ],
  });
  assert.equal(yearTotal(s, 2026, false), 1000);
  assert.equal(yearTotal(s, 2026, true), 1500);
  assert.equal(yearTotal(s, 2025, false), 9999);
});

test("sourceDistribution ranks sources and computes shares", () => {
  const s = baseState({
    transactions: [
      tx({ sourceId: "s1", date: "2026-01-10", amount: 300, currency: "RSD", status: "paid" }),
      tx({ sourceId: "s2", date: "2026-01-10", amount: 100, currency: "RSD", status: "paid" }),
    ],
  });
  const dist = sourceDistribution(s, 2026);
  assert.equal(dist.length, 2);
  assert.equal(dist[0].sourceId, "s1");
  assert.equal(dist[0].total, 300);
  assert.ok(Math.abs(dist[0].share - 0.75) < 1e-9);
  assert.ok(Math.abs(dist[1].share - 0.25) < 1e-9);
});

test("bestMonth returns the top month or null", () => {
  const empty = baseState();
  assert.equal(bestMonth(empty, 2026), null);

  const s = baseState({
    transactions: [
      tx({ date: "2026-02-10", amount: 500, status: "paid" }),
      tx({ date: "2026-05-10", amount: 900, status: "paid" }),
    ],
  });
  const best = bestMonth(s, 2026);
  assert.equal(best?.month, 4);
  assert.equal(best?.label, "May");
  assert.equal(best?.total, 900);
});

test("normalizedDistribution: even by default, normalises weights, guards zero", () => {
  const even = normalizedDistribution({ target: 1200, direction: "reach" });
  assert.ok(Math.abs(even.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(Math.abs(even[0] - 1 / 12) < 1e-9);

  const weighted = normalizedDistribution({
    target: 100,
    direction: "reach",
    distribution: [3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  assert.ok(Math.abs(weighted[0] - 0.75) < 1e-9);
  assert.ok(Math.abs(weighted[1] - 0.25) < 1e-9);

  const zero = normalizedDistribution({
    target: 100,
    direction: "reach",
    distribution: new Array(12).fill(0),
  });
  assert.ok(Math.abs(zero[0] - 1 / 12) < 1e-9);
});

test("expectedToDate accumulates the distribution fraction", () => {
  const goal = { target: 1200, direction: "reach" as const };
  assert.ok(Math.abs(expectedToDate(goal, 0) - 100) < 1e-9); // one month even
  assert.ok(Math.abs(expectedToDate(goal, 5) - 600) < 1e-9); // half year
  assert.ok(Math.abs(expectedToDate(goal, 11) - 1200) < 1e-9); // full year
});

test("progress is total / target, 0 when no target", () => {
  const s = baseState({
    goal: { target: 1000, direction: "reach" },
    transactions: [tx({ date: "2026-01-10", amount: 250, status: "paid" })],
  });
  assert.ok(Math.abs(progress(s, 2026) - 0.25) < 1e-9);

  const noTarget = baseState({ goal: { target: 0, direction: "reach" } });
  assert.equal(progress(noTarget, 2026), 0);
});

test("projection extrapolates a run rate and flags pace (reach)", () => {
  const s = baseState({
    goal: { target: 1200, direction: "reach" },
    transactions: [
      tx({ date: "2026-01-10", amount: 100, status: "paid" }),
      tx({ date: "2026-02-10", amount: 100, status: "paid" }),
      tx({ date: "2026-03-10", amount: 100, status: "paid" }),
    ],
  });
  const p = projection(s, 2026, 2); // through March
  assert.equal(p.earned, 300);
  assert.equal(p.monthsElapsed, 3);
  assert.equal(p.perMonth, 100);
  assert.equal(p.projected, 1200);
  assert.ok(Math.abs(p.expected - 300) < 1e-9);
  assert.equal(p.onPace, true); // 300 >= 300
});

test("projection pace for not_exceed goals inverts the comparison", () => {
  const s = baseState({
    goal: { target: 1200, direction: "not_exceed" },
    transactions: [tx({ date: "2026-01-10", amount: 50, status: "paid" })],
  });
  const p = projection(s, 2026, 0); // through Jan, expected 100
  assert.equal(p.earned, 50);
  assert.equal(p.onPace, true); // 50 <= 100 → under the ceiling

  const over = baseState({
    goal: { target: 1200, direction: "not_exceed" },
    transactions: [tx({ date: "2026-01-10", amount: 150, status: "paid" })],
  });
  assert.equal(projection(over, 2026, 0).onPace, false); // 150 > 100
});

test("monthsOnTarget counts months meeting the per-month expectation", () => {
  const s = baseState({
    goal: { target: 1200, direction: "reach" }, // 100/month even
    transactions: [
      tx({ date: "2026-01-10", amount: 120, status: "paid" }), // ok
      tx({ date: "2026-02-10", amount: 80, status: "paid" }), // under
      tx({ date: "2026-03-10", amount: 100, status: "paid" }), // exactly ok
    ],
  });
  assert.equal(monthsOnTarget(s, 2026), 2);
});

test("levelForAmount picks the highest tier reached; nextLevel the following one", () => {
  assert.equal(levelForAmount(DEFAULT_LEVELS, 0)?.name, "Starter");
  assert.equal(levelForAmount(DEFAULT_LEVELS, 150_000)?.name, "Builder");
  assert.equal(levelForAmount(DEFAULT_LEVELS, 5_000_000)?.name, "Thriving");
  assert.equal(levelForAmount(DEFAULT_LEVELS, -5), null);

  assert.equal(nextLevel(DEFAULT_LEVELS, 0)?.name, "Builder");
  assert.equal(nextLevel(DEFAULT_LEVELS, 5_000_000), null);
});

test("levelForAmount handles unsorted tiers", () => {
  const levels = [
    { name: "High", min: 1000 },
    { name: "Low", min: 0 },
    { name: "Mid", min: 500 },
  ];
  assert.equal(levelForAmount(levels, 600)?.name, "Mid");
});

test("trailingAverage averages the last N months across a year boundary", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2025-12-10", amount: 300, currency: "RSD", status: "paid" }),
      tx({ date: "2026-01-10", amount: 600, currency: "RSD", status: "paid" }),
      tx({ date: "2026-02-10", amount: 900, currency: "RSD", status: "paid" }),
    ],
  });
  // Trailing 3 months ending Feb 2026: Dec + Jan + Feb = 1800 / 3 = 600.
  assert.equal(trailingAverage(s, 2026, 1, 3), 600);
});

test("currentLevel uses the trailing 3-month average", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2026-01-10", amount: 100_000, status: "paid" }),
      tx({ date: "2026-02-10", amount: 100_000, status: "paid" }),
      tx({ date: "2026-03-10", amount: 700_000, status: "paid" }),
    ],
  });
  // Avg over Jan-Mar = 900k/3 = 300k → "Momentum".
  assert.equal(currentLevel(s, 2026, 2)?.name, "Momentum");
});

test("financeKpis bundles paid/invoiced totals, progress and level", () => {
  const s = baseState({
    goal: { target: 1200, direction: "reach" },
    transactions: [
      tx({ date: "2026-01-10", amount: 300, currency: "RSD", status: "paid" }),
      tx({ date: "2026-02-10", amount: 200, currency: "RSD", status: "invoiced" }),
    ],
  });
  const k = financeKpis(s, 2026, 1); // through Feb
  assert.equal(k.paidTotal, 300);
  assert.equal(k.invoicedTotal, 500);
  assert.ok(Math.abs(k.progress - 0.25) < 1e-9);
  assert.ok(Math.abs(k.progressInvoiced - 500 / 1200) < 1e-9);
  assert.equal(k.baseCurrency, "RSD");
  assert.equal(k.best?.month, 0);
  assert.ok(k.level !== null);
});

test("SUPPORTED_CURRENCIES covers the required set with codes and symbols", () => {
  for (const code of ["RSD", "EUR", "USD", "GBP", "CAD", "AUD"]) {
    assert.ok(SUPPORTED_CURRENCY_CODES.includes(code), `missing ${code}`);
  }
  assert.equal(SUPPORTED_CURRENCIES[0].code, "RSD"); // dinar first (default base)
  for (const c of SUPPORTED_CURRENCIES) {
    assert.ok(c.name.length > 0 && c.symbol.length > 0);
  }
});

test("fxEndpoints builds CDN + fallback URLs with a lowercased base", () => {
  const urls = fxEndpoints("RSD");
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes("/currencies/rsd.json"));
  assert.ok(urls[0].startsWith("https://cdn.jsdelivr.net/"));
  assert.ok(urls[1].includes("currency-api.pages.dev"));
});

test("fxEndpoints pins a historical version when a date is given", () => {
  const urls = fxEndpoints("RSD", "2026-03-15");
  assert.ok(urls[0].includes("@2026-03-15/"));
  assert.ok(urls[0].includes("/currencies/rsd.json"));
  assert.ok(urls[1].startsWith("https://2026-03-15.currency-api.pages.dev"));
});

test("txBase prefers a transaction's locked fxRate over the live rate", () => {
  const s = baseState(); // live EUR rate = 117
  const locked = tx({ amount: 10, currency: "EUR", fxRate: 100 });
  assert.equal(txBase(s, locked), 1000); // 10 * 100 (locked)
  const live = tx({ amount: 10, currency: "EUR" });
  assert.equal(txBase(s, live), 1170); // 10 * 117 (live fallback)
});

test("fetchFxRateOn requests the transaction date and returns basePerCode", async () => {
  const seen: string[] = [];
  const stub = async (url: string) => {
    seen.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ date: "2026-03-15", rsd: { eur: 1 / 100 } }),
    };
  };
  const rate = await fetchFxRateOn("RSD", "EUR", "2026-03-15", { fetchImpl: stub });
  assert.ok(Math.abs((rate ?? 0) - 100) < 1e-6);
  assert.ok(seen[0].includes("@2026-03-15/")); // used the historical endpoint
});

test("fetchFxRateOn returns 1 for the base currency without fetching", async () => {
  let called = false;
  const stub = async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const rate = await fetchFxRateOn("RSD", "RSD", "2026-03-15", { fetchImpl: stub });
  assert.equal(rate, 1);
  assert.equal(called, false);
});

test("fetchFxRateOn falls back to latest when the historical date 404s", async () => {
  const seen: string[] = [];
  const stub = async (url: string) => {
    seen.push(url);
    if (url.includes("@2019-01-01") || url.includes("2019-01-01.currency-api")) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({ rsd: { eur: 1 / 117 } }) };
  };
  const rate = await fetchFxRateOn("RSD", "EUR", "2019-01-01", { fetchImpl: stub });
  assert.ok(Math.abs((rate ?? 0) - 117) < 1e-6);
  assert.ok(seen.some((u) => u.includes("@latest/"))); // retried with latest
});

test("parseFxResponse inverts codePerBase to basePerCode for requested codes", () => {
  const data = {
    date: "2026-08-09",
    rsd: { eur: 1 / 117, usd: 1 / 108, gbp: 0, xyz: 0.5 },
  };
  const rates = parseFxResponse("RSD", ["EUR", "USD", "GBP", "MISSING"], data);
  const byCode = new Map(rates.map((r) => [r.code, r.rate]));
  assert.ok(Math.abs((byCode.get("EUR") ?? 0) - 117) < 1e-6);
  assert.ok(Math.abs((byCode.get("USD") ?? 0) - 108) < 1e-6);
  assert.equal(byCode.has("GBP"), false); // zero rate skipped
  assert.equal(byCode.has("MISSING"), false); // absent code skipped
});

test("parseFxResponse returns [] when the base table is absent", () => {
  assert.deepEqual(parseFxResponse("RSD", ["EUR"], { usd: { eur: 0.9 } }), []);
  assert.deepEqual(parseFxResponse("RSD", ["EUR"], null), []);
});

test("fetchFxRates uses the first endpoint that returns matching rates", async () => {
  const calls: string[] = [];
  const stub = async (url: string) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ date: "2026-08-09", rsd: { eur: 1 / 117 } }),
    };
  };
  const result = await fetchFxRates("RSD", ["EUR", "RSD"], { fetchImpl: stub });
  assert.equal(calls.length, 1); // stopped at first success
  assert.equal(result.rates.length, 1);
  assert.equal(result.rates[0].code, "EUR");
  assert.ok(Math.abs(result.rates[0].rate - 117) < 1e-6);
  assert.equal(result.date, "2026-08-09");
});

test("fetchFxRates falls back to the next endpoint on failure", async () => {
  let n = 0;
  const stub = async () => {
    n += 1;
    if (n === 1) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ rsd: { usd: 1 / 108 } }) };
  };
  const result = await fetchFxRates("RSD", ["USD"], { fetchImpl: stub });
  assert.equal(n, 2);
  assert.equal(result.rates[0].code, "USD");
});

test("fetchFxRates short-circuits when no foreign codes are requested", async () => {
  let called = false;
  const stub = async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const result = await fetchFxRates("RSD", ["RSD"], { fetchImpl: stub });
  assert.equal(called, false);
  assert.deepEqual(result.rates, []);
});

test("fetchFxRates throws when every endpoint fails", async () => {
  const stub = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(() => fetchFxRates("RSD", ["EUR"], { fetchImpl: stub }));
});

test("nbsEndpoints uses 'today' by default and a date when given", () => {
  assert.ok(nbsEndpoints()[0].endsWith("/rates/today"));
  assert.ok(nbsEndpoints("2026-03-15")[0].endsWith("/rates/2026-03-15"));
});

test("parseNbsResponse returns RSD-per-unit adjusting for parity", () => {
  const data = {
    date: "2026-03-15",
    rates: [
      { code: "EUR", exchange_middle: 117.2, parity: 1 },
      { code: "JPY", exchange_middle: 78.5, parity: 100 }, // quoted per 100
      { code: "USD", exchange_middle: 108.4, parity: 1 },
    ],
  };
  const out = parseNbsResponse(["EUR", "JPY"], data);
  const m = new Map(out.map((r) => [r.code, r.rsdPer]));
  assert.ok(Math.abs((m.get("EUR") ?? 0) - 117.2) < 1e-9);
  assert.ok(Math.abs((m.get("JPY") ?? 0) - 0.785) < 1e-9); // 78.5 / 100
  assert.equal(m.has("USD"), false); // not requested
});

test("fetchNbsRates returns RSD-per-code directly when base is RSD", async () => {
  const stub = async (url: string) => {
    assert.ok(url.includes("kurs.resenje.org"));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        date: "2026-03-15",
        rates: [
          { code: "EUR", exchange_middle: 117, parity: 1 },
          { code: "USD", exchange_middle: 108, parity: 1 },
        ],
      }),
    };
  };
  const res = await fetchNbsRates("RSD", ["EUR", "USD"], { fetchImpl: stub });
  const m = new Map(res.rates.map((r) => [r.code, r.rate]));
  assert.ok(Math.abs((m.get("EUR") ?? 0) - 117) < 1e-9);
  assert.ok(Math.abs((m.get("USD") ?? 0) - 108) < 1e-9);
  assert.equal(res.date, "2026-03-15");
});

test("fetchNbsRates cross-computes through RSD for a non-RSD base", async () => {
  const stub = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      rates: [
        { code: "EUR", exchange_middle: 117, parity: 1 },
        { code: "USD", exchange_middle: 108, parity: 1 },
      ],
    }),
  });
  // base EUR, want USD: EUR-per-USD = rsdPer(USD)/rsdPer(EUR) = 108/117
  const res = await fetchNbsRates("EUR", ["USD"], { fetchImpl: stub });
  assert.equal(res.rates[0].code, "USD");
  assert.ok(Math.abs(res.rates[0].rate - 108 / 117) < 1e-9);
});

test("fetchRates dispatches to NBS when provider is 'nbs'", async () => {
  let host = "";
  const stub = async (url: string) => {
    host = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ rates: [{ code: "EUR", exchange_middle: 117, parity: 1 }] }),
    };
  };
  const res = await fetchRates("RSD", ["EUR"], { provider: "nbs", fetchImpl: stub });
  assert.ok(host.includes("kurs.resenje.org"));
  assert.ok(Math.abs(res.rates[0].rate - 117) < 1e-9);
});

test("fetchRates defaults to the general currency-api provider", async () => {
  let host = "";
  const stub = async (url: string) => {
    host = url;
    return { ok: true, status: 200, json: async () => ({ rsd: { eur: 1 / 117 } }) };
  };
  await fetchRates("RSD", ["EUR"], { fetchImpl: stub });
  assert.ok(host.includes("currency-api"));
});

test("fxRateStale flags missing, undated and old rates", () => {
  assert.equal(fxRateStale(undefined), true);
  assert.equal(fxRateStale({ code: "EUR", rate: 117 }), true); // no updatedAt
  const fresh = { code: "EUR", rate: 117, updatedAt: new Date().toISOString() };
  assert.equal(fxRateStale(fresh), false);
  const old = {
    code: "EUR",
    rate: 117,
    updatedAt: new Date(Date.now() - 13 * 3600_000).toISOString(),
  };
  assert.equal(fxRateStale(old), true);
});

test("financeYears returns distinct years plus current, descending", () => {
  const s = baseState({
    transactions: [
      tx({ date: "2024-05-10" }),
      tx({ date: "2026-05-10" }),
    ],
  });
  const years = financeYears(s);
  assert.ok(years.includes(2024));
  assert.ok(years.includes(2026));
  assert.ok(years.includes(new Date().getFullYear()));
  // sorted descending
  for (let i = 1; i < years.length; i++) assert.ok(years[i - 1] > years[i]);
});
