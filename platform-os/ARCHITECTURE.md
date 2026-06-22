# Architecture Specification — Academy OS

*Technical architecture for the multi-tenant, white-label youth-football academy platform · v1 · 18 June 2026*

**Gate:** This document is the primary evidence for the **Architecture gate**. It defines how the existing single-team product (`harris.football`) becomes a multi-tenant platform served per-club on subdomains over **one shared instance**, with **no per-club infrastructure**.

**Companion docs (defer to these; do not duplicate):**
- `DATA_MODEL.md` — table definitions, the RLS policy matrix, the field-level "club top-level" split. *All deep Row-Level Security policy detail lives there.*
- `SECURITY_GDPR_SAFEGUARDING.md` — controller/processor split, DPA, breach process, children's-data isolation guarantees, audit logging. *All deep privacy/legal detail lives there.*
- `PROJECT_BRIEF.md` — product scope, three-tier model, commercial framing.

**Conventions:** British English. Every architectural claim is grounded in a real file/symbol read from the repo and cited inline. Anything not yet decided is marked **TBD** or **OPEN DECISION**. No invented figures.

---

## 1. System overview

### 1.1 What exists today (the ground truth)

The product is a **vanilla HTML/CSS/JS single-page app with no framework and no build step**, talking directly to a single Supabase project from the browser via the CDN client.

| Concern | Where it lives | Evidence |
|---|---|---|
| Markup / app shell | `index.html` | Login gate `#gate`, app shell `#app`, topbar, `#view` host, modal root; scripts loaded in order `supabase-js` → `config.js` → `data.js` → `store.js` → `app.js` (`index.html:81-85`) |
| Routing + render | `js/app.js` (2,955 lines) | Hash router `route()` (`app.js:234`), `VIEWS` map (`app.js:214`), `hashchange` listener (`app.js:100`) |
| State / auth / data | `js/store.js` (1,818 lines) | `S.init()`, `S.login()` (`store.js:33,42`), live loader `_loadLive` (`store.js:~196`), season projection `_applySeason` (`store.js:132`) |
| Config (per-deployment) | `js/config.js` | `window.HARRIS_CONFIG` with Supabase URL/key, team name, seasons, scoring (`config.js:11`) |
| Sample data | `js/data.js` | `window.HARRIS_DATA` (preview mode) |
| Styling / theme tokens | `css/styles.css` | CSS custom properties under `:root` (`styles.css:5-50`) |
| Database + RLS | `supabase/*.sql` | `schema.sql` (tables + RLS), `migrate-*.sql` incremental migrations |
| Tests | `test/*.js` | jsdom suites: `smoke.js`, `academy.js`, `content.js`, `safeguarding.js` |
| Deploy / serve | `deploy/Caddyfile`, `deploy/update.sh` | Caddy serves `/var/www/harris`; `git pull`-style update |

Auth today: a family types a **name**, `nameToEmail()` slugifies it to `<slug>@harris.football` and calls `supabase.auth.signInWithPassword` (`store.js:27-29, 46-47`). Roles are **boolean flags on `profiles`** (`is_admin`, `is_sponsor`) plus a `player_ids` jsonb array linking the account to its children (`store.js:219-223`; `schema.sql:117-122`; `migrate-sponsor.sql`; `migrate-multi-child.sql`).

### 1.2 The target: tenancy is *logical*, not physical

We do **not** spin up infrastructure per club. There is exactly **one** of each of the following, shared by every tenant:

- **One static SPA** (the same `index.html` + `js/*` + `css/*`), served from one document root.
- **One Supabase project** (one Postgres database, one Auth instance, one Storage).
- **One Caddy** instance, terminating TLS for every subdomain.

A "club" is a **row** in a `clubs` table; a "team" is a **row** in a `teams` table (per `PROJECT_BRIEF.md §5`). A new club is a database insert, not a deployment. The subdomain is a label that Caddy and the SPA read to decide *which tenant's data to show* — the bytes served are identical for every club.

### 1.3 Text architecture diagram

```
                          Internet
                             │
            *.harris.football│  (wildcard DNS A/AAAA → one server IP)
                             ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  ONE Vultr server                                              │
   │                                                                │
   │   ┌──────────────────────────────────────────────────────┐   │
   │   │  Caddy (single instance)                               │   │
   │   │   • on-demand TLS: issues a cert per subdomain         │   │
   │   │     the first time it is hit (Let's Encrypt)           │   │
   │   │   • ask-endpoint gate: only issue for known clubs      │   │
   │   │   • static file_server → /var/www/harris               │   │
   │   └──────────────────────────────────────────────────────┘   │
   │                          │ serves identical bytes              │
   │                          ▼                                     │
   │   ┌──────────────────────────────────────────────────────┐   │
   │   │  ONE static SPA  (index.html + js/* + css/*)           │   │
   │   │   • reads location.hostname → club slug                │   │
   │   │   • reads location.pathname → team slug                │   │
   │   │   • builds a TenantContext at boot                     │   │
   │   │   • themes itself per club (CSS variables)             │   │
   │   └──────────────────────────────────────────────────────┘   │
   │                          │ supabase-js (anon/publishable key)  │
   └──────────────────────────┼───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  ONE Supabase project                                          │
   │   • Auth (email/password; name→slug→email login)              │
   │   • Postgres: clubs, teams, memberships, + every content       │
   │     table carrying team_id (→ club_id via teams)               │
   │   • RLS: every query keyed off membership + tier  ◄── spine    │
   │   • Storage: media bucket(s), path-namespaced per tenant       │
   └──────────────────────────────────────────────────────────────┘

   Tenancy boundary = a WHERE clause enforced by Postgres RLS.
   It is NOT a network/instance boundary.
```

**The single most important architectural consequence:** because isolation is a *logical* boundary (an RLS predicate) rather than a *physical* one (separate databases), the entire safety of the platform rests on RLS being correct on every table. This is stated as the highest risk in `PROJECT_BRIEF.md §8.1` and is why the deep policy work is gated in `DATA_MODEL.md` and isolation tests are a release gate (§7, §9 below).

