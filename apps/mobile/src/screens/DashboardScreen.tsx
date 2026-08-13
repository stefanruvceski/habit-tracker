import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import {
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_LONG,
  availableYears,
  yearSummary,
  financeKpis,
  isMeasurable,
  periodAmount,
  monthKeys,
  bestWeekday,
  consistencyRanking,
  moodHabitLink,
} from "@habit/core";
import type { Habit, Entries, Mental } from "@habit/core";
import { useAppState, useHabits } from "../lib/store";
import { useFinanceState, useFinanceHydrated } from "../lib/financeStore";
import { C, pct } from "../lib/theme";
import { Card, ProgressRing } from "../components/ui";
import { LineChart } from "../components/Charts";
import { HabitGlyph } from "../components/HabitGlyph";

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

export function DashboardScreen({ onOpenFinance }: { onOpenFinance?: () => void }) {
  const state = useAppState();
  const habits = useHabits();
  const [year, setYear] = useState(new Date().getFullYear());
  const chartW = Dimensions.get("window").width - 28 - 32;

  const summary = useMemo(() => yearSummary(state, habits, year), [state, habits, year]);
  const years = availableYears(state);
  const bestMonth = summary.reduce((b, m) => (m.progress > b.progress ? m : b), summary[0]);
  const activeMonths = summary.filter((m) => m.completed > 0).length;
  const yearAvg = activeMonths
    ? summary.filter((m) => m.completed > 0).reduce((s, m) => s + m.progress, 0) / activeMonths
    : 0;

  const yi = years.indexOf(year);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Text style={styles.title}>Yearly dashboard</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            style={styles.yBtn}
            onPress={() => setYear(years[Math.min(years.length - 1, yi + 1)] ?? year - 1)}
          >
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{year}</Text>
          <Pressable
            style={styles.yBtn}
            onPress={() => setYear(years[Math.max(0, yi - 1)] ?? year + 1)}
          >
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Mini label="Avg progress" value={pct(yearAvg)} color={C.accent} />
        <Mini label="Best month" value={bestMonth.completed > 0 ? MONTH_SHORT[bestMonth.month] : "—"} color={C.accent2} />
        <Mini label="Active" value={`${activeMonths}/12`} />
      </View>

      <Insights entries={state.entries} habits={habits} mental={state.mental} />

      <FinanceGlance year={year} onOpen={onOpenFinance} />

      <MeasurableTotals year={year} habits={habits} entries={state.entries} />

      <Card>
        <LineChart
          series={[
            { color: C.accent, values: summary.map((m) => (m.completed > 0 ? m.progress : null)), label: "Progress" },
            { color: C.accent2, values: summary.map((m) => (m.mindset > 0 ? m.mindset / 100 : null)), label: "Mindset" },
          ]}
          labels={MONTH_SHORT}
          width={chartW}
          height={200}
        />
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {summary.map((m) => (
          <Card key={m.month} style={{ width: "47.5%", padding: 12 }}>
            <Text style={{ color: C.text, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
              {MONTH_NAMES[m.month]}
            </Text>
            <Row label="Habits" value={String(m.habitCount)} />
            <Row label="Completed" value={String(m.completed)} />
            <Bar label="Progress" value={m.progress} color={C.accent} />
            <Bar label="Mindset" value={m.mindset / 100} color={C.accent2} />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const INSIGHT_WINDOW = 30;

/** Narrative insights from the last 30 days (mirrors the web Insights card). */
function Insights({
  entries,
  habits,
  mental,
}: {
  entries: Entries;
  habits: Habit[];
  mental: Mental;
}) {
  const items = useMemo(() => {
    const out: { icon: string; text: string }[] = [];

    const best = bestWeekday(entries, habits, INSIGHT_WINDOW);
    if (best && best.progress > 0) {
      out.push({
        icon: "📅",
        text: `${WEEKDAY_LONG[best.weekday]} is your strongest day — ${Math.round(best.progress * 100)}% on average.`,
      });
    }

    const ranking = consistencyRanking(entries, habits, INSIGHT_WINDOW);
    if (ranking.length > 0) {
      const top = ranking[0];
      out.push({
        icon: "🏆",
        text: `Most consistent: ${top.habit.name} — ${Math.round(top.rate * 100)}% of scheduled days.`,
      });
      const weakest = ranking[ranking.length - 1];
      if (ranking.length > 1 && weakest.rate < 0.5 && weakest.rate < top.rate) {
        out.push({
          icon: "🌱",
          text: `Needs attention: ${weakest.habit.name} — only ${Math.round(weakest.rate * 100)}% lately.`,
        });
      }
    }

    const link = moodHabitLink(entries, habits, mental, INSIGHT_WINDOW);
    if (link && Math.abs(link.delta) >= 3) {
      out.push(
        link.delta > 0
          ? {
              icon: "😊",
              text: `On days you complete more habits, your mood averages ${Math.round(link.delta)} pts higher.`,
            }
          : {
              icon: "🤔",
              text: "Your mood isn't higher on high-completion days lately.",
            },
      );
    }

    return out;
  }, [entries, habits, mental]);

  if (items.length === 0) return null;

  return (
    <Card>
      <Text style={{ color: C.dim, fontSize: 13, fontWeight: "700", marginBottom: 10 }}>
        Insights · last 30 days
      </Text>
      {items.map((it, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 }}
        >
          <Text style={{ fontSize: 16 }}>{it.icon}</Text>
          <Text style={{ color: C.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
            {it.text}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const AGG_LABEL: Record<string, string> = {
  sum: "total",
  avg: "avg/day",
  max: "best day",
  last: "latest",
};

function fmtNum(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function MeasurableTotals({
  year,
  habits,
  entries,
}: {
  year: number;
  habits: Habit[];
  entries: Entries;
}) {
  const measurable = habits.filter(isMeasurable);
  const yearKeys = useMemo(() => {
    const keys: string[] = [];
    for (let m = 0; m < 12; m++) keys.push(...monthKeys(year, m));
    return keys;
  }, [year]);

  if (measurable.length === 0) return null;

  return (
    <Card>
      <Text style={{ color: C.dim, fontSize: 13, fontWeight: "700", marginBottom: 10 }}>
        Measured this year
      </Text>
      {measurable.map((h) => {
        const agg = h.aggregation ?? "sum";
        const value = periodAmount(entries, h, yearKeys);
        const daysLogged = yearKeys.filter(
          (k) => typeof entries[k]?.[h.id] === "number",
        ).length;
        return (
          <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 5 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: h.color + "22", alignItems: "center", justifyContent: "center" }}>
              <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 14 }} numberOfLines={1}>{h.name}</Text>
              <Text style={{ color: C.faint, fontSize: 11 }}>
                {AGG_LABEL[agg]} · {daysLogged} day{daysLogged === 1 ? "" : "s"} logged
              </Text>
            </View>
            <Text style={{ color: h.color, fontSize: 18, fontWeight: "800" }}>
              {fmtNum(value)}
              {h.unit ? <Text style={{ color: C.dim, fontSize: 12, fontWeight: "400" }}> {h.unit}</Text> : null}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function FinanceGlance({ year, onOpen }: { year: number; onOpen?: () => void }) {
  const hydrated = useFinanceHydrated();
  const state = useFinanceState();
  const now = new Date();
  const refMonth = year === now.getFullYear() ? now.getMonth() : 11;
  const kpis = useMemo(
    () => financeKpis(state, year, refMonth),
    [state, year, refMonth],
  );

  if (!hydrated) return null;

  const base = state.baseCurrency;
  const hasData = kpis.paidTotal > 0 || kpis.invoicedTotal > 0 || state.goal.target > 0;

  if (!hasData) {
    return (
      <Pressable onPress={onOpen} style={styles.financeEmpty}>
        <Text style={{ color: C.dim, fontSize: 13 }}>💸 Track your income too →</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpen}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: C.dim, fontSize: 13, fontWeight: "700" }}>Finance</Text>
          <Text style={{ color: C.faint, fontSize: 12 }}>View →</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {state.goal.target > 0 && (
            <ProgressRing value={kpis.progress} size={68} stroke={8} label={pct(kpis.progress)} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.faint, fontSize: 10, letterSpacing: 0.5 }}>
              RECEIVED {year}
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
              {fmtMoney(kpis.paidTotal, base)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
              {state.goal.target > 0 && (
                <Text style={{ color: C.dim, fontSize: 12 }}>Goal {fmtMoney(state.goal.target, base)}</Text>
              )}
              {kpis.level && <Text style={{ color: C.dim, fontSize: 12 }}>Level {kpis.level.name}</Text>}
              {kpis.best && <Text style={{ color: C.dim, fontSize: 12 }}>Best {kpis.best.label}</Text>}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function Mini({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ color: C.faint, fontSize: 10, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 17, fontWeight: "800", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 }}>
      <Text style={{ color: C.dim, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: C.dim, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>{pct(value)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.elev2, overflow: "hidden" }}>
        <View style={{ height: 6, width: `${Math.min(100, value * 100)}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: C.text, fontSize: 22, fontWeight: "800" },
  yBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, alignItems: "center", justifyContent: "center" },
  navArrow: { color: C.text, fontSize: 18 },
  financeEmpty: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    backgroundColor: C.elev,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
