# Project Brief — Academy OS (working name)

*Multi-tenant youth-football academy platform · v1 brief · last updated 18 June 2026*

---

## 1. One-liner

A white-label, multi-tenant academy platform for grassroots football. **We are the OS**: we licence clubs; a club sub-licences its teams; each team's coaches and families get the full experience already proven with OWFC Harris. One codebase, one database, served per-club on its own subdomain.

## 2. Why we're doing this

The single-team product (harris.football) is built and working — points engine, evolving player cards, the academy curriculum (quizzes, challenges, video library, skill ladder, position targets), fixtures and training, the family hub, and GDPR-restricted sponsor pages. The same need exists for every other team and club: one club we know of fields **104 teams across age groups**, and there are thousands of grassroots clubs. The opportunity is to turn a proven team tool into a platform the wider game pays to use, without rebuilding the product for each customer.

## 3. The three-tier model

| Tier | Who | Sees | Can do |
|---|---|---|---|
| **Platform (OS)** | Us | Everything, all clubs | Issue/revoke club licences; manage the central library; platform admin & audit |
| **Club** | Club admin team | All of *their own* teams, top-level only (squad, progress, training schedule, development summary) | Sub-licence teams; invite coaches; oversee; *cannot* see other clubs or granular child data |
| **Team** | Coach + family/players | Their team only | Full coach admin (players, fixtures, sponsors, videos — own or drawn from central library, tagged); families/players keep today's view & access |

Hierarchy: `platform → club → team → squad → families`. The **subdomain identifies the club** (`club2.harris.football`); the **path identifies the team** (`club2.harris.football/team2`).

## 4. Scope — v1

**In scope:** multi-tenant data model (club + team on every row); role tiers and RLS isolation; subdomain routing with automatic TLS; per-club branding; central vs club vs team content scoping; club top-level rollup dashboard; self-serve licence checkout and club/team provisioning; migration of OWFC Harris onto the platform as club #1.

**Out of scope for v1 (later):** custom domains / full white-label (`academy.club2.com`); native mobile apps; cross-club features (inter-club leaderboards, leagues); payments *between* parents and clubs (subs collection); multi-language.

## 5. Architecture summary

Single application, single Supabase project — the subdomains are **routing, not separate infrastructure**. Full detail belongs in `ARCHITECTURE.md` and `DATA_MODEL.md`; the shape:

- **Tenancy.** New tables `clubs` (slug, name, brand, licence) and `teams` (belongs to a club). Every content row carries `team_id`; team → club gives the club rollup. Membership is many-to-many (`memberships`: user ↔ club/team + role) so a parent with children in two teams, or a coach across two, works cleanly.
- **Isolation (the spine).** Row-Level Security keys every query off membership and tier. Must hold **cross-club and cross-team**, on minors' data. Defence in depth: RLS + app-layer checks + automated isolation tests on every table.
- **Routing.** Wildcard DNS `*.harris.football` + Caddy on-demand TLS (auto-issues a cert per club subdomain). App reads the hostname → resolves the club; the path resolves the team. A new club is one row — the wildcard already covers it.
- **Content scoping.** Library items have a `scope`: `platform` (central, drawable by all), `club` (club-shared), or `team` (private). Author the curriculum once centrally; every club benefits.
- **Licensing.** A `licences` table (plan, team/seat limit, status, expiry). Self-serve checkout via Stripe-hosted Checkout; a webhook activates the licence and provisions the subdomain. Card data is never handled by us or stored in our systems.

## 6. Roles & permissions (summary)

`platform_admin` (all clubs) · `club_admin` (read across own teams, top-level only — excludes parent contact details and individual reflections) · `coach`/`team_admin` (full read/write, own team) · `family` & `player` (today's scoped view) · `sponsor` (today's GDPR-restricted view). The exact field-level split for "club top-level" is an open decision (§11).

## 7. Commercial model

We licence **per club** (self-checkin via Stripe); the club sub-licences teams within its seat/team limit. Pricing, plan tiers, and free-tier policy are **TBD** — to be set before opening public checkout. Legally this makes **each club a data controller and us a data processor**, which requires a Data Processing Agreement per club, a privacy policy, a breach process, and audit logging — written into the licence terms. This is the gating commercial/legal piece and warrants its own checklist doc.

## 8. Key risks

1. **Cross-tenant data leakage — highest.** Now doubled (cross-club *and* cross-team) and on children's data; a single missing filter is an ICO-reportable breach across organisations. Mitigation: layered isolation + mandatory automated tests as a release gate.
2. **Controller/processor obligations.** DPAs, privacy policy, breach process, audit trail — non-optional once external clubs hold real data.
3. **TLS / DNS at scale.** On-demand certificate issuance has rate limits; needs monitoring and a fallback.
4. **Support & onboarding at scale.** 100+ volunteer coaches of varying tech skill — onboarding must be near-zero-effort and self-serve, or support load becomes the bottleneck.
5. **Billing edge cases.** Failed payments, downgrades, licence expiry vs live data — define dunning and read-only/grace states.
6. **Reliability step-change.** This becomes infrastructure other clubs depend on: backups, monitoring, and an owner become mandatory.

## 9. Migration & rollout (thin slices)

- **Phase 0 — Re-tenant.** Add `club_id`/`team_id` everywhere, RLS tiers, subdomain resolver, per-club branding. Migrate OWFC Harris to **club #1 / team #1**; prove it on data we already trust.
- **Phase 1 — Pilot.** 2–3 external clubs across age groups; stress-test provisioning, coach autonomy, and isolation.
- **Phase 2 — Self-checkin.** Open Stripe checkout + automated provisioning to a controlled waitlist.
- **Phase 3 — Scale.** Onboard in waves with docs and support tooling.
- **Phase 4 — Platform features.** Club rollup analytics, white-label/custom domains, cross-club options.

## 10. Definition of done — v1

A new club can self-checkout, land on its own subdomain, add teams, and have a coach import a squad and run a full season — with families and players getting today's experience — while automated tests prove no club or team can ever read another's data, and a signed DPA is in place. OWFC Harris runs entirely on the platform with zero data loss.

## 11. Open decisions

- Product / brand name for the OS (currently working name only).
- Pricing model, plan tiers, free tier.
- Exact field-level definition of "club top-level" visibility (what a club admin can and cannot see of a child).
- Whether custom domains / full white-label are v1 or later.
- Hosting target at scale (current single Vultr + Caddy vs managed) and backup/monitoring plan.
- Payment provider confirmation (assumed Stripe).

## 12. Assumptions

- Built on the existing stack (vanilla SPA + Supabase + Caddy), extended not replaced.
- We act as data processor; clubs as controllers.
- Subdomains are cosmetic routing over one shared instance — no per-club infrastructure.
- Payments handled entirely by a hosted provider; we never touch card data.
- OWFC Harris is the reference tenant and first migration target.

---

*Companion docs to follow: `ARCHITECTURE.md` (system design + subdomain/TLS), `DATA_MODEL.md` (tables + RLS policy matrix), `LICENCE_DPA_CHECKLIST.md` (commercial/legal gate).*
