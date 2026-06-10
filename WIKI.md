# OWFC Harris U11 — Project Wiki

The complete reference for the OWFC Harris team website: what it is, how it's built, how it's hosted, how to run it, and how to change it.

> **Security note:** this file may end up in the public GitHub repo, so it contains **no passwords**. Where a password/secret is needed, it says *where it lives* rather than the value itself.

---

## 0. Mission & doctrine

**Mission:** build a website where the children of the team can **learn, develop and monitor their own progress** — and where dedication and achievement are rewarded, while poor behaviour and performance carry a cost, all through a structured, transparent league system.

The site is also the team's **communication and information portal** for parents.

Every decision is measured against these principles:

1. **Develop the player.** Help each child learn, improve and see their own progress over a season.
2. **Reward dedication and achievement.** Effort, attendance, learning and good behaviour earn points.
3. **Hold standards.** Poor performance or behaviour costs points — fairly and openly.
4. **One structured league.** A single, consistent points system is the backbone that ties it all together.
5. **Serve the parents.** Be the clear, single source of information and communication for families.
6. **Make development fun.** Kids should *want* to learn and climb the league.
7. **Make coaching easy.** Admins manage, monitor and develop the squad with minimal effort and no spreadsheets.
8. **Keep the UI/UX simple.** Clarity over cleverness, on every screen, for kids, parents and coaches.
9. **Automate communication.** Reach families proactively, using best-in-class tooling wherever possible.

This doctrine is the reference point for prioritisation, design reviews and new features.

---

## 1. What it is

A private, members-only website for the **OWFC Harris Under-11s** football team. Families log in with a name + password to see:

