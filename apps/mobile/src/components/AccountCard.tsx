import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { C } from "../lib/theme";
import { Card } from "./ui";

/** Signed-in email + sign out. Renders nothing in local-only mode. */
export function AccountCard() {
  const { configured, session, email, signOut } = useAuth();
  if (!configured || !session) return null;

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
});
