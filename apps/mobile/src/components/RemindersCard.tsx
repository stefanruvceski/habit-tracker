import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { C } from "../lib/theme";
import { Card } from "./ui";
import {
  reminderActions,
  useReminders,
  useRemindersHydrated,
} from "../lib/reminders";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function Stepper({
  label,
  onDec,
  onInc,
}: {
  label: string;
  onDec: () => void;
  onInc: () => void;
}) {
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

      {/* Daily habit reminder */}
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
                <Text style={{ color: r.habitMinute === m ? C.bg : C.dim, fontSize: 12, fontWeight: "600" }}>
                  {pad2(m)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
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
            onDec={() => reminderActions.setFinanceSchedule(((r.financeDay - 2 + 28) % 28) + 1, r.financeHour)}
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
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.elev2, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepArrow: { color: C.dim, fontSize: 16 },
  stepLabel: { color: C.text, fontSize: 14, fontWeight: "700", minWidth: 34, textAlign: "center" },
  chipRow: { flexDirection: "row", gap: 5 },
  chip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev2 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
});