---

## 2. Tenant resolution lifecycle

### 2.1 The chain

```
HTTP request
  → hostname  (club2.harris.football)         ── parsed to CLUB SLUG = "club2"
  → pathname  (/team2/...)                     ── parsed to TEAM SLUG  = "team2"
  → Supabase session (getSession)             ── identifies the USER
  → memberships rows for (user × club/team)   ── gives ROLE + which tiers
  → RLS context                               ── Postgres scopes every query
```

### 2.2 How the SPA learns its club and team at boot

Today `S.init()` (`store.js:33`) creates the Supabase client and checks for a session, then `enterApp()` (`app.js:47`) loads data and routes. We insert tenant resolution **before** the data load.

**New step — `resolveTenant()`** (proposed, in `store.js`, called at the top of `init()`):

```js
// Pseudocode — grounded in existing location.* usage and S.init()/enterApp().
resolveTenant() {
  const host = location.hostname;                 // e.g. "club2.harris.football"
  const path = location.pathname;                 // e.g. "/team2"
  const ROOT = "harris.football";                 // cfg.PLATFORM_ROOT_DOMAIN

  // ----- club slug from subdomain -----
  let clubSlug = null;
  if (host.endsWith("." + ROOT)) {
    const label = host.slice(0, -("." + ROOT).length);   // "club2"
    if (label && label !== "www") clubSlug = label;
  }
  // apex host (harris.football / www) and localhost → platform/marketing context

  // ----- team slug from FIRST path segment (before the hash app) -----
  const seg = path.split("/").filter(Boolean);    // ["team2"]
  const teamSlug = seg[0] || null;

  this.tenant = { clubSlug, teamSlug, club: null, team: null, role: null };
  return this.tenant;
}
```

**Why hostname for club and path for team:** the brief fixes this — *"the subdomain identifies the club; the path identifies the team"* (`PROJECT_BRIEF.md §3`), i.e. `club2.harris.football/team2`. The SPA reads `location.hostname` and `location.pathname` directly; both are already available in the browser and require no server cooperation. The existing router only ever reads `location.hash` (`app.js:234-235, 100`); the **hash space is preserved verbatim** for in-app navigation (see §4.5), so we are adding two new inputs (host, path) rather than changing the existing one.

### 2.3 Resolving slugs → rows → role

After Auth resolves the session (existing `getSession` in `init()`, `store.js:36`), we resolve the slugs to database rows and the user's role:

1. **Club row:** `select * from clubs where slug = :clubSlug`. If no row, the subdomain is invalid → show a friendly "club not found" page (and Caddy should never have issued a cert for it — §3.4).
2. **Team row:** `select * from teams where club_id = :club.id and slug = :teamSlug`.
3. **Memberships:** `select * from memberships where user_id = :uid` → the set of `{club_id|team_id, role}` this user holds (membership is many-to-many per `PROJECT_BRIEF.md §5`, so a parent with children in two teams works). The user's **effective role for this tenant** is the membership matching the resolved club/team.
4. **Tier derivation:** `platform_admin` (any club) → `club_admin` (this club, top-level only) → `coach`/`team_admin` (this team) → `family`/`player`/`sponsor` (this team, scoped). These map directly onto `PROJECT_BRIEF.md §6`.

This **replaces the current boolean-flag role read** (`store.js:219-220`, `this.isAdmin = !!prof.is_admin`). The flags become *derived* from membership rows rather than stored on `profiles` (migration path in §8). The deep policy/matrix is `DATA_MODEL.md`.

### 2.4 RLS context

The SPA never passes `club_id`/`team_id` as a trusted filter — it passes the user's **JWT**, and Postgres RLS derives the allowed rows from `auth.uid()` joined to `memberships`. This is the same trust model the current code already relies on: `is_admin()` is a SQL function reading `profiles` keyed off `auth.uid()` (`schema.sql:141-143`), and the sponsor/profile lockdown policies key off `id = auth.uid()` (`migrate-security.sql`). We extend that pattern from "is this user an admin?" to "is this user a member of the club/team that owns this row, and at what tier?". **Full predicates: `DATA_MODEL.md`.**

App-layer checks (the hash guard for sponsors at `app.js:240-249` is the existing precedent) remain as **defence in depth** but are never the only line — RLS is authoritative (`PROJECT_BRIEF.md §5, §8.1`).

### 2.5 Per-club theming at boot

See §4.2. In short: once the `club` row is resolved, the SPA writes the club's brand colours into the existing CSS custom properties (`styles.css:5-50`) and swaps crest/title before first paint.

---

## 3. Subdomain routing + TLS

### 3.1 Wildcard DNS

A single wildcard record covers every present and future club:

```
*.harris.football   A     <server-ip>
*.harris.football   AAAA  <server-ipv6>   (if used)
harris.football     A     <server-ip>     (apex, kept for the marketing/platform site)
www.harris.football A     <server-ip>
```

Consequence: **a new club needs zero DNS work** — `club2.harris.football` already resolves the moment the `clubs` row exists. This is the brief's "a new club is one row — the wildcard already covers it" (`PROJECT_BRIEF.md §5`).

> **Note — wildcard ≠ wildcard certificate.** Wildcard *DNS* points all subdomains at the server. It does **not** give us a wildcard TLS *certificate*. We deliberately issue **per-subdomain** certs via on-demand TLS (§3.2) rather than one `*.harris.football` cert, because a wildcard cert requires DNS-01 challenges (an API token for the DNS provider) and is harder to scope/rotate. Custom domains (§3.5) could never be covered by a wildcard cert anyway, so per-host issuance is the forward-compatible choice. **OPEN DECISION:** revisit if on-demand issuance volume becomes a problem — a single wildcard cert is an alternative that trades operational simplicity for a DNS-provider dependency.

### 3.2 Caddy on-demand TLS — how it works

Today the Caddyfile names exactly two hosts and lets Caddy auto-obtain a Let's Encrypt cert for them (`deploy/Caddyfile`):

```
harris.football, www.harris.football {
    root * /var/www/harris
    encode gzip
    file_server
    ...
}
```

