# Commercial Readiness — Academy OS

*Licensing, commercial & go-to-market spec · evidence for the Commercial Readiness gate · last updated 18 June 2026*

---

## 0. Purpose & scope

This document specifies how Academy OS is **licensed, sold, provisioned, billed, and supported** as a multi-tenant platform. It is the evidence pack for the **Commercial Readiness gate**: it must show we can take money, provision a tenant, run the licence lifecycle, and support clubs at scale — safely and lawfully — before public checkout opens.

It is a companion to:

- `PROJECT_BRIEF.md` — product, three-tier model, rollout phasing (the source of truth this doc aligns to).
- `DATA_MODEL.md` — `clubs`, `teams`, `licences`, `memberships` table definitions and RLS. *(Sibling deliverable; field shapes below are proposed to align with the brief and must be reconciled against the final `DATA_MODEL.md`.)*
- `ARCHITECTURE.md` — subdomain routing, wildcard DNS, Caddy on-demand TLS, Supabase project.
- `LICENCE_DPA_CHECKLIST.md` — controller/processor split, DPA, privacy policy, breach process.
- `SECURITY.md` — RLS isolation, audit logging, and **data retention** (the source of truth for purge windows referenced in §4).

### Hard constraints (non-negotiable)

- **We never handle card or bank data.** All payment capture happens on the provider's **hosted** pages (assumed **Stripe Checkout** — the club enters its own card on Stripe's domain). We integrate via API + signed webhooks only. No PAN, CVV, or bank details ever touch our SPA, our server, or Supabase. This keeps us out of PCI-DSS scope beyond SAQ-A.
- **Children's data raises the bar.** A club holds minors' data. Provisioning a tenant that can store that data may require a **human safeguarding gate** before the tenant goes live (see §2.6).
- **British English, £ and UK VAT framing throughout.**
- **No invented numbers.** Every price, conversion rate, target, and market size is marked **TBD**. Levers and frameworks are defined; figures are not.

---

## 1. Licence model

### 1.1 What a licence grants

A **licence** is the commercial contract between **us (the Platform/OS)** and **one club**. Issuing a licence is what turns a paying sign-up into a live tenant. A licence grants, for its term:

1. **One club subdomain** — a routing slug at `<slug>.harris.football`, covered by existing wildcard DNS + on-demand TLS (no per-club infrastructure; see `ARCHITECTURE.md`).
2. **A team allowance (`max_teams`)** — the number of teams the club may create and run concurrently. The club **sub-licenses** these to its own teams (see §1.3).
3. **A seat allowance (`max_player_seats`)** — the number of **active player seats** across all the club's teams. A seat is consumed by an **active player** (a player record with at least one linked family/player login in an active season). Coaches and family/parent logins are **not** counted as billable seats in the default framework (lever choice — see §3). Counting active players, not parents, avoids penalising larger families and keeps the meter aligned to the unit of value (a child in the academy).
4. **A plan** — the tier (Free / Club / Multi-club — see §3) that sets the allowances and the price.
5. **Per-club branding and the full team-tier product** for every team it stands up (points engine, evolving cards, curriculum, fixtures, family hub, sponsor pages) — drawn from the central library plus the club's own content.

A licence does **not** grant: visibility into other clubs; access to granular child data at club-admin level (top-level rollup only — `PROJECT_BRIEF.md §6`); custom domains/full white-label (out of v1 scope); or payments between parents and clubs (out of v1 scope).

### 1.2 The `licences` table