- **Home** — personalised to the family's child: a "Welcome back, {name}!" hero with their FC card, the next fixture + next training with **tap-to-RSVP** (Going / Lift / Can't), a 5-stat season strip ending in the child's own **My league points**, their **My Development** videos (tap → Development to watch & earn), and the **Team Training** drill videos. (Admins/no-child see a team-level version.)
- **Fixtures** — upcoming games (with attendance) and past results.
- **Schedule** — a single agenda list of training, matches and events, each with RSVP (Going / Lift / Can't).
- **Players** — an FC-style card and profile per player, showing factual stats (goals, assists, MOTM, training sessions, league points).
- **Events** — fundraisers, days out, celebrations, with galleries.
- **League** — an "academy league" table ranking players by points.
- **⚙ Admin** (coaches only) — forms to add fixtures, enter results, manage player stats, and add players/training/events.

Theme: **matt gold & black**, FC26-inspired player cards, kid-friendly.

---

## 2. Architecture at a glance

```
   Families' browsers
          │  (https / http)
          ▼
   ┌──────────────────────┐        ┌─────────────────────────┐
   │  Vultr server         │        │  Supabase (cloud)        │
   │  Caddy → static files │        │  • Postgres (data)       │
   │  /var/www/harris      │        │  • Auth (logins)         │
   │  (HTML/CSS/JS)        │ ─────► │  • Row Level Security    │
   └──────────────────────┘  API   └─────────────────────────┘
          ▲                              ▲
          │ git pull                     │ SQL editor / Admin panel
   ┌──────────────────────┐             (data changes)
   │  GitHub repo          │
   │  team-dr-odwell/      │
   │  Harris_Football_new  │
   └──────────────────────┘
          ▲ push (GitHub Desktop)
   ┌──────────────────────┐
   │  Your Mac (the code)  │
   └──────────────────────┘
```

**Two independent layers:**

- **Code** (look, behaviour, pages) → lives in the GitHub repo → deployed to the Vultr server.
- **Content** (players, fixtures, results, RSVPs, events, photos) → lives in **Supabase** → changed via the in-app Admin panel or Supabase's SQL editor. **No deploy needed for content.**

---

## 3. Where everything lives (accounts & services)

| Thing | Where | Notes |
|---|---|---|
| Domain | **harris.football** (registrar: Namecheap) | DNS not yet pointed to the server at time of writing; site runs on the IP over HTTP until then. |
| Web server | **Vultr** — Ubuntu 24.04, London. Public IP **108.61.221.195** | Runs Caddy; serves the static files. |
| Web server files | `/var/www/harris` on the server | A git clone of the repo. |
| Code repo | **GitHub: team-dr-odwell/Harris_Football_new** (public) | Source of truth for the code. |
| Backend / database | **Supabase** project (org "dr-odwell's Org") | Postgres + Auth + Storage. |
| Backend keys | `js/config.js` (Project URL + **publishable** key — safe to be public) | The publishable key is designed for browsers; RLS protects the data. |
| Admin login | Supabase → Authentication → Users (e.g. `daniel@harris.football`) | Password set by you in Supabase; not stored in the repo. |

Separate, unrelated project on the *original* Hetzner server: **carbon-co** (a Caddy/Docker stack). Harris is deliberately on its **own** Vultr server with **no connection** to it.

---

## 4. Repository / file structure

```
Harris Football/
├── index.html               App shell + login gate (loads the JS below)
├── css/
│   └── styles.css            All styling (matt-gold/black design system)
├── assets/
│   └── crest.svg             Team crest (placeholder — swap for the real one)
├── js/
│   ├── config.js             Settings + Supabase keys + login domain
│   ├── data.js               Sample data + the recurring training schedule
│   ├── store.js              Data layer (talks to Supabase OR local sample data)
│   └── app.js                Router + every page/screen
├── supabase/
│   ├── schema.sql            Full DB schema (run once on a fresh project)
│   ├── seed.sql              Sample season data (optional)
│   ├── auth-setup.sql        Profile auto-create trigger + RLS for name logins
│   ├── migrate-real-squad.sql      Real squad + captain
│   ├── migrate-training-events.sql Event columns + real events
│   ├── migrate-player-stats.sql    Adds players.sessions + players.points
│   ├── migrate-fixtures.sql        All 24 real 2025/26 fixtures
│   └── migrate-rsvp.sql            RSVP table (schedule attendance + lifts)
├── deploy/
│   ├── nginx-harris.conf     (legacy — we ended up using Caddy, not nginx)
│   └── update.sh             Helper: git pull on the server
├── README.md                 Setup/deploy quick-start
├── DEPLOY-HETZNER.md         Original Hetzner guide (superseded by Vultr/Caddy)
└── WIKI.md                   This document
```

---

## 5. Front-end app (how the code works)

Plain **HTML + CSS + vanilla JavaScript** — no build step, no framework. It's a single-page app using **hash routing** (`#home`, `#fixtures`, `#training`, `#events`, `#players`, `#players/<id>`, `#league`, `#admin/<tab>`).

Script load order (in `index.html`):

1. `supabase-js` (from CDN) — the Supabase client library.
2. `config.js` — your settings.
3. `data.js` — sample data + training schedule (`window.HARRIS_DATA`).
4. `store.js` — the data layer (`window.HarrisStore`).
5. `app.js` — boots the app, wires the login gate, renders pages.

**Rendering model:** each page is a function in `app.js` that builds an HTML string into `#view`, then attaches event listeners. `route()` reads the hash and calls the right page function.

Key shared helpers in `app.js`: `esc()` (HTML-escape), `fdate()`/`fmt12()` (date/time formatting), `itemsOn(iso)` (all activities on a date), `rsvpLabel()` / `wireRsvp()` (RSVP buttons), `openModal()`.

---

## 6. Configuration — `js/config.js`

| Field | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL. **Set** → live mode. Blank → preview mode. |
| `SUPABASE_ANON_KEY` | Supabase **publishable** key (safe in the browser). |
| `TEAM_PASSWORD` | Shared password used only in **preview** mode. |
| `LOGIN_EMAIL_DOMAIN` | `harris.football` — names are turned into `<name-slug>@harris.football` for Supabase login. |
| `TEAM_NAME`, `AGE_GROUP`, `CURRENT_SEASON` | Labels shown in the UI. |
| `DEMO_PLAYER_ID` | Which player is "me" in preview mode. |

---

## 7. Two run modes (preview vs live)

`store.js` checks `config.js`:

- **Live mode** (URL + key present — current state): reads/writes **Supabase**. Real logins, saved RSVPs, shared data.
- **Preview mode** (keys blank): runs on the sample data in `data.js`, saving changes to the browser's `localStorage` only. Good for trying the look without a backend.

The app code is identical in both; only the data source differs.

---

## 8. Authentication & access model

**Families log in with NAME + password** — there are no email addresses to remember.

- The site converts the typed name to a hidden login ID: `David Kirby → david.kirby@harris.football`. (`LOGIN_EMAIL_DOMAIN` in config.)
- That maps to a Supabase Auth user (email + password). You create one per family in **Supabase → Authentication → Users** (tick *Auto Confirm User*).
- On first login a parent picks **which player is their child** ("which player is yours?"); it's remembered (stored on their `profiles` row, or `localStorage` in preview). They can change it from the top-bar chip.
- **Admins** (coaches) have `profiles.is_admin = true` — they see the ⚙ Admin tab.

**Naming rule for new family logins:** name → lowercase, spaces become dots, then `@harris.football`. e.g. *Sam Butcher* → `sam.butcher@harris.football`. Keep a private list of name + password as you create them (passwords aren't recoverable, only resettable).

**Row Level Security (RLS):** every signed-in member can **read** everything; only **admins** can write fixtures/players/results/etc; any member can write their own **RSVP** and **media**. Enforced in the database (see `schema.sql`).

---

## 9. Database schema (Supabase / Postgres)

Tables and what they're for. **Bold** = actively used; *italic* = created but now superseded.

| Table | Purpose | Key columns |
|---|---|---|
| **players** | The squad | number, name, pos, captain, goals, assists, motm, **sessions**, **points**, init, program |
| **fixtures** | Matches | status (`upcoming`/`past`), date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm |
| **goals** | Goals in a match | fixture_id, scorer, assist |
| **events** | Club events | title, description, location, date, **time**, **link**, img |
| **training_sessions** | One-off extra sessions | date, start, "end", location, focus, drills *(regular weekly training is in code, not here — see §11)* |
| **media** | Photos/videos | fixture_id / event_id, type, url, caption |
| **rsvp** | **Schedule attendance** | activity_key, player_id, status (`yes`/`no`/`lift`) |
| **profiles** | Links a login to a player + admin flag | id (=auth user), player_id, parent_name, is_admin |
| **seasons** | Season label | name, league, is_current |
| *attendance* | *old per-fixture attendance* | superseded by **rsvp** |
| *game_points* | *old multi-component league points* | superseded by **players.points** |

Storage: a **public bucket named `media`** holds uploaded photos/videos.

---

## 10. Features (page by page)

**Home (`#home`)** — hero, season record (W-D-L), goals, squad size, top scorer; "next fixture" and "next training"; a mini league table.

**Fixtures (`#fixtures`)** — two tabs:
- *Upcoming*: opponent, competition, home/away, date, kick-off, meet-up, ground, kit, Google-Maps address link, and RSVP (Going / Lift / Can't).
- *Results*: score (or "Score to add"), W/D/L, goalscorers + assists, Man of the Match, and a photo/video gallery. A fixture counts as a result once its **date is in the past** (regardless of status flag).

**Schedule (`#training`, labelled "Schedule")** — a row-by-row agenda of everything coming up (training, matches, events), empty days skipped. Each row: date, type badge (Training/Match/Event), title, time (start–finish), location, and RSVP (Going / Lift / Can't) with a live "X going · Y need a lift" count.

**Players (`#players`, `#players/<id>`)** — gold FC-style cards (headline = league points; stats = Goals/Assists/MOTM/Training). Tap for a profile: the card, a stat strip (Goals, Assists, MOTM, Training, Points), the personal development plan, and a season-tracker note. Captain shows a gold **C**. *Ability ratings (pace/passing/etc.) were deliberately removed — we don't rate children's ability; we track factual achievements.*

**Events (`#events`)** — event cards with date, time, location, description, optional external link, and a gallery.

**League (`#league`)** — table ranked by **points**, showing Gls/Ast/MOM/Trn/Points; plus a fun weekly quiz and at-home challenges (cosmetic/fun; the official points are set by coaches).

**Admin (`#admin`, coaches only)** — tabs:
- *Add fixture* — opponent, date, times, home/away, kit, ground, address.
- *Enter result* — pick a fixture, set score, MOTM, add goalscorers/assists.
- *Player stats* — pick a player, set Goals / Assists / MOTM / Training sessions / League points.
- *Add player* — name, number, position, captain toggle.
- *Add training* — one-off extra session.
- *Add event* — title, date, time, location, link, details.

---

## 11. Key conventions & rules

- **Regular training is defined in code**, not the database — `trainingSchedule` in `js/data.js`:
  - **Thursdays 18:00–19:30**, Norman Park, Bromley — until **2026-09-17**.
  - **Saturdays 10:00–11:30**, Norman Park, Bromley — until **2027-05-22**.
  - To change training nights, edit `trainingSchedule` and redeploy the code.
- **Activity keys** (used by the RSVP table): training = `t<YYYY-MM-DD>`, match = `m<fixtureId>`, event = `e<eventId>`.
- **RSVP statuses:** `yes` (going), `lift` (going + needs a lift), `no` (can't). "Going" count = yes + lift.
- **Fixture status:** the app treats any fixture with a **past date** as a result, even if its `status` says `upcoming` (belt-and-braces so results never get stuck under Upcoming).
- **Kit values:** `gold` (home), `black` (away), `white` (third).
- **Positions:** GK, RB, LB, CB, CDM, CM, CAM, LM, RM, LW, RW, ST.
- **Player initials** (`init`) are the card avatar fallback until real photos are added.

---

## 12. How to change content (the everyday stuff)

Almost everything is done **in the app, no deploy needed**:

| To do this… | Go to… |
|---|---|
| Add a future fixture | ⚙ Admin → Add fixture |
| Enter a match score / scorers / MOTM | ⚙ Admin → Enter result |
| Update a player's goals/assists/MOTM/training/points | ⚙ Admin → Player stats |
| Add a squad member | ⚙ Admin → Add player |
| Add an extra training session | ⚙ Admin → Add training |
| Add an event | ⚙ Admin → Add event |
| Confirm attendance / lift | Schedule tab (any family) |
| Add a family login | Supabase → Authentication → Users (then optionally set their child/admin in `profiles`) |

Bulk changes (e.g. importing a whole season) are done with SQL in **Supabase → SQL Editor** — see §13.

---

## 13. SQL migrations (what each file does)

Run in **Supabase → SQL Editor**. On a brand-new project, run `schema.sql` first. The `migrate-*` files are the changes we layered on this season.

| File | What it does | When to run |
|---|---|---|
| `schema.sql` | Creates all tables + RLS policies | Once, on a fresh project |
| `auth-setup.sql` | Auto-creates a `profiles` row per login; lets parents save their child | Once, after schema |
| `seed.sql` | Loads sample players + points | Optional (demo only) |
| `migrate-real-squad.sql` | Clears sample data, adds the 12 real players + captain | Done |
| `migrate-training-events.sql` | Adds `events.time`/`link`; loads Club Awards + FootGolf | Done |
| `migrate-player-stats.sql` | Adds `players.sessions` + `players.points` | Done |
| `migrate-fixtures.sql` | Loads the real 22 played 2025/26 fixtures **with scores/results** (W/L) | Done |
| `migrate-rsvp.sql` | Creates the `rsvp` table for schedule attendance + lifts | **Run this** to save RSVPs for everyone |
| `migrate-parent-profiles.sql` | Adds `profiles.parents` (contact details collected at first login) | **Run this** for parent onboarding |
| `migrate-seasons.sql` | Adds `players.seasons`, `players.signed`, `players.stats` (per-season squad + stats); carries all players into 2026/27; backfills 25/26 stats | **Run this** for the season switcher |
| `migrate-training-videos.sql` | Adds `training_sessions.videos` (pin stock drill videos to a session) | **Run this** for session drills |
| `migrate-points.sql` | Creates `point_events` (the league points ledger) + RLS | **Run this** for the scoring system |
| `migrate-security.sql` | Locks parent contact data to family+admins (profiles RLS). Also disable open sign-ups in the dashboard | **Run this** (safeguarding) |
| `migrate-quiz.sql` | Creates `quizzes` (per-week coach overrides for the quiz) | **Run this** for the quiz editor |
| `migrate-appearances.sql` | Adds `fixtures.lineup` (who actually played) | **Run this** for appearances |
| `migrate-video-library.sql` | Upgrades the drill library into one video library: `description`, `team`, `player_ids` (assign to whole team or specific children) | **Run this** for the video library |
| `migrate-multi-child.sql` | Adds `profiles.player_ids` so one family login can link to several children (siblings/twins) | **Run this** for multi-child families |

### Weekly quiz

The quiz **refreshes automatically every week**: `currentQuiz()` rotates a fresh set from `data.js → quizBank` (5 skills + 5 general + 10 football) keyed by ISO week, so it changes with no coach effort. Coaches can override a given week in **Admin → Quiz** (shuffle a new set, write their own questions, or reset to automatic) — overrides are stored in the `quizzes` table per ISO week. Scores are auto-marked (1 per correct), one attempt per child per week, banked in the live season.

### League scoring (points ledger)

All point values live in `config.js → SCORING`. Every point a player earns is one row in `point_events`; a player's league total is the **sum** of their rows for the season (`ref` keeps it idempotent so nothing is double-counted). Sources:

- **Matches** (Admin → Enter result): goal +3, assist +5, MOTM +10, clean sheet +5 (defenders/GK ticked at result entry). Re-saving a result cleanly replaces that game's points.
- **Training register** (Admin → Register): attendance +3, good performance +3, poor −3.
- **Quiz** (auto-marked, 1 per correct): one attempt per child per ISO week; not done by Sunday = 0. See Admin → Quiz results.
- **Videos** (a child watching their *own* assigned videos): +2 first full watch, +1 each rewatch — auto-detected via the YouTube player. Videos live in ONE library (⚙ Admin → **Videos**): add a clip once with a description, then mark it **whole team** (Team Training) or assign it to **specific children by name** (their My Development). No re-uploading per child.
- **Challenges** (League page, parent/child ticks): fun home challenge +10, make-your-bed +5/week (weekly reset), coach challenge +10.
- **Manual** (Admin → Points & league): perfect month +20, bottom-of-league big challenge +20, or any correction.

Goals/assists/MOTM/training counts shown on cards & the league are now derived from the ledger, per season.

> Tip: if past fixtures ever show under "Upcoming", run: `update fixtures set status='past' where date < current_date;`

### Seasons (multi-season model)

- Seasons are defined in `config.js → SEASONS`, each running **1 Jul → 30 Jun**. Add a new entry every summer.
- Fixtures, training and events fall into a season **automatically by date** — anything from 1 Jul 2026 is 2026/27.
- The top-bar **season dropdown** switches the view; it defaults to whichever season today falls in. `2025/26` stays a read-only archive.
- Each player's stats/development are stored **per season** in `players.stats` (e.g. `{"2025/26": {...}, "2026/27": {...}}`). The app projects the selected season onto the cards. 25/26 is preserved as the child's development record.
- **Squad per season:** `players.seasons` lists which seasons a player is in; `players.signed` controls visibility (unsigned = "pending", hidden from parents).
- **Admin → Roster:** tick **In <season>** to carry/remove players, tick **Signed** to approve new kids. **Admin → Add player** creates new kids as *pending* in the selected season.

---

## 14. Hosting & server (Vultr + Caddy)

- **Server:** Vultr, Ubuntu 24.04, London, IP `108.61.221.195`.
- **Web server:** **Caddy** (installed natively), serving the static files from `/var/www/harris` on port 80. Config at `/etc/caddy/Caddyfile`.
- **Firewall (ufw):** allows 22 (SSH), 80, 443. (Vultr's Ubuntu image starts locked to SSH only — we opened 80/443.)
- **Cache rule:** the Caddyfile sets `Cache-Control: no-cache` on `index.html`/`*.js`/`*.css` so code updates appear on a normal refresh (no hard-refresh needed).
- **HTTPS:** not yet enabled — needs the `harris.football` DNS A record pointed to the IP, after which we switch the Caddyfile to a `harris.football { … }` block and Caddy fetches the certificate automatically.

Current `/etc/caddy/Caddyfile`:
```
:80 {
    root * /var/www/harris
    encode gzip zstd
    @nocache path / *.html *.js *.css
    header @nocache Cache-Control "no-cache"
    try_files {path} /index.html
    file_server
}
```

---

## 15. Deploy / update workflow (for code changes)

Content changes never need this — only code/design changes do.

1. **Make the change** in the project files (you, or in a Cowork session).
2. **Commit + push** in **GitHub Desktop**: type a summary → *Commit to main* → *Push origin*.
3. **Pull on the server:**
   ```bash
   ssh root@108.61.221.195
   cd /var/www/harris && git pull
   ```
4. **Refresh the site** (normal refresh is enough thanks to the cache rule).

Helper script: `/var/www/harris/deploy/update.sh` runs the pull for you.

**Golden rule:** a code change isn't live until it's been **(a) committed, (b) pushed, and (c) pulled on the server.** Several "it didn't update" moments this build were a missing one of those three.

---

## 16. Design system

- **Colours:** matt gold `#c9a227` (bright `#e7c75a`), black `#0e0e0f`, panels `#1c1c1e`, text `#f6f6f4`. All as CSS variables at the top of `styles.css`.
- **Fonts:** *Anton* (display/headlines), *Inter* (body) — from Google Fonts.
- **Components:** buttons (`.btn`, `.btn-gold`, `.btn-ghost`), cards (`.card`), tags/pills (`.tag` + colour variants), FC player cards (`.fc-card`), agenda rows (`.ag-row`), RSVP buttons (`.att-btn` with `yes`/`lift`/`no`), league table, modal.
- **Responsive:** mobile breakpoints at 760px and 520px; nav collapses to a hamburger.

---

## 17. The squad (2025/26)

GK 1 Sam Kirby (Captain) · DEF 2 Daniel O'Loughlin · DEF 3 Diego Cappello-Spedding · CM 4 Charlie Rodwell · LM 5 Sebestian Wallace · DEF 6 Duke Lands · ST 7 Jack Horrell · CM 8 Alex Biondini · ST 9 Rio Ballin-Blagrove · RM 10 Archie Wyatt · CM 11 Sam Butcher · CM 14 Lucci Verico.

League: **Tandridge Youth Football League** (U10 in 2025/26). Home ground: **Hawes Down Pitches, Hawes Lane, West Wickham, BR4 9AE**.

---

## 18. Troubleshooting runbook

| Symptom | Likely cause / fix |
|---|---|
| Code change didn't appear | Not pushed, or not pulled on server. Check GitHub Desktop "Push origin", then `git pull` on server, then refresh. |
| Old look persists after deploy | Browser cache — the Caddy no-cache rule fixes this; otherwise hard-refresh once (Cmd+Shift+R). |
| Past fixtures show under "Upcoming" | `update fixtures set status='past' where date < current_date;` |
| Players still show ability ratings | The `app.js` with the stats-card code wasn't pulled — `git pull` then refresh. |
| Can't save player sessions/points | Run `migrate-player-stats.sql` (adds the columns). |
| RSVPs only save on my device | Run `migrate-rsvp.sql` (creates the table) — then they save for everyone. |
| Schedule looks empty | It opens on the next activity day; the recurring training comes from `data.js` (`trainingSchedule`) which must be deployed. |
| Login rejected | In live mode the user must exist in Supabase → Authentication → Users (name → `…@harris.football`). |
| Site unreachable | `nginx`?—no, it's **Caddy**: `systemctl status caddy`; ports 80/443 open in `ufw`; DNS for the domain. |

---

## 19. Known limitations / not yet built

- **HTTPS / custom domain** — pending the Namecheap DNS A record → then a one-line Caddy change.
- **Disable public sign-ups** in Supabase (Authentication settings) so only coach-created accounts exist — recommended before sharing widely.
- **Player photos / cartoon avatars** — cards use initials; families can upload their own (consent-based) once the upload slot is wired to Storage.
- **Match results & scorers** for 2025/26 — fixtures load without scores; add via Admin → Enter result.
- **Gamification** — quiz/challenges are currently fun extras; league points are set by coaches (not auto-awarded).
- **Photo/video uploads** show as tidy placeholders until wired to Supabase Storage in live mode.

---

## 20. Suggested next steps

1. Run `migrate-rsvp.sql` so schedule RSVPs save for everyone.
2. Point `harris.football` DNS → `108.61.221.195`, then enable HTTPS.
3. Disable open sign-ups in Supabase; create a login per family.
4. Enter the 2025/26 results so the cards/league fill in.
5. Wire photo uploads to Storage; add the player avatars.
6. Roll the squad into the 2026/27 season when fixtures are released.

---

*Last updated during the build session. Keep this file in the repo so it deploys with the code and stays the single source of truth.*
