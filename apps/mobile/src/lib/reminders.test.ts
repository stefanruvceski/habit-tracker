import { beforeEach, describe, test, expect, vi } from "vitest";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reminderActions } from "./reminders";
import { actions } from "./store";
import { HABIT_REMINDER_ID, FINANCE_REMINDER_ID } from "./notifications";

const mockNotif = vi.mocked(Notifications);
const flush = () => new Promise((r) => setTimeout(r, 20));

async function persisted() {
  const raw = await AsyncStorage.getItem("habit-tracker.reminders.v1");
  return raw ? JSON.parse(raw) : null;
}

beforeEach(async () => {
  mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
  mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
  reminderActions.setHabitsEnabled(false);
  reminderActions.setFinanceEnabled(false);
  reminderActions.setRoutineEnabled(false);
  await flush();
  vi.clearAllMocks();
  mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
  mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
});

describe("reminders store", () => {
  test("enabling the habit reminder schedules a daily notification and persists", async () => {
    reminderActions.setHabitsEnabled(true);
    await flush();
    const call = mockNotif.scheduleNotificationAsync.mock.calls.find(
      (c) => c[0].identifier === HABIT_REMINDER_ID,
    );
    expect(call).toBeTruthy();
    expect(call![0].trigger).toMatchObject({ type: "daily" });
    expect((await persisted()).habitsEnabled).toBe(true);
  });

  test("changing the habit time reschedules with the new time", async () => {
    reminderActions.setHabitsEnabled(true);
    await flush();
    vi.clearAllMocks();
    reminderActions.setHabitTime(7, 15);
    await flush();
    const call = mockNotif.scheduleNotificationAsync.mock.calls.find(
      (c) => c[0].identifier === HABIT_REMINDER_ID,
    );
    expect(call![0].trigger).toMatchObject({ hour: 7, minute: 15 });
    const p = await persisted();
    expect(p.habitHour).toBe(7);
    expect(p.habitMinute).toBe(15);
  });

  test("disabling cancels the habit reminder", async () => {
    reminderActions.setHabitsEnabled(true);
    await flush();
    vi.clearAllMocks();
    reminderActions.setHabitsEnabled(false);
    await flush();
    expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(HABIT_REMINDER_ID);
    expect((await persisted()).habitsEnabled).toBe(false);
  });

  test("enabling the finance reminder schedules a monthly notification", async () => {
    reminderActions.setFinanceEnabled(true);
    await flush();
    const call = mockNotif.scheduleNotificationAsync.mock.calls.find(
      (c) => c[0].identifier === FINANCE_REMINDER_ID,
    );
    expect(call![0].trigger).toMatchObject({ type: "monthly" });
  });

  test("changing the finance schedule reschedules", async () => {
    reminderActions.setFinanceEnabled(true);
    await flush();
    vi.clearAllMocks();
    reminderActions.setFinanceSchedule(15, 9);
    await flush();
    const call = mockNotif.scheduleNotificationAsync.mock.calls.find(
      (c) => c[0].identifier === FINANCE_REMINDER_ID,
    );
    expect(call![0].trigger).toMatchObject({ day: 15, hour: 9 });
  });

  test("denied permission keeps the reminder off", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);
    reminderActions.setHabitsEnabled(true);
    await flush();
    const scheduled = mockNotif.scheduleNotificationAsync.mock.calls.some(
      (c) => c[0].identifier === HABIT_REMINDER_ID,
    );
    expect(scheduled).toBe(false);
    expect((await persisted()).habitsEnabled).toBe(false);
  });

  test("routine reminders schedule one-off DATE notifications per section and replace the daily one", async () => {
    actions.importState({
      version: 2,
      habits: [
        {
          id: "w",
          name: "Meditate",
          emoji: "🧘",
          color: "#fff",
          type: "build",
          schedule: { type: "daily" },
          archived: false,
          order: 0,
          createdAt: "2020-01-01T00:00:00.000Z",
          goalType: "measurable",
          unit: "min",
          timeOfDay: "morning",
        },
      ],
      entries: {},
      mental: {},
      todos: [],
    });
    reminderActions.setHabitsEnabled(true);
    await flush();
    vi.clearAllMocks();
    reminderActions.setRoutineEnabled(true);
    await flush();
    const tod = mockNotif.scheduleNotificationAsync.mock.calls.filter((c) =>
      String(c[0].identifier).startsWith("tod-morning-"),
    );
    expect(tod.length).toBeGreaterThanOrEqual(6); // next 7 days (today's may be past)
    expect(tod[0][0].trigger).toMatchObject({ type: "date" });
    expect(tod[0][0].content.body).toContain("Meditate");
    expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(HABIT_REMINDER_ID);
    expect((await persisted()).routineEnabled).toBe(true);
  });
});
