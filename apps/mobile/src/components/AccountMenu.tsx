import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { initialsFromEmail } from "@habit/core";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

/**
 * Account entry for the bottom tab bar: an initials avatar + "Account" label
 * that opens a small menu (email + Sign out; guests get Sign in to sync).
 * Renders nothing in local-only mode or on the sign-in screen.
 */
export function AccountMenu() {
  const { configured, session, email, guest, signOut, exitGuest } = useAuth();
  const [open, setOpen] = useState(false);

  if (!configured) return null;
  if (!session && !guest) return null;

  const isGuest = !session;
  const label = isGuest ? "?" : initialsFromEmail(email);

  return (
    <>
      <Pressable style={styles.tab} onPress={() => setOpen(true)} accessibilityLabel="Account">
        <View style={[styles.avatar, isGuest ? styles.avatarGuest : styles.avatarUser]}>
          <Text style={{ color: isGuest ? C.dim : C.bg, fontWeight: "800", fontSize: 11 }}>
            {label}
          </Text>
        </View>
        <Text style={{ color: C.faint, fontSize: 11, fontWeight: "600" }}>Account</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.card}>
            <Text style={styles.kicker}>{isGuest ? "GUEST" : "SIGNED IN"}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {isGuest ? "Saved on this device" : email}
            </Text>
            <View style={styles.divider} />
            {isGuest ? (
              <Pressable
                onPress={() => {
                  exitGuest();
                  setOpen(false);
                }}
              >
                <Text style={[styles.action, { color: C.accent }]}>Sign in to sync</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  void signOut();
                  setOpen(false);
                }}
              >
                <Text style={styles.action}>Sign out</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: { backgroundColor: C.accent },
  avatarGuest: { backgroundColor: C.elev2, borderWidth: 1, borderColor: C.border },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: C.elev,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  kicker: { color: C.faint, fontSize: 10, letterSpacing: 0.5, fontWeight: "700" },
  email: { color: C.text, fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10, marginHorizontal: -16 },
  action: { fontSize: 15, fontWeight: "600", color: C.text, paddingVertical: 6 },
});
