"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { AppState, Habit } from "@habit/core";

// ---------------------------------------------------------------------------
// Sync operations (the "outbox" queue)
// ---------------------------------------------------------------------------

export type SyncOp =
  | { k: "habit_upsert"; habit: Habit }
  | { k: "habit_delete"; id: string }
  | { k: "entry_set"; habitId: string; date: string; done: boolean }
  | { k: "mental_upsert"; date: string; mood: number; motivation: number }
  | { k: "reset" };

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

const OUTBOX_KEY = "habit-tracker.outbox";

// ---------------------------------------------------------------------------
// Store bridge (store registers itself to avoid a circular import)
// ---------------------------------------------------------------------------

interface StoreApi {
  getState: () => AppState;
  replaceState: (s: AppState) => void;
}

let store: StoreApi | null = null;
export function registerStore(api: StoreApi) {
  store = api;
}

// ---------------------------------------------------------------------------
// Status observers
// ---------------------------------------------------------------------------

let status: SyncStatus = "idle";
const statusListeners = new Set<(s: SyncStatus) => void>();

function setStatus(s: SyncStatus) {
  status = s;
  for (const l of statusListeners) l(s);
}
export function getSyncStatus() {
  return status;
}
export function subscribeSyncStatus(cb: (s: SyncStatus) => void) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

/** React hook exposing the current sync status. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => subscribeSyncStatus(cb),
    getSyncStatus,
    () => "idle" as SyncStatus,
  );
}

// ---------------------------------------------------------------------------
// Outbox persistence
// ---------------------------------------------------------------------------

let currentUserId: string | null = null;

function readOutbox(): SyncOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(ops: SyncOp[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  } catch {
    // ignore
  }
}

/** Queue a mutation for the cloud and try to flush it. */
export function enqueue(op: SyncOp) {
  if (typeof window === "undefined" || !isSupabaseConfigured) return;
  const ops = readOutbox();
  ops.push(op);
  writeOutbox(ops);
  void flush();
}

// ---------------------------------------------------------------------------
// Applying ops against Supabase
// ---------------------------------------------------------------------------

function habitRow(h: Habit, userId: string) {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    type: h.type,
    schedule: h.schedule,
    archived: h.archived,
    order: h.order,
    created_at: h.createdAt,
    updated_at: new Date().toISOString(),
  };
}

async function applyOp(sb: SupabaseClient, userId: string, op: SyncOp) {
  switch (op.k) {
    case "habit_upsert": {
      const { error } = await sb.from("habits").upsert(habitRow(op.habit, userId));
      if (error) throw error;
      return;
    }
    case "habit_delete": {
      const { error } = await sb
        .from("habits")
        .delete()
        .eq("user_id", userId)
        .eq("id", op.id);
      if (error) throw error;
      return;
    }
    case "entry_set": {
      if (op.done) {
        const { error } = await sb.from("entries").upsert({
          user_id: userId,
          date: op.date,
          habit_id: op.habitId,
          done: true,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await sb
          .from("entries")
          .delete()
          .eq("user_id", userId)
          .eq("date", op.date)
          .eq("habit_id", op.habitId);
        if (error) throw error;
      }
      return;
    }
    case "mental_upsert": {
      const { error } = await sb.from("mental").upsert({
        user_id: userId,
        date: op.date,
        mood: op.mood,
        motivation: op.motivation,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return;
    }
    case "reset": {
      const a = await sb.from("habits").delete().eq("user_id", userId);
      const b = await sb.from("mental").delete().eq("user_id", userId);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      return;
    }
  }
}

let flushing = false;

/** Process the outbox in order. Stops (and keeps the rest) on the first error. */
export async function flush(): Promise<void> {
  if (flushing) return;
  const sb = getSupabase();
  if (!sb || !currentUserId) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return;
  }

  let ops = readOutbox();
  if (ops.length === 0) {
    if (status === "syncing") setStatus("synced");
    return;
  }

  flushing = true;
  setStatus("syncing");
  try {
    while (ops.length > 0) {
      const op = ops[0];
      await applyOp(sb, currentUserId, op);
      ops = ops.slice(1);
      writeOutbox(ops);
    }
    setStatus("synced");
  } catch {
    setStatus(
      typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
    );
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------------------
// Pull / migrate
// ---------------------------------------------------------------------------

async function pullRemote(sb: SupabaseClient, userId: string): Promise<AppState> {
  const [{ data: habits }, { data: entries }, { data: mental }] =
    await Promise.all([
      sb.from("habits").select("*").eq("user_id", userId),
      sb.from("entries").select("*").eq("user_id", userId),
      sb.from("mental").select("*").eq("user_id", userId),
    ]);

  const state: AppState = { version: 1, habits: [], entries: {}, mental: {} };

  state.habits = (habits ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    type: r.type,
    schedule: r.schedule,
    archived: r.archived,
    order: r.order,
    createdAt: r.created_at,
  }));

  for (const r of entries ?? []) {
    if (!state.entries[r.date]) state.entries[r.date] = {};
    if (r.done) state.entries[r.date][r.habit_id] = true;
  }

  for (const r of mental ?? []) {
    state.mental[r.date] = { mood: r.mood, motivation: r.motivation };
  }

  return state;
}

/** Push an entire local state to an (assumed empty) remote — used for migration. */
async function pushAll(sb: SupabaseClient, userId: string, local: AppState) {
  if (local.habits.length > 0) {
    const { error } = await sb
      .from("habits")
      .upsert(local.habits.map((h) => habitRow(h, userId)));
    if (error) throw error;
  }

  const entryRows: Array<{
    user_id: string;
    date: string;
    habit_id: string;
    done: boolean;
  }> = [];
  for (const [date, day] of Object.entries(local.entries)) {
    for (const [habitId, done] of Object.entries(day)) {
      if (done) entryRows.push({ user_id: userId, date, habit_id: habitId, done: true });
    }
  }
  if (entryRows.length > 0) {
    const { error } = await sb.from("entries").upsert(entryRows);
    if (error) throw error;
  }

  const mentalRows = Object.entries(local.mental)
    .filter(([, m]) => m.mood || m.motivation)
    .map(([date, m]) => ({
      user_id: userId,
      date,
      mood: m.mood,
      motivation: m.motivation,
    }));
  if (mentalRows.length > 0) {
    const { error } = await sb.from("mental").upsert(mentalRows);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Auth lifecycle hooks (called from AuthProvider)
// ---------------------------------------------------------------------------

export async function onSignIn(userId: string) {
  currentUserId = userId;
  const sb = getSupabase();
  if (!sb || !store) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return;
  }

  setStatus("syncing");
  try {
    const remote = await pullRemote(sb, userId);
    if (remote.habits.length === 0) {
      // First time on this account: migrate whatever is local up to the cloud.
      const local = store.getState();
      if (local.habits.length > 0 || Object.keys(local.entries).length > 0) {
        await pushAll(sb, userId, local);
      }
      // local stays as-is; clear any stale queue since we just pushed everything.
      writeOutbox([]);
    } else {
      // Remote is the source of truth across devices.
      await flush(); // apply any offline edits first
      const merged = await pullRemote(sb, userId);
      store.replaceState(merged);
    }
    setStatus("synced");
  } catch {
    setStatus("error");
  }
}

export function onSignOut() {
  currentUserId = null;
  setStatus("idle");
}

/** Force a re-pull from the cloud (used by the "Sync now" button). */
export async function syncNow() {
  if (currentUserId) await onSignIn(currentUserId);
}

// Flush the queue whenever connectivity returns.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
}
