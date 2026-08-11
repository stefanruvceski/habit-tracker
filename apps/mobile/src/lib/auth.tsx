import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseConfigured } from "./supabase";

const GUEST_KEY = "habit-tracker.guest";

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** True when the user chose to skip sign-in and use the app on this device. */
  guest: boolean;
  sendCode: (email: string) => Promise<{ error: string | null }>;
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  /** Skip sign-in: use the app local-only, saved on this device (no cloud sync). */
  continueAsGuest: () => void;
  /** Leave guest mode so the sign-in screen shows again. */
  exitGuest: () => void;
  signOut: () => Promise<void>;
}

const LOCAL_ONLY: AuthValue = {
  configured: false,
  loading: false,
  session: null,
  email: null,
  guest: false,
  async sendCode() {
    return { error: "Auth not configured" };
  },
  async verifyCode() {
    return { error: "Auth not configured" };
  },
  continueAsGuest() {},
  exitGuest() {},
  async signOut() {},
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(GUEST_KEY)]).then(
      ([{ data }, storedGuest]) => {
        if (!active) return;
        setSession(data.session);
        if (!data.session && storedGuest === "1") setGuest(true);
        setLoading(false);
      },
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // A real session supersedes guest mode.
      if (s) {
        setGuest(false);
        void AsyncStorage.removeItem(GUEST_KEY);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthValue = {
    configured: supabaseConfigured,
    loading,
    session,
    email: session?.user?.email ?? null,
    guest,
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
    continueAsGuest() {
      setGuest(true);
      void AsyncStorage.setItem(GUEST_KEY, "1");
    },
    exitGuest() {
      setGuest(false);
      void AsyncStorage.removeItem(GUEST_KEY);
    },
    async signOut() {
      await supabase?.auth.signOut();
      setGuest(false);
      await AsyncStorage.removeItem(GUEST_KEY);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext) ?? LOCAL_ONLY;
}
