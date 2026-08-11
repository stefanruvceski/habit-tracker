"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

const GUEST_KEY = "habit-tracker.guest";

interface AuthValue {
  /** True when Supabase env is set; otherwise the app is local-only. */
  configured: boolean;
  /** Still restoring the session on first load. */
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** True when the user chose to skip sign-in and use the app on this device. */
  guest: boolean;
  /** Email a magic sign-in link (registers on first use). Clicking it signs in. */
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  /** Skip sign-in: use the app local-only, saved on this device (no cloud sync). */
  continueAsGuest: () => void;
  /** Leave guest mode so the sign-in screen shows again. */
  exitGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [guest, setGuest] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(GUEST_KEY) === "1",
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // A real session supersedes guest mode.
      if (s) {
        setGuest(false);
        try {
          window.localStorage.removeItem(GUEST_KEY);
        } catch {
          // ignore
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    configured: supabaseConfigured,
    loading,
    session,
    email: session?.user?.email ?? null,
    guest,
    async sendMagicLink(email) {
      if (!supabase) return { error: "Auth not configured" };
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          // Come back to this app; supabase-js reads the session from the URL.
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      return { error: error?.message ?? null };
    },
    continueAsGuest() {
      setGuest(true);
      try {
        window.localStorage.setItem(GUEST_KEY, "1");
      } catch {
        // ignore
      }
    },
    exitGuest() {
      setGuest(false);
      try {
        window.localStorage.removeItem(GUEST_KEY);
      } catch {
        // ignore
      }
    },
    async signOut() {
      await supabase?.auth.signOut();
      setGuest(false);
      try {
        window.localStorage.removeItem(GUEST_KEY);
      } catch {
        // ignore
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const LOCAL_ONLY: AuthValue = {
  configured: false,
  loading: false,
  session: null,
  email: null,
  guest: false,
  async sendMagicLink() {
    return { error: "Auth not configured" };
  },
  continueAsGuest() {},
  exitGuest() {},
  async signOut() {},
};

/**
 * Returns the auth state. Outside an AuthProvider (e.g. isolated component
 * tests) it falls back to a local-only value so components degrade gracefully.
 */
export function useAuth(): AuthValue {
  return useContext(AuthContext) ?? LOCAL_ONLY;
}
