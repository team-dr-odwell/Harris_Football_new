# OWFC Harris U11 — Team Academy Website

A private, password-protected community site for the OWFC Harris Under-11s — fixtures, training, FC26-style player cards, events, photo/video galleries and a fun gamified academy league. Matt-gold-and-black theme, built for parents *and* the players.

---

## What's in the box

```
Harris Football/
├── index.html            ← the site (open this)
├── css/styles.css        ← matt gold & black design system
├── assets/crest.svg      ← team crest (swap for your real logo)
├── js/
│   ├── config.js         ← YOUR settings + Supabase keys go here
│   ├── data.js           ← sample 2025/26 season data
│   ├── store.js          ← data layer (preview ↔ live)
│   └── app.js            ← all pages & interactions
├── supabase/
│   ├── schema.sql        ← run once to create your database
│   └── seed.sql          ← loads the sample 25/26 season
└── README.md             ← this file
```

## Features

- **Upcoming fixtures** — opponent, ground, address (Google Maps link), kick-off & meet-up times, kit selection, and one-tap **attendance** (Going / Maybe / Can't) with a live count.
- **Past fixtures / results** — score, goalscorers + assists, Man of the Match, and a photo/video gallery anyone can add to.
- **Training** — dates, times, location and the session focus + drill plan for each session.
- **Events** — fundraisers, team days out and celebrations, each with its own gallery.
- **Player cards** — an FC26-style gold card per player (rating, position, squad number, attributes) that opens a full profile: season stats, attribute bars, a personal development plan, achievements and an improvement-tracker placeholder.
- **Academy League** — a leaderboard fed by training effort, attendance, the weekly quiz and fun at-home challenges, plus unlockable badges.
- **2025/26 season** — fully backdated with realistic placeholder data, ready for you to replace.

---

## Two ways to run it

### 1. Preview mode (right now, no setup)
`config.js` ships with the Supabase fields blank, so the site runs on the built-in sample data. Just open `index.html` in a browser.

- **Team password (preview):** `harris2026` — change it in `js/config.js` → `TEAM_PASSWORD`.
- Attendance, uploads and quiz scores save to *that browser only* (nothing is shared between people).

Preview mode is perfect for showing the team and deciding on look & feel before going live.

### 2. Live mode (real accounts + saved data)
To have real parent logins, saved attendance and shared photo/video uploads, connect a free **Supabase** project. ~15 minutes, free tier is plenty.

#### Step A — Create the project
1. Go to **supabase.com** → sign up → **New project**. Pick a name and a strong database password.
2. When it's ready, open **Project Settings → API** and copy the **Project URL** and the **anon public** key.

#### Step B — Build the database
1. In Supabase, open **SQL Editor → New query**.
2. Paste the contents of `supabase/schema.sql` and click **Run** (creates all tables + security rules).
3. New query again → paste `supabase/seed.sql` → **Run** (loads the sample 25/26 season). *(Skip this if you'd rather start empty and add your own.)*
4. **Storage → New bucket** → name it `media` → tick **Public** (this holds uploaded photos/videos).

#### Step C — Plug in your keys
Open `js/config.js` and fill in:
```js
SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGci...your anon key...",
```
The site automatically switches to live mode once these are set.

#### Step D — Add your families
1. In Supabase, **Authentication → Users → Add user** for each parent (email + password), or enable email invites.
2. To make someone an **admin** (can edit fixtures, players, etc.), in **Table editor → profiles** add a row: their user `id`, the `player_id` for their child, and set `is_admin` to `true`.

> Security note: the login screen is a real auth gate in live mode. Everyone signed in can read the site and submit attendance/photos; only admins can edit fixtures, players and results — enforced by the database (Row Level Security in `schema.sql`).

---

## Putting it online at harris.football

The site is just static files, so hosting is cheap/free. Easiest options:

- **Netlify** or **Vercel** or **Cloudflare Pages** — drag-and-drop this folder (or connect a Git repo). Then point your `harris.football` domain at it in the host's domain settings.
- **GitHub Pages** — push the folder to a repo, enable Pages, add the custom domain.

Any of these gives you HTTPS automatically. No server needed — Supabase handles the data.

---

## Making it yours

- **Logo:** replace `assets/crest.svg` with your real crest (keep the filename, or update the `<img src>` references).
- **Colours:** tweak the `--gold` / `--black` variables at the top of `css/styles.css`.
- **Team name / season / password:** all in `js/config.js`.
- **Your real squad, fixtures, results:** edit `js/data.js` (preview) or manage them in Supabase's Table Editor (live).
- **Quiz & challenges:** edit the `quiz` and `exercises` sections of `js/data.js`.

---

## Roadmap ideas (not yet built)
- Real file thumbnails in galleries (currently shows a tidy placeholder per upload).
- Auto-generated AI player-card photos.
- The improvement tracker (sprint times, passing accuracy, skill grades over time).
- Push/email reminders before kick-off.

Built for the OWFC Harris family. Howay the lads. ⚽
