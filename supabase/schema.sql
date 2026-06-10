-- =====================================================================
--  Calypso — Supabase schema
--  Run this whole file in the Supabase SQL Editor (Dashboard → SQL).
--  Then add your admin email at the bottom where indicated.
-- =====================================================================

-- ---------- Tables ----------

-- Emails that auto-become master admins (active + admin) on signup.
create table if not exists public.admin_emails (
  email text primary key
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  suspension_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

-- Global app controls managed by admins, such as the selected movie/TV player.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Continue Watching / resume progress. (movies use season=0, episode=0)
create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  season integer not null default 0,
  episode integer not null default 0,
  title text,
  poster_path text,
  backdrop_path text,
  progress_seconds double precision not null default 0,
  duration_seconds double precision not null default 0,
  progress_percent double precision not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, media_type, tmdb_id, season, episode)
);
create index if not exists watch_progress_user_idx
  on public.watch_progress (user_id, updated_at desc);

-- Watchlist + Save-for-Later + Favorites (distinguished by list_type).
create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  list_type text not null check (list_type in ('watchlist', 'saved', 'favorite')),
  title text,
  poster_path text,
  created_at timestamptz not null default now(),
  unique (user_id, media_type, tmdb_id, list_type)
);
create index if not exists user_lists_user_idx
  on public.user_lists (user_id, list_type, created_at desc);

-- ---------- New-user trigger ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Admin if the email is explicitly listed, OR if no admin exists yet
  -- (so the very first account to sign up becomes the master admin).
  select
    exists (select 1 from public.admin_emails where lower(email) = lower(new.email))
    or not exists (select 1 from public.profiles where role = 'admin')
  into is_admin;

  insert into public.profiles (id, email, display_name, role, status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when is_admin then 'admin' else 'user' end,
    case when is_admin then 'active' else 'pending' end,
    case when is_admin then now() else null end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.watch_progress enable row level security;
alter table public.user_lists enable row level security;

-- profiles: read own row; update only display_name / avatar_url on own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- watch_progress: full CRUD on own rows.
drop policy if exists "progress_all_own" on public.watch_progress;
create policy "progress_all_own" on public.watch_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_lists: full CRUD on own rows.
drop policy if exists "lists_all_own" on public.user_lists;
create policy "lists_all_own" on public.user_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Grants ----------
-- Users cannot change their own role/status/suspension_note (that's admin-only,
-- done via the service-role key). Restrict updatable columns to safe ones.
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.app_settings to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.watch_progress to authenticated;
grant select, insert, update, delete on public.user_lists to authenticated;

-- ---------- Realtime (live suspension/approval) ----------
alter table public.profiles replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- =====================================================================
--  The FIRST account to sign up automatically becomes the master admin.
--  To pre-designate additional admin emails, uncomment and edit:
-- =====================================================================
-- insert into public.admin_emails (email)
-- values ('you@example.com')
-- on conflict do nothing;