We cannot name 100+ clubs statically. **On-demand TLS** solves this: Caddy obtains a certificate **at the moment a TLS handshake arrives for a hostname it does not yet have a cert for**, then caches and auto-renews it. The target Caddyfile shape:

```
{
    on_demand_tls {
        ask http://127.0.0.1:9123/can-issue   # validate the host BEFORE issuing (§3.4)
        # optional rate caps live here too (interval/burst)
    }
}

# Apex + www: explicit, eagerly issued (unchanged behaviour)
harris.football, www.harris.football {
    root * /var/www/harris
    encode gzip
    file_server
    @nocache { path *.html *.js *.css *.svg / }
    header @nocache Cache-Control "no-cache, no-store, must-revalidate"
}

# Every club subdomain: on-demand
*.harris.football {
    tls { on_demand }
    root * /var/www/harris        # SAME document root — identical bytes
    encode gzip
    file_server
    @nocache { path *.html *.js *.css *.svg / }
    header @nocache Cache-Control "no-cache, no-store, must-revalidate"
}
```

The `*.harris.football` site block serves the **same `/var/www/harris` root** — confirming tenancy is routing, not infrastructure. The `@nocache` rule (already present in `deploy/Caddyfile`) is preserved so SPA/JS/CSS updates go live immediately on `git pull`.

> **Deploy inconsistency to resolve (found in repo):** `deploy/Caddyfile` uses Caddy, but `deploy/update.sh` runs `nginx -t && systemctl reload nginx`, and a `deploy/nginx-harris.conf` also exists. The brief and this spec standardise on **Caddy** (for its on-demand TLS). **ACTION:** update `deploy/update.sh` to `caddy validate && systemctl reload caddy` (no rebuild needed — static site) and retire the nginx config, OR document nginx-as-reverse-proxy-in-front explicitly. Marked as an architecture clean-up item, not a blocker.

### 3.3 Let's Encrypt rate limits + mitigation

Let's Encrypt enforces issuance rate limits (the well-known ones being **certificates-per-registered-domain per week** and **duplicate-certificate** caps; *exact current numbers: verify against Let's Encrypt's published limits at build time — marked TBD here to avoid quoting a figure that may have changed*). Because every club is a subdomain of the **same** registered domain `harris.football`, **all clubs share one rate-limit bucket**. Onboarding a large wave of clubs in a short window could exhaust the weekly allowance and block new cert issuance.

Mitigations, in priority order:

1. **Ask-endpoint gate (§3.4)** — never issue for a hostname that is not a provisioned club. This stops attackers (or typos, or scanners) from burning the quota by hitting random subdomains.
2. **Stagger bulk onboarding** — provision clubs in waves (the brief already plans "onboard in waves", `PROJECT_BRIEF.md §9 Phase 3`). On-demand issuance naturally spreads load to first-visit, but a coordinated launch can still spike.
3. **ACME account / CA fallback** — Caddy can fall back to a secondary ACME CA (e.g. ZeroSSL) if Let's Encrypt issuance fails, giving headroom. Configure a fallback issuer.
4. **Monitor issuance** — alert on cert-issuance failures and on approaching the weekly cap (see §7). This is the brief's "needs monitoring and a fallback" (`PROJECT_BRIEF.md §8.3`).
5. **Persist the cert store** — Caddy's certificate/key storage must be on durable, backed-up disk so a server rebuild does not force re-issuance of every cert at once (which would itself hit the rate limit). **ACTION:** confirm Caddy storage path is on persistent disk and is in the backup set.

### 3.4 The ask-endpoint (validate before issuing)

On-demand TLS without a gate is dangerous: any hostname pointed at the server would trigger an issuance attempt, exhausting the rate limit. Caddy's `on_demand_tls.ask` directive calls an HTTP endpoint **before** attempting issuance; if it returns non-2xx, Caddy refuses.

**Design:** a tiny endpoint (e.g. a Supabase Edge Function, or a minimal local service on `127.0.0.1:9123`) that answers `GET /can-issue?domain=club2.harris.football`:

- Strip the `.harris.football` suffix → `club2`.
- `select 1 from clubs where slug = :slug and status = 'active'` (or licence-active per the `licences` table in `PROJECT_BRIEF.md §5`).
- Return **200** if a live club owns that slug, **403/404** otherwise.

This ties **certificate issuance to provisioning**: the cert exists only for real, licensed clubs. It is the natural enforcement point for licence expiry too (an expired club could be made to fail the ask check → no new cert, or kept valid-but-read-only depending on the dunning policy — that policy is **commercial/TBD**, `PROJECT_BRIEF.md §8.5`).

**OPEN DECISION:** where the ask-endpoint runs (Supabase Edge Function vs a small co-located service). Edge Function keeps everything in one platform and reads the live `clubs` table directly; a co-located service is lower-latency for the handshake path. Latency on the handshake path argues for co-located + a short cache. To be decided at implementation.

### 3.5 Future custom domains

Out of scope for v1 (`PROJECT_BRIEF.md §4`, "custom domains / full white-label … later"). The architecture is already compatible:

- A club adds a CNAME from `academy.theirclub.com` → `theirclub.harris.football` (or an A record to our IP).
- Caddy's on-demand TLS issues a cert for that custom host **on first hit**, gated by the **same ask-endpoint**, which would additionally check a `custom_domains` table mapping the external host → club.
- The SPA's `resolveTenant()` (§2.2) gains a lookup branch: if the host is not a `*.harris.football` subdomain, resolve it via the `custom_domains` table instead of slug-parsing.

No change to the data model spine or RLS is required — only host→club resolution and the ask-endpoint gain a table. This is why it is safely deferrable.

---

## 4. Application changes vs today

### 4.1 A `TenantContext` object

Today there is no tenant concept; the app is implicitly "Harris". We introduce a single source of truth on the store, populated by `resolveTenant()` (§2.2) and enriched after DB resolution (§2.3):

