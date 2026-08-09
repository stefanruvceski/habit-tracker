"use client";

import { useRef, useState } from "react";
import {
  actions,
  exportState,
  useAppState,
  useHabits,
  useHydrated,
} from "../../lib/store";
import { AppState, Habit } from "@habit/core";
import { bestStreak, currentStreak, isDone, isScheduled } from "@habit/core";
import { HabitForm, HabitDraft } from "../../components/HabitForm";
import { Heatmap, CellState } from "../../components/Heatmap";
import { Card, PageHeader } from "../../components/ui";
import { HabitGlyph } from "../../components/HabitGlyph";

export default function HabitsPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const habits = useHabits();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  function handleSave(draft: HabitDraft) {
    if (editing) actions.updateHabit(editing.id, draft);
    else actions.addHabit(draft);
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Habits"
        subtitle={`${habits.length} active`}
        right={
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-accent text-bg font-semibold px-4 py-2.5 text-sm"
          >
            + New
          </button>
        }
      />

      <div className="space-y-3">
        {habits.map((h, i) => (
          <HabitManageCard
            key={h.id}
            habit={h}
            state={state}
            isFirst={i === 0}
            isLast={i === habits.length - 1}
            onEdit={() => setEditing(h)}
            onMove={(dir) => moveHabit(habits, h.id, dir)}
          />
        ))}
        {habits.length === 0 && (
          <Card className="text-center py-8 text-text-dim">
            No habits yet. Tap “+ New” to add one.
          </Card>
        )}
      </div>

      <BackupCard />

      {(creating || editing) && (
        <HabitForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSave={handleSave}
          onDelete={
            editing
              ? () => {
                  actions.deleteHabit(editing.id);
                  setEditing(null);
                }
              : undefined
          }
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function moveHabit(habits: Habit[], id: string, dir: -1 | 1) {
  const ids = habits.map((h) => h.id);
  const idx = ids.indexOf(id);
  const swap = idx + dir;
  if (swap < 0 || swap >= ids.length) return;
  [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
  actions.reorderHabits(ids);
}

function HabitManageCard({
  habit,
  state,
  isFirst,
  isLast,
  onEdit,
  onMove,
}: {
  habit: Habit;
  state: AppState;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const cur = currentStreak(state.entries, habit);
  const best = bestStreak(state.entries, habit);
  const scheduleLabel =
    habit.schedule.type === "daily"
      ? "Daily"
      : habit.schedule.type === "weekly"
        ? `${habit.schedule.times}×/week`
        : `${habit.schedule.days.length} days/week`;

  const getState = (key: string): CellState => {
    if (isDone(state.entries, habit.id, key)) return "done";
    if (isScheduled(habit, key)) return "missed";
    return "off";
  };

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          className="grid place-items-center w-11 h-11 rounded-xl shrink-0"
          style={{ background: `${habit.color}22` }}
        >
          <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={24} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{habit.name}</div>
          <div className="text-xs text-text-dim">
            {habit.type === "quit" ? "🚫 Quit · " : ""}
            {scheduleLabel} · 🔥 {cur} · best {best}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="w-8 h-8 grid place-items-center rounded-lg bg-bg-elev-2 text-text-dim disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="w-8 h-8 grid place-items-center rounded-lg bg-bg-elev-2 text-text-dim disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onEdit}
            className="w-8 h-8 grid place-items-center rounded-lg bg-bg-elev-2 text-text-dim"
            aria-label="Edit"
          >
            ✎
          </button>
        </div>
      </div>
      <div className="mt-3">
        <Heatmap weeks={26} color={habit.color} getState={getState} />
      </div>
    </Card>
  );
}

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function download() {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(parsed.habits)) throw new Error("bad");
        actions.importState(parsed);
        setMsg("Data imported ✓");
      } catch {
        setMsg("Invalid backup file");
      }
      setTimeout(() => setMsg(""), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <Card>
      <h2 className="font-semibold mb-1">Backup & data</h2>
      <p className="text-sm text-text-dim mb-3">
        Everything is stored on this device. Export a file to back it up or move
        it to another phone.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={download}
          className="rounded-xl bg-bg-elev-2 px-4 py-2.5 text-sm font-medium"
        >
          ⬇ Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-bg-elev-2 px-4 py-2.5 text-sm font-medium"
        >
          ⬆ Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={onFile}
          className="hidden"
        />
      </div>
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </Card>
  );
}
