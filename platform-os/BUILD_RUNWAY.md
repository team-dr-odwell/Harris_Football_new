# Build Runway — Academy OS (sprint plan)

*18 June 2026. Objective, gated, no hand-waving. Governs HOW the multi-tenant white-label platform is built so that nothing Harris-specific is baked into code and later torn out.*

---

## 0. Governing principle (this is the whole point)

**Build tenant-generic from the first commit. Harris is data and configuration — never code.**

The original specification is white-label: many clubs, each with many teams. Therefore:

- No feature is built "for Harris". Every feature is built for *a tenant*, and Harris is one row.
- Anything Harris-specific (name, crest, colours, domain, content, seasons) is **configuration or data**, resolved at runtime from the tenant context.
- **Acceptance test for the whole programme:** `grep -ri "harris\|owfc" js/ index.html css/` returns **0** in application code. Harris exists only in the database and in a seed file.
- Multi-tenancy and isolation are foundations, not a later "Phase". Every feature sprint ships with isolation tests or it is not done.

This corrects D-10's "port the proven feature code": we port **logic**, generalised — we do **not** carry tenant-coupling across.

## 1. The Harris-native debt register (what must be generalised — grounded in the code)

| # | Coupling today (evidence) | Generic target |
|---|---|---|
| 1 | 76 hard-coded `Harris`/`OWFC`/`harris.football` strings across 13 files (app.js ×15, data.js ×11, store.js ×4, index.html ×4, config.js ×3) | All from tenant config (`clubs`/`teams` row) or i18n strings |
| 2 | Single-tenant schema — no `club_id`/`team_id` on any table (`schema.sql`) | `club_id`/`team_id` on every row; deny-by-default RLS |
| 3 | Identity `name → slug → @harris.football` (`store.js nameToEmail`) | Tenant-namespaced identity + invite codes (D-4) |
| 4 | Branding (crest/colours) in `css/styles.css` `:root` | `clubs.brand` → CSS tokens at boot |
| 5 | Curriculum as code — `quizBank`, `exercises`, position targets, skill ladder in `js/data.js` | Scope-aware content tables (D-3) with banding tags (D-9) |
| 6 | `SEASONS` in `js/config.js` | Per-tenant config/table |
| 7 | One Supabase project; key committed to a public repo (`config.js`) | Fresh project; secrets out of repo; staging≠prod |
| 8 | Routing is hash-only (single team assumed) | host→club, path→team, hash→view |
| 9 | `using(true)` RLS + global `is_admin()` | Membership-derived, deny-by-default (D-2) |

## 2. How to read this runway

- Work is grouped into **Epics** (A–F); each Epic is delivered as **sprints**; each sprint has a goal, key tasks, and a hard **"Done when"** exit gate.
- **Sizing is indicative**, not a promise: S ≈ a few days, M ≈ ~1 sprint, L ≈ ~1.5–2 sprints, where **1 sprint ≈ 2 weeks**. Totals depend entirely on capacity — *solo, this is a multi-month programme (realistically 6–9+ months to Harris-live, Epic A–D); with a small team, materially less.* Stated as a range, not a fake date.
- Gates map to `DEVELOPMENT_PLAN.md`; the **isolation test gate** recurs on every feature sprint; **BLACK** items need explicit sign-off.

---

## EPIC A — Foundation & safety  *(no tenant-specific code is even possible yet)*

| Sprint | Goal | Key tasks | Done when (exit gate) | Size |
|---|---|---|---|---|
| **A1 — Clean ground** | A safe place to build | Fresh Supabase (prod + **staging**); rotate/remove committed keys; migrations-as-code; CI runs tests; fix live `is_admin` self-grant (F1) on the *old* site (Round 0, BLACK) | Secrets out of repo; staging ≠ prod; every schema change is a versioned migration; old site F1 patched | M |
| **A2 — Tenancy core** | The spine | `clubs`, `teams`, `memberships`, `licences`; deny-by-default RLS; membership-derived tenant context (D-2); stand up the **isolation test harness** in CI | Two empty tenants are provably isolated by automated test; harness blocks merge on failure | M |
| **A3 — Identity & roles** | Generic auth | Tenant-namespaced identity + invite codes (D-4); roles per membership; retire global `is_admin` | One user can belong to two tenants with different roles; no global superuser; self-grant impossible | M |

**Epic A gate:** Architecture + data-layer GREEN; isolation harness live. Nothing proceeds without this.

## EPIC B — Tenant-generic shell  *(prove white-label BEFORE any feature)*

