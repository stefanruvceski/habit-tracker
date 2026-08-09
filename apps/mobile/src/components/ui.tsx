import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C } from "../lib/theme";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({
  label,
  value,
  color = C.text,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export function ProgressRing({
  value,
  size = 76,
  stroke = 8,
  color = C.accent,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.elev2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped)}
        />
      </Svg>
      <Text style={styles.ringLabel}>{label ?? `${Math.round(clamped * 100)}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev,
    padding: 16,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: C.elev2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: { fontSize: 10, letterSpacing: 0.5, color: C.faint, fontWeight: "600" },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  ringLabel: { position: "absolute", fontSize: 14, fontWeight: "700", color: C.text },
});
