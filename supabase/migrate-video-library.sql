-- ===================================================================
-- OWFC Harris — unified video library
-- Upgrades the drill library into ONE video library (the source of truth).
-- Each video is added once and either shown to the whole TEAM, or assigned
-- to specific CHILDREN by id. Adds a description too.
--   drills.description -> free text shown under the video
--   drills.team        -> true = whole squad (Team Training); false = individual
--   drills.player_ids  -> [playerId, ...] the children it's assigned to
-- Existing drills become team videos (team = true).
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table drills add column if not exists description text;
alter table drills add column if not exists team        boolean default true;
alter table drills add column if not exists player_ids  jsonb   default '[]'::jsonb;

-- anything already in the library is a team video unless changed
update drills set team = true where team is null;
