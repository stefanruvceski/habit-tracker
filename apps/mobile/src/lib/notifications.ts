import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

// Show reminders as a banner even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = "reminders";
export const HABIT_REMINDER_ID = "habit-daily";
export const FINANCE_REMINDER_ID = "finance-monthly";

async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Ask for notification permission, returning whether it is granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted ||
    req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** Schedule (or replace) the daily habit reminder at the given local time. */
export async function scheduleDailyHabitReminder(
  hour: number,
  minute: number,
): Promise<void> {
  await ensureAndroidChannel();
  await cancelReminder(HABIT_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: HABIT_REMINDER_ID,
    content: {
      title: "Habit check-in",
      body: "Tick off what you did today ✅",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

/** Schedule (or replace) the monthly income reminder. */
export async function scheduleMonthlyIncomeReminder(
  day: number,
  hour: number,
  minute = 0,
): Promise<void> {
  await ensureAndroidChannel();
  await cancelReminder(FINANCE_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: FINANCE_REMINDER_ID,
    content: {
      title: "Log this month's income",
      body: "Add invoices and payments so your totals stay up to date 💸",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

/** Cancel a scheduled reminder by id (no-op if it doesn't exist). */
export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // not scheduled
  }
}

/** Prefix of the one-off time-of-day reminders (`tod-<section>-<date>`). */
export const ROUTINE_PREFIX = "tod-";

export interface RoutineNotification {
  id: string;
  at: Date;
  title: string;
  body: string;
}

/**
 * Replace all scheduled time-of-day reminders with `list`: cancels the old
 * `tod-*` ones that are no longer wanted and schedules the new ones as
 * one-off DATE triggers (each carries its own text, e.g. what's still open).
 */
export async function replaceRoutineReminders(list: RoutineNotification[]): Promise<void> {
  await ensureAndroidChannel();
  let existing: string[] = [];
  try {
    existing = (await Notifications.getAllScheduledNotificationsAsync())
      .map((n) => n.identifier)
      .filter((id) => id.startsWith(ROUTINE_PREFIX));
  } catch {
    // ignore
  }
  const wanted = new Set(list.map((n) => n.id));
  await Promise.all(existing.filter((id) => !wanted.has(id)).map((id) => cancelReminder(id)));
  for (const n of list) {
    // Re-scheduling with the same identifier replaces it (text may have changed).
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL_ID },
    });
  }
}
