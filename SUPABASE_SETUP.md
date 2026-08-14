# Supabase setup (magic-link login + guest mode)

Signing in is **optional**. Anyone can tap **"Continue as guest"** and use the
whole app with data saved on their own device/browser (this is the original
local-only behavior). Signing in adds **cloud sync** across web and phone.

Sign-in on the **web** uses a **magic link**: the user types their email,
Supabase emails a link, they click it, and they're signed in — no password, no
code to type. This works on Supabase's **free built-in email**, so there's
**nothing to buy and no SMTP to configure** — you only allow-list your site URL
(step 3).

> **Mobile sign-in:** the magic link needs deep-linking back into the native app,
> which isn't wired up yet. On mobile, use **"Continue as guest"** for now (fully
> local). Web sign-in + sync works today.

Until you set the env vars (step 5), the apps run **local-only** exactly as
before — nothing breaks in production until you're ready.

## 1. Create the project
1. Go to <https://supabase.com> → **New project**. Pick a name, a strong DB
   password (you won't need it for this app), and a region close to you.
2. Wait for it to finish provisioning.

## 2. Get your keys — on **supabase.com** (NOT Vercel)
> ⚠️ These live in the **Supabase** dashboard. The "API" section is **not** in
> Vercel — on Vercel you only *paste* these values as env vars (step 5).

Supabase dashboard → your project → **Project Settings → API**. Copy:
- **Project URL** (e.g. `https://abcd1234.supabase.co`). If you only see the
  Project ID, the URL is `https://<PROJECT_ID>.supabase.co`.
- The **publishable** key (`sb_publishable_…`) under **API Keys** — the new
  client key that **replaces the legacy "anon"** key. Both are client-safe (RLS
  protects the data). Never expose the **secret** key (`sb_secret_…` /
  `service_role`).

## 3. Turn on email login + allow your site URL
1. **Authentication → Providers → Email**: make sure it's **enabled** and
   **"Enable Signups"** is on (so new emails can register).
2. **Authentication → URL Configuration** — this is the one required step for
   magic links:
   - **Site URL**: your deployed web address, e.g. `https://streakli.vercel.app`.
   - **Redirect URLs**: add your web address(es). Include
     `http://localhost:3000` too if you sign in during local dev.
   The magic link redirects back here, so the URL must be allow-listed or the
   link won't complete sign-in.
3. You **don't** need to edit email templates or set up SMTP for the magic link —
   the default "Magic Link" email already contains the link, and the built-in
   sender delivers it.
4. *(Optional, for scale)* The built-in sender has **low rate limits**. For heavy
   use set up **custom SMTP** under **Authentication → Emails → SMTP Settings**
   (e.g. your Gmail with an App Password, or Resend/Postmark/SendGrid). Custom
   SMTP also unlocks editing templates (e.g. to switch to a 6-digit code).

## 4. Create the tables
Dashboard → **SQL Editor → New query** → paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

This creates a `profiles` row per user and a `user_data` table used for cloud
sync, both protected by Row Level Security (each user sees only their own rows).
Auth itself needs no tables — Supabase manages users for you.

## 5. Set the environment variables

**Web** — create `apps/web/.env.local` (local dev) and add the same vars on
**Vercel → Project → Settings → Environment Variables** (Production + Preview +
Development). The value is the **publishable** key:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...your-publishable-key...
```

**Mobile** — create `apps/mobile/.env` (and set the same in EAS build env):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...your-publishable-key...
```

(The var keeps the `…_ANON_KEY` name for continuity but the value is the
publishable key; the app also accepts `…_SUPABASE_PUBLISHABLE_KEY`.)

(`.env*` files are git-ignored; only the `*.example` files are committed.)

## 6. Deploy
- **Web**: redeploy on Vercel so it picks up the new env vars. The app then shows
  a sign-in screen — enter your email, open the link we email you, and you're in.
  (Or tap **Continue as guest** to skip sign-in.)
- **Mobile**: restart `expo start` (or rebuild with EAS) so `EXPO_PUBLIC_*` is
  embedded. Use **Continue as guest** on mobile for now.

## How sync behaves
When signed in, your habits, to-dos, and finances sync through `user_data`
(one row per user + key, guarded by RLS). On a fresh device the cloud copy wins;
if the cloud is empty it's seeded from that device. Local data is never
overwritten by an empty cloud, so a first sign-in can't wipe anything. Guests
stay fully local (no sync).
