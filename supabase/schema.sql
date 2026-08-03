-- Crimson Rep -- Supabase schema
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New
-- query -> paste this whole file -> Run). It creates one table per data
-- domain the app used to keep in localStorage, all scoped to auth.uid()
-- via row-level security so a user can only ever read/write their own rows.
--
-- Auth itself needs no table here -- Supabase's built-in auth.users handles
-- signup/login, and every table below just references auth.users(id).
--
-- Safe to run more than once: every CREATE TABLE uses IF NOT EXISTS, and
-- every policy is dropped first (IF EXISTS) before being recreated, since
-- Postgres has no CREATE POLICY IF NOT EXISTS -- re-running this without
-- the DROP would fail on "policy already exists" for every table.

create extension if not exists pgcrypto;

-- ---------- profiles (Split Builder questionnaire answers + profile card) ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age integer,
  bodyweight numeric,
  bodyweight_unit text,
  sex text,
  days_per_week integer,
  training_weekdays jsonb,
  time_per_session integer,
  experience_level text,
  name text,
  profile_picture_type text,
  profile_picture_url text,
  preset_avatar_id text,
  updated_at timestamptz not null default now()
);

-- ADD COLUMN IF NOT EXISTS so this is safe to re-run against a profiles
-- table that already existed before the profile card feature did.
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists profile_picture_type text;
alter table public.profiles add column if not exists profile_picture_url text;
alter table public.profiles add column if not exists preset_avatar_id text;

alter table public.profiles enable row level security;
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- entries (logged sets / 1RM history) ----------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lift text not null,
  weight numeric not null,
  reps integer not null,
  unit text not null,
  estimated_1rm numeric not null,
  epley numeric,
  brzycki numeric,
  lombardi numeric,
  bodyweight numeric,
  sex text,
  added_weight numeric,
  date timestamptz not null default now()
);

alter table public.entries enable row level security;
drop policy if exists "entries_owner" on public.entries;
create policy "entries_owner" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists entries_user_id_idx on public.entries (user_id);

-- ---------- settings (display unit + last-used form defaults + tour flags) ----------
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_unit text,
  form_defaults jsonb,
  tour_seen boolean not null default false,
  achievement_tour_seen boolean not null default false
);

-- ADD COLUMN IF NOT EXISTS so this is safe to re-run against a settings
-- table that already existed before the achievement mini-tour did.
alter table public.settings add column if not exists achievement_tour_seen boolean not null default false;

alter table public.settings enable row level security;
drop policy if exists "settings_owner" on public.settings;
create policy "settings_owner" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- splits (Build My Split's generated weekly plan) ----------
create table if not exists public.splits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  days jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.splits enable row level security;
drop policy if exists "splits_owner" on public.splits;
create policy "splits_owner" on public.splits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- completions (per-calendar-date workout completion log) ----------
create table if not exists public.completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  day_of_week integer,
  completed boolean not null default false,
  primary key (user_id, date)
);

alter table public.completions enable row level security;
drop policy if exists "completions_owner" on public.completions;
create policy "completions_owner" on public.completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- streaks ----------
create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer not null default 0,
  credited_dates jsonb not null default '{}'::jsonb,
  last_checked_date_key text
);

alter table public.streaks enable row level security;
drop policy if exists "streaks_owner" on public.streaks;
create policy "streaks_owner" on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- bodyweight_log ----------
create table if not exists public.bodyweight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  weight numeric not null,
  unit text not null
);

alter table public.bodyweight_log enable row level security;
drop policy if exists "bodyweight_log_owner" on public.bodyweight_log;
create policy "bodyweight_log_owner" on public.bodyweight_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists bodyweight_log_user_id_idx on public.bodyweight_log (user_id);

-- ---------- goals (single active goal per user; absent row = no goal set) ----------
create table if not exists public.goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  type text not null,
  direction text,
  amount numeric,
  start_weight numeric,
  target_weight numeric not null,
  unit text not null,
  lift text,
  created_at timestamptz not null default now(),
  achieved boolean not null default false,
  achieved_at timestamptz
);

alter table public.goals enable row level security;
drop policy if exists "goals_owner" on public.goals;
create policy "goals_owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- achievements (archived reached goals -- never deleted when a new goal starts) ----------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  lift text,
  direction text,
  start_value numeric,
  target_value numeric not null,
  amount numeric,
  unit text not null,
  achieved_at timestamptz not null,
  tier text not null
);

alter table public.achievements enable row level security;
drop policy if exists "achievements_owner" on public.achievements;
create policy "achievements_owner" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists achievements_user_id_idx on public.achievements (user_id);

-- ---------- themes (Settings page appearance customization) ----------
create table if not exists public.themes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bg text,
  surface text,
  accent text,
  text_color text,
  density text,
  view_style text,
  font_size text
);

alter table public.themes enable row level security;
drop policy if exists "themes_owner" on public.themes;
create policy "themes_owner" on public.themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- user_added_exercises (tracks which curated-pool exercises this
-- user has added to their own picker -- the pool's own data (names,
-- muscles, standards, descriptions) lives in code, not here) ----------
create table if not exists public.user_added_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, exercise_key)
);

alter table public.user_added_exercises enable row level security;
drop policy if exists "user_added_exercises_owner" on public.user_added_exercises;
create policy "user_added_exercises_owner" on public.user_added_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- user_custom_exercises (genuinely custom exercises a user typed
-- in that weren't found in the curated pool -- no standards data, ever) ----------
create table if not exists public.user_custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  primary_muscle text not null,
  secondary_muscle text,
  description text,
  pattern text,
  created_at timestamptz not null default now()
);

alter table public.user_custom_exercises enable row level security;
drop policy if exists "user_custom_exercises_owner" on public.user_custom_exercises;
create policy "user_custom_exercises_owner" on public.user_custom_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_custom_exercises_user_id_idx on public.user_custom_exercises (user_id);

-- ---------- profile-photos storage bucket (uploaded profile pictures) ----------
-- Private bucket -- there is no public URL for these files. The app always
-- fetches a short-lived signed URL (App.Storage.getProfilePhotoUrl) to
-- display a photo, and only ever does that for the signed-in user's own
-- profile, so nobody else's photo is ever requested through the app. Each
-- user's photo is stored at a fixed path "<user_id>/photo" (no extension --
-- the real image type travels in the object's contentType instead), so a
-- re-upload always replaces the previous file rather than leaving orphans.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- storage.foldername(name) splits the object path on "/" -- for a path like
-- "<user_id>/photo" this returns an array whose first element is the
-- <user_id> segment, which is what every policy below checks against
-- auth.uid(). If your bucket insert above fails with a permissions error,
-- create the bucket instead via Dashboard -> Storage -> New bucket, name
-- "profile-photos", Public OFF -- then just run the four policies below.
drop policy if exists "profile_photos_select_own" on storage.objects;
create policy "profile_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- verification ----------
-- Run this separately after the script above to confirm, from Postgres's
-- own catalog (not the SQL Editor's pre-run warning banner, which can fire
-- on partial/re-runs or stale query text rather than the actual state of
-- your database). Every row here should show rowsecurity = true.
--
-- select schemaname, tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;
