# Red Team — Product & Commercial Thesis (Academy OS)

*Adversarial review of the PRODUCT & COMMERCIAL business case · British English (£) · 18 June 2026*

> **Remit.** Attack the thesis that a multi-tenant (Platform→Club→Team) youth-football OS, differentiated by a player-**development** engine, is worth building and will be paid for. This is a hostile review by design. It is grounded in the project's own docs (`PROJECT_BRIEF.md`, `DEVELOPMENT_PLAN.md`, `COMMERCIAL_READINESS.md`, `COMPETITOR_ANALYSIS.md`, `COMPETITOR_PRICING_GTM.md`) and steel-mans the case *against* proceeding. It is deliberately one-sided; the balancing "what's strong" section is §9, and the integrated verdict is §11.
>
> **Headline.** The development thesis may well be right. The *sequencing* in the plan is wrong. The programme proposes to build heavy multi-tenant, billing, and compliance infrastructure **before** a single external club has paid a penny for the development engine. That is building the hard, expensive, liability-laden half of the product to de-risk the cheap, easy-to-test half. Almost every BLOCKER below collapses to one root cause: **willingness-to-pay is unproven and is being assumed, not tested, while the most dangerous infrastructure gets built first.**

---

## 0. The one test that governs everything

`COMPETITOR_PRICING_GTM.md §5` states it plainly: *"If a multi-team club, shown the development engine, still won't pay because 'Spond does enough for free', the business case is invalid."*

This document's central charge is that **the development plan does not put that test first.** It puts it in **Phase 1–2** (`DEVELOPMENT_PLAN.md §5`), *after* Phase 0 — the "heavy lift" re-tenanting (0a–0g), the isolation gate, the RLS rewrite, the TLS/DNS work, and the Stripe provisioning machinery. The single most important, cheapest-to-run, business-case-deciding experiment is gated behind the most expensive, riskiest engineering in the whole programme. That is backwards.

---

## 1. Willingness to pay — *steel-manning "Spond does enough for free"*

**Severity: BLOCKER** (to the business case as currently sequenced)

### The argument against us
The strongest version of the sceptical club's position, built from our own research:

- **Spond is free, good, polished, and already adopted** (`COMPETITOR_ANALYSIS.md §1`; `COMPETITOR_PRICING_GTM.md §2`). It has *Spond Club* for multi-team rollup and finance — the exact "club layer" we're claiming as white space. Its marginal cost per new team is near zero and it funds itself on the payment rail (2.5% + £0.20), so it **never needs** a per-team fee. We cannot out-free it.
- **FA Matchday is free, official, FA-funded, and owns data we can never replicate** — suspensions, Full-Time match returns, affiliated-game integration (`COMPETITOR_PRICING_GTM.md §2`). It will never need to make money.
- The development hook is **aspirational, not operational**. A volunteer committee buys what reduces *pain* (admin, chasing payments, no-shows). "Evolving player cards" is a *nice-to-have* that competes for budget against kit, pitches, and referees. Pain-killers get bought; vitamins get cut.
- **Who actually feels the development value?** Honest answer from our own docs: the *parent* ("is my child improving and enjoying it" — `COMPETITOR_ANALYSIS.md §3.3`). But the parent **does not hold the budget**. The club committee holds the budget and feels *admin* pain, not development pain. The coach feels both but is a volunteer who will not personally pay (`COMPETITOR_PRICING_GTM.md §2.2`). **The person who wants it can't buy it; the person who can buy it doesn't acutely want it.** That value/buyer mismatch is the core willingness-to-pay risk and no doc resolves it.
- **TopTekkers already serves the parent who wants development — for a low per-family price, with deeper, professionally-produced content** (`COMPETITOR_ANALYSIS.md §1`, [19]). A development-hungry parent has a cheaper option *today* that doesn't require their whole club to switch platforms.

### Why this is a BLOCKER
The entire revenue thesis rests on a club paying for the development engine *specifically* because there's "no free equivalent" (`COMPETITOR_PRICING_GTM.md §2.1`). That is an **untested assertion**. The plan commits months of the riskiest engineering before this assertion is checked against a real club's wallet.

