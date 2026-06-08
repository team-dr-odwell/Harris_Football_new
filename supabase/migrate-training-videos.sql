-- ===================================================================
-- OWFC Harris — attach drill videos to a training session
-- Lets coaches pick videos from the stock drill library and pin them to a
-- specific upcoming session so the whole team can see what they'll be doing.
--   training_sessions.videos → [{title, url, area}] (copied from the library)
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table training_sessions add column if not exists videos jsonb default '[]'::jsonb;
