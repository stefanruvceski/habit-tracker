import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { C } from "./src/lib/theme";
import { TodayScreen } from "./src/screens/TodayScreen";
import { MonthScreen } from "./src/screens/MonthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HabitsScreen } from "./src/screens/HabitsScreen";

const TABS = [
  { key: "today", label: "Today", icon: "✅", Screen: TodayScreen },
  { key: "month", label: "Month", icon: "📅", Screen: MonthScreen },
  { key: "year", label: "Year", icon: "📊", Screen: DashboardScreen },
  { key: "habits", label: "Habits", icon: "⚙️", Screen: HabitsScreen },
] as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("today");
  const Active = TABS.find((t) => t.key === tab)!.Screen;
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <Active />
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            <Text style={{ color: tab === t.key ? C.accent : C.faint, fontSize: 11, fontWeight: "600" }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
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
