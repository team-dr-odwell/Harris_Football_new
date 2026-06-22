# Red-Team Security Review — Academy OS

*Adversarial review of the multi-tenant platform plan · 18 June 2026 · British English*

**Reviewer brief.** Break the plan for taking the single-team `harris.football` product to a three-tier (Platform → Club → Team) multi-tenant platform on **one shared Supabase instance** holding many clubs' children's data. Posture: assume an attacker, a careless coach, and a buggy migration. Existential risk = a child's data leaking across tenants.

**Documents reviewed:** `DEVELOPMENT_PLAN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY_GDPR_SAFEGUARDING.md`.
**Code checked against the plan:** `supabase/schema.sql`, `js/store.js`, `js/app.js`, `js/config.js`, and every `supabase/migrate-*.sql` the plans cite (`migrate-academy-progress.sql`, `migrate-rsvp.sql`, `migrate-directory-and-folders.sql`, `migrate-security.sql`, `migrate-sponsor.sql`, `migrate-academy-v2.sql`, `migrate-points.sql`, `auth-setup.sql`, `migrate-multi-child.sql`).

> **Bottom line.** The plan is unusually self-aware: it already names most of the big risks (legacy `using(true)`, global `is_admin`, public bucket, single-instance blast radius) and gates them. But the *current code is materially more broken than any of the three companion specs admit*, and the review found at least one live privilege-escalation path that **none** of the documents mention. The plan is a sound skeleton; it is **not yet safe to build the re-tenant migration from as written** without the additions in this report. See **Verdict** (§ end).

---

## Severity-ordered findings

| # | Title | Severity | Cross-tenant child-data risk? |
|---|---|---|---|
| F1 | Any authenticated user can self-grant `is_admin` (live, unflagged) → instant cross-tenant superuser | **BLOCKER** | Yes — total |
| F2 | Sponsor "zero child data" guarantee is client-side only; RLS does not enforce it | **BLOCKER** | Yes |
| F3 | `using(true)` is the *current* state of every sensitive table; specs describe the target as if partly done | **BLOCKER** | Yes |
| F4 | Public `media` Storage bucket — no Storage-RLS design, only "lock it down" | **BLOCKER** | Yes |
| F5 | GUC tenant-context (`request.club_id`) is client-settable and several policies trust it | **HIGH** | Yes (if relied on) |
| F6 | `SECURITY DEFINER` helper functions + `v_club_rollup` view can bypass RLS if mis-owned | **HIGH** | Yes |
| F7 | `owns_player()` is keyed on `player_id` only, not `team_id` — IDOR across tenants on shared/guessable ids | **HIGH** | Yes |
| F8 | name→slug→email login collides and enumerates across clubs; cross-tenant account takeover at signup | **HIGH** | Yes (indirect) |
| F9 | Migration dual-run leaves global `is_admin` *and* memberships live simultaneously — widest-grant-wins | **HIGH** | Yes (mid-migration) |
| F10 | Backfill `set team_id=1` correctness + `goals`/child-table scope-by-trigger is fragile | **HIGH** | Yes (mid-migration) |
| F11 | Isolation gate tests the policies you remembered to write — blind to missing tables/policies | **HIGH** | Yes (gate gameable) |
| F12 | Production anon key + a *real* project URL committed to a public repo; key/URL mismatch in code | **MEDIUM** | Indirect |
| F13 | On-demand TLS ask-endpoint is a single un-authenticated control over issuance + licence + takeover | **MEDIUM** | Indirect |
| F14 | Single instance: one bad migration / one bad RLS deploy = all-tenant breach; no staging mandated | **MEDIUM** | Yes (blast radius) |
| F15 | Backups & PITR snapshots commingle all tenants; no per-tenant export/restore/erasure proof | **MEDIUM** | Indirect |
| F16 | Realtime subscriptions inherit RLS but are never mentioned; easy to ship a leak | **MEDIUM** | Yes |
| F17 | `goals` has RLS enabled but (in `schema.sql`) read-all + **no** admin-write policy — write-locked, and child tables silently fall back to preview on error | **LOW** | Indirect |
| F18 | Club-supplied `brand` JSON is injected into the DOM/CSS — stored XSS across the tenant | **LOW** | Indirect |

---

## Detail

### F1 — Any authenticated user can self-grant `is_admin`  **[BLOCKER]**
**Evidence.** `migrate-security.sql` defines the live profiles policies:
```sql
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
```
There is **no column restriction**. `is_admin` is an ordinary column on `profiles` (`schema.sql:121`). The auto-onboarding trigger (`auth-setup.sql`) gives every new login a profile row, and `own_profile_insert` lets a user insert their own row.

