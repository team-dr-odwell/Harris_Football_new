-- ===================================================================
-- Harris Academy — automated development-progress mechanic
-- Creates the video_reflections table that backs the "watch a video,
-- write what you learned → +5% development progress" feature.
--
-- AUTOMATED: no coach approval. The app inserts one row per reflection
-- (idempotent on player + video) and bumps that player's mapped dev area
-- by +5% (capped at 100) in players.stats[<season>].dev.
--
-- Reflections are PRIVATE (child / parent / coach) — never public.
--
-- Run once in the Supabase SQL editor.
-- ===================================================================

create table if not exists public.video_reflections (
  id          bigint generated always as identity primary key,
  player_id   bigint not null references public.players(id) on delete cascade,
  drill_id    bigint references public.drills(id) on delete set null,  -- the video, when it's a library drill
  video_url   text,                                                    -- fallback identifier when no drill_id
  video_key   text not null,                                           -- stable key: 'drill:<id>' or 'url:<url>'
  area        text not null,                                           -- mapped dev area (passing/shooting/dribbling/defending/fitness/teamwork)
  comment     text not null,                                           -- the child's reflection (>= 15 chars enforced in app)
  created_at  timestamptz not null default now()
);

-- One award per video per child (idempotency at the DB level too).
create unique index if not exists video_reflections_player_video_uniq
  on public.video_reflections (player_id, video_key);

-- Lookups by player (read-back list on the profile / coach view).
create index if not exists video_reflections_player_idx
  on public.video_reflections (player_id);

-- Row Level Security: reflections are private to the family + coaches.
alter table public.video_reflections enable row level security;

-- A parent/child may read & insert reflections for a player they are linked to;
-- admins (coaches) may read all. Mirrors the access pattern used elsewhere.
drop policy if exists video_reflections_select on public.video_reflections;
create policy video_reflections_select on public.video_reflections
  for select using (
    exists (select 1 from public.profiles pr
            where pr.id = auth.uid()
              and (pr.is_admin = true
                   or player_id = any (coalesce(pr.player_ids, array[]::bigint[]))
                   or player_id = pr.player_id))
  );

drop policy if exists video_reflections_insert on public.video_reflections;
create policy video_reflections_insert on public.video_reflections
  for insert with check (
    exists (select 1 from public.profiles pr
            where pr.id = auth.uid()
              and (pr.is_admin = true
                   or player_id = any (coalesce(pr.player_ids, array[]::bigint[]))
                   or player_id = pr.player_id))
  );

-- NOTE on training-attendance +5%:
-- The "+5% to the lowest dev area on attendance" bump writes to the same
-- players.stats[<season>].dev JSON (no new column needed). Idempotency for
-- attendance is keyed on session-date + player-id in the app; in live mode the
-- presence of the attendance ledger row prevents a re-award within a session.
