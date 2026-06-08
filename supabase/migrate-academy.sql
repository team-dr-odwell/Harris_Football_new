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
