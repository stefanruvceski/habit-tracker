"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { onSignIn, onSignOut } from "./sync";

type AuthStatus = "loading" | "signedIn" | "signedOut" | "unconfigured";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  sendCode: (email: string) => Promise<{ error: string | null }>;
  verifyCode: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [session, setSession] = useState<Session | null>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return; // status stays "unconfigured"

    let active = true;

    function applySession(s: Session | null) {
      setSession(s);
      const uid = s?.user?.id ?? null;
      if (uid && uid !== lastUserId.current) {
        lastUserId.current = uid;
        void onSignIn(uid);
      } else if (!uid && lastUserId.current) {
        lastUserId.current = null;
        onSignOut();
      }
      setStatus(uid ? "signedIn" : "signedOut");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (active) applySession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      applySession(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sendCode(email: string) {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    return { error: error?.message ?? null };
  }

  async function verifyCode(email: string, token: string) {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user: session?.user ?? null,
        session,
        sendCode,
        verifyCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
