-- =====================================================================
--  Migration: "Remind me" reminders table
--  Run this in the Supabase SQL Editor on an existing project that was
--  created before reminders existed. (Fresh installs already get it from
--  schema.sql.) Safe to run more than once.
-- =====================================================================

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  title text,
  poster_path text,
  backdrop_path text,
  air_date date,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, media_type, tmdb_id)
);
create index if not exists reminders_user_idx
  on public.reminders (user_id, air_date);

alter table public.reminders enable row level security;

drop policy if exists "reminders_all_own" on public.reminders;
create policy "reminders_all_own" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.reminders to authenticated;
