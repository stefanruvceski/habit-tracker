// Date helpers. All keys are local-date based (YYYY-MM-DD) to avoid timezone drift.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** Pad a number to 2 digits. */
function p2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Build a YYYY-MM-DD key from a Date (local). */
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Build a key from year, month (0-based), day. */
export function makeKey(year: number, month: number, day: number): string {
  return `${year}-${p2(month + 1)}-${p2(day)}`;
}

/** Parse a YYYY-MM-DD key to a local Date at midnight. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Sunday .. 6 = Saturday for the first day of the month. */
export function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** All date keys in a month, in order. */
export function monthKeys(year: number, month: number): string[] {
  const n = daysInMonth(year, month);
  const out: string[] = [];
  for (let d = 1; d <= n; d++) out.push(makeKey(year, month, d));
  return out;
}

/** Add days to a key and return a new key. */
export function addDays(key: string, delta: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

export function weekdayOf(key: string): number {
  return fromKey(key).getDay();
}

/** ISO week number (1..53) used to group days into weeks. */
export function weekOfMonth(year: number, month: number, day: number): number {
  const first = firstWeekday(year, month);
  return Math.floor((day - 1 + first) / 7) + 1;
}
