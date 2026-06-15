-- ===================================================================
-- OWFC Harris — Academy Points economy v1.1 migration
-- One idempotent script. Adds the tables/columns the v1.1 points engine needs
-- and the RLS to match the roles model (§9):
--   * everyone signed in can READ
--   * coaches/admins can WRITE everything
--   * a PARENT can write only their OWN child's homework & chores
--
-- Safe to run repeatedly: create table if not exists / add column if not exists /
-- drop+create policy. Run in Supabase: SQL Editor -> New query -> Run.
--
-- Depends on: migrate-points.sql (point_events, is_admin()), migrate-multi-child.sql
-- (profiles.player_ids). Categories used by the ledger in v1.1:
--   appearance · win · draw · goal · assist · cleansheet · saveoftheday ·
--   attendance · trainer · streak · challenge · quiz · homework · hwoverride ·
--   chore · skill · motm · moment · captains · mover · badge · manual
-- ===================================================================

-- ---------- helper: does the current user own this player? ----------
create or replace function owns_player(pid bigint)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (
        player_id = pid
        or player_ids @> to_jsonb(array[pid])
      )
  );
$$;

-- ===================================================================
-- 1. Match result: Moment of the Match column (POTM ≠ Moment)
-- ===================================================================
alter table fixtures add column if not exists moment bigint;

-- ===================================================================
-- 2. Homework status per player / week (§1F)
--    The AP outcome itself lives in point_events (category 'homework' / 'hwoverride');
--    this table is the parent-portal completion state + the private bench flag.
-- ===================================================================
create table if not exists homework (
  id          bigint generated always as identity primary key,
  player_id   bigint references players(id) on delete cascade,
  week        text not null,                       -- ISO week, e.g. 2026-W24
  season      text,
  challenge_done boolean not null default false,
  quiz_done      boolean not null default false,
  overridden  boolean not null default false,      -- coach one-tap waive
  bench_flag  boolean not null default false,      -- private to coach
  updated_at  timestamptz default now(),
  unique (week, player_id)
);
create index if not exists homework_player_idx on homework(player_id, season);

alter table homework enable row level security;
drop policy if exists hw_read on homework;
create policy hw_read on homework for select to authenticated using (true);
drop policy if exists hw_admin on homework;
create policy hw_admin on homework for all to authenticated using (is_admin()) with check (is_admin());
-- A parent may mark THEIR OWN child's homework complete (challenge_done/quiz_done).
drop policy if exists hw_parent_ins on homework;
create policy hw_parent_ins on homework for insert to authenticated with check (owns_player(player_id));
drop policy if exists hw_parent_upd on homework;
create policy hw_parent_upd on homework for update to authenticated using (owns_player(player_id)) with check (owns_player(player_id));

-- ===================================================================
-- 3. Home Team chores (§1G): up to 3/week, parent-set, ticked, private
-- ===================================================================
create table if not exists chores (
  id         bigint generated always as identity primary key,
  player_id  bigint references players(id) on delete cascade,
  week       text not null,                        -- ISO week
  season     text,
  list       jsonb not null default '[]'::jsonb,   -- ["Tidy room", ...] (max 3)
  done       jsonb not null default '[]'::jsonb,   -- [true,false,true]
  updated_at timestamptz default now(),
  unique (week, player_id)
);
create index if not exists chores_player_idx on chores(player_id, season);

alter table chores enable row level security;
-- Chores are PRIVATE to the family (§1G) — only the family and coaches can read.
drop policy if exists ch_read on chores;
create policy ch_read on chores for select to authenticated using (owns_player(player_id) or is_admin());
drop policy if exists ch_admin on chores;
create policy ch_admin on chores for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists ch_parent_ins on chores;
create policy ch_parent_ins on chores for insert to authenticated with check (owns_player(player_id));
drop policy if exists ch_parent_upd on chores;
create policy ch_parent_upd on chores for update to authenticated using (owns_player(player_id)) with check (owns_player(player_id));