### What evidence would prove it BEFORE building the platform
You do **not** need multi-tenancy, RLS isolation, subdomains, or Stripe webhooks to learn whether clubs will pay for development. You need:
1. **A signed commitment / pre-payment** (even a deposit, even a £-token Direct Debit mandate, even a signed LOI with a price on it) from **3–5 clubs that are not OWFC Harris**, after seeing the *existing* harris.football development engine demoed. A verbal "yes that's lovely" is worthless; a card on file or a signature is signal.
2. **A price stated out loud and not refused.** The whole pricing section is `TBD` (`COMMERCIAL_READINESS.md §3`; `COMPETITOR_PRICING_GTM.md §3`). You cannot validate willingness-to-pay without naming a number. Name one (e.g. anchor to Coacha £36/mo flat or 360Player's $49 base + $3/user shape) and watch the reaction.
3. **Evidence of the parent→club pull.** Does showing parents the cards actually make them lobby the club to adopt? That is the GTM engine's core assumption (`COMPETITOR_PRICING_GTM.md §4`, "the product is the salesperson") and it is untested.

### Recommendation
**Do this first, before any Phase-0 engineering.** Run a concierge/manual pilot of the *development engine only* with 3–5 external teams (see §10 sequence). **Don't** assume the development engine is worth paying for; **prove it with a price and a signature.** If you cannot get 3 non-Harris clubs to commit money against a named price using the product that *already exists*, no amount of multi-tenant infrastructure will save the business case.

---

## 2. The "build a multi-tenant OS first" risk

**Severity: BLOCKER** (sequencing error)

### The argument against us
This is the gravest structural problem and it is visible in the plan's own critical path (`DEVELOPMENT_PLAN.md §11`): *"Remediation R1–R5 are entry conditions → Phase 0 slices 0a→0g must complete with the isolation gate at 100% before any external tenant."*

Translated: **before one external child's data lands, and therefore before one external club can be charged the way the model intends, the solo builder must:**
- add `club_id`/`team_id` to every table (R1),
- retire the global `is_admin` superuser (R2),
- rewrite every `using(true)` RLS policy on children's free-text and adult contacts (R3),
- lock down a currently-**public** media bucket of child photos (R4),
- fix an ambiguous Caddy/nginx deploy pipeline (R5),
- build a pgTAP isolation suite covering *every table × every role × every operation* at **100% pass, non-waivable** (`DEVELOPMENT_PLAN.md §4`),
- stand up wildcard DNS + on-demand TLS + an ask-endpoint (0f),
- and migrate Harris with zero data loss (0g).

That is the **single most expensive, highest-liability, most failure-prone** body of work in the entire programme, and it is **upstream of the willingness-to-pay test**. The plan is building the bank vault before confirming anyone wants to deposit money.

The brief itself half-admits this: §7 calls the controller/processor obligation "the gating commercial/legal piece"; §8.1 calls cross-tenant leakage "highest"; the risk register (`DEVELOPMENT_PLAN.md §7`) lists **two BLOCKERs and three HIGHs**, every one of which is a *multi-tenant* problem that **does not exist in the single-team product**. We would be manufacturing our own worst risks before validating the premise.

### The opposite sequence (the case for it)
A single-team development product **already exists and works** (`PROJECT_BRIEF.md §2`). The cheapest path to revenue evidence is:
- Keep it single-instance. Run additional pilot teams as **separate cheap instances** or even **logically separated within the one app using the existing child-picker pattern** — manually provisioned, no self-serve, no Stripe webhooks, no on-demand TLS.
- Take money **manually** (an invoice, a GoCardless mandate, a Stripe Payment Link the operator creates by hand — *no provisioning automation*).
- Learn whether the development engine retains parents and converts clubs **with near-zero new engineering**.

Multi-tenancy, self-checkin, billing automation, and the isolation gate are **scale optimisations**. You only need them once you have *proven demand to scale*. Building them first is premature optimisation at its most expensive — and on children's data, its most dangerous.

### The cheapest experiment that de-risks the whole bet
**A "Wizard of Oz" pilot:** 2–3 external teams onboarded *by hand* onto the existing product (or trivially-cloned instances), each paying a real (small) fee via a manual payment link, for the development engine. No new platform code. Total engineering cost: close to zero. What it tells you: whether clubs pay, whether parents engage, what they'll pay, and what actually breaks in onboarding — the four things the entire £-and-months Phase 0 is *assuming*.

### Recommendation
- **DON'T build Phase 0 (0a–0g) yet.** Do not write multi-tenant infrastructure, the isolation gate, self-checkin, or TLS automation until willingness-to-pay is evidenced (§1).
- **DO** run the manual/concierge pilot first. Re-tenant *only after* ≥3 external clubs have paid real money against a named price.
- Reframe the gate order: insert a **"Commercial Proof" gate before Architecture/Build**, not after. The plan's Gate 1 ("Opportunity") asks for "named pilot interest" — that is far too weak. Upgrade its GREEN exit to **"≥3 external clubs paying against a stated price for the existing development product."**

---

## 3. Competition — where do we actually lose?

**Severity: HIGH**

The thesis claims a defensible "unoccupied middle" (`COMPETITOR_ANALYSIS.md §3`). Adversarially, the white space is **real today but structurally temporary**, and several competitors can close it faster than a solo builder can build the OS.

### Where we lose, by competitor

- **360Player — we lose on credibility and head-start in our *own* category.** It is `Archetype C`, already charging for **development plans** at $49/club + $3/user (`COMPETITOR_PRICING_GTM.md §1`, [34]). It is the *single most direct structural comparable* to our model and it **already monetises the exact differentiator we're betting on**. We are not creating a category; we are entering one that has an incumbent with funding, a sales motion, and shipped development features. "Nobody does both" (`COMPETITOR_ANALYSIS.md §0`) is overstated — 360Player substantially does, and it's selling now.

- **FirstWhistle — we lose the "first credible hybrid" narrative.** Our own analysis names it *"the most direct hybrid threat"* and *"the closest single product to our thesis"* (`COMPETITOR_ANALYSIS.md §1`, §6.2): AI admin **+** an explicit development/achievement layer **+** managed child accounts, **+ already on iOS and Android** (which we explicitly defer — `PROJECT_BRIEF.md §4`). It is new and unproven, but it is **racing us with native apps while our v1 is web-only**. A solo builder doing multi-tenant + compliance + development is slower than a focused team doing admin + a development layer.

- **TeamSnap ONE — we lose on the "incumbents can't add development" assumption.** It added a training-content library and FC Barcelona/MLS methodology in 2025 (`COMPETITOR_ANALYSIS.md §1`, §6.1, [2][3]). The *direction of travel is already toward development.* If TeamSnap or Spond ships a "good enough" per-player layer, "good enough + free + already-installed" beats "deeper but new + paid + a switch."

- **TopTekkers — we lose the parent who already wants development.** It owns gamified-learning mindshare for ages 5–14 with professionally-produced content and a do-at-home loop (`COMPETITOR_ANALYSIS.md §6.3`, [19]). The development-hungry parent — our supposed demand engine — **already has a cheaper answer that needs no club buy-in.** If TopTekkers adds even light team admin or partners with an admin app, it becomes a direct competitor with a content head-start we cannot match as a solo builder.

- **Spond — we never beat it on logistics, and our docs concede this** (`COMPETITOR_ANALYSIS.md §5`, "do not win the logistics price war"). Fine — but it means **100% of our value must come from development**, which loops straight back to the unproven willingness-to-pay (§1).

### Is the white space defensible?
The claimed moats are: depth of FA-four-corners curriculum, the club-branded curriculum *cascade*, multi-tenant rollup with a development dimension, and cross-season data portability (`COMPETITOR_ANALYSIS.md §5`; `COMPETITOR_PRICING_GTM.md §5 risk 4`). Adversarial read:
- **Curriculum depth is content, and content is copyable / buyable.** TeamSnap bought FC Barcelona methodology. A funded competitor can licence FA-aligned content faster than a solo builder can author it.
- **The "club-branded cascade" is a genuine structural differentiator** — but it is exactly the *multi-tenant infrastructure* that §2 argues you shouldn't build until demand is proven. The moat and the riskiest engineering are the same thing. You can't claim it as defence until you've paid the cost to build it — and you shouldn't pay that cost until demand is proven.
- **Cross-season portability** is nice but a *retention* feature, not an *acquisition* wedge; it only matters once a club is already in.

**Conclusion:** the gap is real but **time-boxed**. Defensibility depends on getting deep before a funded competitor gets "good enough" — and a solo builder spending the first phase on multi-tenant plumbing is **spending the head-start in the wrong place.**

### Recommendation
- **Win on depth + UK-grassroots-native + club-context, fast** (`COMPETITOR_ANALYSIS.md §6.1` mitigations) — but spend the early lead on **development depth and pilot proof**, not on tenancy plumbing.
- **Monitor FirstWhistle and TopTekkers quarterly** (already flagged §6.7) — specifically watch for FirstWhistle adding a club tier or TopTekkers adding admin; either is a "change the plan" trigger.
- **Reconsider the web-only v1 stance.** Competitors are native-app-first; "yet another app" that is *also* a worse mobile experience is a double penalty (links to §5).

---

## 4. Unit economics — low ACV vs high-compliance, support-heavy product

**Severity: HIGH** (BLOCKER if scaled before automation/support are proven)

### The argument against us
The economics are internally contradictory for a solo operator:

- **ACV is low.** Our own GTM doc: *"tens of £/month per club, realistically"* and *"a field-sales motion would not pay back at this ACV"* (`COMPETITOR_PRICING_GTM.md §4`). Benchmarks: Coacha £36/mo flat, 360Player $49 + $3/user.
- **Per-club cost is high and partly fixed.** Each club requires: a **signed DPA** (`PROJECT_BRIEF.md §7`), a **safeguarding/vetting gate** with a human in the loop (`COMMERCIAL_READINESS.md §2.6`), onboarding 100+ volunteer coaches of varying skill (`PROJECT_BRIEF.md §8.4`), and ongoing support where *"support load is the bottleneck"* (`COMMERCIAL_READINESS.md §6`).
- The plan's mitigation — *"support clubs, not coaches"* (`COMMERCIAL_READINESS.md §6.5`) — is **plausible but unproven and partly out of our control.** It assumes the *club admin* (also a volunteer) absorbs first-line support for its own coaches. If they don't, all 100+ coaches escalate to the solo operator.
- **The compliance cost does not scale down.** A breach is *"existential, not just embarrassing"* (`COMPETITOR_ANALYSIS.md §6.6`). Verify-then-pay vetting (`COMMERCIAL_READINESS.md §2.6 option B`) is *manual human work per club* — at £36/mo, a single hour of vetting + a DPA exchange + one support ticket can wipe out months of margin.

### The break-even / break-the-operator maths
With everything `TBD`, exact numbers can't be computed — but the *shape* is damning and can be reasoned without inventing figures:
- At ~£36/mo (≈£430/yr), gross margin per club is small after Stripe + Tax + hosting.
- If a club costs even **a few hours/year** of the operator's time (vetting, DPA, support, the occasional billing/provisioning anomaly per `COMMERCIAL_READINESS.md §5.4`), the **labour cost per club rivals or exceeds the annual fee** at any realistic value of the operator's time.
- This product **only works at meaningful volume** (hundreds of clubs) where support is truly deflected to docs + club admins. But that volume requires the automation/self-serve to *already* work — which requires the Phase-0/Phase-2 build to be done and proven, which is the expensive thing we haven't validated demand for. **Catch-22:** the economics need scale; scale needs the infrastructure; the infrastructure shouldn't be built until the economics are proven.
- **Below ~50–100 paying clubs, this is a money-and-time-losing exercise for a solo operator** — and the danger zone is the early phase, exactly when support is *most* hands-on (`COMMERCIAL_READINESS.md §6.4`).

### Recommendation
- **Don't price at "tens of £/month" if the support+compliance cost is hours/club.** Either (a) price the development tier **higher** (anchor to academy/club-programme value, where 360Player/PlayMetrics sustain a sales cost), or (b) keep the cohort tiny and high-touch until self-serve genuinely deflects load. The current £-anchoring (`COMPETITOR_PRICING_GTM.md §2.5`, "low tens of pounds") may be **structurally below break-even for a solo operator** — interrogate it explicitly.
- **Model the break-even before building.** Even with TBD prices, build a one-page sensitivity model: cost/club (vetting hrs + DPA + support tickets × operator £/hr + Stripe + hosting) vs fee/club, across 10 / 50 / 200 clubs. If it doesn't clear at a *believable* support load, the model is broken regardless of the product.
- **Treat onboarding/support as the real CAC** (`COMPETITOR_PRICING_GTM.md §4`) and validate the "club admin absorbs support" assumption *in the manual pilot* before depending on it.

---

## 5. Adoption friction — "yet another app", volunteer coaches, parents already in Spond

**Severity: HIGH**

### The argument against us
- **It is "yet another app."** Coaches and parents already live in Spond/TeamSnap/Heja with years of history, payment setups, and habits (`COMPETITOR_ANALYSIS.md §6.4`). Asking a club to add or switch is a hard ask "especially against *free* Spond."
- **The plan's answer is "coexistence — be the development layer on top, not a rip-and-replace"** (`COMPETITOR_PRICING_GTM.md §2.4`). But coexistence is a **double-tool tax**: the club now runs Spond for comms/payments *and* Academy OS for development. Volunteers hate two tools. And if we don't do comms/payments, we're a *second* login parents must adopt purely for "cards" — which raises the bar on the development hook being genuinely compelling.
- **But the alternative is worse:** to be the *only* app we must reach parity on all of §2's table-stakes (scheduling, RSVP, moderated comms, payments, stats, line-ups, managed child accounts) — and our own analysis says *"if any of these is missing or clunky in v1, we are judged 'less complete than Spond' regardless of how good our development engine is"* (`COMPETITOR_ANALYSIS.md §2`). That is an enormous parity build for a solo operator, on top of the development engine *and* the multi-tenant platform.
- **Activation is multi-step and fragile** (`COMMERCIAL_READINESS.md §2.1`, 15 steps): club admin sets up → adds teams → invites coaches → coaches CSV-import squads → parents self-register via codes. Every step is a volunteer of varying tech skill. The funnel has many drop-off points; the plan's own activation KPI (`COMMERCIAL_READINESS.md §7`) admits N is TBD and unproven.
- **Web-only v1** (`PROJECT_BRIEF.md §4`) against native-app incumbents worsens every adoption metric for parents who expect an app.

### The squeeze
We're caught between two bad options: **coexist** (double-tool tax, weaker hook) or **replace** (enormous parity build). The docs pick coexist, which makes the development hook do *all* the work — back to §1.

### Recommendation
- **Validate the development hook's pull *as a coexisting layer* in the manual pilot** before building anything. If parents won't adopt a second app *just* for development, coexistence fails and replacement is unaffordable — the product is stuck.
- **Get realistic activation numbers from the pilot** (time-to-first-squad, % parents who register) before assuming self-serve onboarding scales.
- **Reconsider native apps or at least a first-class PWA** earlier than v1 currently allows, given parent expectations.
- **Don't over-build parity in v1.** If coexistence is the strategy, lean into it: be unapologetically the development layer, integrate/deep-link to Spond rather than half-replacing comms.

---

## 6. Founder / operator risk

**Severity: BLOCKER** (for the *current* solo, automated-multi-tenant plan)

### The argument against us — named honestly
This is the risk the docs under-weight most. **One person is proposing to become a data processor of children's personal data for many independent organisations.** Concretely:

- **Open-ended, asymmetric liability.** As processor for minors' data across many controllers, a *single* missed RLS filter is *"an ICO-reportable breach across organisations"* (`PROJECT_BRIEF.md §8.1`). The downside (regulatory action, reputational ruin, harm to children, personal/financial exposure) is **catastrophic and uncapped**; the upside is "tens of £/month per club." That is a **profoundly unattractive risk/reward ratio for an individual.**
- **Single point of failure on safety-critical infrastructure.** The plan acknowledges this becomes *"infrastructure other clubs depend on"* requiring *"backups, monitoring, and an owner"* (`PROJECT_BRIEF.md §8.6`). For a solo operator, illness, holiday, or burnout becomes an *outage for many clubs' children's data*. There is no on-call rotation, no second pair of eyes on a BLACK action, no cover.
- **The compliance surface is a job, not a feature.** DPA per club, privacy policy, breach process, audit logging, retention/purge, safeguarding vetting, VAT/tax (`PROJECT_BRIEF.md §7`; `COMMERCIAL_READINESS.md §9–10`). These are **ongoing operational obligations**, not one-time builds. Many require *"[DPO/LEGAL] sign-off"* (`DEVELOPMENT_PLAN.md §8`, §10) — i.e. paid professionals the solo operator must engage and fund, against tens-of-pounds ACV.
- **Safeguarding is reputationally radioactive.** Any safeguarding incident in a children's product — even one not caused by us — attaches to the platform. A solo operator has no comms function, no legal buffer, no institutional credibility to absorb that.

### Why this is a BLOCKER (for the current shape)
It is *not* a blocker to running the existing single-team product, where OWFC Harris is the controller and the operator is effectively internal. It **becomes** a blocker the moment we hold *external* clubs' children's data as a *commercial* processor — which is precisely the multi-tenant leap the plan sequences first. The liability is created by the very infrastructure §2 says to defer.

### Recommendation
- **Name this in the brief's risk register as an explicit operator/personal-liability BLOCKER, not just a "support/reliability" item.** It currently hides inside §8.4 and §8.6.
- **Do not take on external children's data as a solo processor without:** (a) appropriate **insurance** (cyber + professional indemnity), (b) a **limited-liability vehicle**, (c) **DPO/legal sign-off** on the DPA and breach process, and (d) a **second responsible person** for cover and BLACK-action review. These are preconditions, not nice-to-haves.
- **Prefer the controller-light pilot shape:** in the manual pilot, structure it so external clubs remain controllers of *their own* instance with the operator's exposure minimised, and **delay becoming a multi-club processor until volume justifies the liability vehicle, insurance, and a second person.**
- **Be willing to conclude that the multi-tenant *commercial* processor model is not viable for a single individual** and that the realistic paths are: stay single-club; partner/licence to an entity that can carry the liability; or only scale once it is no longer a one-person operation.

---

## 7. Scope realism — is v1 achievable, or 18 months before a penny?

**Severity: HIGH**

### The argument against us
Count what v1 actually requires before the plan's own "Definition of Done — v1" (`PROJECT_BRIEF.md §10`; `DEVELOPMENT_PLAN.md §9`) is met:

1. Re-tenant every table; backfill Harris; dual-run roles (0a–0c).
2. Rewrite all RLS, retire global admin, build the **non-waivable 100% isolation suite** across every table × role × operation (R2–R3, §4).
3. Lock down the public media bucket with signed URLs + consent gate (R4, 0e).
4. Tenant resolver, subdomain routing, per-club theming, club/team switcher (0d).
5. Caddy on-demand TLS + wildcard DNS + ask-endpoint; fix the deploy pipeline (R5, 0f).
6. Cutover Harris with **zero data loss** (0g).
7. Club rollup dashboard (Gate 3/Phase 4 tension — see below).
8. Stripe hosted checkout + idempotent webhook provisioning + reconciliation job + dunning/lifecycle state machine (`COMMERCIAL_READINESS.md §4–5`).
9. Signed DPA per club, privacy policy, breach process, audit logging, retention/purge (`DEVELOPMENT_PLAN.md` Gate 7).
10. Safeguarding/vetting gate (`COMMERCIAL_READINESS.md §2.6`).
11. CSV import, invite codes, in-product onboarding, help centre, status page (`COMMERCIAL_READINESS.md §6`).
12. **Plus** keeping the existing development engine and reaching table-stakes parity (`COMPETITOR_ANALYSIS.md §2`) or the product is "less complete than Spond."

For a **solo builder**, that is **not** a short v1. The plan's own gating discipline — seven gates, four standing reviews each, a 100%-pass isolation gate that *recurs on every change touching a table* (`DEVELOPMENT_PLAN.md §4`), and a long list of BLACK actions each requiring human sign-off (`§6`) — is *good governance* but **dramatically slows delivery**. The isolation gate alone, done properly, is weeks of pgTAP work and is **non-waivable**.

Realistically this is **many months to well over a year of unpaid work** before the *first external pound*, because the plan puts revenue (Phase 2 self-checkin) behind Phase 0 + Phase 1. "18 months before a penny" is a defensible worst case; even an optimistic read is "many months of the hardest, least-validated work first."

### The internal contradiction
The brief lists the **club rollup dashboard in v1 scope** (`PROJECT_BRIEF.md §4`) but the development plan puts **rollup analytics in Phase 4** (`DEVELOPMENT_PLAN.md §5`). The scope is not internally consistent, which is itself a sign v1 is under-specified / over-stuffed.

### Recommendation
- **Radically shrink "v1."** The first shippable, revenue-bearing thing should be **the existing development product, sold to a few external teams, manually provisioned** — *not* the multi-tenant OS. Make *that* "v1."
- **Re-label the current §4 scope as "v2 / Platform" and gate it behind paying-customer proof.** Most of the 12-item list above is scale infrastructure that should not precede revenue.
- **Resolve the rollup contradiction** (v1 vs Phase 4) — it shouldn't be in both.
- Accept that the **isolation gate, DPA, and safeguarding gate are real and non-negotiable *once you hold external children's data*** — which is exactly why you should delay holding it until demand justifies the cost.

---

## 8. Severity summary

| # | Risk | Severity | One-line |
|---|---|---|---|
| 1 | Willingness-to-pay unproven; value/buyer mismatch | **BLOCKER** | The parent wants it; the committee buys; the coach won't pay — and it's assumed, not tested. |
| 2 | Multi-tenant OS built before demand proven | **BLOCKER** | The riskiest, costliest engineering sits upstream of the cheapest, decisive experiment. |
| 6 | Solo operator as multi-club processor of children's data | **BLOCKER** | Catastrophic uncapped downside for tens-of-£ upside; no cover, no liability vehicle. |
| 3 | Competition (360Player, FirstWhistle, TeamSnap ONE, TopTekkers) | **HIGH** | White space is real but temporary; funded/native rivals can close it faster than a solo OS build. |
| 4 | Unit economics (low ACV vs high compliance/support) | **HIGH** | Per-club cost likely rivals per-club fee until large scale; scale needs the infra we shouldn't build yet. |
| 5 | Adoption friction ("yet another app"; coexist vs replace squeeze) | **HIGH** | Coexistence = double-tool tax; replacement = unaffordable parity build; hook must do all the work. |
| 7 | Scope realism | **HIGH** | "v1" is many months / possibly 18mo of hardest, least-validated work before a penny. |

**Three BLOCKERs, four HIGHs. Every one is created or amplified by building the multi-tenant commercial platform *before* proving willingness-to-pay.**

---

## 9. What's strong about the thesis (the balanced view)

This review is hostile by remit, but intellectual honesty requires stating what is genuinely right:

- **The white space is real and well-evidenced.** The competitor teardown is rigorous and correctly identifies that *"nobody convincingly does both [admin + structured development] in one product for UK grassroots"* (`COMPETITOR_ANALYSIS.md §0`). 360Player and FirstWhistle existing **validates the demand**, not just the gap.
- **The product already exists and works.** harris.football has the development engine, curriculum, family loop, and cards built (`PROJECT_BRIEF.md §2`). This is a colossal advantage — most "is there a market?" tests require building first; **this one can be run with what exists.** That makes the recommended cheap experiments *genuinely cheap.*
- **The buyer thesis is directionally right.** "Charge the club, not the coach; teams ride free; the development engine is the wedge" (`COMPETITOR_PRICING_GTM.md §2`) is the correct strategic instinct, and the consolidation tailwind (>50% of affiliated football in 20+ team clubs by 2028) is a real, cited structural advantage.
- **The differentiators are plausibly defensible *if* built and got-deep-first:** the club-branded curriculum cascade and cross-season development portability are things incumbents structurally don't offer.
- **The risk awareness is excellent.** The docs already name nearly every risk in this review — free incumbents, switching costs, support load, compliance burden, the invalidation test. The problem is **not blindness to the risks; it's the sequencing that walks straight into them.** The development plan's gate discipline and non-waivable isolation gate are exactly right *for when you do build the platform.*
- **The compliance/commercial thinking is mature** (DPA, processor stance, Stripe-hosted-only, idempotent provisioning, read-only→export→purge). It is over-engineered *relative to current evidence of demand*, but it is the right engineering *if demand is proven.*

In short: **good product, good research, good engineering instincts, wrong order.**

---

## 10. Recommended de-risking sequence

The cheapest-to-most-expensive ladder. Each rung must pass before the next is funded with engineering time. **No multi-tenant code until rung 3 passes.**

**Rung 0 — Name a price and a hypothesis (days).**
State a concrete price (anchor: Coacha £36/mo flat, or 360Player $49 + $3/user shape). Write the falsifiable hypothesis: *"≥3 external multi-team clubs will pay £X/mo for the development engine as a coexisting layer alongside Spond."* Build the one-page break-even model (§4). *Cost: ~zero.*

**Rung 1 — Demo-and-ask (1–2 weeks).**
Demo the **existing** harris.football development engine to 8–10 external clubs/coaches. Ask for a signed LOI or deposit at the named price. **Kill criterion:** if you can't get ≥3 to commit money/signature, stop and rethink the wedge — *do not build the platform.* *Cost: founder time only.*

**Rung 2 — Manual / Wizard-of-Oz pilot (4–8 weeks).**
Onboard the 2–3 committed clubs **by hand** onto the existing product (separate cheap instances or logically separated within the current app). Take **real money manually** (Stripe Payment Link / GoCardless mandate — *no provisioning automation, no webhooks, no TLS work*). Measure: do parents actually engage with development? does the "parent→club pull" happen? what *actually* breaks in onboarding? does the club admin absorb coach support? **Kill criterion:** if paid clubs don't activate or renew, the model is invalid before a line of platform code. *Cost: founder time + minimal hosting.*

**Rung 3 — Decision gate (the real go/no-go).**
Only if Rung 2 shows **paid retention + parent engagement + a believable break-even**: now decide whether to build the multi-tenant OS. By here you have prices, activation numbers, support-load reality, and a liability picture. **This is where the current `DEVELOPMENT_PLAN.md` should actually begin.**

**Rung 4 — Build the platform, but governed (only after Rung 3).**
Now execute Phase 0 (re-tenant, isolation gate, RLS, TLS) — *with* the operator-risk preconditions in place first (§6: insurance, LLC, DPO sign-off, a second person). The plan's gate discipline and non-waivable isolation gate apply here and are correct.

**Rung 5 — Automate & scale (Phase 2+).**
Self-checkin, dunning, scale tooling — *after* the platform is proven safe with a handful of real external tenants and the support-deflection model is evidenced, not assumed.

> **The key inversion:** the current plan is Rung 4 → Rung 5 → (Phase 1) Rung 2-ish → never explicitly Rung 1. The correct order is **0 → 1 → 2 → 3 → 4 → 5.** Rungs 0–2 cost almost nothing and decide the entire business case.

---

## 11. Verdict

**STOP-AND-VALIDATE-FIRST.**

Not "stop" — the product, research, and engineering instincts are strong, and the existing single-team product is a real asset (§9). But **proceed-with-changes understates the problem**: the changes required are not tweaks to the plan, they are an **inversion of its sequence.**

The thesis has **three BLOCKERs (willingness-to-pay unproven; multi-tenant OS-first sequencing; solo-operator liability) and four HIGHs**, and **every one of them is created or amplified by building the commercial multi-tenant platform before proving anyone will pay.** The single decisive experiment — will a real external club pay a real price for the development engine that *already exists* — costs almost nothing and has not been run. It is indefensible to spend months on the riskiest engineering in the programme (isolation on children's data, billing automation, TLS at scale) and to take on open-ended personal liability as a processor of minors' data, all **before** running a free, days-to-weeks test that could invalidate the whole bet.

**Concrete instruction:**
- **DO NOT** start Phase 0 (`DEVELOPMENT_PLAN.md §5`) — no re-tenanting, no isolation suite, no self-checkin, no TLS automation — yet.
- **DO** run Rungs 0–2 (§10) first: name a price, get ≥3 external clubs to commit money against it, and run a manual paid pilot of the existing development product. *Cost: founder time.*
- **Treat the current `DEVELOPMENT_PLAN.md` as the plan for *after* Rung 3 passes**, not the plan for now.
- **Before holding any external children's data commercially**, put the operator-risk preconditions in place (§6): insurance, a liability vehicle, DPO/legal sign-off, and a second responsible person. Be genuinely willing to conclude that the *solo, automated, multi-tenant processor* model is not viable — and that the realistic paths are stay-single-club, licence/partner to a liability-bearing entity, or scale only once it is no longer a one-person operation.

If the cheap tests (Rungs 0–2) pass, the business case strengthens enormously and the platform build becomes a *justified* risk. If they fail, you will have saved many months and avoided an open-ended liability — which is exactly what a red team is for.

---

*Reviewer's note: every BLOCKER here is recoverable by re-sequencing, not by abandoning the idea. The fastest route to a confident "proceed" is to run the experiments the plan currently defers.*
