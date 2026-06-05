-- ===================================================================
-- OWFC Harris — auth setup for NAME + password logins
-- Run this once in Supabase (SQL Editor → New query → Run).
-- It (1) gives every login a profile row automatically, and
-- (2) lets each parent save which player (child) is theirs.
-- ===================================================================

-- 1. Auto-create a profile row whenever a new login is added
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Backfill profile rows for any logins that already exist
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 3. Let a signed-in parent create/update their OWN profile (to pick their child)
drop policy if exists own_profile_insert on profiles;
create policy own_profile_insert on profiles
  for insert to authenticated with check (id = auth.uid());
-- (the matching UPDATE policy was already created by schema.sql)