Proposed fields, aligned to `PROJECT_BRIEF.md §5` (plan, team/seat limit, status, expiry) and to be reconciled with `DATA_MODEL.md`. One row per club; `club_id` is the link.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Licence identifier. |
| `club_id` | uuid (FK → `clubs.id`) | The club this licence belongs to. One active licence per club. |
| `plan` | text / enum | `free` \| `club` \| `multi_club` (see §3). Drives default allowances. |
| `status` | text / enum | `trial` \| `active` \| `past_due` \| `grace` \| `expired` \| `cancelled` (see §4). |
| `max_teams` | int | Team allowance. Enforced on team creation. |
| `max_player_seats` | int | Active-player-seat allowance. Enforced on activation/import. |
| `seats_used` | int (derived/cached) | Current count of active player seats; recomputed on activation/deactivation. Authoritative count is a query; this is a cache for fast gating + display. |
| `billing_cycle` | text / enum | `monthly` \| `annual` \| `season` (season = per-season term; see §3 levers). |
| `trial_ends_at` | timestamptz (nullable) | End of trial; null if no trial. |
| `current_period_start` | timestamptz | Start of the paid period (mirrors provider). |
| `current_period_end` | timestamptz | End of paid period / **expiry**. Drives lifecycle transitions. |
| `grace_ends_at` | timestamptz (nullable) | End of read-only grace after `past_due` (see §4). |
| `cancel_at_period_end` | bool | Club has cancelled but retains access until `current_period_end`. |
| `cancelled_at` | timestamptz (nullable) | When cancellation took effect. |
| `provider` | text | `stripe` (only hosted providers permitted). |
| `provider_customer_id` | text | Stripe Customer id. **No card data — an opaque reference only.** |
| `provider_subscription_id` | text (nullable) | Stripe Subscription id (null for season/one-off). |
| `provider_price_id` | text | The Stripe Price the club is on (prices live in Stripe, not here). |
| `currency` | text | `GBP` (v1). |
| `country` | text | Billing country, for VAT determination (see §9). |
| `vat_number` | text (nullable) | Club VAT number if provided (reverse-charge / B2B). |
| `safeguarding_status` | text / enum | `pending` \| `approved` \| `rejected` — the human vetting gate (see §2.6). Tenant cannot hold child data until `approved`. |
| `created_at` / `updated_at` | timestamptz | Audit. |

**Notes**

- **Prices live in Stripe, not in this table.** We store the `provider_price_id` reference only. This lets us run pricing experiments (§8) without code/schema changes and keeps a single source of truth for money.
- **Allowances (`max_teams`, `max_player_seats`) are stored on the licence**, not hard-coded to the plan, so we can grant bespoke limits (pilot clubs, the 104-team club, enterprise) without inventing a new plan enum each time.
- **`seats_used` is enforcement-critical.** Team creation checks `max_teams`; player activation/CSV import checks `max_player_seats`. Over-limit attempts are blocked with an upgrade prompt, never silently allowed (free-rider control — §9).

### 1.3 Club → team sub-licensing

The licence is between us and the club. The club then **sub-licenses** within its allowance:

- A `club_admin` creates teams up to `max_teams`; each team is a `teams` row under the `club_id`.
- The club invites a `coach`/`team_admin` per team (via `memberships`).
- Player seats are drawn from the club's shared `max_player_seats` pool, across all its teams — so a club can rebalance squads between teams without buying per-team blocks.
- The club is the **data controller** for its teams' data; we are the **processor** (`PROJECT_BRIEF.md §7`, `LICENCE_DPA_CHECKLIST.md`). There is no separate commercial contract with individual teams — the club owns that relationship. This keeps us with **one billing relationship per club**, which is essential for support load (§6) and for keeping the controller/processor line clean.

---

## 2. Self-checkin flow (end to end)

"Self-checkin" = a club self-serves from interest to a live, branded subdomain with no manual infrastructure work from us. The only optional human step is the **safeguarding gate** (§2.6).

### 2.1 Sequence

```
Prospective club
   │  1. Request / sign up (club name, admin email, plan choice)
   ▼
Academy OS sign-up page
   │  2. Create lead + pending club record (status: pending), reserve slug
   │  3. Redirect to Stripe Checkout (HOSTED — club enters card on Stripe)
   ▼
Stripe Checkout (hosted, Stripe's domain)
   │  4. Club pays / starts trial. Card data stays with Stripe.
   ▼
Stripe → webhook (checkout.session.completed / customer.subscription.created)
   │  5. We receive signed webhook
   ▼
Provisioning worker (idempotent — see §5)
   │  6. Verify signature → look up pending club by client_reference_id
   │  7. [GATE] If safeguarding required and not approved → status: pending_review, hold
   │  8. Create `clubs` row, finalise slug, create `licences` row (status: trial|active)
   │  9. Create first `club_admin` membership for the admin email
   │ 10. Send branded invite / set-password email to club admin
   ▼
Club admin lands on <slug>.harris.football
   │ 11. Sets password, sees empty club dashboard
   │ 12. Adds teams (up to max_teams) → invites a coach per team
   ▼
Coach (per team)
   │ 13. Accepts invite → imports squad via CSV (§6.1)
   │ 14. Each imported player generates a family/player invite code
   ▼
Families / players
   │ 15. Self-register via invite code → land on today's scoped experience
```

