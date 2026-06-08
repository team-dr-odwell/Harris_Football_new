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
