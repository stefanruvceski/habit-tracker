import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  MONTH_NAMES,
  WEEKDAY_LONG,
  addDays,
  fromKey,
  todayKey,
  currentStreak,
  combinedDayCounts,
  combinedDayProgress,
  isDone,
  isScheduled,
  todosForDate,
  overdueTodos,
} from "@habit/core";
import { actions, useAppState, useHabits } from "../lib/store";
import { C } from "../lib/theme";
import { Card, ProgressRing } from "../components/ui";
import { HabitGlyph } from "../components/HabitGlyph";
import { WeekStrip } from "../components/WeekStrip";
import { TodoRow } from "../components/TodoRow";

export function TodayScreen() {
  const state = useAppState();
  const habits = useHabits();
  const [dateKey, setDateKey] = useState(todayKey());
  const [newTask, setNewTask] = useState("");

  const d = fromKey(dateKey);
  const isToday = dateKey === todayKey();
  const scheduled = habits.filter((h) => isScheduled(h, dateKey));
  const todos = todosForDate(state.todos, dateKey);
  const overdue = isToday ? overdueTodos(state.todos, todayKey()) : [];
  const counts = combinedDayCounts(state.entries, habits, state.todos, dateKey);
  const mental = state.mental[dateKey] ?? { mood: 0, motivation: 0 };

  function addTask() {
    actions.addTodo(newTask, dateKey);
    setNewTask("");
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        <Pressable style={styles.navBtn} onPress={() => setDateKey(addDays(dateKey, 1))}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <WeekStrip
        dateKey={dateKey}
        onSelect={setDateKey}
        progressFor={(k) => combinedDayProgress(state.entries, habits, state.todos, k)}
      />

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ProgressRing value={counts.progress} />
        <View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: "800" }}>
            {counts.done}
            <Text style={{ color: C.faint, fontSize: 18 }}> / {counts.total}</Text>
          </Text>
          <Text style={{ color: C.dim, fontSize: 13 }}>done {isToday ? "today" : "this day"}</Text>
        </View>
      </Card>

      {overdue.length > 0 && (
        <Card>
          <Text style={{ color: C.amber, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
            Overdue · {overdue.length}
          </Text>
          {overdue.map((t) => (
            <View key={t.id} style={styles.overdueRow}>
              <Text style={{ flex: 1, color: C.text, fontSize: 13 }} numberOfLines={1}>
                {t.title}
              </Text>
              <Pressable onPress={() => actions.moveTodo(t.id, todayKey())} hitSlop={6}>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: "600" }}>→ Today</Text>
              </Pressable>
              <Pressable onPress={() => actions.toggleTodo(t.id)} hitSlop={6}>
                <Text style={{ color: C.dim, fontSize: 14 }}>✓</Text>
              </Pressable>
              <Pressable onPress={() => actions.deleteTodo(t.id)} hitSlop={6}>
                <Text style={{ color: C.faint, fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {/* To-dos for the day */}
      <Card>
        <Text style={styles.sectionTitle}>To-dos {isToday ? "today" : "this day"}</Text>
        <View style={{ gap: 8 }}>
          {todos.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              onToggle={() => actions.toggleTodo(t.id)}
              onStar={() => actions.setTodoPriority(t.id, !t.priority)}
              onDelete={() => actions.deleteTodo(t.id)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={addTask}
            placeholder="Add a task…"
            placeholderTextColor={C.faint}
            style={styles.input}
            returnKeyType="done"
          />
          <Pressable style={[styles.addBtn, !newTask.trim() && { opacity: 0.4 }]} onPress={addTask}>
            <Text style={{ color: C.bg, fontWeight: "700" }}>Add</Text>
          </Pressable>
        </View>
      </Card>

      {scheduled.length === 0 ? (
        habits.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 24 }}>🌱</Text>
            <Text style={{ color: C.dim, marginTop: 6, fontSize: 13 }}>
              No habits yet — add some on the Habits tab.
            </Text>
          </Card>
        ) : (
          <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", paddingVertical: 4 }}>
            No habits scheduled for this day.
          </Text>
        )
      ) : (
        scheduled.map((h) => {
          const done = isDone(state.entries, h.id, dateKey);
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
  sectionTitle: { color: C.dim, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: C.elev2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  overdueRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  stepBtnText: { color: C.text, fontSize: 20, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.elev2, overflow: "hidden" },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: C.accent },
});
