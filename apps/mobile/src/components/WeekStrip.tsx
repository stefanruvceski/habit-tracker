import { View, Text, Pressable, StyleSheet } from "react-native";
import { addDays, fromKey, mondayIndex, todayKey } from "@habit/core";
import { C } from "../lib/theme";

const LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Mon–Sun strip for the week containing `dateKey`; tap a day to plan ahead. */
export function WeekStrip({
  dateKey,
  onSelect,
  progressFor,
}: {
  dateKey: string;
  onSelect: (key: string) => void;
  progressFor: (key: string) => number;
}) {
  const monday = addDays(dateKey, -mondayIndex(dateKey));
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <View style={styles.row}>
      {days.map((key, i) => {
        const selected = key === dateKey;
        const isToday = key === today;
        const p = Math.max(0, Math.min(1, progressFor(key)));
        const future = key > today;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.cell, selected && styles.cellSelected]}
          >
            <Text style={styles.label}>{LABELS[i]}</Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: p > 0 ? C.accent : C.elev2,
                  opacity: p > 0 ? 0.35 + p * 0.65 : future ? 0.5 : 1,
                  borderColor: isToday ? C.accent : "transparent",
                  borderWidth: isToday ? 1 : 0,
                },
              ]}
            >
              <Text style={{ color: p >= 0.5 ? C.bg : C.dim, fontSize: 12, fontWeight: "700" }}>
                {fromKey(key).getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  cell: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "transparent" },
  cellSelected: { borderColor: C.accent, backgroundColor: "rgba(52,211,153,0.1)" },
  label: { color: C.faint, fontSize: 10 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
