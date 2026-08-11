import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";
import { Card } from "./ui";

/**
 * Signed-in email + sign out, or (in guest mode) an invitation to sign in and
 * enable sync. Renders nothing in local-only mode.
 */
export function AccountCard() {
  const { configured, session, email, guest, signOut, exitGuest } = useAuth();
  if (!configured) return null;

  if (session) {
    return (
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ACCOUNT</Text>
            <Text style={{ color: C.text, fontSize: 14 }} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Pressable style={styles.btn} onPress={() => signOut()}>
            <Text style={{ color: C.text, fontWeight: "600" }}>Sign out</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  if (guest) {
    return (
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ACCOUNT</Text>
            <Text style={{ color: C.text, fontSize: 14 }} numberOfLines={1}>
              Guest · saved on this device
            </Text>
          </View>
          <Pressable style={styles.btnAccent} onPress={() => exitGuest()}>
            <Text style={{ color: C.bg, fontWeight: "700" }}>Sign in</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { color: C.faint, fontSize: 10, letterSpacing: 0.5, fontWeight: "600" },
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnAccent: {
    borderRadius: 10,
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
