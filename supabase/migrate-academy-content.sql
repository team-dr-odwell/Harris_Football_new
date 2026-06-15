-- ===================================================================
-- OWFC Harris — Academy CONTENT (Phase 4)
-- Idempotent. Run in Supabase: SQL Editor -> New query -> Run.
--
-- Phase 4 ships the weekly Challenge library, the banded Quiz curriculum,
-- the Skill Ladder coach-check UI and formal Mini-IDPs. Almost all of this
-- is content held in js/data.js or derived from existing tables:
--
--   * Weekly Challenge library  → js/data.js `exercises` (no DB needed).
--   * Quiz curriculum + bands   → js/data.js `quizBank` (no DB needed);
--                                 per-week overrides already use `quizzes`.
--   * Skill Ladder levels       → derived from point_events (category 'skill'),
--                                 the canonical AP source. The skill_levels table
--                                 from migrate-academy-v2.sql is still valid as a
--                                 mirror but is NOT required by the Phase 4 UI.
--
-- The ONLY new schema Phase 4 needs is a per-player Mini-IDP store.
--
-- Depends on: a `players` table (schema.sql) and is_admin() (migrate-points.sql /
-- migrate-security.sql). Safe to run more than once.
-- ===================================================================

-- Mini-IDPs (§5): two focus areas per player per half-term (one Technical + one
-- from another corner), each with a linked drill video and a one-sentence coach
-- feedback slot. Stored keyed by half-term so each window starts fresh and history
-- is kept, e.g.:
--   {
--     "2026/27:ht0": { "focus": [
--        {"corner":"technical","area":"First touch under pressure",
--         "drillUrl":"https://...","drillTitle":"Wall control","feedback":"Much calmer on Sunday!"},
--        {"corner":"physical","area":"Recovery sprints",
--         "drillUrl":"https://...","drillTitle":"","feedback":""}
--     ]}
--   }
alter table players add column if not exists idp jsonb default '{}'::jsonb;

-- RLS: the players table is already readable by all authenticated users and
-- writable only by coaches (is_admin) under existing policies; the idp column
-- inherits those. If your players table has no policies yet, uncomment:
-- alter table players enable row level security;
-- drop policy if exists players_read on players;
-- create policy players_read on players for select to authenticated using (true);
-- drop policy if exists players_admin on players;
-- create policy players_admin on players for all to authenticated using (is_admin()) with check (is_admin());

-- Backfill: ensure no NULL idp values (so the app never has to null-guard).
update players set idp = '{}'::jsonb where idp is null;
