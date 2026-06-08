/* ===================================================================
   OWFC Harris — Configuration
   -------------------------------------------------------------------
   PREVIEW MODE (default): leave SUPABASE_URL empty. The site runs on
   built-in sample data so you can review everything immediately.

   GO LIVE: create a free Supabase project (see README.md), then paste
   your Project URL + anon public key below. The site will then use
   real accounts, save attendance, and store uploads.
   =================================================================== */
window.HARRIS_CONFIG = {
  // --- Supabase (leave blank to stay in preview mode) ---
  SUPABASE_URL: "https://iiixvlkuxluxqpsupwnx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_1TPCEypYv6vLsTOPVmfECg_WnQR3wU0",  // publishable key (safe for the browser)

  // --- Team gate ---
  // Used in preview mode only. In live mode, Supabase Auth handles login.
  TEAM_PASSWORD: "harris2026",

  // Families log in with NAME + password. The site converts the name into a
  // hidden login ID of the form  <name-slug>@<domain>  so Supabase can store it.
  // Families never see this — they only type their name.
  LOGIN_EMAIL_DOMAIN: "harris.football",

  // --- Identity (shown in the UI) ---
  TEAM_NAME: "OWFC Harris",
  AGE_GROUP: "Under-11s",
  CURRENT_SEASON: "2025/26",

  // --- Seasons ---
  // Each season runs 1 Jul → 30 Jun. Fixtures, training and events fall into a
  // season automatically by date, so anything from 1 Jul 2026 lands in 2026/27.
  // The top-bar dropdown switches the view; it defaults to whichever season
  // today falls in. Add a new season here each summer.
  SEASONS: [
    { id: "2025/26", from: "2025-07-01", to: "2026-06-30" },
    { id: "2026/27", from: "2026-07-01", to: "2027-06-30" }
  ],

  // --- League scoring rules (one place to change every point value) ---
  SCORING: {
    quizPerCorrect: 1,          // 1 point per correct quiz answer (0 if not done by Sunday)
    videoFirstWatch: 2,         // watch a coach's video fully = 2 points
    videoRewatch: 1,            // +1 each additional full watch
    goal: 3,                    // goal in a game
    assist: 5,                  // assist in a game
    motm: 10,                   // Man of the Match
    trainingAttendance: 3,      // turning up to training
    trainingPerformanceGood: 3, // good effort/performance grade
    trainingPerformancePoor: -3,// poor performance grade
    cleanSheet: 5,              // defenders & goalkeepers, when we concede 0
    challenge: 10,              // coach-set challenge
    funHomeChallenge: 10,       // fun home challenge
    makeYourBedPerWeek: 5,      // habit challenge — every morning for a week
    perfectMonth: 20,           // attend EVERY training session in a month
    bottomOfLeagueChallenge: 20 // bottom of the league does one big challenge
  },

  // The signed-in viewer for the demo (which player's profile is "me").
  // In live mode this comes from the user's account.
  DEMO_PLAYER_ID: 7
};
