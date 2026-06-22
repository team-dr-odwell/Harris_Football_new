# Development Plan — Academy OS (working name)

*Gated development programme · v1 · last updated 18 June 2026*

This is the master programme for taking the proven single-team product (harris.football) to a multi-tenant, three-tier platform (Platform → Club → Team). It is **gated**: no stage advances until the prior gate is GREEN. It governs the four companion specs and sequences the work into thin, shippable slices.

Read this with: `PROJECT_BRIEF.md` (why/what), `ARCHITECTURE.md` (system design), `DATA_MODEL.md` (schema + RLS matrix), `SECURITY_GDPR_SAFEGUARDING.md` (the gating risk/compliance controls), `COMMERCIAL_READINESS.md` (licensing + GTM), `COMPETITOR_ANALYSIS.md` + `COMPETITOR_PRICING_GTM.md` (market), `RED_TEAM_SECURITY.md` + `RED_TEAM_PRODUCT.md` (adversarial review), `DEBATE_*` (sequencing debate), and `DECISIONS_LOG.md` (adjudicated decisions).

> **Revision note (2026-06-18, post red-team + debate).** This plan was originally a single forward pass. After a competitor teardown, a two-front red-team, and a sequencing debate, the **programme sequence is revised** — see §0.5. The gate framework below stands; what changed is *when* the heavy build runs relative to demand validation and security remediation. Read §0.5 before §3–§5.

---

## 0. How this plan operates

**Gate discipline.** Work flows through seven build gates: Opportunity → Product → UX → Architecture → Build → QA → Commercial Readiness. Each gate has entry criteria, a workstream, four standing reviews, required evidence, and an explicit GREEN exit. A gate is GREEN only when its exit criteria are evidenced — not asserted.

**Four standing reviews at every gate.**

| Review | Question it forces |
|---|---|
| Product Owner | Does this serve the club/coach/parent/child, and is it the most valuable next slice? |
| Adversarial Reviewer | How does this break, leak, or get abused? Attack it before a stranger does. |
| User Simulation | Walk a real coach / parent / club admin through it step by step — where do they stall? |
| Definition of Done | Is it actually finished — tested, documented, reversible, observable? |

**Three doctrines, always on.**

1. **Evidence-based** — every gate decision cites artefacts (test output, schema, screenshots, sign-offs). No "looks fine".
2. **Thin slices** — ship the smallest end-to-end increment that proves the next risk down. Never a big-bang cutover.
3. **Persistent memory** — `WORK_LEDGER.md`, `DECISIONS_LOG.md`, `KNOWN_ISSUES.md`, `OBJECTIVES.md` updated before any slice closes.

**Gate states.** GREEN (advance) · AMBER (advance with named follow-ups + owner + date) · RED (do not advance; fix) · BLACK (stop; explicit human sign-off required — see §6).

---

## 0.5 Revised programme sequencing (adjudicated — `DECISIONS_LOG.md` D-0)

