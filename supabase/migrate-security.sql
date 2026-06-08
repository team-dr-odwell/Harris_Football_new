-- ===================================================================
-- OWFC Harris — data lockdown (safeguarding)
-- Goal: parent contact details (profiles.parents = emails + phone numbers)
-- must ONLY be visible to that family and to admins/coaches — never to other
-- logged-in families. This tightens the profiles table policies.
--
-- IMPORTANT — also do this in the dashboard (cannot be done in SQL):
--   Supabase → Authentication → Sign In / Providers → Email →
--   turn OFF "Allow new users to sign up".
--   New families should be created by you (coach), not self-registered.
--
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

alter table profiles enable row level security;

-- Read: only your own profile, or admins can read all (Contacts screen).
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_self on profiles;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());

-- Insert: only your own row (first-login onboarding).
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid() or is_admin());

-- Update: your own row, or admins.
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Sanity reminder: players/fixtures/etc. are readable by all signed-in members
-- (names + squad numbers only). The sensitive personal data lives in
-- profiles.parents, which the policies above now protect.
