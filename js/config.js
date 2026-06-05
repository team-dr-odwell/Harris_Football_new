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

  // The signed-in viewer for the demo (which player's profile is "me").
  // In live mode this comes from the user's account.
  DEMO_PLAYER_ID: 7
};