```js
S.tenant = {
  clubSlug, teamSlug,
  club:  { id, slug, name, brand },     // resolved clubs row
  team:  { id, slug, name },            // resolved teams row
  role:  "club_admin" | "coach" | "family" | "player" | "sponsor" | "platform_admin",
  tier:  "platform" | "club" | "team",
}
```

Every existing data read in `_loadLive()` (`store.js:~196-248`) — which today does unscoped `sb.from("players").select("*")` etc. — gains the assumption that **RLS has already scoped the rows to this tenant**. The app therefore does *not* add `where team_id = ...` to client queries (that would be a trusted client filter, the anti-pattern); it relies on RLS (§2.4) and may *additionally* assert the returned rows match `S.tenant` as a defence-in-depth tripwire. **The authoritative scoping is `DATA_MODEL.md`.**

The existing boolean role properties (`S.isAdmin`, `S.isSponsor`) are **repointed** to derive from `S.tenant.role` so the hundreds of existing call-sites (e.g. `app.js:54` nav-admin toggle, `app.js:117` sponsor chrome, `app.js:248` sponsor guard) keep working unchanged. This keeps the multi-tenant change surgical.

### 4.2 Per-club branding / theming (extend the existing plumbing)

The theme is already **entirely CSS custom properties** under `:root` (`styles.css:5-50`): surfaces, ink, the gold accents (`--gold`, `--gold-ink`, `--gold-soft`), and a set of back-compat aliases (`--black`, `--panel`, `--white`, etc., `styles.css:42-49`). The app changes the *displayed* numbers per season today by projecting `p.stats[season]` onto flat fields in `_applySeason()` (`store.js:132-141`) and re-rendering — the precedent for "re-skin the whole UI from one switch without touching every screen".

**Extension:** a club's `brand` (a JSON blob on the `clubs` row — `PROJECT_BRIEF.md §5` lists `clubs(slug, name, brand, licence)`) carries the theme overrides. At boot, after `resolveTenant()` resolves the club, an `applyClubBrand()` step writes them into the CSS variables and swaps identity assets:

```js
applyClubBrand(brand) {
  const r = document.documentElement.style;
  if (brand.primary)   r.setProperty("--gold", brand.primary);     // fill accent
  if (brand.primaryInk)r.setProperty("--gold-ink", brand.primaryInk);
  if (brand.bg)        r.setProperty("--bg", brand.bg);
  // ...map the rest of the documented token set...
  document.title = brand.name + " — Team Academy";
  // swap crest: index.html hard-codes assets/crest.svg (index.html:13,19,42,71)
  document.querySelectorAll('img[src*="crest.svg"]').forEach(i => i.src = brand.crestUrl || i.src);
  document.querySelectorAll(".brand-text strong, .gate-title span")
          .forEach(e => e.textContent = brand.shortName || brand.name);
}
```

This reuses the exact CSS-variable surface the design already exposes, so no per-screen edits are needed — the same property that makes "Harris Light" themeable makes it club-themeable. **Constraints:** the brand fields must respect the existing accessibility notes baked into the tokens (e.g. the comment at `styles.css:21` that gold *text* must use `--gold-ink` for AA contrast). **OPEN DECISION:** validate club-supplied colours for WCAG AA contrast at provisioning time, or constrain brands to a curated palette. Recommended: validate-and-warn at checkout; full free-form colour is a support/legibility risk.

Hard-coded "HARRIS"/"OWFC Harris" strings exist in `index.html` (`index.html:7,8,20,21,43,72,73`) and the footer. These must be **driven from `S.tenant.club.name`** rather than literals. **ACTION:** parameterise the shell strings (small, enumerable list).

### 4.3 Club / team switcher (reuse the child-switcher pattern)

There is an **existing, working switcher pattern** to reuse: the child picker (`showChildPicker()` in `app.js`, invoked from the top-bar chip `#myplayer-btn`, `app.js:87`). Its shape:

- A top-bar **chip** shows the active selection and a `⇄` glyph when more than one option exists (`updateMyPlayerChip()`, `app.js:103-108`).
- Clicking it opens a picker listing the options as cards; the active one is marked (`app.js:184-190`).
- Selecting one calls a store setter, updates the chip, resets the hash to home, and re-renders: `await S.setMyPlayer(+id); updateMyPlayerChip(); location.hash = "#home"; route();` (`app.js:199-201`).
- The set of linked children is persisted to the profile via `setMyKids()` (`app.js:202-206`; `store.js:577`).

**The club/team switcher is the same control at a higher tier.** For a user whose memberships span more than one team (a coach across two teams; a parent with children in two teams — exactly the many-to-many case in `PROJECT_BRIEF.md §5`), the top bar shows a **team chip** (and, for `platform_admin`/multi-club users, a **club chip**) with the same `⇄`-when-multiple affordance. Selecting a different team/club changes `S.tenant` and **navigates** — but unlike the child switch (which only re-renders), switching team/club changes the **URL** because team is in the path and club is in the host:

| Switch | Mechanism | Cite |
|---|---|---|
| Child (within a team) | setter + re-render, hash → `#home` | existing `app.js:199-206` |
| **Team** (same club) | `location.pathname = "/" + teamSlug + "#home"` (full navigation; new path) | new, mirrors child setter |
| **Club** (cross-club, platform/multi-club only) | `location.href = "https://" + clubSlug + ".harris.football/" + teamSlug` (cross-origin) | new |

Switching **club** crosses an origin (different subdomain) so it is a real navigation, and the new page boots through `resolveTenant()` fresh — there is no shared client state to leak between clubs, which is a *desirable* isolation property. The chip UI, the "show ⇄ only when >1" rule, and the picker-card layout are lifted directly from the child switcher so the interaction is already familiar and tested.

### 4.4 Routing change: hash → club + path (+ preserved hash)

Routing today is **100% hash-based**: `route()` splits `location.hash` (`app.js:234-235`), a `hashchange` listener drives re-renders (`app.js:100`), and there is a deliberate **alias map** keeping old hashes alive so shared WhatsApp links never break (`app.js:218-226`). We must **not** throw this away.

**The model becomes three layers:**

