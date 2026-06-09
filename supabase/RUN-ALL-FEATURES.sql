-- =============================================================
-- OWFC Harris — RUN-ALL feature migrations (safe to re-run)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Idempotent: every statement uses IF NOT EXISTS / DROP+CREATE POLICY,
-- so running it more than once is harmless. It does NOT touch your
-- fixtures, squad or results (those data-loaders are separate).
-- =============================================================

-- ======================== migrate-player-stats.sql ========================

-- ===================================================================
-- OWFC Harris — player stat columns
-- Adds "training sessions attended" and "league points" to players.
-- Player cards/profiles now show factual stats (goals, assists, MOTM,
-- training sessions, league points) instead of ability ratings.
-- Manage them in ⚙ Admin → Player stats.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table players add column if not exists sessions int default 0;
alter table players add column if not exists points   int default 0;

-- ======================== migrate-rsvp.sql ========================

-- ===================================================================
-- OWFC Harris — RSVP table for the schedule (training, matches, events)
-- Stores Going / Can't / Need-a-lift per activity, per player.
-- activity_key: "t<date>" (training), "m<id>" (match), "e<id>" (event)
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

create table if not exists rsvp (
  id           bigint generated always as identity primary key,
  activity_key text not null,
  player_id    bigint references players(id) on delete cascade,
  status       text not null,            -- 'yes' | 'no' | 'lift'
  updated_at   timestamptz default now(),
  unique (activity_key, player_id)
);

alter table rsvp enable row level security;
drop policy if exists rsvp_all on rsvp;
create policy rsvp_all on rsvp for all to authenticated using (true) with check (true);

-- ======================== migrate-academy.sql ========================

-- ===================================================================
-- OWFC Harris — Academy & Development
-- Adds per-player development data and the training-drill video library.
--   players.dev      → development progress per skill area (0–100%)
--   players.targets  → "goals to achieve" (list of strings)
--   players.videos   → personalised videos (list of {title,url})
--   drills           → general training-exercise video library
-- Manage via ⚙ Admin → Development and ⚙ Admin → Drill videos.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table players add column if not exists dev     jsonb default '{}'::jsonb;
alter table players add column if not exists targets jsonb default '[]'::jsonb;
alter table players add column if not exists videos  jsonb default '[]'::jsonb;

create table if not exists drills (
  id         bigint generated always as identity primary key,
  title      text not null,
  area       text,
  url        text,
  created_at timestamptz default now()
);

alter table drills enable row level security;
drop policy if exists drills_read on drills;
create policy drills_read on drills for select to authenticated using (true);
drop policy if exists drills_admin on drills;
create policy drills_admin on drills for all to authenticated using (is_admin()) with check (is_admin());

-- ======================== migrate-parent-profiles.sql ========================

-- ===================================================================
-- OWFC Harris — parent contact profiles
-- Stores each family's parent/guardian contact details (name, relation,
-- email, mobile) so coaches can reach them. Collected on first login.
--   profiles.parents → list of {name, relation, email, phone}
-- View them in ⚙ Admin → Contacts.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table profiles add column if not exists parents jsonb default '[]'::jsonb;

-- ======================== migrate-seasons.sql ========================

-- ===================================================================
-- OWFC Harris — multi-season support
-- Adds per-season squad membership + per-season stats to players.
--   players.seasons  → which seasons the player is rostered in, e.g. ["2025/26","2026/27"]
--   players.signed   → approved/registered (unsigned = hidden from parents)
--   players.stats    → per-season stats map, e.g.
--                      {"2025/26": {goals, assists, motm, sessions, points,
--                                   dev, targets, program, videos}}
-- 25/26 stats are backfilled from the existing columns and kept intact.
-- All current players are carried into 2026/27 (remove leavers in Admin → Roster).
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table players add column if not exists seasons jsonb   default '["2025/26","2026/27"]'::jsonb;
alter table players add column if not exists signed  boolean  default true;
alter table players add column if not exists stats   jsonb    default '{}'::jsonb;

-- Carry every current player into both seasons and mark them signed.
update players set seasons = '["2025/26","2026/27"]'::jsonb where seasons is null;
update players set signed  = true                          where signed  is null;

