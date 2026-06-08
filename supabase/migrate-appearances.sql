-- ===================================================================
-- OWFC Harris — match appearances (who actually played)
-- Stores the list of players who featured in each game, set on the
-- Enter result screen. Used to show each player's appearance count.
--   fixtures.lineup -> [playerId, ...]
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table fixtures add column if not exists lineup jsonb default '[]'::jsonb;
