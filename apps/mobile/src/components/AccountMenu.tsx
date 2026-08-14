import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { initialsFromEmail } from "@habit/core";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";

/**
 * Account avatar (initials circle) that opens a small menu: signed in shows the
 * email + Sign out; guest offers Sign in to sync. Renders nothing in local-only
 * mode or on the sign-in screen.
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
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.avatar, isGuest ? styles.avatarGuest : styles.avatarUser]}
        accessibilityLabel="Account"
      >
        <Text style={{ color: isGuest ? C.dim : C.bg, fontWeight: "800", fontSize: 13 }}>
          {label}
        </Text>
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
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: { backgroundColor: C.accent },
  avatarGuest: { backgroundColor: C.elev2, borderWidth: 1, borderColor: C.border },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingHorizontal: 12,
  },
  card: {
    width: 240,
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
  action: { fontSize: 15, fontWeight: "600", color: C.text, paddingVertical: 4 },
});
