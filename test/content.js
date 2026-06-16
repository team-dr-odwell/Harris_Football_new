/* ===================================================================
   OWFC Harris — Phase 4 CONTENT tests (jsdom, preview mode)
   Drives window.HarrisStore directly and asserts the four Phase 4 builds:
     1. Skill Ladder reader + coach checks + Icon gate (§2/§6)
     2. Weekly Challenge library four-corner rotation (§1B)
     3. Weekly Quiz curriculum — four corners + laws + club + difficulty bands (§1E)
     4. Mini-IDPs — exactly 2 focus areas/half-term, one Technical (§5)

   Run:  node test/content.js
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

const vc = new VirtualConsole();
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://harris.football/", virtualConsole: vc });
const { window } = dom;
window.structuredClone = window.structuredClone || (x => JSON.parse(JSON.stringify(x)));
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
window.supabase = { createClient: () => ({}) };
window.eval(configJs); window.eval(read("js/data.js")); window.eval(read("js/store.js"));

const S = window.HarrisStore;
const cfg = window.HARRIS_CONFIG;
const SC = cfg.SCORING;

let pass = 0, fail = 0; const fails = [];
function ok(cond, name, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? " — " + extra : "")); } }
function eq(a, b, name) { ok(a === b, name, `expected ${b}, got ${a}`); }
function ge(a, b, name) { ok(a >= b, name, `expected >= ${b}, got ${a}`); }

const FIXED_NOW = new Date("2026-09-14T09:00:00Z");   // a Monday in 2026/27
const RealDate = Date;
function pinNow(d) { global.Date = class extends RealDate { constructor(...a){ if(!a.length) super(d.getTime()); else super(...a);} static now(){return d.getTime();} }; window.Date = global.Date; }

(async () => {
  pinNow(FIXED_NOW);
  await S.load();
  const CS = S.currentSeason();
  S.state.ledger = [];
  const ros = S.roster(true);
  const p = ros[0];

  /* ============ 2. WEEKLY CHALLENGE LIBRARY (§1B) ============ */
  const lib = (S.state.exercises || []).filter(x => x.weekly !== false);
  ge(lib.length, 4, "§1B challenge library has at least 4 weeks");
  const corners = ["technical","ball","physical","game"];
  corners.forEach(c => ok(lib.some(x => x.corner === c), "§1B library covers corner: " + c));
  lib.forEach((x,i) => {
    ok(!!x.name && !!x.desc, "§1B challenge #" + (i+1) + " has a title + kid-friendly description");
    ok(!!x.skillToShow, "§1B challenge #" + (i+1) + " has a 'show the coach' skill for the +5 bonus");
  });
  // Rotation: across any 4 weeks the four corners each appear exactly once, in the
  // canonical cyclic order technical→ball→physical→game (the absolute starting
  // corner depends on the ISO week, but the cycle order must hold).
  const rot = S.challengeRotation(4).map(r => r.challenge.corner);
  eq(new Set(rot).size, 4, "§1B 4-week rotation covers all four corners once each");
  const startIdx = corners.indexOf(rot[0]);
  const expectedCycle = corners.slice(startIdx).concat(corners.slice(0, startIdx));
  eq(rot.join(","), expectedCycle.join(","), "§1B rotation follows the FA corner cycle (tech→ball→phys→game)");
  // weeklyChallenge() returns a single challenge and it matches the rotation head.
  ok(S.weeklyChallenge() && S.weeklyChallenge().corner === rot[0], "§1B weeklyChallenge picks this week's corner");
  // tickChallenge still banks +15/+5 and is idempotent (didn't break Phase 3).
  await S.tickChallenge(p.id, true);
  eq(S.catPoints(p.id, "challenge", CS), SC.challenge + SC.challengeShown, "§1B challenge +15 +5 shown still works");
  await S.tickChallenge(p.id, true);
  eq(S.catPoints(p.id, "challenge", CS), SC.challenge + SC.challengeShown, "§1B tickChallenge idempotent (no double-count)");

  /* ============ 3. WEEKLY QUIZ CURRICULUM (§1E) ============ */
  const bank = S.state.quizBank || [];
  ge(bank.length, 40, "§1E quiz bank is healthy in size");
  ok(bank.every(q => q.band), "§1E every question carries a difficulty band");
  ["starter","standard","stretch"].forEach(b => ok(bank.some(q => q.band === b), "§1E bank has a '" + b + "' band"));
  // four corners on skill questions
  ["technical","physical","psychological","social"].forEach(c =>
    ok(bank.some(q => q.cat === "skill" && q.corner === c), "§1E skill questions cover corner: " + c));
  // laws + club knowledge present
  ok(bank.some(q => q.cat === "foot" && q.topic === "laws"), "§1E bank covers laws of the game");
  ok(bank.some(q => q.cat === "foot" && q.topic === "club"), "§1E bank covers club knowledge");
  ok(bank.some(q => q.cat === "foot" && q.topic === "game") || bank.some(q => q.cat === "skill"), "§1E bank covers game understanding / four corners");
  // weekly pick MIXES bands (not all one band) so every reading level can score.
  const qz = S.currentQuiz();
  const bands = new Set(qz.questions.map(q => q.band || "standard"));
  ge(bands.size, 2, "§1E weekly pick mixes at least 2 difficulty bands");
  ok(qz.questions.length > 0, "§1E currentQuiz returns questions");
  // every answer index is valid (auto-mark safety) and every wrong path has a fallback explanation
  ok(qz.questions.every(q => q.answer >= 0 && q.answer < q.opts.length), "§1E every question has a valid correct-answer index");
  // coverage helper works
  const cov = S.quizCoverage();
  ok(cov.total === bank.length && cov.band.starter > 0, "§1E quizCoverage reports the bank by tag");
  // auto-mark + perfect still bank AP (Phase 3 not broken)
  await S.recordQuiz(p.id, qz.questions.length, qz.questions.length);
  eq(S.catPoints(p.id, "quiz", CS), SC.quizComplete + SC.quizPerfect, "§1E quiz complete +10 perfect +5 still works");

  /* ============ 1. SKILL LADDER (§2) + ICON GATE (§6) ============ */
  ok(Array.isArray(S.SKILL_TRACKS) && S.SKILL_TRACKS.length === 6, "§2 six skill tracks defined");
  const sp = ros[1];
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== sp.id);
  let lad = S.skillLadder(sp.id);
  ok(S.SKILL_TRACKS.every(t => lad[t].level === null), "§2 a fresh player has no levels (private, blank)");
  await S.recordSkill(sp.id, "First Touch", "bronze");
  eq(S.skillLevelOf(sp.id, "First Touch"), "bronze", "§2 Bronze check sets level to bronze");
  eq(S.catPoints(sp.id, "skill", CS), SC.skillBronze, "§2 Bronze = +25 AP");
  await S.recordSkill(sp.id, "First Touch", "silver");
  eq(S.skillLevelOf(sp.id, "First Touch"), "silver", "§2 Silver check raises level to silver");
  eq(S.catPoints(sp.id, "skill", CS), SC.skillBronze + SC.skillSilver, "§2 Silver = +50 AP (additive per level)");
  await S.recordSkill(sp.id, "First Touch", "silver");
  eq(S.catPoints(sp.id, "skill", CS), SC.skillBronze + SC.skillSilver, "§2 re-tapping a level is idempotent");
  await S.recordPersonalBest(sp.id, "First Touch");
  eq(S.skillLadder(sp.id)["First Touch"].pbs, 1, "§2 Personal Best recorded on the track");
  eq(S.catPoints(sp.id, "skill", CS), SC.skillBronze + SC.skillSilver + SC.skillPersonalBest, "§2 Personal Best = +10 AP");

  // Icon gate: 3000 AP requires 2 Gold checks (§6) — verify the ladder feeds it.
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== sp.id);
  await S.addPoints({ player_id: sp.id, season: CS, category: "manual", points: 3000, note: "t", ref: "tg:" + sp.id });
  eq(S.tierOf(sp.id, CS).key, "gold", "§6 3000 AP, 0 Gold checks → still Gold (Icon gated on the ladder)");
  await S.recordSkill(sp.id, "First Touch", "gold");
  await S.recordSkill(sp.id, "Passing", "gold");
  eq(S.skillGoldCount(sp.id, CS), 2, "§2 two Gold checks counted");
  eq(S.tierOf(sp.id, CS).key, "icon", "§6 3000 AP + 2 Gold checks → Icon (ladder connects to the gate)");

  /* ============ 4. FOCUS AREAS (Mini-IDP) FULLY REMOVED ============ */
  const ip = ros[2];
  ok(typeof S.idpFor !== "function", "focus areas gone: store.idpFor removed");
  ok(typeof S.saveIdp !== "function", "focus areas gone: store.saveIdp removed");
  ok(typeof S.idpNeedsRefresh !== "function", "focus areas gone: store.idpNeedsRefresh removed");
  ok(typeof S.setIdpFeedback !== "function", "focus areas gone: store.setIdpFeedback removed");
  ok(!S.IDP_CORNERS, "focus areas gone: IDP_CORNERS removed");

  /* ============ NEW: video reflection → +5% dev (AUTOMATED, idempotent) ============ */
  // Map check: each topic maps to the right DEV area.
  eq(S.devAreaForVideo({ folder: "Passing", title: "Pass & Move" }), "passing", "map: Passing → passing");
  eq(S.devAreaForVideo({ folder: "Shooting", title: "Finishing" }), "shooting", "map: Shooting → shooting");
  eq(S.devAreaForVideo({ folder: "Close control", title: "x" }), "dribbling", "map: Close control → dribbling");
  eq(S.devAreaForVideo({ folder: "Ball mastery", title: "x" }), "dribbling", "map: Ball mastery → dribbling");
  eq(S.devAreaForVideo({ folder: "Defending", title: "x" }), "defending", "map: Defending → defending");
  eq(S.devAreaForVideo({ folder: "Goalkeeping", title: "x" }), "defending", "map: Goalkeeping → defending");
  eq(S.devAreaForVideo({ folder: "Fitness", title: "x" }), "fitness", "map: Fitness → fitness");
  eq(S.devAreaForVideo({ folder: "Movement", title: "x" }), "teamwork", "map: Movement → teamwork");
  eq(S.devAreaForVideo({ folder: "Communication", title: "x" }), "teamwork", "map: Communication → teamwork");

  // A reflection with a valid comment awards +5% to the mapped area ONCE.
  ip.dev = { ...(ip.dev || {}), passing: 40 };
  const vidP = { id: 77001, url: "https://youtu.be/passingvid1", folder: "Passing", title: "Pass & Move" };
  let rr = await S.submitReflection(ip.id, vidP, "I learned to pass and move into space");
  ok(rr.ok && rr.awarded, "reflection: valid comment is awarded");
  eq(rr.area, "passing", "reflection: awarded to the mapped area (passing)");
  eq(S.player(ip.id).dev.passing, 45, "reflection: +5% applied to passing (40 → 45)");
  // Idempotent — a second reflection on the SAME video does NOT award again.
  rr = await S.submitReflection(ip.id, vidP, "Watched it again, same lesson really");
  ok(rr.ok && !rr.awarded && rr.dup, "reflection: idempotent (no second award for same video)");
  eq(S.player(ip.id).dev.passing, 45, "reflection: dev unchanged on duplicate submit");
  // Trivial comment (< 15 chars) is rejected — no award.
  const vidS = { id: 77002, url: "https://youtu.be/shootvid1", folder: "Shooting", title: "Finishing" };
  rr = await S.submitReflection(ip.id, vidS, "ok");
  ok(!rr.ok, "reflection: trivial comment (<15 chars) rejected");
  ok(!S.hasReflected(ip.id, vidS), "reflection: trivial comment leaves no reflection");
  // Cap at 100.
  ip.dev.dribbling = 98;
  const vidD = { id: 77003, url: "https://youtu.be/dribvid1", folder: "Close control", title: "Control" };
  rr = await S.submitReflection(ip.id, vidD, "Keep the ball close with small touches");
  eq(S.player(ip.id).dev.dribbling, 100, "reflection: +5% capped at 100 (98 → 100)");

  /* ============ NEW: training attendance → +5% lowest dev area (idempotent) ============ */
  const ap = ros[3];
  ap.dev = { passing: 50, shooting: 50, dribbling: 50, defending: 20, fitness: 50, teamwork: 50 };
  S.state.ledger = S.state.ledger.filter(e => e.player_id !== ap.id);
  S.state.devAttendanceMarks = {};
  await S.saveRegister("2026-11-02", [{ playerId: ap.id, attended: true }], null);
  eq(S.player(ap.id).dev.defending, 25, "attendance: +5% to the LOWEST area (defending 20 → 25)");
  // Idempotent — re-running the same register does NOT double-award.
  await S.saveRegister("2026-11-02", [{ playerId: ap.id, attended: true }], null);
  eq(S.player(ap.id).dev.defending, 25, "attendance: idempotent (same session does not double-award)");
  // A different session DOES award again (to the now-lowest area).
  await S.saveRegister("2026-11-09", [{ playerId: ap.id, attended: true }], null);
  eq(S.player(ap.id).dev.defending, 30, "attendance: a new session awards again (defending 25 → 30)");

  /* ============ render the kid Academy/Development pages (no throw, no focus areas) ============ */
  const appJs = read("js/app.js");
  window.sessionStorage.setItem("harris_preview_auth", "1");
  window.scrollTo = () => {}; window.confirm = () => true; window.alert = () => {};
  try { window.eval(appJs); } catch (e) { ok(false, "app.js evaluates", e.message); }
  await new Promise(res => setTimeout(res, 30));
  S.isAdmin = false; S.me = ip.id; S.linkedPlayer = ip.id; S.myKids = [ip.id];
  window.location.hash = "#academy/progress";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(res => setTimeout(res, 20));
  let v = window.document.querySelector("#view").innerHTML;
  ok(!/My focus this half-term/.test(v), "focus areas gone: Academy no longer shows 'My focus this half-term'");
  ok(/Development Plan/.test(v), "Academy leads with the Development Plan");
  ok(/Smash these this week/.test(v), "Academy shows gamified 'This week's targets'");

  // Videos tab: each watchable video renders a "watch & comment → +5%" box for the child.
  await S.addDrill({ title: "Team passing clip", url: "https://youtu.be/teampassclip", area: "Passing", team: true });
  window.location.hash = "#academy/videos";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(res => setTimeout(res, 20));
  v = window.document.querySelector("#view").innerHTML;
  ok(/What did this show you\?/.test(v), "Videos tab shows the reflection prompt for a watchable video");
  ok(/reflect-go/.test(v), "Videos tab renders a reflection submit button");

  // Academy Tasks tab lists the child's tasks (quiz/videos/training/chores/homework).
  window.location.hash = "#academy/tasks";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(res => setTimeout(res, 20));
  v = window.document.querySelector("#view").innerHTML;
  ["Weekly quiz", "Watch videos", "Training attendance", "Home Team chores", "Homework"]
    .forEach(t => ok(v.includes(t), `Tasks tab lists: ${t}`));
  ok(/How Academy Points work/.test(v), "Tasks tab shows the compact 'How Academy Points work' box");
  ok(!/This week's homework/.test(v), "Academy Tasks no longer leads with the homework card");

  // Skill ladder is private: it shows on the OWN player's profile.
  window.location.hash = "#players/" + ip.id;
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(res => setTimeout(res, 20));
  v = window.document.querySelector("#view").innerHTML;
  ok(/Skill Ladder/.test(v), "§2 own Academy profile shows the private Skill Ladder");

  /* ============ STOCK VIDEO LIBRARY — families must NEVER see unassigned ============ */
  // A stock/unassigned video (no team, no children) is admin-only until assigned.
  const stockRes = await S.addStockVideo({ title: "Stock finishing drill", url: "https://youtu.be/zzzzzzzzzzz", folder: "Finishing" });
  ok(stockRes.ok, "stock: addStockVideo succeeds");
  const stock = S.stockVideos();
  ok(stock.some(d => d.title === "Stock finishing drill"), "stock: video lands in the stock shelf");
  ok(S.videoFolders().includes("Finishing"), "stock: folder name appears in videoFolders()");
  // CRITICAL safeguard: stock video is NOT in teamVideos() and NOT in any child's list.
  ok(!S.teamVideos().some(d => d.title === "Stock finishing drill"), "stock: hidden from teamVideos() (families)");
  ros.forEach(child => {
    ok(!S.videosForPlayer(child.id).some(d => d.title === "Stock finishing drill"),
      "stock: hidden from videosForPlayer(#" + child.id + ")");
  });
  // Once assigned to the team it becomes visible to families (no re-upload).
  const stockId = stock.find(d => d.title === "Stock finishing drill").id;
  await S.assignVideo(stockId, { team: true });
  ok(S.teamVideos().some(d => d.id === stockId), "stock: appears to families AFTER assigning to team");
  ok(!S.stockVideos().some(d => d.id === stockId), "stock: no longer counted as stock once assigned");
  // Assigning to a specific child surfaces it only for that child.
  await S.assignVideo(stockId, { playerIds: [ros[0].id] });
  ok(S.videosForPlayer(ros[0].id).some(d => d.id === stockId), "stock: visible to the assigned child");
  ok(!S.teamVideos().some(d => d.id === stockId), "stock: not a team video once re-assigned to a child");

  /* ============ OPPONENT DIRECTORY — seeds from past opponents ============ */
  const oppNames = [...new Set((S.state.fixtures || []).map(f => (f.opponent||"").trim()).filter(Boolean))];
  if (oppNames.length) {
    ge(S.directory().length, oppNames.length, "directory: seeded a row for every distinct fixture opponent");
    ok(oppNames.every(n => S.directory().some(d => d.club === n)), "directory: every opponent club is present");
  }
  const beforeCount = S.directory().length;
  await S._seedDirectory();   // running again must NOT duplicate
  eq(S.directory().length, beforeCount, "directory: re-seeding does not duplicate clubs");

  /* ============ POSITION_TASKS library + posGroup mapper ============ */
  const PT = window.POSITION_TASKS;
  ok(PT && typeof PT === "object", "POSITION_TASKS library is defined");
  const PT_GROUPS = ["GK","CB","FB","CM","WIDE","FWD"];
  eq(Object.keys(PT || {}).length, 6, "POSITION_TASKS has exactly 6 position groups");
  PT_GROUPS.forEach(g => {
    ok(Array.isArray(PT[g]), "POSITION_TASKS group " + g + " is a list");
    ge((PT[g] || []).length, 20, "POSITION_TASKS group " + g + " has >= 20 targets");
    ok((PT[g] || []).every(t => typeof t === "string" && t.trim().length > 0), "POSITION_TASKS group " + g + " entries are non-empty strings");
    eq(new Set((PT[g] || []).map(t => t.toLowerCase())).size, (PT[g] || []).length, "POSITION_TASKS group " + g + " has no duplicate targets");
  });
  ok(typeof window.posGroup === "function", "posGroup mapper is defined");
  const PG = window.posGroup;
  eq(PG("GK"), "GK", "posGroup GK→GK");
  eq(PG("CB"), "CB", "posGroup CB→CB");
  ["RB","LB","RWB","LWB"].forEach(c => eq(PG(c), "FB", "posGroup " + c + "→FB"));
  ["CDM","CM","CAM"].forEach(c => eq(PG(c), "CM", "posGroup " + c + "→CM"));
  ["RM","LM","RW","LW"].forEach(c => eq(PG(c), "WIDE", "posGroup " + c + "→WIDE"));
  ["ST","CF"].forEach(c => eq(PG(c), "FWD", "posGroup " + c + "→FWD"));
  eq(PG("ZZ"), "CM", "posGroup unknown→CM (default)");
  eq(PG(""), "CM", "posGroup empty→CM (default)");

  /* ============ Dev editor renders position suggestions (admin) ============ */
  S.isAdmin = true;
  window.location.hash = "#admin/academy";
  window.dispatchEvent(new window.Event("hashchange"));
  await new Promise(res => setTimeout(res, 30));
  const av = window.document.querySelector("#view").innerHTML;
  ok(/Suggested targets for/i.test(av), "dev editor shows 'Suggested targets for {position}'");
  ok(/data-add-target=/.test(av), "dev editor renders clickable suggestion chips");
  ok(/Goals to achieve/i.test(av), "dev editor keeps the 'Goals to achieve' section");

  // ---- report ----
  console.log(`\nPHASE 4 CONTENT TESTS — ${pass} passed, ${fail} failed`);
  if (fail) { console.log("\nFAILURES:"); fails.forEach((f, i) => console.log(`  [${i+1}] ${f}`)); process.exit(1); }
  console.log("ALL CONTENT TESTS PASSED ✓");
  process.exit(0);
})().catch(e => { console.error("TEST HARNESS THREW:", e.stack || e); process.exit(1); });