The red-team split: the product review returned **STOP-AND-VALIDATE-FIRST** (don't build the high-liability vault before proving anyone pays); the build-now case argued the white space is time-boxed and the platform *is* the moat. The debate converged on the linchpin: **liability attaches when external children's data is admitted, not when you commit to build.** So we run three things concurrently and gate the *data*, not the build:

| Track | What | Timescale | Liability |
|---|---|---|---|
| **Round 0 — Security remediation** | Fix the *live* holes now: self-grant `is_admin` (F1), sponsor clamp into RLS (F2), `using(true)` rewrite on sensitive tables (F3), rotate the exposed key onto a **fresh Supabase project**, lock the public `media` bucket (F4) | Days, immediate | Protects the current live site |
| **Track A — Willingness-to-pay** | Name a price; secure **≥3 external clubs committing real money** to an assisted pilot of the *existing* development product | Weeks, cheap | None (no platform code) |
| **Track B — Phase 0 re-tenant** | Build the multi-tenant foundation + curriculum-cascade moat behind the isolation gate, on **OWFC Harris's own data only** | Parallel | Low — OWFC already controls this data |

**The hard gate (BLACK):** no external club's children's data is admitted (Phase 1) until **all** of — Track A proves willingness-to-pay · the liability stack is in place (DPA, insurance, legal entity, DPO sign-off, a second responsible person) · the isolation gate is 100%.

If Track A fails its go/no-go, Track B pauses with the moat partly built and the security fixes banked — a cheap, recoverable position. This is the operating sequence; §3 (gates) and §5 (slices) execute *within* it.

## 1. Companion spec ownership

| Concern | Owner doc | The plan depends on it for |
|---|---|---|
| System design, subdomain/TLS, tenant context, migration | `ARCHITECTURE.md` | Architecture gate evidence |
| Schema, the full `team_id` table list, RLS policy matrix, indexes | `DATA_MODEL.md` | Architecture + Build gate evidence |
| Isolation strategy + **isolation test gate**, DPA, controller/processor, child-data visibility line, breach/audit | `SECURITY_GDPR_SAFEGUARDING.md` | QA + Commercial gates; the hard recurring gate (§4) |
| Licence model, Stripe checkout/webhooks, lifecycle/dunning, onboarding, support, KPIs, GTM | `COMMERCIAL_READINESS.md` | Commercial Readiness gate evidence |

These three lines **must read identically** across docs: (a) what a `club_admin` may and may not see of a child; (b) the licence lifecycle states and what happens to data on expiry; (c) the list of tables carrying `team_id`. Watcher checks this alignment at each gate.

---

## 2. Pre-work — remediation backlog (entry condition for the whole programme)

The workers found real, shipped issues in the single-team code that become **critical** under multi-tenancy. These are not new features; they are the conditions of safe tenancy and must be cleared (or scheduled into the relevant slice) before that slice can go GREEN.

| # | Finding (evidence) | Why it's critical at scale | Gates it blocks |
|---|---|---|---|
| R1 | No `club_id`/`team_id` on any table (`supabase/schema.sql`) | Nothing is tenant-scoped; every query is cross-tenant by default | Architecture, Build |
| R2 | Global `is_admin()` acts as superuser (`schema.sql:141-143`) | A team coach could read every club | Build, QA |
| R3 | Bare `using(true)` policies — incl. `video_reflections` (children's free-text), `directory` (adult contacts), `rsvp` (`migrate-academy-progress.sql`, `schema.sql:151`) | Direct cross-tenant leak of children's and adults' personal data | QA (isolation gate), BLACK |
| R4 | `media` Storage bucket is **Public** (`schema.sql:177`) | Child photos world-readable across tenants | QA, BLACK |
| R5 | Deploy inconsistency: `deploy/Caddyfile` (Caddy) vs `deploy/update.sh` reloads nginx; stray `nginx-harris.conf` | Routing/TLS behaviour ambiguous; on-demand TLS plan assumes Caddy | Architecture, Build |
| R6 | Much "content" (position targets, challenges, quiz bank, skill ladder) is static in `js/data.js`, not DB; `seasons` table unused (config-driven) | Library-scoping (platform/club/team) needs a decision: promote to scoped tables or keep as shared code | Product, Architecture |
| R7 | No `sponsors` table (static page + `is_sponsor` flag) | Per-team sponsors at scale need a real, scoped model | Product, Architecture |
| R8 | **Self-grant admin (LIVE)**: `profiles_update` `with check (… or is_admin())` lets any user set `is_admin=true` on their own row (`migrate-security.sql`) | One-line self-promotion to (global) superuser — a present production hole | Round 0 (immediate), BLACK |
| R9 | Sponsor "no child data" enforced only in `app.js` route guards; DB is `using(true)` | Sponsor JWT can read everything via the API; the clamp must live in RLS | Round 0, QA |
| R10 | Committed live anon key + project URL in a **public** repo | "Safe iff RLS holds" — but RLS is the thing being built; treat project as compromised, rotate to fresh project | Round 0 |
| R11 | Identity is global `name→slug→@harris.football`; collides/merges across clubs; `harris.football` vs `harris.team` mismatch | Cross-club identity merge; auth redesign needed (`DECISIONS_LOG.md` D-4) | Architecture |
| R12 | No staging; paste-to-prod migration culture; backups commingle tenants | Unsafe change process for a shared child-data DB (`DECISIONS_LOG.md` D-8) | Architecture, Build |

R1–R5 and R8–R10 are isolation/safety blockers (R8–R10 are **Round 0, do-now**). R6–R7 and R11 are modelling/redesign decisions; R12 is process. The isolation gate (§4) must also **discover** tables rather than iterate a hard-coded list (RED_TEAM_SECURITY F11).

---

## 3. The seven gates

### Gate 1 — Opportunity  *(status target: GREEN at kickoff)*
**Purpose:** confirm the problem, the three-tier model, and that one shared instance is the right shape.
**Entry:** `PROJECT_BRIEF.md` exists and is agreed.
**Workstream:** validate demand signal (104-team club + grassroots breadth); confirm OS→Club→Team model and logical (not physical) tenancy; confirm we act as processor, clubs as controllers.
**Reviews:** PO — is the club the right buyer? · Adversarial — is single-instance blast radius acceptable? · User Sim — does a club committee understand the offer? · DoD — brief signed off.
**Evidence:** signed brief; named pilot interest.
**GREEN exit:** model agreed; no fundamental objection to shared-instance multi-tenancy; processor/controller stance accepted.

### Gate 2 — Product
**Purpose:** define exactly what each tier can do in v1, and resolve the modelling decisions (R6, R7).
**Entry:** Gate 1 GREEN.
**Workstream:** lock the v1 scope (`PROJECT_BRIEF.md §4`); decide curriculum model (shared code vs scoped tables) and sponsor model; define the `club_admin` rollup feature set; ratify the child-data visibility line with the safeguarding lead.
**Reviews:** PO — smallest valuable v1? · Adversarial — which "obvious" feature creates a safeguarding hole? · User Sim — coach/parent/club-admin journeys mapped · DoD — scope written, decisions logged.
**Evidence:** agreed scope list; `DECISIONS_LOG.md` entries for R6/R7 and the visibility line.
**GREEN exit:** v1 feature set per tier frozen; curriculum/sponsor modelling decided; visibility line ratified and identical in `DATA_MODEL.md` + `SECURITY_GDPR_SAFEGUARDING.md`.

### Gate 3 — UX
**Purpose:** prove the three-tier experience is usable, on phones, for non-technical volunteers.
**Entry:** Gate 2 GREEN.
**Workstream:** per-club theming from brand tokens; club/team switcher (reuse the existing child-picker pattern); the club rollup dashboard; self-registration and invite-code flows; empty/edge states; WCAG AA pass.
**Reviews:** PO — does it reduce coach effort? · Adversarial — can a parent wander into another team's data via the UI? · User Sim — a new coach reaches "squad imported" unaided · DoD — flows specified, accessibility checked.
**Evidence:** mockups/screens; accessibility check; a click-through of each tier.
**GREEN exit:** each tier's core journey demonstrated and approved; mobile + AA validated.

### Gate 4 — Architecture
**Purpose:** lock the technical design and the data layer before building.
**Entry:** Gate 3 GREEN.
**Workstream:** finalise `ARCHITECTURE.md` (tenant resolution, on-demand TLS + ask-endpoint, theming, switcher, migration) and `DATA_MODEL.md` (tables, the complete `team_id` list, RLS matrix, indexes); standardise deploy on Caddy (fix R5); choose tenant-context mechanism (GUC vs JWT).
**Reviews:** PO — does this scale to 100+ without rework? · Adversarial — threat-model the resolver, ask-endpoint, and RLS predicates · User Sim — operator can provision a club mentally end-to-end · DoD — both specs complete, open decisions logged.
**Evidence:** the two specs; resolved deploy pipeline; decision log for GUC-vs-JWT and rollup live-vs-materialised.
**GREEN exit:** architecture + data model signed off; RLS matrix leaves **no table unscoped**; deploy path unambiguous.

### Gate 5 — Build
**Purpose:** implement in thin slices (see §5), each independently shippable and reversible.
**Entry:** Gate 4 GREEN.
**Workstream:** execute the Phase-0 slices; every slice that touches a table ships its isolation tests in the same change (doctrine).
**Reviews:** PO — slice delivers value/derisks? · Adversarial — code-level abuse + RLS bypass attempts · User Sim — the slice works for the target user · DoD — tests green, docs + ledger updated, reversible.
**Evidence:** passing test suites (existing jsdom + new DB-level isolation); migration dry-run output; row-count parity for migrations.
**GREEN exit (per slice):** slice live in preview, all tests green, no AMBER isolation findings open, ledger updated.

### Gate 6 — QA  *(includes the hard isolation gate, §4)*
**Purpose:** prove correctness, fairness, and — above all — tenant isolation, before any real external data.
**Entry:** Gate 5 GREEN for the slice(s) under test.
**Workstream:** run full jsdom suites (smoke, academy, content, safeguarding) + the new DB-level isolation suite; device testing; performance check with seeded multi-club data.
**Reviews:** PO — acceptance criteria met? · Adversarial — forged-Host, cross-tenant read/write, privilege-escalation, enumeration tests · User Sim — real-world data shapes (twins, multi-team parents, missing fields) · DoD — 100% isolation pass, no RED open.
**Evidence:** isolation suite report (every table × role × operation); device matrix; perf numbers.
**GREEN exit:** **isolation suite 100% pass** (non-waivable); functional suites green; no RED defects.

### Gate 7 — Commercial Readiness
**Purpose:** confirm a club can be onboarded lawfully, paid-for, supported, and offboarded.
**Entry:** Gate 6 GREEN.
**Workstream:** Stripe hosted checkout + webhook provisioning; licence lifecycle/dunning; **signed DPA per club** as a precondition of holding data; privacy policy, retention, breach process, audit logging live; onboarding docs + support path; safeguarding/vetting gate before a tenant holds child data.
**Reviews:** PO — sustainable unit economics path? · Adversarial — refund/chargeback abuse, free-rider, licence-expiry data exposure · User Sim — a club self-checks-in and a coach onboards a squad unaided · DoD — legal sign-off obtained, runbooks exist.
**Evidence:** working checkout→provision in test mode; executed sample DPA; published policies; support runbook.
**GREEN exit:** end-to-end self-checkin works in test; DPA + privacy + breach + audit in place with legal sign-off; support model staffed.

---

## 4. The hard isolation gate (recurring, non-waivable)

Owned by `SECURITY_GDPR_SAFEGUARDING.md`. Sits inside Gate 6 but recurs on **every** change touching a table, policy, role, or the resolver.

- A DB-level suite (pgTAP / per-role JWTs) seeds ≥2 clubs × ≥2 teams with child-data rows in every table.
- For **every table × every role × every operation**: assert own-rows readable, **other-tenant rows return zero**, writes are tenant-bound; assert club-rollup field boundaries, the platform boundary, forged-Host rejection, and a lint that **no policy uses `using(true)`**.
- **100% pass is a precondition** of any release and of any tenant (including OWFC Harris as club #1) going live. A failure is RED; disabling the gate is BLACK.

---

## 5. Delivery phases (thin slices)

### Phase 0 — Re-tenant the foundation (the heavy lift)
Turn the single-team app into a multi-tenant one, with Harris as the proving tenant. Each slice is additive and reversible until the final cutover.

| Slice | Deliverable | Exit |
|---|---|---|
| 0a | Tenancy tables added (`clubs`, `teams`, `memberships`, `licences`) — additive, no behaviour change | Tables live; app unchanged; tests green |
| 0b | Backfill Harris → club #1 / team #1; dual-run roles (memberships alongside `is_admin`/`is_sponsor`) | Row-count parity; both role paths agree |
| 0c | Add `team_id`/`club_id` to all content tables; rewrite every `using(true)` policy (R3); retire global `is_admin` (R2); stand up the isolation suite (§4) | Isolation suite 100%; no unscoped table |
| 0d | App tenant context: `resolveTenant()` from host/path; routing; per-club theming; club/team switcher | Two seeded clubs render isolated, themed |
| 0e | Lock down `media` Storage bucket (R4): private + signed URLs + consent gate | No public child media; access tests pass |
| 0f | Caddy on-demand TLS + wildcard DNS + ask-endpoint; fix deploy pipeline (R5) | New subdomain issues a cert only if licensed |
| 0g | Cutover Harris to the platform; verify zero data loss | Harris live on platform; parity verified |

**Phase-0 gate:** Gates 4→6 GREEN across the slices; isolation 100%; Harris fully migrated.

### Phase 1 — Pilot (2–3 external clubs)
Manual/assisted provisioning; club rollup dashboard; DPA template executed per pilot club; close monitoring. **Gate:** Commercial Readiness GREEN for assisted onboarding; isolation holds with real external data (BLACK sign-off to admit the first external children's data).

### Phase 2 — Self-checkin
Stripe checkout + webhook auto-provisioning; lifecycle/dunning; self-serve onboarding. **Gate:** Commercial Readiness GREEN for unattended onboarding; opening self-checkin is a BLACK action.

### Phase 3 — Scale
Onboarding tooling, docs, support tooling, performance hardening. **Gate:** support model proven against pilot load; KPIs instrumented.

### Phase 4 — Platform features
Club rollup analytics, white-label/custom domains, cross-club options. **Gate:** per-feature, full stack.

---

## 6. BLACK triggers (explicit human sign-off required)

Production deploy of tenancy/RLS changes · any RLS/isolation change (incl. retiring global `is_admin`) · schema changes on child-data/tenant tables · changing Storage bucket visibility · opening self-checkin · onboarding the first real external children's data · bulk export or any irreversible/bulk deletion (licence purge) · granting platform-tier access · adding any messaging/DM feature · disabling the isolation gate · changing the subdomain/TLS/DNS model · entering payment credentials (hard ban — the club pays Stripe directly).

Project constitutions may add to this list, never subtract.

---

## 7. Consolidated risk register

| Risk | Severity | Mitigation | Owner doc |
|---|---|---|---|
| Willingness-to-pay unproven; parent-wants / committee-buys mismatch vs free Spond | BLOCKER (business case) | Track A demand test before major spend (§0.5, `RED_TEAM_PRODUCT`) | Commercial |
| Solo-operator as multi-club processor of children's data — uncapped liability for low ACV | BLOCKER (business case) | Liability stack as the BLACK gate before external data; consider license/partner | Commercial/Security |
| Sequencing: building the vault before proving demand | HIGH | Concurrent tracks, data-gated (§0.5 / D-0) | Plan |
| Live self-grant admin + exposed key on current site (R8/R10) | BLOCKER | Round 0 remediation, immediate | Security |
| Cross-tenant data leak (cross-club + cross-team), children's data | BLOCKER | Layered isolation + non-waivable isolation gate (§4) | Security |
| Legacy `using(true)` / global `is_admin` / public bucket carried into prod | BLOCKER | Remediation backlog R2–R4 as slice exit conditions | Security/Data |
| Controller/processor obligations unmet (no DPA) | HIGH | DPA per club precondition; legal sign-off | Security/Commercial |
| TLS/DNS issuance abuse or subdomain takeover | HIGH | Ask-endpoint gating + status checks + stale-subdomain cleanup | Architecture/Security |
| Coach adoption / support overwhelm at scale | HIGH | Self-serve onboarding; support clubs not coaches | Commercial |
| Single-instance blast radius | MEDIUM | Containment levers (status flag, maintenance page), backups, monitoring | Architecture |
| Pricing wrong / churn | MEDIUM | Pricing as levers, TBD until pilot data | Commercial |

`KNOWN_ISSUES.md` holds the live, severity-tagged version.

---

## 8. Roles (who plays what)

Mind (orchestration, objective register) · Prompt (upgrades each worker dispatch) · Loop (multi-pass build cycles) · Planned (gate enforcement) · Watcher (reviews every output, owns the four states). Specialised workers do domain work inside the stack. **The operator (Daniel) approves all BLACK actions.** Legal/DPO sign-off is mandatory where `SECURITY_GDPR_SAFEGUARDING.md` marks `[DPO/LEGAL]`.

---

## 9. Definition of Done

**Per slice:** code merged; existing jsdom suites + new isolation tests green; migration row-count parity; docs + `WORK_LEDGER.md` + `DECISIONS_LOG.md` updated; reversible; live in preview.
**Per phase:** its gates GREEN; isolation 100%; no open RED.
**Programme v1:** a new club can self-checkout → land on its subdomain → add teams → a coach imports a squad and runs a season → families/players get today's experience → automated tests prove no club or team can read another's data → a signed DPA is in place. Harris runs entirely on the platform with zero data loss.

---

## 10. Consolidated open-decision register

From the brief and all four specs (each logged in `DECISIONS_LOG.md` when resolved):

- Product name; pricing model, tiers, free tier, trial length (Commercial).
- Exact field-level `club_admin` visibility line — ratify and mirror across RLS/UI/DPA (Data/Security).
- Curriculum: keep as shared code or promote to scoped tables (R6); sponsor model (R7).
- Tenant-context mechanism: Postgres GUC vs JWT claims (Data/Architecture).
- Club rollup: live view vs materialised (Architecture/Data).
- Custom domains in v1 or later; payment provider confirmation (assumed Stripe).
- Safeguarding/vetting gate model: verify-then-pay vs restricted pay-then-verify (Commercial/Security).
- Hosting target at scale (Vultr+Caddy vs managed); staging Supabase project; retention/purge windows.
- Seasons as config vs table; lawful basis + parental-consent/age model `[DPO/LEGAL]`.

---

## 11. Critical path (summary)

Remediation R1–R5 are entry conditions → Phase 0 slices 0a→0g must complete with the isolation gate at 100% before **any** external tenant → Phase 1 pilot requires a signed DPA and BLACK sign-off to admit real external children's data → Phase 2 self-checkin is itself a BLACK action. Isolation correctness, not feature breadth, is the gating constraint throughout.
