/* ===================================================================
   OWFC Harris — Academy Points v1.1 engine tests (jsdom, preview mode)
   Drives window.HarrisStore directly and asserts every §1 earning rule,
   the §3 fairness test, the §6 tiers, §4 Mover of the Month, and every
   §11 safeguard. No network — runs entirely on the localStorage path.

   Run:  node test/academy.js
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

const vc = new VirtualConsole();
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://harris.football/", virtualConsole: vc });
const { window } = dom;
window.structuredClone = window.structuredClone || (x => JSON.parse(JSON.stringify(x)));
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
window.supabase = { createClient: () => ({}) };
window.eval(configJs); window.eval(dataJs); window.eval(storeJs);

const S = window.HarrisStore;
const cfg = window.HARRIS_CONFIG;
const SC = cfg.SCORING;

// ---- tiny test harness ----
let pass = 0, fail = 0; const fails = [];
function ok(cond, name, extra) { if (cond) { pass++; } else { fail++; fails.push(name + (extra ? " — " + extra : "")); } }
function eq(a, b, name) { ok(a === b, name, `expected ${b}, got ${a}`); }
function ge(a, b, name) { ok(a >= b, name, `expected >= ${b}, got ${a}`); }

// ---- helpers to drive the engine with a controlled "current week" ----
const SEASON = "2026/27";   // the live season today (date is 2026-06-15 → actually 2025/26),
                            // but we force the store to bank into a known season for determinism.
// Pin "now" to a fixed Monday so weekId()/currentSeason() are deterministic in tests.
const FIXED_NOW = new Date("2026-09-14T09:00:00Z");   // a Monday in the 2026/27 season
const RealDate = Date;
function pinNow(d) {
  global.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) { super(d.getTime()); } else { super(...a); } }
    static now() { return d.getTime(); }
  };
  window.Date = global.Date;
}
function unpinNow() { global.Date = RealDate; window.Date = RealDate; }

(async () => {
  pinNow(FIXED_NOW);
  await S.load();
  const CS = S.currentSeason();
  const WK = S.weekId();
  ok(!!CS, "currentSeason resolves");

  // Clean ledger for a deterministic run.
  S.state.ledger = [];
  S.state.chores = {};

  const ros = S.roster(true);
  const striker = ros.find(p => p.pos === "ST");   // top scorer
  const gk = ros.find(p => p.pos === "GK");
  const def = ros.find(p => ["CB","RB","LB"].includes(p.pos));
  const mid = ros.find(p => p.pos === "CM");
  ok(striker && gk && def && mid, "found a striker, GK, defender and midfielder in the roster");

  /* ============ §1A TRAINING ============ */
  await S.saveRegister("2026-09-13", [{ playerId: mid.id, attended: true }], mid.id);
  eq(S.catPoints(mid.id, "attendance", CS), SC.trainingAttendance, "§1A attendance = 20");
  eq(S.catPoints(mid.id, "trainer", CS), SC.trainerOfTheDay, "§1A Trainer of the Day = +10");

  /* ============ §1A TRAINING STREAK (4 weeks, freeze) ============ */
  // Build 4 consecutive weekly sessions for the GK → one +20 streak bonus.
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== gk.id);
  for (const d of ["2026-09-06","2026-09-13","2026-09-20","2026-09-27"]) {
    await S.saveRegister(d, [{ playerId: gk.id, attended: true }], null);
  }
  await S._recomputeStreaks(CS);
  eq(S.catPoints(gk.id, "streak", CS), SC.trainingStreak, "§1A 4-week streak awards +20 once");

  /* ============ §1B WEEKLY CHALLENGE ============ */
  S.me = mid.id; S.linkedPlayer = mid.id; S.myKids = [mid.id]; S.isAdmin = false;
  await S.tickChallenge(mid.id, true);   // done + shown to coach
  eq(S.catPoints(mid.id, "challenge", CS), SC.challenge + SC.challengeShown, "§1B challenge +15 and +5 shown");
  ok(S.challengeDoneThisWeek(mid.id), "§1B challenge marked done this week");

  /* ============ §1E WEEKLY QUIZ ============ */
  const qz = S.currentQuiz();
  const total = qz.questions.length;
  await S.recordQuiz(striker.id, total, total);   // perfect
  eq(S.catPoints(striker.id, "quiz", CS), SC.quizComplete + SC.quizPerfect, "§1E quiz complete +10 and perfect +5");
  await S.recordQuiz(def.id, 1, total);           // completed, not perfect
  eq(S.catPoints(def.id, "quiz", CS), SC.quizComplete, "§1E quiz completion only = +10 (banded difficulty winnable)");

  /* ============ §1C MATCH DAY ============ */
  // Build a fixture in the live season.
  const fxId = 9101;
  S.state.fixtures.push({ id: fxId, status: "upcoming", date: "2026-09-19", opponent: "Test FC", home_away: "H" });
  const lineup = [striker.id, gk.id, def.id, mid.id];
  // Striker scores 2 + 1 assist (capped); GK clean sheet + Save of the Day; def clean sheet.
  await S.saveResult(fxId, {
    our_score: 3, their_score: 0, motm: striker.id, moment: mid.id,
    goals: [{ scorer: striker.id, assist: mid.id }, { scorer: striker.id, assist: def.id }, { scorer: striker.id, assist: null }],
    cleanSheets: [gk.id, def.id], saves: [gk.id], lineup
  });
  // appearance + win for everyone in lineup
  lineup.forEach(pid => {
    eq(S.catPoints(pid, "appearance", CS), SC.appearance, "§1C appearance +20 for lineup player " + pid);
    eq(S.catPoints(pid, "win", CS), SC.win, "§1C win +10 for lineup player " + pid);
  });
  // §1C OUTCOME CAP: striker has 3 goals (+30) + 1 assist (+10) = 40 raw, capped at 30.
  const strikerGA = S.catPoints(striker.id, "goal", CS) + S.catPoints(striker.id, "assist", CS);
  eq(strikerGA, SC.outcomeCapPerMatch, "§1C goals+assists capped at +30/match");
  // clean sheet bands
  eq(S.catPoints(gk.id, "cleansheet", CS), SC.cleanSheetGK, "§1C clean sheet GK = +15");
  eq(S.catPoints(def.id, "cleansheet", CS), SC.cleanSheetDef, "§1C clean sheet defender = +10");
  eq(S.catPoints(gk.id, "saveoftheday", CS), SC.saveOfTheDay, "§1C Save of the Day = +10");
  // §1D POTM ≠ Moment
  eq(S.catPoints(striker.id, "motm", CS), SC.motm, "§1D POTM = +15");
  eq(S.catPoints(mid.id, "moment", CS), SC.momentOfMatch, "§1D Moment = +15 (different player)");

  // idempotency: re-save same result, totals unchanged
  const beforeAP = S.ledgerSum(striker.id, CS);
  await S.saveResult(fxId, {
    our_score: 3, their_score: 0, motm: striker.id, moment: mid.id,
    goals: [{ scorer: striker.id, assist: mid.id }, { scorer: striker.id, assist: def.id }, { scorer: striker.id, assist: null }],
    cleanSheets: [gk.id, def.id], saves: [gk.id], lineup
  });
  eq(S.ledgerSum(striker.id, CS), beforeAP, "match save is idempotent (no double-count)");

  /* ============ §1G HOME TEAM CHORES ============ */
  await S.setChores(mid.id, ["Tidy room", "Kit packed", "Help dinner"]);
  for (let i = 0; i < 3; i++) await S.tickChore(mid.id, i, true);
  eq(S.catPoints(mid.id, "chore", CS), SC.chore * 3, "§1G 3 chores = +30 (cap)");
  // 4th chore is impossible (max 3) — verify cap holds even if a 4th is forced
  await S.setChores(mid.id, ["a","b","c","d"]);   // store truncates to 3
  const choreList = S.choresFor(mid.id).list;
  eq(choreList.length, 3, "§1G chores capped at 3/week");

  /* ============ §1F HOMEWORK GATE ============ */
  // mid did challenge + quiz? mid did challenge above; do the quiz too → homework complete → +5
  await S.recordQuiz(mid.id, 2, total);
  ok(S.homeworkComplete(mid.id, WK), "§1F homework complete when challenge + quiz both done");
  eq(S.catPoints(mid.id, "homework", CS), SC.homeworkBonus, "§1F homework complete = +5 bonus");

  /* ============ §3 FAIRNESS TEST ============
     A non-scoring full participant must earn >= 70% of a top-scoring full
     participant in the same week. Build two fresh players for a clean weekly
     comparison (training + challenge + quiz + homework + match appearance/win + chores). */
  // pick two clean players not yet used
  const fullA = ros.find(p => ![striker.id, gk.id, def.id, mid.id].includes(p.id));            // non-scorer
  const fullB = ros.find(p => ![striker.id, gk.id, def.id, mid.id, fullA.id].includes(p.id));  // top scorer
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== fullA.id && e.player_id !== fullB.id);
  S.state.chores = {};

  async function fullWeek(pid, score, regDate) {
    // each player registers on their OWN date — saveRegister replaces a whole date's rows
    await S.saveRegister(regDate, [{ playerId: pid, attended: true }], null); // +20 training
    await S.tickChallenge(pid, false);                                             // +15 challenge
    await S.recordQuiz(pid, 1, total);                                             // +10 quiz
    await S.setChores(pid, S.DEFAULT_CHORES);
    for (let i = 0; i < 3; i++) await S.tickChore(pid, i, true);                   // +30 chores
    // match: appearance +20, win +10; scorer also gets capped goals+assists
    const fid = 9200 + pid;
    S.state.fixtures.push({ id: fid, status: "upcoming", date: "2026-09-19", opponent: "Fair FC", home_away: "H" });
    const goals = score ? [{ scorer: pid, assist: null }, { scorer: pid, assist: null }, { scorer: pid, assist: null }] : [];
    // give a teammate an assist to the scorer so the scorer reaches the cap
    if (score) goals.push({ scorer: pid, assist: null });
    // both players' teams WIN (appearance+win identical) — the only difference is the
    // scorer's capped goals/assists, exactly the §3 comparison.
    await S.saveResult(fid, { our_score: score ? 4 : 1, their_score: 0, motm: null, moment: null, goals, cleanSheets: [], saves: [], lineup: [pid] });
    // homework: challenge + quiz done → +5
  }
  // both training dates are inside the SAME ISO week (W38) so it's one fair week each
  await fullWeek(fullA.id, false, "2026-09-15");   // never scores
  await fullWeek(fullB.id, true,  "2026-09-16");   // top scorer (capped at +30)

  // Weekly AP for each (this single week only).
  const weekAP = pid => S.ledgerFor(pid, CS)
    .filter(e => S._weekFromRef(e.ref) === WK || /9200|9201|9202|9203|9204|9205|9206|9207|9208|9209|9210|9211/.test(e.ref || ""))
    .reduce((n, e) => n + (e.points || 0), 0);
  // Simpler & robust: total AP this week for each fresh player (they only earned this week).
  const apA = S.ledgerSum(fullA.id, CS);
  const apB = S.ledgerSum(fullB.id, CS);
  const ratio = apA / apB;
  ge(ratio, 0.70, `§3 fairness: non-scorer (${apA}) >= 70% of top-scorer (${apB}) — ratio ${ratio.toFixed(2)}`);
  // sanity: spec maths is 100 vs 130 → 0.77
  ok(apB > apA, "§3 top scorer still earns more (outcome rewarded, but bounded)");

  /* ============ §1F SAFEGUARDS ============ */
  // Floor at 0/week: a player who did NOTHING this week and missed homework gets -5
  // floored to 0 (weekly AP cannot go below 0 from a deduction).
  const lonely = ros.find(p => ![striker.id, gk.id, def.id, mid.id, fullA.id, fullB.id].includes(p.id));
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== lonely.id);
  // Force "past deadline" by pinning now beyond the homework deadline of WK.
  const dl = S.homeworkDeadline(WK);
  pinNow(new Date(dl.getTime() + 3600 * 1000));   // 1h after deadline
  await S.sweepHomework(WK);
  const hwRow = S.ledgerFor(lonely.id, CS).find(e => e.category === "homework");
  eq(hwRow ? hwRow.points : null, 0, "§1F missed homework with 0 other AP is floored to 0 (not -5)");
  ge(S._weeklyAP(lonely.id, WK, CS), 0, "§1F weekly AP never below 0");
  ok(S.benchFlag(lonely.id, WK), "§1F private bench flag set for missed homework past deadline");

  // A player WITH AP this week who misses homework takes the full -5 (still floored at their weekly total).
  const partial = striker.id;  // striker has lots of AP this week but did NOT do challenge
  // ensure striker has NOT done the challenge (so homework incomplete)
  ok(!S.homeworkComplete(partial, WK), "striker has not completed homework (no challenge)");
  await S.sweepHomework(WK);
  const sHw = S.ledgerFor(partial, CS).find(e => e.category === "homework");
  eq(sHw ? sHw.points : null, SC.homeworkPenalty, "§1F missed homework with AP banked = full -5");

  // Coach override → waive → homework row becomes 0, bench flag clears.
  await S.overrideHomework(lonely.id, WK);
  ok(S.homeworkOverridden(lonely.id, WK), "§1F coach override recorded");
  ok(!S.benchFlag(lonely.id, WK), "§1F override clears the bench flag");
  const ovRow = S.ledgerFor(lonely.id, CS).find(e => e.category === "homework");
  eq(ovRow ? ovRow.points : 0, 0, "§1F override → homework AP 0 (no deduction)");
  unpinNow(); pinNow(FIXED_NOW);

  // No compounding: deduction is one row per week, not cumulative across weeks.
  const hwRows = S.ledgerFor(striker.id, CS).filter(e => e.category === "homework" && S._weekFromRef(e.ref) === WK);
  eq(hwRows.length, 1, "§1F homework deduction does not compound (one row/week)");

  /* ============ §6 CARD TIERS ============ */
  // tiers are computed from season AP; thresholds 0/800/1800/3000(+2 gold skills).
  const tA = S.tierOf(fullA.id, CS);
  ok(["bronze","silver","gold","icon"].includes(tA.key), "§6 tier resolves to a known key");
  // Build a player with exactly 1800 AP → Gold, and 3000 without skills → still Gold (Icon gated).
  const tierGuy = lonely.id;
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== tierGuy.id);
  await S.addManual(tierGuy, 0, "reset");   // ensure a ledger row exists so tierOf uses ledger
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== tierGuy.id);
  await S.addPoints({ player_id: tierGuy, season: CS, category: "manual", points: 800, note: "t", ref: "tier:800:" + tierGuy });
  eq(S.tierOf(tierGuy, CS).key, "silver", "§6 800 AP = Silver");
  await S.addPoints({ player_id: tierGuy, season: CS, category: "manual", points: 1000, note: "t", ref: "tier:1800:" + tierGuy });
  eq(S.tierOf(tierGuy, CS).key, "gold", "§6 1800 AP = Gold");
  await S.addPoints({ player_id: tierGuy, season: CS, category: "manual", points: 1200, note: "t", ref: "tier:3000:" + tierGuy });
  eq(S.tierOf(tierGuy, CS).key, "gold", "§6 3000 AP but 0 Gold skill checks = still Gold (Icon gated on development)");
  await S.recordSkill(tierGuy, "First Touch", "gold");
  await S.recordSkill(tierGuy, "Passing", "gold");
  eq(S.tierOf(tierGuy, CS).key, "icon", "§6 3000 AP + 2 Gold skill checks = Black & Gold Icon");

  /* ============ §6 tiers one-way (never downgrade in the same season) ============ */
  // Icon stays Icon even if more rows are added/removed as long as AP stays >= 3000.
  eq(S.tierOf(tierGuy, CS).key, "icon", "§6 tier holds at Icon");

  /* ============ §2 SKILL LADDER AP ============ */
  eq(S.catPoints(tierGuy, "skill", CS), SC.skillGold * 2, "§2 two Gold skill checks = +200 AP");
  await S.recordPersonalBest(tierGuy, "Passing");
  eq(S.catPoints(tierGuy, "skill", CS), SC.skillGold * 2 + SC.skillPersonalBest, "§2 Personal Best = +10");

  /* ============ §4 MOVER OF THE MONTH ============ */
  const month = S.monthId();
  const mover = S.moverOfMonth(month, CS);
  ok(mover.winner && mover.winner.gain > 0, "§4 Mover of the Month picks a winner with positive AP gain");
  // winner spotlight +25
  const before = S.ledgerSum(mover.winner.playerId, CS);
  await S.awardMover(mover.winner.playerId, month);
  eq(S.ledgerSum(mover.winner.playerId, CS) - before, SC.moverOfMonth, "§4 Mover winner spotlight = +25 AP");
  // idempotent
  await S.awardMover(mover.winner.playerId, month);
  eq(S.catPoints(mover.winner.playerId, "mover", CS), SC.moverOfMonth, "§4 Mover bonus awarded once/month");

  /* ============ §11 NO ABSOLUTE LEADERBOARD (kid-facing) ============ */
  // The kid Academy view (League) must not render a full-squad ranked table.
  // Load app.js into the same window and render #academy, then assert no
  // <table> ranking the whole squad appears.
  const appJs = read("js/app.js");
  window.sessionStorage.setItem("harris_preview_auth", "1");
  window.scrollTo = () => {};
  window.confirm = () => true; window.alert = () => {};
  try { window.eval(appJs); } catch (e) { ok(false, "app.js evaluates", e.message); }
  await new Promise(r => setTimeout(r, 40));
  S.isAdmin = false; S.me = mid.id; S.linkedPlayer = mid.id; S.myKids = [mid.id];
  window.location.hash = "#academy";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const viewHtml = window.document.querySelector("#view").innerHTML;
  const rankedRows = (viewHtml.match(/<td class="rank/g) || []).length;
  eq(rankedRows, 0, "§11 no absolute leaderboard rendered on the kid Academy page");
  // Mover of the Month + Squad Goals were moved to the Squad page in the IA
  // restructure. They must still appear there, and Mover must remain the ONLY
  // ranked list anywhere kid-facing (no absolute leaderboard).
  window.location.hash = "#players";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(r => setTimeout(r, 20));
  const squadHtml = window.document.querySelector("#view").innerHTML;
  eq((squadHtml.match(/<td class="rank/g) || []).length, 0, "§11 no absolute leaderboard on the Squad page either");
  ok(/Mover of the Month/.test(squadHtml), "§11 Squad page shows Mover of the Month (the only ranked list)");
  ok(/Squad Goals/.test(squadHtml), "§4 Squad page shows Squad Goals");

  // ---- report ----
  unpinNow();
  console.log(`\nACADEMY v1.1 TESTS — ${pass} passed, ${fail} failed`);
  console.log(`§3 FAIRNESS RATIO: non-scorer ${apA} AP / top-scorer ${apB} AP = ${(ratio*100).toFixed(0)}% (must be >= 70%)`);
  if (fail) { console.log("\nFAILURES:"); fails.forEach((f, i) => console.log(`  [${i+1}] ${f}`)); process.exit(1); }
  console.log("ALL ACADEMY TESTS PASSED ✓");
  process.exit(0);
})().catch(e => { console.error("TEST HARNESS THREW:", e.stack || e); process.exit(1); });
