import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
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
  isDoneOn,
  isMeasurable,
  amountOn,
  isScheduled,
  todosForDate,
  overdueTodos,
  groupByTimeOfDay,
  measurableSeries,
  parseAmount,
  formatAmount,
  TIME_OF_DAY_LABEL,
  TIME_OF_DAY_ICON,
} from "@habit/core";
import type { Habit } from "@habit/core";
import { actions, useAppState, useHabits } from "../lib/store";
import { C } from "../lib/theme";
import { consumeFocus, useFocusRequest } from "../lib/focusRequest";
import { Card, ProgressRing } from "../components/ui";
import { HabitGlyph } from "../components/HabitGlyph";
import { WeekStrip } from "../components/WeekStrip";
import { TodoRow } from "../components/TodoRow";

// Enable LayoutAnimation on old-architecture Android (no-op elsewhere).
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TodayScreen() {
  const state = useAppState();
  const habits = useHabits();
  const [dateKey, setDateKey] = useState(todayKey());
  const [newTask, setNewTask] = useState("");
  const focusReq = useFocusRequest();
  useEffect(() => {
    if (focusReq) setDateKey(todayKey());
  }, [focusReq]);

  // Animate the to-do list gliding to its new order when priority changes.
  function toggleStar(id: string, priority: boolean) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    actions.setTodoPriority(id, priority);
  }

  const d = fromKey(dateKey);
  const isToday = dateKey === todayKey();
  const scheduled = habits.filter((h) => isScheduled(h, dateKey));
  const todos = todosForDate(state.todos, dateKey);
  const overdue = isToday ? overdueTodos(state.todos, todayKey()) : [];
  const counts = combinedDayCounts(state.entries, habits, state.todos, dateKey);
  const mental = state.mental[dateKey] ?? { mood: 0, motivation: 0 };

  function renderHabit(h: Habit) {
    const done = isDoneOn(h, state.entries, dateKey);
    if (isMeasurable(h)) {
      const prev = measurableSeries(state.entries, h.id, "0000-00-00", addDays(dateKey, -1));
      return (
        <MeasurableRow
          key={h.id}
          habit={h}
          amount={amountOn(state.entries, h.id, dateKey)}
          previous={prev.length ? prev[prev.length - 1].value : null}
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
  }

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
              <Text style={{ color: C.faint, fontSize: 11 }}>
                {MONTH_NAMES[fromKey(t.date).getMonth()].slice(0, 3)} {fromKey(t.date).getDate()}
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
              onStar={() => toggleStar(t.id, !t.priority)}
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
        groupByTimeOfDay(scheduled).map((g, gi, groups) => {
          const doneInGroup = g.habits.filter((h) => isDoneOn(h, state.entries, dateKey)).length;
          return (
            <View key={g.timeOfDay} style={{ gap: 10 }}>
              {(groups.length > 1 || g.timeOfDay !== "anytime") && (
                <View style={[styles.sectionHead, gi > 0 && { marginTop: 4 }]}>
                  <Text style={styles.todTitle}>
                    {TIME_OF_DAY_ICON[g.timeOfDay]}  {TIME_OF_DAY_LABEL[g.timeOfDay]}
                  </Text>
                  <Text
                    style={[
                      styles.sectionCount,
                      doneInGroup === g.habits.length && { color: C.accent },
                    ]}
                  >
                    {doneInGroup}/{g.habits.length}
                  </Text>
                </View>
              )}
              {g.habits.map((h) => renderHabit(h))}
            </View>
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
  previous,
  done,
  onSet,
}: {
  habit: Habit;
  amount: number;
  previous: number | null;
  done: boolean;
  onSet: (amount: number) => void;
}) {
  const target = habit.target ?? 0;
  const unit = habit.unit ?? "";
  const hasTarget = target > 0;
  const step = target >= 50 ? Math.max(1, Math.round(target / 10)) : 1;
  const pct = hasTarget ? Math.min(100, (amount / target) * 100) : amount > 0 ? 100 : 0;
  const [text, setText] = useState(amount ? formatAmount(amount) : "");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusReq = useFocusRequest();
  useEffect(() => {
    if (focusReq?.habitId === habit.id && consumeFocus(habit.id)) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [focusReq, habit.id]);
  if (!editing && text !== (amount ? formatAmount(amount) : "")) {
    setText(amount ? formatAmount(amount) : "");
  }

  function commit() {
    setEditing(false);
    const n = parseAmount(text);
    onSet(n != null && n > 0 ? n : 0);
  }

  const delta = amount > 0 && previous != null ? amount - previous : null;

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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: C.text, fontWeight: "600", fontSize: 15 }}>{habit.name}</Text>
          <Text numberOfLines={1} style={{ color: C.dim, fontSize: 12 }}>
            {hasTarget
              ? `${formatAmount(amount)} / ${formatAmount(target)} ${unit}`
              : amount > 0
                ? `${formatAmount(amount)} ${unit}`
                : previous != null
                  ? `Last: ${formatAmount(previous)} ${unit}`
                  : `Tap the number to log ${unit}`.trim()}
            {delta != null && delta !== 0 && (
              <Text style={{ color: C.dim }}>
                {"  "}
                {delta > 0 ? "▲" : "▼"} {formatAmount(Math.abs(delta))}
              </Text>
            )}
            {done && hasTarget ? " ✓" : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {hasTarget && (
            <Pressable style={styles.stepBtn} onPress={() => onSet(Math.max(0, amount - step))}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
          )}
          <TextInput
            ref={inputRef}
            value={text}
            onFocus={() => setEditing(true)}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            placeholder={previous != null && !hasTarget ? formatAmount(previous) : "0"}
            placeholderTextColor={C.faint}
            style={[styles.amountInput, { borderColor: editing ? habit.color : C.border }, { width: hasTarget ? 58 : 80 }]}
          />
          {hasTarget && (
            <Pressable style={styles.stepBtn} onPress={() => onSet(amount + step)}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          )}
        </View>
      </View>
      {hasTarget && (
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
  overdueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.elev2,
    marginBottom: 6,
  },
  amountInput: {
    flexGrow: 0,
    flexShrink: 0,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: C.elev2,
    color: C.text,
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  todTitle: { color: C.dim, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  sectionCount: { color: C.faint, fontSize: 12, fontWeight: "700" },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  stepBtnText: { color: C.text, fontSize: 20, fontWeight: "700" },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.elev2, overflow: "hidden" },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: C.accent },
});
