# Data Model & Row-Level-Security Spec — Academy OS

*Multi-tenant data layer + RLS isolation spec · v1 · 18 June 2026*
*Companion to `PROJECT_BRIEF.md` and `ARCHITECTURE.md`. This is the evidence for the Architecture gate (data layer).*

---

## 0. How to read this document

This spec **extends the real, deployed Harris schema** — it does not redesign it. Every existing table, column and policy referenced below was read from `supabase/*.sql` and `js/store.js` in the repo and is cited inline. Where the brief implies a table that does **not** exist in the code (e.g. a `sponsors` table, `position_targets`, `challenges`), it is flagged **[DOES NOT EXIST — see §3.4]** rather than invented.

**British English throughout. Children's-data isolation is the top priority — every table in §5 is scoped; none is left open.**

### 0.1 The one rule that makes the whole thing safe

The existing app uses a single, blunt isolation primitive: `is_admin()` and `owns_player(pid)`, with most content tables readable by *any* authenticated user (`using (true)`). That is correct for **one team** but is a **cross-tenant data leak the moment a second club's users share the database**. The entire job of this spec is to replace every `using (true)` and every bare `is_admin()` with a **tenant-scoped predicate** keyed off the new `memberships` table.

---

## 1. New core tables (tenancy spine)

These four tables are entirely new. They sit *above* every existing table.

### 1.1 `clubs`

```sql
create table clubs (
  id          bigint generated always as identity primary key,
  slug        text not null unique,          -- subdomain label: 'harris' -> harris.football, 'club2' -> club2.harris.football
  name        text not null,                 -- 'OWFC Harris'
  brand       jsonb not null default '{}',   -- theme: { primary, secondary, logo_url, crest_url, kit_colours, font }
  status      text not null default 'active' -- 'active' | 'suspended' | 'grace' | 'cancelled'
                check (status in ('active','suspended','grace','cancelled')),
  created_at  timestamptz not null default now()
);
create unique index clubs_slug_uniq on clubs (lower(slug));
```

- `slug` is the **subdomain resolver key** (brief §3: "the subdomain identifies the club"). The hostname `*.harris.football` is split, the label is looked up against `clubs.slug`. Unique, case-insensitive.
- `brand` is the per-club white-label theme. Today branding is hard-coded in `js/config.js` (`AGE_GROUP`, kit colours, card tiers, honours). Those config keys become **per-club `brand` JSON + `teams` overrides** so one codebase serves every club.
- `status` drives the licence grace/read-only states (risk §8.5 in the brief: "failed payments, downgrades, licence expiry vs live data").

### 1.2 `teams`

```sql
create table teams (
  id          bigint generated always as identity primary key,
  club_id     bigint not null references clubs(id) on delete restrict,
  name        text not null,                  -- 'Harris U11'
  age_group   text,                           -- 'Under-11s' (today: config.js AGE_GROUP / SEASONS[].age)
  season      text,                           -- current/default season label, e.g. '2026/27' (today: config.js SEASONS)
  slug        text,                           -- path segment: club2.harris.football/team2
  brand       jsonb not null default '{}',    -- optional overrides on top of club.brand
  status      text not null default 'active'
                check (status in ('active','suspended','archived')),
  created_at  timestamptz not null default now(),
  unique (club_id, slug)
);
create index teams_club_idx on teams (club_id);
```

- `teams.slug` is the **path resolver** (brief §3: "the path identifies the team"). Scoped unique *within a club* so `club2/team2` and `club3/team2` can coexist.
- `age_group` / `season` capture what `js/config.js` currently encodes globally (`SEASONS: [{ id, age, ... }]`, season runs 1 Jul → 30 Jun, per `config.js` comments). Seasons today are **config-driven, not read from the DB `seasons` table** (confirmed: `store.js` never queries `from("seasons")`; the `seasons` table from `schema.sql` is effectively vestigial). **Open decision §9.1:** keep seasons in config per-team, or promote the `seasons` table to a real per-team table.
- `on delete restrict` on `club_id`: you must archive/empty a team before a club can be removed — a deliberate guard against accidental cascade deletion of children's data.

### 1.3 `memberships` — the many-to-many heart

```sql
create type membership_scope as enum ('platform','club','team');
create type membership_role  as enum (
  'platform_admin',   -- us (the OS)
  'club_admin',       -- club oversight, top-level read only
  'coach',            -- = team_admin: full read/write on one team (today's is_admin)
  'family',           -- parent/guardian (today's default signed-in user)
  'player',           -- a child's own login, if used
  'sponsor'           -- GDPR-restricted (today's profiles.is_sponsor)
);

create table memberships (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  scope       membership_scope not null,       -- platform | club | team
  scope_id    bigint,                           -- NULL for platform; clubs.id for club; teams.id for team
  role        membership_role not null,
  player_ids  jsonb not null default '[]',      -- for family/player rows: which children (migrated from profiles.player_ids)
  status      text not null default 'active' check (status in ('active','invited','revoked')),
  created_at  timestamptz not null default now(),
  unique (user_id, scope, scope_id, role)
);
create index memberships_user_idx     on memberships (user_id);
create index memberships_scope_idx    on memberships (scope, scope_id);
create index memberships_user_scope   on memberships (user_id, scope, scope_id);
```

**Why many-to-many (not a single role column on `profiles`)?** The brief states it explicitly (§5) and the existing data demands it:

1. **A parent with children in two teams.** Today `profiles.player_ids` (from `migrate-multi-child.sql`) already lets one login own multiple children — but only within *one* team. At club scale those children may be in different teams (e.g. siblings two age-groups apart). One `family` membership row **per team** the family touches, each carrying the relevant `player_ids`, models this with zero ambiguity.
2. **A coach across two teams** (very common at grassroots — brief cites a club with 104 teams). One `coach` membership row per team. A single boolean `is_admin` cannot express "admin of team A but not team B".
3. **A club admin who is also a coach** of one of their teams: a `club_admin` row at club scope + a `coach` row at team scope. The two grants compose; no special-casing.
4. **Platform staff** get one `platform_admin` row with `scope='platform'`, `scope_id=NULL`.

