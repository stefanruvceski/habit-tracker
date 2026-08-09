import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Habit, bestStreak, currentStreak, isDone, isScheduled } from "@habit/core";
import { actions, useAppState, useHabits } from "../lib/store";
import { useAuth } from "../lib/auth";
import { syncNow, useSyncStatus, SyncStatus } from "../lib/sync";
import { C } from "../lib/theme";
import { Card } from "../components/ui";
import { Heatmap, CellState } from "../components/Heatmap";
import { HabitGlyph } from "../components/HabitGlyph";
import { HabitForm, HabitDraft } from "../components/HabitForm";

export function HabitsScreen() {
  const state = useAppState();
  const habits = useHabits();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const thisYear = new Date().getFullYear();

  function move(id: string, dir: -1 | 1) {
    const ids = habits.map((h) => h.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    actions.reorderHabits(ids);
  }

  function save(d: HabitDraft) {
    if (editing) actions.updateHabit(editing.id, d);
    else actions.addHabit(d);
    setEditing(null);
    setCreating(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Habits</Text>
          <Text style={{ color: C.dim, fontSize: 13 }}>{habits.length} active</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => setCreating(true)}>
          <Text style={{ color: C.bg, fontWeight: "700" }}>+ New</Text>
        </Pressable>
      </View>

      {/* Year switcher — controls all habit heatmaps */}
      <View style={styles.yearRow}>
        <Pressable style={styles.yearBtn} onPress={() => setYear((y) => y - 1)}>
          <Text style={styles.yearArrow}>‹</Text>
        </Pressable>
        <Text style={styles.yearLabel}>{year}</Text>
        <Pressable
          style={[styles.yearBtn, year >= thisYear && { opacity: 0.3 }]}
          disabled={year >= thisYear}
          onPress={() => setYear((y) => Math.min(thisYear, y + 1))}
        >
          <Text style={styles.yearArrow}>›</Text>
        </Pressable>
      </View>

      {habits.map((h, i) => {
        const getState = (key: string): CellState =>
          isDone(state.entries, h.id, key) ? "done" : isScheduled(h, key) ? "missed" : "off";
        const scheduleLabel =
          h.schedule.type === "daily" ? "Daily"
            : h.schedule.type === "weekly" ? `${h.schedule.times}×/week`
            : `${h.schedule.days.length} days/week`;
        return (
          <Card key={h.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.emojiBox, { backgroundColor: h.color + "22" }]}>
                <HabitGlyph icon={h.icon} emoji={h.emoji} color={h.color} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontWeight: "600" }}>{h.name}</Text>
                <Text style={{ color: C.dim, fontSize: 12 }}>
                  {h.type === "quit" ? "🚫 Quit · " : ""}{scheduleLabel} · 🔥 {currentStreak(state.entries, h)} · best {bestStreak(state.entries, h)}
                </Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={() => move(h.id, -1)} disabled={i === 0}>
                <Text style={[styles.iconTxt, i === 0 && { opacity: 0.3 }]}>↑</Text>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => move(h.id, 1)} disabled={i === habits.length - 1}>
                <Text style={[styles.iconTxt, i === habits.length - 1 && { opacity: 0.3 }]}>↓</Text>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => setEditing(h)}>
                <Text style={styles.iconTxt}>✎</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: C.faint, fontSize: 10, fontWeight: "600", textAlign: "right", marginBottom: 4 }}>
                {year}
              </Text>
              <Heatmap year={year} color={h.color} getState={getState} />
            </View>
          </Card>
        );
      })}

      {habits.length === 0 && (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ color: C.dim }}>No habits yet. Tap “+ New”.</Text>
        </Card>
      )}

      <AccountCard />

      <HabitForm
        visible={creating || !!editing}
        initial={editing}
        onSave={save}
        onDelete={editing ? () => { actions.deleteHabit(editing.id); setEditing(null); } : undefined}
        onClose={() => { setEditing(null); setCreating(false); }}
      />
    </ScrollView>
  );
}

const SYNC_LABEL: Record<SyncStatus, { text: string; color: string }> = {
  idle: { text: "Idle", color: C.faint },
  syncing: { text: "Syncing…", color: C.amber },
  synced: { text: "Synced", color: C.accent },
  offline: { text: "Offline", color: C.amber },
  error: { text: "Sync error — will retry", color: C.danger },
};

function AccountCard() {
  const { status, user, signOut } = useAuth();
  const syncStatus = useSyncStatus();
  const [busy, setBusy] = useState(false);

  if (status === "unconfigured") {
    return (
      <Card>
        <Text style={styles.cardTitle}>Cloud sync</Text>
        <Text style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
          Not configured. Add EXPO_PUBLIC_SUPABASE_URL and _ANON_KEY (see README) to sync across devices.
        </Text>
      </Card>
    );
  }

  const s = SYNC_LABEL[syncStatus];
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={styles.cardTitle}>Account</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
          <Text style={{ color: s.color, fontSize: 12 }}>{s.text}</Text>
        </View>
      </View>
      <Text style={{ color: C.dim, fontSize: 13, marginBottom: 12 }}>
        Signed in as <Text style={{ color: C.text }}>{user?.email}</Text>
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          style={styles.secondaryBtn}
          disabled={busy}
          onPress={async () => { setBusy(true); await syncNow(); setBusy(false); }}
        >
          <Text style={{ color: C.text, fontWeight: "600" }}>🔄 Sync now</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => signOut()}>
          <Text style={{ color: C.danger, fontWeight: "600" }}>Sign out</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { color: C.text, fontSize: 24, fontWeight: "800" },
  newBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  yearBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.elev, alignItems: "center", justifyContent: "center" },
  yearArrow: { color: C.dim, fontSize: 18 },
  yearLabel: { color: C.text, fontSize: 15, fontWeight: "700", width: 56, textAlign: "center" },
  emojiBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.elev2, alignItems: "center", justifyContent: "center" },
  iconTxt: { color: C.dim, fontSize: 15 },
  cardTitle: { color: C.text, fontWeight: "700", fontSize: 16 },
  secondaryBtn: { flex: 1, borderRadius: 12, backgroundColor: C.elev2, paddingVertical: 12, alignItems: "center" },
});
