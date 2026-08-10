import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  MONTH_NAMES,
  WEEKDAY_LONG,
  addDays,
  fromKey,
  todayKey,
  currentStreak,
  dayProgress,
  isDoneOn,
  isMeasurable,
  amountOn,
  isScheduled,
  scheduledCountOnDate,
} from "@habit/core";
import type { Habit } from "@habit/core";
import { actions, useAppState, useHabits } from "../lib/store";
import { C } from "../lib/theme";
import { Card, ProgressRing } from "../components/ui";
import { HabitGlyph } from "../components/HabitGlyph";

export function TodayScreen() {
  const state = useAppState();
  const habits = useHabits();
  const [dateKey, setDateKey] = useState(todayKey());

  const d = fromKey(dateKey);
  const isToday = dateKey === todayKey();
  const scheduled = habits.filter((h) => isScheduled(h, dateKey));
  const progress = dayProgress(state.entries, habits, dateKey);
  const doneCount = scheduled.filter((h) => isDoneOn(h, state.entries, dateKey)).length;
  const total = scheduledCountOnDate(habits, dateKey);
  const mental = state.mental[dateKey] ?? { mood: 0, motivation: 0 };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => setDateKey(addDays(dateKey, -1))}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.navSub}>{WEEKDAY_LONG[d.getDay()].toUpperCase()}</Text>
          <Text style={styles.navTitle}>
            {isToday ? "Today" : `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`}
          </Text>
        </View>
        <Pressable
          style={[styles.navBtn, isToday && { opacity: 0.3 }]}
          disabled={isToday}
          onPress={() => setDateKey(addDays(dateKey, 1))}
        >
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ProgressRing value={progress} />
        <View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: "800" }}>
            {doneCount}
            <Text style={{ color: C.faint, fontSize: 18 }}> / {total}</Text>
          </Text>
          <Text style={{ color: C.dim, fontSize: 13 }}>habits done {isToday ? "today" : "this day"}</Text>
        </View>
      </Card>

      {scheduled.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Text style={{ fontSize: 28 }}>🌱</Text>
          <Text style={{ color: C.dim, marginTop: 8 }}>
            {habits.length === 0 ? "No habits yet — add some on the Habits tab." : "Nothing scheduled today."}
          </Text>
        </Card>
      ) : (
        scheduled.map((h) => {
          const done = isDoneOn(h, state.entries, dateKey);
          if (isMeasurable(h)) {
            return (
              <MeasurableRow
                key={h.id}
                habit={h}
                amount={amountOn(state.entries, h.id, dateKey)}
                done={done}
                onSet={(v) => actions.setAmount(h.id, dateKey, v)}
              />
            );
          }
          const streak = currentStreak(state.entries, h);
          return (
            <Pressable
              key={h.id}
              onPress={() => actions.toggle(h.id, dateKey)}
              style={[
                styles.row,
                done ? { backgroundColor: h.color + "1f", borderColor: "transparent" } : null,
              ]}
            >
              <View style={[styles.emojiBox, { backgroundColor: h.color + "22" }]}>
                <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "600", fontSize: 15 }}>{h.name}</Text>
                <Text style={{ color: C.dim, fontSize: 12 }}>
                  {h.type === "quit" ? "Avoid · " : ""}
                  {streak > 0 ? `🔥 ${streak} day${streak === 1 ? "" : "s"}` : "No streak yet"}
                </Text>
              </View>
              <View style={[styles.check, { borderColor: h.color, backgroundColor: done ? h.color : "transparent" }]}>
                {done && (
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M5 13l4 4L19 7" stroke={C.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                )}
              </View>
            </Pressable>
          );
        })
      )}

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Mental state</Text>
          <Text style={{ color: C.dim }}>Score {Math.round((mental.mood + mental.motivation) / 2)}%</Text>
        </View>
        <Stepper label="🙂 Mood" value={mental.mood} onChange={(v) => actions.setMental(dateKey, { mood: v })} />
        <Stepper label="⚡ Motivation" value={mental.motivation} onChange={(v) => actions.setMental(dateKey, { motivation: v })} />
      </Card>
    </ScrollView>
  );
}

function MeasurableRow({
  habit,
  amount,
  done,
  onSet,
}: {
  habit: Habit;
  amount: number;
  done: boolean;
  onSet: (amount: number) => void;
}) {
  const target = habit.target ?? 0;
  const unit = habit.unit ?? "";
  const step = target >= 50 ? Math.max(1, Math.round(target / 10)) : 1;
  const pct = target > 0 ? Math.min(100, (amount / target) * 100) : amount > 0 ? 100 : 0;

  return (
    <View
      style={[
        styles.row,
        { flexDirection: "column", alignItems: "stretch", gap: 10 },
        done ? { backgroundColor: habit.color + "1f", borderColor: "transparent" } : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.emojiBox, { backgroundColor: habit.color + "22" }]}>
          <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: "600", fontSize: 15 }}>{habit.name}</Text>
          <Text style={{ color: C.dim, fontSize: 12 }}>
            {amount}
            {target > 0 ? ` / ${target}` : ""} {unit}
            {done ? " ✓" : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable style={styles.stepBtn} onPress={() => onSet(Math.max(0, amount - step))}>
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={{ color: C.text, fontWeight: "700", minWidth: 28, textAlign: "center" }}>
            {amount}
          </Text>
          <Pressable style={styles.stepBtn} onPress={() => onSet(amount + step)}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
      {target > 0 && (
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: habit.color }]} />
        </View>
      )}
    </View>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: C.dim }}>{label}</Text>
        <Text style={{ color: C.text, fontWeight: "600" }}>{value}%</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value - 10))}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${value}%` }]} />
        </View>
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value + 10))}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, alignItems: "center", justifyContent: "center" },
  navArrow: { color: C.text, fontSize: 22, lineHeight: 24 },
  navSub: { color: C.faint, fontSize: 11, letterSpacing: 0.5 },
  navTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, padding: 12 },
  emojiBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  check: { width: 32, height: 32, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.text, fontWeight: "700", fontSize: 16 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  stepBtnText: { color: C.text, fontSize: 20, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.elev2, overflow: "hidden" },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: C.accent },
});