**Attack.** Any family login runs, against the public anon endpoint:
`update profiles set is_admin = true where id = auth.uid();`
The `with check` passes (`id = auth.uid()`). `is_admin()` now returns true for them. Because `is_admin()` is **global** (`schema.sql:141-143` → `select is_admin from profiles where id = auth.uid()`), and the write policies are `using (is_admin())`, they can now write **every** table. Today that is one team. **After re-tenanting onto a shared DB, this is one row away from cross-tenant superuser over every club's children.**

**Why this is the worst finding.** All three specs treat `is_admin` as a *misconfigured-scope* problem ("global admin reads every club", R2 in `DEVELOPMENT_PLAN.md §2`; T3 in `SECURITY_GDPR_SAFEGUARDING.md §3`). **None of them notices that a normal user can already grant themselves that flag.** The plan's mitigation ("retire global `is_admin`, roles come from server-controlled `memberships`, never client-set" — `SECURITY §3 T3`) is correct *in direction* but the migration keeps `profiles.is_admin` live during dual-run (F9), so this hole stays open through the highest-risk window.

**Fix.**
1. Immediately (pre-migration): replace the profiles update policy so privileged columns cannot be self-set — either a `BEFORE UPDATE` trigger that rejects changes to `is_admin`/`is_sponsor` unless `is_platform()`/existing admin, or split into a column-safe policy (Postgres RLS is row-level, so the trigger is the reliable mechanism). Same for INSERT.
2. In the target model, `memberships.role` must be writable **only** by platform/club-admin per the `memberships` WITH CHECK (`DATA_MODEL §5.2` claims "WITH CHECK forbids escalating role above your own tier" — make that a concrete, tested predicate, not prose).
3. Add a negative isolation test: "a `family` JWT cannot set its own `is_admin`/`is_sponsor`/`role`." This class of test is **absent** from the §2 plan, which only tests row-tenant isolation, not column/privilege self-escalation.

---

### F2 — Sponsor "zero child data" is client-side only  **[BLOCKER]**
**Evidence.** The sponsor guarantee is enforced entirely in `js/app.js`: the route hard-guard (`app.js:240-250`, `SPONSOR_OK = new Set(["sponsor","about"])`) and `applySponsorChrome()` (`app.js:113-122`). At the database, a sponsor's JWT is just another `authenticated` user, and every content table is `read_all using(true)` (`schema.sql:151`; `point_events` `pe_read using(true)`; `video_reflections` `using(true)`; etc.). `SECURITY §0` even lists the sponsor guard as a *control*, citing `test/safeguarding.js` — but those are **jsdom route tests**, not DB tests.

**Attack.** A sponsor login opens the browser console (or curls the REST endpoint with their token) and runs `sb.from('players').select('*')`, `from('video_reflections')`, `from('profiles')`. RLS returns everything. The entire safeguarding promise to sponsors is a UI illusion. At multi-tenant scale a sponsor of club A reads **all clubs**.

**Plan hand-wave.** `DATA_MODEL §5.6` asserts a sponsor "never satisfies `team_in_my_clubs()`/`owns_player()`" — true **only after** every `using(true)` is replaced (F3) and only if the sponsor genuinely holds no team membership. The doc presents this as an existing guarantee ("preserves today's guarantee"). It is not enforced today at the layer that matters.

**Fix.** The sponsor clamp must be an RLS outcome, not a client redirect. Tie it into F3's rewrite, and add a DB-level negative test: sponsor JWT → `SELECT count(*)` = 0 on every child-data table. Do **not** rely on `test/safeguarding.js` for this — explicitly note its jsdom limitation (the plan does note it in `SECURITY §2a`, but still lists the sponsor guard as a current control in §0 — fix that inconsistency).

---

### F3 — `using(true)` is the *current* state of the sensitive tables  **[BLOCKER]**
**Evidence (verified, every table the specs flag is genuinely wide open today):**
- `video_reflections` — **children's private free-text reflections** — `select using(true)` AND `insert with check(true)` (`migrate-academy-progress.sql`). The file's own comment admits "Reflections can be tightened to strict per-family RLS later". Any authenticated user can read *and forge* any child's reflection.
- `directory` — **opponent ADULT phone/email** — read + write `using(true)` (`migrate-directory-and-folders.sql`).
- `rsvp` — `rsvp_all for all using(true) with check(true)` (`migrate-rsvp.sql`).
- `point_events`, `homework`, `skill_levels`, `squad_goals` — all `*_read ... using(true)` (`migrate-academy-v2.sql`, `migrate-points.sql`).
- `media`, `attendance` — `for all using(true) with check(true)` (`schema.sql:166-170`).
- The `read_all` loop covers `players, fixtures, goals, attendance, training_sessions, events, media, game_points, seasons, profiles` `using(true)` (`schema.sql:146-153`).

