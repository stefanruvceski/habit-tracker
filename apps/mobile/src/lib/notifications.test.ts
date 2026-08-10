import { beforeEach, describe, test, expect, vi } from "vitest";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  requestNotificationPermission,
  scheduleDailyHabitReminder,
  scheduleMonthlyIncomeReminder,
  cancelReminder,
  HABIT_REMINDER_ID,
  FINANCE_REMINDER_ID,
} from "./notifications";

const mockNotif = vi.mocked(Notifications);

beforeEach(() => {
  vi.clearAllMocks();
  (Platform as { OS: string }).OS = "ios";
});

describe("requestNotificationPermission", () => {
  test("returns true when already granted", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);
    expect(await requestNotificationPermission()).toBe(true);
    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("treats provisional iOS status as granted", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
    } as never);
    expect(await requestNotificationPermission()).toBe(true);
  });

  test("requests when not granted and returns the request result", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    mockNotif.requestPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);
    expect(await requestNotificationPermission()).toBe(true);
    expect(mockNotif.requestPermissionsAsync).toHaveBeenCalledOnce();
  });

  test("returns false when the request is denied", async () => {
    mockNotif.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    mockNotif.requestPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    expect(await requestNotificationPermission()).toBe(false);
  });
});

describe("scheduling", () => {
  test("scheduleDailyHabitReminder cancels then schedules a DAILY trigger", async () => {
    await scheduleDailyHabitReminder(20, 30);
    expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith(HABIT_REMINDER_ID);
    const arg = mockNotif.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe(HABIT_REMINDER_ID);
    expect(arg.trigger).toMatchObject({ type: "daily", hour: 20, minute: 30 });
  });

  test("scheduleMonthlyIncomeReminder schedules a MONTHLY trigger", async () => {
    await scheduleMonthlyIncomeReminder(5, 10);
    const arg = mockNotif.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe(FINANCE_REMINDER_ID);
    expect(arg.trigger).toMatchObject({ type: "monthly", day: 5, hour: 10, minute: 0 });
  });

  test("creates an Android channel when on Android", async () => {
    (Platform as { OS: string }).OS = "android";
    await scheduleDailyHabitReminder(8, 0);
    expect(mockNotif.setNotificationChannelAsync).toHaveBeenCalled();
  });

  test("does not create a channel on iOS", async () => {
    await scheduleDailyHabitReminder(8, 0);
    expect(mockNotif.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe("cancelReminder", () => {
  test("calls the SDK", async () => {
    await cancelReminder("some-id");
    expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith("some-id");
  });

  test("swallows errors", async () => {
    mockNotif.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error("nope"));
    await expect(cancelReminder("x")).resolves.toBeUndefined();
  });
});
