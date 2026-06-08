-- ===================================================================
-- OWFC Harris — league points ledger
-- Every point a player earns is one row here, so the league total is just
-- the sum of a player's rows for the season. Sources write rows:
--   goal/assist/motm/cleansheet  -> from match results
--   attendance/performance       -> from the training register
--   quiz                         -> weekly quiz (1 per correct answer)
--   video                        -> watching a coach's video (2 first, +1 rewatch)
--   challenge                    -> fun/home challenges (incl. make-your-bed)
--   manual                       -> coach adjustments (perfect month, bottom-of-league, etc.)
-- `ref` is a unique key so the same thing is never counted twice.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

create table if not exists point_events (
  id         bigint generated always as identity primary key,
  player_id  bigint references players(id) on delete cascade,
  season     text not null,
  category   text not null,
  points     int  not null default 0,
  note       text,
  ref        text,
  created_at timestamptz default now()
);

create unique index if not exists point_events_ref_uniq on point_events(ref) where ref is not null;
create index if not exists point_events_player_idx on point_events(player_id, season);

alter table point_events enable row level security;

-- Everyone signed in can read the ledger (needed for the league table).
drop policy if exists pe_read on point_events;
create policy pe_read on point_events for select to authenticated using (true);

-- Admins can do anything.
drop policy if exists pe_admin on point_events;
create policy pe_admin on point_events for all to authenticated using (is_admin()) with check (is_admin());

-- A parent may add quiz / video / challenge points for THEIR OWN child only.
drop policy if exists pe_self_insert on point_events;
create policy pe_self_insert on point_events for insert to authenticated
  with check (
    category in ('quiz','video','challenge')
    and player_id = (select player_id from profiles where id = auth.uid())
  );
