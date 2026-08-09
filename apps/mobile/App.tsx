import { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { C } from "./src/lib/theme";
import { TodayScreen } from "./src/screens/TodayScreen";
import { MonthScreen } from "./src/screens/MonthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HabitsScreen } from "./src/screens/HabitsScreen";
import { TodayIcon, MonthIcon, YearIcon, HabitsIcon } from "./src/components/icons";

const TABS = [
  { key: "today", label: "Today", Icon: TodayIcon, Screen: TodayScreen },
  { key: "month", label: "Month", Icon: MonthIcon, Screen: MonthScreen },
  { key: "year", label: "Year", Icon: YearIcon, Screen: DashboardScreen },
  { key: "habits", label: "Habits", Icon: HabitsIcon, Screen: HabitsScreen },
] as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </SafeAreaView>
    );
  }
  if (status === "signedOut") return <SignIn />;
  return <Shell unconfigured={status === "unconfigured"} />;
}

function Shell({ unconfigured }: { unconfigured: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("today");
  const Active = TABS.find((t) => t.key === tab)!.Screen;
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {unconfigured && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Cloud sync not configured — local-only mode. See README.</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Active />
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const activeColor = tab === t.key ? C.accent : C.faint;
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <t.Icon size={23} color={activeColor} />
              <Text style={{ color: activeColor, fontSize: 11, fontWeight: "600" }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function SignIn() {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) setError(error);
    else setStep("code");
  }
  async function submitCode() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
  }

  return (
    <SafeAreaView style={styles.center}>
      <View style={{ width: "86%", maxWidth: 380, alignItems: "center" }}>
        <Text style={{ fontSize: 48 }}>✅</Text>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: "800", marginTop: 8 }}>Habit Tracker</Text>
        <Text style={{ color: C.dim, textAlign: "center", marginTop: 4, marginBottom: 24 }}>
          {step === "email"
            ? "Sign in with your email to sync across devices."
            : `Enter the 6-digit code sent to ${email}.`}
        </Text>

        {step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable style={styles.primary} onPress={submitEmail} disabled={busy}>
              <Text style={styles.primaryText}>{busy ? "Sending…" : "Send code"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={C.faint}
              keyboardType="number-pad"
              style={[styles.input, { textAlign: "center", letterSpacing: 8, fontSize: 22 }]}
            />
            <Pressable style={styles.primary} onPress={submitCode} disabled={busy}>
              <Text style={styles.primaryText}>{busy ? "Verifying…" : "Verify & sign in"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              style={{ marginTop: 14 }}
            >
              <Text style={{ color: C.accent }}>Use a different email</Text>
            </Pressable>
          </>
        )}
        {error && <Text style={{ color: C.danger, marginTop: 12, textAlign: "center" }}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 20 },
  banner: { backgroundColor: "rgba(245,158,11,0.15)", paddingVertical: 6, paddingHorizontal: 12 },
  bannerText: { color: "#fcd34d", fontSize: 12, textAlign: "center" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.elev,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  input: {
    width: "100%",
    backgroundColor: C.elev,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 16,
    marginBottom: 12,
  },
  primary: { width: "100%", backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  primaryText: { color: C.bg, fontWeight: "700", fontSize: 16 },
});
