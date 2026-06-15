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
  AGE_GROUP: "Under-11s",   // fallback only — the live label follows the season's `age` below
  CURRENT_SEASON: "2025/26",

  // --- Seasons ---
  // Each season runs 1 Jul → 30 Jun. Fixtures, training and events fall into a
  // season automatically by date, so anything from 1 Jul 2026 lands in 2026/27.
  // The top-bar dropdown switches the view; it defaults to whichever season
  // today falls in. Add a new season here each summer.
  // `age` is the age-group label for that season (the squad moves up each year).
  SEASONS: [
    { id: "2025/26", from: "2025-07-01", to: "2026-06-30", age: "Under-10s" },
    { id: "2026/27", from: "2026-07-01", to: "2027-06-30", age: "Under-11s" }
  ],

  // --- Club honours per season (shown on the Home page "Trophy cabinet") ---
  // Add a line each time the team wins or reaches a final.
  SEASON_HONOURS: {
    "2025/26": [
      { comp: "JPL Vase Cup",    result: "Winners",        icon: "🏆", win: true },
      { comp: "Vase Cup",        result: "Finalists",      icon: "🥈" },
      { comp: "Spring Vase Cup", result: "Finalists",      icon: "🥈" },
      { comp: "Anderson Cup",    result: "Semi-Finalists", icon: "🥉" }
    ]
  },

  // --- Academy Points (AP) scoring — v1.1 (see points-spec.md §1) ---
  // One currency: AP. Effort is rewarded over outcome (≈75:25). Every value here
  // is taken verbatim from the spec — do not retune without a spec change.
  SCORING: {
    // A. Training (§1A)
    trainingAttendance: 20,     // attend training
    trainerOfTheDay: 10,        // coach pick — best effort (rotation rule)
    trainingStreak: 20,         // 4-week training streak (one freeze/half-term)

    // B. Weekly Challenge (§1B)
    challenge: 15,              // complete the weekly drill ("Done it!" + parent confirm)
    challengeShown: 5,         // bonus: shown the skill to coach / 10s clip
    challengeStreak: 15,       // 4-challenge streak

    // C. Match day (§1C)
    appearance: 20,            // play in the match (any minutes) — everyone in squad
    win: 10,                   // win — everyone, equally
    draw: 5,                   // draw — everyone, equally
    goal: 10,                  // goal (scorer)
    assist: 10,                // assist (creator)
    cleanSheetGK: 15,          // clean sheet — goalkeeper
    cleanSheetDef: 10,         // clean sheet — defenders
    cleanSheetOther: 5,        // clean sheet — others (outfield, non-defender)
    saveOfTheDay: 10,          // Save of the Day (coach tap) — GK
    outcomeCapPerMatch: 30,    // CAP: max +30/match from goals + assists combined

    // D. Coach awards (§1D)
    motm: 15,                  // Player of the Match
    momentOfMatch: 15,         // Moment of the Match (≠ POTM)
    captainsAward: 25,         // Captain's Award (monthly, voted by players)

    // E. Weekly Quiz (§1E)
    quizComplete: 10,          // complete the weekly quiz
    quizPerfect: 5,            // perfect score bonus
    quizStreak: 10,            // 4-quiz streak

    // F. Homework Gate (§1F) — parent controlled
    homeworkBonus: 5,          // challenge + quiz both done by deadline
    homeworkPenalty: -5,       // homework not complete (floored at 0/week)

    // G. Home Team chores (§1G) — parent controlled
    chore: 10,                 // each ticked chore (max 3/week → 30)
    choresPerWeek: 3,          // parents set up to 3 chores/week

    // Skill Ladder (§2)
    skillBronze: 25,
    skillSilver: 50,
    skillGold: 100,
    skillPersonalBest: 10,

    // Mover of the Month (§4)
    moverOfMonth: 25           // most AP gained this month → home spotlight
  },

  // --- Card evolution tiers (§6) — season AP thresholds, one-way ---
  TIERS: [
    { key: "bronze", label: "Bronze", min: 0 },
    { key: "silver", label: "Silver", min: 800 },
    { key: "gold",   label: "Gold",   min: 1800 },
    { key: "icon",   label: "Icon",   min: 3000, goldSkillChecks: 2 } // + any 2 Gold skill checks
  ],

  // Homework deadline (§1F): default 6pm the day before match day. Configurable.
  HOMEWORK_DEADLINE_HOUR: 18,   // 18:00 local
  HOMEWORK_DEADLINE_DAYS_BEFORE: 1,

  // The signed-in viewer for the demo (which player's profile is "me").
  // In live mode this comes from the user's account.
  DEMO_PLAYER_ID: 7
};
