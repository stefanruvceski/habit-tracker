-- Habit Tracker — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
--
-- Auth itself needs NO tables — Supabase manages users in `auth.users`.
-- These tables are for syncing each user's app data to the cloud later. The
-- app currently stores data locally; once sync is wired up it will read/write
-- these rows. Creating them now means the backend is ready.
--
-- Design: one row per (user, key). `key` is one of 'app' | 'finance' |
-- 'reminders', and `data` is the JSON document that matches the app's local
-- store shape. This maps 1:1 to the existing local stores, so migration is a
-- straight copy. Row Level Security ensures each user only sees their own rows.

-- ---------------------------------------------------------------------------
-- Optional: a lightweight profile row per user (handy for display later).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Per-user app data documents (for future cloud sync).
-- ---------------------------------------------------------------------------
create table if not exists public.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (key in ('app', 'finance', 'reminders')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

drop policy if exists "user_data: own rows" on public.user_data;
create policy "user_data: own rows"
  on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh on every write (used for last-write-wins sync later).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before update on public.user_data
  for each row execute function public.touch_updated_at();
