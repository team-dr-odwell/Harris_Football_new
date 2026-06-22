# Security, UK GDPR & Safeguarding Specification — Academy OS

*Gating risk & compliance control for the multi-tenant platform · v1 · 18 June 2026*

> **Status of this document.** This is a **gating control**. It is the evidence base for the QA gate (isolation test plan, §2) and the Commercial-Readiness gate (controller/processor + DPA, §4). It must be reviewed and the open decisions in §10 closed — with qualified DPO/legal sign-off where flagged — before any **external** tenant holds real children's data.
>
> **Not legal advice.** The author is not a lawyer or a qualified Data Protection Officer. Every point marked **[DPO/LEGAL]** requires sign-off by a qualified data-protection practitioner before go-live. UK framing throughout: **UK GDPR** and the **Data Protection Act 2018 (DPA 2018)**, regulator the **Information Commissioner's Office (ICO)**.
>
> **Companion docs.** `PROJECT_BRIEF.md` (read — defines the three-tier model and risks). `DATA_MODEL.md` (**TBD — not yet written**): owns the table list and the **RLS policy matrix**. *That* matrix is the control; *this* document is the assurance that the control is correct, tested, and gated. `LICENCE_DPA_CHECKLIST.md` (TBD): the commercial/legal companion to §4.

---

## 0. Baseline: what exists today (evidence)

The platform extends a working single-team app. The controls below build on, and must **preserve**, these existing protections (all file paths relative to repo root `/Users/dr/Documents/Claude/Projects/Harris Football`):

| Existing control | Where | What it does |
|---|---|---|
| Global RLS, read-all / admin-write | `supabase/schema.sql` lines 124–173 | Every table has RLS on; `is_admin()` (lines 141–143) gates writes; all signed-in members can read. |
| Parent-contact lockdown | `supabase/migrate-security.sql` | `profiles` SELECT restricted to `id = auth.uid() or is_admin()` — parent emails/phones never visible to other families. |
| Ownership helper | `supabase/migrate-academy-v2.sql` lines 20–30 | `owns_player(pid)` — checks single (`player_id`) **and** multi-child (`player_ids @>`) ownership. |
| Child-data privacy (chores) | `supabase/migrate-academy-v2.sql` lines 82–91 | `ch_read` restricts chores to `owns_player(player_id) or is_admin()`. |
| Parent-scoped writes | `migrate-academy-v2.sql` lines 158–171 | `pe_self_insert` limits parent point writes to own child + the categories `quiz/challenge/chore/homework`. |
| Self-signup disabled | `migrate-security.sql` lines 7–9 (operational note) | New families created by coach, not self-registered. |
| Sponsor GDPR hard guard | `supabase/migrate-sponsor.sql` + enforced in `test/safeguarding.js` lines 258–326 | A `sponsor` login can reach **only** Sponsor + About; every child route redirects; no name, card markup, RSVP, POTM or media ever rendered. |
| Safeguarding test suite | `test/safeguarding.js` | jsdom assertions: no absolute leaderboard, name redaction (First L.), private bench/quiet flags, parent-scope RLS policy-text checks, sponsor hard guard, zero console errors. |

**Critical gap this spec must close.** Nothing in the current schema carries `club_id` or `team_id`, and `is_admin()` is **global** (`select is_admin from profiles`). In a shared multi-tenant DB this means *every* admin would, without new controls, read *every* club's data. Re-tenanting the RLS model is therefore the single highest-stakes change in the whole programme (Brief §8.1).

---

## 1. Tenant isolation strategy (defence in depth)

Isolation must hold on **two axes simultaneously** — cross-**club** and cross-**team** — on minors' data. A single missing predicate is an ICO-reportable breach spanning multiple controller organisations. We therefore layer four independent controls; any one failing must not, on its own, leak data.

### Layer 1 — Data model (the keys)
- Every content row carries `team_id` (and, where useful for rollup, a denormalised `club_id`); membership is many-to-many via a `memberships` table (`user ↔ club/team + role`), per Brief §5. **DATA_MODEL.md owns the authoritative table list and column placement.**
- The current global `is_admin()` boolean is **replaced** by membership-and-tier-scoped helpers (see Layer 2). The legacy `profiles.is_admin` must be migrated to a team-scoped `coach`/`team_admin` membership for club #1 and then retired, or it becomes a cross-tenant superuser. **[Gate: this migration is a BLACK trigger — §9.]**

