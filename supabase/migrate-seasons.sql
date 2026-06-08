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
