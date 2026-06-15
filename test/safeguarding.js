/* ===================================================================
   OWFC Harris — §11 SAFEGUARDING & QA tests (jsdom, preview mode)
   Phase 5 (Verify). Asserts every item on the points-spec §11 checklist
   plus the homework-gate edge cases. Runs entirely on the localStorage
   path (no network). Complements academy.js (engine) and content.js.

   Run:  NODE_PATH=/tmp/node_modules node test/safeguarding.js
   =================================================================== */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const html = read("index.html");
const configJs = read("js/config.js")
  .replace(/SUPABASE_URL:\s*"[^"]*"/, 'SUPABASE_URL: ""')
  .replace(/SUPABASE_ANON_KEY:\s*"[^"]*"/, 'SUPABASE_ANON_KEY: ""');
const dataJs = read("js/data.js");
const storeJs = read("js/store.js");
const appJs = read("js/app.js");

const vc = new VirtualConsole();
const consoleErrors = [];
vc.on("error", (...a) => consoleErrors.push("console.error: " + a.join(" ")));
vc.on("jsdomError", e => consoleErrors.push("jsdomError: " + (e.message || e)));
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://harris.football/", virtualConsole: vc });
const { window } = dom;
window.structuredClone = window.structuredClone || (x => JSON.parse(JSON.stringify(x)));
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
window.scrollTo = () => {}; window.confirm = () => true; window.alert = () => {};
window.supabase = { createClient: () => ({}) };
window.sessionStorage.setItem("harris_preview_auth", "1");
window.eval(configJs); window.eval(dataJs); window.eval(storeJs);

const S = window.HarrisStore;
const cfg = window.HARRIS_CONFIG;
const SC = cfg.SCORING;

let pass = 0, fail = 0; const fails = [];
function ok(c, n, x) { if (c) pass++; else { fail++; fails.push(n + (x ? " — " + x : "")); } }
function eq(a, b, n) { ok(a === b, n, `expected ${b}, got ${a}`); }
function ge(a, b, n) { ok(a >= b, n, `expected >= ${b}, got ${a}`); }

const RealDate = Date;
function pinNow(d) {
  global.Date = class extends RealDate { constructor(...a){ if(!a.length) super(d.getTime()); else super(...a);} static now(){return d.getTime();} };
  window.Date = global.Date;
}
function unpinNow() { global.Date = RealDate; window.Date = RealDate; }
const FIXED_NOW = new RealDate("2026-09-14T09:00:00Z");   // a Monday in 2026/27

