# Debate — Validate Willingness-to-Pay FIRST (invert the plan's sequence)

*Position paper · British English (£) · 18 June 2026*
*Motion: Academy OS should STOP, and prove a real external club will pay a real price for the development engine that **already exists**, BEFORE building the multi-tenant platform. Do NOT start Phase 0.*

---

## 0. The one-sentence case

The plan is good engineering in the wrong order. It proposes to build the most expensive, highest-liability, most failure-prone half of the product — multi-tenant isolation on children's data, billing automation, TLS at scale — **upstream of** the cheapest, most decisive experiment in the whole programme, which costs almost nothing and needs none of that infrastructure: *name a price, get ≥3 external clubs to commit real money, run a manual paid pilot of the product that already works.*

This is not "stop the idea." The product, the research, and the engineering instincts are strong (`RED_TEAM_PRODUCT.md §9`). It is "stop and invert the sequence." Every option the plan wants stays open; we simply refuse to spend the head-start, and take on open-ended personal liability, on a premise we have not tested.

---

## 1. Willingness-to-pay is unproven — and there is a structural value/buyer mismatch

The project's own commercial doc states the governing test: *"If a multi-team club, shown the development engine, still won't pay because 'Spond does enough for free', the business case is invalid"* (`COMPETITOR_PRICING_GTM.md §5`, risk-table conclusion). That test has **not been run**. The plan sequences it into Phase 1–2 (`DEVELOPMENT_PLAN.md §5`), *after* the heavy lift.

The reason it is not a formality is a mismatch the docs name but never resolve (`RED_TEAM_PRODUCT.md §1`):

- **The parent wants development** — "is my child improving and enjoying it" is the under-served emotional hook (`COMPETITOR_ANALYSIS.md §3.3`). But the parent does not hold the budget.
- **The club committee holds the budget** — and it feels *admin* pain (chasing subs, no-shows, scheduling), not development pain. It buys pain-killers; development is, to a committee, a vitamin (`RED_TEAM_PRODUCT.md §1`).
- **The coach feels both** — but is a volunteer who will not personally pay when Spond is free (`COMPETITOR_PRICING_GTM.md §2.2`).

So the person who wants it can't buy it; the person who can buy it doesn't acutely want it. The entire revenue thesis rests on the club paying for development *specifically because there is "no free equivalent"* (`COMPETITOR_PRICING_GTM.md §2.1`) — and that is an assertion, not evidence. Worse, the development-hungry parent already has a cheaper answer that needs no club buy-in: **TopTekkers**, professionally-produced, gamified, four-corners-aligned, at a low per-family price (`COMPETITOR_ANALYSIS.md §1`, [19]; `RED_TEAM_PRODUCT.md §1`). And **360Player already monetises the exact differentiator** we are betting on — development plans at $49/club + $3/user (`COMPETITOR_PRICING_GTM.md §1`; `RED_TEAM_PRODUCT.md §3`). The "nobody does both" claim (`COMPETITOR_ANALYSIS.md §0`) is overstated; the willingness-to-pay it depends on is untested.

**The decisive experiment is almost free and needs no platform.** Because the development engine *already exists and works* (`PROJECT_BRIEF.md §2`), we can run the market test with what we have:

1. **Name a price out loud.** The whole pricing section is `TBD` (`COMPETITOR_PRICING_GTM.md §3`). You cannot validate willingness-to-pay without a number. Anchor it: Coacha £36/mo flat, or the 360Player $49 + $3/user shape.
2. **Demo the existing product to external clubs** — not OWFC Harris.
3. **Get ≥3 external clubs to commit *real money*** against that price — a deposit, a Direct-Debit/GoCardless mandate, a Stripe Payment Link the operator makes by hand, or a signed LOI with the number on it. A verbal "that's lovely" is worthless; a card on file or a signature is signal.
4. **Run a manual / Wizard-of-Oz paid pilot:** onboard those 2–3 clubs *by hand* onto the existing product (separate cheap instances, or logically separated using the existing child-picker pattern), take money manually — *no multi-tenancy, no RLS rewrite, no webhooks, no TLS automation.*

This learns the four things Phase 0 currently *assumes*: do clubs pay, what will they pay, do parents actually engage, and what really breaks in onboarding (`RED_TEAM_PRODUCT.md §2`, §10).

---

## 2. Building the multi-tenant vault first is the most expensive, highest-liability work — placed UPSTREAM of the cheap test

The plan's own critical path makes the inversion explicit: *"Remediation R1–R5 are entry conditions → Phase 0 slices 0a→0g must complete with the isolation gate at 100% before any external tenant"* (`DEVELOPMENT_PLAN.md §11`). Translated: before one external club can be charged the way the model intends, a solo builder must complete the single most dangerous body of work in the programme — and only *then* find out if anyone will pay.

