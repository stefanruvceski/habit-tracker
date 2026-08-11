import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

/** Email → 6-digit code sign-in (registers on first use). */
export function SignInScreen() {
  const { sendCode, verifyCode, continueAsGuest } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (code.length < 6) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={{ fontSize: 30, textAlign: "center" }}>🌱</Text>
        <Text style={styles.title}>Habit Tracker</Text>
        <Text style={styles.sub}>
          {step === "email"
            ? "Sign in with your email — we'll send a code."
            : `Enter the code we sent to ${email}.`}
        </Text>

        {step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable
              style={[styles.btn, (busy || !email.trim()) && { opacity: 0.4 }]}
              onPress={submitEmail}
              disabled={busy || !email.trim()}
            >
              <Text style={styles.btnText}>{busy ? "Sending…" : "Send code"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={C.faint}
              keyboardType="number-pad"
              style={[styles.input, styles.codeInput]}
            />
            <Pressable
              style={[styles.btn, (busy || code.length < 6) && { opacity: 0.4 }]}
              onPress={submitCode}
              disabled={busy || code.length < 6}
            >
              <Text style={styles.btnText}>{busy ? "Verifying…" : "Verify & sign in"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              <Text style={styles.link}>‹ Use a different email</Text>
            </Pressable>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.guestWrap}>
          <Pressable onPress={continueAsGuest} hitSlop={8}>
            <Text style={styles.guestBtn}>Continue as guest</Text>
          </Pressable>
          <Text style={styles.guestHint}>No sign-in — saved on this device only.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.elev,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  title: { color: C.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  sub: { color: C.dim, fontSize: 13, textAlign: "center", marginBottom: 4 },
  input: {
    backgroundColor: C.elev2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
  },
  codeInput: { textAlign: "center", letterSpacing: 8, fontSize: 20 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  btnText: { color: C.bg, fontWeight: "700", fontSize: 15 },
  link: { color: C.faint, fontSize: 13, textAlign: "center", paddingVertical: 4 },
  error: { color: C.danger, fontSize: 13, textAlign: "center" },
  guestWrap: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    gap: 3,
  },
  guestBtn: { color: C.dim, fontSize: 14, fontWeight: "600", paddingVertical: 4 },
  guestHint: { color: C.faint, fontSize: 11, textAlign: "center" },
});
