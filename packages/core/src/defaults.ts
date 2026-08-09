import { Habit } from "./types";

/** Palette used for new habits and pickers. Tuned for the dark theme. */
export const PALETTE = [
  "#34d399", // green
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f472b6", // pink
  "#f59e0b", // amber
  "#f87171", // red
  "#22d3ee", // cyan
  "#facc15", // yellow
  "#fb923c", // orange
  "#818cf8", // indigo
];

export const EMOJI_SUGGESTIONS = [
  "🌅", "🏋️", "❄️", "✍️", "📝", "🎧", "🚫", "🥑", "📵", "🍺",
  "💧", "📚", "🧘", "🏃", "🥗", "😴", "🧹", "💊", "🎯", "🙏",
  "🚭", "📖", "🎨", "💰", "🌱", "🧠", "☀️", "🌙", "⚡", "🔥",
];

let seq = 0;
export function newId(): string {
  seq += 1;
  return `h_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Seed habits mirroring the user's original spreadsheet, so it feels familiar. */
export function seedHabits(): Habit[] {
  const now = new Date().toISOString();
  // [name, built-in icon id, fallback emoji, type]
  const defs: Array<[string, string, string, Habit["type"]]> = [
    ["Early start", "sunrise", "🌅", "build"],
    ["Gym or movement", "dumbbell", "🏋️", "build"],
    ["Cold shower", "cold", "❄️", "build"],
    ["Journal", "journal", "✍️", "build"],
    ["Plan top 3", "checklist", "📝", "build"],
    ["Deep work", "headphones", "🎧", "build"],
    ["No socials AM", "no-phone", "📵", "quit"],
    ["Eat clean", "salad", "🥑", "build"],
    ["Screen free evening", "no-tv", "📺", "quit"],
    ["Alcohol free", "no-alcohol", "🍺", "quit"],
  ];
  return defs.map(([name, icon, emoji, type], i) => ({
    id: newId(),
    name,
    icon,
    emoji,
    color: PALETTE[i % PALETTE.length],
    type,
    schedule: { type: "daily" as const },
    archived: false,
    order: i,
    createdAt: now,
  }));
}