And here is the part the specs soften: **the current code is materially more broken than the plans admit.** The security red-team verified it against the real source (`RED_TEAM_SECURITY.md`):

- **F1 — any authenticated user can self-grant `is_admin`.** A family login can run `update profiles set is_admin = true where id = auth.uid();` — the `with check (id = auth.uid())` passes, and `is_admin()` is global, so they become superuser over every table. **No companion spec even notices this path.** Today it is one team; the moment a second club's data lands on the shared instance, it is "one row away from cross-tenant superuser over every club's children" (`RED_TEAM_SECURITY.md F1`).
- **F3 — `using(true)` is the *current* state of every sensitive table**, including `video_reflections` (children's private free-text), `directory` (adult contacts), and `rsvp`. The specs describe the target RLS "as if partly done"; in reality "almost nothing is scoped today" and slice 0c is "a from-scratch rewrite of the entire authorisation layer," not the "extension" the data model implies (`RED_TEAM_SECURITY.md F3`, Verdict).
- **F4 — the `media` Storage bucket is Public.** Child photos are world-readable by direct key, with no auth at all; flipping it private does not revoke already-cached/shared URLs (`RED_TEAM_SECURITY.md F4`).
- Plus F2 (sponsor "zero child data" is a UI illusion, not enforced in RLS), F5 (client-settable tenant GUC trusted by tenancy-table policies), F9 (dual-run leaves both `is_admin` and memberships authoritative — widest-grant-wins mid-migration), and the F12 finding that the live project has been world-writable and "should be treated as compromised."

The security verdict is "**conditionally safe to build from — but not in its current framing, and not against the current Supabase project**," subject to nine preconditions including a from-scratch deny-by-default RLS authoring, a fresh project, mandatory staging, and migration-as-code attestation (`RED_TEAM_SECURITY.md Verdict`). Every one of those is real, weeks-of-work, and *non-waivable once external children's data exists* — yet none of it is needed to learn whether anyone will pay. The plan is building (and hardening) the bank vault before confirming anyone wants to deposit money (`RED_TEAM_PRODUCT.md §2`).

Note the trap: the plan's risk register (`DEVELOPMENT_PLAN.md §7`) lists two BLOCKERs and three HIGHs — *every one of which is a multi-tenant problem that does not exist in the single-team product.* We would be manufacturing our own worst risks before validating the premise.

---

## 3. Solo-operator liability: uncapped downside for tens of £/month

This is the risk the docs under-weight most (`RED_TEAM_PRODUCT.md §6`). The moment we hold *external* clubs' children's data as a commercial processor, one person becomes a data processor of minors' personal data for many independent controllers. The asymmetry is brutal:

- **Uncapped, catastrophic downside.** A single missed RLS filter is "an ICO-reportable breach across organisations" (`PROJECT_BRIEF.md §8.1`). Regulatory action, reputational ruin, harm to children, personal exposure — against an upside of "tens of £/month per club" (`COMPETITOR_PRICING_GTM.md §4`). That is a profoundly unattractive risk/reward ratio for an individual.
- **Single point of failure on safety-critical infrastructure.** The brief itself says this "becomes infrastructure other clubs depend on" needing "backups, monitoring, and an owner" (`PROJECT_BRIEF.md §8.6`). For a solo operator, illness or burnout becomes an outage across many clubs' children's data. No on-call cover, no second pair of eyes on a BLACK action.
- **Compliance is an ongoing job, not a one-time feature** — DPA per club, privacy policy, breach process, audit logging, retention/purge, safeguarding vetting, VAT (`PROJECT_BRIEF.md §7`; `DEVELOPMENT_PLAN.md` Gate 7). Several steps require `[DPO/LEGAL]` sign-off (`DEVELOPMENT_PLAN.md §8`) — paid professionals to fund against tens-of-pounds ACV.

Crucially, this is **not** a blocker to running the existing single-team product, where OWFC Harris is the controller and the operator is effectively internal. It *becomes* a blocker the instant we hold external children's data commercially — i.e. the liability is created by the very infrastructure §2 says to defer (`RED_TEAM_PRODUCT.md §6`).

Therefore, before any external child data: **insurance** (cyber + professional indemnity), a **limited-liability vehicle**, **DPO/legal sign-off** on the DPA and breach process, and a **second responsible person** for cover and BLACK-action review are *preconditions, not nice-to-haves.* Validating first means we only incur these costs once revenue evidence justifies them.

---

## 4. Re-sequencing keeps every option open and loses almost nothing

This is the strategist's clincher: the cost of being wrong is wildly asymmetric in our favour.

- **If we validate first and demand is real:** we have lost a few weeks of founder time, and gained prices, activation numbers, support-load reality, and a liability picture. The platform build becomes a *justified* risk, and `DEVELOPMENT_PLAN.md` executes exactly as written — its gate discipline and non-waivable isolation gate are correct *for when you build the platform* (`RED_TEAM_PRODUCT.md §9`). Nothing is thrown away.
- **If we build first and demand is absent:** we have sunk many months of the hardest, least-validated engineering, taken on open-ended personal liability, possibly suffered a breach of children's data on a shared instance the security review calls compromised — and *then* discovered clubs won't pay because "Spond does enough for free."

The platform plan is not invalidated by validating first; it is *de-risked* by it. The current `DEVELOPMENT_PLAN.md` simply becomes "the plan for after Rung 3 passes" (`RED_TEAM_PRODUCT.md §10–11`). We delete nothing and defer only the spend.

---

## 5. The concrete validation sequence with go/no-go gates

Cheapest-to-most-expensive ladder (adapted from `RED_TEAM_PRODUCT.md §10`). **No multi-tenant code is written until Gate 3 is GREEN.**

**Rung 0 — Name a price + hypothesis (days). Cost: ~zero.**
State a concrete price (anchor: Coacha £36/mo flat, or 360Player $49 + $3/user). Write the falsifiable hypothesis: *"≥3 external multi-team clubs will pay £X/mo for the development engine as a coexisting layer alongside Spond."* Build the one-page break-even model: cost/club (vetting hrs + DPA + support tickets × operator £/hr + Stripe + hosting) vs fee/club, at 10 / 50 / 200 clubs (`RED_TEAM_PRODUCT.md §4`).
**Gate 0 → 1:** a number exists, a written hypothesis exists, and the break-even model clears at a *believable* support load. If it can't clear on paper, the model is broken regardless of the product — stop.

**Rung 1 — Demo-and-ask (1–2 weeks). Cost: founder time.**
Demo the **existing** harris.football development engine to 8–10 external clubs/coaches. Ask each for a signed LOI or a deposit at the named price.
**Gate 1 → 2 (the real commercial gate):** **≥3 external (non-Harris) clubs commit real money or a signature** against the stated price. This replaces the plan's far-too-weak Gate 1 exit of "named pilot interest" (`DEVELOPMENT_PLAN.md §3 Gate 1`). **Kill criterion:** if you cannot get 3, stop and rethink the wedge — do *not* build the platform.

**Rung 2 — Manual / Wizard-of-Oz paid pilot (4–8 weeks). Cost: founder time + minimal hosting.**
Onboard the 2–3 committed clubs *by hand* (separate cheap instances or logically separated within the current app). Take real money manually (Stripe Payment Link / GoCardless mandate — no webhooks, no provisioning automation, no TLS work). Measure: parent engagement with development; whether the parent→club pull actually happens; what breaks in onboarding; whether the *club admin* absorbs first-line coach support (the load-bearing, unproven assumption behind "support clubs, not coaches", `COMPETITOR_PRICING_GTM.md §4`).
**Gate 2 → 3:** paid clubs **activate AND renew/retain**, parents demonstrably engage, support load is survivable. **Kill criterion:** if paid clubs don't activate or renew, the model is invalid before a line of platform code.

**Rung 3 — Decision gate (the real go/no-go).**
Only if Rung 2 shows paid retention + parent engagement + a believable break-even do we decide to build the multi-tenant OS. **This is where the current `DEVELOPMENT_PLAN.md` should actually begin.**

**Rung 4 — Build the platform, but governed (only after Gate 3, and only with §3 preconditions in place).**
Execute Phase 0 (re-tenant, the from-scratch deny-by-default RLS, the isolation gate, Storage lockdown, TLS) — *with* the operator-risk preconditions first: insurance, LLC, DPO sign-off, a second person. Fix F1 immediately, provision a fresh Supabase project (treat the old one as compromised), mandate staging and migration-as-code attestation (`RED_TEAM_SECURITY.md Verdict, conditions 1–9`). The plan's gate discipline applies here and is correct.

**Rung 5 — Automate & scale (Phase 2+).**
Self-checkin, dunning, scale tooling — *after* the platform is proven safe with a handful of real external tenants and support-deflection is evidenced, not assumed.

> **The inversion in one line:** the current plan runs Rung 4 → Rung 5 → (Phase 1) something like Rung 2 → never explicitly Rung 1. The correct order is **0 → 1 → 2 → 3 → 4 → 5.** Rungs 0–2 cost almost nothing and decide the entire business case.

---

## 6. The strongest counter-argument — and the rebuttal

**The counter (honestly stated): the white space is time-boxed; incumbents are closing in, and validating first burns the head-start.**

This is the best case against me, and it is real, from our own research (`COMPETITOR_ANALYSIS.md §6`; `RED_TEAM_PRODUCT.md §3`):
- **TeamSnap ONE** (2025) already added a training-content library and FC Barcelona/MLS methodology — the direction of travel is *toward* development.
- **FirstWhistle** is "the most direct hybrid threat," combining AI admin + an achievement/development layer + managed child accounts, **already native on iOS and Android** while our v1 is web-only.
- **TopTekkers** owns gamified-learning mindshare; if it adds team admin it becomes a direct competitor with a content head-start.
- **360Player** is funded, has a sales motion, and already sells development plans.

If the gap is temporary, the argument runs, then speed-to-platform *is* the strategy, and a months-long validation detour hands the category to a funded rival.

**The rebuttal — three points:**

1. **Validating first does not burn the head-start; building plumbing first does.** The defensible moat the competition analysis identifies is *development depth + the club-branded curriculum cascade + UK-grassroots-native context* (`COMPETITOR_ANALYSIS.md §5`). Spending the early lead on multi-tenant RLS, TLS, and Stripe webhooks spends the head-start *in the wrong place* (`RED_TEAM_PRODUCT.md §3`). Rungs 0–2 cost **weeks, not months**, and consume founder time, not engineering time — they barely touch the clock that matters for competitive depth.

2. **Speed without willingness-to-pay is speed off a cliff.** If we win the race to a multi-tenant platform and clubs still won't pay because "Spond does enough for free," we have arrived first at a market that doesn't exist for us. The time-box argument assumes the prize is real; the *only* cheap way to confirm the prize is real is to run the test the plan defers. Racing harder toward an unproven prize is the more expensive mistake, not the safer one.

3. **Manual coexistence is itself a fast competitive probe.** A Wizard-of-Oz pilot *is* a market entry — clubs are using the development engine alongside Spond *now*, while competitors are still shipping. We learn the parent→club pull (the engine of the entire GTM, `COMPETITOR_PRICING_GTM.md §4`) and start word-of-mouth in a "tight, gossipy" grassroots network — without taking on liability or building plumbing. If the pull is real, *that* is the head-start, and it compounds whether or not the platform exists yet.

The mitigation the time-box argument actually needs is already in the plan: *monitor FirstWhistle and TopTekkers quarterly* and treat "FirstWhistle adds a club tier" or "TopTekkers adds admin" as change-the-plan triggers (`COMPETITOR_ANALYSIS.md §6.7`; `RED_TEAM_PRODUCT.md §3`). Validation-first is fully compatible with that vigilance — and far cheaper than racing blind.

---

## 7. What I concede (honestly)

A sharp opponent deserves honest concessions:

- **The white space is real, and competitor existence validates demand for the *category*.** 360Player and FirstWhistle existing proves the gap is worth chasing (`COMPETITOR_ANALYSIS.md §9`; `RED_TEAM_PRODUCT.md §9`). My case is about *sequencing and willingness-to-pay at a price*, not about whether the idea is sound.
- **The buyer thesis is directionally right** — charge the club, teams ride free, development is the wedge, with a real consolidation tailwind (>50% of affiliated football in 20+ team clubs by 2028) (`COMPETITOR_PRICING_GTM.md §2`, §4). Validating first tests *whether they'll pay*, not *whether the instinct is correct*.
- **There is a real cost to my position.** Validation-first means months later to a full platform than a head-down build, and it risks a fast follower shipping a "good enough + free + already-installed" development layer while we are still piloting manually. That is a genuine loss if it materialises. I judge it smaller than the loss of building the riskiest engineering on children's data before knowing anyone will pay — but it is not zero.
- **The platform plan and its governance are excellent *for their stage*.** The gated programme, the non-waivable isolation gate, the BLACK-action discipline, the additive-then-cutover migration — these are exactly right *once Gate 3 is GREEN* (`RED_TEAM_PRODUCT.md §9`). I am not attacking the plan's quality; I am attacking its position in the timeline.
- **A Wizard-of-Oz pilot is not zero-risk.** Even manual, logically-separated pilots touch some external child data and need at least lightweight DPAs, basic insurance, and the F1 fix before any external login. The honest version of "validate first" includes those minimal safeguards in Rung 2 — it is *cheaper*, not *free*. (The fully controller-light alternative is to keep each pilot club on a genuinely separate single-team instance where they remain controller, minimising the operator's processor exposure — `RED_TEAM_PRODUCT.md §6`.)

**Bottom line:** good product, good research, good engineering instincts — wrong order (`RED_TEAM_PRODUCT.md §9`). Run the days-to-weeks experiments the plan defers; if they pass, build the platform with confidence and far less risk; if they fail, you will have saved many months and avoided an open-ended liability. That is precisely what validating first is for.
