export const C = {
  bg: "#0a0f1e",
  elev: "#111a30",
  elev2: "#16203a",
  border: "#1f2b47",
  text: "#eef2ff",
  dim: "#9fb0d0",
  faint: "#64748b",
  accent: "#34d399",
  accent2: "#f472b6",
  danger: "#f87171",
  amber: "#f59e0b",
};

export function pct(v: number): string {
  return `${(v * 100).toFixed(v > 0 && v < 0.01 ? 2 : v === 1 ? 0 : 1)}%`;
}