**Assessment.** The plan is *correct* that these are the leak points (R3, `SECURITY T1`, `DATA_MODEL §5` flags them) and *correct* that the whole job is replacing them. The red-team concern is **framing risk**: `DATA_MODEL §0` says it "extends the real, deployed schema — it does not redesign it", and §5 presents a finished matrix as if it largely exists. In reality **almost nothing is scoped today**; this is a near-total rewrite of the RLS layer, not an extension. Estimating it as an "extend" will under-resource the single most dangerous slice (0c). Treat slice 0c as a from-scratch RLS authoring of ~20 tables, each needing read + write + role-narrow + tests.

**Fix.** Re-label the work honestly. Adopt the §6.3 "drop the `do $$ … using(true)` loop, replace per table" approach but require, per table, an explicit *deny-by-default* baseline first (`revoke`/no permissive policy) and then additive scoped policies — so a forgotten table fails closed, not open. This directly mitigates F11.

---

### F4 — Public `media` Storage bucket, no Storage-RLS design  **[BLOCKER]**
**Evidence.** `schema.sql:175-178` instructs creating the `media` bucket **Public**. `SECURITY §3 T10`/`§8.3` and `DEVELOPMENT_PLAN R4` flag it and mark the fix BLACK. Good. But:
- The plan says "signed URLs + Storage RLS keyed to `team_id`" without a design. Supabase Storage RLS is on `storage.objects`, keyed off the object **path**. The current `media` table stores a `url` (`schema.sql:99`) with no tenant in the path. Slice 0e ("private + signed URLs + consent gate") has **no path-namespacing migration** for *existing* objects.
- Existing public URLs already issued/cached/shared (WhatsApp is the cited sharing channel, `ARCHITECTURE §4.4`) remain world-readable even after the bucket flips, unless objects are **moved/renamed**. Flipping the bucket to private does not revoke links that were already public if the CDN cached them or if the object key is unchanged and guessable.

**Attack.** Cross-tenant: today, any object key in a public bucket is world-readable with no auth at all — a scanner enumerating keys gets every club's child photos. Post-fix: any object not re-pathed under `team/<id>/…` and not covered by a Storage policy stays reachable by direct key.

**Fix.** Slice 0e must (a) define the path convention `club/<id>/team/<id>/<uuid>` and **migrate existing objects** into it, (b) write `storage.objects` RLS that parses the path prefix against `team_in_my_clubs()`, (c) rotate/rename object keys so old public URLs 404, (d) gate upload AND render on a per-child `photo_consent` flag (which does not exist as a column anywhere yet — add it), (e) test direct-key access with no JWT returns 403.

---

### F5 — GUC tenant context is client-settable  **[HIGH]**
**Evidence.** `DATA_MODEL §6.2` sets `request.club_id` via `set_config(...)` and reads it in `current_club_id()` (`§6`). Several **policies depend on it**: `clubs` read `using (is_platform() or id = current_club_id())` (`§5.2`), `teams` `using (… club_id = current_club_id())`, `licences`, `memberships` (`scope_id = current_club_id()`).

**Attack.** With the browser-side anon client, the SPA is what issues `set_config('request.club_id', X, true)`. A malicious user sets `request.club_id` to **any** club id. Every policy that reads `current_club_id()` *without also* fencing on `memberships` is now satisfied for the attacker's chosen club. The doc claims (`§6.2`) the GUC "is a convenience filter, not the security boundary" and that `team_in_my_clubs()` still gates — but the policies it lists for `clubs`/`teams`/`memberships`/`licences` use `current_club_id()` as the **only** non-platform predicate, with no `team_in_my_clubs`/`club_admin_of` AND-clause. So those four tenancy tables are exactly where the "convenience filter" *is* the boundary. Reading another club's `clubs`/`teams`/`memberships` rows leaks club structure, roster scope, and (via `memberships.player_ids`) child-id linkage.

**Fix.** Never let a client-set GUC be the sole predicate. Either (preferred) adopt the JWT-claim option (`§9.3`/`ARCHITECTURE OD` — but see F9 token-refresh caveat) where club/team is signed and set server-side, OR rewrite every `current_club_id()` policy to AND with a `memberships`-derived check (`club_admin_of(id)`, `is_platform()`, or `id in (select club from my…)`). The GUC may then remain only as a *performance* filter. Add a negative test: set `request.club_id` to a foreign club and assert zero rows.

---

### F6 — `SECURITY DEFINER` helpers / view can bypass RLS  **[HIGH]**
**Evidence.** `DATA_MODEL §6` says the helpers are "`security definer`/`stable`, owned by a role that can read `memberships`". `v_club_rollup` is `security_invoker=true` (`§6.4`) — good — but the helper functions are SECURITY DEFINER and **read `memberships`, `teams`, `profiles`**.