### 2.2 Step detail — sign-up (steps 1–3)

- Minimal form: club name, admin full name, admin email, plan choice, billing country (for VAT). No card fields — we cannot collect them.
- On submit we create a **lead** and a **pending `clubs` record** (`status: pending`), and **reserve a slug** (see §5.2) so it is not lost while the club is at Stripe.
- We create/attach a Stripe **Customer** and open a **Checkout Session** with `client_reference_id = pending club id` so the webhook can correlate the payment back to the right pending club.

### 2.3 Step detail — hosted checkout (step 4)

- The club is redirected to **Stripe Checkout** (or the Customer Portal for changes). They enter card details **on Stripe's hosted page**. We never see them.
- Trials, if offered, are configured on the Stripe Price/Subscription, not in our code, so trial length is a pricing lever (§3, §8).

### 2.4 Step detail — webhook → provision (steps 5–10)

- We expose **one webhook endpoint**. Every event is **signature-verified** against the Stripe signing secret; unverified events are rejected and logged.
- The provisioning worker is **idempotent** (§5.1): replays and duplicate events produce no duplicate clubs/licences.
- On success it creates the `clubs` row (promoting the pending record), writes the `licences` row, creates the first `club_admin` membership, and triggers the invite email.

### 2.5 Step detail — club builds out (steps 11–15)

- Adding teams and inviting coaches is fully self-serve, gated by `max_teams` / `max_player_seats`.
- Coach squad import (§6.1) and family invite codes (§6.2) are the high-volume onboarding paths and are designed to need **zero support** in the happy path.

### 2.6 Human approval gates (safeguarding / vetting)

Because a live tenant can store **children's data**, we may require a **human safeguarding gate before the tenant goes live**, even though payment is automated. This is a deliberate brake on full automation for child-safety and reputational reasons.

- **What it gates:** the transition from paid → able to hold real child data. `safeguarding_status` on the licence must be `approved` before teams can be created / players imported.
- **Two design options (OPEN DECISION — §10):**
  - **(A) Pay-then-verify:** club pays, provisioning creates the tenant in a **restricted state** (`status: trial`, `safeguarding_status: pending`) where the admin can configure branding but **cannot add players** until approved. Lower friction; money taken first (refund risk if rejected).
  - **(B) Verify-then-pay:** vetting happens on the waitlist before checkout opens to that club. Higher friction; no refund exposure. Better fit for the **closed pilot / waitlist** phases (§8).
- **What "vetting" checks (TBD with safeguarding/legal):** club is a real grassroots entity (e.g. affiliated to a County FA / league), a named **safeguarding/welfare officer** exists, and the DPA is accepted. The exact checklist belongs in `LICENCE_DPA_CHECKLIST.md`.
- **Recommendation:** during pilot/waitlist use **(B)**; at open self-checkin, **(A) restricted-state** keeps friction low while still preventing child data from landing in an unvetted tenant. Final call is an open decision.

---

## 3. Plans & pricing scaffolding

> **All prices, allowances, trial lengths, and ratios below are `TBD`.** This section defines the **tier framework** and the **pricing levers** only. No figures are invented; the cells marked TBD must be set (and tested — §8) before public checkout opens.

### 3.1 Tier framework

| Tier | Intended buyer | `max_teams` | `max_player_seats` | Billing | Price |
|---|---|---|---|---|---|
| **Free / Single-team** | A single team trying the product; the on-ramp / acquisition tier | 1 (TBD) | small cap (TBD) | none | £0 (loss-leader; abuse-controlled — §9) |
| **Club** | A standard grassroots club running several teams | TBD | TBD | monthly / annual / season | TBD |
| **Multi-club** | Large clubs / multi-age-group setups (e.g. the 104-team club), or club groups | TBD (high / custom) | TBD (high / custom) | annual / season / bespoke | TBD (likely quote-based) |

