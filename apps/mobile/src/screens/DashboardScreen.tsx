import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { MONTH_NAMES, MONTH_SHORT, availableYears, yearSummary } from "@habit/core";
import { useAppState, useHabits } from "../lib/store";
import { C, pct } from "../lib/theme";
import { Card } from "../components/ui";
import { LineChart } from "../components/Charts";

export function DashboardScreen() {
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
});