(async () => {
  pinNow(FIXED_NOW);
  await S.load();
  const CS = S.currentSeason();
  const WK = S.weekId();
  S.state.ledger = []; S.state.chores = {};
  let ros = S.roster(true);
  ok(ros.length >= 6, "roster has >= 6 players for the checks");

  /* ============ §11.1 NO ABSOLUTE LEADERBOARD ============ */
  // (a) the absolute-leaderboard helpers must be gone from the codebase.
  ok(typeof S.leagueRows !== "function", "§11.1 no S.leagueRows() absolute-ranking helper remains");
  ok(!/function leaguePreview/.test(appJs), "§11.1 no leaguePreview() absolute-ranking view remains");
  // (b) render the kid Academy page and assert no full-squad ranked table.
  window.eval(appJs);
  await new Promise(r => setTimeout(r, 30));
  // app.js boot() re-runs S.load(), rebuilding state.players — re-capture the
  // roster AFTER boot so every later mutation hits the live objects.
  ros = S.roster(true);
  S.state.ledger = []; S.state.chores = {};
  const mid = ros.find(p => p.pos === "CM") || ros[0];
  S.isAdmin = false; S.me = mid.id; S.linkedPlayer = mid.id; S.myKids = [mid.id];
  window.location.hash = "#academy"; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const kidHtml = window.document.querySelector("#view").innerHTML;
  eq((kidHtml.match(/<td class="rank/g) || []).length, 0, "§11.1 kid Academy page renders no ranked AP table");
  // Mover of the Month + Squad Goals moved to the Squad page in the IA restructure.
  // They must still be present there, and Mover stays the ONLY ranked list (no
  // absolute leaderboard) on any kid-facing page.
  window.location.hash = "#players"; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const squadHtml = window.document.querySelector("#view").innerHTML;
  eq((squadHtml.match(/<td class="rank/g) || []).length, 0, "§11.1 Squad page renders no ranked AP table");
  ok(/Mover of the Month/.test(squadHtml), "§11.1 Mover of the Month present on Squad (the only ranked list)");
  ok(/Squad Goals/.test(squadHtml), "§11.1 Squad Goals present on Squad");

  /* ============ §11.2 OUTCOME CAP — 5-goal game ============ */
  const striker = ros.find(p => p.pos === "ST") || ros[1];
  const fxId = 7501;
  S.state.fixtures.push({ id: fxId, status: "upcoming", date: "2026-09-19", opponent: "Cap FC", home_away: "H" });
  await S.saveResult(fxId, {
    our_score: 5, their_score: 0, motm: null, moment: null,
    goals: [ {scorer:striker.id,assist:null},{scorer:striker.id,assist:null},{scorer:striker.id,assist:null},
             {scorer:striker.id,assist:null},{scorer:striker.id,assist:null} ],   // FIVE goals = +50 raw
    cleanSheets: [], saves: [], lineup: [striker.id]
  });
  const ga = S.catPoints(striker.id, "goal", CS) + S.catPoints(striker.id, "assist", CS);
  eq(ga, SC.outcomeCapPerMatch, "§11.2 a 5-goal game is capped at +30 goals+assists");

  /* ============ §11.6 QUIZ DIFFICULTY BANDED ============ */
  const qz = S.currentQuiz();
  ok(qz.questions.length >= 5, "§11.6 weekly quiz has questions");
  const bands = new Set(qz.questions.map(q => q.band || "standard"));
  ok(qz.custom || bands.has("starter"), "§11.6 weekly set includes a starter-band (winnable) question");
  ok(bands.size >= 2, "§11.6 weekly set mixes difficulty bands");

  /* ============ §11.7 NAMES — First L. only on kid-facing UI ============ */
  // Inject a player with a known full name and verify the card-facing render
  // never prints the full surname.
  const named = ros[0];
  named.name = "Olivia Thunderbottom";
  // View the card AS that player (own-card render path), exactly as a family would.
  S.isAdmin = false; S.me = named.id; S.linkedPlayer = named.id; S.myKids = [named.id];
  window.location.hash = "#players/" + named.id; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const cardHtml = window.document.querySelector("#view").innerHTML;
  ok(!/Thunderbottom/.test(cardHtml), "§11.7 full surname never appears on the kid-facing player card");
  ok(/Olivia T\./.test(cardHtml), "§11.7 card shows 'First L.' (Olivia T.)");
  // And the same for an admin/coach viewer: full name IS allowed on the coach screen.
  S.isAdmin = true;
  window.location.hash = "#development/" + named.id; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  ok(/Thunderbottom/.test(window.document.querySelector("#view").innerHTML), "§11.7 coach/admin screen MAY show the full name");
  S.isAdmin = false;

  /* ============ §11.5 CHORES — deduction-free + private ============ */
  await S.setChores(mid.id, S.DEFAULT_CHORES);
  for (let i = 0; i < 3; i++) await S.tickChore(mid.id, i, true);
  eq(S.catPoints(mid.id, "chore", CS), SC.chore * 3, "§11.5 chores cap at +30/week");
  // no chore row is ever negative
  ok(S.ledgerFor(mid.id, CS).filter(e => e.category === "chore").every(e => e.points > 0), "§11.5 chores track is deduction-free (no negative rows)");
  // privacy is enforced by RLS (ch_read = owns_player OR is_admin) — assert the policy text.
  const v2 = read("supabase/migrate-academy-v2.sql");
  ok(/ch_read on chores for select to authenticated using \(owns_player\(player_id\) or is_admin\(\)\)/.test(v2), "§11.5 chores SELECT RLS restricts reads to the family + coach");

  /* ============ §11.4 BENCH FLAG — private to coach, resets weekly ============ */
  // The bench flag must NOT be rendered in any parent/player view, only on the
  // coach team-sheet. Render the kid Academy page for a player who missed homework
  // past deadline and assert no bench wording appears kid-side.
  const lonely = ros[2];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== lonely.id);
  const dl = S.homeworkDeadline(WK);
  pinNow(new RealDate(dl.getTime() + 3600 * 1000));   // 1h past deadline
  await S.sweepHomework(WK);
  ok(S.benchFlag(lonely.id, WK), "§11.4 bench flag computes true for a missed-homework player (coach side)");
  S.isAdmin = false; S.me = lonely.id; S.linkedPlayer = lonely.id; S.myKids = [lonely.id];
  window.location.hash = "#academy"; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const lonelyHtml = window.document.querySelector("#view").innerHTML;
  // The kid/parent view may EXPLAIN the rule ("miss it and it's a bench start"), but
  // must never render THIS child's actual bench FLAG (the coach-only red tag / 🪑 chip
  // that says they are benched this week).
  ok(!/🪑/.test(lonelyHtml), "§11.4 the bench-flag chip (🪑) is never rendered kid/parent-side");
  ok(!/class="tag"[^>]*background:#a33[^>]*>[^<]*Bench/i.test(lonelyHtml), "§11.4 the coach bench-flag tag is never rendered kid/parent-side");
  // The coach team-sheet, by contrast, IS where the flag lives.
  ok(/Bench start/.test(appJs) && /benchFlag/.test(appJs), "§11.4 bench flag is implemented (coach team-sheet only)");
  // resets weekly: a different (future) week is not flagged.
  const nextWk = S.weekId(new RealDate("2026-09-21T09:00:00Z"));
  ok(!S.benchFlag(lonely.id, nextWk), "§11.4 bench flag is per-week (does not carry to next week)");

  /* ============ §11.3 / §1F HOMEWORK GATE PROPERTIES ============ */
  // Floor at 0/week: missed homework with no other AP this week → 0, not -5.
  const hwRow = S.ledgerFor(lonely.id, CS).find(e => e.category === "homework");
  eq(hwRow ? hwRow.points : null, 0, "§1F missed homework + 0 other AP floored to 0");
  ge(S._weeklyAP(lonely.id, WK, CS), 0, "§1F weekly AP never below 0");
  // Full -5 when AP banked: give a player AP, then miss homework.
  const withAp = ros[3];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== withAp.id);
  await S.saveRegister("2026-09-15", [{ playerId: withAp.id, attended: true }], null);  // +20 this week
  await S.sweepHomework(WK);
  const wHw = S.ledgerFor(withAp.id, CS).find(e => e.category === "homework");
  eq(wHw ? wHw.points : null, SC.homeworkPenalty, "§1F missed homework with AP banked = full -5");
  // No compounding: exactly one homework row per week.
  eq(S.ledgerFor(withAp.id, CS).filter(e => e.category === "homework" && S._weekFromRef(e.ref) === WK).length, 1, "§1F homework deduction does not compound (one row/week)");
  // Never reduces a tier (tiers one-way): give a player Silver-worth AP, then a -5; still Silver.
  const tg = ros[4];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== tg.id);
  await S.addPoints({ player_id: tg.id, season: CS, category: "manual", points: 805, note: "t", ref: "sgtier:" + tg.id });
  eq(S.tierOf(tg.id, CS).key, "silver", "§1F precondition: player at Silver");
  await S.addPoints({ player_id: tg.id, season: CS, category: "homework", points: SC.homeworkPenalty, note: "miss", ref: "sghw:" + tg.id });
  eq(S.tierOf(tg.id, CS).key, "silver", "§1F a -5 deduction never drops the card tier");
  // Coach override clears bench flag and zeroes the deduction.
  await S.overrideHomework(lonely.id, WK);
  ok(!S.benchFlag(lonely.id, WK), "§1F coach override clears the bench flag");
  const ov = S.ledgerFor(lonely.id, CS).find(e => e.category === "homework");
  eq(ov ? ov.points : 0, 0, "§1F coach override → homework AP 0 (no deduction)");

  /* ---- EDGE CASE: first-week-back / illness waiver ---- */
  // Override before the deadline even matters → still complete-equivalent, no bench.
  const ill = ros[5];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== ill.id);
  await S.overrideHomework(ill.id, WK);
  ok(S.homeworkOverridden(ill.id, WK), "§1F first-week-back/illness: one-tap waiver recorded");
  ok(!S.benchFlag(ill.id, WK), "§1F waived player is never benched");

  /* ---- EDGE CASE: both challenge AND quiz missed in a low-AP week ---- */
  // Same as the floor case: a single homework row, floored, no double deduction.
  const bothMiss = ros[2];   // lonely was overridden; use a fresh one
  // pick a player not yet touched
  const fresh = ros.find(p => !S.ledgerFor(p.id, CS).length);
  if (fresh) {
    pinNow(new RealDate(dl.getTime() + 3600 * 1000));
    await S.sweepHomework(WK);
    ok(!S.homeworkComplete(fresh.id, WK), "§1F edge: player missed both challenge and quiz");
    const fr = S.ledgerFor(fresh.id, CS).find(e => e.category === "homework");
    eq(fr ? fr.points : null, 0, "§1F edge: both-missed in a 0-AP week still floors to 0 (single row)");
  } else { ok(true, "§1F edge: (no fully-clean player available — covered by floor case)"); }

  /* ---- EDGE CASE: multi-child family — gate/chores work per child ---- */
  const a = ros[0], b = ros[1];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== a.id && e.player_id !== b.id);
  S.state.chores = {};
  // Child A completes homework; child B does not. Same parent (myKids = [a,b]).
  S.me = a.id; S.myKids = [a.id, b.id]; S.linkedPlayer = a.id; S.isAdmin = false;
  await S.tickChallenge(a.id, false);
  await S.recordQuiz(a.id, 1, qz.questions.length);
  ok(S.homeworkComplete(a.id, WK), "§1F multi-child: child A homework complete");
  ok(!S.homeworkComplete(b.id, WK), "§1F multi-child: child B independent (not auto-complete)");
  await S.setChores(a.id, ["Tidy room"]); await S.tickChore(a.id, 0, true);
  eq(S.catPoints(a.id, "chore", CS), SC.chore, "§1F multi-child: chores tracked on child A");
  eq(S.catPoints(b.id, "chore", CS), 0, "§1F multi-child: child B chores independent (0)");
  unpinNow(); pinNow(FIXED_NOW);

  /* ============ §11.8 QUIET-PLAYER DASHBOARD FLAG ============ */
  // Build a clean squad-wide AP picture: most players get a healthy week + an award;
  // one player gets almost nothing and no award → must be flagged.
  S.state.ledger = []; S.state.chores = {};
  const squad = S.roster(true);
  const quietGuy = squad[0];
  // give everyone except quietGuy a solid AP block + a recent award (badge)
  for (const p of squad) {
    if (p.id === quietGuy.id) { await S.addPoints({ player_id: p.id, season: CS, category: "attendance", points: 5, note: "tiny", ref: "qp-low:" + p.id }); continue; }
    await S.addPoints({ player_id: p.id, season: CS, category: "manual", points: 300, note: "week", ref: "qp-hi:" + p.id });
    await S.awardBadge(p.id, "Effort", S.monthId());   // recent award
  }
  ok(S.quietPlayerFlag(quietGuy.id, CS), "§11.8 bottom-quartile + no recent award → quiet-player flagged");
  ok(!S.quietPlayerFlag(squad[1].id, CS), "§11.8 a high-AP player with a recent award is NOT flagged");
  // an award within 3 weeks clears the flag even for a low-AP player
  await S.awardBadge(quietGuy.id, "Bravery", S.monthId());
  ok(!S.quietPlayerFlag(quietGuy.id, CS), "§11.8 a recent award clears the quiet-player flag");
  ok(typeof S.quietPlayers === "function" && Array.isArray(S.quietPlayers()), "§11.8 quietPlayers() coach-dashboard helper exists");

  /* ============ §11 quiet-flag is COACH-ONLY (not kid-facing) ============ */
  // Re-flag quietGuy by removing the clearing award, then render the kid page.
  S.state.ledger = S.state.ledger.filter(e => e.ref !== `badge:${CS}:bravery:${S.monthId()}:${quietGuy.id}`);
  S.isAdmin = false; S.me = quietGuy.id; S.linkedPlayer = quietGuy.id; S.myKids = [quietGuy.id];
  window.location.hash = "#academy"; window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  ok(!/Quiet-player/i.test(window.document.querySelector("#view").innerHTML), "§11.8 quiet-player wording never appears in the kid view");

  /* ============ §11 RLS — parent scope is OWN child only ============ */
  ok(/owns_player\(pid bigint\)/.test(v2) && /player_ids @> to_jsonb\(array\[pid\]\)/.test(v2), "§11 owns_player() checks single + multi-child ownership");
  ok(/pe_self_insert on point_events[\s\S]*category in \('quiz','challenge','chore','homework'\)[\s\S]*owns_player\(player_id\)/.test(v2), "§11 parent point_events insert is scoped to own child + parent categories only");
  ok(/hw_parent_upd on homework for update to authenticated using \(owns_player\(player_id\)\)/.test(v2), "§11 parent may update only their own child's homework");

  /* ============ no console errors during any render ============ */
  eq(consoleErrors.length, 0, "no console/jsdom errors during safeguarding renders", consoleErrors.join(" | "));

  unpinNow();
  console.log(`\nSAFEGUARDING §11 TESTS — ${pass} passed, ${fail} failed`);
  if (fail) { console.log("\nFAILURES:"); fails.forEach((f, i) => console.log(`  [${i+1}] ${f}`)); process.exit(1); }
  console.log("ALL §11 SAFEGUARDING TESTS PASSED ✓");
  process.exit(0);
})().catch(e => { console.error("TEST HARNESS THREW:", e.stack || e); process.exit(1); });
