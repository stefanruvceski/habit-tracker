import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accept either the new publishable key (sb_publishable_…) or the legacy anon
// key, under either env name. Both are client-safe (protected by RLS).
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Whether Supabase is configured. When false, the app runs local-only. */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * The browser Supabase client, or null when env vars are absent (local-only).
 * A singleton so the auth session/listener is shared app-wide.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // we use the OTP code flow, not magic links
      },
    })
  : null;
