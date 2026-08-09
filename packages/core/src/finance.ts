// Finance domain: income sources, transactions, FX, goals and levels.
// Pure, platform-agnostic calculations shared by the web and mobile apps.
// All money is stored in each transaction's own currency and converted to the
// configured base currency (default RSD) on demand via `fxRates`.

// Kept local (rather than importing from ./date) so this module resolves
// cleanly under the extensionless-import test runner.
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** ISO-4217-ish currency code. Free-form so users can add custom ones. */
export type CurrencyCode = string;

/** A currency the app offers in its pickers. */
export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

/** Currencies supported in the pickers (base currency + source currencies). */
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "RSD", name: "Serbian dinar", symbol: "дин" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "GBP", name: "British pound", symbol: "£" },
  { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
];

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] =
  SUPPORTED_CURRENCIES.map((c) => c.code);

/** A transaction is either only invoiced (issued) or actually paid (received). */
export type TransactionStatus = "invoiced" | "paid";

/** Where money comes from (client, salary, freelance platform, …). */
export interface IncomeSource {
  id: string;
  name: string;
  color: string; // hex, used in charts/legend
  icon?: string; // built-in icon id (see icons.ts)
  emoji?: string; // fallback glyph when no built-in icon matches
  /** Default currency for new transactions on this source. */
  currency: CurrencyCode;
  archived: boolean;
  order: number;
  createdAt: string; // ISO
}

export interface Transaction {
  id: string;
  sourceId: string;
  date: string; // YYYY-MM-DD (local)
  amount: number; // in `currency`, always positive (income)
  currency: CurrencyCode;
  status: TransactionStatus;
  note?: string;
  createdAt: string; // ISO
  /**
   * Base-currency units per 1 unit of `currency`, locked at the transaction's
   * date. When set it takes precedence over the live rate, so a past payment
   * keeps the exchange rate that applied on the day it was received.
   */
  fxRate?: number;
  /** The date the locked `fxRate` was taken for (usually equals `date`). */
  fxRateDate?: string;
}

/** FX rate: how many base-currency units one unit of `code` is worth. */
export interface FxRate {
  code: CurrencyCode;
  /** Units of base currency per 1 unit of `code`. Base currency = 1. */
  rate: number;
  /** ISO timestamp of the last update (set when fetched or edited). */
  updatedAt?: string;
  /** True when the user typed the rate by hand (skipped by auto-refresh). */
  manual?: boolean;
}

/**
 * Where exchange rates come from:
 * - "general": free global currency-api (works for any base currency).
 * - "nbs": National Bank of Serbia official middle rates (RSD-based; other
 *   bases are cross-computed through RSD).
 */
export type FxProvider = "general" | "nbs";

/** Whether the yearly goal is something to reach or a ceiling not to exceed. */
export type GoalDirection = "reach" | "not_exceed";

export interface GoalConfig {
  /** Yearly target in base currency. */
  target: number;
  direction: GoalDirection;
  /**
   * Optional per-month weights (length 12) describing how the yearly target is
   * expected to be distributed. When omitted the target is spread evenly.
   * Weights are relative; they are normalised on use.
   */
  distribution?: number[];
}

/** A named level unlocked once the reference amount reaches `min` (base). */
export interface LevelTier {
  name: string;
  min: number; // base-currency threshold, inclusive
}

export interface FinanceState {
  version: number;
  baseCurrency: CurrencyCode;
  sources: IncomeSource[];
  transactions: Transaction[];
  /** Manual FX rates for non-base currencies (base is implicitly 1). */
  fxRates: FxRate[];
  goal: GoalConfig;
  /** Level tiers ordered by ascending `min` (validated on read). */
  levels: LevelTier[];
  /** Exchange-rate source (defaults to "general" when absent). */
  fxProvider?: FxProvider;
}

export const FINANCE_VERSION = 1;

/** Neutral, non-judgemental default level names. */
export const DEFAULT_LEVELS: LevelTier[] = [
  { name: "Starter", min: 0 },
  { name: "Builder", min: 100_000 },
  { name: "Momentum", min: 300_000 },
  { name: "Established", min: 600_000 },
  { name: "Thriving", min: 1_000_000 },
];

