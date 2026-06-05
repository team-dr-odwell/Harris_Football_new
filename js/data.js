/* ===================================================================
   OWFC Harris — Sample 2025/26 season data (preview mode)
   This mirrors the Supabase schema (see supabase/schema.sql).
   Replace with your real data, or connect Supabase to manage it live.
   =================================================================== */
window.HARRIS_DATA = {
  season: { id: 1, name: "2025/26", league: "North Tyneside Junior League — Division 2" },

  /* ---------------- SQUAD ---------------- */
  players: [
    { id:1,  number:1,  name:"Oscar Bennett",  pos:"GK",  rating:78, pace:62, shooting:40, passing:70, dribbling:55, defending:80, physical:74, games:11, goals:0,  assists:1,  motm:2, clean_sheets:5, init:"OB",
      program:["Distribution under pressure — roll-outs to full-backs","Shot-stopping: low dives both sides","Footwork ladder + quick set position","Communication: organise the back four"] },
    { id:2,  number:2,  name:"Leo Carter",     pos:"RB",  rating:80, pace:84, shooting:55, passing:74, dribbling:72, defending:78, physical:70, games:12, goals:1,  assists:4,  motm:1, init:"LC",
      program:["Overlapping runs & timing of the cross","1v1 defending — jockey & delay","Recovery sprints to the back post","Switching play with the outside foot"] },
    { id:3,  number:3,  name:"Finn Walsh",     pos:"LB",  rating:77, pace:81, shooting:48, passing:71, dribbling:70, defending:75, physical:66, games:10, goals:0,  assists:3,  motm:1, init:"FW",
      program:["Weak-foot crossing reps","Defensive body shape — show inside","Underlap into the half-space","First-touch out of the back"] },
    { id:4,  number:4,  name:"Harry Dawson",   pos:"CB",  rating:81, pace:70, shooting:52, passing:76, dribbling:60, defending:85, physical:82, games:12, goals:2,  assists:0,  motm:3, init:"HD",
      program:["Heading: attacking & defensive contact","Stepping in to intercept","Long diagonal switch","Defending the front post at set pieces"] },
    { id:5,  number:5,  name:"Max Thompson",   pos:"CB",  rating:79, pace:72, shooting:46, passing:78, dribbling:63, defending:82, physical:78, games:11, goals:1,  assists:2,  motm:1, init:"MT",
      program:["Playing out from the back — split the press","Aerial duels & second balls","Covering & sweeping behind","Timing the slide tackle"] },
    { id:6,  number:6,  name:"Charlie Hughes",  pos:"CDM", rating:82, pace:74, shooting:64, passing:83, dribbling:75, defending:80, physical:79, games:12, goals:2,  assists:5,  motm:2, init:"CH",
      program:["Screening the back four — scanning","Long & short range passing","Driving forward with the ball","Recovering the second ball"] },
    { id:7,  number:7,  name:"Jack Morgan",    pos:"RW",  rating:84, pace:90, shooting:78, passing:76, dribbling:88, defending:55, physical:64, games:12, goals:9,  assists:6,  motm:4, init:"JM",
      program:["Beating the full-back 1v1 — feints","Cutting in onto the left foot to shoot","End product: low driven crosses","High press triggers from the wing"] },
    { id:8,  number:8,  name:"Noah Patel",     pos:"CM",  rating:80, pace:75, shooting:66, passing:84, dribbling:80, defending:68, physical:70, games:11, goals:3,  assists:7,  motm:2, init:"NP",
      program:["Receiving on the half-turn","Through balls into the channels","Late runs into the box","Press & counter-press as a unit"] },
    { id:9,  number:9,  name:"Freddie Clarke", pos:"ST",  rating:83, pace:82, shooting:86, passing:68, dribbling:78, defending:48, physical:76, games:12, goals:14, assists:3,  motm:5, init:"FC",
      program:["Finishing: first time inside the box","Movement across the front defender","Hold-up play & link with midfield","Penalty technique & composure"] },
    { id:10, number:10, name:"Alfie Reid",     pos:"CAM", rating:83, pace:78, shooting:74, passing:86, dribbling:85, defending:52, physical:66, games:12, goals:6,  assists:9,  motm:3, init:"AR",
      program:["Playing between the lines — find pockets","Disguised through passes","Shooting from the edge of the box","Set-piece delivery"] },
    { id:11, number:11, name:"Theo Murray",    pos:"LW",  rating:81, pace:88, shooting:70, passing:74, dribbling:84, defending:53, physical:62, games:10, goals:7,  assists:4,  motm:2, init:"TM",
      program:["1v1 on the touchline — explosive first step","Right-foot finishes cutting inside","Tracking back to support the full-back","Counter-attack runs in behind"] },
    { id:12, number:12, name:"Sam Doyle",      pos:"GK",  rating:74, pace:60, shooting:38, passing:66, dribbling:50, defending:76, physical:70, games:5,  goals:0,  assists:0,  motm:1, clean_sheets:2, init:"SD",
      program:["Handling crosses with confidence","Set position & angles","Quick distribution to start attacks","Reaction saves — close range"] },
    { id:14, number:14, name:"Riley Evans",    pos:"CM",  rating:78, pace:76, shooting:60, passing:79, dribbling:74, defending:66, physical:68, games:9,  goals:2,  assists:3,  motm:1, init:"RE",
      program:["Box-to-box engine — repeated efforts","Tackling & winning it back","Forward passes that break lines","Arriving late in the box"] },
    { id:15, number:15, name:"George Hill",    pos:"ST",  rating:77, pace:80, shooting:76, passing:62, dribbling:72, defending:46, physical:72, games:8,  goals:5,  assists:1,  motm:1, init:"GH",
      program:["Finishing on the stretch","Pressing from the front","Running the channels","First touch with back to goal"] }
  ],

  /* ---------------- FIXTURES ---------------- */
  fixtures: [
    /* PAST */
    { id:101, status:"past", date:"2025-09-14", kickoff:"10:00", meetup:"09:30", opponent:"Wallsend Boys Club", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League",
      our_score:4, their_score:1, result:"W", motm:9,
      goals:[{scorer:9,assist:7},{scorer:9,assist:10},{scorer:7,assist:8},{scorer:11,assist:null}],
      media:[{type:"photo",caption:"Full-time huddle"},{type:"photo",caption:"Freddie's hat-trick"},{type:"video",caption:"Jack's solo goal"}] },
    { id:102, status:"past", date:"2025-09-21", kickoff:"11:30", meetup:"11:00", opponent:"Cramlington Juniors", home_away:"A",
      ground:"Beaconhill Sports Ground", address:"Burnside, Cramlington NE23 6QP", kit:"black", competition:"League",
      our_score:2, their_score:2, result:"D", motm:6,
      goals:[{scorer:7,assist:10},{scorer:10,assist:6}],
      media:[{type:"photo",caption:"Half-time team talk"}] },
    { id:103, status:"past", date:"2025-09-28", kickoff:"10:00", meetup:"09:30", opponent:"Ponteland United", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League",
      our_score:3, their_score:0, result:"W", motm:7,
      goals:[{scorer:7,assist:8},{scorer:7,assist:10},{scorer:11,assist:7}],
      media:[{type:"photo",caption:"Clean sheet smiles"},{type:"photo",caption:"Warm-up"}] },
    { id:104, status:"past", date:"2025-10-12", kickoff:"12:00", meetup:"11:30", opponent:"Gosforth Bohemians", home_away:"A",
      ground:"Broadway West Playing Fields", address:"Broadway W, Gosforth NE3 2HD", kit:"black", competition:"Cup",
      our_score:1, their_score:3, result:"L", motm:4,
      goals:[{scorer:9,assist:6}],
      media:[] },
    { id:105, status:"past", date:"2025-10-19", kickoff:"10:00", meetup:"09:30", opponent:"Whitley Bay Storm", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League",
      our_score:5, their_score:2, result:"W", motm:7,
      goals:[{scorer:7,assist:10},{scorer:9,assist:8},{scorer:9,assist:7},{scorer:10,assist:6},{scorer:15,assist:11}],
      media:[{type:"video",caption:"5-goal highlights"},{type:"photo",caption:"Man of the match Jack"}] },
    { id:106, status:"past", date:"2025-11-02", kickoff:"11:00", meetup:"10:30", opponent:"Blyth Town Colts", home_away:"A",
      ground:"South Beach Recreation Ground", address:"Links Rd, Blyth NE24 3PL", kit:"black", competition:"League",
      our_score:2, their_score:1, result:"W", motm:6,
      goals:[{scorer:11,assist:8},{scorer:8,assist:10}],
      media:[{type:"photo",caption:"Muddy but happy"}] },
    { id:107, status:"past", date:"2025-11-16", kickoff:"10:00", meetup:"09:30", opponent:"Killingworth YPC", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League",
      our_score:3, their_score:3, result:"D", motm:10,
      goals:[{scorer:9,assist:10},{scorer:10,assist:7},{scorer:7,assist:6}],
      media:[{type:"photo",caption:"End-to-end thriller"}] },
    { id:108, status:"past", date:"2025-11-30", kickoff:"12:30", meetup:"12:00", opponent:"Tynemouth Tigers", home_away:"A",
      ground:"Preston Avenue Fields", address:"Preston Ave, North Shields NE30 2BE", kit:"black", competition:"League",
      our_score:4, their_score:0, result:"W", motm:9,
      goals:[{scorer:9,assist:7},{scorer:9,assist:10},{scorer:7,assist:8},{scorer:6,assist:10}],
      media:[{type:"photo",caption:"Back four kept it tight"}] },

    /* UPCOMING */
    { id:201, status:"upcoming", date:"2026-06-13", kickoff:"10:00", meetup:"09:30", opponent:"Wallsend Boys Club", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League" },
    { id:202, status:"upcoming", date:"2026-06-20", kickoff:"11:30", meetup:"11:00", opponent:"Cramlington Juniors", home_away:"A",
      ground:"Beaconhill Sports Ground", address:"Burnside, Cramlington NE23 6QP", kit:"black", competition:"League" },
    { id:203, status:"upcoming", date:"2026-06-27", kickoff:"10:00", meetup:"09:15", opponent:"Ponteland United", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"Cup" },
    { id:204, status:"upcoming", date:"2026-07-04", kickoff:"10:30", meetup:"10:00", opponent:"Gosforth Bohemians", home_away:"H",
      ground:"Harris Park, Pitch 3", address:"Harris Park, Coast Rd, Newcastle NE28 9JA", kit:"gold", competition:"League" },
    { id:205, status:"upcoming", date:"2026-07-11", kickoff:"12:00", meetup:"11:30", opponent:"Whitley Bay Storm", home_away:"A",
      ground:"Hillheads Park", address:"Hillheads Rd, Whitley Bay NE25 8HR", kit:"black", competition:"League" }
  ],

  /* attendance keyed by fixtureId -> { playerId: 'yes'|'no'|'maybe' } */
  attendance: {
    201: { 7:"yes", 9:"yes", 6:"yes", 10:"maybe", 4:"yes", 2:"no" },
    202: { 7:"yes", 9:"maybe" },
    203: {}, 204: {}, 205: {}
  },

  /* ---------------- TRAINING ---------------- */
  training: [
    { id:301, date:"2026-06-09", start:"18:00", end:"19:15", location:"Harris Park 3G Cage", focus:"Finishing & movement in the box",
      drills:["Rondo warm-up 5v2","Crossing & finishing circuit","Small-sided 4v4 to mini-goals","Penalty shootout challenge"] },
    { id:302, date:"2026-06-11", start:"18:00", end:"19:15", location:"Harris Park 3G Cage", focus:"Playing out from the back",
      drills:["Passing diamond warm-up","Build-up patterns vs press","Defending 1v1 & 2v2","Conditioned game: 3 passes before shooting"] },
    { id:303, date:"2026-06-16", start:"18:00", end:"19:15", location:"Harris Park 3G Cage", focus:"Pressing as a unit",
      drills:["Reaction sprints","Press triggers & cover shadows","Transition 4v4+2","Match scenario: win it back in 6 seconds"] },
    { id:304, date:"2026-06-18", start:"18:00", end:"19:15", location:"Harris Park 3G Cage", focus:"1v1 attacking & defending",
      drills:["Footwork ladder","1v1 gates dribbling","Defending the duel — jockey & tackle","King of the ring tournament"] }
  ],

  /* ---------------- EVENTS ---------------- */
  events: [
    { id:401, title:"End of Season Presentation Day", date:"2026-07-19", location:"Harris Park Clubhouse",
      desc:"Trophies, medals, and our player-card reveal for every member of the squad. Families welcome — food and drinks provided. Let's celebrate a brilliant season together!", img:"trophy", media:6 },
    { id:402, title:"Sponsored Penalty Shootout", date:"2026-06-28", location:"Harris Park, Pitch 3",
      desc:"Our big fundraiser! Each player gets sponsored per penalty scored. All money goes towards new training kit and tournament entry fees. Sponsor forms in the team chat.", img:"target", media:0 },
    { id:403, title:"Team Day Out — Go Karting", date:"2026-08-02", location:"Teesside Karting",
      desc:"A well-earned team day out to round off the summer. A chance to let off steam and build friendships off the pitch.", img:"flag", media:0 },
    { id:404, title:"Summer Skills Camp", date:"2026-08-11", location:"Harris Park",
      desc:"Three-day skills camp run by our coaches. Technical work, fun competitions and plenty of football. Open to the whole squad.", img:"cone", media:0 }
  ],

  /* ---------------- GAMIFICATION ---------------- */
  /* points = training grades + attendance + quizzes + fun exercises */
  gamePoints: [
    { playerId:7,  attendance:120, training:96,  quiz:80, exercise:60, badges:["streak10","quizace","motm4"] },
    { playerId:9,  attendance:120, training:90,  quiz:60, exercise:55, badges:["topscorer","motm4","hattrick"] },
    { playerId:6,  attendance:120, training:98,  quiz:70, exercise:50, badges:["streak10","captain"] },
    { playerId:10, attendance:120, training:88,  quiz:75, exercise:45, badges:["playmaker","quizace"] },
    { playerId:4,  attendance:120, training:92,  quiz:50, exercise:40, badges:["wall","streak10"] },
    { playerId:8,  attendance:110, training:84,  quiz:65, exercise:50, badges:["playmaker"] },
    { playerId:2,  attendance:120, training:80,  quiz:55, exercise:48, badges:["streak10"] },
    { playerId:11, attendance:100, training:82,  quiz:45, exercise:42, badges:[] },
    { playerId:5,  attendance:110, training:86,  quiz:40, exercise:38, badges:["wall"] },
    { playerId:1,  attendance:110, training:90,  quiz:50, exercise:35, badges:["goldengloves"] },
    { playerId:14, attendance:90,  training:78,  quiz:48, exercise:40, badges:[] },
    { playerId:3,  attendance:100, training:80,  quiz:42, exercise:36, badges:[] },
    { playerId:15, attendance:80,  training:74,  quiz:38, exercise:30, badges:[] },
    { playerId:12, attendance:60,  training:70,  quiz:44, exercise:28, badges:["goldengloves"] }
  ],

  achievements: [
    { key:"streak10",     emoji:"🔥", name:"On Fire",        desc:"Attended 10 sessions in a row" },
    { key:"quizace",      emoji:"🧠", name:"Quiz Ace",       desc:"Scored 100% on a team quiz" },
    { key:"topscorer",    emoji:"⚽", name:"Top Scorer",     desc:"Most goals in the squad" },
    { key:"hattrick",     emoji:"🎩", name:"Hat-trick Hero", desc:"Scored 3 in a game" },
    { key:"motm4",        emoji:"⭐", name:"Star Player",     desc:"4+ Man of the Match awards" },
    { key:"playmaker",    emoji:"🎯", name:"Playmaker",      desc:"Most assists in a month" },
    { key:"captain",      emoji:"🧢", name:"Leader",         desc:"Led the team as captain" },
    { key:"wall",         emoji:"🧱", name:"The Wall",       desc:"The defensive rock of the season" },
    { key:"goldengloves", emoji:"🧤", name:"Golden Gloves",  desc:"Kept a clean sheet — nothing got past!" },
    { key:"perfect",      emoji:"💯", name:"100% Club",      desc:"Never missed training", locked:true }
  ],

  quiz: {
    title:"Weekly Footy Quiz",
    points:20,
    questions:[
      { q:"How many players are on the pitch for each team in our U11 games?", opts:["7","9","11","5"], answer:1 },
      { q:"What should you shout to tell a team-mate they have space and time?", opts:["\"Man on!\"","\"Time!\"","\"Get rid!\"","\"Offside!\""], answer:1 },
      { q:"When we 'press', what are we trying to do?", opts:["Win the ball back quickly","Run back to our goal","Take a throw-in","Waste time"], answer:0 },
      { q:"Which part of the foot gives the most accurate short pass?", opts:["Toe","Inside of the foot","Heel","Studs"], answer:1 },
      { q:"What's the FIRST thing a great player does before they receive the ball?", opts:["Close their eyes","Look around / scan","Shout","Stop running"], answer:1 }
    ]
  },

  /* fun off-pitch challenges that earn league points */
  exercises: [
    { id:1, name:"Keepy-Uppy Challenge", desc:"Film your best keepy-uppy streak and post it in the team chat.", points:15, icon:"🤹" },
    { id:2, name:"Wall Pass Reps", desc:"100 two-footed passes against a wall — tick it off when you're done!", points:10, icon:"🧱" },
    { id:3, name:"Skill of the Week", desc:"Learn this week's skill move (the Cruyff turn) and show a coach.", points:20, icon:"✨" },
    { id:4, name:"Daily Mile", desc:"Run or jog a mile to build your engine. Log every one!", points:5, icon:"🏃" }
  ]
};
