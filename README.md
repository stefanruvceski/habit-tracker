# Habit Tracker

A minimal, **mobile-first** habit tracker — the digital version of a personal
habit-tracking spreadsheet, with ideas borrowed from the best habit apps (HabitKit,
Streaks, TickTick, Habitify, HabitNow). It ships as **two apps that share one core**:

- **Web** — a Next.js PWA (`apps/web`)
- **Mobile** — a native iOS/Android app built with Expo / React Native (`apps/mobile`)

Data is stored **on the device** (browser `localStorage` on web, `AsyncStorage` on
mobile). Cloud sync across devices (Supabase) is added in a follow-up.

## Monorepo layout

```
habit-tracker/
├─ apps/
│  ├─ web/      Next.js 16 app (PWA)
│  └─ mobile/   Expo (React Native) app
└─ packages/
   └─ core/     shared domain logic (types, dates, stats, streaks) — @habit/core
```

`@habit/core` holds all the platform-agnostic logic (habit scheduling, streaks,
month/year aggregation, mindset score) so the web and mobile apps compute everything
identically. Each app implements its own UI and local storage.

## Features (both apps)

- **Today** — one-tap check-in, per-habit 🔥 streaks, progress ring, mood & motivation.
- **Month** — the spreadsheet-style grid (habits × days), month/year selector, per-day
  Done/% tallies, daily-progress chart, per-habit analysis, best-streak highlights.
- **Year** — 12 month cards (habits, completed, progress %, mindset) + a trend chart.
- **Habits** — add / edit / delete, reorder, custom emoji + color, **build** vs **quit**,
  flexible schedule (daily / specific weekdays / X-per-week), GitHub-style heatmaps.

## Install (root, npm workspaces)

```bash
npm install
```

## Run the web app

```bash
npm run dev          # http://localhost:3000
```

Build for production:

```bash
npm run build:web
```

## Run the mobile app

```bash
cd apps/mobile
npx expo start       # scan the QR code with Expo Go
```

- **Expo Go** (fastest): install *Expo Go* from the App Store / Play Store and scan the
  QR code to run it on your phone immediately.
- **Standalone build** (installable `.apk` / `.ipa`) via [EAS](https://docs.expo.dev/build/setup/):
  ```bash
  npm i -g eas-cli
  eas login
  eas build:configure
  eas build -p android --profile preview   # APK you can sideload
  eas build -p ios --profile preview       # needs an Apple developer account
  ```

## Data model

Client state is one JSON object (see `packages/core/src/types.ts`):

- `habits` — habit definitions (name, emoji, color, type, schedule)
- `entries` — completions keyed by `YYYY-MM-DD` → `{ habitId: true }`
- `mental` — mood/motivation (0–100) keyed by `YYYY-MM-DD`

The first launch seeds a starter set of habits (mirroring the original spreadsheet);
edit or delete them on the **Habits** tab. On web, use **Export / Import** on the
Habits tab to back up or move your data.

## Scripts (from the repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the web dev server |
| `npm run build:web` | Production build of the web app |
| `npm run lint:web` | Lint the web app |
| `npm run mobile` | Start the Expo dev server |
| `npm run typecheck` | Type-check the shared core + web |