`scope_id` is intentionally a plain `bigint` (not two nullable FKs) because it points at *different* tables depending on `scope`. Referential integrity is enforced by trigger / app-layer + the helper functions in §6 (Open decision §9.5: add a CHECK + companion FK columns vs keep polymorphic).

### 1.4 `licences`

```sql
create table licences (
  id           bigint generated always as identity primary key,
  club_id      bigint not null references clubs(id) on delete cascade,
  plan         text not null,                   -- 'free' | 'starter' | 'club' | 'pro' (TBD — brief §7)
  team_limit   int  not null default 1,         -- seat/team cap the club may provision
  status       text not null default 'active'
                 check (status in ('active','past_due','grace','cancelled','trialing')),
  period_end   timestamptz,                     -- current paid-through date
  stripe_customer_id     text,                  -- billing linkage (Stripe-hosted; we never touch card data)
  stripe_subscription_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index licences_club_idx on licences (club_id);
```

- One active licence per club (enforce with a partial unique index on `(club_id) where status in ('active','grace','trialing')` — **Open decision §9.6**).
- `team_limit` is checked when a club admin provisions a new team (app-layer + a trigger counting `teams` for the club).
- `status='grace'`/`past_due` flips the club to **read-only** (brief risk §8.5). Implemented as a condition in the write predicates (§5) — e.g. coaches can still read during grace, but `INSERT/UPDATE/DELETE` require `licence_active(club_id)`.
- Card data is **never** stored here — only Stripe references (brief §7, §12).

---

## 2. Changes to existing tables (add tenancy keys)

**Rule: every content row must carry `team_id`. Most also carry a denormalised `club_id`** so the club rollup and club-scoped RLS never need a join to `teams` on the hot path (perf, §8). `club_id` is kept in sync by a trigger (`set_club_id_from_team`) so the app only ever sets `team_id`.

Below is **every table found in the repo** and the columns to add. Tables verified to exist are cited to their migration file.

| Existing table | Source file | Add `team_id` | Add `club_id` (denorm) | Notes |
|---|---|---|---|---|
| `players` | `schema.sql` | ✅ `not null` | ✅ | The squad. Child PII-adjacent. Roster key. |
| `fixtures` | `schema.sql`, `migrate-fixtures.sql` | ✅ | ✅ | Also has `lineup`, `moment`, `motm`. |
| `goals` | `schema.sql` | ➖ via `fixtures` | ➖ | Inherit scope from parent `fixture_id`; add `team_id` denormalised anyway for direct-query RLS (cheaper than join). |
| `attendance` | `schema.sql` | ✅ | ✅ | Per-player match availability. |
| `training_sessions` | `schema.sql`, `migrate-training-videos.sql` | ✅ | ✅ | Has `videos` jsonb. |
| `events` | `schema.sql`, `migrate-training-events.sql` | ✅ | ✅ | Club social events. |
| `media` | `schema.sql` | ✅ | ✅ | Photos/videos tied to fixtures/events. |
| `game_points` | `schema.sql` | ✅ | ✅ | Legacy per-player points buckets. |
| `seasons` | `schema.sql` | ✅ (or per-team) | ✅ | **Vestigial today** (not queried by `store.js`); see §1.2 / §9.1. |
| `point_events` | `migrate-points.sql` | ✅ | ✅ | The AP ledger — sum gives league totals. High row count; index hard (§8). |
| `homework` | `migrate-academy-v2.sql` | ✅ | ✅ | Has private `bench_flag` (coach-only). |
| `chores` | `migrate-academy-v2.sql` | ✅ | ✅ | **Private to family + coach** today; must stay so. |
| `skill_levels` | `migrate-academy-v2.sql` | ✅ | ✅ | Mirror of `point_events` category 'skill'. |
| `squad_goals` | `migrate-academy-v2.sql` | ✅ | ✅ | Monthly team target. |
| `monthly_votes` | `migrate-academy-v2.sql` | ✅ | ✅ | Captain's Award ballots — child-visible-own-only. |
| `quizzes` | `migrate-quiz.sql` | ✅ | ✅ | Per-week override; central library copy is platform-scoped (§3). |
| `drills` | `migrate-academy.sql`, `migrate-video-library.sql`, `migrate-directory-and-folders.sql` | ✅ *(nullable)* | ✅ *(nullable)* | **The video library.** Gets `scope` (§3), not just `team_id`. Has `team`, `player_ids`, `folder`, `description`. |
| `directory` | `migrate-directory-and-folders.sql`, `load-directory.sql` | ✅ | ✅ | **Opponent ADULT contacts** (phone/email). Coach-only at club scale (today: any authenticated). |
| `rsvp` | `migrate-rsvp.sql` | ✅ | ✅ | Going/can't/lift per activity. Today `using (true)` for all — must scope. |
| `video_reflections` | `migrate-academy-progress.sql` | ✅ | ✅ | **Children's private reflections.** Today `using (true)` — the single highest-risk leak; must be locked to family+coach. |
| `profiles` | `schema.sql` + several | ➖ | ➖ | Stays 1:1 with `auth.users`; gains NO tenancy column. Tenancy moves to `memberships`. Contains `parents` (contact PII), `player_id(s)`, `is_admin`, `is_sponsor`. |

Columns on `players` that are JSONB blobs of child data (`dev`, `targets`, `videos`, `program`, `idp`, `stats`, `seasons`, `signed`) all inherit the row's `team_id`/`club_id` scope — no per-column work needed.

### 2.1 Migrating `profiles` boolean flags → membership roles

Today (read from `schema.sql`, `migrate-sponsor.sql`, `migrate-security.sql`, `store.js` lines 217–227):