**Risk.** A SECURITY DEFINER function runs as its owner, bypassing RLS on tables it touches. If a helper is broader than intended (e.g. `owns_player` does a `select … from profiles` — `§6` — as definer), it can leak existence/linkage information, and any SQL-injectable or logic-flawed definer function becomes a confused deputy. Also: definer functions with a mutable `search_path` are a classic privilege-escalation vector (an attacker creating a `public.memberships` shadow object). The plan does not pin `search_path` or specify the owning role's least privilege.

**Fix.** (a) Make helpers SECURITY DEFINER only where strictly required and `set search_path = pg_catalog, public` on each. (b) Owner role should be a dedicated, minimally-privileged role, not `postgres`. (c) Prefer SECURITY INVOKER + explicit grants where possible. (d) The `v_club_rollup` view is the column-line enforcer for F-related club-admin visibility — test that a club-admin selecting the *base* `players` table (not the view) is denied the forbidden columns; a SECURITY INVOKER view only helps if base-table RLS actually blocks direct access, which `DATA_MODEL §5.1` asserts but must be tested.

---

### F7 — `owns_player()` ignores tenant — cross-tenant IDOR  **[HIGH]**
**Evidence.** Today `owns_player(pid)` checks `profiles.player_id`/`player_ids` only (`migrate-academy-v2.sql`). The generalised version (`DATA_MODEL §6`) checks `memberships.player_ids` — still **no `team_id` fence inside the function**. Family-write policies use it directly: `pe_self_insert with check (category in (...) and owns_player(player_id))` (`migrate-academy-v2.sql`); proposed `attendance`/`rsvp`/`homework`/`chores`/`monthly_votes` family writes likewise.

**Attack.** `player_id` is a global `bigint` sequence shared across all clubs (`players.id` `generated always as identity`, `schema.sql:16`). A family in club A whose membership lists their own child's id can attempt writes referencing **another club's** `player_id` only if it appears in their `player_ids` — so the direct risk is bounded *iff* `player_ids` is trustworthy. The real exposure: the family-write policies the matrix proposes (`§5.3`) fence on `owns_player(player_id)` but several do **not** also require `team_in_my_clubs(team_id)` in the same `with check` (the doc adds it for `point_events` and `attendance` but the prose is inconsistent table-to-table). A row inserted with the family's own `player_id` but a **foreign `team_id`** would pass `owns_player` and land in another tenant's data set, corrupting cross-tenant integrity and potentially surfacing under the other team's reads.

**Fix.** Every family/player write policy must AND `owns_player(player_id)` **with** `team_in_my_clubs(team_id)` and assert the player actually belongs to that team (`player_id in (select id from players where team_id = NEW.team_id)`), enforced by trigger because RLS `with check` cannot easily cross-reference. Add IDOR negative tests: family A writing any row with team B's `team_id` or a foreign `player_id` fails.

---

### F8 — name→slug→email login: collision, enumeration, cross-tenant takeover  **[HIGH]**
**Evidence.** `store.js:27-29` slugifies the typed name to `<slug>@<domain>` and calls `signInWithPassword`. `config.js` sets `LOGIN_EMAIL_DOMAIN: "harris.football"`, but `store.js:29` falls back to `"harris.team"` — a **live inconsistency** (which domain is authoritative depends on config presence). Auth is one shared Supabase Auth instance for **all** clubs.

**Attacks at multi-tenant scale.**
1. **Collision / cross-tenant identity:** "David Kirby" in club A and "David Kirby" in club B both slug to `david.kirby@harris.football`. **Supabase Auth has one global user namespace.** The second club's David cannot register (email taken) — or worse, if onboarding "creates the login if missing", the two families share one auth user across two clubs → one logs in and lands in the other's club. The plan's multi-tenant resolution (`ARCHITECTURE §2.3`) resolves *memberships* per user, so a colliding user could hold memberships in both clubs and switch between them — a structural cross-tenant identity merge. There is **no plan to namespace the login email by club** (e.g. `david.kirby@clubB.harris.football`).
2. **Enumeration:** the deterministic name→email mapping means anyone can compute any family's login id and probe it; combined with `signInWithPassword` error handling, distinguish "exists" vs "wrong password". `store.js:48` returns a generic message — good — but Supabase's own rate-limit/error surface may differ, and the email is *guessable by construction*, so the secret is purely the password.
3. **Password reset across tenants:** a reset for `david.kirby@harris.football` is global; if collision merged two families, reset hijacks both.
4. **Invite codes:** the plan references invite-code flows (`DEVELOPMENT_PLAN §3 Gate3`; `SECURITY T6`) but **no invite mechanism exists in the code** — it is entirely TBD. Self-signup is currently *disabled* via a dashboard toggle (`migrate-security.sql` operational note) — a control that lives **outside the repo** and is easy to leave on for the new project.

