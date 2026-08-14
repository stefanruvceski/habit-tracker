import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { C } from "./src/lib/theme";
import { TodayScreen } from "./src/screens/TodayScreen";
import { MonthScreen } from "./src/screens/MonthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HabitsScreen } from "./src/screens/HabitsScreen";
import { FinanceScreen } from "./src/screens/FinanceScreen";
import { SignInScreen } from "./src/screens/SignInScreen";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { CloudSync } from "./src/components/CloudSync";
import { AccountMenu } from "./src/components/AccountMenu";
import {
  TodayIcon,
  MonthIcon,
  YearIcon,
  HabitsIcon,
  FinanceIcon,
} from "./src/components/icons";

const TABS = [
  { key: "today", label: "Today", Icon: TodayIcon, Screen: TodayScreen },
  { key: "month", label: "Month", Icon: MonthIcon, Screen: MonthScreen },
  { key: "year", label: "Year", Icon: YearIcon, Screen: DashboardScreen },
  { key: "finance", label: "Finance", Icon: FinanceIcon, Screen: FinanceScreen },
  { key: "habits", label: "Habits", Icon: HabitsIcon, Screen: HabitsScreen },
] as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Gates the app behind sign-in when Supabase is configured; local-only otherwise. */
function Gate() {
  const { configured, loading, session, guest } = useAuth();
  if (configured && loading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: C.faint }}>Loading…</Text>
      </View>
    );
  }
  if (configured && !session && !guest) return <SignInScreen />;
  return (
    <>
      {session && <CloudSync userId={session.user.id} />}
      <Shell />
    </>
  );
}

function Shell() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("today");
  const Active = TABS.find((t) => t.key === tab)!.Screen;
  const { configured, session, guest } = useAuth();
  const showAccount = configured && (!!session || guest);
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        {tab === "year" ? (
          <DashboardScreen onOpenFinance={() => setTab("finance")} />
        ) : (
          <Active />
        )}
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
        {showAccount && <AccountMenu />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.elev,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
});
