import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Accept either the new publishable key (sb_publishable_…) or the legacy anon
// key, under either env name. Both are client-safe (protected by RLS).
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Whether Supabase is configured. When false, the app runs local-only. */
export const supabaseConfigured = Boolean(url && anonKey);

/** The Supabase client (AsyncStorage-backed session), or null when unconfigured. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