-- ===================================================================
-- 4. Skill Ladder levels per player (§2) — AP + storage only (UI is Phase 4)
--    Stored as point_events rows too; this table is the canonical level state.
-- ===================================================================
create table if not exists skill_levels (
  id         bigint generated always as identity primary key,
  player_id  bigint references players(id) on delete cascade,
  season     text,
  track      text not null,                        -- e.g. "First Touch"
  level      text not null,                        -- bronze | silver | gold
  updated_at timestamptz default now(),
  unique (season, player_id, track)
);
create index if not exists skill_player_idx on skill_levels(player_id, season);

alter table skill_levels enable row level security;
drop policy if exists sk_read on skill_levels;
create policy sk_read on skill_levels for select to authenticated using (true);
drop policy if exists sk_admin on skill_levels;            -- only coaches run skill checks
create policy sk_admin on skill_levels for all to authenticated using (is_admin()) with check (is_admin());

-- ===================================================================
-- 5. Squad Goals (§4): shared monthly target + real-world unlock
-- ===================================================================
create table if not exists squad_goals (
  id         bigint generated always as identity primary key,
  season     text,
  month      text,                                 -- e.g. 2026-06
  title      text not null,
  target     int  not null default 0,              -- AP target
  reward     text,                                 -- real-world unlock
  unlocked   boolean not null default false,
  created_at timestamptz default now()
);
alter table squad_goals enable row level security;
drop policy if exists sg_read on squad_goals;
create policy sg_read on squad_goals for select to authenticated using (true);
drop policy if exists sg_admin on squad_goals;
create policy sg_admin on squad_goals for all to authenticated using (is_admin()) with check (is_admin());

-- ===================================================================
-- 6. Monthly votes — Captain's Award (§1D, voted by the players)
-- ===================================================================
create table if not exists monthly_votes (
  id         bigint generated always as identity primary key,
  month      text not null,                        -- e.g. 2026-06
  season     text,
  voter_id   bigint references players(id) on delete cascade,   -- who voted
  nominee_id bigint references players(id) on delete cascade,   -- best teammate
  created_at timestamptz default now(),
  unique (month, voter_id)
);
alter table monthly_votes enable row level security;
drop policy if exists mv_read on monthly_votes;       -- coaches tally; players see their own
create policy mv_read on monthly_votes for select to authenticated using (owns_player(voter_id) or is_admin());
drop policy if exists mv_admin on monthly_votes;
create policy mv_admin on monthly_votes for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists mv_parent_ins on monthly_votes; -- a child votes (via family login) for their own ballot
create policy mv_parent_ins on monthly_votes for insert to authenticated with check (owns_player(voter_id));

-- ===================================================================
-- 7. point_events parent-write policy — widen to the v1.1 parent-earned
--    categories and check ownership against player_ids (multi-child families).
--    (Replaces the single-child check in migrate-points.sql.)
-- ===================================================================
drop policy if exists pe_self_insert on point_events;
create policy pe_self_insert on point_events for insert to authenticated
  with check (
    category in ('quiz','challenge','chore','homework')
    and owns_player(player_id)
  );
-- Parents may also UPDATE/DELETE their own child's homework rows (recompute floor).
drop policy if exists pe_self_update on point_events;
create policy pe_self_update on point_events for update to authenticated
  using (category in ('chore','homework') and owns_player(player_id))
  with check (category in ('chore','homework') and owns_player(player_id));
drop policy if exists pe_self_delete on point_events;
create policy pe_self_delete on point_events for delete to authenticated
  using (category in ('chore','homework') and owns_player(player_id));

-- ===================================================================
-- 8. quizzes table — store the season alongside an override week (idempotent)
-- ===================================================================
alter table quizzes add column if not exists season text;

-- ===================================================================
-- Done. The browser store reads these tables on load; if a table is missing it
-- silently falls back to preview/localStorage, so a partial run never breaks the app.
-- ===================================================================
