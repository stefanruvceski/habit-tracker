import { useSyncExternalStore } from "react";

/**
 * "Focus this habit's amount field" requests, e.g. from a widget's
 * streakli://log/<habitId> link. The Today screen consumes them.
 */
let pending: { habitId: string; at: number } | null = null;
const listeners = new Set<() => void>();

export function requestFocus(habitId: string): void {
  pending = { habitId, at: Date.now() };
  listeners.forEach((l) => l());
}

export function consumeFocus(habitId: string): boolean {
  if (pending?.habitId !== habitId) return false;
  pending = null;
  listeners.forEach((l) => l());
  return true;
}

export function useFocusRequest(): { habitId: string; at: number } | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pending,
  );
}

/** Habit id from a streakli://log/<id> (or streakli-dev://) link, else null. */
export function parseLogLink(url: string | null | undefined): string | null {
  const m = url?.match(/^streakli(?:-dev)?:\/\/log\/([^?#/]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