**Fix.** Namespace the login identity per club (`slug.club` in the local-part or a per-club email domain) so two clubs' "David Kirby" are distinct auth users. Treat the dashboard "disable signups" setting as a tracked, asserted config item, not an out-of-band note. Design invite codes to `SECURITY T6` (single-use, time-boxed, high-entropy, bound to club+team+role, rate-limited, audited) before any self-registration — and make password reset scope-aware. Resolve the `harris.football`/`harris.team` domain inconsistency.

---

### F9 — Dual-run leaves global `is_admin` AND memberships live together  **[HIGH]**
**Evidence.** `DATA_MODEL §2.1`/`§7 Step 11` and `ARCHITECTURE §8.5` keep `profiles.is_admin`/`is_sponsor` "in place during the dual-run window"; `owns_player` even does a "transitional dual-read" of `profiles` (`DATA_MODEL §6`). `SECURITY §1 L1` warns the legacy flag "becomes a cross-tenant superuser" if not retired.

**Attack / failure.** During dual-run, **two grant systems are simultaneously authoritative**. If any policy still references `is_admin()` (and many do today — every `*_admin` policy) while new policies reference `coach_of()`, the effective permission is the **union** (RLS policies are OR-combined). A user who is `is_admin=true` (legacy, or self-granted via F1) is admin **everywhere**, regardless of their scoped membership. The migration explicitly does **not** drop the old policies until "later" (`§7 Step 16`). So the window where the new tenant fence exists *but the old global one also exists* is precisely when the first second club's data arrives. Widest-grant-wins defeats the whole isolation model mid-migration.