### Layer 2 — Row-Level Security (the spine, enforced at the DB)
RLS is the **non-bypassable** control: it runs inside Postgres regardless of which app, query, or API path reaches it. New `SECURITY DEFINER` helper functions, keyed off the JWT `auth.uid()` and the `memberships` table, replace the global admin check. Indicative shape (authoritative definitions live in DATA_MODEL.md / a new `migrate-tenancy.sql`):

```
-- teams the current user belongs to, with role
member_team_ids(role text default null) returns setof bigint
-- clubs where the user is club_admin (top-level read across own teams)
club_admin_club_ids() returns setof bigint
-- platform tier (us) — the ONLY cross-club reader
is_platform_admin() returns boolean
```

Every table policy then becomes, in essence: `team_id in (select member_team_ids())` for team-scoped reads, widened to `team_id in (select t.id from teams t where t.club_id in (select club_admin_club_ids()))` for the club rollup, and `is_platform_admin()` for the platform tier. **No policy may use bare `using (true)`** on any table that carries child data — the current `read_all` (schema.sql line 151) and `pe_read`/`hw_read`/`sk_read`/`sg_read using (true)` policies must all be re-scoped to `team_id`. This re-scope is the core of the re-tenant migration.

### Layer 3 — Application layer (subdomain → tenant binding + defence)
- The host resolves the club; the path resolves the team (Brief §3, §5). The resolved `club_id`/`team_id` is bound server-side per request and **must be cross-checked against the JWT's memberships** — never trusted from the hostname alone (a forged Host header must not grant access).
- App-layer authorisation is a **second** check, not the primary one. It exists to fail safe (deny by default, redirect like the sponsor guard) and to give friendly UX, but RLS remains the backstop if the app check is ever wrong.
- No tenant identifier in URLs is used as an *authorisation* token — the subdomain is routing, not a secret (see §3 enumeration).

### Layer 4 — Automated isolation tests as a release gate (§2)
Tests prove Layers 1–3 actually hold, for every table, on every role, on every release. **This is the assurance referenced by Brief §10's definition of done** ("automated tests prove no club or team can ever read another's data").

**Defence-in-depth statement for the gates:** a cross-tenant read requires *all* of — a missing/incorrect RLS predicate **and** a missing app-layer check **and** the isolation test suite failing to catch it. The gate (§2) makes the third condition a hard release blocker.

---

## 2. Automated isolation TEST PLAN (HARD RELEASE GATE)