- Allowances are stored **per licence** (§1.2), so a tier is a default bundle, not a hard ceiling — bespoke deals don't need new code.
- The **Free tier is an acquisition and migration lever**, not the product. It must be abuse-resistant (one free team per verified entity; see §9).

### 3.2 Pricing levers (the dials we can turn)

These are the variables that compose a price. We define them; we do **not** set them here.

| Lever | What it meters | Notes / trade-offs |
|---|---|---|
| **Per team** | Charge per team created (within/over a base) | Simple; predictable for clubs; but a small busy team and a large one cost the same. |
| **Per active player seat** | Charge per active player in a season | Aligns price to value (children served); fair across club sizes; needs a clear "active" definition and good seat accounting (§1.1). |
| **Per season** | Charge per season term rather than per calendar month | Matches grassroots cash flow (subs collected seasonally); reduces churn-by-forgetting; but ties revenue to the football calendar. |
| **Base + included allowance** | Flat base bundles N teams / M seats, overage charged | Smooths the curve; protects small clubs; overage funds growth. |
| **Annual vs monthly discount** | Discount for annual/season prepay | Improves retention and cash; standard SaaS lever. |
| **Trial length / type** | Free trial days, or free season | Activation lever; set on Stripe, not in code (§2.3). |
| **Free-tier caps** | Teams/seats on the free tier | Acquisition vs free-rider trade-off (§9). |

**Default recommended composition (to validate, not to ship as gospel):** a **per-club base that includes a team and seat allowance, with per-active-seat overage, offered on monthly / annual / per-season cycles.** This keeps small clubs cheap, scales fairly to large clubs, and fits the seasonal cash flow of grassroots football. Numbers: **TBD** (§8).

---

## 4. Licence lifecycle & billing states

### 4.1 State machine

```
            ┌─────────┐  pay / convert   ┌────────┐
 sign-up →  │  trial  │ ───────────────▶ │ active │ ◀──────────── payment recovered
            └────┬────┘                  └───┬────┘
                 │ trial ends, no pay        │ payment fails
                 ▼                           ▼
            (treated as past_due)       ┌──────────┐  dunning fails / grace ends
                                        │ past_due │ ───────────────────────────┐
                                        └────┬─────┘                            │
                                             │ enters read-only grace           ▼
                                             ▼                            ┌──────────┐
                                        ┌────────┐  grace ends, no pay →  │ expired  │
                                        │ grace  │ ─────────────────────▶ └────┬─────┘
                                        └────────┘                            │ retention window ends
   club cancels ──────────────────────────────────────────────▶ ┌──────────┐ ▼
   (cancel_at_period_end → at period end)                        │cancelled │  purge (per SECURITY.md)
                                                                 └──────────┘
```

### 4.2 States, access, and billing

| State | Trigger | Access for club/team/families | Billing action |
|---|---|---|---|
| **trial** | Sign-up with trial | Full (or restricted if safeguarding pending — §2.6) | None yet; converts at `trial_ends_at`. |
| **active** | Successful payment | Full, within allowances | Recurring charge each cycle via Stripe. |
| **past_due** | Payment fails at renewal | Full, short window, with prominent payment-failed banner | **Dunning** begins (§4.3): retries + reminder emails. |
| **grace (read-only)** | Dunning window elapsed without payment | **Read-only**: can view and **export** data; cannot add teams/players or write new content | Final dunning notices; provider retries continue until `grace_ends_at`. |
| **expired** | `grace_ends_at` passes unpaid | **No app access**; **export still available on request** during the retention window | Subscription ended. Reactivation = pay to return to `active`. |
| **cancelled** | Club cancels (takes effect at `current_period_end`) | Access until period end, then as **expired** | No further charges. |

### 4.3 Dunning (failed-payment recovery)

- Stripe Smart Retries handle card-side retries; we mirror state from webhooks (`invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.updated/deleted`).
- We send our own **branded dunning emails** on a schedule (e.g. day 0 / +X / +Y — intervals **TBD**), each with a **one-click link to the Stripe Customer Portal** to update the card (hosted — we never take the new card).
- If recovered at any point → back to **active**. If not → **grace (read-only)** → **expired**.

### 4.4 Data on downgrade / expiry / cancellation

