# Habit Tracker

A minimal, **mobile-first** habit tracker built with Next.js — the web version of a
personal habit-tracking spreadsheet, with ideas borrowed from the best habit apps
(HabitKit, Streaks, TickTick, Habitify, HabitNow).

Everything lives **on your device** (browser `localStorage`) — no account, no server,
no login. Open it in your phone browser and check off your day with one tap. Add it to
your home screen (it's a PWA) and it behaves like an app.

## Features

- **Today view** — one-tap check-in for the day, per-habit streaks, mood & motivation
  sliders, and a progress ring. Step back to log previous days.
- **Month view** — the spreadsheet-style grid (habits × days) you're used to, with a
  month/year selector, per-day Done/% tallies, a daily-progress chart, per-habit
  completion analysis, a mood/motivation chart, and best-streak highlights.
- **Yearly dashboard** — 12 month cards (habits, completed, progress %, mindset score)
  plus a trend chart of progress and mindset across the year.
- **Configurable habits** — add / edit / delete, reorder, custom emoji + color, and
  **build** vs **quit** habits.
- **Flexible scheduling** — daily, specific weekdays, or an *X times per week* target.
- **GitHub-style heatmaps** — a contribution graph per habit (last 26 weeks).
- **Streaks** — current and best streak per habit.
- **Backup** — export/import your whole history as a JSON file to move between devices.

## Tech

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- SVG charts & heatmaps (no chart libraries), so the bundle stays tiny
- State persisted to `localStorage` via a small `useSyncExternalStore` store

## Data model

All state is one JSON object (see `src/lib/types.ts`):

- `habits` — habit definitions (name, emoji, color, type, schedule)
- `entries` — completions keyed by `YYYY-MM-DD` → `{ habitId: true }`
- `mental` — mood/motivation (0–100) keyed by `YYYY-MM-DD`

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production:

```bash
npm run build
npm run start
```

The first launch seeds a starter set of habits (mirroring the original spreadsheet).
Edit or delete them on the **Habits** tab.

## Notes

- Data is local to each browser/device. Use **Export** on the Habits tab to back up,
  and **Import** to restore or move to another phone.
- To deploy, any static-friendly Next.js host works (e.g. Vercel).
