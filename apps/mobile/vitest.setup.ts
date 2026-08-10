import { vi } from "vitest";

// In-memory AsyncStorage.
vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: async (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: async (k: string) => {
        store.delete(k);
      },
      clear: async () => {
        store.clear();
      },
    },
  };
});

// Minimal react-native surface used by the lib layer.
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// expo-notifications mock; tests tweak return values via vi.mocked(...).
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => {}),
  getPermissionsAsync: vi.fn(async () => ({ granted: false, ios: { status: 0 } })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: vi.fn(async () => "scheduled-id"),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 2 },
  SchedulableTriggerInputTypes: { DAILY: "daily", MONTHLY: "monthly" },
}));

// Default fetch stub for FX auto-refresh.
globalThis.fetch = vi.fn(async () => ({
  ok: false,
  status: 500,
  json: async () => ({}),
})) as unknown as typeof fetch;
