/* ===================================================================
   OWFC Harris — Sample 2025/26 season data (preview mode)
   This mirrors the Supabase schema (see supabase/schema.sql).
   Replace with your real data, or connect Supabase to manage it live.
   =================================================================== */
window.HARRIS_DATA = {
  season: { id: 1, name: "2025/26", league: "North Tyneside Junior League — Division 2" },

  /* ---------------- SQUAD ---------------- */
  players: [
    { id:1,  number:1,  name:"Sam Kirby",               pos:"GK", rating:82, pace:70, shooting:45, passing:72, dribbling:60, defending:85, physical:78, games:0, goals:0, assists:0, motm:0, captain:true, init:"SK",
      program:["Shot-stopping — low and high saves","Distribution to a target, throws & kicks","Commanding the box and organising the defence","Quick feet and a strong set position"] },
    { id:2,  number:2,  name:"Daniel O'Loughlin",       pos:"CB", rating:80, pace:74, shooting:50, passing:76, dribbling:64, defending:84, physical:80, games:0, goals:0, assists:0, motm:0, init:"DO",
      program:["1v1 defending — jockey, delay, tackle","Heading at both ends of the pitch","Playing out from the back with composure","Communication and holding the line"] },
    { id:3,  number:3,  name:"Diego Cappello-Spedding", pos:"RB", rating:80, pace:83, shooting:52, passing:74, dribbling:73, defending:80, physical:72, games:0, goals:0, assists:0, motm:0, init:"DC",
      program:["Defending the wing 1v1","Overlapping runs and quality crosses","Recovery sprints to get back","First touch to start attacks"] },
    { id:4,  number:4,  name:"Charlie Rodwell",         pos:"CM", rating:82, pace:76, shooting:68, passing:84, dribbling:80, defending:72, physical:74, games:0, goals:0, assists:0, motm:0, init:"CR",
      program:["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"] },
    { id:5,  number:5,  name:"Sebestian Wallace",       pos:"LM", rating:81, pace:85, shooting:64, passing:78, dribbling:83, defending:60, physical:66, games:0, goals:0, assists:0, motm:0, init:"SW",
      program:["Beating your player 1v1","End product — crosses and shots","Tracking back to help your full-back","An explosive first step"] },
    { id:6,  number:6,  name:"Duke Lands",              pos:"CB", rating:80, pace:72, shooting:50, passing:75, dribbling:62, defending:84, physical:80, games:0, goals:0, assists:0, motm:0, init:"DL",
      program:["1v1 defending — jockey, delay, tackle","Heading at both ends of the pitch","Playing out from the back with composure","Communication and holding the line"] },
    { id:7,  number:7,  name:"Jack Horrell",            pos:"ST", rating:83, pace:88, shooting:84, passing:72, dribbling:84, defending:52, physical:72, games:0, goals:0, assists:0, motm:0, init:"JH",
      dev:{ passing:60, shooting:75, dribbling:70, defending:45, fitness:65, teamwork:80 },
      targets:["Score with your weaker foot in a match","Win the ball back within 6 seconds of losing it"],
      videos:[{ title:"Finishing inside the box", url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
      program:["Finishing first-time in the box","Movement to lose your marker","Hold-up play and linking with the team","Leading the press from the front"] },
    { id:8,  number:8,  name:"Alex Biondini",           pos:"CM", rating:82, pace:76, shooting:70, passing:84, dribbling:80, defending:70, physical:72, games:0, goals:0, assists:0, motm:0, init:"AB",
      program:["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"] },
    { id:9,  number:9,  name:"Rio Ballin-Blagrove",     pos:"ST", rating:83, pace:86, shooting:84, passing:70, dribbling:82, defending:50, physical:74, games:0, goals:0, assists:0, motm:0, init:"RB",
      program:["Finishing first-time in the box","Movement to lose your marker","Hold-up play and linking with the team","Leading the press from the front"] },
    { id:10, number:10, name:"Archie Wyatt",            pos:"RM", rating:82, pace:86, shooting:68, passing:78, dribbling:84, defending:60, physical:66, games:0, goals:0, assists:0, motm:0, init:"AW",
      program:["Beating your player 1v1","End product — crosses and shots","Tracking back to help your full-back","An explosive first step"] },
    { id:11, number:11, name:"Sam Butcher",             pos:"CM", rating:80, pace:78, shooting:64, passing:80, dribbling:78, defending:68, physical:70, games:0, goals:0, assists:0, motm:0, init:"SB",
      program:["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"] },
    { id:14, number:14, name:"Lucci Verico",            pos:"CM", rating:80, pace:77, shooting:66, passing:82, dribbling:79, defending:70, physical:70, games:0, goals:0, assists:0, motm:0, init:"LV",
      program:["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"] }
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

  /* ---------------- TRAINING ----------------
     Recurring weekly schedule (shown on the month calendar).
     day: 0=Sun, 1=Mon ... 4=Thu, 6=Sat. */
  trainingSchedule: [
    { day:4, start:"18:00", end:"19:30", location:"Norman Park, Bromley", until:"2026-09-17", label:"Thursday Training" },
    { day:6, start:"10:00", end:"11:30", location:"Norman Park, Bromley", until:"2027-05-22", label:"Saturday Training" }
  ],
  /* one-off / extra sessions (managed in admin) appear on the calendar too */
  training: [],

  /* training-exercise video library (coach-managed; paste YouTube/Vimeo links) */
  drills: [
    { id:1, title:"Cone dribbling warm-up", area:"Dribbling", url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { id:2, title:"Passing diamond drill", area:"Passing", url:"https://www.youtube.com/watch?v=8r0Z0u8aQ1A" }
  ],

  /* ---------------- EVENTS ---------------- */
  events: [
    { id:401, title:"Club Awards Afternoon", date:"2026-06-14", location:"TBC",
      desc:"Our end-of-season celebration — trophies, medals and a big well done to every player for a brilliant season. Families welcome!", img:"trophy", media:0 },
    { id:402, title:"FootGolf", date:"2026-06-27", location:"High Elms Golf Course", time:"11:00",
      desc:"A fun team morning of FootGolf at High Elms. Kick-off 11:00am. Tap the link for location and prices.",
      link:"https://www.mytimeactive.co.uk/locations/footgolf-high-elms-golf-course", img:"flag", media:0 }
  ],

  /* ---------------- GAMIFICATION ---------------- */
  /* points = training grades + attendance + quizzes + fun exercises */
  gamePoints: [
    { playerId:1,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:2,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:3,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:4,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:5,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:6,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:7,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:8,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:9,  attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:10, attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:11, attendance:0, training:0, quiz:0, exercise:0, badges:[] },
    { playerId:14, attendance:0, training:0, quiz:0, exercise:0, badges:[] }
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