This is the most sensitive commercial-meets-compliance area: it is **children's data**. The retention windows below are the **policy intent**; the authoritative numbers and purge mechanics live in **`SECURITY.md` (retention)** and the **DPA** (`LICENCE_DPA_CHECKLIST.md`). This doc must not contradict them.

| Event | What happens to data |
|---|---|
| **Downgrade** (e.g. Club → Free, or lower allowance) | No deletion at the moment of downgrade. If the club now **exceeds** the new `max_teams`/`max_player_seats`, excess is **locked read-only** (not deleted) and the club must reduce or re-upgrade. Active records are never silently purged. |
| **Expiry / cancellation** | Tenant goes **read-only**, then **no app access** (per §4.2). An **export window** is offered (length **TBD** — per `SECURITY.md`) during which the club, as controller, can self-serve a **full data export** (squads, progress, content). |
| **After the export window** | Data is **purged** on the schedule defined in `SECURITY.md`. Because the club is the controller of minors' data, purge must be **complete and evidenced** (audit log entry), not soft-hidden. Backups age out per the backup retention policy. |
| **Re-activation before purge** | Paying again before the retention/export window closes restores the tenant to `active` with data intact (we do not purge until the window lapses). |

**Principle:** *read-only → export window → purge.* No surprise deletion; clear, controller-driven export; evidenced purge aligned to `SECURITY.md` and the DPA.

---

## 5. Provisioning automation

Goal: **create a fully working tenant from a webhook with zero manual infrastructure.** The subdomain needs no DNS/cert work — wildcard DNS `*.harris.football` + Caddy on-demand TLS already cover any new slug (`PROJECT_BRIEF.md §5`, `ARCHITECTURE.md`). A new club is, infrastructurally, **one row plus an email**.

### 5.1 The provisioning hook

Triggered by the verified Stripe webhook (`checkout.session.completed` / `customer.subscription.created`). Steps, all in one transaction where possible:

1. **Verify** the webhook signature; reject + log if invalid.
2. **Correlate** via `client_reference_id` → the pending `clubs` record.
3. **Idempotency check** (§5.3): if this event / this Stripe object already provisioned a club, **no-op and return 200**.
4. **Safeguarding gate** (§2.6): if required and not `approved`, provision in **restricted state** rather than blocking the webhook.
5. **Create** the `clubs` row (promote pending → live), finalise the **slug** (§5.2).
6. **Create** the `licences` row: `plan`, allowances, `status`, provider ids, period dates.
7. **Create** the first `club_admin` `memberships` row for the admin email.
8. **Enqueue** the branded invite / set-password email.
9. **Audit-log** the provisioning event (who, what, Stripe ids, time).
10. **Return 200** quickly; heavy work (email send) is queued, not done inline.

### 5.2 Subdomain slug allocation

- Slug derived from the club name, **slugified** (lowercase, hyphens, ASCII), with a **uniqueness check** against `clubs.slug`; on collision, append a discriminator or prompt the admin to choose.
- **Reserved-word blocklist** (e.g. `www`, `app`, `api`, `admin`, `mail`, `platform`, plus profanity) to protect routing and brand.
- Slug is **reserved at sign-up** (step 2) so the club doesn't lose it while at Stripe.
- Slug is effectively immutable post-launch (changing it breaks links/invites); slug changes are a support action, not self-serve (v1).

### 5.3 Idempotency

- Webhooks can be **delivered more than once** and **out of order**. Every handler must be idempotent.
- Persist a **processed-events ledger** keyed on the Stripe `event.id`; if seen, no-op.
- Use the Stripe object id (subscription/customer/`client_reference_id`) as the **natural key** when creating the club, so two events for the same purchase cannot create two clubs.
- Provisioning is **upsert-shaped**: re-running it on an already-provisioned club reconciles state rather than duplicating.

### 5.4 Failure handling