| Layer | Identifies | Read from | Changes navigation? |
|---|---|---|---|
| Host | **Club** | `location.hostname` | Cross-origin (full page load) |
| Path (1st segment) | **Team** | `location.pathname` | Same-origin nav (full page load) |
| Hash | **View within the team app** | `location.hash` | In-app, no reload (unchanged) |

So `club2.harris.football/team2#academy/quiz` means *club2 → team2 → the academy quiz view*. The existing hash router and its alias map are **left intact**; we add a thin path-aware layer in front:

1. At boot, `resolveTenant()` reads host + path **once** (§2.2).
2. The existing `route()` continues to own everything after the `#` (`app.js:234`), untouched.
3. Internal links that today set `location.hash` (there are dozens, e.g. `app.js:99, 200, 426, 615, ...`) **keep working as-is**, because they navigate within the current team's path. They do not need the team prefix — the hash is relative to the already-loaded team app.
4. Only **team/club switches** (§4.3) and any externally-shared deep link need the path/host prefix.

**Static-serving requirement:** because the team slug is a **path** (`/team2`) and the SPA is a single `index.html`, Caddy must serve `index.html` for any path under a club host (an SPA fallback), so `/team2` and `/team2/anything` all load the app, which then reads the path. **ACTION:** add a `try_files {path} /index.html` style fallback to the club site block in the Caddyfile (currently it is a plain `file_server` over a static tree, `deploy/Caddyfile`). Without this, `/team2` would 404. This is the one genuinely new server-config requirement beyond TLS.

**OPEN DECISION:** keep team as a **path** (`/team2`, per brief) vs promoting it to part of the hash to avoid the SPA-fallback requirement. The brief is explicit that path identifies the team (`PROJECT_BRIEF.md §3`), so we follow that; the SPA fallback is a one-line Caddy change and the cleaner URLs are worth it. Documented so the trade-off is visible at the gate.

### 4.5 Backwards compatibility for Harris itself

When Harris becomes club #1 / team #1 (§8), existing shared links of the form `harris.football#academy` must keep resolving. Because the apex host is retained and the hash router is unchanged, `harris.football#academy` still works; we either (a) treat the apex/`harris.football` host as resolving to club #1 directly, or (b) 301-redirect apex deep links to the canonical `harris.football/<team1>#...`. **OPEN DECISION:** apex-as-club-1 vs redirect-to-canonical. Recommended: apex resolves to club #1 to guarantee zero broken links, with canonical subdomain available in parallel.

---

## 5. Config & environments

### 5.1 The public-repo constraint (load-bearing)

**The repository is PUBLIC.** Confirmed by the live `config.js` committing a Supabase URL and a key (`config.js:13-14`) and a preview `TEAM_PASSWORD` (`config.js:18`). This dictates the entire secrets posture:

- The committed Supabase key is the **anon/publishable** key (`config.js:14` comment: "publishable key (safe for the browser)"). This is *designed* to be public — it grants only what RLS allows. Its safety is **entirely** a function of RLS being correct (which is why RLS is the spine, §1.2, §7).
- **No `service_role` key, no Stripe secret, no SMTP/credential ever enters the repo or `config.js`.** Anything privileged runs **server-side only** — Supabase Edge Functions / the ask-endpoint service / Stripe webhooks — with secrets injected as **environment variables on the server**, never committed. `.gitignore` already excludes editor/log/temp junk (`.gitignore`) but is **not** a secrets boundary; the discipline is "privileged code is not in the static bundle at all".
- The preview `TEAM_PASSWORD` (`config.js:18`) is a **preview-mode-only** shared gate (used only when `SUPABASE_URL` is blank, `store.js:51-56`); it is not a production secret. In multi-tenant production, preview mode is per-developer, not shipped.

### 5.2 Environments

| Environment | Host | Supabase project | Purpose |
|---|---|---|---|
| **dev** | `localhost` / per-dev | a **separate** Supabase project (or local Supabase) with synthetic data | local work; never touches real children's data |
| **preview** | the SPA's built-in preview mode (`SUPABASE_URL` blank → sample data from `data.js`, `store.js:77-82`) | none | review UI with zero backend |
| **prod** | `*.harris.football` + apex | the single live Supabase project | real tenants |

**Key implication:** the production `SUPABASE_URL`/anon key currently live **in `config.js` in the public repo** (`config.js:13-14`). For one self-hosted product that is acceptable (the key is publishable). For the platform it remains acceptable for the **anon** key, but the dev/prod split must use **different Supabase projects** so dev work cannot read production children's data. **OPEN DECISION:** how config is selected per environment — options: (a) keep `config.js` as prod and override locally with an un-committed `config.local.js`, (b) inject `window.HARRIS_CONFIG` at deploy time, (c) derive the Supabase project from `location.hostname`. Recommended (a) for minimal change to the no-build-step ethos. **TBD:** whether a separate **staging** Supabase project is warranted before pilot (§ Phase 1).

### 5.3 No build step — keep it

The product has **no build/bundler** (`index.html` loads raw `js/*` in order, `index.html:81-85`). This is a feature: deploy is `git pull` and files are live (`deploy/update.sh`; `@nocache` header in `deploy/Caddyfile`). The multi-tenant changes (`resolveTenant`, `TenantContext`, theming) are **additive vanilla JS in the existing files** and preserve this. Introducing a bundler is explicitly **not** proposed for v1; revisit only if module count/size becomes a problem (TBD).

---

## 6. Hosting & scaling

### 6.1 Today

A single Vultr server runs Caddy serving a static tree (`deploy/Caddyfile`, `deploy/update.sh`), with Supabase as a managed backend. Deploy = SSH + `git pull`/`reset --hard` (`deploy/update.sh`).

### 6.2 What scales for free vs what needs attention

