// Pure view-models for the home screen widgets (no React / native code, so
// they are unit-testable). The widget components only render these.

import {
  currentStreak,
  formatAmount,
  groupByTimeOfDay,
  isDoneOn,
  isMeasurable,
  isScheduled,
  TIME_OF_DAY_ICON,
  TIME_OF_DAY_LABEL,
  type AppState,
  type Habit,
  type TimeOfDay,
} from "@habit/core";

export interface TodayRow {
  id: string;
  name: string;
  color: string;
  done: boolean;
  measurable: boolean;
  /** e.g. "15 min" or "12 / 20 pages" for measurable habits. */
  detail: string | null;
}

export interface TodaySection {
  timeOfDay: TimeOfDay;
  title: string;
  done: number;
  total: number;
  rows: TodayRow[];
}

export interface TodayModel {
  dateKey: string;
  done: number;
  total: number;
  sections: TodaySection[];
}

function activeHabits(state: AppState): Habit[] {
  return state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
}

export function todayModel(state: AppState, dateKey: string): TodayModel {
  const scheduled = activeHabits(state).filter((h) => isScheduled(h, dateKey));
  const sections = groupByTimeOfDay(scheduled).map((g) => {
    const rows: TodayRow[] = g.habits.map((h) => {
      const done = isDoneOn(h, state.entries, dateKey);
      let detail: string | null = null;
      if (isMeasurable(h)) {
        const v = state.entries[dateKey]?.[h.id];
        const amount = typeof v === "number" ? v : 0;
        const unit = h.unit ? ` ${h.unit}` : "";
        detail = h.target
          ? `${formatAmount(amount)} / ${formatAmount(h.target)}${unit}`
          : amount
            ? `${formatAmount(amount)}${unit}`
            : "log";
      }
      return { id: h.id, name: h.name, color: h.color, done, measurable: isMeasurable(h), detail };
    });
    return {
      timeOfDay: g.timeOfDay,
      title: `${TIME_OF_DAY_ICON[g.timeOfDay]} ${TIME_OF_DAY_LABEL[g.timeOfDay]}`,
      done: rows.filter((r) => r.done).length,
      total: rows.length,
      rows,
    };
  });
  const done = sections.reduce((a, s) => a + s.done, 0);
  const total = sections.reduce((a, s) => a + s.total, 0);
  return { dateKey, done, total, sections };
}

export interface ProgressModel {
  done: number;
  total: number;
  ratio: number;
  /** Best current streak among active habits, with its name. */
  streak: number;
  streakName: string | null;
  /** Next open section today, e.g. "🌙 Evening · 2 left". */
  next: string | null;
}

export function progressModel(state: AppState, dateKey: string): ProgressModel {
  const t = todayModel(state, dateKey);
  let streak = 0;
  let streakName: string | null = null;
  for (const h of activeHabits(state)) {
    const s = currentStreak(state.entries, h);
    if (s > streak) {
      streak = s;
      streakName = h.name;
    }
  }
  const open = t.sections.find((s) => s.done < s.total);
  return {
    done: t.done,
    total: t.total,
    ratio: t.total ? t.done / t.total : 0,
    streak,
    streakName,
    next: open ? `${open.title} · ${open.total - open.done} left` : t.total ? "All done 🎉" : null,
  };
}

/** SVG path string for a sparkline of `values` in a w×h box. */
export function sparklineSvg(values: number[], w: number, h: number, color: string): string {
  const pad = 4;
  if (values.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - lo) / span) * (h - 2 * pad);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const area =
    pts.length > 1
      ? `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z" fill="${color}" fill-opacity="0.18"/>`
      : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    area +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="${color}"/>` +
    `</svg>`
  );
}

/** SVG progress ring with the percentage in the middle. */
export function ringSvg(ratio: number, size: number, color: string, track: string, text: string): string {
  const stroke = Math.round(size * 0.1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, ratio)));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${Math.round(size * 0.24)}" fill="#eef2ff">${text}</text>` +
    `</svg>`
  );
}