**Fix.** Do not run both authorities against the same tables at once. Cut over table-by-table in a single transaction: drop the `is_admin()`-based policy at the same moment the membership-based policy is created (the plan's §7 Step 13 says this, but Step 16 contradicts by keeping `profiles.is_admin` readable by `is_admin()` until later). Set `profiles.is_admin` to **non-authoritative immediately** by redefining `is_admin()` to read memberships (or dropping it) before any second tenant exists. Never admit a second club while any `using(true)` or `is_admin()` policy remains on any shared table.

---

### F10 — Backfill / trigger-derived `club_id` is fragile  **[HIGH]**
**Evidence.** `DATA_MODEL §2`/`§7 Steps 6-9`: add `team_id` nullable, `update … set team_id=1, club_id=1`, then `set not null`. `club_id` is kept in sync by trigger `set_club_id_from_team`. `goals` gets a **denormalised** `team_id` "anyway" (`§2`, row "goals"), not inherited.

**Risks.**
1. **Completeness:** `ARCHITECTURE §8.4` itself warns the table list is a "zero-loss correctness condition — derive it programmatically, do not hand-list" — yet `DATA_MODEL §2` *is* a hand-list. Any table missed (the code silently `try/catch`-loads optional tables — `store.js:194-210`) gets no `team_id`, no policy, and if it defaults to a permissive policy it leaks; if it defaults to deny it data-loses. Either way undetected because the app swallows the error.
2. **Trigger drift:** if `set_club_id_from_team` is bypassed (bulk insert, `COPY`, a migration, or `goals` inserted with a stale/foreign `team_id`), `club_id` and `team_id` disagree and **club-scoped RLS reads the wrong tenant**. The plan acknowledges "denormalisation drift" only as a generic threat (`SECURITY T1`) with no consistency check.
3. **`goals` write-locked today:** `goals` is in `read_all` but **not** in the `admin_write` loop (`schema.sql:158` omits it) — so today no one can write goals via RLS except through the fixtures cascade. Re-tenant must not preserve that accidental lockout.

**Fix.** Generate the table list from `information_schema` at migration time and assert every base table in `public` (minus an allow-list) has `team_id NOT NULL` + a non-`using(true)` policy, failing the migration otherwise. Add a periodic/CI consistency assertion `club_id = (select club_id from teams where id = team_id)` on every content table. Make `goals.team_id` enforced by a trigger from its parent fixture, and reconcile its write policy.

---

### F11 — The isolation gate tests what you wrote, not what you forgot  **[HIGH / gate is partially gameable]**
**Evidence.** `SECURITY §2b` seeds "every table" and asserts per-table per-role isolation; `§2b.4` adds a no-`using(true)` lint; `DEVELOPMENT_PLAN §4` calls it non-waivable.

**Where it misses.**
1. **New/forgotten tables:** the suite iterates a **hard-coded table list** (`§2b.1` enumerates them). A table added later without being added to the suite is untested — and the app's silent `try/catch` table loading (`store.js`) means a new table can ship and load with no test and no error. The no-`using(true)` lint catches *that* anti-pattern but **not** a table with *no policy at all* (RLS-enabled-but-no-policy = deny, safe) or a table with RLS **disabled** (open to all). The lint must also assert `relrowsecurity = true` on every `public` table and that every table appears in the suite (cross-check against `pg_tables`).
2. **Column-line / privilege escalation untested:** the gate tests row-tenant isolation but the plan's own §8.1 visibility line and F1 self-escalation are **column/role** concerns. `§2b.2` mentions the rollup column boundary but not self-granting roles. Add F1/F8-class tests.
3. **Storage not in the matrix:** `§2b` lists DB tables only. `storage.objects` (F4) and Realtime (F16) are outside it.
4. **Gameable by env:** "100% pass" against a **seeded test DB** does not prove the **production** policies match — a drift between `migrate-tenancy.sql` and what is actually deployed (e.g. a hotfix applied in the Supabase SQL editor, which is how every existing migration is run — "paste → Run") is invisible to CI. There is no schema-diff/attestation that prod RLS == tested RLS.

**Fix.** Make the suite *discover* tables (`select tablename from pg_tables where schemaname='public'`) and fail on any not covered. Assert RLS enabled + at least one restrictive predicate per table. Add Storage and Realtime cases. Add a production attestation step: dump `pg_policies` from prod and diff against the tested migration before any go-live (closes the "applied by hand in the SQL editor" gap that the whole repo currently relies on).

---

### F12 — Production anon key + real URL in a public repo; key/URL drift  **[MEDIUM]**
**Evidence.** `config.js:13-14` commits `SUPABASE_URL: "https://iiixvlkuxluxqpsupwnx.supabase.co"` and a `sb_publishable_…` key — to a repo the specs repeatedly call **public** (`ARCHITECTURE §5.1`). The plan correctly states the anon key is safe *iff RLS is correct* — but given F1-F3, **RLS is not correct today**, so the committed key currently grants the world read/write to a live project. Also `TEAM_PASSWORD: "harris2026"` is committed (`config.js:18`).

**Assessment.** The plan's posture (anon key is publishable; never commit service_role/Stripe/SMTP — `§5.1`) is right. The gap: it treats "anon key public" as *already safe* when the safety precondition (RLS) is the very thing being built. Until F1-F4 are fixed, the committed key is a live liability, and the real project URL is now permanently in git history.

**Fix.** Before any further public commits: rotate the anon key is not enough (anon is meant to be public) — instead **fix RLS first**, and consider that this specific project (`iiixvlkuxluxqpsupwnx`) has been world-writable and should be treated as compromised — provision the platform on a **fresh** project, never reuse this one for real children's data. Move `TEAM_PASSWORD` out of the committed config. Confirm the per-environment project split (`§5.2`) so dev never points at prod.

---

### F13 — The ask-endpoint is a single point of control over issuance, licence and takeover  **[MEDIUM]**
**Evidence.** `ARCHITECTURE §3.4` gates TLS issuance on `GET /can-issue?domain=…` → `select 1 from clubs where slug=:slug and status='active'`. It also (`§3.4`, `F11`/`F3` in that doc) becomes the licence-expiry and de-provision enforcement point, and `SECURITY T5` relies on it for subdomain-takeover prevention.

**Risks.** (a) If the endpoint is unauthenticated and reads the live `clubs` table directly, it is a probe oracle: an attacker enumerates valid club slugs by observing 200 vs 403 (mild). (b) If it fails **open** (returns 200 on error/timeout), on-demand TLS will issue for anything → rate-limit exhaustion (the shared Let's Encrypt bucket, `§3.3`) and certs for non-clubs. (c) It is a new co-located service or Edge Function (`OD-2`) with **no specified auth, rate limit, or caching** — and it sits on the TLS handshake hot path, so a slow/over-loaded endpoint degrades all new-host TLS. (d) Subdomain takeover via stale slug: if a licence ends but the `clubs.slug` row lingers `status='active'`, the cert keeps issuing; `SECURITY §5.3` purges on termination but the **order** (purge data, then de-route) is not pinned.

**Fix.** Fail **closed** on any ask-endpoint error/timeout. Cache positive answers briefly, negative answers longer. Rate-limit by source. Pin the de-provision order: suspend slug (ask returns 403) → revoke cert → export → purge. Treat the ask-endpoint as security-critical, not "a tiny endpoint".

---

### F14 — Single instance: one deploy = all-tenant breach; staging not mandated  **[MEDIUM]**
**Evidence.** `ARCHITECTURE §7.5`/`§1.2` accept single-instance blast radius as a deliberate trade. `§5.2`/`OD-10` leave a **staging Supabase project** as "likely yes" — i.e. **optional**. Every existing migration is applied by pasting into the Supabase SQL editor (every `migrate-*.sql` header says "Run in Supabase: SQL Editor → New query → Run").

**Risk.** With no mandated staging and a paste-to-prod migration culture, the highest-risk change in the programme (the RLS re-tenant, an explicit BLACK action) would be first executed against the live shared DB holding every club's children. One wrong `using` clause = simultaneous breach of all controllers — exactly the correlated-failure domain the architecture admits.

**Fix.** Make a staging Supabase project **mandatory** (not OD) before slice 0c, and make "migration applied via versioned file in CI against staging, attested, then prod" the only path (kills the SQL-editor hotfix culture and supports F11's attestation). Add a tested rollback for each RLS migration.

---

### F15 — Backups commingle tenants; no per-tenant restore/erasure proof  **[MEDIUM]**
**Evidence.** `ARCHITECTURE §7.4` relies on Supabase automated backups/PITR for the **whole** project. `SECURITY §5.3` requires per-club export-then-purge on licence end and Art. 17 erasure (`§5.1`).

**Risk.** A single-project backup is a single blob of **all** clubs' children's data — a restore to fix club A reintroduces club B's deleted/erased data (defeating erasure), and the backup itself is a commingled high-value target. There is no design for **per-tenant** point-in-time export or for proving erasure persisted through backups (a real Art. 17 problem when backups retain purged rows).

**Fix.** Document backup as a sub-processor data flow in the DPA (`SECURITY §4.2.5`). Define how erasure interacts with backup retention (e.g. erased rows re-purged on restore, or a documented backup-retention carve-out the controller agrees to). Provide a tenant-scoped logical export (RLS-scoped `copy`/dump by `club_id`) as the per-controller backup/portability mechanism, separate from the platform PITR.

---

### F16 — Realtime subscriptions never mentioned  **[MEDIUM]**
**Evidence.** The app uses `@supabase/supabase-js` from the browser. None of the four documents mentions **Supabase Realtime**. Realtime broadcasts row changes; with Realtime+RLS, subscriptions are filtered by the same policies — but only if Realtime is configured to enforce RLS and the `replica identity`/publication is set correctly. If any team ever ships a realtime feature (live RSVP, live scores) on a table whose RLS is wrong (or with Realtime authorization not enabled), it streams cross-tenant changes.

**Fix.** State explicitly that Realtime is **off** unless a feature needs it, and that any Realtime channel inherits the isolation gate (add Realtime cases to §2). If unused, disable the `supabase_realtime` publication so it can never silently leak.

---

### F17 — `goals` write-lock + silent preview fallback masks failures  **[LOW]**
**Evidence.** `goals` is read-all but absent from `admin_write` (`schema.sql:158`). `store.js:78-79` catches any live-load failure and **silently falls back to preview/sample data** (`console.error` only); the optional-table loaders (`store.js:194-210`) swallow errors per table.

**Risk.** During/after migration, an RLS misconfiguration that *denies* legitimate access doesn't surface as an error to the user — the app quietly serves **sample data** or empty sets, masking a broken policy (false sense that "it works") and potentially showing one tenant the bundled `data.js` sample content. It hides both over- and under-permissioning.

**Fix.** In live mode, a load failure must be a visible error, not a silent preview fallback (preview fallback should be dev-only). Reconcile `goals` write policy. Add a smoke assertion that live mode never renders `data.js` sample identities.

---

### F18 — Club `brand` JSON → DOM/CSS injection (stored XSS)  **[LOW]**
**Evidence.** `ARCHITECTURE §4.2 applyClubBrand()` writes `brand.primary` etc. into `document.documentElement.style.setProperty(...)`, sets `document.title = brand.name + …`, and swaps `img.src = brand.crestUrl`. `brand` is club-supplied JSON on the `clubs` row (`DATA_MODEL §1.1`).

**Risk.** Unvalidated club-controlled values flowing into CSS custom properties and `src`/title attributes are an injection surface (CSS `url()` exfiltration, `javascript:`/data-URI in `crestUrl`, breaking out of the style context). A malicious or compromised club-admin could plant a payload that runs for every visitor on that subdomain (same-origin, so bounded to that tenant — but still a defacement/exfil vector, and the SPA bundle is shared).

**Fix.** Validate/allow-list brand values: colours against a strict regex/parser, `crestUrl` against an allow-listed origin or restrict to uploaded Storage objects, escape `name` for `document.title`. This pairs with the WCAG validation already noted (`OD-6`).

---

## What the plan got right (balance)

The plan is materially better than most multi-tenant retrofits, and several things are genuinely well-judged:

- **The central risk is correctly identified and prioritised.** Cross-tenant leak of children's data is named the existential risk in every doc and is gated, not asserted (`DEVELOPMENT_PLAN §4`, §7; `SECURITY §1-§2`).
- **Defence-in-depth is articulated honestly** — RLS as the non-bypassable spine, app-layer as second line only, with the explicit statement that a leak requires *all three* layers to fail (`SECURITY §1`). The "RLS is authoritative, client filters are tripwires not boundaries" principle (`ARCHITECTURE §4.1`, F5 there) is the right instinct.
- **The legacy issues are catalogued from the real code** — R1-R5 (`DEVELOPMENT_PLAN §2`) map to genuine, verified problems (`using(true)`, global `is_admin`, public bucket, deploy inconsistency). The docs cite real files/lines and even flag where claimed tables don't exist (`DATA_MODEL §3.4`, `sponsors`/`position_targets`) rather than inventing them — intellectually honest.
- **The migration is additive-then-cutover with row-count parity and a snapshot-first rule** (`ARCHITECTURE §8`), and rollback is preserved by keeping old columns — the correct shape even if the dual-run window needs tightening (F9).
- **A non-waivable isolation gate with a no-`using(true)` lint and per-table/per-role/per-operation negative tests** (`SECURITY §2`) is exactly the right control class; the gap is coverage completeness (F11), not concept.
- **BLACK-trigger governance** around RLS changes, bucket visibility, first external child data, and self-checkin (`DEVELOPMENT_PLAN §6`, `SECURITY §9`) puts human sign-off precisely where it belongs.
- **GDPR framing is competent and appropriately hedged** — processor/controller split, per-club DPA as a precondition, Children's Code, DPIA, breach SLAs, all marked `[DPO/LEGAL]` for qualified sign-off (`SECURITY §4-§6`). It does not over-claim legal authority.
- **The single-instance trade-off is acknowledged rather than hidden** (`ARCHITECTURE §7.5`), with concrete containment levers and trigger-based move-to-managed criteria.

---

## Verdict

**Conditionally safe to build from — but not in its current framing, and not against the current Supabase project.**

The plan's *structure* (gates, layered isolation, non-waivable test gate, BLACK governance, additive migration) is sound and worth building on. The problem is a **gap between what the specs imply is already true and what the code actually does**: the live database today is world-writable (F1), the sponsor/child-data guarantees are UI-only (F2), every sensitive table is `using(true)` (F3), and one self-escalation path that no document mentions (F1) would hand an attacker cross-tenant superuser the moment a second club exists. The companion specs describe the *target* RLS as a near-complete "extension"; it is in fact a from-scratch rewrite of the entire authorisation layer.

**Build may proceed only if these conditions are met before slice 0c (the RLS re-tenant) and absolutely before any second tenant's data exists:**

1. **Fix F1 immediately** — no policy may let a user write `is_admin`/`is_sponsor`/`role` on their own row; add the privilege-self-escalation negative test. (BLOCKER)
2. **Provision a fresh Supabase project** for the platform; treat the committed-key project as compromised; remove `TEAM_PASSWORD` from committed config; confirm per-environment project split. (F12)
3. **Re-frame slice 0c as a full deny-by-default RLS authoring of all ~20 tables** (read + write + role-narrow + Storage), each failing closed, with the sponsor clamp enforced in RLS not the client. (F2, F3, F4)
4. **Storage 0e gets a real design** — path-namespacing, object migration, key rotation so old public URLs die, Storage RLS, and a consent column that does not yet exist. (F4)
5. **Tenancy tables must not trust the client GUC alone** — JWT claims or AND-with-memberships on every `current_club_id()` policy. (F5)
6. **No dual-authority window** — make `is_admin` non-authoritative before any second tenant; cut policies over table-by-table in transaction. (F9)
7. **Mandatory staging + migration-as-code-with-prod-attestation** — kill the paste-to-prod SQL-editor culture; diff deployed `pg_policies` against the tested migration before go-live. (F11, F14)
8. **Harden the isolation gate** — discover tables from the catalogue (fail on any uncovered), assert RLS enabled per table, add column/privilege-escalation, Storage, and Realtime cases, plus the F7/F8/F1 negatives. (F7, F8, F11, F16)
9. **Namespace login identity per club** and design invite codes/reset to be tenant-scoped before any self-registration. (F8)

The HIGH items (F5-F11) are not optional polish — each is an independent path to cross-tenant child-data exposure. With the nine conditions above closed and evidenced through the existing gate machinery, the plan becomes safe to build from. Without F1 and F9 in particular, the first day a second club's data lands on the shared instance is the day of the first breach.

*End of RED_TEAM_SECURITY.md.*
