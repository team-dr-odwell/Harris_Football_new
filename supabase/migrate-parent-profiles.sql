-- ===================================================================
-- OWFC Harris — parent contact profiles
-- Stores each family's parent/guardian contact details (name, relation,
-- email, mobile) so coaches can reach them. Collected on first login.
--   profiles.parents → list of {name, relation, email, phone}
-- View them in ⚙ Admin → Contacts.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table profiles add column if not exists parents jsonb default '[]'::jsonb;
