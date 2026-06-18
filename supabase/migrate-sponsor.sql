-- ===================================================================
-- OWFC Harris — Sponsor login role
-- Adds a GDPR-restricted "sponsor" flag to profiles. A sponsor login can
-- ONLY see the public Sponsor page and the About page — never any child
-- data (no Squad, Academy, Family, Admin, player cards or stats).
--
-- After running this:
--   1) Create the sponsor's auth user in Supabase (Authentication → Users).
--   2) Set their profile row's is_sponsor = true, e.g.:
--        update public.profiles set is_sponsor = true where id = '<auth-user-uuid>';
--   3) Drop the logo file at assets/cool365.png (optional — page degrades
--      gracefully to a "COOL 365" text fallback if the image is missing).
-- ===================================================================
alter table public.profiles add column if not exists is_sponsor boolean default false;
comment on column public.profiles.is_sponsor is 'GDPR-restricted sponsor login: may view ONLY the Sponsor and About pages; never any child data.';
