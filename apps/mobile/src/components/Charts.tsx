import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { C } from "../lib/theme";

export interface Series {
  color: string;
  values: (number | null)[];
  label: string;
}

export function LineChart({
  series,
  labels,
  width,
  height = 180,
  area = true,
}: {
  series: Series[];
  labels: string[];
  width: number;
  height?: number;
  area?: boolean;
}) {
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const n = labels.length;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padT + innerH * (1 - Math.max(0, Math.min(1, v)));
  const gridY = [0, 0.25, 0.5, 0.75, 1];

  const linePath = (values: (number | null)[]) => {
    let d = "";
    let started = false;
    values.forEach((v, i) => {
      if (v === null) {
        started = false;
        return;
      }
      d += `${started ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      started = true;
    });
    return d.trim();
  };

  const areaPath = (values: (number | null)[]) => {
    let d = "";
    let runStart = -1;
    const close = (end: number) => {
      if (runStart < 0) return;
      d += `L${x(end).toFixed(1)},${y(0).toFixed(1)} L${x(runStart).toFixed(1)},${y(0).toFixed(1)} Z `;
      runStart = -1;
    };
    values.forEach((v, i) => {
      if (v === null) {
        close(i - 1);
        return;
      }
      if (runStart < 0) {
        runStart = i;
        d += `M${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      } else {
        d += `L${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      }
    });
    close(values.length - 1);
    return d.trim();
  };

  return (
    <View>
      {series.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 6 }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ color: C.dim, fontSize: 12 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
      <Svg width={width} height={height}>
        <Defs>
          {series.map((s, i) => (
            <LinearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity="0.35" />
              <Stop offset="1" stopColor={s.color} stopOpacity="0" />
            </LinearGradient>
          ))}
        </Defs>
        {gridY.map((g) => (
          <Line key={g} x1={padL} x2={width - padR} y1={y(g)} y2={y(g)} stroke={C.border} strokeWidth={1} />
        ))}
        {gridY.map((g) => (
          <SvgText key={`t${g}`} x={padL - 6} y={y(g) + 4} fontSize={9} fill={C.faint} textAnchor="end">
            {Math.round(g * 100)}
          </SvgText>
        ))}
        {series.map((s, si) => (
          <React.Fragment key={si}>
            {area && <Path d={areaPath(s.values)} fill={`url(#g${si})`} />}
            <Path d={linePath(s.values)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) =>
              v === null ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />,
            )}
          </React.Fragment>
        ))}
        {labels.map((lab, i) =>
          n > 16 && i % 3 !== 0 ? null : (
            <SvgText key={i} x={x(i)} y={height - 8} fontSize={9} fill={C.faint} textAnchor="middle">
              {lab}
            </SvgText>
          ),
        )}
      </Svg>
    </View>
  );
}
