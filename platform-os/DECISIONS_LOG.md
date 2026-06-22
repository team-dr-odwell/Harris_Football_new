# Decisions Log — Academy OS

Material decisions and their rationale. Newest first. Each cites the inputs that drove it.

---

## D-11 (2026-06-18) — Generic-first: nothing Harris-specific in code; full sprint runway
**Decision.** Refines D-10. Build **tenant-generic from the first commit**; Harris is **data and configuration, never code**. We port feature *logic*, generalised — we do NOT carry tenant-coupling across. Acceptance test for the programme: `grep -ri "harris\|owfc"` in application code returns **0**; Harris lives only in the DB + a seed file. Multi-tenancy/isolation are foundations, not a later phase; every feature sprint ships with isolation tests or it is not done.
**Grounding.** Verified debt: **76 hard-coded Harris/OWFC/domain strings across 13 files** (app.js ×15, data.js ×11, store.js ×4, index.html ×4, config.js ×3) + curriculum as arrays in `js/data.js`. Catalogued in `BUILD_RUNWAY.md §1`.
**Runway.** Full sprint plan in `BUILD_RUNWAY.md`: Epic A (foundation & safety) → B (tenant-generic shell — the white-label proof, before any feature) → C (port & generalise features) → D (Harris onboarding & cutover) → E (commercial & self-serve, BLACK-gated) → F (scale/parity). Sizing indicative (1 sprint ≈ 2 weeks); solo ≈ 6–9+ months to Harris-live (A–D) — stated as a range, not a date.
**Status:** ADOPTED (operator-directed). Supersedes the naive "port the proven feature code" reading of D-10.