- `profiles.is_admin boolean` → coach/team_admin.
- `profiles.is_sponsor boolean` → sponsor.
- `profiles.player_id` / `player_ids jsonb` → the family's children.
- `store.js` reads these on login: `this.isAdmin = !!prof.is_admin; this.isSponsor = !!prof.is_sponsor;`

**Migration mapping (one-time backfill, §7):**

| Old `profiles` state | New `memberships` row(s) (all scope `team`, `scope_id = team#1` during backfill) |
|---|---|
| `is_admin = true` | `role='coach'` |
| `is_sponsor = true` | `role='sponsor'` |
| `player_ids` non-empty (and not admin/sponsor) | `role='family'`, `player_ids` copied across |
| (you / OS operator) | additional `role='platform_admin'`, scope `platform`, `scope_id=NULL` |

`profiles.is_admin` / `is_sponsor` / `player_id(s)` are **kept in place during the dual-run window** (the app still reads them) and only dropped once `store.js` reads `memberships` instead. `profiles.parents` (contact PII) stays on `profiles`.

---

## 3. Library / content scoping (central → club → team)

The brief's content model (§5): "Library items have a `scope`: `platform` (central, drawable by all), `club` (club-shared), or `team` (private). Author the curriculum once centrally; every club benefits." Teams "draw from central + add their own (tagged)."

### 3.1 The `content_scope` enum + owner columns

```sql
create type content_scope as enum ('platform','club','team');
```

Added to the **library-style** tables — those that can be shared down the tiers:

```sql
alter table drills   add column scope content_scope not null default 'team';
alter table drills   add column owner_club_id bigint references clubs(id);   -- set when scope='club'
alter table drills   add column owner_team_id bigint references teams(id);   -- set when scope='team'
-- (the existing team_id/club_id from §2 become the *consumer* tenancy keys;
--  owner_* identifies the authoring tier for shared items)

alter table quizzes  add column scope content_scope not null default 'team';
alter table quizzes  add column owner_club_id bigint references clubs(id);
alter table quizzes  add column owner_team_id bigint references teams(id);
```

### 3.2 Tables that take `scope` + owner ids

| Library table | Exists today? | Scope behaviour |
|---|---|---|
| `drills` (video library) | ✅ `migrate-video-library.sql` | `platform` = central curated set (e.g. the 31 videos in `load-video-library.sql`); `club` = club-added; `team` = a coach's own. A team **reads `platform` ∪ its-club's `club` ∪ its-own `team`** and tags/assigns from any of them. |
| `quizzes` | ✅ `migrate-quiz.sql` | `platform` = the central quiz bank/overrides; `team` = a coach's weekly override. |
| `skill_levels` | ✅ `migrate-academy-v2.sql` | Always `team` (per-player state) — but the **skill-ladder *definition*** (tracks/bands) is currently in `js/data.js`, not the DB (§3.4). |
| `squad_goals` | ✅ `migrate-academy-v2.sql` | Could be `platform` (templates) or `team` (live target). Default `team`. |

### 3.3 The "draw from central + add their own" read rule (SQL sketch)

```sql
-- a team may SELECT a library row if it is platform-wide,
-- shared by the team's own club, or owned by the team itself:
create policy drills_scoped_read on drills for select to authenticated using (
     scope = 'platform'
  or (scope = 'club' and owner_club_id = current_club_id())
  or (scope = 'team' and team_in_my_clubs(team_id))
);
```

(`current_club_id()`, `team_in_my_clubs()` defined in §6.) Crucially, **`club`/`team` scoped items are still club-fenced** — one club can never read another club's club-shared or team-private library items. Only `platform` items cross the boundary, and those are authored by the OS.

### 3.4 Brief-implied content that is NOT a table today — flagged, not invented

Read from `js/data.js` and `js/store.js`:

- **`sponsors` table — DOES NOT EXIST.** Sponsorship is a static page (`sponsorship/sponsorship.html`, a PDF) + a per-login flag (`profiles.is_sponsor`). There is no sponsor *data* table. **TBD:** if clubs need per-club sponsor records, add a `sponsors` table (scope `club`/`team`); for v1 it remains a static branded page per club.
- **`position_targets` / `challenges` / quiz bank / skill-ladder definitions — DO NOT EXIST as tables.** They are static content in `js/data.js` (`exercises`, `quizBank`) and derived logic in `store.js` (`skillLadder()` derives from `point_events` category 'skill'; `migrate-academy-content.sql` explicitly says these "need no DB"). **TBD / §9.2:** to make the curriculum *per-club editable*, promote `exercises` (challenges), `quizBank`, position targets and the skill-ladder track definitions into scoped tables (`platform` default + `club`/`team` overrides). Until then they ship as platform-default code and only `quizzes`, `drills`, `skill_levels` are DB-backed.

---

## 4. Text ERD (entity relationships)

```
                         auth.users (Supabase Auth)
                              │ 1
                              │
                   ┌──────────┴───────────┐
                   │ 1:1                   │ 1:N
               profiles               memberships ───────────────┐
        (parents PII, player_ids,   (user_id, scope,             │
         is_admin*, is_sponsor*)     scope_id, role, player_ids) │
                                          │                       │
                 ┌────────────────────────┘ scope_id points to → │
                 │                                                │
                 ▼  (scope='platform' → NULL)                     │
            clubs ─────1:N─────► teams ─────1:N────► players      │
              │ 1                  │ 1                  │ 1        │
              │ 1:N               │ 1:N                │ 1:N      │
            licences        (every content row    point_events,  │
        (plan, team_limit,   carries team_id +     homework,     │
         status, period_end) club_id denorm)       chores,       │
                                  │                 skill_levels, │
                                  │                 monthly_votes,│
                                  │                 attendance,   │
                                  │                 rsvp,         │
                                  │                 video_reflect.│
                                  ▼                               │
        fixtures ──1:N──► goals          training_sessions        │
           │ 1:N                          events                  │
           ▼                              media ◄─(fixture/event) │
       (lineup, motm,                                             │
        moment)                                                   │
                                                                  │
  LIBRARY (scope: platform|club|team, owner_club_id/owner_team_id)│
        drills (video library) ──── tagged/assigned to players ───┘
        quizzes (per-week overrides; platform bank)
```

