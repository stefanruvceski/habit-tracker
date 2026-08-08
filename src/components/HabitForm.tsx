"use client";

import { useState } from "react";
import { Habit, HabitType, Schedule } from "../lib/types";
import { EMOJI_SUGGESTIONS, PALETTE } from "../lib/defaults";
import { WEEKDAY_SHORT } from "../lib/date";

export interface HabitDraft {
  name: string;
  emoji: string;
  color: string;
  type: HabitType;
  schedule: Schedule;
}

function toDraft(h?: Habit | null): HabitDraft {
  if (!h)
    return {
      name: "",
      emoji: "🎯",
      color: PALETTE[0],
      type: "build",
      schedule: { type: "daily" },
    };
  return {
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    type: h.type,
    schedule: h.schedule,
  };
}

export function HabitForm({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: Habit | null;
  onSave: (draft: HabitDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HabitDraft>(toDraft(initial));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const scheduleType = draft.schedule.type;
  const weekdayDays =
    draft.schedule.type === "weekdays" ? draft.schedule.days : [];
  const weeklyTimes =
    draft.schedule.type === "weekly" ? draft.schedule.times : 3;

  function setSchedule(s: Schedule) {
    setDraft((d) => ({ ...d, schedule: s }));
  }

  function toggleWeekday(day: number) {
    const days = weekdayDays.includes(day)
      ? weekdayDays.filter((x) => x !== day)
      : [...weekdayDays, day].sort();
    setSchedule({ type: "weekdays", days });
  }

  const canSave = draft.name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-bg-elev border-t sm:border border-border sm:rounded-2xl rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {initial ? "Edit habit" : "New habit"}
          </h3>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text text-xl leading-none px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Name + emoji preview */}
        <label className="block text-xs uppercase tracking-wide text-text-faint mb-1.5">
          Name
        </label>
        <div className="flex gap-2 mb-4">
          <div
            className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0"
            style={{ background: `${draft.color}22` }}
          >
            {draft.emoji}
          </div>
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Morning run"
            className="flex-1 bg-bg-elev-2 rounded-xl px-3 text-base outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Emoji picker */}
        <label className="block text-xs uppercase tracking-wide text-text-faint mb-1.5">
          Icon
        </label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setDraft((d) => ({ ...d, emoji: e }))}
              className={`w-9 h-9 rounded-lg text-lg grid place-items-center transition ${
                draft.emoji === e ? "bg-bg-elev-2 ring-2 ring-accent" : "hover:bg-bg-elev-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <label className="block text-xs uppercase tracking-wide text-text-faint mb-1.5">
          Color
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setDraft((d) => ({ ...d, color: c }))}
              className={`w-8 h-8 rounded-full transition ${
                draft.color === c ? "ring-2 ring-offset-2 ring-offset-bg-elev ring-white" : ""
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>

        {/* Type */}
        <label className="block text-xs uppercase tracking-wide text-text-faint mb-1.5">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["build", "quit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDraft((d) => ({ ...d, type: t }))}
              className={`rounded-xl py-2.5 text-sm font-medium border transition ${
                draft.type === t
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border text-text-dim"
              }`}
            >
              {t === "build" ? "🌱 Build" : "🚫 Quit"}
            </button>
          ))}
        </div>

        {/* Schedule */}
        <label className="block text-xs uppercase tracking-wide text-text-faint mb-1.5">
          Schedule
        </label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(
            [
              ["daily", "Daily"],
              ["weekdays", "Days"],
              ["weekly", "Weekly"],
            ] as const
          ).map(([val, lab]) => (
            <button
              key={val}
              onClick={() =>
                setSchedule(
                  val === "daily"
                    ? { type: "daily" }
                    : val === "weekdays"
                      ? { type: "weekdays", days: weekdayDays.length ? weekdayDays : [1, 2, 3, 4, 5] }
                      : { type: "weekly", times: weeklyTimes },
                )
              }
              className={`rounded-xl py-2 text-sm font-medium border transition ${
                scheduleType === val
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border text-text-dim"
              }`}
            >
              {lab}
            </button>
          ))}
        </div>

        {scheduleType === "weekdays" && (
          <div className="flex gap-1.5 mb-3">
            {WEEKDAY_SHORT.map((w, i) => (
              <button
                key={i}
                onClick={() => toggleWeekday(i)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                  weekdayDays.includes(i)
                    ? "bg-accent text-bg"
                    : "bg-bg-elev-2 text-text-dim"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        )}

        {scheduleType === "weekly" && (
          <div className="flex items-center gap-3 mb-3">
            <input
              type="range"
              min={1}
              max={7}
              value={weeklyTimes}
              onChange={(e) =>
                setSchedule({ type: "weekly", times: Number(e.target.value) })
              }
              className="flex-1"
            />
            <span className="text-sm w-24 text-right text-text-dim">
              {weeklyTimes}× / week
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          {initial && onDelete && (
            <button
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                confirmDelete
                  ? "bg-danger text-white"
                  : "bg-bg-elev-2 text-danger"
              }`}
            >
              {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
          )}
          <button
            disabled={!canSave}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold bg-accent text-bg disabled:opacity-40"
          >
            {initial ? "Save changes" : "Add habit"}
          </button>
        </div>
      </div>
    </div>
  );
}
