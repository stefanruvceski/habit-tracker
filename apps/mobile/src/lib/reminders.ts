import { useSyncExternalStore } from "react";
import { AppState as RNAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_TIME_OF_DAY_REMINDERS,
  planTimeOfDayReminders,
  todayKey,
  type TimeOfDay,
  type TimeOfDayReminderSettings,
} from "@habit/core";
import {
  HABIT_REMINDER_ID,
  FINANCE_REMINDER_ID,
  cancelReminder,
  replaceRoutineReminders,
  requestNotificationPermission,
  scheduleDailyHabitReminder,
  scheduleMonthlyIncomeReminder,
} from "./notifications";
import { appSnapshot, subscribeApp } from "./store";

export interface ReminderSettings {
  habitsEnabled: boolean;
  habitHour: number; // 0..23
  habitMinute: number; // 0..59
  financeEnabled: boolean;
  financeDay: number; // 1..28
  financeHour: number; // 0..23
  /** Per time-of-day reminders (replace the single daily reminder when on). */
  routineEnabled: boolean;
  routine: TimeOfDayReminderSettings;
}

const DEFAULT_ROUTINE: TimeOfDayReminderSettings = {
  morning: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.morning },
  afternoon: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.afternoon },
  evening: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.evening },
  anytime: { enabled: true, ...DEFAULT_TIME_OF_DAY_REMINDERS.anytime },
};

const STORAGE_KEY = "habit-tracker.reminders.v1";

const DEFAULTS: ReminderSettings = {
  habitsEnabled: false,
  habitHour: 20,
  habitMinute: 0,
  financeEnabled: false,
  financeDay: 1,
  financeHour: 10,
  routineEnabled: false,
  routine: DEFAULT_ROUTINE,
};

let state: ReminderSettings = { ...DEFAULTS };
let hydrated = false;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

async function load() {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
      state = {
        ...DEFAULTS,
        ...parsed,
        routine: { ...DEFAULT_ROUTINE, ...(parsed.routine ?? {}) },
      };
    }
  } catch {
    // keep defaults
  }
  hydrated = true;
  emit();
  // Re-apply the OS schedule so it matches the stored settings.
  void applySchedule();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void load();
  return () => {
    listeners.delete(cb);
  };
}

/** Re-plan the one-off time-of-day reminders from the current habits/entries. */
export async function applyRoutineSchedule(now = new Date()): Promise<void> {
  if (!state.routineEnabled) {
    await replaceRoutineReminders([]);
    return;
  }
  const app = appSnapshot();
  const plan = planTimeOfDayReminders(app.habits, app.entries, state.routine, now, todayKey(), 7);
  await replaceRoutineReminders(plan.map((p) => ({ id: p.id, at: p.at, title: p.title, body: p.body })));
}

// Re-plan when habits/entries change (debounced) and when the app comes back.
let replanTimer: ReturnType<typeof setTimeout> | undefined;
let watching = false;
function watchForReplan() {
  if (watching) return;
  watching = true;
  subscribeApp(() => {
    if (!state.routineEnabled) return;
    if (replanTimer) clearTimeout(replanTimer);
    replanTimer = setTimeout(() => void applyRoutineSchedule(), 1500);
  });
  RNAppState?.addEventListener?.("change", (st) => {
    if (st === "active" && state.routineEnabled) void applyRoutineSchedule();
  });
}

/** Push the current settings to the OS scheduler. */
async function applySchedule() {
  watchForReplan();
  // The routine reminders supersede the single daily one.
  if (state.habitsEnabled && !state.routineEnabled) {
    const ok = await requestNotificationPermission();
    if (ok) await scheduleDailyHabitReminder(state.habitHour, state.habitMinute);
  } else {
    await cancelReminder(HABIT_REMINDER_ID);
  }

  if (state.financeEnabled) {
    const ok = await requestNotificationPermission();
    if (ok) await scheduleMonthlyIncomeReminder(state.financeDay, state.financeHour);
  } else {
    await cancelReminder(FINANCE_REMINDER_ID);
  }

  if (state.routineEnabled) {
    const ok = await requestNotificationPermission();
    if (ok) await applyRoutineSchedule();
  } else {
    await applyRoutineSchedule();
  }
}

async function update(patch: Partial<ReminderSettings>) {
  const enablingHabits = patch.habitsEnabled && !state.habitsEnabled;
  const enablingFinance = patch.financeEnabled && !state.financeEnabled;
  const enablingRoutine = patch.routineEnabled && !state.routineEnabled;

  // When turning a reminder on, require permission first; if denied, keep it off.
  if (enablingHabits || enablingFinance || enablingRoutine) {
    const ok = await requestNotificationPermission();
    if (!ok) {
      if (enablingHabits) patch = { ...patch, habitsEnabled: false };
      if (enablingFinance) patch = { ...patch, financeEnabled: false };
      if (enablingRoutine) patch = { ...patch, routineEnabled: false };
    }
  }

  state = { ...state, ...patch };
  emit();
  await persist();
  await applySchedule();
}

// ---- Hooks & actions ------------------------------------------------------

export function useReminders(): ReminderSettings {
  return useSyncExternalStore(subscribe, () => state);
}

export function useRemindersHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated);
}

export const reminderActions = {
  setHabitsEnabled(on: boolean) {
    void update({ habitsEnabled: on });
  },
  setHabitTime(hour: number, minute: number) {
    void update({ habitHour: hour, habitMinute: minute });
  },
  setFinanceEnabled(on: boolean) {
    void update({ financeEnabled: on });
  },
  setFinanceSchedule(day: number, hour: number) {
    void update({ financeDay: day, financeHour: hour });
  },
  setRoutineEnabled(on: boolean) {
    void update({ routineEnabled: on });
  },
  setRoutineSection(t: TimeOfDay, patch: Partial<TimeOfDayReminderSettings[TimeOfDay]>) {
    void update({ routine: { ...state.routine, [t]: { ...state.routine[t], ...patch } } });
  },
};
