import { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Habit, HabitType, HabitGoalType, Aggregation, Schedule, EMOJI_SUGGESTIONS, PALETTE, WEEKDAY_SHORT, WEEKDAY_ORDER_MON, searchIcons } from "@habit/core";
import { C } from "../lib/theme";
import { HabitGlyph } from "./HabitGlyph";

export interface HabitDraft {
  name: string;
  icon?: string;
  emoji: string;
  color: string;
  type: HabitType;
  schedule: Schedule;
  goalType: HabitGoalType;
  unit?: string;
  target?: number;
  aggregation?: Aggregation;
}

function toDraft(h?: Habit | null): HabitDraft {
  if (!h)
    return {
      name: "",
      icon: "target",
      emoji: "🎯",
      color: PALETTE[0],
      type: "build",
      schedule: { type: "daily" },
      goalType: "binary",
    };
  return {
    name: h.name,
    icon: h.icon,
    emoji: h.emoji,
    color: h.color,
    type: h.type,
    schedule: h.schedule,
    goalType: h.goalType ?? "binary",
    unit: h.unit,
    target: h.target,
    aggregation: h.aggregation,
  };
}

export function HabitForm({
  visible,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  initial?: Habit | null;
  onSave: (d: HabitDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HabitDraft>(toDraft(initial));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchIcons(query), [query]);

  // Re-seed the form each time it opens.
  const [lastVisible, setLastVisible] = useState(false);
  if (visible && !lastVisible) {
    setDraft(toDraft(initial));
    setConfirmDelete(false);
    setQuery("");
    setLastVisible(true);
  } else if (!visible && lastVisible) {
    setLastVisible(false);
  }

  const st = draft.schedule.type;
  const weekdayDays = draft.schedule.type === "weekdays" ? draft.schedule.days : [];
  const weeklyTimes = draft.schedule.type === "weekly" ? draft.schedule.times : 3;
  const canSave = draft.name.trim().length > 0;

  function setSchedule(s: Schedule) {
    setDraft((d) => ({ ...d, schedule: s }));
  }
  function toggleWeekday(day: number) {
    const days = weekdayDays.includes(day) ? weekdayDays.filter((x) => x !== day) : [...weekdayDays, day].sort();
    setSchedule({ type: "weekdays", days });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={styles.h}>{initial ? "Edit habit" : "New habit"}</Text>
              <Pressable onPress={onClose}><Text style={{ color: C.faint, fontSize: 20 }}>✕</Text></Pressable>
            </View>

            <Text style={styles.label}>NAME</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <View style={[styles.emojiPreview, { backgroundColor: draft.color + "22" }]}>
                <HabitGlyph icon={draft.icon} emoji={draft.emoji} color={draft.color} size={24} />
              </View>
              <TextInput
                value={draft.name}
                onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
                placeholder="e.g. Morning run"
                placeholderTextColor={C.faint}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>ICON</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search (run, water, sleep…)"
              placeholderTextColor={C.faint}
              style={[styles.input, { flex: 0, alignSelf: "stretch", marginBottom: 8 }]}
            />
            <View style={styles.wrap}>
              {results.map((ic) => {
                const active = draft.icon === ic.id;
                return (
                  <Pressable
                    key={ic.id}
                    onPress={() => setDraft((d) => ({ ...d, icon: ic.id }))}
                    style={[styles.iconBtn, active && { borderColor: C.accent, borderWidth: 2, backgroundColor: C.elev2 }]}
                  >
                    <HabitGlyph icon={ic.id} color={active ? draft.color : C.dim} size={22} />
                  </Pressable>
                );
              })}
              {results.length === 0 && (
                <Text style={{ color: C.faint, fontSize: 12, paddingVertical: 8 }}>
                  No icons match — use an emoji below.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Text style={{ color: C.faint, fontSize: 12 }}>or emoji</Text>
              <TextInput
                value={draft.icon ? "" : draft.emoji}
                onChangeText={(t) =>
                  setDraft((d) => ({ ...d, icon: undefined, emoji: Array.from(t).slice(-1)[0] ?? "🎯" }))
                }
                placeholder="😀"
                placeholderTextColor={C.faint}
                style={styles.emojiInput}
              />
              {EMOJI_SUGGESTIONS.slice(0, 8).map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setDraft((d) => ({ ...d, icon: undefined, emoji: e }))}
                  style={[styles.emojiBtn, !draft.icon && draft.emoji === e && { borderColor: C.accent, borderWidth: 2 }]}
                >
                  <Text style={{ fontSize: 16 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>COLOR</Text>
            <View style={styles.wrap}>
              {PALETTE.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setDraft((d) => ({ ...d, color: c }))}
                  style={[styles.colorDot, { backgroundColor: c }, draft.color === c && { borderWidth: 3, borderColor: "#fff" }]}
                />
              ))}
            </View>

            <Text style={styles.label}>TYPE</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["build", "quit"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setDraft((d) => ({ ...d, type: t }))}
                  style={[styles.seg, draft.type === t && styles.segActive]}
                >
                  <Text style={{ color: draft.type === t ? C.text : C.dim }}>{t === "build" ? "🌱 Build" : "🚫 Quit"}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>TRACKING</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(
                [
                  ["binary", "✓ Yes / no"],
                  ["measurable", "🔢 Amount"],
                ] as const
              ).map(([val, lab]) => (
                <Pressable
                  key={val}
                  onPress={() => setDraft((d) => ({ ...d, goalType: val }))}
                  style={[styles.seg, draft.goalType === val && styles.segActive]}
                >
                  <Text style={{ color: draft.goalType === val ? C.text : C.dim }}>{lab}</Text>
                </Pressable>
              ))}
            </View>

            {draft.goalType === "measurable" && (
              <View style={{ marginBottom: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>DAILY TARGET</Text>
                    <TextInput
                      value={draft.target != null ? String(draft.target) : ""}
                      onChangeText={(t) =>
                        setDraft((d) => ({
                          ...d,
                          target: t ? Number(t.replace(/[^\d.]/g, "")) || undefined : undefined,
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="e.g. 8"
                      placeholderTextColor={C.faint}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>UNIT</Text>
                    <TextInput
                      value={draft.unit ?? ""}
                      onChangeText={(t) => setDraft((d) => ({ ...d, unit: t }))}
                      placeholder="glasses, min"
                      placeholderTextColor={C.faint}
                      style={styles.input}
                    />
                  </View>
                </View>
                <Text style={styles.label}>ROLL-UP</Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  {(
                    [
                      ["sum", "Sum"],
                      ["avg", "Avg"],
                      ["max", "Max"],
                      ["last", "Last"],
                    ] as const
                  ).map(([val, lab]) => (
                    <Pressable
                      key={val}
                      onPress={() => setDraft((d) => ({ ...d, aggregation: val }))}
                      style={[styles.aggChip, (draft.aggregation ?? "sum") === val && styles.segActive]}
                    >
                      <Text style={{ color: (draft.aggregation ?? "sum") === val ? C.text : C.dim, fontSize: 13 }}>
                        {lab}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.label}>SCHEDULE</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              {([["daily", "Daily"], ["weekdays", "Days"], ["weekly", "Weekly"]] as const).map(([val, lab]) => (
                <Pressable
                  key={val}
                  onPress={() =>
                    setSchedule(
                      val === "daily" ? { type: "daily" }
                        : val === "weekdays" ? { type: "weekdays", days: weekdayDays.length ? weekdayDays : [1, 2, 3, 4, 5] }
                        : { type: "weekly", times: weeklyTimes },
                    )
                  }
                  style={[styles.seg, st === val && styles.segActive]}
                >
                  <Text style={{ color: st === val ? C.text : C.dim }}>{lab}</Text>
                </Pressable>
              ))}
            </View>

            {st === "weekdays" && (
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                {WEEKDAY_ORDER_MON.map((idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => toggleWeekday(idx)}
                    style={[styles.dayBtn, weekdayDays.includes(idx) && { backgroundColor: C.accent }]}
                  >
                    <Text style={{ color: weekdayDays.includes(idx) ? C.bg : C.dim, fontSize: 12, fontWeight: "600" }}>{WEEKDAY_SHORT[idx]}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {st === "weekly" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Pressable style={styles.stepBtn} onPress={() => setSchedule({ type: "weekly", times: Math.max(1, weeklyTimes - 1) })}>
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>
                <Text style={{ color: C.text, fontWeight: "600" }}>{weeklyTimes}× / week</Text>
                <Pressable style={styles.stepBtn} onPress={() => setSchedule({ type: "weekly", times: Math.min(7, weeklyTimes + 1) })}>
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {initial && onDelete && (
                <Pressable
                  onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                  style={[styles.deleteBtn, confirmDelete && { backgroundColor: C.danger }]}
                >
                  <Text style={{ color: confirmDelete ? "#fff" : C.danger, fontWeight: "600" }}>
                    {confirmDelete ? "Confirm delete" : "Delete"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                disabled={!canSave}
                onPress={() => onSave({ ...draft, name: draft.name.trim() })}
                style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
              >
                <Text style={{ color: C.bg, fontWeight: "700" }}>{initial ? "Save changes" : "Add habit"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.elev, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: "88%" },
  h: { color: C.text, fontSize: 18, fontWeight: "700" },
  label: { color: C.faint, fontSize: 11, letterSpacing: 0.5, fontWeight: "600", marginBottom: 6 },
  emojiPreview: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, backgroundColor: C.elev2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  emojiBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  emojiInput: { width: 46, textAlign: "center", backgroundColor: C.elev2, borderRadius: 9, paddingVertical: 6, color: C.text, fontSize: 18 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  seg: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: "center" },
  aggChip: { borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  segActive: { borderColor: C.accent, backgroundColor: "rgba(52,211,153,0.1)" },
  dayBtn: { flex: 1, borderRadius: 9, backgroundColor: C.elev2, paddingVertical: 9, alignItems: "center" },
  stepBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  stepBtnText: { color: C.text, fontSize: 20, fontWeight: "700" },
  deleteBtn: { borderRadius: 12, backgroundColor: C.elev2, paddingHorizontal: 16, paddingVertical: 13, justifyContent: "center" },
  saveBtn: { flex: 1, borderRadius: 12, backgroundColor: C.accent, paddingVertical: 13, alignItems: "center" },
});
