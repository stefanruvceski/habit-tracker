"use client";

import { useId } from "react";

export interface Series {
  color: string;
  values: (number | null)[]; // 0..1, null = gap
  label: string;
}

/**
 * Lightweight responsive multi-series line/area chart drawn with SVG.
 * Values are expected in 0..1 range.
 */
export function LineChart({
  series,
  labels,
  height = 200,
  area = true,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  area?: boolean;
}) {
  const uid = useId().replace(/[:]/g, "");
  const W = 1000;
  const H = 320;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const n = labels.length;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padT + innerH * (1 - Math.max(0, Math.min(1, v)));

  const gridY = [0, 0.25, 0.5, 0.75, 1];

  function pathFor(values: (number | null)[]): string {
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
  }

  function areaFor(values: (number | null)[]): string {
    // Build area only across contiguous non-null runs.
    let d = "";
    let runStart = -1;
    const closeRun = (endIdx: number) => {
      if (runStart < 0) return;
      d += `L${x(endIdx).toFixed(1)},${y(0).toFixed(1)} `;
      d += `L${x(runStart).toFixed(1)},${y(0).toFixed(1)} Z `;
      runStart = -1;
    };
    values.forEach((v, i) => {
      if (v === null) {
        closeRun(i - 1);
        return;
      }
      if (runStart < 0) {
        runStart = i;
        d += `M${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      } else {
        d += `L${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      }
    });
    closeRun(values.length - 1);
    return d.trim();
  }

  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4 justify-center mb-2">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-text-dim">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
      >
        {gridY.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y(g) + 4}
              textAnchor="end"
              fontSize="16"
              fill="var(--text-faint)"
            >
              {Math.round(g * 100)}%
            </text>
          </g>
        ))}

        {series.map((s, si) => (
          <g key={si}>
            {area && (
              <>
                <defs>
                  <linearGradient id={`grad-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaFor(s.values)} fill={`url(#grad-${uid}-${si})`} />
              </>
            )}
            <path
              d={pathFor(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) =>
              v === null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={s.color} />
              ),
            )}
          </g>
        ))}

        {labels.map((lab, i) =>
          n > 20 && i % 2 === 1 ? null : (
            <text
              key={i}
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="15"
              fill="var(--text-faint)"
            >
              {lab}
            </text>
          ),
        )}
      </svg>
    </div>
  );
}
