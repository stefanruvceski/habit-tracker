import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  sendCode: (email: string) => Promise<{ error: string | null }>;
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const LOCAL_ONLY: AuthValue = {
  configured: false,
  loading: false,
  session: null,
  email: null,
  async sendCode() {
    return { error: "Auth not configured" };
  },
  async verifyCode() {
    return { error: "Auth not configured" };
  },
  async signOut() {},
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    configured: supabaseConfigured,
    loading,
    session,
    email: session?.user?.email ?? null,
    async sendCode(email) {
      if (!supabase) return { error: "Auth not configured" };
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      return { error: error?.message ?? null };
    },
    async verifyCode(email, code) {
      if (!supabase) return { error: "Auth not configured" };
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      return { error: error?.message ?? null };
    },
    async signOut() {
      await supabase?.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext) ?? LOCAL_ONLY;
}