Key cardinalities:
- `clubs 1 ─ N teams 1 ─ N players` is the **tenancy tree**; `team → club` gives the club rollup.
- `memberships` is the **many-to-many bridge** between `auth.users` and `{platform | clubs | teams}` via `(scope, scope_id)`.
- Every content table hangs off `teams` (and denormalises `club_id`).
- Library tables (`drills`, `quizzes`) are owned at one tier (`owner_*`) but *consumed* by teams via `scope`.

---

## 5. RLS POLICY MATRIX — the central piece

**Legend.** Roles: `PA` = platform_admin, `CA` = club_admin, `CO` = coach/team_admin, `FA` = family, `PL` = player, `SP` = sponsor. Operations: S=SELECT, I=INSERT, U=UPDATE, D=DELETE. ✅ = allowed (with predicate), ❌ = denied, **partial** = allowed on a restricted column/row subset.

All predicates assume the helper functions in §6. The **golden invariant**: every non-platform predicate is fenced by `team_in_my_clubs()` / `team_id = my_team()` / `current_club_id()` so **no row of one club is ever visible to another club, and no row of one team to another team within a club** unless explicitly shared as `platform`/`club` library content.

### 5.1 The club-admin visibility line (precise — answers brief §11)

**`club_admin` may read, across its own teams only, the TOP-LEVEL roll-up:**

| Allowed for club_admin (SELECT) | Why it's "top-level" |
|---|---|
| `teams`, squad **roster** (`players`: name, number, position, photo, captain, signed) | Who's in the squad. |
| **Aggregate progress** — development % (`players.dev` / `stats[season].dev`), skill-ladder levels (`skill_levels`), AP/league totals (sum of `point_events`) | Progress %, development summary. |
| **Attendance** (`attendance`, `rsvp` status counts), **training schedule** (`training_sessions`), **fixtures/events** | Operational oversight. |
| `squad_goals` (team targets) | Engagement oversight. |

**`club_admin` must NOT read (hard ❌, even for own teams):**

| Forbidden for club_admin | Lives in | Reason |
|---|---|---|
| **Parent / guardian contact details** | `profiles.parents`, `profiles.parent_name` | Safeguarding + GDPR data-minimisation; club admin has no need. |
| **Individual video reflections** (the child's own words) | `video_reflections.comment` | Private to family + coach (today's intent in `migrate-academy-progress.sql`). |
| **Home Team chores** (private family activity) | `chores` | Already family-private in `migrate-academy-v2.sql`. |
| **Safeguarding / bench notes** | `homework.bench_flag` ("private to coach"), any future `safeguarding_notes` | Coach-only; never rolls up. |
| **Individual ballots** | `monthly_votes` (who a child voted for) | Private vote. Only tallies, never the per-voter row. |
| **Free-text individual feedback in Mini-IDPs** | `players.idp[].feedback` | Coach↔family channel; aggregate only. |

This is enforced with **column-level grants + a `club_rollup` view**, not just row predicates: the club admin reads progress/attendance through a **`v_club_rollup` view** that *projects only the permitted columns*; the base tables deny `CA` direct SELECT on the forbidden columns. (Postgres column-level: `GRANT SELECT (id, name, dev) ON players TO ...` is coarse with RLS, so the canonical mechanism is **a SECURITY INVOKER view exposing only safe columns, with RLS on the base table restricting CA to nothing else** — §6.4.)

### 5.2 Core tenancy & identity tables

