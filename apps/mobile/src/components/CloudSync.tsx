import { useEffect } from "react";
import { AppState as RNAppState } from "react-native";
import type { AppState, FinanceState } from "@habit/core";
import { supabase } from "../lib/supabase";
import { pullDoc, pushDoc, setLiveSync } from "../lib/sync";
import { actions, appSnapshot, subscribeApp } from "../lib/store";
import {
  financeActions,
  financeSnapshot,
  subscribeFinance,
} from "../lib/financeStore";

function hasHabits(d: unknown): d is AppState {
  return Boolean(d && Array.isArray((d as AppState).habits));
}
function hasSources(d: unknown): d is FinanceState {
  return Boolean(d && Array.isArray((d as FinanceState).sources));
}

/**
 * Mounts while signed in. Pulls each document once (cloud is authoritative on a
 * fresh device); if the cloud is empty it seeds from this device. Then pushes
 * local changes up (debounced). Reminders stay per-device and are not synced.
 * Never overwrites local with an empty cloud, so first sign-in can't wipe data.
 * Whenever the app comes back to the foreground it pulls again, so edits made
 * on the web show up on the phone without a restart.
 */
export function CloudSync({ userId }: { userId: string }) {
  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    let cancelled = false;
    setLiveSync(true);
    const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
    const unsubs: Array<() => void> = [];

    (async () => {
      const [appDoc, finDoc] = await Promise.all([
        pullDoc(client, userId, "app"),
        pullDoc(client, userId, "finance"),
      ]);
      if (cancelled) return;

      if (hasHabits(appDoc)) actions.importState(appDoc);
      else await pushDoc(client, userId, "app", appSnapshot());

      if (hasSources(finDoc)) financeActions.importFinance(finDoc);
      else await pushDoc(client, userId, "finance", financeSnapshot());

      if (cancelled) return;

      // True while applying a pulled doc, so it isn't echoed straight back up.
      let applyingRemote = false;

      const schedule = (key: "app" | "finance", get: () => unknown) => () => {
        if (applyingRemote) return;
        if (timers[key]) clearTimeout(timers[key]);
        timers[key] = setTimeout(() => {
          timers[key] = undefined;
          void pushDoc(client, userId, key, get());
        }, 1000);
      };
      unsubs.push(subscribeApp(schedule("app", appSnapshot)));
      unsubs.push(subscribeFinance(schedule("finance", financeSnapshot)));

      // Re-pull on foreground (skipped while a local change is still pending).
      const refresh = async () => {
        if (timers.app || timers.finance) return;
        const [a, f] = await Promise.all([
          pullDoc(client, userId, "app"),
          pullDoc(client, userId, "finance"),
        ]);
        if (cancelled || timers.app || timers.finance) return;
        applyingRemote = true;
        try {
          if (hasHabits(a) && JSON.stringify(a) !== JSON.stringify(appSnapshot()))
            actions.importState(a);
          if (hasSources(f) && JSON.stringify(f) !== JSON.stringify(financeSnapshot()))
            financeActions.importFinance(f);
        } finally {
          applyingRemote = false;
        }
      };
      const sub = RNAppState.addEventListener("change", (st) => {
        if (st === "active") void refresh();
      });
      unsubs.push(() => sub.remove());
    })();

    return () => {
      cancelled = true;
      setLiveSync(false);
      unsubs.forEach((u) => u());
      Object.values(timers).forEach((t) => t && clearTimeout(t));
    };
  }, [userId]);

  return null;
}
