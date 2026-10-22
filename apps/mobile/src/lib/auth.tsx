import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import { AUTH_REDIRECT_URL, parseAuthLink } from "./authLink";
import { supabase, supabaseConfigured } from "./supabase";

const GUEST_KEY = "habit-tracker.guest";

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** True when the user chose to skip sign-in and use the app on this device. */
  guest: boolean;
  /** Email a magic sign-in link (registers on first use). Tapping it on this phone signs in. */
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  /** Error from the last magic link that was opened (e.g. expired), if any. */
  linkError: string | null;
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
  async sendMagicLink() {
    return { error: "Auth not configured" };
  },
  linkError: null,
  continueAsGuest() {},
  exitGuest() {},
  async signOut() {},
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [linkError, setLinkError] = useState<string | null>(null);

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
    // Magic link → app: streakli://auth?access_token=…&refresh_token=…
    const handleUrl = async (url: string | null) => {
      const res = parseAuthLink(url);
      if (!supabase || res.kind === "none") return;
      if (res.kind === "error") {
        setLinkError(res.message);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.accessToken,
        refresh_token: res.refreshToken,
      });
      setLinkError(error ? error.message : null);
    };
    void Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener("url", ({ url }) => void handleUrl(url));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const value: AuthValue = {
    configured: supabaseConfigured,
    loading,
    session,
    email: session?.user?.email ?? null,
    guest,
    async sendMagicLink(email) {
      if (!supabase) return { error: "Auth not configured" };
      setLinkError(null);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: AUTH_REDIRECT_URL },
      });
      return { error: error?.message ?? null };
    },
    linkError,
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
