import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

/** Email → magic sign-in link (registers on first use), same as the web app. */
export function SignInScreen() {
  const { sendMagicLink, continueAsGuest, linkError } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sendMagicLink(email);
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  }

  const shownError = error ?? linkError;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={{ fontSize: 30, textAlign: "center" }}>🌱</Text>
        <Text style={styles.title}>Habit Tracker</Text>
        <Text style={styles.sub}>
          {sent
            ? `We sent a sign-in link to ${email}. Open it on this phone to sign in.`
            : "Sign in with your email — we'll send you a link."}
        </Text>

        {sent ? (
          <>
            <Pressable
              style={[styles.btn, busy && { opacity: 0.4 }]}
              onPress={submit}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Sending…" : "Resend link"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setSent(false);
                setError(null);
              }}
            >
              <Text style={styles.link}>‹ Use a different email</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={submit}
              placeholder="you@email.com"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="send"
              style={styles.input}
            />
            <Pressable
              style={[styles.btn, (busy || !email.trim()) && { opacity: 0.4 }]}
              onPress={submit}
              disabled={busy || !email.trim()}
            >
              <Text style={styles.btnText}>{busy ? "Sending…" : "Send sign-in link"}</Text>
            </Pressable>
          </>
        )}

        {shownError && <Text style={styles.error}>{shownError}</Text>}

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
