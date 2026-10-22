import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { TIME_OF_DAY_ORDER, TIME_OF_DAY_LABEL, TIME_OF_DAY_ICON } from "@habit/core";
import { C } from "../lib/theme";
import { Card } from "./ui";
import { reminderActions, useReminders, useRemindersHydrated } from "../lib/reminders";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function Stepper({ label, onDec, onInc }: { label: string; onDec: () => void; onInc: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onDec} hitSlop={6}>
        <Text style={styles.stepArrow}>‹</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable style={styles.stepBtn} onPress={onInc} hitSlop={6}>
        <Text style={styles.stepArrow}>›</Text>
      </Pressable>
    </View>
  );
}

export function RemindersCard() {
  const hydrated = useRemindersHydrated();
  const r = useReminders();

  if (!hydrated) return null;

  const wrap = (n: number, max: number) => ((n % max) + max) % max;

  return (
    <Card>
      <Text style={styles.title}>Reminders</Text>

      {/* Time-of-day reminders */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Routine reminders</Text>
          <Text style={styles.rowSub}>Morning, afternoon, evening — skipped once that part is done</Text>
        </View>
        <Switch
          value={r.routineEnabled}
          onValueChange={reminderActions.setRoutineEnabled}
          trackColor={{ true: C.accent, false: C.elev2 }}
          thumbColor="#fff"
        />
      </View>
      {r.routineEnabled && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {TIME_OF_DAY_ORDER.map((t) => {
            const sec = r.routine[t];
            return (
              <View key={t} style={styles.secRow}>
                <Pressable
                  onPress={() => reminderActions.setRoutineSection(t, { enabled: !sec.enabled })}
                  style={[styles.secToggle, sec.enabled && styles.chipOn]}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 14 }}>{TIME_OF_DAY_ICON[t]}</Text>
                </Pressable>
                <Text style={[styles.secLabel, !sec.enabled && { color: C.faint }]}>
                  {TIME_OF_DAY_LABEL[t]}
                </Text>
                <Stepper
                  label={`${pad2(sec.hour)}:${pad2(sec.minute)}`}
                  onDec={() => {
                    const m = sec.hour * 60 + sec.minute - 15;
                    const w = ((m % 1440) + 1440) % 1440;
                    reminderActions.setRoutineSection(t, {
                      hour: Math.floor(w / 60),
                      minute: w % 60,
                      enabled: true,
                    });
                  }}
                  onInc={() => {
                    const w = (sec.hour * 60 + sec.minute + 15) % 1440;
                    reminderActions.setRoutineSection(t, {
                      hour: Math.floor(w / 60),
                      minute: w % 60,
                      enabled: true,
                    });
                  }}
                />
              </View>
            );
          })}
        </View>
      )}

      {!r.routineEnabled && <View style={styles.divider} />}

      {/* Daily habit reminder (single, when routine reminders are off) */}
      {!r.routineEnabled && (
        <>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Daily habit reminder</Text>
              <Text style={styles.rowSub}>A nudge to tick off your habits</Text>
            </View>
            <Switch
              value={r.habitsEnabled}
              onValueChange={reminderActions.setHabitsEnabled}
              trackColor={{ true: C.accent, false: C.elev2 }}
              thumbColor="#fff"
            />
          </View>
          {r.habitsEnabled && (
            <View style={styles.controls}>
              <Text style={styles.ctrlLabel}>At</Text>
              <Stepper
                label={pad2(r.habitHour)}
                onDec={() => reminderActions.setHabitTime(wrap(r.habitHour - 1, 24), r.habitMinute)}
                onInc={() => reminderActions.setHabitTime(wrap(r.habitHour + 1, 24), r.habitMinute)}
              />
              <Text style={styles.colon}>:</Text>
              <View style={styles.chipRow}>
                {[0, 15, 30, 45].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => reminderActions.setHabitTime(r.habitHour, m)}
                    style={[styles.chip, r.habitMinute === m && styles.chipOn]}
                  >
                    <Text
                      style={{ color: r.habitMinute === m ? C.bg : C.dim, fontSize: 12, fontWeight: "600" }}
                    >
                      {pad2(m)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.divider} />

      {/* Monthly income reminder */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Monthly income reminder</Text>
          <Text style={styles.rowSub}>Log invoices and payments</Text>
        </View>
        <Switch
          value={r.financeEnabled}
          onValueChange={reminderActions.setFinanceEnabled}
          trackColor={{ true: C.accent, false: C.elev2 }}
          thumbColor="#fff"
        />
      </View>
      {r.financeEnabled && (
        <View style={styles.controls}>
          <Text style={styles.ctrlLabel}>Day</Text>
          <Stepper
            label={String(r.financeDay)}
            onDec={() =>
              reminderActions.setFinanceSchedule(((r.financeDay - 2 + 28) % 28) + 1, r.financeHour)
            }
            onInc={() => reminderActions.setFinanceSchedule((r.financeDay % 28) + 1, r.financeHour)}
          />
          <Text style={[styles.ctrlLabel, { marginLeft: 8 }]}>at</Text>
          <Stepper
            label={`${pad2(r.financeHour)}:00`}
            onDec={() => reminderActions.setFinanceSchedule(r.financeDay, wrap(r.financeHour - 1, 24))}
            onInc={() => reminderActions.setFinanceSchedule(r.financeDay, wrap(r.financeHour + 1, 24))}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: C.dim, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: C.text, fontSize: 14, fontWeight: "600" },
  rowSub: { color: C.faint, fontSize: 12, marginTop: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  ctrlLabel: { color: C.faint, fontSize: 12 },
  colon: { color: C.faint, fontSize: 14, marginHorizontal: -2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.elev2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepArrow: { color: C.dim, fontSize: 16 },
  stepLabel: { color: C.text, fontSize: 14, fontWeight: "700", minWidth: 34, textAlign: "center" },
  chipRow: { flexDirection: "row", gap: 5 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev2,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  secRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  secToggle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev2,
    alignItems: "center",
    justifyContent: "center",
  },
  secLabel: { flex: 1, color: C.text, fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
});
