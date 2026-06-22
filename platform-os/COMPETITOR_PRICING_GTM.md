# Competitor Pricing & Go-to-Market Analysis — Academy OS

*Market / Pricing / GTM analyst workstream · compiled 18 June 2026 · British English (£)*

> Scope: how incumbents charge, the "free incumbent" problem, viable pricing models for Academy OS, UK grassroots GTM realities, and the top commercial risks.
> All prices captured as-published with date and currency. Our own numbers are deliberately left **TBD** — this document sets the *levers and benchmarks*, not the price points. Unverified items are marked **(unverified)**.

---

## 1. How incumbents charge

The market splits into four monetisation archetypes. Understanding which archetype a competitor sits in matters more than the headline price, because it dictates *who pays* and *what we'd be competing against*.

**Archetype A — Free to clubs, monetise on payment rails.** The product is given away; revenue comes from a transaction fee skimmed on subs and match-fee collection (on top of, or inclusive of, the Stripe cost). This is the dominant and most dangerous model in UK grassroots (Spond, and partly FA Matchday). It sets the reference point that "team admin software should be free".

**Archetype B — Per-team SaaS subscription.** A flat or tiered fee per team, paid by the coach/team or the club. Free tier to acquire, paid tier to retain (TeamSnap, Heja, TeamStats). Often *also* takes a payment cut.

