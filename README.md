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

### Android builds (Streakli)

Every push to `main` that touches `apps/mobile` or `packages/core` runs the
**Android APK** workflow (`.github/workflows/android.yml`): tests → `expo prebuild`
→ signed `assembleRelease` (arm64) → GitHub Release `android-b<N>` with
`streakli.apk`. `N` is the Android `versionCode` (the workflow run number).

- The installed app checks those releases and shows an **Update available**
  banner; one tap downloads and installs the new APK (data is kept).
- On the Mac, `~/Documents/Streakli/streakli.sh` installs the newest build over
  Wi-Fi with `adb` (wireless debugging); see the README next to it.
- Signing: secrets `STREAKLI_KEYSTORE_BASE64` + `STREAKLI_KEYSTORE_PASSWORD`
  (alias `streakli`), applied by `apps/mobile/plugins/withReleaseSigning.js`.
  Keep the keystore safe — a different key can't update the installed app.

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
