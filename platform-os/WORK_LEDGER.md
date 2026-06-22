# Work Ledger — Academy OS

Append-only record of cycles. Newest first.

## 2026-06-18 (later) — Five-round rigour pass (competitor → red-team → debate → rewrite → independent Watcher)
- **Round 1 (competitor):** `COMPETITOR_ANALYSIS.md` + `COMPETITOR_PRICING_GTM.md`. White space (development + admin combined) is real but time-boxed; `FirstWhistle`/`360Player`/`TeamSnap ONE`/`TopTekkers` closing in; centre of gravity is free-to-club.
- **Round 2 (red-team):** `RED_TEAM_SECURITY.md` (BLOCKER F1: live self-grant `is_admin`; F2 sponsor clamp UI-only; F3 `using(true)` everywhere; F4 public bucket) + `RED_TEAM_PRODUCT.md` (verdict: STOP-AND-VALIDATE-FIRST).
- **Round 3 (debate):** `DEBATE_BUILD_NOW.md` vs `DEBATE_VALIDATE_FIRST.md` → adjudicated in `DECISIONS_LOG.md` D-0: concurrent tracks, gate the *data* not the build.
- **Round 4 (rewrite):** `DEVELOPMENT_PLAN.md` §0.5 revised sequencing; remediation backlog extended R8–R12; risk register updated.
- **Round 5 (independent Watcher):** `WATCHER_REVIEW.md` → **AMBER** overall; **live site RED until F1 deployed**. Residual: doc-reconciliation debt (stale refs, GUC option vs D-2, v1/Phase-4 rollup contradiction), and ratify (not just recommend) the club-admin visibility line.
- **Corrected record:** the earlier "GREEN" below was overstated and is superseded by this AMBER. No build/deploy actions taken; F1 fix awaits operator sign-off (BLACK).
- **Next:** operator decision on Round 0 (deploy F1 fix) + Track A (demand test); then a doc-reconciliation pass to clear AMBER.

## 2026-06-18 — Planning programme produced
- **Mind:** registered objective "Academy OS — multi-tenant platform" (Architecture stage).
- **Workers (parallel):** Architecture, Data Model+RLS, Security/GDPR/Safeguarding, Commercial Readiness — each grounded in the real codebase (`supabase/*.sql`, `js/store.js`, `js/app.js`, `index.html`, `test/safeguarding.js`, `deploy/*`).
- **Authored:** `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY_GDPR_SAFEGUARDING.md`, `COMMERCIAL_READINESS.md`, `DEVELOPMENT_PLAN.md` (7-gate programme + thin-slice phases + hard isolation gate).
- **Key findings (now in remediation backlog R1–R7):** no `club_id`/`team_id` on any table; global `is_admin()` superuser; bare `using(true)` policies on `video_reflections`/`directory`/`rsvp`; public `media` Storage bucket; Caddy-vs-nginx deploy inconsistency; curriculum/sponsor content partly static in `js/data.js`.
- **Watcher:** GREEN with AMBER follow-ups (see below). No build/deploy actions taken; no BLACK actions performed.
- **Next:** operator to review plan; resolve §10 open decisions; then begin Phase 0 slice 0a (additive tenancy tables) behind the isolation gate.
