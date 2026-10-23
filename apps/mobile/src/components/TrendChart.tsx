import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  addDays,
  formatAmount,
  fromKey,
  measurableSeries,
  seriesSummary,
  todayKey,
  MONTH_SHORT,
  type Entries,
  type Habit,
} from "@habit/core";
import { C } from "../lib/theme";

const RANGES = [
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
  { key: "all", label: "All", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

/**
 * Line chart of a measurable habit's logged values over time (pages, minutes…),
 * x-axis scaled by real dates, optional dashed target line, with a summary of
 * the latest value and the change over the selected range.
 */
export function TrendChart({ habit, entries }: { habit: Habit; entries: Entries }) {
  const [range, setRange] = useState<RangeKey>("90");
  const [width, setWidth] = useState(0);
  const height = 170;
  const today = todayKey();

  const series = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    const from = r.days ? addDays(today, -(r.days - 1)) : "0000-00-00";
    return measurableSeries(entries, habit.id, from, today);
  }, [entries, habit.id, range, today]);

  const sum = seriesSummary(series);
  const unit = habit.unit ? ` ${habit.unit}` : "";
  const target = habit.target && habit.target > 0 ? habit.target : null;

  const padL = 34;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = height - padT - padB;

  const geo = useMemo(() => {
    if (series.length === 0) return null;
    const vals = series.map((p) => p.value).concat(target != null ? [target] : []);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
    const t0 = fromKey(series[0].dateKey).getTime();
    const t1 = fromKey(series[series.length - 1].dateKey).getTime();
    const span = Math.max(1, t1 - t0);
    const x = (k: string) =>
      series.length === 1 ? padL + innerW / 2 : padL + ((fromKey(k).getTime() - t0) / span) * innerW;
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * innerH;
    const pts = series.map((p) => ({ x: x(p.dateKey), y: y(p.value) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area =
      pts.length > 1
        ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${padT + innerH} L${pts[0].x.toFixed(1)},${padT + innerH} Z`
        : "";
    const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
    const xLabels =
      series.length > 1
        ? [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]]
        : [series[0]];
    return { x, y, pts, line, area, ticks, xLabels };
  }, [series, target, innerW, innerH]);

  const fmtDate = (k: string) => {
    const d = fromKey(k);
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.head}>
        <View>
          <Text style={styles.big}>
            {sum.last != null ? formatAmount(sum.last) : "—"}
            <Text style={styles.unit}>{unit}</Text>
          </Text>
          {sum.delta != null && series.length > 1 && (
            <Text style={[styles.delta, { color: deltaColor(sum.delta, habit, target) }]}>
              {sum.delta > 0 ? "▲" : sum.delta < 0 ? "▼" : "•"} {formatAmount(Math.abs(sum.delta))}
              {unit} since {fmtDate(series[0].dateKey)}
            </Text>
          )}
        </View>
        <View style={styles.ranges}>
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.rangeBtn, range === r.key && { backgroundColor: habit.color + "33" }]}
            >
              <Text style={{ color: range === r.key ? C.text : C.faint, fontSize: 11, fontWeight: "700" }}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && geo && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`g-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={habit.color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={habit.color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {geo.ticks.map((t, i) => (
              <Line key={i} x1={padL} x2={width - padR} y1={geo.y(t)} y2={geo.y(t)} stroke={C.border} strokeWidth={1} />
            ))}
            {geo.ticks.map((t, i) => (
              <SvgText key={`t${i}`} x={padL - 6} y={geo.y(t) + 3} fontSize={9} fill={C.faint} textAnchor="end">
                {formatAmount(t, 1)}
              </SvgText>
            ))}
            {target != null && (
              <Line
                x1={padL}
                x2={width - padR}
                y1={geo.y(target)}
                y2={geo.y(target)}
                stroke={C.dim}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
            {geo.area ? <Path d={geo.area} fill={`url(#g-${habit.id})`} /> : null}
            <Path d={geo.line} stroke={habit.color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {geo.pts.length <= 45 &&
              geo.pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={2.6} fill={habit.color} />)}
            {geo.pts.length > 45 && (
              <Circle cx={geo.pts[geo.pts.length - 1].x} cy={geo.pts[geo.pts.length - 1].y} r={3.5} fill={habit.color} />
            )}
            {geo.xLabels.map((p, i) => (
              <SvgText
                key={`x${i}`}
                x={geo.x(p.dateKey)}
                y={height - 6}
                fontSize={9}
                fill={C.faint}
                textAnchor={geo.xLabels.length === 1 ? "middle" : i === 0 ? "start" : i === geo.xLabels.length - 1 ? "end" : "middle"}
              >
                {fmtDate(p.dateKey)}
              </SvgText>
            ))}
          </Svg>
        )}
        {width > 0 && !geo && (
          <View style={styles.empty}>
            <Text style={{ color: C.faint, fontSize: 13 }}>No entries in this range yet.</Text>
          </View>
        )}
      </View>

      {sum.min != null && series.length > 1 && (
        <View style={styles.stats}>
          <Stat label="Low" value={`${formatAmount(sum.min)}${unit}`} />
          <Stat label="High" value={`${formatAmount(sum.max!)}${unit}`} />
          <Stat label="Entries" value={String(series.length)} />
          {target != null && <Stat label="Target" value={`${formatAmount(target)}${unit}`} />}
        </View>
      )}
    </View>
  );
}

/** Green when moving toward the goal, amber away from it, neutral without a target. */
function deltaColor(delta: number, habit: Habit, target: number | null): string {
  if (delta === 0 || target == null) return C.dim;
  const good = habit.type === "quit" ? delta < 0 : delta > 0;
  return good ? C.accent : C.amber;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.faint, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  big: { color: C.text, fontSize: 24, fontWeight: "800" },
  unit: { color: C.dim, fontSize: 14, fontWeight: "600" },
  delta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  ranges: { flexDirection: "row", gap: 4, backgroundColor: C.elev2, borderRadius: 10, padding: 3 },
  rangeBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: C.border },
  stats: { flexDirection: "row", gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.border },
});
