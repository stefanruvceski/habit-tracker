"use client";

import { useEffect } from "react";
import type { AppState, FinanceState } from "@habit/core";
import { supabase } from "../lib/supabase";
import { pullDoc, pushDoc } from "../lib/sync";
import {
  actions,
  appSnapshot,
  subscribeApp,
} from "../lib/store";
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
 * Mounts while a user is signed in. On first mount it pulls each document from
 * Supabase; if the cloud has data it replaces local (cloud is authoritative on
 * a fresh device), otherwise it seeds the cloud from this device. Afterwards it
 * pushes local changes up (debounced), last-write-wins. Never overwrites local
 * with an empty cloud, so a first sign-in can't wipe your data.
 */
export function CloudSync({ userId }: { userId: string }) {
  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    let cancelled = false;
    const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
    const unsubs: Array<() => void> = [];

    (async () => {
      // ---- initial pull (or seed) ----
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

      // ---- push local changes (debounced) ----
      const schedule = (key: "app" | "finance", get: () => unknown) => () => {
        if (timers[key]) clearTimeout(timers[key]);
        timers[key] = setTimeout(() => {
          void pushDoc(client, userId, key, get());
        }, 1000);
      };
      unsubs.push(subscribeApp(schedule("app", appSnapshot)));
      unsubs.push(subscribeFinance(schedule("finance", financeSnapshot)));
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      Object.values(timers).forEach((t) => t && clearTimeout(t));
    };
  }, [userId]);

  return null;
}