-- Backfill the 2025/26 stats snapshot from the existing flat columns
-- (only where it hasn't already been set, so it is safe to re-run).
update players set stats = jsonb_build_object(
  '2025/26', jsonb_build_object(
    'goals',    coalesce(goals,0),
    'assists',  coalesce(assists,0),
    'motm',     coalesce(motm,0),
    'sessions', coalesce(sessions,0),
    'points',   coalesce(points,0),
    'dev',      coalesce(dev,     '{}'::jsonb),
    'targets',  coalesce(targets, '[]'::jsonb),
    'program',  coalesce(program, '[]'::jsonb),
    'videos',   coalesce(videos,  '[]'::jsonb)
  )
)
where stats is null or stats = '{}'::jsonb;

-- ======================== migrate-training-videos.sql ========================

-- ===================================================================
-- OWFC Harris — attach drill videos to a training session
-- Lets coaches pick videos from the stock drill library and pin them to a
-- specific upcoming session so the whole team can see what they'll be doing.
--   training_sessions.videos → [{title, url, area}] (copied from the library)
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table training_sessions add column if not exists videos jsonb default '[]'::jsonb;

-- ======================== migrate-points.sql ========================

-- ===================================================================
-- OWFC Harris — league points ledger
-- Every point a player earns is one row here, so the league total is just
-- the sum of a player's rows for the season. Sources write rows:
--   goal/assist/motm/cleansheet  -> from match results
--   attendance/performance       -> from the training register
--   quiz                         -> weekly quiz (1 per correct answer)
--   video                        -> watching a coach's video (2 first, +1 rewatch)
--   challenge                    -> fun/home challenges (incl. make-your-bed)
--   manual                       -> coach adjustments (perfect month, bottom-of-league, etc.)
-- `ref` is a unique key so the same thing is never counted twice.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

create table if not exists point_events (
  id         bigint generated always as identity primary key,
  player_id  bigint references players(id) on delete cascade,
  season     text not null,
  category   text not null,
  points     int  not null default 0,
  note       text,
  ref        text,
  created_at timestamptz default now()
);

create unique index if not exists point_events_ref_uniq on point_events(ref) where ref is not null;
create index if not exists point_events_player_idx on point_events(player_id, season);

alter table point_events enable row level security;

-- Everyone signed in can read the ledger (needed for the league table).
drop policy if exists pe_read on point_events;
create policy pe_read on point_events for select to authenticated using (true);

-- Admins can do anything.
drop policy if exists pe_admin on point_events;
create policy pe_admin on point_events for all to authenticated using (is_admin()) with check (is_admin());

-- A parent may add quiz / video / challenge points for THEIR OWN child only.
drop policy if exists pe_self_insert on point_events;
create policy pe_self_insert on point_events for insert to authenticated
  with check (
    category in ('quiz','video','challenge')
    and player_id = (select player_id from profiles where id = auth.uid())
  );

-- ======================== migrate-quiz.sql ========================

-- ===================================================================
-- OWFC Harris — weekly quiz overrides
-- The quiz refreshes automatically each week (rotated from the in-app bank).
-- This table lets a coach OVERRIDE a given week's questions from
-- Admin → Quiz. One row per ISO week (e.g. "2026-W24").
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

create table if not exists quizzes (
  week       text primary key,
  questions  jsonb default '[]'::jsonb,
  season     text,
  updated_at timestamptz default now()
);

alter table quizzes enable row level security;

drop policy if exists quizzes_read on quizzes;
create policy quizzes_read on quizzes for select to authenticated using (true);

drop policy if exists quizzes_admin on quizzes;
create policy quizzes_admin on quizzes for all to authenticated using (is_admin()) with check (is_admin());

-- ======================== migrate-appearances.sql ========================

-- ===================================================================
-- OWFC Harris — match appearances (who actually played)
-- Stores the list of players who featured in each game, set on the
-- Enter result screen. Used to show each player's appearance count.
--   fixtures.lineup -> [playerId, ...]
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table fixtures add column if not exists lineup jsonb default '[]'::jsonb;

-- ======================== migrate-security.sql ========================

-- ===================================================================
-- OWFC Harris — data lockdown (safeguarding)
-- Goal: parent contact details (profiles.parents = emails + phone numbers)
-- must ONLY be visible to that family and to admins/coaches — never to other
-- logged-in families. This tightens the profiles table policies.
--
-- IMPORTANT — also do this in the dashboard (cannot be done in SQL):
--   Supabase → Authentication → Sign In / Providers → Email →
--   turn OFF "Allow new users to sign up".
--   New families should be created by you (coach), not self-registered.
--
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table profiles enable row level security;

-- Read: only your own profile, or admins can read all (Contacts screen).
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_self on profiles;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());

-- Insert: only your own row (first-login onboarding).
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid() or is_admin());

-- Update: your own row, or admins.
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Sanity reminder: players/fixtures/etc. are readable by all signed-in members
-- (names + squad numbers only). The sensitive personal data lives in
-- profiles.parents, which the policies above now protect.
