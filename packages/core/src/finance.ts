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
}

/** Manual FX rate: how many base-currency units one unit of `code` is worth. */
export interface FxRate {
  code: CurrencyCode;
  /** Units of base currency per 1 unit of `code`. Base currency = 1. */
  rate: number;
}

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

/** Amount of a single transaction expressed in the base currency. */
export function txBase(state: FinanceState, tx: Transaction): number {
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
