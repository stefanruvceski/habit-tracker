import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  HABIT_REMINDER_ID,
  FINANCE_REMINDER_ID,
  cancelReminder,
  requestNotificationPermission,
  scheduleDailyHabitReminder,
  scheduleMonthlyIncomeReminder,
} from "./notifications";

export interface ReminderSettings {
  habitsEnabled: boolean;
  habitHour: number; // 0..23
  habitMinute: number; // 0..59
  financeEnabled: boolean;
  financeDay: number; // 1..28
  financeHour: number; // 0..23
}

const STORAGE_KEY = "habit-tracker.reminders.v1";

const DEFAULTS: ReminderSettings = {
  habitsEnabled: false,
  habitHour: 20,
  habitMinute: 0,
  financeEnabled: false,
  financeDay: 1,
  financeHour: 10,
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
      state = { ...DEFAULTS, ...parsed };
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

/** Push the current settings to the OS scheduler. */
async function applySchedule() {
  if (state.habitsEnabled) {
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
}

async function update(patch: Partial<ReminderSettings>) {
  const enablingHabits = patch.habitsEnabled && !state.habitsEnabled;
  const enablingFinance = patch.financeEnabled && !state.financeEnabled;

  // When turning a reminder on, require permission first; if denied, keep it off.
  if (enablingHabits || enablingFinance) {
    const ok = await requestNotificationPermission();
    if (!ok) {
      if (enablingHabits) patch = { ...patch, habitsEnabled: false };
      if (enablingFinance) patch = { ...patch, financeEnabled: false };
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
};