| Sprint | Goal | Key tasks | Done when | Size |
|---|---|---|---|---|
| **B1 — Tenant resolver** | The app knows who it is | host→club, path→team, hash→view; boot loads tenant context; Caddy on-demand TLS + ask-endpoint | Two seeded clubs render isolated at their own subdomains | M |
| **B2 — Branding-as-config + de-Harris** | Kill the hard-coding | `clubs.brand` → CSS tokens; remove all 76 hard-coded strings → config/i18n (debt #1, #4) | A second club renders its own name/crest/colours with **zero code change**; `grep harris` in app code = 0 | L |
| **B3 — Content-as-data + banding/visibility** | Curriculum becomes data | Scope-aware content tables (D-3); banding tags age/difficulty/prerequisites (D-9); coach-vs-child visibility + `assessments` table (D-9 §11.4); migrate `js/data.js` → platform seed | Content surfaces by age × level; assessments coach-only; `data.js` content arrays gone | L |

**Epic B gate:** a brand-new empty club can be stood up and themed with no code change. This is the white-label proof.

## EPIC C — Port & generalise the feature set  *(each feature multi-tenant; isolation tests per sprint)*

| Sprint | Goal | Done when | Size |
|---|---|---|---|
| **C1** | Squad / roster + evolving player cards (tier derived) | Works for ≥2 tenants; isolation green | L |
| **C2** | Schedule (fixtures / training / events) + availability / one-tap register + computed standings & stats | ≥2 tenants; isolation green | L |
| **C3** | Academy engine — points, quizzes, challenges, skill ladder, video library + reflections (banded, healthy mechanics) | ≥2 tenants; banding + visibility correct; isolation green | L |
| **C4** | Family hub — homework gate, chores, multi-child + development plans + assessments (coach) + child progress view | ≥2 tenants; coach/child visibility split holds; isolation green | L |
| **C5** | Club rollup (aggregate-only) + sponsor (generalised/config) | Club admin sees summary only, never assessments/level; isolation green | M |

**Epic C gate (per sprint):** feature works for two tenants, isolation suite green, **zero Harris special-casing**. A sprint that special-cases a tenant is not done.

## EPIC D — Harris onboarding & cutover  *(Harris is the first customer — the proof, not the foundation)*

| Sprint | Goal | Done when | Size |
|---|---|---|---|
| **D1 — Migrate** | Harris data → club #1 on staging | Row-for-row parity verified vs live | M |
| **D2 — UAT** | Real Harris users test on staging | Sign-off from real coach/parents; gaps closed | M |
| **D3 — Cutover** | `harris.football` → the platform; decommission old project | Harris live on platform, zero data loss, isolation gate 100% | M |

**Epic D gate:** Harris runs entirely on the platform as an ordinary tenant. If anything needed a code change *for Harris* to migrate, that's debt — fix generically before cutover.

## EPIC E — Commercial & self-serve  *(gated by D-0: demand + liability before ANY external child data)*

| Sprint | Goal | Done when | Size |
|---|---|---|---|
| **E1 — Licensing** | Stripe hosted checkout + webhook → provisioning (test mode) | A test club self-provisions from a paid checkout | L |
| **E2 — Self-serve onboarding** | Club signup, slug, coach squad CSV import, family invite codes | A new club onboards with no operator involvement | L |
| **E3 — Adult automation / AI-assist** | Session-plan generation, auto-chase RSVPs/subs, comms drafts (human-in-loop) | Coach time-to-task drops measurably; AI outputs always coach-approved | L |
| **E4 — External pilot (2–3 clubs)** | First real external tenants | **BLACK gate:** signed DPA + insurance + legal entity + isolation 100% **before** any external child data | M |

## EPIC F — Scale & parity *(later)*
Native/PWA app, payments parity, in-app comms, performance hardening, white-label custom domains. Sized when reached.

---

## 3. Critical path & parallelism

- **Hard sequence:** A → B → C → D. No external tenant before D + the Epic-E BLACK gate.
- **Can run in parallel:** the Track-A demand test (D-0) runs alongside Epics A–C; E1 (Stripe plumbing) can be built during Epic C; the live-site F1 fix (A1) happens immediately, independent of everything.
- **Recurring gate:** the isolation suite runs on every C/D/E sprint; a red isolation result halts the sprint.
- **The anti-debt check** (`grep harris` = 0; new tables carry `team_id` + RLS + isolation tests) is a definition-of-done line item on **every** sprint, not a cleanup at the end.

## 4. Honest risks to this runway

- **Solo capacity.** Epics A–D are a multi-month effort for one person; the realistic options are accept the timeline, bring in help, or narrow Epic C's v1 feature set. Don't pretend otherwise.
- **Generic-first costs more upfront** than porting Harris-as-is — that's the point; it's paying down debt before it compounds, exactly per your instruction.
- **Epic C is the bulk of the work** (5 L-sized sprints). If timeline pressure hits, cut *scope of C* (ship fewer features generically) — never cut isolation tests or re-introduce Harris coupling to go faster.
