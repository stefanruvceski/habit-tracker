import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { addDays, fromKey, toKey, todayKey, MONTH_SHORT, WEEKDAY_SHORT } from "@habit/core";
import { C } from "../lib/theme";

/**
 * A date field that opens the native Android date picker (no typing), with
 * quick "Today" / "Yesterday" chips. Value is a YYYY-MM-DD key.
 * Falls back to a plain text field off Android (web preview, tests).
 */
export function DateField({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  if (Platform.OS !== "android") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={C.faint}
        style={styles.fallback}
      />
    );
  }

  function open() {
    // Loaded lazily so non-Android bundles never touch the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DateTimePickerAndroid } = require("@react-native-community/datetimepicker");
    DateTimePickerAndroid.open({
      value: /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromKey(value) : new Date(),
      mode: "date",
      firstDayOfWeek: 1,
      onChange: (event: { type: string }, d?: Date) => {
        if (event.type === "set" && d) onChange(toKey(d));
      },
    });
  }

  const today = todayKey();
  const yesterday = addDays(today, -1);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromKey(value) : null;
  const label = d
    ? value === today
      ? "Today"
      : value === yesterday
        ? "Yesterday"
        : `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
    : "Pick a date";

  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel="Pick date">
        <Text style={styles.icon}>📅</Text>
        <Text style={styles.value} numberOfLines={1}>
          {label}
        </Text>
        {d && value !== today && value !== yesterday ? null : (
          <Text style={styles.sub}>{d ? `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : ""}</Text>
        )}
      </Pressable>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[
          ["Today", today],
          ["Yesterday", yesterday],
        ].map(([lab, key]) => (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.chip, value === key && styles.chipOn]}
          >
            <Text style={{ color: value === key ? C.bg : C.dim, fontSize: 12, fontWeight: "600" }}>{lab}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.elev2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  icon: { fontSize: 15 },
  value: { flex: 1, color: C.text, fontSize: 15, fontWeight: "600" },
  sub: { color: C.faint, fontSize: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev2 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  fallback: {
    backgroundColor: C.elev2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 15,
  },
});