| Layer | At 1 club | At 100+ clubs | Action |
|---|---|---|---|
| Static SPA bytes | trivial | trivial (same file, cacheable, CDN-frontable) | Optionally front with a CDN (§6.4) |
| Caddy / TLS | 2 certs | 100s of certs, on-demand issuance | Rate-limit gate + monitoring + persistent cert store (§3.3) |
| Postgres rows | small | every content table now multiplied by clubs×teams | Indexing + connection pooling (§6.3) |
| Supabase Auth | one team's families | thousands of users across clubs | Managed by Supabase; monitor quotas (TBD plan tier) |
| Storage (media) | one bucket | tenant-namespaced paths, more objects | Namespace paths by club/team; CDN for delivery |

### 6.3 Postgres connection + index considerations

- **Indexes:** every content table gains `team_id` (and reaches `club_id` via `teams`, `PROJECT_BRIEF.md §5`). **Every** tenant-scoped query filters on `team_id`/`club_id` (via RLS), so these columns **must be indexed**, and the RLS predicates must be index-friendly (a composite index leading with `team_id` on each large table). Today there are **no tenant indexes** because there is no tenancy (`schema.sql` indexes only via PKs/FKs). Defining these is part of **`DATA_MODEL.md`**, but the architectural requirement — *the tenant key is on the hot path of every query and must be indexed* — is stated here.
- **Connection pooling:** supabase-js from the browser uses Supabase's connection pooler. At 100+ clubs with many concurrent families, ensure the **pooler (PgBouncer, transaction mode)** is the connection path, not direct connections. This is a Supabase config concern; monitor connection saturation (§7).
- **Row growth & the rollup:** the club **top-level rollup dashboard** (`PROJECT_BRIEF.md §4, §6`) aggregates across all a club's teams. At a club with many teams (the brief cites a real club with **104 teams**, `PROJECT_BRIEF.md §2`), naive per-team queries multiply. **OPEN DECISION:** compute rollups live vs materialise (a periodically-refreshed summary table / Postgres materialised view). Recommended: start live (simpler, RLS-correct), measure, materialise only if needed. Marked for `DATA_MODEL.md` to own the shape.

### 6.4 CDN / static

The SPA is fully static and identical for every host, so it is **CDN-friendly**. A CDN in front of Caddy would cut origin load and improve global latency. **Constraint:** the existing **no-cache header on HTML/JS/CSS/SVG** (`deploy/Caddyfile`) exists so updates go live instantly; a CDN must respect that (or we adopt cache-busting/versioned asset URLs — there is precedent: `crest.svg?v=2`, `index.html:13`). **OPEN DECISION:** CDN now vs later, and cache-busting strategy if so. Not required for pilot; revisit at scale.

### 6.5 When to move off single Vultr → managed

The brief flags this as an open decision (`PROJECT_BRIEF.md §11, §8.6`). Recommended **triggers** (rather than a date):

- **Reliability becomes a contractual obligation** to external clubs (post-pilot) → single-server SPOF is no longer acceptable → add a second Caddy node behind a load balancer (cert store must then be shared/replicated) or move static serving to a managed/CDN host.
- **Supabase tier limits** (connections, storage, Auth MAU) approached → upgrade Supabase plan (TBD which).
- **Ops load** of patching/monitoring one box exceeds value → managed hosting.

Until those triggers, the current single Vultr + Caddy + managed Supabase is adequate and the brief's "extended, not replaced" principle holds (`PROJECT_BRIEF.md §12`).

---

## 7. Observability & reliability

This is where single-team becomes **infrastructure others depend on** (`PROJECT_BRIEF.md §8.6`), and where **blast radius is the defining concern**: one shared instance means **one bug can affect all tenants** — including the worst case, a cross-tenant leak of children's data (`PROJECT_BRIEF.md §8.1`).

### 7.1 The isolation test gate (the most important reliability control)

There is an existing safeguarding test suite (`test/safeguarding.js`) and jsdom harness (`test/smoke.js`, `academy.js`, `content.js`). **Extend it into a mandatory cross-tenant isolation gate:** automated tests that, for **every** table, assert that a user in club A / team X **cannot** read or write any row belonging to club B or team Y — exercised against real RLS. The brief mandates this as a **release gate** (`PROJECT_BRIEF.md §8.1`, "mandatory automated tests as a release gate"; §10 DoD: "automated tests prove no club or team can ever read another's data"). **No deploy ships if isolation tests fail.** The test matrix is detailed in `DATA_MODEL.md`; the *gate policy* is architectural and stated here.

### 7.2 Logging

- **App-layer:** today errors are `console.error` (e.g. render failures, `app.js:264`; live-load fallback, `store.js:79`). For the platform, route significant client errors to a central sink (TBD: a lightweight error endpoint or a managed service) — **without logging any child PII** (safeguarding constraint; detail in `SECURITY_GDPR_SAFEGUARDING.md`).
- **Server-layer:** Caddy access/error logs (cert issuance especially — §3.3), the ask-endpoint, and Supabase's query/auth logs.
- **Audit log:** the brief requires audit logging for the controller/processor obligation (`PROJECT_BRIEF.md §7, §8.2`). Privileged actions (licence issue/revoke, role changes, cross-tier reads by platform admins) must be auditable. **Owned by `SECURITY_GDPR_SAFEGUARDING.md` for content; the architecture provides the table + write path.**

### 7.3 Monitoring & status

- **Cert issuance health** (failures, rate-limit proximity) — primary new signal (§3.3).
- **Supabase health** — connection saturation, error rate, Auth failures, storage.
- **Uptime/synthetic checks** on the apex and a sample club host.
- **Status page** — once external clubs depend on us, a public status page is expected (`PROJECT_BRIEF.md §8.6`). **TBD** which tool.

### 7.4 Backups

- **Postgres:** rely on Supabase's automated backups; **confirm the retention/PITR** matches the plan and document RPO/RTO. **TBD: confirm plan provides point-in-time recovery** — for children's data across many controllers this is not optional (`PROJECT_BRIEF.md §8.6`).
- **Caddy cert store:** must be backed up / on durable disk so a rebuild does not re-issue everything (§3.3).
- **Code:** the git repo is the source of truth; deploy is reproducible from it (`deploy/update.sh`).
- **Migrations:** the `supabase/*.sql` files are the schema history; keep them ordered and idempotent (the existing migrations already use `if not exists` / `drop policy if exists` patterns, e.g. `migrate-multi-child.sql`, `migrate-security.sql`).