> **Gate definition.** No tenant — including the OWFC Harris migration (club #1) — goes live, and no release reaches production, unless **100% of the isolation suite passes** in CI. A single failing negative test (a row that *should not* be readable being readable) is an automatic **no-go**. This gate is owned by QA and is non-waivable except by a logged BLACK sign-off (§9).

### 2a. What the existing suites already give us
`test/safeguarding.js` (jsdom, localStorage path) already asserts the **intra-team** safeguarding properties: name redaction, private bench/quiet flags, no absolute leaderboard, and — critically — it checks **RLS policy text** for parent scoping (lines 254–256) and runs the **sponsor hard-guard route matrix** (lines 258–326). This is the template to extend: assert behaviour *and* assert the policy SQL exists.

**Limitation:** jsdom tests run on the localStorage/preview path with no live Postgres, so they verify *app behaviour* and *policy text*, not the *database enforcing RLS under a real JWT*. Cross-tenant isolation **cannot** be proven by jsdom alone. We need a new DB-level layer.

### 2b. New DB-level isolation tests (required — the core of the gate)
A new suite (e.g. `test/isolation.sql` run via pgTAP, or `test/isolation.js` driving Supabase with per-role JWTs) that, against a real (test) Postgres with all RLS policies applied:

1. **Seed two clubs, ≥2 teams each, with a full set of child-data rows** in every table: `players, fixtures, goals, attendance, point_events, homework, chores, skill_levels, monthly_votes, media, profiles, squad_goals, training_sessions, events`, plus the new tenancy tables `clubs, teams, memberships, licences`.
2. **For every table × every role**, assert with the role's JWT active (`set request.jwt.claims`):
   - **Positive:** a member of club/team A reads exactly their own rows.
   - **Negative (the gate):** the same member reads **zero** rows belonging to club/team B — `SELECT count(*) ... = 0` for B's data. Run for: `coach` (A) vs team B same club; `coach` (A) vs any team in club B; `club_admin` (A) vs club B; `family/player` (A) vs everything outside their child.
   - **Write isolation:** A-role `INSERT`/`UPDATE`/`DELETE` targeting a B-scoped `team_id`/`player_id` **fails** (RLS `with check` rejects it). Especially: a parent cannot write another family's `homework`/`chores`/`point_events`.
   - **Club-rollup boundary:** `club_admin` reads team-level rollup but **not** the fields excluded by the §8 visibility line (parent contact details, individual reflections, granular child data) — assert those columns return null/forbidden for that role.
   - **Platform boundary:** only `is_platform_admin()` reads across clubs; a club_admin escalating to platform reads is denied.
3. **Forged-context tests:** a request with a Host header for club B but a JWT with only club-A memberships gets club A's data only (app-layer binding test, §1 Layer 3).
4. **No-`using(true)` lint:** a static check that fails the build if any policy on a child-data table is `using (true)` without a tenant predicate (catches the legacy policies regression).

### 2c. Extend the jsdom suites
- Add multi-tenant render assertions to the `safeguarding.js` pattern: a coach logged into team A never sees team B players in any view; a club_admin view shows the **rollup only** and no excluded fields.
- Keep and re-run all existing assertions unchanged (regression guard).

### 2d. CI wiring
- DB-level isolation suite + extended jsdom suite + the no-`using(true)` lint run on every PR and every release candidate.
- **Every new table or new RLS policy MUST ship with its positive + negative isolation tests in the same change** (definition of done for any tenancy-touching PR). A new table with no negative test is a failed review.

---

## 3. Threat model & mitigations

| # | Threat | Vector | Mitigation |
|---|---|---|---|
| T1 | **Cross-tenant READ** (highest, Brief §8.1) | Missing/incorrect RLS predicate; legacy `using(true)`; denormalisation drift between `team_id`/`club_id` | RLS keyed to `memberships` (§1 L2); no-`using(true)` lint; DB-level negative tests for every table (§2b); deny-by-default app layer. |
| T2 | **Cross-tenant WRITE** | `with check` missing tenant predicate; parent writing another child's row | `with check` mirrors `using` on every policy; write-isolation negative tests (§2b.2); preserve `owns_player()` scoping on parent categories. |
| T3 | **Privilege escalation team→club→platform** | Global `is_admin` boolean acting as superuser; self-set role; tampered JWT claim | Retire global `is_admin`; roles come from server-controlled `memberships`, never client-set; `is_platform_admin()` separate and platform-only; tests assert club_admin cannot reach platform reads; no role field writable by the user. |
| T4 | **Broken object-level authorisation (BOLA/IDOR)** | Guessable `player_id`/`fixture_id` in URL or API; row fetched by id without tenant check | Every fetch passes through RLS (id alone never authorises); object-level negative tests; no child PII in URLs (T6). |
| T5 | **Subdomain takeover** | Dangling DNS / wildcard cert mis-issuance on `*.harris.football`; stale club subdomain after licence termination | On-demand TLS only for **provisioned** clubs (allow-list resolver, not blanket wildcard issuance); de-provision removes routing on licence end (§5); monitor cert issuance (Brief §8.3); CAA records; **[DPO/LEGAL + ops review]**. |
| T6 | **Leaked invite codes** | Invite/licence code shared, brute-forced, or reused | Single-use, time-boxed, high-entropy codes bound to a club/team + role; revocable; rate-limited redemption; audit each redemption (§7); never a long-lived shared secret. |
| T7 | **Enumeration** | Iterating subdomains, `player_id`s, invite codes, or login emails to map tenants/children | Subdomain existence is not sensitive but returns nothing without a valid scoped JWT; generic auth errors (no "user exists"); rate-limit + lockout on auth and invite endpoints; opaque ids not treated as secrets but never the authorisation control. |
| T8 | **Account/credential compromise** | Phished coach/club_admin; shared family login | MFA available (recommended for club_admin/platform) **[decision §10]**; least privilege limits blast radius (a compromised coach reaches one team only); audit + breach process (§6). |
| T9 | **Data exfiltration via export** | A legitimate role mass-exports beyond need | Exports are role-scoped (a coach exports own team only), audited (§7), and rate-limited; bulk/platform export is a BLACK action (§9). |
| T10 | **Supabase Storage / media leakage** | Public bucket (current `media` bucket is **Public**, schema.sql line 177) serving another tenant's child photos via guessable URL | Move to tenant-scoped, **non-public** storage with signed URLs and Storage RLS keyed to `team_id`; photo-consent gate (§8). **The current public bucket is unacceptable for multi-tenant child media — must change before any external tenant.** **[BLACK/gate]** |

---

## 4. Data protection roles, lawful basis & the DPA

### 4.1 Controller / processor position
- **Each Club is a data controller** for its members' personal data; it decides the purpose (running its academy). **We (Academy OS / Platform) are a data processor** acting on each club's documented instructions (Brief §7, §12). This is the working position and must be confirmed in writing per club. **[DPO/LEGAL — confirm; in some arrangements the platform may be a joint controller for certain platform-level processing such as the central library or analytics. Decide explicitly per processing activity.]**
- Consequence: **a signed Data Processing Agreement (DPA) per club is a precondition of that club holding real data** (Brief §10). No DPA → no live tenant. This is a Commercial-Readiness gate item.

### 4.2 DPA — clauses it must contain (UK GDPR Art. 28(3))
**[DPO/LEGAL must draft/approve the actual contract; this is the required-content checklist, not legal drafting.]**

1. **Subject-matter, duration, nature & purpose** of processing; **types of personal data** (incl. special-category if any) and **categories of data subjects** (state explicitly: **children/minors**).
2. **Process only on documented instructions** from the controller (incl. international transfers).
3. **Confidentiality** — persons authorised to process are under confidentiality obligations.
4. **Security measures** (Art. 32) — reference this document's technical & organisational measures (RLS, isolation testing, audit logging, encryption in transit/at rest).
5. **Sub-processors** — list (e.g. Supabase, hosting/Vultr, Caddy/TLS, Stripe, email provider), prior authorisation, and flow-down of obligations. **[DATA_MODEL/ops to confirm the actual sub-processor list — TBD.]**
6. **Data subject rights assistance** — processor helps the controller respond (§5).
7. **Assist with security, breach notification, DPIA & prior consultation** (Arts. 32–36).
8. **Breach notification to the controller without undue delay** (§6) — define the SLA (e.g. within 24h of detection) so the controller can meet its 72h ICO duty.
9. **Deletion or return** of all personal data at end of provision of services (export-then-purge, §5).
10. **Audits & inspections** — make available information to demonstrate compliance and allow audits.
11. **International transfers** — data residency (UK/EEA) and safeguards if any transfer occurs; confirm Supabase project region. **[TBD — confirm region is UK/EEA.]**
12. **Liability, indemnity, term & termination** alignment with the licence terms.

### 4.3 Lawful basis, minors & parental consent
- **Lawful basis [DPO/LEGAL]:** likely a mix — **legitimate interests / contract** for core academy operation (run by the club), and **consent** for optional/expansive processing (notably **photographs and media**, and any marketing). Each processing activity needs its basis documented (record of processing).
- **Children's data is given special protection** under UK GDPR / DPA 2018. Data subjects here are "largely minors" (Brief context) — treat **all** player records as children's data by default.
- **Age & consent handling:** the **ICO Age-Appropriate Design Code (Children's Code)** applies to this online service likely to be accessed by children — design for the lowest plausible age, data-minimise, default to high privacy (this already aligns with the existing name-redaction and private-flag design). For under-13s, **a parent/guardian holds and exercises rights and provides consent**; the platform already uses **per-family logins managed by the coach** (not child self-registration) which supports this. Capture **who** consented and **when** (consent records). **[DPO/LEGAL — confirm the age threshold model and consent-capture wording.]**
- **DPIA:** processing children's special-category-adjacent data at scale across many organisations almost certainly requires a **Data Protection Impact Assessment** before external launch. **[DPO/LEGAL — DPIA mandatory; this document is an input to it.]**

---

## 5. Data subject rights, retention & deletion

### 5.1 Rights across tenants (Arts. 15–20)
Requests are routed to **the relevant club (controller)**; we (processor) provide the tooling and assist (DPA clause 6). Tooling must be **tenant-scoped** — a club_admin exercising a request can only act within their own club, and a request must never surface another tenant's data.

| Right | Mechanism | Cross-tenant safeguard |
|---|---|---|
| **Access** (Art. 15) | Export a data subject's records (scoped to one player + their profile) | Export runs through RLS; logged (§7); a coach/club_admin can only export own scope. |
| **Rectification** (16) | Existing edit paths (coach/admin) | RLS-scoped writes; audit the change. |
| **Erasure** (17) | Delete player + cascade (FKs already `on delete cascade` for child rows; `set null` for references — verify no PII orphaned) | Scoped to own club/team; logged; consider soft-delete + purge window. **[Decision §10: hard vs soft delete + grace period.]** |
| **Portability** (20) | Machine-readable export (JSON/CSV) of the player's data | Scoped; logged. |

### 5.2 Retention & season rollover
- **Retention policy [DPO/LEGAL — set the periods].** Default principle: keep child data only as long as the child is an active member + a defined post-membership period, then purge. The app already has a **seasons** model (`schema.sql`, `migrate-seasons.sql`) — use season rollover to drive archival.
- **Season rollover/archival:** at season end, retain for continuity within the retention window; archive (not silently keep forever) older seasons; surface a retention setting per club. **[TBD — concrete periods.]**

### 5.3 Deletion on licence termination (export-then-purge)
On licence end (expiry/termination), per DPA clause 9 and Brief §5/§8.5:
1. **Grace/read-only state** (billing edge cases, Brief §8.5) — define the window. **[Decision §10.]**
2. **Export** the club's data to the controller in a portable format (their copy).
3. **Purge** all that club's rows across every table (RLS-scoped delete by `club_id`) **and** its Storage objects, **and** de-provision the subdomain/cert (closes T5).
4. **Log** the export and purge with timestamps and operator (§7); retain the deletion record itself (not the data) as evidence.
5. **Purge is a BLACK action** (§9) — irreversible bulk deletion of children's data requires explicit human sign-off.

---

## 6. Breach process

1. **Detection** — sources: audit-log anomalies (cross-tier reads, unusual exports), failed-isolation alerts, error monitoring, Supabase/Storage logs, user/coach report. Define an owner and an on-call path (Brief §8.6 — an owner is mandatory at platform scale).
2. **Containment** — revoke compromised credentials/invite codes; if isolation failure suspected, **freeze affected tenants to read-only or take offline**; rotate keys; identify scope (which clubs/children).
3. **Assessment** — what data, whose, how many subjects, likelihood of harm. Children's data raises the risk rating.
4. **Notification timelines:**
   - **Processor → Controller:** without undue delay, per DPA SLA (target **within 24h** of detection) so the controller can meet its statutory clock.
   - **Controller → ICO:** **within 72 hours** of the controller becoming aware, where the breach is likely to result in a risk to individuals (UK GDPR Art. 33). We must give the controller what they need to assess and report in time.
   - **To affected individuals:** without undue delay where high risk (Art. 34) — controller-led, processor-assisted.
5. **Records** — maintain a **breach register** (all breaches, reportable or not), with facts, effects, and remediation (Art. 33(5)). Post-incident review feeds back into tests (§2) and this document. **[DPO/LEGAL — approve the breach procedure and the ICO-reporting decision tree.]**

---

## 7. Audit logging

| Log | Examples | Why |
|---|---|---|
| **Admin/coach actions** | role/membership grants & revokes, licence issue/revoke, squad changes, overrides | Accountability; escalation detection (T3). |
| **Cross-tier reads** | platform reading a club; club_admin reading team rollup | Detect/justify privileged access; breach forensics. |
| **Exports** | every data-subject or bulk export (who, scope, when) | Exfiltration detection (T9); rights-request evidence (§5). |
| **Auth events** | logins, failures, lockouts, MFA, invite-code redemptions | Compromise/enumeration detection (T6–T8). |
| **Deletions** | erasure requests, licence-termination purges | Erasure evidence; the deletion record survives the data. |

- **Where:** an append-only, **tenant-tagged** audit store with its own RLS (a club sees only its own audit entries; platform sees all). Must not itself become a cross-tenant leak.
- **Retention:** logs contain personal data — set a defined retention (e.g. 12 months) balancing security need against minimisation. **[DPO/LEGAL — confirm period; align with breach-evidence needs.]**
- **Integrity:** logs are append-only and not editable by tenant roles.

---

## 8. Safeguarding-specific controls

### 8.1 The precise child-data visibility line (club_admin)
> **This closes the open decision in Brief §11 ("exact field-level definition of club top-level visibility"). The values below are the *recommended* line and must be confirmed by the club's safeguarding lead + DPO. [DPO/SAFEGUARDING SIGN-OFF REQUIRED.]**

A **`club_admin` MAY see** (top-level rollup, own teams only): squad list (player display name as **First name + surname initial**, squad number, position), aggregate/progress summary (tier, AP totals, attendance rate), training schedule, fixtures/results, development *summary*.

A **`club_admin` MUST NOT see:** **parent/guardian contact details** (emails, phone — these stay locked to family + coach per `migrate-security.sql`); **individual coaching reflections / free-text notes** about a child; **chores and homework detail** (private to family + coach, `migrate-academy-v2.sql` `ch_read`); **skill-level granularity** beyond summary; **media of children** except as consented; **another club's anything**.

A **`coach`** (own team) retains today's full read/write for their team. A **`family`/`player`** keeps today's scoped view. A **`platform_admin`** can technically see all (for support/operations) but such access is **logged as a cross-tier read** (§7) and governed by the DPA.

### 8.2 Name handling (preserve)
First name + surname initial in all card-facing/kid-facing UI; full name only on the coach/admin screen. Already enforced and tested — `test/safeguarding.js` lines 109–126 (`Olivia T.` shown, `Thunderbottom` never on the card; full name allowed only on the coach development screen). **Must continue to pass post-tenanting, per team.**

### 8.3 Photo / consent handling
- Media is **children's images** — high sensitivity. **Consent-gated:** no child media uploaded/displayed without recorded photo consent for that child.
- **Fix required:** the current Storage `media` bucket is **Public** (`schema.sql` line 177). For multi-tenant child media this must become **non-public, tenant-scoped, signed-URL** access with Storage RLS by `team_id` (T10). Enforce the consent flag at upload and at render.

### 8.4 Least privilege for coaches
A coach's reach is **one team**. Membership-scoped RLS (§1) makes a compromised coach account a one-team blast radius (T8). No coach can read another team in the same club, nor any other club.

### 8.5 No DM / free-comms that bypass safeguarding
- **No private adult↔child direct messaging** or unmoderated free-text comms channel that bypasses safeguarding oversight. Any communication feature must be visible to the safeguarding chain and auditable. The current product has **no DM channel — preserve that absence**; any future comms feature is a BLACK trigger requiring safeguarding sign-off (§9).
- The sponsor role's **zero-child-data** guarantee (tested, `safeguarding.js` 258–326) is preserved and re-asserted per tenant.

### 8.6 Existing protections to preserve (regression set)
All of: name redaction; private bench flag; private quiet-player flag (coach-only); no absolute leaderboard (Mover of the Month is the only ranked list); parent contact lockdown; chores/homework privacy; parent-scoped writes; sponsor hard guard. These are the existing `test/safeguarding.js` assertions and **must remain green, now per-tenant**.

---

## 9. BLACK triggers — actions requiring explicit human sign-off

The following are **not** to be performed by an automated agent or a single engineer without **explicit, logged human sign-off** (and, where marked, DPO/legal/safeguarding sign-off). They are the highest-risk actions in this programme:

1. **Production deploy** of any tenancy / RLS / isolation-touching change.
2. **Any change to RLS policies or isolation logic** (helpers, `memberships`, tenant predicates) — incl. retiring the legacy global `is_admin`.
3. **Schema changes** to any table carrying child data or tenant keys.
4. **Opening self-checkin / self-serve checkout** (Brief Phase 2) — lets external orgs onboard real children's data.
5. **Onboarding/handling real external children's data** (first external tenant; any pilot club going live) — requires DPA signed + DPIA done + isolation gate green.
6. **Bulk export or bulk/irreversible deletion** of children's data (licence-termination purge, §5.3).
7. **Granting platform-tier access** or elevating any role's tenant scope.
8. **Changing Storage bucket visibility / access model** for media (T10).
9. **Adding any communications feature** (messaging/comments) — safeguarding sign-off (§8.5).
10. **Disabling or waiving the isolation test gate** (§2) for a release.
11. **Changing the subdomain/TLS/DNS issuance model** (T5).

Each BLACK action: logged in the audit trail (§7), named human approver, and — for 4/5/6/9 — DPO/safeguarding sign-off recorded.

---

## 10. Open compliance decisions & assumptions

### Open decisions (must be closed before external go-live)
- **D1 — Controller/processor edge cases [DPO/LEGAL]:** is the platform a *joint controller* for any platform-level processing (central library, cross-club analytics)? Decide per activity.
- **D2 — Lawful basis per processing activity [DPO/LEGAL]:** document the basis for each (operation vs media vs analytics vs marketing).
- **D3 — Age threshold & consent model [DPO/LEGAL]:** confirm under-13 handling, parental-consent capture wording, and Children's Code conformance.
- **D4 — Retention periods [DPO/LEGAL]:** concrete durations for active data, post-membership, season archive, audit logs.
- **D5 — Erasure model:** hard delete vs soft delete + purge window; reconcile with FK cascade behaviour.
- **D6 — Licence-end grace/read-only window** length before purge (ties to billing, Brief §8.5).
- **D7 — Data residency [confirm]:** Supabase project region UK/EEA; sub-processor list and locations.
- **D8 — MFA policy:** mandatory for club_admin/platform? Recommended yes.
- **D9 — Field-level club_admin visibility (§8.1):** confirm the exact line with each club's safeguarding lead (closes Brief §11 item).
- **D10 — Sub-processor list (DPA clause 5):** finalise (Supabase, host, TLS, Stripe, email).
- **D11 — DPIA owner & timing [DPO/LEGAL]:** schedule before external launch.

### Assumptions (inherited from Brief §12; flag if any change)
- Built on the existing stack (vanilla SPA + Supabase + Caddy), extended not replaced.
- We are processor; clubs are controllers (subject to D1).
- Subdomains are cosmetic routing over one shared instance — isolation is logical, not physical.
- Payments handled by a hosted provider (Stripe); **we never touch card data** (keeps PCI scope out — confirm).
- OWFC Harris is reference tenant / first migration (club #1).

### Where qualified sign-off is mandatory
- **DPO/Legal:** DPA content & execution (§4.2), lawful basis & age/consent (§4.3), DPIA (§4.3), breach procedure & ICO decision tree (§6), retention (§5.2/§7), residency/transfers (§4.2.11), controller/processor edges (D1).
- **Safeguarding lead:** the §8.1 child-data visibility line; any comms feature (§8.5).
- **Security/ops:** TLS/DNS issuance model (T5), Storage access model (T10).

---

## 11. How this document gates the programme (summary)

- **QA gate:** the §2 isolation test plan is a **hard, non-waivable** release gate — 100% pass (positive + negative, every table, every role) before any tenant is live. New tables/policies ship with their isolation tests in the same change.
- **Commercial-Readiness gate:** controller/processor confirmed, **DPA signed per club**, DPIA done, retention & breach process in place (§4–§6) before opening self-checkin (§9.4) or onboarding real external children's data (§9.5).
- This document is itself a gating control and must be re-reviewed whenever RLS, tenancy, schema, Storage, or the comms model changes.

*End. Companion deliverables required next: `DATA_MODEL.md` (table list + authoritative RLS matrix), `migrate-tenancy.sql` (re-tenant migration + new helpers), `test/isolation.*` (DB-level gate suite), `LICENCE_DPA_CHECKLIST.md`.*
