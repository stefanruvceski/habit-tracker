import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
