import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  daysInMonth,
  makeKey,
  todayKey,
  weekdayOf,
  bestStreak,
  currentStreak,
  dayProgress,
  doneCountOnDate,
  habitMonthRatio,
  isDone,
  isScheduled,
  monthStats,
  scheduledCountOnDate,
} from "@habit/core";
import { actions, useAppState, useHabits } from "../lib/store";
import { C, pct } from "../lib/theme";
import { Card, Stat } from "../components/ui";
import { LineChart } from "../components/Charts";
import { HabitGlyph } from "../components/HabitGlyph";

const CELL = 30;
const ROW_H = 34;
const NAME_W = 120;

export function MonthScreen() {
  const state = useAppState();
  const habits = useHabits();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const chartW = Dimensions.get("window").width - 28 - 32;

  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month],
  );
  const stats = monthStats(state, habits, year, month);
  const today = todayKey();

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  const progressSeries = days.map((d) => dayProgress(state.entries, habits, makeKey(year, month, d)));
  const moodSeries = days.map((d) => {
    const m = state.mental[makeKey(year, month, d)];
    return m && (m.mood || m.motivation) ? m.mood / 100 : null;
  });
  const motivationSeries = days.map((d) => {
    const m = state.mental[makeKey(year, month, d)];
    return m && (m.mood || m.motivation) ? m.motivation / 100 : null;
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => shift(-1)}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable style={styles.navBtn} onPress={() => shift(1)}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat label="Habits" value={stats.habitCount} />
        <Stat label="Completed" value={stats.totalDone} color={C.accent} />
        <Stat label="Progress" value={pct(stats.progress)} color={C.accent2} />
      </View>

      {habits.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ color: C.dim }}>No habits yet — add some on the Habits tab.</Text>
        </Card>
      ) : (
        <Card style={{ padding: 10 }}>
          <View style={{ flexDirection: "row" }}>
            {/* Fixed name column */}
            <View>
              <View style={{ height: ROW_H, justifyContent: "flex-end" }}>
                <Text style={styles.colHead}>Habit</Text>
              </View>
              {habits.map((h) => (
                <View key={h.id} style={{ height: ROW_H, flexDirection: "row", alignItems: "center", width: NAME_W }}>
                  <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={16} />
                  <Text numberOfLines={1} style={{ color: C.text, fontSize: 12, marginLeft: 4, flex: 1 }}>{h.name}</Text>
                </View>
              ))}
              <View style={{ height: ROW_H - 8, justifyContent: "center" }}><Text style={styles.footLabel}>Done</Text></View>
              <View style={{ height: ROW_H - 8, justifyContent: "center" }}><Text style={styles.footLabel}>%</Text></View>
            </View>

            {/* Scrollable day grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={{ flexDirection: "row", height: ROW_H }}>
                  {days.map((day) => {
                    const key = makeKey(year, month, day);
                    const wd = weekdayOf(key);
                    const isT = key === today;
                    return (
                      <View key={day} style={{ width: CELL, alignItems: "center", justifyContent: "flex-end" }}>
                        <Text style={{ color: isT ? C.accent : C.faint, fontSize: 9 }}>{WEEKDAY_SHORT[wd]}</Text>
                        <Text style={{ color: isT ? C.accent : C.dim, fontSize: 11, fontWeight: isT ? "800" : "400" }}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
                {habits.map((h) => (
                  <View key={h.id} style={{ flexDirection: "row", height: ROW_H, alignItems: "center" }}>
                    {days.map((day) => {
                      const key = makeKey(year, month, day);
                      const done = isDone(state.entries, h.id, key);
                      const scheduled = isScheduled(h, key);
                      const future = key > today;
                      return (
                        <Pressable
                          key={day}
                          onPress={() => { if (!(future && !done)) actions.toggle(h.id, key); }}
                          style={{ width: CELL, alignItems: "center", justifyContent: "center" }}
                        >
                          <View
                            style={{
                              width: 26, height: 26, borderRadius: 7, borderWidth: 2,
                              borderColor: h.color, backgroundColor: done ? h.color : "transparent",
                              opacity: future && !done ? 0.2 : !scheduled && !done ? 0.3 : 1,
                              alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {done && (
                              <Svg width={13} height={13} viewBox="0 0 24 24">
                                <Path d="M5 13l4 4L19 7" stroke={C.bg} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </Svg>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                {/* footer: Done */}
                <View style={{ flexDirection: "row", height: ROW_H - 8, alignItems: "center" }}>
                  {days.map((day) => (
                    <Text key={day} style={[styles.footCell]}>
                      {doneCountOnDate(state.entries, habits, makeKey(year, month, day))}
                    </Text>
                  ))}
                </View>
                {/* footer: % */}
                <View style={{ flexDirection: "row", height: ROW_H - 8, alignItems: "center" }}>
                  {days.map((day) => {
                    const key = makeKey(year, month, day);
                    const sc = scheduledCountOnDate(habits, key);
                    const p = sc ? Math.round((doneCountOnDate(state.entries, habits, key) / sc) * 100) : 0;
                    return <Text key={day} style={[styles.footCell, { color: C.faint }]}>{p}</Text>;
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </Card>
      )}

      {habits.length > 0 && (
        <>
          <Card>
            <Text style={styles.cardTitle}>Daily progress</Text>
            <LineChart series={[{ color: C.accent, values: progressSeries, label: "Progress" }]} labels={days.map(String)} width={chartW} />
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Analysis</Text>
            {habits.map((h) => {
              const ratio = habitMonthRatio(state.entries, h, year, month);
              return (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 22, alignItems: "center" }}>
                    <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={18} />
                  </View>
                  <Text numberOfLines={1} style={{ color: C.text, width: 90, fontSize: 12 }}>{h.name}</Text>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.elev2, overflow: "hidden" }}>
                    <View style={{ height: 8, width: `${ratio * 100}%`, backgroundColor: h.color, borderRadius: 4 }} />
                  </View>
                  <Text style={{ color: C.dim, fontSize: 11, width: 44, textAlign: "right" }}>{pct(ratio)}</Text>
                  <Text style={{ color: C.faint, fontSize: 11, width: 34, textAlign: "right" }}>🔥{currentStreak(state.entries, h)}</Text>
                </View>
              );
            })}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Mental state</Text>
            {moodSeries.some((v) => v !== null) ? (
              <LineChart
                series={[
                  { color: "#60a5fa", values: moodSeries, label: "Mood" },
                  { color: C.accent, values: motivationSeries, label: "Motivation" },
                ]}
                labels={days.map(String)}
                width={chartW}
                area={false}
              />
            ) : (
              <Text style={{ color: C.dim, fontSize: 13 }}>No mood/motivation logged this month yet.</Text>
            )}
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Best streaks</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[...habits]
                .sort((a, b) => bestStreak(state.entries, b) - bestStreak(state.entries, a))
                .slice(0, 4)
                .map((h) => (
                  <View key={h.id} style={{ width: "47%", borderRadius: 12, backgroundColor: C.elev2, padding: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={15} />
                      <Text numberOfLines={1} style={{ color: C.text, fontSize: 13, flex: 1 }}>{h.name}</Text>
                    </View>
                    <Text style={{ color: h.color, fontSize: 18, fontWeight: "800" }}>
                      {bestStreak(state.entries, h)} <Text style={{ color: C.faint, fontSize: 11, fontWeight: "500" }}>best</Text>
                    </Text>
                  </View>
                ))}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, alignItems: "center", justifyContent: "center" },
  navArrow: { color: C.text, fontSize: 22, lineHeight: 24 },
  navTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
  colHead: { color: C.faint, fontSize: 11, fontWeight: "600" },
  footLabel: { color: C.faint, fontSize: 11 },
  footCell: { width: CELL, textAlign: "center", color: C.dim, fontSize: 11 },
  cardTitle: { color: C.text, fontWeight: "700", fontSize: 16, marginBottom: 6 },
});