| Table | PA | CA | CO | FA | PL | SP | Predicate (in words) → SQL sketch |
|---|---|---|---|---|---|---|---|
| `clubs` | S I U D | S (own) | S (own) | S (own) | S (own) | S (own) | Read: your club only. Write: PA only. `using (is_platform() or id = current_club_id())`; write `using (is_platform())`. |
| `teams` | S I U D | S U (own club) / I D within `team_limit` | S (own team) | S (own) | S (own) | ❌ | CA manages teams in its club up to licence cap. `using (is_platform() or club_id = current_club_id())`; CA insert `with check (club_id=current_club_id() and licence_has_room(club_id))`. |
| `memberships` | S I U D | S I U D (rows in own club; cannot grant platform_admin) | S (own team rows) | S (own row) | S (own row) | S (own row) | CA invites coaches/families to its teams. `using (is_platform() or (scope='club' and scope_id=current_club_id()) or (scope='team' and team_in_my_clubs(scope_id)) or user_id=auth.uid())`. WITH CHECK forbids escalating role above your own tier. |
| `licences` | S I U D | S (own, read-only) | ❌ | ❌ | ❌ | ❌ | Billing is OS-managed; CA sees status. `using (is_platform() or club_id=current_club_id())`; write `using (is_platform())`. |
| `profiles` | S I U D | **partial**: S only own row (NOT others' `parents`) | S (own team families, incl. `parents` for contact) | S U (own row) | S (own row) | S U (own row) | **The PII fence.** Today `migrate-security.sql`: `id=auth.uid() or is_admin()`. New: coach may read families *of their team*; CA may read **only its own** profile (no parent contacts). `using (id=auth.uid() or is_platform() or coach_of_my_teams_owns_this_profile())`. |

### 5.3 Squad & match content

| Table | PA | CA | CO | FA | PL | SP | Predicate (words) → SQL sketch |
|---|---|---|---|---|---|---|---|
| `players` | S I U D | S (roster + progress cols via view) | S I U D (own team) | S (own team roster) | S (own team roster) | ❌ | Team-fenced. `using (is_platform() or team_in_my_clubs(team_id))` for read; CO write `using (team_id=my_team()) with check (team_id=my_team() and licence_active(club_id))`. CA's forbidden columns blocked via §5.1 view. SP gets nothing. |
| `fixtures` | S I U D | S (own teams) | S I U D (own team) | S (own team) | S (own team) | ❌ | `using (is_platform() or team_in_my_clubs(team_id))`; CO write fenced to `my_team()` + `licence_active`. |
| `goals` | S I U D | S (own teams) | S I U D (own team) | S (own) | S (own) | ❌ | Scope inherited from fixture; denorm `team_id` lets RLS avoid the join. Same predicate as `fixtures`. |
| `attendance` | S I U D | S (own teams) | S I U D (own team) | **I U** (own child), S (own team) | S (own) | ❌ | Family edits their child's availability (today `using (true)`; tighten). `using (team_in_my_clubs(team_id))`; FA write `with check (owns_player(player_id) and team_in_my_clubs(team_id))`. |
| `rsvp` | S I U D | S (own teams) | S I U D | **I U** (own child) | S (own) | ❌ | Today `rsvp_all using(true)` — **leak at scale**; replace with team fence + `owns_player` for family writes. |
| `media` | S I U D | S (own teams) | S I U D | S (own team), I (own) | S (own) | ❌ | Photos. `using (is_platform() or team_in_my_clubs(team_id))`. |
| `training_sessions` | S I U D | S (own teams — schedule) | S I U D (own team) | S (own team) | S (own team) | ❌ | Schedule is club-visible top-level. Team-fenced read. |
| `events` | S I U D | S (own teams) | S I U D | S (own team) | S (own team) | ❌ | Same fence. |
| `seasons` | S I U D | S (own) | S I U D (own team) | S | S | ❌ | If promoted to per-team (§9.1); else config-driven, no RLS needed. |
| `game_points` | S I U D | S (aggregate) | S I U D | S (own) | S (own) | ❌ | Legacy buckets; team-fenced. |

### 5.4 Academy / gamification (children's data — strictest)

| Table | PA | CA | CO | FA | PL | SP | Predicate (words) → SQL sketch |
|---|---|---|---|---|---|---|---|
| `point_events` (AP ledger) | S I U D | S (own teams, **aggregated via view**) | S I U D (own team) | S (own child), **I/U/D own child** for `quiz/challenge/chore/homework` | S (own) | ❌ | Today (`migrate-academy-v2.sql`): family insert limited to those categories + `owns_player`. **Add team fence.** `using (is_platform() or team_in_my_clubs(team_id))`; FA write keeps the category whitelist AND adds `team_in_my_clubs(team_id)`. |
| `homework` | S I U D | S (completion % only, **NOT `bench_flag`**) | S I U D (own team) | I/U (own child: `challenge_done`,`quiz_done`), S (own child) | S (own) | ❌ | `bench_flag` is coach-private — exclude from any CA/FA view. FA write `with check (owns_player(player_id) and team_in_my_clubs(team_id))`. |
| `chores` | S I U D | ❌ (family-private) | S U D (own team) | S/I/U (own child) | S (own) | ❌ | **Private to family + coach** (today). CA explicitly denied. `using (owns_player(player_id) or coach_of(team_id) or is_platform())`. |
| `skill_levels` | S I U D | S (levels — progress) | S I U D (own team) | S (own child) | S (own) | ❌ | Coaches set; everyone in team reads own/aggregate. Team-fenced. |
| `squad_goals` | S I U D | S (own teams) | S I U D | S (own team) | S (own team) | ❌ | Team target. Team-fenced read. |
| `monthly_votes` | S I U D | ❌ individual rows (tally only) | S U D (tally) | **I** (own child's ballot), S (own) | S (own) | ❌ | Today: `owns_player(voter_id) or is_admin`. Add team fence; CA never sees per-voter rows. |
| `video_reflections` | S I U D | ❌ (`comment` private) | S I U D (own team) | S/I (own child) | S/I (own) | ❌ | **HIGHEST-RISK TABLE.** Today `using(true)` for read AND insert (`migrate-academy-progress.sql`) — a cross-tenant leak of children's private words. **Must become:** `using (owns_player(player_id) or coach_of(team_id) or is_platform())`; insert `with check (owns_player(player_id) and team_in_my_clubs(team_id))`. CA denied entirely. |
| `players.idp` (col) | S | S **except `feedback`** | S U | S (own) | S (own) | ❌ | Mini-IDP feedback is coach↔family; CA aggregate only. Enforced via view. |

### 5.5 Library & operational

| Table | PA | CA | CO | FA | PL | SP | Predicate (words) → SQL sketch |
|---|---|---|---|---|---|---|---|
| `drills` (video library) | S I U D (all scopes incl. `platform`) | S (platform ∪ own-club ∪ own-teams) / I U D for `club` scope | S (platform ∪ own-club ∪ own-team) / I U D for own `team` | S (only videos assigned to own child OR team=true), per `store.js videosForPlayer` | S (own) | ❌ | §3.3 read rule. Stock (`team=false, no player_ids`) stays coach-only (today `isStockVideo`). Writes fenced to the authoring tier. |
| `quizzes` | S I U D (platform bank) | S (platform ∪ own teams) | S I U D (own team override) | S (own team) | S (own team) | ❌ | Platform bank readable by all; team override fenced. |
| `directory` (opponent ADULT contacts) | S I U D | S (own teams) | S I U D (own team) | ❌ | ❌ | ❌ | Today `using(true)` for ALL authenticated — **at scale this leaks opponent managers' phone/email across clubs**. Restrict to coach+CA of the owning team only. `using (is_platform() or coach_of(team_id) or club_admin_of(club_id))`. |
| `seasons` (if DB) | S I U D | S | S U | S | S | ❌ | See §9.1. |

### 5.6 Sponsor (`SP`) — the GDPR clamp

`sponsor` appears in **every row above as ❌** for all child-data and content tables. This preserves today's guarantee (`migrate-sponsor.sql`: "may view ONLY the Sponsor and About pages; never any child data"). The *only* thing a sponsor membership grants is: read `clubs.brand` (for the branded sponsor page) of the club they belong to. The sponsor page itself is static (no DB child data), so RLS denial is total and safe by default.

```sql
-- baseline: a sponsor membership grants no row on any child-data table
-- (achieved simply by sponsor never satisfying team_in_my_clubs()/owns_player()
--  because their membership row is role='sponsor' which the helpers exclude)
```

---

## 6. Helper / auth functions (how RLS resolves tenancy)

The existing app has `is_admin()` and `owns_player(pid)` (read from `schema.sql`, `migrate-academy-v2.sql`). These are **kept** but generalised into a small library of `STABLE` SQL functions that read `memberships`. All are `security definer`/`stable`, owned by a role that can read `memberships`, and used inside policies.

```sql
-- platform staff?
create or replace function is_platform() returns boolean language sql stable as $$
  select exists (select 1 from memberships
                 where user_id = auth.uid() and scope='platform'
                   and role='platform_admin' and status='active');
$$;

-- the set of team ids the current user can touch (any role):
--  - direct team memberships
--  - all teams of clubs where the user is club_admin
create or replace function my_team_ids() returns setof bigint language sql stable as $$
  select scope_id from memberships
    where user_id=auth.uid() and scope='team' and status='active'
  union
  select t.id from teams t
    join memberships m on m.scope='club' and m.scope_id=t.club_id
   where m.user_id=auth.uid() and m.status='active';
$$;

create or replace function team_in_my_clubs(t bigint) returns boolean language sql stable as $$
  select is_platform() or t in (select my_team_ids());
$$;

-- am I a coach (write) of this specific team?
create or replace function coach_of(t bigint) returns boolean language sql stable as $$
  select is_platform() or exists (select 1 from memberships
     where user_id=auth.uid() and scope='team' and scope_id=t
       and role='coach' and status='active');
$$;

-- am I club_admin of this club?
create or replace function club_admin_of(c bigint) returns boolean language sql stable as $$
  select is_platform() or exists (select 1 from memberships
     where user_id=auth.uid() and scope='club' and scope_id=c
       and role='club_admin' and status='active');
$$;

-- the club resolved from the current request (set by the app, see §6.2)
create or replace function current_club_id() returns bigint language sql stable as $$
  select nullif(current_setting('request.club_id', true), '')::bigint;
$$;

-- generalise owns_player to read memberships.player_ids (multi-team families)
create or replace function owns_player(pid bigint) returns boolean language sql stable as $$
  select exists (select 1 from memberships
     where user_id=auth.uid() and role in ('family','player') and status='active'
       and player_ids @> to_jsonb(array[pid]))
     or exists (select 1 from profiles               -- transitional dual-read
       where id=auth.uid() and (player_id=pid or player_ids @> to_jsonb(array[pid])));
$$;

-- licence gate for writes (read-only during grace/past_due)
create or replace function licence_active(c bigint) returns boolean language sql stable as $$
  select exists (select 1 from licences
     where club_id=c and status in ('active','trialing'));
$$;
```

### 6.1 Resolving a user's memberships at login

On login `store.js` (today reads `profiles` at lines 217–227) instead selects **all** active membership rows for `auth.uid()`:

```sql
select scope, scope_id, role, player_ids from memberships
 where user_id = auth.uid() and status='active';
```

The app derives `isPlatformAdmin`, the set of clubs/teams the user can access, and `myKids` (union of `player_ids`) from this — replacing the boolean `isAdmin`/`isSponsor` flags.

### 6.2 How the app sets tenant context (the subdomain → club binding)

The brief (§5) and ARCHITECTURE owns the routing; the data layer's contract is:

1. The request hits `<slug>.harris.football/<team-slug>`.
2. The edge resolves `slug → clubs.id` and `team-slug → teams.id` (within that club).
3. Before any query, the app sets a **request-scoped GUC**: `set_config('request.club_id', <club_id>, true)` (and optionally `request.team_id`). RLS reads it via `current_club_id()`.
4. This GUC is **a convenience filter, not the security boundary** — the security boundary is `memberships` (a malicious user cannot read another club merely by changing the subdomain, because `team_in_my_clubs()` still gates every row). Defence in depth (brief §5): RLS + this app filter + the automated isolation tests.

**Open decision §9.3:** GUC via `request.*` settings vs encoding club/team in a custom JWT claim (Supabase supports `auth.jwt()`); JWT claims are tamper-proof but require re-issuing tokens on membership change.

### 6.3 Recommended: SELECT vs WRITE policy split per table

Apply the same shape to every content table (replaces the `do $$ ... using(true)` loop in `schema.sql`):

```sql
-- READ (team-fenced for all roles; platform sees all)
create policy <t>_read on <t> for select to authenticated
  using (team_in_my_clubs(team_id));
-- WRITE (coach of the team, licence active; platform always)
create policy <t>_coach_write on <t> for all to authenticated
  using (coach_of(team_id))
  with check (coach_of(team_id) and licence_active(club_id));
```

Then add the **role-specific narrow policies** (family attendance/rsvp/homework/chores/point_events) per §5.

### 6.4 The club-rollup view (enforces §5.1 column line)

```sql
create view v_club_rollup with (security_invoker=true) as
  select p.team_id, p.club_id, p.id as player_id, p.name, p.number, p.pos,
         p.signed, p.dev, p.stats,                    -- progress %, development summary
         (select coalesce(sum(points),0) from point_events pe
            where pe.player_id=p.id) as ap_total
  from players p;
-- club_admin is GRANTed SELECT on this view only; base-table RLS denies CA
-- the forbidden columns (parents, comment, bench_flag, idp.feedback, votes).
```

---

## 7. Migration SQL outline (ordered, no data loss)

Backfill OWFC Harris as **club #1 / team #1** (brief §9 Phase 0). Each step is idempotent (`if not exists` / guarded updates), matching the existing migration style.

```
Step 1.  Create enums: membership_scope, membership_role, content_scope.
Step 2.  Create clubs, teams, memberships, licences (§1). No data yet touched.
Step 3.  INSERT club #1: ('harris','OWFC Harris', <brand from config.js>, 'active').
Step 4.  INSERT team #1: (club_id=1,'Harris U11','Under-11s','2026/27','team1', ...).
Step 5.  INSERT licence: (club_id=1, plan='internal', team_limit=99, status='active').
Step 6.  Add team_id (NULL-able first) + club_id to EVERY content table in §2.
Step 7.  Backfill: UPDATE every content table SET team_id=1, club_id=1
         (all existing rows belong to Harris by definition — zero ambiguity).
Step 8.  Add trigger set_club_id_from_team() BEFORE INSERT/UPDATE on each
         content table (keeps club_id in sync from team_id thereafter).
Step 9.  ALTER ... team_id SET NOT NULL on tables where every row is now set
         (players, fixtures, etc.); leave drills.team_id NULLable (platform scope).
Step 10. Add scope/owner_* columns to drills, quizzes (§3); backfill existing
         drills: scope='team', owner_team_id=1 (or 'platform' for the curated
         load-video-library.sql set — decide via §9.2).
Step 11. Backfill memberships from profiles (§2.1):
           - is_admin=true        -> coach   (team 1)
           - is_sponsor=true      -> sponsor (team 1)
           - player_ids non-empty -> family  (team 1, copy player_ids)
           - you                  -> platform_admin (platform, NULL)
         profiles columns are KEPT (dual-run).
Step 12. Install helper functions (§6): is_platform, my_team_ids, team_in_my_clubs,
         coach_of, club_admin_of, current_club_id, owns_player (generalised),
         licence_active.
Step 13. Replace policies: DROP the schema.sql read_all/admin_write loop and
         every using(true) policy; CREATE the team-fenced read + coach write +
         role-narrow policies (§5, §6.3) on ALL tables, table by table.
Step 14. Create v_club_rollup view + GRANT to club_admin (§6.4).
Step 15. Run the automated isolation test suite (brief §8 risk #1 — release gate):
         for every table, assert a user of club A cannot SELECT/INSERT/UPDATE/
         DELETE any row of club B, and a team-X user cannot touch team-Y rows.
Step 16. Only after tests pass on a 2nd seeded club: switch store.js to read
         memberships (§6.1); later migration drops profiles.is_admin/is_sponsor.
```

Data-loss safety: tenancy columns are **added and backfilled before** they are made `NOT NULL` or used in policies; old policies are not dropped until new ones are in place in the same transaction; `profiles` flags survive the whole cut-over.

---

## 8. Indexing & performance (100+ clubs)

At 100+ clubs × up to 104 teams each (brief §2), the hot path is "everything for one team / one club". Every RLS predicate filters on `team_id` or `club_id`, so those must be indexed on **every** content table.

| Index | Tables | Why |
|---|---|---|
| `(team_id)` btree | all content tables | Primary RLS filter; every read is team-scoped. |
| `(club_id)` btree | all content tables | Club-rollup reads and `club`-scope RLS. |
| `(club_id, team_id)` composite | high-volume tables | Covers club-then-team drill-down without a second lookup. |
| `(player_id, season)` | `point_events`, `homework`, `chores`, `skill_levels` | **Already exist** (`migrate-points.sql`, `migrate-academy-v2.sql`); keep + ensure `team_id` is included. |
| `(team_id, season)` | `point_events` | League-table sum per team per season — the heaviest aggregate. Consider a covering index `(team_id, season) include (points)`. |
| `(user_id)`, `(scope, scope_id)`, `(user_id, scope, scope_id)` | `memberships` | Every single RLS call resolves through `memberships`; these are the most-hit indexes in the system. |
| `lower(slug)` unique | `clubs` | Subdomain resolution on every request. |
| `(club_id, slug)` unique | `teams` | Path resolution. |
| `(scope, owner_club_id)`, `(scope, owner_team_id)` | `drills`, `quizzes` | Library read rule (§3.3). |
| partial `(ref) where ref is not null` | `point_events` | **Already exists**; dedupe key. |

Performance notes:
- The helper functions (`team_in_my_clubs`, `coach_of`) run **per row** in RLS. Mark them `STABLE` (done) so Postgres caches within a statement, and keep `my_team_ids()` cheap (indexed `memberships` + `teams.club_id`). At very large scale, consider materialising a per-user `(user_id, team_id)` access table refreshed on membership change — **Open decision §9.4**.
- Denormalising `club_id` onto every row (§2) deliberately trades a little write-time trigger cost for avoiding a `teams` join in every club-scoped read — the right trade at 100+ clubs.
- Consider **partitioning `point_events` by `club_id`** if it grows into millions of rows (it grows fastest — one row per AP event per child). Not needed for v1; flag for scale.

---

## 9. Open data decisions (clearly marked) + assumptions

### Open decisions
- **§9.1 Seasons.** The `seasons` table exists in `schema.sql` but is **not read by `store.js`** (seasons come from `js/config.js SEASONS`). Decide: (a) keep seasons config-per-team (simplest, matches today), or (b) promote `seasons` to a real per-team/per-club table. Affects whether `seasons` needs `team_id` + RLS.
- **§9.2 Curriculum as data vs code.** Challenges (`exercises`), quiz bank (`quizBank`), position targets and skill-ladder track definitions live in `js/data.js`, not the DB. Decide whether v1 keeps them as platform-default code (clubs cannot edit) or promotes them to `scope`-aware tables so clubs/teams customise. The video library (`drills`) and per-week `quizzes` are already DB-backed and scoped.
- **§9.3 Tenant context mechanism.** GUC (`request.club_id` via `set_config`) vs JWT custom claims for the resolved club/team. JWT is tamper-proof but needs token refresh on membership change.
- **§9.4 Access materialisation.** Whether to add a materialised `(user_id, team_id)` access table for RLS performance at extreme scale.
- **§9.5 `memberships.scope_id` integrity.** Polymorphic `bigint` vs separate FK columns (`club_id`/`team_id`) + CHECK. Polymorphic is simpler; FK columns give DB-enforced integrity.
- **§9.6 One-active-licence-per-club** enforcement (partial unique index) and the exact grace/read-only state machine (`active→past_due→grace→cancelled`).
- **§9.7 Club-admin exact column set.** §5.1 draws the line; the final field list per the brief's open decision (§11) should be ratified with Security/Legal before launch.
- **§9.8 Whether `goals` (and other child tables of `fixtures`) carry their own `team_id`** (chosen here for RLS-without-join) or rely solely on the parent's scope.

### Assumptions (from brief §12, validated against code)
- Built on the existing stack (vanilla SPA + Supabase + Caddy), **extended not replaced** — confirmed: every table above is a real table or a real column add.
- One shared Supabase project; subdomains are routing, not infrastructure — tenancy is logical (`club_id`/`team_id` + RLS).
- OWFC Harris is club #1 / team #1; all its existing rows belong unambiguously to it (so backfill is a flat `SET team_id=1, club_id=1`).
- We are the data **processor**; each club a **controller** (drives the safeguarding posture in §5).
- Sponsorship is a static branded page + a login flag, **not** a data table (no `sponsors` table exists today).
- No data is migrated *out* of `profiles`; flags are dual-run then deprecated.

---

## 10. Cross-document dependencies (what Architecture / Security must align on)

- **ARCHITECTURE.md** must implement the **subdomain/path → `clubs.slug` / `teams.slug` resolver** (§1.1, §1.2) and the **tenant-context binding** (§6.2) — and decide §9.3 (GUC vs JWT). It must also own the **Stripe webhook → `licences` activation + team provisioning** flow (§1.4).
- **Security / isolation test suite** (brief §8 risk #1, the release gate) must assert §5's matrix **per table, per role, per operation** — especially the `using(true)` tables flagged here (`rsvp`, `directory`, `video_reflections`, `media`, `attendance`) which are the current leak points.
- **LICENCE_DPA_CHECKLIST.md** must reflect the controller/processor split that §5.1's club-admin line implements (parent contacts and children's private content are processor-held, not exposed to the club controller's admins beyond the agreed roll-up).
- **The club-admin visibility line (§5.1)** is the single most cross-cutting decision: it must be identical in the data layer (RLS + `v_club_rollup`), the app UI, and the DPA.
```

---

## 11. Content banding & development visibility (`DECISIONS_LOG.md` D-9)

Development content is banded on **two axes** (age × standard) with **per-player differentiation**, and a strict **visibility split**: coaches see the level and the assessments; children see only progress and achievement.

### 11.1 Team & player banding fields

| Table | Column | Type | Notes / visibility |
|---|---|---|---|
| `teams` | `age_band` | enum (`u7_8`,`u9_10`,`u11_12`,`u13_14`,`u15_16`) | Drives FA format, reading level, UI band, safeguarding. Coach-set. |
| `teams` | `playing_level` | enum (`foundation`,`development`,`competitive`,`performance`) | **Coach-only.** Drives content difficulty filter. Never exposed to family/player. |
| `players` | `player_level` | enum, nullable | Per-player override of team default (stretch/ease). **Coach-only.** |
| `players` | `card_tier` (existing) | — | Derived from progress — **child-visible** (the reward). |

### 11.2 Library content tags (on every scoped content table — `drills`/videos, `quizzes`, `exercises`/challenges, skill-ladder rungs, position targets)

| Column | Type | Purpose |
|---|---|---|
| `age_min` / `age_max` | enum band | Age-suitability range |
| `difficulty_tier` | enum (`foundation`…`performance`) | Challenge/complexity |
| `prerequisite_skills` | `text[]` / `int[]` (skill ids) | Gate — item hidden until prerequisites met (guards complex drills from unready teams) |

**Surfacing rule (app + query):** an item shows for a team where `age_min ≤ team.age_band ≤ age_max` **AND** `difficulty_tier ≤ team.playing_level` (+1 "stretch" tier) **AND** the player/team meets `prerequisite_skills`. Coaches can preview/override the full library; families/players only ever receive the filtered set.

### 11.3 Assessments (new table) — coach-only

`assessments (id, player_id, team_id, club_id, area, skill_id, level/rating, assessed_by, assessed_at, note)`. This is the coach's working judgement (incl. `playing_level` rationale and skill ratings).

### 11.4 Visibility matrix — the split

| Data | Coach / team_admin | Child / family | Club admin (rollup) |
|---|---|---|---|
| `teams.playing_level`, `players.player_level` | **Read/write** | **No** | Aggregate only (e.g. squad spread), not labelled per child |
| `assessments` (ratings, notes, raw skill levels) | **Read/write (own team)** | **No** | **No** (summary % only) |
| `difficulty_tier` of content | Visible (selecting/curating) | Hidden (child just sees the task) | No |
| Progress (dev %), `card_tier`, badges, mastered-skill **achievements**, AP | Read | **Read (their own)** | Aggregate summary |

**RLS consequence:** `assessments` and the `playing_level`/`player_level` columns get policies allowing `coach`/`team_admin` (own team) + `platform_admin` only — **never** `family`/`player`. Child-facing development is served through a **derived view** (`v_player_progress`) exposing only progress/achievement fields, so a raw assessment can never leak via the family API. This reconciles §5.1: the club-admin roll-up sees *summary* progress, not assessments or per-child level labels.

**Why:** the playing level and assessment are coaching instruments; surfacing them to a child risks the shame/labelling harm the engagement research warns against (`ENGAGEMENT_AND_UX_STRATEGY.md §1`). The child experiences only their growth.
