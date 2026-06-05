-- ===================================================================
-- OWFC Harris U11 — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run
-- ===================================================================

-- ---------- SEASONS ----------
create table if not exists seasons (
  id          bigint generated always as identity primary key,
  name        text not null,           -- e.g. '2025/26'
  league      text,
  is_current  boolean default false
);

-- ---------- PLAYERS ----------
create table if not exists players (
  id           bigint generated always as identity primary key,
  number       int,
  name         text not null,
  pos          text,                    -- GK, RB, CB, CDM, CM, CAM, LW, RW, ST...
  photo_url    text,                    -- player-card photo (Supabase Storage URL)
  rating       int default 70,
  pace         int, shooting int, passing int, dribbling int, defending int, physical int,
  games        int default 0, goals int default 0, assists int default 0, motm int default 0,
  clean_sheets int default 0,
  program      jsonb default '[]',      -- personal development plan (array of strings)
  init         text,                    -- initials fallback for the card avatar
  created_at   timestamptz default now()
);

-- ---------- FIXTURES ----------
create table if not exists fixtures (
  id           bigint generated always as identity primary key,
  season_id    bigint references seasons(id) on delete set null,
  status       text not null default 'upcoming',  -- 'upcoming' | 'past'
  date         date not null,
  kickoff      text, meetup text,
  opponent     text not null,
  home_away    text default 'H',        -- 'H' | 'A'
  ground       text, address text,
  kit          text default 'gold',     -- 'gold' | 'black' | 'white'
  competition  text default 'League',
  our_score    int, their_score int,
  result       text,                    -- 'W' | 'D' | 'L'
  motm         bigint references players(id) on delete set null
);

-- ---------- GOALS ----------
create table if not exists goals (
  id          bigint generated always as identity primary key,
  fixture_id  bigint references fixtures(id) on delete cascade,
  scorer      bigint references players(id) on delete set null,
  assist      bigint references players(id) on delete set null,
  minute      int
);

-- ---------- ATTENDANCE ----------
create table if not exists attendance (
  id          bigint generated always as identity primary key,
  fixture_id  bigint references fixtures(id) on delete cascade,
  player_id   bigint references players(id) on delete cascade,
  status      text not null,            -- 'yes' | 'no' | 'maybe'
  updated_at  timestamptz default now(),
  unique (fixture_id, player_id)
);

-- ---------- TRAINING ----------
create table if not exists training_sessions (
  id          bigint generated always as identity primary key,
  season_id   bigint references seasons(id) on delete set null,
  date        date not null,
  start       text, "end" text,
  location    text,
  focus       text,
  drills      jsonb default '[]'
);

-- ---------- EVENTS ----------
create table if not exists events (
  id          bigint generated always as identity primary key,
  season_id   bigint references seasons(id) on delete set null,
  title       text not null,
  description text,
  location    text,
  date        date,
  img         text                      -- icon key or image URL
);

-- ---------- MEDIA (photos / videos) ----------
create table if not exists media (
  id          bigint generated always as identity primary key,
  fixture_id  bigint references fixtures(id) on delete cascade,
  event_id    bigint references events(id) on delete cascade,
  type        text default 'photo',     -- 'photo' | 'video'
  url         text,
  caption     text,
  uploaded_by text,
  created_at  timestamptz default now()
);

-- ---------- GAMIFICATION ----------
create table if not exists game_points (
  id          bigint generated always as identity primary key,
  player_id   bigint references players(id) on delete cascade,
  attendance  int default 0,
  training    int default 0,
  quiz        int default 0,
  exercise    int default 0,
  badges      jsonb default '[]'
);

-- ---------- PROFILES (link auth users to a player) ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  player_id   bigint references players(id) on delete set null,
  parent_name text,
  is_admin    boolean default false
);

-- ===================================================================
-- ROW LEVEL SECURITY
-- Any signed-in team member can READ everything.
-- Parents can write attendance + media. Admins can write everything.
-- ===================================================================
alter table players           enable row level security;
alter table fixtures          enable row level security;
alter table goals             enable row level security;
alter table attendance        enable row level security;
alter table training_sessions enable row level security;
alter table events            enable row level security;
alter table media             enable row level security;
alter table game_points       enable row level security;
alter table seasons           enable row level security;
alter table profiles          enable row level security;

-- helper: is the current user an admin?
create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- READ: everything readable by any authenticated member
do $$ declare t text;
begin
  foreach t in array array['players','fixtures','goals','attendance','training_sessions','events','media','game_points','seasons','profiles']
  loop
    execute format('drop policy if exists read_all on %I;', t);
    execute format('create policy read_all on %I for select to authenticated using (true);', t);
  end loop;
end $$;

-- WRITE: admins can do anything
do $$ declare t text;
begin
  foreach t in array array['players','fixtures','goals','training_sessions','events','game_points','seasons']
  loop
    execute format('drop policy if exists admin_write on %I;', t);
    execute format('create policy admin_write on %I for all to authenticated using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;

-- Parents can insert/update attendance and media
drop policy if exists member_attendance on attendance;
create policy member_attendance on attendance for all to authenticated using (true) with check (true);

drop policy if exists member_media on media;
create policy member_media on media for all to authenticated using (true) with check (true);

drop policy if exists own_profile on profiles;
create policy own_profile on profiles for update to authenticated using (id = auth.uid());

-- ===================================================================
-- STORAGE: create a public 'media' bucket in the dashboard
-- (Storage → New bucket → name: media → Public). Uploads go there.
-- ===================================================================
