# Habit Tracker

A minimal, **mobile-first** habit tracker — the digital version of a personal
habit-tracking spreadsheet, with ideas borrowed from the best habit apps (HabitKit,
Streaks, TickTick, Habitify, HabitNow). It ships as **two apps that share one core**:

- **Web** — a Next.js PWA (`apps/web`)
- **Mobile** — a native iOS/Android app built with Expo / React Native (`apps/mobile`)

Both store data in **Supabase** (Postgres) behind email auth and cache it locally, so
each app keeps working **offline** and syncs when back online.

## Monorepo layout

```
habit-tracker/
├─ apps/
│  ├─ web/      Next.js 16 app (PWA)
│  └─ mobile/   Expo (React Native) app
├─ packages/
│  └─ core/     shared domain logic (types, dates, stats, streaks) — @habit/core
└─ supabase/
   └─ schema.sql   database tables + Row Level Security
```

`@habit/core` holds all the platform-agnostic logic (habit scheduling, streaks,
month/year aggregation, mindset score) so the web and mobile apps compute everything
identically. Each app implements its own UI, storage (localStorage vs AsyncStorage),
and Supabase client, plus a small offline outbox that replays changes to the cloud.

## Features (both apps)

- **Today** — one-tap check-in, per-habit 🔥 streaks, progress ring, mood & motivation.
- **Month** — the spreadsheet-style grid (habits × days), month/year selector, per-day
  Done/% tallies, daily-progress chart, per-habit analysis, best-streak highlights.
- **Year** — 12 month cards (habits, completed, progress %, mindset) + a trend chart.
- **Habits** — add / edit / delete, reorder, custom emoji + color, **build** vs **quit**,
  flexible schedule (daily / specific weekdays / X-per-week), GitHub-style heatmaps.
- **Offline-first + cloud sync** across devices via Supabase.

## 1. Backend setup (Supabase) — shared by both apps

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it.
   This creates the `habits`, `entries`, and `mental` tables with Row Level Security.
3. **Authentication → Providers**: keep **Email** enabled.
   - **Both web and mobile** sign in with a **6-digit email code** (OTP) — same flow
     everywhere, no deep links or redirect URLs to configure.
   - Make the code appear in the email: **Authentication → Email Templates → Magic Link**,
     and include `{{ .Token }}` in the template body (e.g. `Your code: {{ .Token }}`).
4. **Project Settings → API**: copy the **Project URL** and **anon public key**.

## 2. Install (root, npm workspaces)

```bash
npm install
```

## 3. Run the web app

```bash
cd apps/web
cp .env.local.example .env.local     # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
npm run dev                          # http://localhost:3000
```

(or from the root: `npm run dev`). Without env vars the web app runs in local-only mode.

## 4. Run the mobile app

```bash
cd apps/mobile
cp .env.example .env                 # fill in EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
npx expo start                       # scan the QR code with Expo Go
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
  Set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS secrets, and
  fill `expo.extra.eas.projectId` in `app.json` (created by `eas build:configure`).

## Data & sync

Client state is one JSON object (see `packages/core/src/types.ts`), mirrored to three
Supabase tables (see `supabase/schema.sql`):

- `habits` — habit definitions (name, emoji, color, type, schedule)
- `entries` — completions, one row per `(user, date, habit)`
- `mental` — mood/motivation (0–100), one row per `(user, date)`

On your first sign-in, any habits already stored locally are migrated up to your
account; if the account already has data, the cloud copy becomes the source of truth
across devices.

## Scripts (from the repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the web dev server |
| `npm run build:web` | Production build of the web app |
| `npm run lint:web` | Lint the web app |
| `npm run mobile` | Start the Expo dev server |
| `npm run typecheck` | Type-check the shared core + web |