export function emptyFinanceState(baseCurrency: CurrencyCode = "RSD"): FinanceState {
  return {
    version: FINANCE_VERSION,
    baseCurrency,
    sources: [],
    transactions: [],
    fxRates: [],
    goal: { target: 0, direction: "reach" },
    levels: DEFAULT_LEVELS,
    fxProvider: "general",
  };
}

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

/** Look up the rate for a currency (base = 1, unknown = 1 as a safe fallback). */
export function rateFor(state: FinanceState, code: CurrencyCode): number {
  if (code === state.baseCurrency) return 1;
  const found = state.fxRates.find((r) => r.code === code);
  return found ? found.rate : 1;
}

/** Convert an amount in `code` to the base currency. */
export function toBase(state: FinanceState, amount: number, code: CurrencyCode): number {
  return amount * rateFor(state, code);
}

/**
 * Amount of a single transaction expressed in the base currency. Prefers the
 * rate locked on the transaction (historical, from its date); otherwise falls
 * back to the current live/manual rate.
 */
export function txBase(state: FinanceState, tx: Transaction): number {
  if (tx.currency === state.baseCurrency) return tx.amount;
  if (typeof tx.fxRate === "number" && tx.fxRate > 0) return tx.amount * tx.fxRate;
  return toBase(state, tx.amount, tx.currency);
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------

/** Year (number) of a transaction from its YYYY-MM-DD date. */
function txYear(tx: Transaction): number {
  return Number(tx.date.slice(0, 4));
}

/** Month index 0..11 of a transaction from its YYYY-MM-DD date. */
function txMonth(tx: Transaction): number {
  return Number(tx.date.slice(5, 7)) - 1;
}

/**
 * "paid" transactions always count toward income. "invoiced" ones only count
 * when `includeInvoiced` is true (i.e. the "expected/pipeline" view).
 */
function countsForStatus(tx: Transaction, includeInvoiced: boolean): boolean {
  return tx.status === "paid" || includeInvoiced;
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

/**
 * Base-currency totals for each of the 12 months of a year.
 * `includeInvoiced` toggles between "paid only" and "paid + invoiced".
 */
export function monthTotals(
  state: FinanceState,
  year: number,
  includeInvoiced = false,
): number[] {
  const out = new Array(12).fill(0);
  for (const tx of state.transactions) {
    if (txYear(tx) !== year) continue;
    if (!countsForStatus(tx, includeInvoiced)) continue;
    out[txMonth(tx)] += txBase(state, tx);
  }
  return out;
}

/** Total base-currency income for a year. */
export function yearTotal(
  state: FinanceState,
  year: number,
  includeInvoiced = false,
): number {
  let sum = 0;
  for (const tx of state.transactions) {
    if (txYear(tx) !== year) continue;
    if (!countsForStatus(tx, includeInvoiced)) continue;
    sum += txBase(state, tx);
  }
  return sum;
}

/** Base-currency total per source for a year, sorted by amount descending. */
export interface SourceSlice {
  sourceId: string;
  name: string;
  color: string;
  total: number;
  share: number; // 0..1 of the year total
}

export function sourceDistribution(
  state: FinanceState,
  year: number,
  includeInvoiced = false,
): SourceSlice[] {
  const byId = new Map<string, number>();
  for (const tx of state.transactions) {
    if (txYear(tx) !== year) continue;
    if (!countsForStatus(tx, includeInvoiced)) continue;
    byId.set(tx.sourceId, (byId.get(tx.sourceId) ?? 0) + txBase(state, tx));
  }
  const total = Array.from(byId.values()).reduce((a, b) => a + b, 0);
  const slices: SourceSlice[] = [];
  for (const src of state.sources) {
    const amount = byId.get(src.id) ?? 0;
    if (amount === 0) continue;
    slices.push({
      sourceId: src.id,
      name: src.name,
      color: src.color,
      total: amount,
      share: total ? amount / total : 0,
    });
  }
  return slices.sort((a, b) => b.total - a.total);
}

/** Month (0..11) with the highest base-currency total, or null if no income. */
export interface BestMonth {
  month: number;
  label: string;
  total: number;
}

export function bestMonth(
  state: FinanceState,
  year: number,
  includeInvoiced = false,
): BestMonth | null {
  const totals = monthTotals(state, year, includeInvoiced);
  let bi = -1;
  let bv = 0;
  for (let m = 0; m < 12; m++) {
    if (totals[m] > bv) {
      bv = totals[m];
      bi = m;
    }
  }
  if (bi < 0) return null;
  return { month: bi, label: MONTH_SHORT[bi], total: bv };
}

// ---------------------------------------------------------------------------
// Goal, pace and projection
// ---------------------------------------------------------------------------

/** Normalise a distribution to fractions that sum to 1 (even if omitted). */
export function normalizedDistribution(goal: GoalConfig): number[] {
  const raw =
    goal.distribution && goal.distribution.length === 12
      ? goal.distribution.slice()
      : new Array(12).fill(1);
  const sum = raw.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return new Array(12).fill(1 / 12);
  return raw.map((w) => Math.max(0, w) / sum);
}

/**
 * How much of the yearly target should have been earned by the end of a given
 * month (0-based, inclusive), following the goal's distribution.
 */
export function expectedToDate(goal: GoalConfig, throughMonth: number): number {
  const dist = normalizedDistribution(goal);
  let frac = 0;
  for (let m = 0; m <= throughMonth && m < 12; m++) frac += dist[m];
  return goal.target * frac;
}

/** Progress toward the yearly target as a fraction (0..1+, can exceed 1). */
export function progress(state: FinanceState, year: number, includeInvoiced = false): number {
  if (state.goal.target <= 0) return 0;
  return yearTotal(state, year, includeInvoiced) / state.goal.target;
}

/**
 * Run-rate projection for a year, based on months that have already elapsed.
 * For the current year it uses months up to and including the reference month;
 * for a fully past year it just returns the actual total.
 */
export interface Projection {
  earned: number; // actual base-currency total so far
  monthsElapsed: number; // count of months contributing to the run rate
  perMonth: number; // average per elapsed month
  projected: number; // extrapolated full-year total
  expected: number; // target expected-to-date for `throughMonth`
  onPace: boolean; // earned >= expected (for "reach"); earned <= expected ("not_exceed")
}

/**
 * @param refMonth 0-based month to treat as "now" (defaults to December → whole year).
 */
export function projection(
  state: FinanceState,
  year: number,
  refMonth = 11,
  includeInvoiced = false,
): Projection {
  const clampedRef = Math.max(0, Math.min(11, refMonth));
  const totals = monthTotals(state, year, includeInvoiced);
  let earned = 0;
  for (let m = 0; m <= clampedRef; m++) earned += totals[m];
  const monthsElapsed = clampedRef + 1;
  const perMonth = monthsElapsed ? earned / monthsElapsed : 0;
  const projected = perMonth * 12;
  const expected = expectedToDate(state.goal, clampedRef);
  const onPace =
    state.goal.direction === "not_exceed" ? earned <= expected : earned >= expected;
  return { earned, monthsElapsed, perMonth, projected, expected, onPace };
}

/**
 * Count of months whose actual total met the per-month expectation from the
 * distribution (for "not_exceed" goals, months that stayed at or below it).
 */
export function monthsOnTarget(
  state: FinanceState,
  year: number,
  includeInvoiced = false,
): number {
  const totals = monthTotals(state, year, includeInvoiced);
  const dist = normalizedDistribution(state.goal);
  let n = 0;
  for (let m = 0; m < 12; m++) {
    const expected = state.goal.target * dist[m];
    if (expected <= 0) continue;
    const ok =
      state.goal.direction === "not_exceed"
        ? totals[m] <= expected
        : totals[m] >= expected;
    if (ok) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/** Levels sorted ascending by threshold (defensive copy). */
function sortedLevels(levels: LevelTier[]): LevelTier[] {
  return levels.slice().sort((a, b) => a.min - b.min);
}

/** The highest level tier whose threshold `amount` (base currency) has reached. */
export function levelForAmount(levels: LevelTier[], amount: number): LevelTier | null {
  const sorted = sortedLevels(levels);
  let current: LevelTier | null = null;
  for (const tier of sorted) {
    if (amount >= tier.min) current = tier;
    else break;
  }
  return current;
}

/** The next level up from `amount`, or null when already at the top. */
export function nextLevel(levels: LevelTier[], amount: number): LevelTier | null {
  const sorted = sortedLevels(levels);
  for (const tier of sorted) {
    if (amount < tier.min) return tier;
  }
  return null;
}

/**
 * Average base-currency income over the last `months` calendar months ending at
 * (and including) the reference year/month. Used as a stable basis for levels
 * so a single big invoice doesn't jump the level around.
 */
export function trailingAverage(
  state: FinanceState,
  year: number,
  refMonth: number,
  months = 3,
  includeInvoiced = false,
): number {
  const buckets = new Map<string, number>();
  for (const tx of state.transactions) {
    if (!countsForStatus(tx, includeInvoiced)) continue;
    buckets.set(tx.date.slice(0, 7), (buckets.get(tx.date.slice(0, 7)) ?? 0) + txBase(state, tx));
  }
  let sum = 0;
  const cursor = new Date(year, refMonth, 1);
  for (let i = 0; i < months; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    sum += buckets.get(key) ?? 0;
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return months ? sum / months : 0;
}

/** Level based on the trailing 3-month average (smoother than a single month). */
export function currentLevel(
  state: FinanceState,
  year: number,
  refMonth: number,
  includeInvoiced = false,
): LevelTier | null {
  const avg = trailingAverage(state, year, refMonth, 3, includeInvoiced);
  return levelForAmount(state.levels, avg);
}

// ---------------------------------------------------------------------------
// KPI bundle
// ---------------------------------------------------------------------------

export interface FinanceKpis {
  year: number;
  baseCurrency: CurrencyCode;
  paidTotal: number; // paid only
  invoicedTotal: number; // paid + invoiced (pipeline)
  target: number;
  progress: number; // paid / target (0..1+)
  progressInvoiced: number; // (paid + invoiced) / target
  expectedToDate: number;
  projection: Projection;
  monthsOnTarget: number;
  best: BestMonth | null;
  level: LevelTier | null;
  next: LevelTier | null;
  trailingAvg: number; // trailing 3-month average (paid)
}

/**
 * One call that produces everything a dashboard needs.
 * @param refMonth 0-based "current" month for pace/projection (defaults to Dec).
 */
export function financeKpis(
  state: FinanceState,
  year: number,
  refMonth = 11,
): FinanceKpis {
  const paidTotal = yearTotal(state, year, false);
  const invoicedTotal = yearTotal(state, year, true);
  const clampedRef = Math.max(0, Math.min(11, refMonth));
  const trailingAvg = trailingAverage(state, year, clampedRef, 3, false);
  return {
    year,
    baseCurrency: state.baseCurrency,
    paidTotal,
    invoicedTotal,
    target: state.goal.target,
    progress: progress(state, year, false),
    progressInvoiced: progress(state, year, true),
    expectedToDate: expectedToDate(state.goal, clampedRef),
    projection: projection(state, year, clampedRef, false),
    monthsOnTarget: monthsOnTarget(state, year, false),
    best: bestMonth(state, year, false),
    level: levelForAmount(state.levels, trailingAvg),
    next: nextLevel(state.levels, trailingAvg),
    trailingAvg,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

let seq = 0;
export function newFinanceId(prefix = "tx"): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Distinct years present in the transactions, plus the current year, desc. */
export function financeYears(state: FinanceState): number[] {
  const years = new Set<number>();
  years.add(new Date().getFullYear());
  for (const tx of state.transactions) years.add(txYear(tx));
  return Array.from(years).sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Live FX rates
// ---------------------------------------------------------------------------

/** A single fetched quote: `rate` base-currency units per 1 unit of `code`. */
export interface FxQuote {
  code: CurrencyCode;
  rate: number;
}

export interface FxFetchResult {
  base: CurrencyCode;
  /** Provider's rate date (YYYY-MM-DD), or "" when unknown. */
  date: string;
  /** When we fetched it (ISO). */
  fetchedAt: string;
  rates: FxQuote[];
}

/**
 * Public endpoints for the free, keyless, CORS-enabled currency-api
 * (@fawazahmed0/currency-api). Tried in order; the CDN is primary and the
 * pages.dev host is a fallback. `{base}` is the lowercased base currency.
 * Pass a `YYYY-MM-DD` date for historical rates; omit for the latest rates.
 */
export function fxEndpoints(base: CurrencyCode, date?: string): string[] {
  const b = base.toLowerCase();
  const version = date && date.length === 10 ? date : "latest";
  const host = version === "latest" ? "latest" : version;
  return [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${b}.json`,
    `https://${host}.currency-api.pages.dev/v1/currencies/${b}.json`,
  ];
}

/** Local YYYY-MM-DD (kept here to avoid a cross-module import). */
function localToday(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Parse a currency-api response into base-per-code quotes for the requested
 * codes. The provider returns `{ [base]: { [code]: codePerBase } }`, so we
 * invert to get base-per-code. Pure and unit-testable (no network).
 */
export function parseFxResponse(
  base: CurrencyCode,
  codes: CurrencyCode[],
  data: unknown,
): FxQuote[] {
  const obj = (data ?? {}) as Record<string, unknown>;
  const table = obj[base.toLowerCase()] as Record<string, number> | undefined;
  if (!table || typeof table !== "object") return [];
  const out: FxQuote[] = [];
  for (const code of codes) {
    if (code === base) continue;
    const codePerBase = table[code.toLowerCase()];
    if (typeof codePerBase === "number" && codePerBase > 0) {
      out.push({ code, rate: 1 / codePerBase });
    }
  }
  return out;
}

/** Minimal structural type so core needs no DOM lib for `fetch`. */
type FetchLike = (
  url: string,
  init?: { signal?: unknown },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Fetch live base-per-code FX rates for the given currencies. Runs on the
 * user's device (browser / React Native), where `fetch` is a global; a custom
 * implementation can be injected for tests. Tries each endpoint until one
 * yields the base table. Throws if all endpoints fail.
 */
export async function fetchFxRates(
  base: CurrencyCode,
  codes: CurrencyCode[],
  opts: { signal?: unknown; fetchImpl?: FetchLike; date?: string } = {},
): Promise<FxFetchResult> {
  const wanted = Array.from(new Set(codes.filter((c) => c && c !== base)));
  if (wanted.length === 0) {
    return { base, date: "", fetchedAt: new Date().toISOString(), rates: [] };
  }
  const f =
    opts.fetchImpl ??
    (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (!f) throw new Error("No fetch implementation available");

  let lastErr: unknown = null;
  for (const url of fxEndpoints(base, opts.date)) {
    try {
      const res = await f(url, { signal: opts.signal });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as Record<string, unknown>;
      const rates = parseFxResponse(base, wanted, data);
      if (rates.length > 0) {
        const date = typeof data.date === "string" ? data.date : "";
        return { base, date, fetchedAt: new Date().toISOString(), rates };
      }
      lastErr = new Error("No matching rates in response");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("FX fetch failed");
}

// ---------------------------------------------------------------------------
// NBS (National Bank of Serbia) official rates
// ---------------------------------------------------------------------------

/**
 * Public NBS middle-rate endpoint (kurs.resenje.org, a free, keyless,
 * CORS-enabled mirror of the official rates). `today` for the latest list,
 * or a `YYYY-MM-DD` date for a historical list.
 */
export function nbsEndpoints(date?: string): string[] {
  const d = date && date.length === 10 ? date : "today";
  return [`https://kurs.resenje.org/api/v1/rates/${d}`];
}

/**
 * Parse an NBS rates list into RSD-per-unit values for the requested codes.
 * The list quotes `exchange_middle` for a `parity` (e.g. 100 for some
 * currencies), so per-unit = exchange_middle / parity. Pure and testable.
 */
export function parseNbsResponse(
  codes: CurrencyCode[],
  data: unknown,
): Array<{ code: CurrencyCode; rsdPer: number }> {
  const obj = (data ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.rates) ? (obj.rates as Record<string, unknown>[]) : [];
  const want = new Set(codes.map((c) => c.toUpperCase()));
  const out: Array<{ code: CurrencyCode; rsdPer: number }> = [];
  for (const row of list) {
    const code = String(row.code ?? "").toUpperCase();
    if (!want.has(code)) continue;
    const mid = Number(row.exchange_middle);
    const parity = Number(row.parity) || 1;
    if (mid > 0) out.push({ code, rsdPer: mid / parity });
  }
  return out;
}

/**
 * Fetch base-per-code rates from NBS. NBS quotes RSD per foreign unit, so a
 * non-RSD base is cross-computed: base-per-code = rsdPer(code) / rsdPer(base).
 */
export async function fetchNbsRates(
  base: CurrencyCode,
  codes: CurrencyCode[],
  opts: { signal?: unknown; fetchImpl?: FetchLike; date?: string } = {},
): Promise<FxFetchResult> {
  const wanted = Array.from(new Set(codes.filter((c) => c && c !== base)));
  if (wanted.length === 0) {
    return { base, date: "", fetchedAt: new Date().toISOString(), rates: [] };
  }
  const f =
    opts.fetchImpl ?? (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (!f) throw new Error("No fetch implementation available");

  const need = new Set(wanted.map((c) => c.toUpperCase()));
  const baseUp = base.toUpperCase();
  if (baseUp !== "RSD") need.add(baseUp);

  let lastErr: unknown = null;
  for (const url of nbsEndpoints(opts.date)) {
    try {
      const res = await f(url, { signal: opts.signal });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as Record<string, unknown>;
      const parsed = parseNbsResponse(Array.from(need), data);
      const map = new Map(parsed.map((r) => [r.code, r.rsdPer]));
      map.set("RSD", 1);

      const baseRsd = map.get(baseUp);
      if (baseUp !== "RSD" && !baseRsd) {
        lastErr = new Error("base currency not in NBS list");
        continue;
      }
      const rates: FxQuote[] = [];
      for (const code of wanted) {
        const codeRsd = map.get(code.toUpperCase());
        if (!codeRsd) continue;
        const basePer = baseUp === "RSD" ? codeRsd : codeRsd / (baseRsd as number);
        if (basePer > 0) rates.push({ code, rate: basePer });
      }
      if (rates.length > 0) {
        const date = typeof data.date === "string" ? data.date : "";
        return { base, date, fetchedAt: new Date().toISOString(), rates };
      }
      lastErr = new Error("No matching NBS rates in response");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("NBS fetch failed");
}

// ---------------------------------------------------------------------------
// Unified fetch (provider dispatch)
// ---------------------------------------------------------------------------

/** Fetch base-per-code rates from the chosen provider (default "general"). */
export function fetchRates(
  base: CurrencyCode,
  codes: CurrencyCode[],
  opts: {
    signal?: unknown;
    fetchImpl?: FetchLike;
    date?: string;
    provider?: FxProvider;
  } = {},
): Promise<FxFetchResult> {
  if (opts.provider === "nbs") return fetchNbsRates(base, codes, opts);
  return fetchFxRates(base, codes, opts);
}

/**
 * Fetch the base-per-`code` rate for a specific `date` (the day of a payment),
 * returning null if unavailable. Today/future dates fall back to latest rates,
 * since providers only publish a given day's rates afterwards.
 */
export async function fetchFxRateOn(
  base: CurrencyCode,
  code: CurrencyCode,
  date: string,
  opts: { signal?: unknown; fetchImpl?: FetchLike; provider?: FxProvider } = {},
): Promise<number | null> {
  if (code === base) return 1;
  const useDate = date && date < localToday() ? date : undefined;
  try {
    const res = await fetchRates(base, [code], { ...opts, date: useDate });
    const q = res.rates.find((r) => r.code === code);
    return q ? q.rate : null;
  } catch {
    // Historical date may not exist that far back; fall back to latest rates.
    if (useDate) {
      try {
        const res = await fetchRates(base, [code], {
          signal: opts.signal,
          fetchImpl: opts.fetchImpl,
          provider: opts.provider,
        });
        const q = res.rates.find((r) => r.code === code);
        return q ? q.rate : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** True when a rate is missing or older than `maxAgeHours` (default 12h). */
export function fxRateStale(rate: FxRate | undefined, maxAgeHours = 12): boolean {
  if (!rate || !rate.updatedAt) return true;
  const age = Date.now() - new Date(rate.updatedAt).getTime();
  return !(age >= 0) || age > maxAgeHours * 3600_000;
}
