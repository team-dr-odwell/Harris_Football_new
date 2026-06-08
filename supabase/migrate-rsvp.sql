-- ===================================================================
-- OWFC Harris — RSVP table for the schedule (training, matches, events)
-- Stores Going / Can't / Need-a-lift per activity, per player.
-- activity_key: "t<date>" (training), "m<id>" (match), "e<id>" (event)
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

create table if not exists rsvp (
  id           bigint generated always as identity primary key,
  activity_key text not null,
  player_id    bigint references players(id) on delete cascade,
  status       text not null,            -- 'yes' | 'no' | 'lift'
  updated_at   timestamptz default now(),
  unique (activity_key, player_id)
);

alter table rsvp enable row level security;
drop policy if exists rsvp_all on rsvp;
create policy rsvp_all on rsvp for all to authenticated using (true) with check (true);