### 7.5 Incident response & blast-radius containment

- **Containment levers** for a suspected cross-tenant leak: (a) the ask-endpoint can stop new cert issuance; (b) RLS can be tightened/rolled back via a migration; (c) a specific club can be suspended (`clubs.status`) which, via the ask-endpoint, also caps its cert. (d) In the extreme, take the whole instance to a maintenance page (one Caddy change) — acceptable because containing a children's-data breach outranks availability.
- **Breach process & ICO reporting** are legal/process and live in `SECURITY_GDPR_SAFEGUARDING.md` (`PROJECT_BRIEF.md §8.2`). The architecture's job is to make containment *possible and fast*.
- **Single-instance acknowledgement:** we accept that one instance = correlated failure domain. The mitigation is **not** physical isolation (the brief forbids per-club infra, `PROJECT_BRIEF.md §12`) but **layered logical isolation + the test gate + fast containment**.

---

## 8. Migration: Harris → club #1 / team #1, zero data loss

Goal (from `PROJECT_BRIEF.md §9 Phase 0` and §10 DoD): re-tenant in place and prove the platform on data we already trust, with zero loss. Concrete sequence:

1. **Snapshot first.** Take a verified Postgres backup/export of the live Supabase project before any schema change. (Confirm PITR is on, §7.4.) Nothing proceeds without a restorable snapshot.
2. **Add tenant tables (additive).** Create `clubs`, `teams`, `memberships`, `licences` (and `custom_domains` stub for later) — new tables, no change to existing ones yet. Follow the repo's idempotent migration style (`if not exists`). *Shapes owned by `DATA_MODEL.md`.*
3. **Seed club #1 / team #1.** Insert `clubs` row `{slug:'harris' (or apex), name:'OWFC Harris', brand:{…current Harris tokens…}}` and a `teams` row for the current squad, slug e.g. `team1` (final slug is an OPEN DECISION tied to §4.5). Brand = today's "Harris Light" tokens (`styles.css:5-50`) so the migrated site looks **identical**.
4. **Add `team_id` to every content table, nullable, then backfill.** Add the column nullable; `update <table> set team_id = <team1.id>` for **all existing rows** (every current row belongs to Harris/team #1); then set `not null`. Tables to cover include those in `schema.sql` (players, fixtures, goals, attendance, training_sessions, events, media, game_points, seasons) plus the later tables loaded by `_loadLive` (`point_events`, `quizzes`, `chores`, `squad_goals`, `directory`, `video_reflections`, `store.js:200-210`). **The completeness of this list is a zero-loss correctness condition** — derive it programmatically from the live schema, do not hand-list. *Detail in `DATA_MODEL.md`.*
5. **Migrate roles → memberships.** For each `profiles` row, create membership(s): `is_admin=true` (`schema.sql:121`) → `coach`/`team_admin` membership on team #1; `is_sponsor=true` (`migrate-sponsor.sql`) → `sponsor` membership on team #1; everyone else (with `player_ids`, `store.js:222`) → `family`/`player` membership on team #1. Keep the boolean columns during transition; derive `S.isAdmin`/`S.isSponsor` from membership (§4.1) so existing call-sites are unaffected.
6. **Layer RLS tiers over the data.** Replace the current "any authenticated member can read everything" policies (`schema.sql:145-153`) and the profile lockdown (`migrate-security.sql`) with tenant-scoped policies keyed off `memberships`. **This is the highest-risk step** — gated by the isolation test suite (§7.1) before it goes live. *Policies owned by `DATA_MODEL.md`.*
7. **Ship tenant resolution + theming.** Deploy `resolveTenant()`, `TenantContext`, `applyClubBrand()` (§2, §4). With one club, `harris.football` (apex) resolves to club #1 — site behaves identically.
8. **DNS + Caddy.** Add the wildcard DNS record and the on-demand TLS block + ask-endpoint (§3). Apex block stays as-is so nothing breaks during cutover.
9. **Verify zero loss.** Reconcile row counts per table pre/post (every row has a `team_id`; counts unchanged), confirm every family still logs in (name→slug→email path unchanged, `store.js:27-29,46-47`), and run the full test suite incl. isolation gate. The DoD is "OWFC Harris runs entirely on the platform with zero data loss" (`PROJECT_BRIEF.md §10`).
10. **Then** create a **second, empty test club** purely to prove isolation against real data before any external pilot (Phase 1, `PROJECT_BRIEF.md §9`).

**Rollback:** because steps 2–4 are additive and 5–6 keep the old columns, rollback to the snapshot (step 1) is always available until the boolean columns are finally dropped (a later, separate migration, only after pilot confidence).

---

## 9. Failure modes & mitigations

| # | Failure mode | Why it is specific to this architecture | Mitigation |
|---|---|---|---|
| F1 | **Cross-tenant data leak (children's data)** | Logical (RLS) isolation, not physical; one missing `team_id` predicate exposes data across organisations — ICO-reportable (`PROJECT_BRIEF.md §8.1`) | RLS as spine (§2.4) + app-layer tripwires (§4.1) + **mandatory isolation test gate** (§7.1) + fast containment (§7.5). Deep policy: `DATA_MODEL.md`; legal: `SECURITY_GDPR_SAFEGUARDING.md` |
| F2 | **Let's Encrypt rate-limit exhaustion** | All clubs share one registered domain = one rate bucket; bulk onboarding spikes issuance (`PROJECT_BRIEF.md §8.3`) | Ask-endpoint gate (§3.4), staggered onboarding, CA fallback, persistent cert store, issuance monitoring (§3.3) |
| F3 | **Cert issued for a non-club host** | On-demand TLS will try to issue for any host hitting the server | Ask-endpoint refuses unknown/inactive slugs before issuance (§3.4) |
| F4 | **SPA path 404 on `/team2`** | Team is a URL **path** over a single static `index.html` | Caddy SPA fallback (`try_files … /index.html`) on the club block (§4.4) |
| F5 | **Trusted-client-filter mistake** | Temptation to filter by `team_id` in the browser query | Never trust client filters; RLS is authoritative; client filter is only a tripwire (§4.1) |
| F6 | **Single-instance correlated outage** | One Caddy + one Supabase + one box serve everyone | Accept SPOF for v1 (brief forbids per-club infra); monitoring + backups + documented move-to-managed triggers (§6.5, §7) |
| F7 | **Cert store lost on rebuild → mass re-issue** | Rebuilding the one server would re-request every cert, hitting F2 | Persist + back up Caddy storage (§3.3, §7.4) |
| F8 | **Hard-coded "Harris" strings leak into other clubs** | Shell strings/assets are literals in `index.html` (`index.html:7,8,20,21,43,72`) and `crest.svg` refs | Parameterise from `S.tenant.club` via `applyClubBrand()` (§4.2) — enumerable list |
| F9 | **Dev work touches production children's data** | Public repo commits the prod anon key (`config.js:13-14`) | Separate Supabase projects per environment (§5.2); RLS still bounds the anon key |
| F10 | **Club-supplied brand colours fail WCAG / break legibility** | Free-form theme tokens (§4.2) override AA-tuned defaults (`styles.css:21`) | Validate contrast at provisioning or curate palette (§4.2 OPEN DECISION) |
| F11 | **Licence expiry vs live data** | Expired club still has a cert + live rows | Ask-endpoint + `clubs.status` define grace/read-only behaviour — **dunning policy is commercial/TBD** (`PROJECT_BRIEF.md §8.5`) |
| F12 | **Rollup query blow-up at large clubs** | One club can have 100+ teams (`PROJECT_BRIEF.md §2`) | Indexed `team_id`; live-then-materialise rollups (§6.3 OPEN DECISION) |

---

## 10. Open architecture decisions & assumptions

### 10.1 Open decisions (must be closed before/at the relevant gate)

| ID | Decision | Recommendation (non-binding) | Owner / aligns with |
|---|---|---|---|
| OD-1 | Per-subdomain certs (on-demand) **vs** one wildcard cert | Per-subdomain (forward-compatible with custom domains); revisit if issuance volume bites | Architecture (§3.1) |
| OD-2 | Ask-endpoint runtime: Supabase Edge Function **vs** co-located service | Co-located + short cache for handshake latency | Architecture (§3.4) |
| OD-3 | Team in **path** (`/team2`) vs in hash | Path, per brief; accept the one-line SPA fallback | Architecture (§4.4) |
| OD-4 | Apex (`harris.football`) = club #1 **vs** redirect-to-canonical | Apex = club #1 (zero broken links) | Architecture (§4.5) |
| OD-5 | Env config selection (local override / deploy-inject / host-derive) | Un-committed `config.local.js` override (keeps no-build ethos) | Architecture (§5.2) |
| OD-6 | Club brand colours: validate-at-checkout **vs** curated palette | Validate AA + warn at checkout | Architecture + Design (§4.2) |
| OD-7 | Club rollups: live **vs** materialised | Live first, measure, materialise if needed | **Data Model** (§6.3) |
| OD-8 | CDN now vs later + cache-busting strategy | Later; reuse `?v=` busting if adopted | Architecture (§6.4) |
| OD-9 | Move-off-single-Vultr trigger | Trigger-based, not date-based (§6.5) | Architecture / Ops |
| OD-10 | Staging Supabase project before pilot? | Likely yes before external pilot | Architecture (§5.2) |
| OD-11 | Final team-1 slug for migrated Harris | Tie to OD-4 | Architecture / Migration (§8) |
| OD-12 | **(Deferred to brief §11)** field-level "club top-level" visibility; pricing/plans/free tier; custom-domains-in-v1; payment provider | — | **Data Model / Commercial / Security** |

### 10.2 Assumptions (inherited from `PROJECT_BRIEF.md §12`, restated for the gate)

- Built on the **existing stack** (vanilla SPA + Supabase + Caddy), **extended not replaced** — confirmed viable: every change in this spec is additive vanilla JS or SQL migration over the real files.
- Subdomains are **routing over one shared instance** — **no per-club infrastructure** (`PROJECT_BRIEF.md §12`).
- We are **data processor**, clubs are **controllers** — drives audit/DPA needs in `SECURITY_GDPR_SAFEGUARDING.md`.
- Payments are handled by a **hosted provider** (assumed Stripe); **we never touch card data** — keeps the secrets posture (§5.1) clean (Stripe secret server-side only).
- OWFC Harris is the **reference tenant and first migration target** (§8).
- The committed Supabase key is the **publishable/anon** key, safe in the browser **iff RLS is correct** (`config.js:14`) — the assumption the whole security model rests on.

### 10.3 Cross-document dependencies (what other docs must align on)

- **`DATA_MODEL.md` must define:** `clubs`/`teams`/`memberships`/`licences` shapes; `team_id`/`club_id` on every content table **and the complete table list** (zero-loss condition, §8.4); the **RLS policy matrix** for all tiers; tenant indexes (§6.3); the rollup strategy (OD-7); the migration table-by-table detail (§8.4-8.6).
- **`SECURITY_GDPR_SAFEGUARDING.md` must define:** controller/processor split & DPA; children's-data isolation guarantees (the legal framing of F1); audit-log content; breach/ICO process & containment runbook (§7.5); the field-level "club top-level" exclusion of parent contacts / individual reflections (`PROJECT_BRIEF.md §6`).
- **Commercial / `LICENCE_DPA_CHECKLIST.md` must define:** pricing/plan tiers/free tier (gates checkout); dunning & licence-expiry behaviour (F11, ties to the ask-endpoint and `clubs.status`); whether custom domains are v1.
- **Design must align on:** the club brand token contract (§4.2) and AA validation (OD-6); the club/team switcher reusing the child-switcher pattern (§4.3).

---

*End of ARCHITECTURE.md — Academy OS v1. Evidence-based against the repository at `/Users/dr/Documents/Claude/Projects/Harris Football` as read on 18 June 2026.*
