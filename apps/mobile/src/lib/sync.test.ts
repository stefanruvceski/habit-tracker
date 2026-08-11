import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pullDoc, pushDoc } from "./sync";

// Minimal chainable stub of the supabase query builder.
function clientReturning(row: { data: unknown } | null, err: unknown = null) {
  const maybeSingle = vi.fn(async () => ({ data: row, error: err }));
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const upsert = vi.fn(async (payload: unknown, opts?: unknown) => ({
    error: null,
    payload,
    opts,
  }));
  const from = vi.fn(() => ({ select, upsert }));
  return { client: { from } as unknown as SupabaseClient, from, select, upsert, maybeSingle };
}

describe("sync", () => {
  test("pullDoc returns the stored document", async () => {
    const { client } = clientReturning({ data: { habits: [1, 2] } });
    const doc = await pullDoc(client, "u1", "app");
    expect(doc).toEqual({ habits: [1, 2] });
  });

  test("pullDoc returns null when missing or on error", async () => {
    const miss = clientReturning(null);
    expect(await pullDoc(miss.client, "u1", "app")).toBeNull();
    const errored = clientReturning(null, { message: "boom" });
    expect(await pullDoc(errored.client, "u1", "finance")).toBeNull();
  });

  test("pushDoc upserts on the (user_id,key) conflict target", async () => {
    const { client, from, upsert } = clientReturning(null);
    await pushDoc(client, "u1", "finance", { sources: [] });
    expect(from).toHaveBeenCalledWith("user_data");
    const [payload, opts] = upsert.mock.calls[0];
    expect(payload).toMatchObject({ user_id: "u1", key: "finance", data: { sources: [] } });
    expect(opts).toEqual({ onConflict: "user_id,key" });
  });
});
