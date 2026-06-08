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
