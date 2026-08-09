import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppState, Habit } from "@habit/core";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type SyncOp =
  | { k: "habit_upsert"; habit: Habit }
  | { k: "habit_delete"; id: string }
  | { k: "entry_set"; habitId: string; date: string; done: boolean }
  | { k: "mental_upsert"; date: string; mood: number; motivation: number }
  | { k: "reset" };

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

const OUTBOX_KEY = "habit-tracker.outbox";

interface StoreApi {
  getState: () => AppState;
  replaceState: (s: AppState) => void;
}

let store: StoreApi | null = null;
export function registerStore(api: StoreApi) {
  store = api;
}

// ---- Status ---------------------------------------------------------------

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
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => subscribeSyncStatus(cb),
    getSyncStatus,
  );
}

// ---- Outbox (persisted in AsyncStorage, mirrored in memory) ---------------

let outbox: SyncOp[] = [];
let outboxLoaded = false;
let currentUserId: string | null = null;

async function loadOutbox() {
  if (outboxLoaded) return;
  outboxLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    outbox = raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    outbox = [];
  }
}

async function saveOutbox() {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    // ignore
  }
}

export function enqueue(op: SyncOp) {
  if (!isSupabaseConfigured) return;
  outbox.push(op);
  void saveOutbox();
  void flush();
}

// ---- Row mapping / applying ops -------------------------------------------

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

export async function flush(): Promise<void> {
  if (flushing) return;
  const sb = getSupabase();
  if (!sb || !currentUserId) return;
  await loadOutbox();
  if (outbox.length === 0) {
    if (status === "syncing") setStatus("synced");
    return;
  }
  flushing = true;
  setStatus("syncing");
  try {
    while (outbox.length > 0) {
      await applyOp(sb, currentUserId, outbox[0]);
      outbox = outbox.slice(1);
      await saveOutbox();
    }
    setStatus("synced");
  } catch {
    setStatus("error");
  } finally {
    flushing = false;
  }
}

// ---- Pull / migrate -------------------------------------------------------

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

async function pushAll(sb: SupabaseClient, userId: string, local: AppState) {
  if (local.habits.length > 0) {
    const { error } = await sb
      .from("habits")
      .upsert(local.habits.map((h) => habitRow(h, userId)));
    if (error) throw error;
  }
  const entryRows: Array<{ user_id: string; date: string; habit_id: string; done: boolean }> = [];
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
    .map(([date, m]) => ({ user_id: userId, date, mood: m.mood, motivation: m.motivation }));
  if (mentalRows.length > 0) {
    const { error } = await sb.from("mental").upsert(mentalRows);
    if (error) throw error;
  }
}

// ---- Auth lifecycle -------------------------------------------------------

export async function onSignIn(userId: string) {
  currentUserId = userId;
  const sb = getSupabase();
  if (!sb || !store) return;
  await loadOutbox();
  setStatus("syncing");
  try {
    const remote = await pullRemote(sb, userId);
    if (remote.habits.length === 0) {
      const local = store.getState();
      if (local.habits.length > 0 || Object.keys(local.entries).length > 0) {
        await pushAll(sb, userId, local);
      }
      outbox = [];
      await saveOutbox();
    } else {
      await flush();
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

export async function syncNow() {
  if (currentUserId) await onSignIn(currentUserId);
}