| Failure | Handling |
|---|---|
| **Webhook not received** (Stripe couldn't reach us) | Stripe retries automatically. We also run a **reconciliation job** that periodically pulls active subscriptions from Stripe and provisions any that lack a club (catch-all safety net). |
| **Provisioning throws mid-way** | Wrap in a transaction; on failure roll back and return non-2xx so **Stripe retries**. Idempotency (§5.3) makes the retry safe. |
| **Email send fails** | Email is queued separately; retried with backoff. Provisioning still succeeds; admin can request a resend. |
| **Slug collision at write time** | Re-derive with discriminator; never fail the whole provision over a slug. |
| **Paid but rejected at safeguarding** | Tenant stays restricted; trigger **refund** path (§9) per policy; notify admin. |
| **TLS issuance hits rate limits** (`PROJECT_BRIEF.md §8.3`) | Monitor on-demand cert issuance; alert; fall back per `ARCHITECTURE.md`. Provisioning of the row is independent of cert issuance. |
| **Duplicate purchase / double-click** | Idempotency ledger + natural key prevent duplicate tenants. |

**Net:** provisioning must be **safe to retry, safe to replay, and self-healing** via the reconciliation job — no manual infra step in the happy path.

---

## 6. Onboarding & support at scale

The constraint from `PROJECT_BRIEF.md §8.4`: **100+ volunteer coaches of varying tech skill**. Support load is the bottleneck unless onboarding is near-zero-effort. The strategy is **reduce support load by design first, then staff what remains.**

### 6.1 Coach squad CSV import

- A coach onboards a whole team by uploading a **CSV** (player name, DOB, parent/guardian name, parent email, etc. — exact columns **TBD**, minimised to what's lawful and needed).
- Provide a **downloadable template** and an **in-browser preview + validation** step (flag bad rows, duplicates, over-seat-limit) **before** commit, so errors are self-corrected, not turned into tickets.
- Import respects `max_player_seats`; over-limit import is blocked with a clear upgrade prompt (§1.2, §9).
- Each imported player yields a **family/player invite code** (§6.2).

### 6.2 Family invite codes

- Families **self-register** with a per-player **invite code** (or magic link) generated at import — no manual account creation by the coach.
- Code links the new login to the right player/team via `memberships`; lands them on today's scoped experience.
- Codes are **single-purpose, expiring, and revocable** (safeguarding + security). This pushes the highest-volume onboarding step (parents) entirely onto self-serve.

### 6.3 Self-serve docs & help

- **In-product onboarding**: empty-state guidance ("add your first team", "import a squad"), tooltips, and a guided first-run for club admins and coaches.
- **Help centre / knowledge base**: short task-based articles + screen recordings for the top journeys (add team, import squad, invite families, fix a failed payment, export data). Written for **non-technical volunteers**.
- **Status page** for incidents, to deflect "is it down?" tickets.

### 6.4 Support channels & SLAs

| Channel | For | Target response (SLA) |
|---|---|---|
| Help centre / docs | Self-serve, 24/7 | n/a (deflection) |
| Email / ticket | General club & coach queries | TBD (e.g. next-business-day) |
| In-app contact | Contextual issues (incl. billing) | TBD |
| Priority/critical | Outage, suspected data-isolation issue, safeguarding | TBD — **fastest tier; data-isolation reports are P1** |

- **Safeguarding / data-isolation reports bypass normal triage** and are treated as P1 — consistent with the highest risk in `PROJECT_BRIEF.md §8.1`.
- SLA figures are **TBD** and should scale with the rollout phase (tight, hands-on in pilot; tiered by plan at scale).

### 6.5 Who answers 100+ coaches — reducing load by design

- **Tier 0 — deflection:** docs, in-product guidance, validation-before-commit, status page. The goal is that the common journeys generate **no ticket**.
- **Tier 1 — the club admin absorbs its own teams.** A coach's first port of call is **their own `club_admin`**, not us. The three-tier model means we support **clubs, not every coach** — one billing/support relationship per club (§1.3). This is the single biggest lever: it turns "100+ coaches" into "N club admins".
- **Tier 2 — us:** a small support function (or founder-led in early phases) handling escalations, billing edge cases, and provisioning anomalies, backed by the reconciliation tooling (§5.4) and the admin/audit views (`PROJECT_BRIEF.md §3`).
- **Design rules to keep load down:** every error message proposes the fix; every failure path has a self-serve recovery (re-send invite, retry payment via portal, re-export); over-limit states upsell rather than dead-end; provisioning is self-healing so "I paid but nothing happened" tickets are rare.

---

## 7. KPIs / metrics

Definitions only — **no targets are fabricated**. Targets are set per phase (§8) once we have pilot baselines.

| Metric | Definition | Why it matters |
|---|---|---|
| **Activation rate** | % of provisioned clubs that complete a defined "activated" milestone (e.g. ≥1 team created **and** ≥1 squad imported **and** ≥1 family registered) within N days (N TBD) | The real "did onboarding work" signal, beyond just paying. |
| **Time-to-first-team** | Median time from provisioning → first `teams` row created | Measures onboarding friction at the club-admin step. |
| **Time-to-first-squad** | Median time from first team → first successful CSV import | Measures the coach step. |
| **Seat utilisation** | `seats_used / max_player_seats` per club (and aggregate) | Pricing fit + upsell signal; low utilisation may mean over-bought (churn risk) or under-onboarded. |
| **Team utilisation** | teams created / `max_teams` | As above for the team lever. |
| **Trial → paid conversion** | % of trials that become `active` | Core funnel health (figure TBD). |
| **Gross / net revenue retention** | Revenue retained (and expanded) across renewals | The durable health metric for a subscription business. |
| **Logo churn** | % of clubs cancelling/expiring per period | Early warning; pair with reason codes from cancellation flow. |
| **Dunning recovery rate** | % of `past_due` licences recovered to `active` | Measures involuntary churn we can fix. |
| **Support tickets per club** | Tickets ÷ active clubs, per period | The scalability metric — must trend **down** as docs/self-serve improve. |
| **First-response / resolution time** | Against the §6.4 SLAs | Support quality. |
| **Provisioning success rate** | % of paid sign-ups provisioned without manual intervention | Proves the automation (§5). |
| **Time-to-provision** | Webhook received → tenant live + invite sent | Self-checkin promise. |
| **Refund / chargeback rate** | Refunds & chargebacks ÷ transactions | Commercial-risk signal (§9). |

---

## 8. Go-to-market phasing

Aligned to the rollout in `PROJECT_BRIEF.md §9`. Commercial posture tightens automation and loosens pricing experiments as confidence grows.

| Phase (brief) | Commercial posture | Checkout | Provisioning | Safeguarding gate | Pricing |
|---|---|---|---|---|---|
| **Phase 0 — Re-tenant** | OWFC Harris = club #1; internal only | None | Manual/seeded for club #1 | n/a (known entity) | n/a |
| **Phase 1 — Closed pilot** (2–3 clubs) | Hand-picked, likely free/heavily discounted to learn | Manual or assisted | Provisioning tested but supervised | **Verify-then-pay (B)** — vet each club | Free/nominal; gather willingness-to-pay signals |
| **Phase 2 — Waitlist / self-checkin (controlled)** | Open to a **vetted waitlist**; first real money | **Stripe Checkout live** | **Automated** (§5), monitored | **(B) on waitlist**, moving toward restricted-state **(A)** | First real prices — single starting point, **TBD** |
| **Phase 3 — Open self-checkin / scale** | Public sign-up; onboard in waves | Stripe self-serve | Fully automated + self-healing | **Restricted-state (A)** at scale | **Pricing experiments** (A/B on Stripe prices), packaging tests |
| **Phase 4 — Platform features** | Upsell tiers (rollup analytics, white-label/custom domains) | Self-serve + quote for Multi-club | Automated | (A) | New tiers / add-ons; bespoke for large clubs |

- **Pricing experiments come later (Phase 3+)**, deliberately: we need pilot/waitlist baselines before we can vary prices responsibly. Because prices live in Stripe (§1.2), experiments need no schema/code change.
- The **waitlist** doubles as a **vetting funnel** and a **demand signal** before we commit to numbers.

---

## 9. Commercial risks & mitigations

| Risk | Description | Mitigation |
|---|---|---|
| **Pricing wrong** | Too high → no adoption; too low → unsustainable | Levers defined (§3), prices set from pilot/waitlist willingness-to-pay; prices in Stripe so they're cheap to change; experiment in Phase 3 (§8). |
| **Churn** | Clubs leave, esp. between seasons | Per-season billing option (§3), annual prepay discount, dunning recovery (§4.3), activation focus (§7), cancellation reason codes to learn why. |
| **Support overwhelm** | 100+ coaches swamp us | Support **clubs not coaches** (§6.5 Tier 1), deflection by design, self-healing provisioning, SLAs by plan. The brief's #4 risk. |
| **Refunds & chargebacks** | Disputes, or rejected-at-safeguarding refunds | Clear refund policy (TBD) in licence terms; **prefer verify-then-pay/restricted-state** to limit "paid but can't use it"; Stripe handles disputes; track refund/chargeback rate (§7). |
| **VAT / tax** | UK VAT on B2B SaaS; cross-border edge cases; VAT registration threshold | Capture `country`/`vat_number` (§1.2); use Stripe **Tax** for calculation; charge in **GBP**; show VAT correctly on invoices; **get accountant sign-off before public checkout** (open decision §10). |
| **Free-rider abuse** | Multiple free accounts to dodge paying; bots | Free tier capped (one verified entity = one free team); email/entity verification; safeguarding vetting also screens fake clubs; over-limit blocked not silently allowed (§1.2). |
| **Provisioning failure visible to customer** | "I paid, nothing happened" | Idempotency + reconciliation job + retries (§5); self-serve resend; monitored provisioning success rate (§7). |
| **Data-on-expiry mishandled** | Deleting children's data wrongly, or holding it too long | Strict read-only → export → purge policy (§4.4) aligned to `SECURITY.md` + DPA; evidenced purge. |
| **Controller/processor obligations** | DPA, breach process required once external clubs hold real data | Written into licence terms; tracked in `LICENCE_DPA_CHECKLIST.md` (the gating legal piece). |

---

## 10. Open commercial decisions & assumptions

### 10.1 Open decisions (must be resolved before / at the relevant gate)

1. **Actual prices, allowances, trial length, free-tier caps** — all TBD (§3). *Blocks public checkout.*
2. **Safeguarding gate model** — pay-then-verify (restricted state) vs verify-then-pay, and the exact vetting checklist (§2.6). *Blocks any tenant holding child data.* Owner: safeguarding + legal.
3. **Refund & cancellation policy** — terms, windows, rejected-at-vetting refunds (§9).
4. **Export-window length and purge schedule** — must be set in `SECURITY.md` and the DPA; this doc defers to them (§4.4).
5. **VAT/tax handling** — Stripe Tax config, invoice presentation, VAT-registration timing — accountant sign-off (§9).
6. **Billing cycle default** — monthly vs annual vs per-season as the headline offer (§3.2).
7. **Seat definition edge cases** — what exactly makes a player "active"/billable; mid-season joiners/leavers; off-season seats (§1.1).
8. **Plan names / brand** — Free/Club/Multi-club are working labels; final naming ties to the OS brand (`PROJECT_BRIEF.md §11`).
9. **Self-serve plan changes** — how much up/downgrade is self-serve via the Stripe Customer Portal vs assisted.
10. **Provider confirmation** — Stripe assumed; confirm (`PROJECT_BRIEF.md §11`).
11. **SLA figures by plan/phase** — §6.4.

### 10.2 Assumptions

- **Hosted-only payments via Stripe; we never touch card/bank data** (PCI scope ~SAQ-A). Stripe Checkout + Customer Portal + Tax.
- **One active licence per club; club sub-licenses its teams** — single billing relationship per club.
- **Prices live in Stripe**, referenced by `provider_price_id`; allowances live on the `licences` row.
- **Subdomains are routing only** — wildcard DNS + on-demand TLS already cover any new slug; provisioning is "a row plus an email".
- **Club = data controller, us = data processor**; DPA per club is a prerequisite to going live (`LICENCE_DPA_CHECKLIST.md`).
- **Retention/purge numbers are owned by `SECURITY.md`**; this doc states the policy shape, not the figures.
- **British English, GBP, UK VAT** in v1; multi-currency/multi-language are out of v1 scope.
- **`DATA_MODEL.md` is authoritative for table shapes** — the `licences` fields here are proposed for reconciliation, not final.

---

*This document defines the commercial framework and marks every price, ratio, target, and retention figure as TBD or as owned by a companion doc. It is intended as the evidence for the Commercial Readiness gate, to be signed off alongside `LICENCE_DPA_CHECKLIST.md` and `SECURITY.md`.*