## D-10 (2026-06-18) — Build shape: Harris sits INSIDE the platform as tenant #1 (not a layer above)
**Decision.** Build one platform — one repo, one deployment, one Supabase — with logical tenancy (`club_id`/`team_id` + RLS). `harris.football` becomes **club #1 / team #1**, not a separate site wrapped by a control plane. The "OS/platform tier" is a **logical** control plane inside the one system (`platform_admin` role + provisioning/licensing/isolation functions), not a separate app.
**How (given the red-team).** Do **not** retrofit tenancy onto the live, compromised Harris DB. Instead: (1) stand up a **fresh Supabase project** with deny-by-default RLS, clean identity (D-4) and the banding/visibility model (D-9) baked in; (2) **port the proven feature code** into the tenant-aware shell — keep the product, drop the broken auth layer; (3) **migrate Harris's data in as club #1**, verified row-for-row; (4) keep the **current live harris.football running untouched** until the new platform passes the isolation gate, then cut over (Phase 0g).
**Why not "above".** A wrapper above an untouched site = two codebases and double maintenance, and the data layer still has to become multi-tenant regardless — so the wrapper adds cost without benefit. Shared improvements, one isolation model and club-down expansion only accrue on a single shared instance.
**Rationale/links.** Consistent with D-0 (Track B builds the foundation on Harris's own data), the migration sequence in `ARCHITECTURE.md`, and the "treat the project as compromised / rotate to fresh project" finding in `RED_TEAM_SECURITY.md`.
**Status:** ADOPTED (operator-directed).

## D-9 (2026-06-18) — Development content is banded on two axes (age × standard) + per-player differentiation
**Decision.** Banding is **not age alone**. Each team sets (a) an **age band** — developmental appropriateness, FA format, reading level, UI band, safeguarding — and (b) a **standard / playing level** (Foundation → Development → Competitive → Performance) driving challenge/complexity. Content surfaces at the intersection. On top of the team default, **per-player differentiation** applies (skill ladder + IDPs are already per-player) so individuals can be stretched or eased without re-banding the team.
**Content model.** Every library item (drill, challenge, skill-ladder rung, quiz, video) is tagged with: age-suitability range (min–max band), difficulty tier, and **skill prerequisites**. A team sees items where age matches AND difficulty ≤ team level (+1 stretch); coach can preview/override the full library. Prerequisites are the guard against high-complexity drills reaching teams not ready for them.
**Guardrail.** "Standard" is **coach-facing and neutral** ("playing/challenge level") — never shown to a child as "low standard"; no early-elite labelling for young bands (FA ethos; engagement research on shame/demotivation). Editable each season.
**Visibility split (operator-confirmed).** Only **coaches** see `playing_level`, `player_level` and **assessments** (ratings, notes, raw skill levels). **Children/families** see only **progress and achievement** (dev %, evolving card tier, badges, mastered-skill achievements, AP) — served via a derived view (`v_player_progress`) so a raw assessment can never leak through the family API. Club admins get aggregate summary only, not per-child level labels or assessments. Encoded in `DATA_MODEL.md §11.4` (RLS: `assessments` + level columns → coach/platform only).
**Rationale.** A complex high-skill drill is inappropriate for a foundation-level team at the same age, and ability varies within a squad. Reinforces D-3 (curriculum as scoped data, tagged once centrally) and the age-banding in `ENGAGEMENT_AND_UX_STRATEGY.md`.
**Status:** ADOPTED (operator-directed).

## D-0 (2026-06-18) — Programme sequencing: concurrent tracks, gated on external data
**Decision.** Reject both "build the full OS first" and "pure stop-and-validate". Adopt three concurrent tracks with a hard gate:

- **Round 0 — Security remediation (immediate, days).** Fix the live holes regardless of the platform decision: self-grant `is_admin` (RED_TEAM_SECURITY F1), sponsor data clamp into RLS (F2), retire/replace `using(true)` on sensitive tables, rotate the exposed anon key onto a **fresh Supabase project**, lock the public `media` bucket (F4). These protect the *current* live site.
- **Track A — Willingness-to-pay validation (parallel, weeks, cheap).** Name a price; secure ≥3 **external** clubs committing real money to an assisted pilot of the development product that already exists. This is the go/no-go for major investment.
- **Track B — Phase 0 re-tenanting on Harris's OWN data only (parallel, low external liability).** Build the multi-tenant foundation + the curriculum-cascade moat behind the non-waivable isolation gate, using only OWFC Harris data (OWFC is already the controller — no new external liability).

**Hard gate (BLACK).** No external club's children's data is admitted (Phase 1) until ALL of: Track A shows willingness-to-pay; the liability stack is in place (DPA, insurance, legal entity, DPO sign-off, a second responsible person); and the isolation gate is 100%.

**Rationale.** The debate (`DEBATE_BUILD_NOW.md`, `DEBATE_VALIDATE_FIRST.md`) converged: liability attaches at data-admission, not build-commitment, so the validate-first safety case and the build-now "time-boxed white space + perishable 104-team reference asset + the platform *is* the moat" case are both satisfiable by running concurrently and gating the data, not the build. The cheap demand test still runs first/early; the moat still gets built; no external child data is exposed before proof and protection exist.
**Status:** ADOPTED, pending operator ratification.

## D-1 — Fix the live `is_admin` self-grant now (BLACK)
**Decision.** Treat RED_TEAM_SECURITY F1 as a present production vulnerability on harris.football and fix it first; rotate the committed anon key onto a fresh Supabase project. **Rationale.** Any authenticated user can self-promote to admin today; the key is in a public repo. **Status:** awaiting operator go-ahead (deploy = BLACK).

## D-2 — Tenant boundary is membership-derived, never client-supplied
**Decision.** RLS predicates derive the tenant from the authenticated user's `memberships` (via `auth.uid()`), NOT from a client-settable GUC or the Host/path. Host/path drive UX/routing only — never the security boundary. **Rationale.** RED_TEAM_SECURITY F5 (client-settable `request.club_id` as sole predicate) is a HIGH cross-tenant path. **Status:** ADOPTED — supersedes the GUC option in DATA_MODEL §9.3.

## D-3 — Promote curriculum to scoped tables (platform/club/team)
**Decision.** Move the curriculum (position targets, challenges, quiz bank, skill ladder) from static `js/data.js` into DB tables with a `scope` enum. **Rationale.** The "club-branded curriculum cascade" is the identified moat (`COMPETITOR_ANALYSIS §3.4`); a moat cannot be hard-coded. Resolves R6. **Status:** ADOPTED.

## D-4 — Identity must be namespaced per club
**Decision.** Redesign login so identity is unique per club (invite-code-based or club-namespaced email), replacing the global name→slug→`@harris.football` scheme. **Rationale.** RED_TEAM_SECURITY F8 — names collide/merge across clubs in one global Auth namespace; also fixes the live `harris.football` vs `harris.team` domain mismatch. **Status:** ADOPTED — Architecture rework item.

## D-5 — Club rollup via live SECURITY INVOKER views (v1)
**Decision.** Implement the club-admin rollup as live views exposing only safe columns; materialise only if performance demands at scale. **Rationale.** Simpler and correct first; avoids premature optimisation. **Status:** ADOPTED, revisit at scale.

## D-6 — Safeguarding: verify-before-child-data
**Decision.** A club is vetted (safeguarding gate) before it may hold any child data; during pilot, verify-then-pay; at scale, pay-then-restricted-until-verified. **Rationale.** Children's data; processor duty. **Status:** ADOPTED.

## D-7 — Pricing direction: free commodity tier + paid per-club development tier (numbers TBD)
**Decision.** Lead commercially with a free tier that neutralises Spond on commodity admin, and a paid per-club development tier banded by size; defer payment-fee monetisation. Coexist with Spond — do not fight the free admin war. Actual price points TBD pending Track A. **Rationale.** `COMPETITOR_PRICING_GTM` (free-to-club centre of gravity; willingness-to-pay lives in development). **Status:** DIRECTION ADOPTED, prices TBD.

## D-8 — Mandatory staging + migration-as-code
**Decision.** Provision a staging Supabase project; all schema/RLS changes ship as version-controlled migrations with a prod `pg_policies` attestation; no paste-to-prod. **Rationale.** RED_TEAM_SECURITY (paste-to-prod culture + commingled backups). **Status:** ADOPTED.

---

### Still open (need operator input)
- Final price points, tier boundaries, trial length (after Track A).
- Legal entity + insurance route for the processor role.
- Whether to license/partner rather than solo-operate (raised as a possible liability ceiling).
- Move-off-Vultr trigger; per-tenant backup/erasure approach.
