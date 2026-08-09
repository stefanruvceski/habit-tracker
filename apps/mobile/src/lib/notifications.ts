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
