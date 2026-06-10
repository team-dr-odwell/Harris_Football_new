-- ===================================================================
-- OWFC Harris — multi-child family accounts (siblings / twins)
-- One login (one parent profile) can be linked to MORE THAN ONE child.
--   profiles.player_ids -> [playerId, ...] all the family's children
--   profiles.player_id  -> kept as the "active" child (for the personal home)
-- Existing single-child accounts are backfilled so nothing breaks.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table profiles add column if not exists player_ids jsonb default '[]'::jsonb;

-- backfill: an existing account linked to one child gets that child in the list
update profiles
   set player_ids = jsonb_build_array(player_id)
 where player_id is not null
   and (player_ids is null or player_ids = '[]'::jsonb);
