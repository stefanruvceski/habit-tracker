import type { SupabaseClient } from "@supabase/supabase-js";

/** A syncable document key in the `user_data` table. */
export type SyncKey = "app" | "finance" | "reminders";

/**
 * Read one user's document for `key`, or null when missing / on error.
 * Errors are swallowed so sync never breaks the app (offline-first).
 */
export async function pullDoc(
  client: SupabaseClient,
  userId: string,
  key: SyncKey,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return (data.data as Record<string, unknown>) ?? null;
}

/** Upsert one user's document for `key`. Swallows errors. */
export async function pushDoc(
  client: SupabaseClient,
  userId: string,
  key: SyncKey,
  data: unknown,
): Promise<void> {
  await client
    .from("user_data")
    .upsert(
      { user_id: userId, key, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" },
    );
}
