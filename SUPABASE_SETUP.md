# Supabase setup (email + code login)

This app uses **email OTP** — the user types their email, Supabase emails a
**6‑digit code**, they type it in, and they're signed in. The same flow both
registers new users and logs in existing ones (no passwords).

Auth works on both the web and mobile apps. Until you complete the steps below
(and set the env vars), the apps run **local‑only** exactly as before — nothing
breaks in production until you're ready.

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
- The **publishable** key (`sb_publishable_…`) under **API Keys**. This is the
  new client key that **replaces the legacy "anon"** key — use the publishable
  one. Both are client-safe (Row Level Security protects the data).

> Never put the **secret** key (`sb_secret_…` / legacy `service_role`) in the
> app or in `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` vars — that key bypasses RLS.

## 3. Turn on email code (OTP) login
1. **Authentication → Providers → Email**: make sure it's **enabled** and
   **"Enable Signups"** is on (so new emails can register).
2. **Authentication → Email Templates → "Magic Link"**: this template is what
   OTP uses. Edit the body so it sends the **code** instead of only a link —
   make sure it contains `{{ .Token }}`, e.g.:

   ```html
   <h2>Your sign-in code</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size:24px;font-weight:bold;letter-spacing:3px">{{ .Token }}</p>
   <p>It expires in 1 hour. If you didn't request it, ignore this email.</p>
   ```
3. **Authentication → URL Configuration**: set **Site URL** to your web address
   (e.g. `https://streakli.vercel.app`). (Not strictly required for the code
   flow, but good hygiene.)
4. *(Production)* The built‑in Supabase email sender has **low rate limits** and
   is meant for testing. For real use, set up **custom SMTP** under
   **Authentication → SMTP Settings** (e.g. Resend, Postmark, SendGrid).

## 4. Create the tables
Dashboard → **SQL Editor → New query** → paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

This creates a `profiles` row per user and a `user_data` table for syncing app
data later, both protected by Row Level Security (each user sees only their own
rows). Auth itself needs no tables — Supabase manages users for you.

## 5. Set the environment variables

**Web** — create `apps/web/.env.local` (for local dev) and add the same two
vars on **Vercel**. In the current Vercel UI: **Project → Settings →
Environments → (Production, and also Preview/Development) → Environment
Variables**. The value of the key var is the **publishable** key:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...your-publishable-key...
```

(The var is named `…_ANON_KEY` for continuity, but the value is the publishable
key. If you prefer, you can instead name it `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
— the app reads either.)

**Mobile** — create `apps/mobile/.env` (and set the same in EAS build env):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...your-publishable-key...
```

(`.env*` files are git‑ignored; only the `*.example` files are committed.)

## 6. Deploy
- **Web**: redeploy on Vercel so it picks up the new env vars. Once present, the
  app shows a sign‑in screen; sign in with your email + the code.
- **Mobile**: restart `expo start` (or rebuild with EAS) so `EXPO_PUBLIC_*` is
  embedded.

## What happens after this
Auth is the foundation. Data is still stored **locally per device** for now;
the next step is wiring the local stores to the `user_data` table so your
habits, to‑dos and finances sync across web and phone. The schema is already in
place for that.
