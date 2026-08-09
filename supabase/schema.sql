-- Habit Tracker — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) once.
-- It creates the tables, indexes, and Row Level Security policies so each
-- authenticated user can only read/write their own rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.habits (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  emoji       text not null default '🎯',
  color       text not null default '#34d399',
  type        text not null default 'build' check (type in ('build', 'quit')),
  schedule    jsonb not null default '{"type":"daily"}'::jsonb,
  archived    boolean not null default false,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.entries (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  habit_id    uuid not null references public.habits (id) on delete cascade,
  done        boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date, habit_id)
);

create table if not exists public.mental (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  mood        integer not null default 0,
  motivation  integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists habits_user_idx  on public.habits  (user_id);
create index if not exists entries_user_idx on public.entries (user_id);
create index if not exists entries_date_idx on public.entries (user_id, date);
create index if not exists mental_user_idx  on public.mental  (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.habits  enable row level security;
alter table public.entries enable row level security;
alter table public.mental  enable row level security;

-- habits
drop policy if exists "habits owner" on public.habits;
create policy "habits owner" on public.habits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- entries
drop policy if exists "entries owner" on public.entries;
create policy "entries owner" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- mental
drop policy if exists "mental owner" on public.mental;
create policy "mental owner" on public.mental
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
