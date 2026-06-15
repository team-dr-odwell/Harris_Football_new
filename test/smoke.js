/* ===================================================================
   OWFC Harris — jsdom smoke test
   Loads index.html + the app JS in PREVIEW mode, routes every page
   (incl. each player card and every admin tab), injects a deliberately
   broken player record, and asserts no thrown / no console errors.

   Run:  npm i jsdom   (once)
         node test/smoke.js
   =================================================================== */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

const html = read("index.html");
// Force PREVIEW mode (blank Supabase keys) so the test never hits the network.
const configJs = read("js/config.js")
  .replace(/SUPABASE_URL:\s*"[^"]*"/, 'SUPABASE_URL: ""')
  .replace(/SUPABASE_ANON_KEY:\s*"[^"]*"/, 'SUPABASE_ANON_KEY: ""');
const dataJs = read("js/data.js");
const storeJs = read("js/store.js");
const appJs = read("js/app.js");

const errors = [];
const vc = new VirtualConsole();
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
vc.on("jsdomError", e => errors.push("jsdomError: " + (e.message || e)));

const dom = new JSDOM(html, {
  runScripts: "outside-only", pretendToBeVisual: true,
  url: "https://harris.football/", virtualConsole: vc,
});
const { window } = dom;
window.scrollTo = () => {};
window.structuredClone = window.structuredClone || (x => JSON.parse(JSON.stringify(x)));
window.confirm = () => true; window.alert = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
window.supabase = { createClient: () => ({}) };   // only referenced in live mode

const uncaught = [];
window.addEventListener("error", e => uncaught.push("window.onerror: " + (e.error && e.error.stack || e.message)));
window.addEventListener("unhandledrejection", e => uncaught.push("unhandledrejection: " + (e.reason && e.reason.stack || e.reason)));

function run(code, label) { try { window.eval(code); } catch (e) { errors.push(`THROW evaluating ${label}: ${e.stack || e}`); } }

(async () => {
  window.sessionStorage.setItem("harris_preview_auth", "1");
  run(configJs, "config.js"); run(dataJs, "data.js"); run(storeJs, "store.js"); run(appJs, "app.js");
  await new Promise(r => setTimeout(r, 60));

  const S = window.HarrisStore;
  if (!S || !S.state) { errors.push("Store/state not initialised after boot"); return finish(); }
  S.parents = [{ name: "Coach", relation: "Coach" }];   // act as admin/coach

  // Inject broken records — a missing name must never freeze a render (the P0 class of bug).
  S.state.players.push({ id: 9001, number: 99, pos: "CM", name: null, seasons: ["2025/26", "2026/27"], signed: true, stats: { "2025/26": {} } });
  S.state.players.push({ id: 9002, number: 98, pos: "ST", seasons: ["2025/26", "2026/27"], signed: true, stats: { "2025/26": {} } });
  S._applySeason();

  const hashes = [];
  ["home",
   // new IA
   "schedule", "schedule/matches", "schedule/matches/upcoming", "schedule/matches/past",
   "schedule/training", "schedule/events", "about",
   "academy", "academy/progress", "academy/quiz", "academy/tasks", "academy/videos",
   "players", "development", "league",
   // kept legacy aliases (so old WhatsApp/shared links never break)
   "fixtures", "fixtures/upcoming", "fixtures/past", "results",
   "training", "events", "matches", "squad",
   "family", "parents", "home_team"].forEach(h => hashes.push(h));
  (S.state.players || []).forEach(p => { hashes.push("players/" + p.id); hashes.push("development/" + p.id); });
  ["attendance", "fixtures", "result", "register", "teamsheet", "points", "skillladder",
   "squadgoals", "seasonstats", "quizresults", "quizedit", "academy", "idp", "videos",
   "contacts", "roster", "players", "training", "events"]
    .forEach(t => hashes.push("admin/" + t));
  hashes.push("admin");

  for (const h of hashes) {
    try {
      window.location.hash = "#" + h;
      window.dispatchEvent(new window.Event("hashchange"));
      await new Promise(r => setTimeout(r, 0));
    } catch (e) { errors.push(`THROW routing to #${h}: ${e.stack || e}`); }
  }
  await new Promise(r => setTimeout(r, 80));

  // ---- Family tab rendered as a logged-in PARENT (with two children, like the Holden twins) ----
  try {
    const realKids = (S.state.players || []).filter(p => p.name && p.id < 9000).map(p => p.id);
    S.parents = [{ name: "A Parent", relation: "Parent" }];
    S.isAdmin = false;
    S.myKids = realKids.slice(0, 2);
    S.me = S.myKids[0]; S.linkedPlayer = S.me;
    window.location.hash = "#family";
    window.dispatchEvent(new window.Event("hashchange"));
    await new Promise(r => setTimeout(r, 40));
    const fam = window.document.querySelector("#view").innerHTML || "";
    // After the IA restructure, Family is parent CONTROL only: confirm homework +
    // set/tick chores + child switcher + a link to the child's full card. The quiz
    // itself is now TAKEN in Academy, so it is intentionally NOT embedded here.
    [["Home Challenges", "parent home-challenges card"],
     ["data-kid=", "child switcher for multiple children"],
     ["This week's homework", "the parent homework-confirm card"],
     ["full card", "link to the child's full card"]]
      .forEach(([needle, label]) => { if (!fam.includes(needle)) errors.push(`Family(parent) missing ${label} ("${needle}")`); });
    if (fam.includes("quiz-host")) errors.push("Family should NOT embed the quiz (quiz-taking moved to Academy)");
    if (window.document.querySelector("#nav-family").classList.contains("hidden"))
      errors.push("Family nav tab hidden for a linked parent");
  } catch (e) { errors.push(`THROW rendering Family as parent: ${e.stack || e}`); }

  finish();
})();

function finish() {
  const all = [...errors, ...uncaught];
  if (all.length) {
    console.log("SMOKE TEST FAILED — " + all.length + " issue(s):\n");
    all.forEach((e, i) => console.log(`  [${i + 1}] ${e}\n`));
    process.exit(1);
  }
  console.log("SMOKE TEST PASSED — every route, player card and admin tab (incl. broken records) rendered with no thrown / console errors.");
  process.exit(0);
}