**Archetype C — Per-club / per-seat SaaS for clubs & academies.** A club-level base fee plus a per-user or per-player element, sold via a sales conversation. This is where the development-engine players sit (360Player, PlayMetrics, TeamSnap ONE, Pitchero's club website packages).

**Archetype D — Hardware + subscription.** Capital purchase plus recurring SaaS, monetising a distinct job-to-be-done (Veo, Playermaker). Adjacent rather than directly competitive, but relevant because clubs already spend real money here — proving grassroots *will* pay when value is concrete.

### Pricing comparison table

| Product | Archetype | Free tier? | Headline paid price (as published) | Unit (who pays) | Payment monetisation | Notes |
|---|---|---|---|---|---|---|
| **Spond** (app) | A | Yes — core is free, no member cap | £0 for management features | Free to club/coach/parent | Stripe-processed; club covers fee by default or passes to members | Effectively the default free option in UK grassroots |
| **Spond Club** | A + small SaaS | Yes (mgmt free); paid club website | Club website **£19 + VAT / month** (UK) | Per club (website add-on) | **UK transaction fee 2.5% + £0.20** per payment (incl. Stripe) | Fee page dated 3 Mar 2026 |
| **FA Matchday** | A (FA-funded) | Yes — wholly free | £0 | Free to all (coach/club/player) | Match-fee collection in-app; FA-funded, not fee-led | England Football official app; can earn facility vouchers |
| **TeamSnap** | B | Coach can start at $0 | Premium **$120/yr**, Ultra **$150/yr** (annual) | Per **team** (not per user) | Yes (TeamSnap Payments) | TeamSnap ONE (clubs/leagues) = custom/sales pricing |
| **Heja** | B | Yes — free, unlimited players/parents | Team Pro ~**£8.17/mo** (UK, unverified exact) | Per team; club multi-team via sales | Payment *tracking* in Pro; collection varies | Plans: Team Pro, Team Pro Max |
| **TeamStats** | B | Yes — free up to 15 members | Basic **$9.99**, Premium **$13.99**, Ultra **$17.99** / mo | Per team | Finance features in app | UK grassroots-focused |
| **Pitchero** | C | Limited free website | Standard / Pro club packages (price not public on pricing pg) | Per **club** (website) | **Stripe Connect from 1.84% + 17p** all-in; charity/VAT-dependent; "price-promise" to beat rivals | Fees effective 1 Jun 2025 |
| **Coacha** | C (flat) | Free trial | **£36 / month flat**, any club size | Per club (unlimited members) | **No added fee** — Stripe/GoCardless at cost, direct | Differentiates explicitly on *not* skimming payments |
| **360Player** | C (dev engine) | Demo/sales | Starter **$49/mo per club** + All-in-One **+$3/mo per user** | Per club base + **per active user** | Adyen-based payments & registration | All-in-One adds video analysis, **development plans**, content library, scouting — closest analogue to our differentiator |
| **PlayMetrics** | C (dev/registration) | No public price | Custom / sales-led | Per club / per registration (US) | Registration & payments built-in | US youth-soccer; club operating system |
| **Veo (Cam 3)** | D | No | Camera bundle **$1,299** + sub from **$42/mo**; Team **$49/mo**, Club **$149/mo** | Hardware + per-camera/club sub | n/a | Veo Go: $50 hardware + $29/mo |
| **Playermaker** | D | No | Sales-led wearable + sub | Per player/club | n/a | Performance-tracking wearable (Man City methodology) |

*Currency note: TeamSnap, TeamStats, 360Player, Veo published in USD; converted figures not applied — treat as USD benchmarks for model shape, not direct £ comparators.*

### Key reads from the table

- **"Free to the club" is the centre of gravity** in UK grassroots, anchored by Spond and FA Matchday. Both are credible, polished, and widely adopted.
- **Payment-fee monetisation is the quiet engine.** Spond's whole model is the 2.5% + £0.20 skim; Pitchero competes on having the *lowest* fee (from 1.84% + 17p); Coacha competes on charging *no* added fee at all. This means the payment-rail margin is being actively competed down — it is a contested, not a free, pool.
- **The development engine commands a sales conversation, not a self-serve price.** Every product that does real player development (360Player, PlayMetrics, and TeamSnap/Pitchero at club tier) moves off public pricing into "talk to us". That is both a signal (this is where willingness-to-pay lives) and a warning (it implies a sales motion, not pure self-serve).
- **Per-club + per-user is the established shape for our segment.** 360Player's `$49 base + $3/user` is the single most direct structural comparable to our three-tier (platform → club → team) model.

---

## 2. The "free incumbent" problem — what must be true to charge

This is the central commercial question. Spond is free *and good*; FA Matchday is free, official, and FA-funded. A new paid platform in this market is, by default, dead on arrival unless several things hold simultaneously.

**Why the free options are free (and durable):**
- **Spond** funds itself on the payment rail (2.5% + £0.20 in the UK) and the optional £19+VAT club website. It does not *need* a per-team fee, so it can keep the core free indefinitely. Its marginal cost per new team is near zero.
- **FA Matchday** is subsidised by the FA as participation infrastructure. It will never need to make money. It also owns the things only the FA can own: official suspensions data, match returns to Full-Time, affiliated-game integration. We cannot out-free it and cannot replicate its FA data hooks.

**What must be true for clubs to pay us anyway:**

1. **We sell a different job, not a cheaper version of the same job.** Scheduling, comms and payment collection are commodity and free. Our wedge is the **player-development engine** (points, evolving cards, curriculum, skill ladder, position targets). Clubs do not currently get this free anywhere credible — 360Player charges for exactly this. We must price the *development* outcome, and treat admin/comms as table stakes we give away, not the thing we charge for.

2. **The buyer is the club, not the volunteer coach.** A volunteer running one team will never pay when Spond is free. A **club** running 20–104 teams with ambitions of a coherent development pathway, a consistent curriculum, and oversight across age groups has a budget line and a reason. Our three-tier model is correctly aimed: charge the club for the *programme*, let teams ride free underneath.

3. **The value is visible to parents, because that's who retains clubs.** Evolving player cards and a development pathway are *parent-facing* retention and recruitment tools for the club. A club that can show parents a development product justifies its subs and reduces churn — that is a willingness-to-pay driver Spond does not touch.

4. **Switching cost from free is honestly acknowledged.** Clubs already have Spond data, habits, and parent adoption. We are not replacing Spond on day one; the realistic play is **coexistence** — be the development layer on top, not a rip-and-replace of comms. Forcing a full switch raises CAC enormously.

5. **Price must clear the "is this less than the hassle?" bar.** Per the FA's own strategy, by 2028 more than half of affiliated football will be in clubs with 20+ teams. For those clubs, a per-club fee in the low tens of pounds/month (cf. Coacha £36 flat; 360Player $49 + $3/user) is below the noise floor of a club budget — *if* the development value is real.

**Honest conclusion:** We cannot win on price or on commodity admin. We can only charge if the development engine is a genuinely differentiated, parent-visible, club-level outcome that has no free equivalent — and even then, the wedge customer is the multi-team club, not the lone coach.

---

## 3. Pricing-model options for Academy OS (levers, not numbers)

Five candidate models. Numbers are **TBD**; benchmarks shown are incumbent reference points for calibration only.

### Option A — Per-team licence
- **How:** Club buys N team seats; pay per active team.
- **Benchmark shape:** TeamSnap ($120–150/team/yr), Heja (~£8/mo/team), TeamStats ($10–18/mo/team).
- **Pro:** Scales naturally with club size; easy to grok; lands on the unit clubs already think in.
- **Con:** Directly comparable to free Spond at the team level — invites the "but Spond is free per team" objection. Penalises the big multi-team club we most want (104 teams × per-team fee = sticker shock).

### Option B — Per-active-player-seat
- **How:** Pay per active player profile per season.
- **Benchmark shape:** 360Player's `+$3/user`; US registration models (PlayMetrics) are effectively per-player.
- **Pro:** Aligns price to value (development is per-player); usage-based feels fair; grows with the club.
- **Con:** Counting "active" is fiddly; can get expensive fast for large clubs; parents may perceive it as a tax. Needs a clear active-seat definition and probably a cap.

### Option C — Per-club tier (banded)
- **How:** Flat fee per club, banded by number of teams/players (e.g., S/M/L bands), unlimited within band.
- **Benchmark shape:** Coacha (£36 flat any size); 360Player ($49 base); Spond Club website (£19+VAT).
- **Pro:** Predictable for the club; rewards growth within a band; simplest to sell to a volunteer committee; matches our "we licence the club" model exactly.
- **Con:** Band edges create friction; flat-per-club may underprice very large clubs unless bands go high enough.

### Option D — Freemium with paid development module
- **How:** Comms / scheduling / squad / fixtures free forever (match Spond's table stakes); charge for the **development engine** (points, cards, curriculum, skill ladder, rollup analytics).
- **Benchmark shape:** This is the 360Player split (Starter vs All-In-One) applied to our differentiator.
- **Pro:** Defuses the free-incumbent problem head-on — we give away the commodity and charge for the thing only we do. Lets a club start free and upgrade once parents are hooked. Lowest CAC.
- **Con:** Cannibalisation risk if the free tier is too good; must be disciplined about what sits behind the paywall; requires the development engine to be unambiguously the "wow".

### Option E — Payment-fee monetisation (rail skim)
- **How:** Take a transaction fee on subs/match fees collected through the platform.
- **Benchmark shape:** Spond 2.5% + £0.20; Pitchero from 1.84% + 17p; Coacha *refuses* to skim (a competitive position in itself).
- **Status for us:** **Out of scope for v1** per the brief (parent↔club payments deferred). Flagging as a *future* lever, not a launch model.
- **Pro:** Proven, "invisible" revenue; scales with club activity; can subsidise a free core later.
- **Con:** It is a *contested, shrinking* pool — Pitchero competes it down, Coacha attacks it as exploitative. We never touch card data (Stripe-hosted), so any skim is a markup on Stripe we'd have to justify. Reputationally sensitive for a youth/children's product. **Do not lead with this.**

### Recommended structural direction (for debate, not decision)
Combine **D + C**: a genuinely free commodity tier to neutralise Spond, a **paid per-club development tier** (banded by size) as the core revenue line, with **per-player (B)** as the metering lever inside larger bands. Defer **E** (payments) until parent↔club collection is in scope, and even then position it as low-fee/transparent (Pitchero/Coacha posture) rather than a Spond-style skim. **All price points TBD.**

---

## 4. Go-to-market for UK grassroots

### The distribution reality
- The market is **~18,000 FA-accredited clubs**, **~1,100 leagues**, **50 County FAs**, run by **1m+ volunteers**. (FA / House of Lords figures.)
- The decision-makers are **volunteers** — committee members, club secretaries, coaching leads — not procurement professionals. They are time-poor, varying tech skill, and motivated by reducing admin and improving the kids' experience, not by features.
- **The consolidation tailwind is real and in our favour:** the FA expects **>50% of affiliated football to be in clubs of 20+ teams by 2028**. The multi-team club — our exact buyer — is the structural growth segment.

### Viable channels (in rough order of CAC efficiency)
1. **Club-led expansion from one team (product-led, lowest CAC).** This is our strongest motion and matches the architecture. OWFC Harris (club #1, 104-team reference) proves the model; one enthusiastic coach adopts a team → the development engine is visibly better → the club rolls it across age groups. The product is the salesperson. Design every team-level experience to create internal pull toward club adoption.
2. **Word of mouth between clubs.** Grassroots is a tight, gossipy network — leagues, tournaments, touchline conversations, coach WhatsApp groups. A few lighthouse clubs in a county produce organic spread. Referral incentives are cheap and on-culture.
3. **County FAs as a credibility/distribution layer.** 50 CFAs each touch hundreds of clubs and run coach education. A CFA endorsement or inclusion in their recommended-tools list is high-trust, low-cost reach — but slow, relationship-driven, and the FA pushes its *own* free Matchday app, so positioning must be "complementary development layer", not "replace the FA app".
4. **Leagues.** League secretaries are hubs; a league standardising on a platform can pull in dozens of clubs. Harder to win but high leverage.
5. **Paid acquisition (lowest priority).** Volunteer-run, low-ACV customers make paid digital CAC hard to recover. Use sparingly for retargeting/waitlist, not as a primary engine.

### CAC concerns
- **ACV is low** (tens of £/month per club, realistically), so **CAC must be near-zero** to work — which is why product-led club-expansion and word-of-mouth must dominate. A field-sales motion would not pay back at this ACV; the dev-engine clubs (360Player/PlayMetrics) tolerate sales cost because they sell higher-ACV academy contracts, a tier we'd have to reach to justify the same.
- **Onboarding is the real CAC.** Per the brief's risk #4, 100+ volunteer coaches of varying skill means support load *is* acquisition cost. Self-serve provisioning, near-zero-effort coach onboarding, and squad import are commercial features, not just product nicety.
- **Seasonality:** grassroots buys in the pre-season window (roughly May–August). Launch, pricing changes, and outreach should be timed to the season cycle.

---

## 5. Biggest commercial risks & what would invalidate the business case

| # | Risk | Why it bites | What would invalidate the case |
|---|---|---|---|
| 1 | **Free incumbents (Spond, FA Matchday)** | They are good, free, adopted, and structurally cheaper to run. | If our development engine is *not* clearly differentiated and parent-visible, there is no reason to pay — full stop. This is the existential risk. |
| 2 | **Willingness-to-pay unproven** | Volunteer buyers, free anchor, low budgets. | If pilot clubs won't convert from a free tier to a paid development tier, the model fails. Must be tested in Phase 1–2 before scaling. |
| 3 | **Low ACV vs CAC** | Tens of £/month can't fund a sales team. | If product-led club-expansion and word-of-mouth don't drive organic growth, CAC exceeds LTV and unit economics never close. |
| 4 | **Incumbent fast-follow** | Spond/360Player could bolt on gamified development; they have distribution we lack. | If a free incumbent ships a "good enough" development feature, our wedge erodes. Our defensibility must be depth of curriculum + data + the multi-tenant club rollup, not a single feature. |
| 5 | **Payment-margin pool is contested & shrinking** | Pitchero competes fees down; Coacha attacks skimming. | If we ever rely on a Spond-style rail skim for the model to work, note it is a declining, reputationally sensitive pool — and we never touch card data, so it's a Stripe markup we must justify. |
| 6 | **FA / safeguarding & data-controller burden** | Children's data across orgs; controller/processor split; DPAs per club (brief risk #2). | Compliance cost and friction could swamp a low-ACV product. If per-club legal/onboarding overhead exceeds the fee, scaling is uneconomic. |
| 7 | **Onboarding/support load at scale** | 100+ low-skill volunteer coaches. | If onboarding isn't near-zero-effort, support cost per club exceeds revenue per club. |
| 8 | **Single-club concentration** | OWFC Harris is reference + first revenue. | If we can't replicate beyond the founding club, there is no market, only a bespoke tool. Phase 1's 2–3 external clubs are the real go/no-go. |

**The one-line invalidation test:** *If a multi-team club, shown the development engine, still won't pay because "Spond does enough for free", the business case is invalid.* Everything in GTM should be engineered to put that question in front of real clubs as early and cheaply as possible.

---

## Sources

All URLs accessed 18 June 2026 unless a page-publication date is noted.

- Spond Club — transaction fee (UK 2.5% + £0.20; page dated 3 Mar 2026): https://help.spond.com/club/en/articles/58192-what-is-the-transaction-fee-in-spond-club
- Spond App — payment costs: https://help.spond.com/app/en/articles/118091-payments-costs-in-the-spond-app
- Spond Club — website pricing by country (£19+VAT/mo UK): https://help.spond.com/club/en/articles/179796-website-pricing-by-country
- Spond — free payments app blog: https://www.spond.com/news-and-blog/free-app-for-sports-club-payments/
- TeamSnap — pricing ($120 Premium / $150 Ultra annual; per-team): https://www.teamsnap.com/pricing
- TeamSnap — plan pricing change FAQ: https://helpme.teamsnap.com/article/1791-plan-pricing-change-faqs
- Heja — pricing (free + Team Pro / Team Pro Max): https://heja.io/pricing
- Heja — free vs Team Pro: https://help.heja.io/en/articles/3727834-heja-free-vs-team-pro
- Pitchero — UK transaction fees (Stripe from 1.84% + 17p; effective 1 Jun 2025): https://help.pitchero.com/knowledge/pitchero-club-website/payment-tools/uk-transaction-fees
- Pitchero — pricing: https://www.pitchero.com/pricing
- Pitchero — payments features / fee guarantee: https://www.pitchero.com/features/payments
- Veo — pricing (Cam 3 bundle $1,299; subs $42/$49/$149; Veo Go $50 + $29/mo): https://www.veo.com/en-us/pricing
- Veo — subscription plans overview: https://support.veo.com/hc/en-us/articles/4450464075025-Overview-of-Veo-subscription-plans-features-and-entitlements-included
- Playermaker — performance tracker: https://www.playermaker.com/
- FA Matchday — England Football (free, FA-funded, match-fee collection, facility vouchers): https://www.englandfootball.com/participate/leagues-and-clubs/helpful-apps-and-websites/matchday
- FA Matchday — The FA: http://www.thefa.com/get-involved/matchday
- TeamStats — site (free to 15 members; Basic $9.99 / Premium $13.99 / Ultra $17.99): https://www.teamstats.net/
- TeamStats — Capterra UK pricing: https://www.capterra.co.uk/software/172849/teamstats
- Coacha — UK pricing (£36/mo flat, no added payment fee): https://www.coacha.co.uk/Pricing/Pricing-UK
- 360Player — pricing ($49/mo base + $3/mo per user; All-In-One adds development plans/video/scouting): https://www.360player.com/pricing
- 360Player — Adyen payment model: https://www.360player.com/press/unbeatable-value-meets-transparent-pricing-360player-adyen-launch-industry-leading-payment-model
- PlayMetrics — pricing (sales-led): https://home.playmetrics.com/pricing
- PlayMetrics — clubs: https://home.playmetrics.com/clubs
- FA — grassroots strategy 2024–2028 (>50% of affiliated football in 20+ team clubs by 2028): https://www.englandfootball.com/play/stories/grassroots-strategy-2024-2028
- House of Lords Library — non-league & grassroots football (~18,000 clubs, ~1,100 leagues): https://lordslibrary.parliament.uk/non-league-and-grassroots-football-what-is-the-state-of-play/
- England Football — County FAs (50 CFAs): https://www.englandfootball.com/participate/leagues-and-clubs/county-football-associations
- The FA — 11 million+ playing football in England: https://www.thefa.com/news/2015/jun/10/11-million-playing-football-in-england

### TBD / unverified items
- **Our actual price points** — all TBD; this doc sets levers and benchmarks only.
- **Heja Team Pro exact UK £ price** — ~£8.17/mo reported via aggregator; not confirmed on Heja's own pricing page **(unverified)**.
- **Pitchero Standard/Pro package £ prices** — not publicly listed on the pricing page at time of access **(TBD — request quote)**.
- **TeamSnap ONE / PlayMetrics / Playermaker** — sales-led, no public pricing **(TBD — request quote)**.
- **USD-published figures** (TeamSnap, TeamStats, 360Player, Veo) — treated as model-shape benchmarks, not £ comparators; FX not applied.
- **"Club Companion"** — no clearly matching UK product/pricing found in search; possibly a regional/white-label reseller. **(unverified — needs direct identification)**.
