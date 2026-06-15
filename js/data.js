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
      videos:[{ title:"Finishing inside the box", url:"" }],
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
      goals:[{scorer:7,assist:10},{scorer:9,assist:8},{scorer:9,assist:7},{scorer:10,assist:6},{scorer:11,assist:14}],
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
    { id:1, title:"Cone dribbling warm-up", area:"Dribbling", url:"" },
    { id:2, title:"Passing diamond drill", area:"Passing", url:"" }
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
    { key:"motm4",        emoji:"⭐", name:"Star Player",     desc:"4+ Player of the Match awards" },
    { key:"quizwhizz",    emoji:"🦉", name:"Quiz Whizz",     desc:"4 perfect weekly quizzes" },
    { key:"hometeamhero", emoji:"🏠", name:"Home Team Hero", desc:"Outstanding Home Team contribution (monthly)" },
    { key:"playmaker",    emoji:"🎯", name:"Playmaker",      desc:"Most assists in a month" },
    { key:"captain",      emoji:"🧢", name:"Leader",         desc:"Led the team as captain" },
    { key:"wall",         emoji:"🧱", name:"The Wall",       desc:"The defensive rock of the season" },
    { key:"goldengloves", emoji:"🧤", name:"Golden Gloves",  desc:"Kept a clean sheet — nothing got past!" },
    { key:"perfect",      emoji:"💯", name:"100% Club",      desc:"Attended every session in a month", locked:true }
  ],

  // Quiz meta. The actual questions are drawn fresh each week from quizBank
  // (5 skills + 5 general + 10 football), rotating by ISO week so it changes
  // automatically. Coaches can override a given week in Admin → Quiz.
  //
  // §1E: every question is tagged with a difficulty `band` so every reading level
  // in a 9–13 squad can score — the weekly pick mixes starter/standard/stretch.
  //   band: "starter"  — everyone should get it (read once, obvious)
  //   band: "standard" — needs a moment's thought / basic knowledge
  //   band: "stretch"  — for the older / keener readers
  // Football questions are also tagged by what they teach:
  //   topic: "laws" | "club" | "game" (game understanding) | "fact"
  // and skill questions carry the FA four-corner they build:
  //   corner: "technical" | "physical" | "psychological" | "social"
  quiz: { title:"Weekly Quiz — Skills, Brains & Football", perWeek:{ skill:5, gen:5, foot:10 } },

  // The question bank to rotate through. cat: "skill" | "gen" | "foot".
  quizBank: [
    /* ---------- SKILLS & DEVELOPMENT (four-corner, banded) ---------- */
    /* -- starter -- */
    { cat:"skill", corner:"technical", band:"starter", q:"To keep the ball away from a defender, the best thing to do is…", opts:["Shield it with your body","Kick it as hard as you can","Stop and stand still","Pick it up"], answer:0, explain:"Put your body between the defender and the ball — that's shielding." },
    { cat:"skill", corner:"psychological", band:"starter", q:"What's the best way to get better at a football skill?", opts:["Only play matches","Watch TV","Practise it regularly","Never try it"], answer:2, explain:"Practising on purpose, again and again, is how skills stick." },
    { cat:"skill", corner:"technical", band:"starter", q:"A good first touch helps you to…", opts:["Lose the ball","Control the ball and keep possession","Give away a foul","Waste time"], answer:1, explain:"A soft first touch sets the ball where you want it next." },
    { cat:"skill", corner:"physical", band:"starter", q:"Why do we warm up before training and games?", opts:["To waste time","To get the ball dirty","To get our bodies ready and avoid injury","Because the coach is bored"], answer:2, explain:"A warm-up wakes your muscles up so you move better and stay safe." },
    { cat:"skill", corner:"social", band:"starter", q:"A team-mate misses an easy chance. The best thing to do is…", opts:["Shout at them","Encourage them — next time!","Roll your eyes","Stop passing to them"], answer:1, explain:"Lifting team-mates up is what great teams do." },
    /* -- standard -- */
    { cat:"skill", corner:"technical", band:"standard", q:"To strike a powerful shot, you usually hit the ball with…", opts:["Your toe","Your heel","Your knee","The laces of your boot"], answer:3, explain:"The laces give the cleanest, most powerful contact." },
    { cat:"skill", corner:"technical", band:"standard", q:"For an accurate short pass, which part of the foot is best?", opts:["The inside of the foot","The toe","The heel","The studs"], answer:0, explain:"The inside of the foot gives the biggest, flattest surface for accuracy." },
    { cat:"skill", corner:"psychological", band:"standard", q:"What's the FIRST thing a smart player does before they get the ball?", opts:["Close their eyes","Look around and scan","Shout","Stand still"], answer:1, explain:"Scanning before you receive means you already know your next move." },
    { cat:"skill", corner:"technical", band:"standard", q:"When defending one-against-one, you should…", opts:["Dive in straight away","Turn your back","Stay on your feet and jockey","Stop watching the ball"], answer:2, explain:"Jockeying keeps you balanced so the attacker can't go past." },
    { cat:"skill", corner:"social", band:"standard", q:"What helps a team keep possession best?", opts:["Everyone chasing the ball","Good communication and passing","Booting it long every time","Standing still"], answer:1, explain:"Talking and passing keeps the ball moving and the team together." },
    { cat:"skill", corner:"physical", band:"standard", q:"When dribbling at speed, where should your eyes mostly be?", opts:["Closed","Only on the ball","Up, scanning the pitch","On the crowd"], answer:2, explain:"Eyes up lets you see passes, space and defenders coming." },
    /* -- stretch -- */
    { cat:"skill", corner:"technical", band:"stretch", q:"Why is it useful to be able to use BOTH feet?", opts:["It isn't useful","You can only shoot harder","You have more options and are harder to defend","Referees give you more time"], answer:2, explain:"Two good feet double your options and make you unpredictable." },
    { cat:"skill", corner:"psychological", band:"stretch", q:"If you make a mistake in a game, the best thing to do is…", opts:["Give up","Blame a team-mate","Reset and get back into the game","Walk off"], answer:2, explain:"The best players forget the mistake fast and get on with the game." },
    { cat:"skill", corner:"physical", band:"stretch", q:"Why do players do change-of-direction (agility) work?", opts:["To get tired","To turn and accelerate quickly in games","To look good","It doesn't help"], answer:1, explain:"Games are full of quick turns — agility makes those sharper." },

    /* ---------- GENERAL / FUN (the always-winnable easy band) ---------- */
    { cat:"gen", band:"starter", q:"What is the capital city of France?", opts:["Paris","London","Rome","Madrid"], answer:0 },
    { cat:"gen", band:"starter", q:"What is the capital city of Spain?", opts:["Barcelona","Madrid","Lisbon","Seville"], answer:1 },
    { cat:"gen", band:"standard", q:"What is the capital city of Italy?", opts:["Milan","Naples","Rome","Turin"], answer:2 },
    { cat:"gen", band:"starter", q:"Which planet is known as the Red Planet?", opts:["Venus","Mars","Jupiter","Saturn"], answer:1 },
    { cat:"gen", band:"standard", q:"How many sides does a hexagon have?", opts:["5","7","8","6"], answer:3 },
    { cat:"gen", band:"standard", q:"Animals that eat only plants are called…", opts:["Carnivores","Herbivores","Omnivores","Predators"], answer:1 },
    { cat:"gen", band:"starter", q:"How many minutes are there in one hour?", opts:["30","45","60","90"], answer:2 },
    { cat:"gen", band:"starter", q:"How many days are there in a week?", opts:["5","6","7","8"], answer:2 },
    { cat:"gen", band:"standard", q:"What is the largest ocean on Earth?", opts:["Atlantic","Indian","Arctic","Pacific"], answer:3 },
    { cat:"gen", band:"stretch", q:"How many continents are there on Earth?", opts:["5","6","7","8"], answer:2 },
    { cat:"gen", band:"standard", q:"Which gas do humans need to breathe in to live?", opts:["Oxygen","Helium","Carbon dioxide","Hydrogen"], answer:0 },
    { cat:"gen", band:"starter", q:"In which direction does the sun rise?", opts:["West","North","East","South"], answer:2 },
    { cat:"gen", band:"standard", q:"How many legs does a spider have?", opts:["6","8","10","12"], answer:1 },
    { cat:"gen", band:"starter", q:"What do bees make?", opts:["Milk","Honey","Bread","Silk"], answer:1 },

    /* ---------- FOOTBALL — LAWS OF THE GAME (evergreen, banded) ---------- */
    { cat:"foot", topic:"laws", band:"starter", q:"What does a red card mean?", opts:["A warning","A corner","Sent off","A goal"], answer:2, explain:"A red card means the player is sent off and their team plays with one fewer." },
    { cat:"foot", topic:"laws", band:"starter", q:"Which player is allowed to handle the ball in their own box?", opts:["The captain","The goalkeeper","The striker","Nobody"], answer:1, explain:"Only the goalkeeper can use their hands, and only inside their own penalty area." },
    { cat:"foot", topic:"laws", band:"starter", q:"From where is a penalty taken?", opts:["The corner","The halfway line","The penalty spot","The touchline"], answer:2 },
    { cat:"foot", topic:"laws", band:"starter", q:"What does a yellow card mean?", opts:["A goal","A caution (warning)","Half-time","A substitution"], answer:1, explain:"A yellow card is a caution — two in a game means a red." },
    { cat:"foot", topic:"laws", band:"standard", q:"The ball goes out over the side line. Play restarts with a…", opts:["Corner","Goal kick","Throw-in","Penalty"], answer:2, explain:"Out over the touchline (side line) = a throw-in." },
    { cat:"foot", topic:"laws", band:"standard", q:"A defender puts the ball out over their own goal line. The restart is a…", opts:["Throw-in","Corner kick","Goal kick","Free kick"], answer:1, explain:"A defender sending it behind their own goal line gives the attackers a corner." },
    { cat:"foot", topic:"laws", band:"stretch", q:"You can be offside if you are…", opts:["In your own half","Level with the last defender","Beyond the last defender when the ball is played","Behind the ball"], answer:2, explain:"Offside is about being past the last defender when the ball is played forward to you." },
    { cat:"foot", topic:"laws", band:"stretch", q:"Can you be offside straight from a corner kick?", opts:["Yes, always","No","Only in extra time","Only the striker"], answer:1, explain:"There is no offside directly from a corner, throw-in or goal kick." },

    /* ---------- FOOTBALL — CLUB KNOWLEDGE (OWFC Harris) ---------- */
    { cat:"foot", topic:"club", band:"starter", q:"What are our team's home shirt colours?", opts:["Red and white","Gold and black","Blue and yellow","Green and white"], answer:1, explain:"OWFC Harris play in gold and black — the colours on your card!" },
    { cat:"foot", topic:"club", band:"starter", q:"What does the 'W' stand for in OWFC?", opts:["Wanderers","Wood","Wednesday","West"], answer:1, explain:"Old Wilsonians FC — the club our Harris team is part of." },
    { cat:"foot", topic:"club", band:"standard", q:"How many Academy Points (AP) do you earn just for turning up to training?", opts:["5","10","20","50"], answer:2, explain:"Turning up to train is worth +20 AP — effort always counts." },
    { cat:"foot", topic:"club", band:"standard", q:"Doing your weekly Challenge AND Quiz before the deadline is called your…", opts:["Warm-up","Homework","Match report","Captaincy"], answer:1, explain:"Challenge + Quiz = your weekly homework, worth a bonus when both are done in time." },
    { cat:"foot", topic:"club", band:"stretch", q:"Which card tier is the very top one you can reach?", opts:["Silver","Gold","Black & Gold Icon","Diamond"], answer:2, explain:"The Black & Gold Icon card is the top tier — earned through development, not just talent." },

    /* ---------- FOOTBALL — GENERAL FACTS (evergreen, banded) ---------- */
    { cat:"foot", topic:"fact", band:"starter", q:"How many players are on the pitch for each team in a full 11-a-side game?", opts:["9","10","11","12"], answer:2 },
    { cat:"foot", topic:"fact", band:"starter", q:"What is it called when one player scores three goals in a game?", opts:["A treble-top","A hat-trick","A triple","A super-goal"], answer:1 },
    { cat:"foot", topic:"fact", band:"starter", q:"How many points do you get for winning a league game?", opts:["1","2","3","4"], answer:2, explain:"A win is 3 points, a draw is 1, a loss is 0." },
    { cat:"foot", topic:"fact", band:"standard", q:"How long is a normal professional match (both halves)?", opts:["60 minutes","75 minutes","90 minutes","120 minutes"], answer:2 },
    { cat:"foot", topic:"fact", band:"standard", q:"In which country is the Premier League played?", opts:["Spain","England","Germany","France"], answer:1 },
    { cat:"foot", topic:"fact", band:"standard", q:"The Champions League is a competition for the best clubs in…", opts:["Africa","Europe","Asia","South America"], answer:1 },
    { cat:"foot", topic:"fact", band:"standard", q:"In which city is Wembley Stadium?", opts:["Manchester","Liverpool","London","Leeds"], answer:2 },
    { cat:"foot", topic:"fact", band:"stretch", q:"Which country has won the most men's World Cups?", opts:["Germany","Brazil","Argentina","Italy"], answer:1, explain:"Brazil have won the men's World Cup five times — more than anyone." },
    { cat:"foot", topic:"fact", band:"stretch", q:"Which country won the 2022 World Cup in Qatar?", opts:["Argentina","France","Brazil","England"], answer:0 },
    { cat:"foot", topic:"fact", band:"stretch", q:"England's Lionesses won which trophy in 2022?", opts:["The Women's World Cup","The Women's Euros","Olympic gold","The Champions League"], answer:1 },
    { cat:"foot", topic:"fact", band:"stretch", q:"Which country won the 2023 Women's World Cup?", opts:["Spain","England","USA","Australia"], answer:0 }
  ],

  /* ---------------- WEEKLY CHALLENGE LIBRARY (§1B) ----------------
     One challenge per week, doable alone with one ball in 10–15 minutes, written
     so a 9-year-old can follow it. The library ROTATES the FA four corners across
     the month in order: technical → ball mastery → movement/physical → game
     understanding (cornerOrder below). weeklyChallenge() picks one per ISO week so
     the rotation is automatic — future weeks are just more rows here, no code change.

     Each row:
       name        short kid-friendly title (corner shown as a prefix)
       desc        what to do, in plain words a 9-year-old can follow unaided
       skillToShow what to show the coach / film for the +5 bonus
       icon        emoji for the card
       corner      technical | ball | physical | game  (the FA corner it builds)
       video       OPTIONAL external clip to demo it — we LINK, never re-host. The
                   defaults point at England Football's free "Improve Your Game"
                   home-practice hub; the coach can paste a more specific clip.
       minutes     how long it should take (10–15)
     AP is fixed by the spec (challenge +15, +5 if shown to coach / clip uploaded). */
  cornerOrder: ["technical","ball","physical","game"],
  cornerLabel: { technical:"Technical", ball:"Ball mastery", physical:"Movement", game:"Game brain" },
  exercises: [
    /* ----- Month cycle 1 ----- */
    { id:1, corner:"technical", weekly:true, icon:"🧱", minutes:12,
      name:"Technical: 100 wall passes",
      desc:"Find a flat wall. Pass the ball against it and control the ball when it comes back. Use your RIGHT foot 50 times, then your LEFT foot 50 times. Keep your passes low and your first touch soft.",
      skillToShow:"Film 10 passes in a row where you control it then pass again without it bouncing away.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:2, corner:"ball", weekly:true, icon:"⚽", minutes:10,
      name:"Ball mastery: toe-taps & sole rolls",
      desc:"Tap the top of the ball with the bottom of one foot, then the other, like running on the spot — do 50 toe-taps. Then roll the ball side to side under your foot 25 times each foot. Quick feet, eyes up!",
      skillToShow:"Show your coach 30 fast toe-taps without the ball rolling away.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:3, corner:"physical", weekly:true, icon:"🏃", minutes:15,
      name:"Movement: speedy ladder runs",
      desc:"Put down 6 markers (socks, shoes, anything) in a line, a big step apart. Run through doing fast little steps between each one, turn, and come back. Do it 8 times. Pump your arms and stay on your toes!",
      skillToShow:"Film one run through the markers as fast as you can with quick, light feet.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:4, corner:"game", weekly:true, icon:"🧠", minutes:12,
      name:"Game brain: watch & spot the run",
      desc:"Watch 10 minutes of any football match (TV or online with a grown-up). Watch a STRIKER when their team has the ball. Spot one clever run they make to get away from a defender. Could you do that run?",
      skillToShow:"Tell your coach about the run you spotted, or copy it in the garden and film it.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    /* ----- Month cycle 2 (keeps a 4+ week month fresh) ----- */
    { id:5, corner:"technical", weekly:true, icon:"🎯", minutes:12,
      name:"Technical: target shooting",
      desc:"Pick a target — a corner of a goal, a bin, a tree. Place the ball and aim for it. Take 20 shots with your strong foot, then 10 with your weaker foot. Aim, don't just blast it. Count how many you hit.",
      skillToShow:"Film 5 shots and show how many hit your target.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:6, corner:"ball", weekly:true, icon:"🪄", minutes:10,
      name:"Ball mastery: the dribble box",
      desc:"Make a small box with 4 markers. Dribble around the inside of the box using lots of little touches — inside foot, outside foot. Keep the ball close, like it's glued to your boot. Go for 5 minutes.",
      skillToShow:"Show your coach you can dribble round the box twice without the ball leaving the box.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:7, corner:"physical", weekly:true, icon:"🦘", minutes:12,
      name:"Movement: jumps & balance",
      desc:"Do 10 two-footed jumps over a line (or a rope). Then stand on ONE leg and count to 20 — swap legs. Then do 10 jumps landing on one foot and holding it still. Strong and steady wins the header!",
      skillToShow:"Film yourself balancing on one leg for 20 seconds without wobbling over.",
      video:"https://www.englandfootball.com/play/Improve-your-game" },
    { id:8, corner:"game", weekly:true, icon:"👀", minutes:10,
      name:"Game brain: heads up scanning",
      desc:"Get a ball and dribble slowly around your garden or a room. Every few touches, look UP and shout out something you see — a tree, a window, a colour. This trains your habit of looking up in a game.",
      skillToShow:"Show your coach you can dribble and call out 5 things you see without looking down.",
      video:"https://www.englandfootball.com/play/Improve-your-game" }
  ]
};

/* ===================================================================
   POSITION_TASKS — ready-made development targets by position group.
   20 concise, age-appropriate (U10/U11, 7-a-side) actionable targets per
   group. Used by the coach's development-plan editor: clicking a chip adds
   the line to a player's "Goals to achieve" (players.targets). Six groups:
   GK, CB, FB, CM, WIDE, FWD. See posGroup() below for code mapping.
   =================================================================== */
window.POSITION_TASKS = {
  GK: [
    "Set your feet before the striker shoots",
    "Catch high balls at the highest safe point",
    "Throw to the full-back's back foot to start an attack",
    "Narrow the angle — come off your line",
    "Organise the defence loudly at corners",
    "Get your body behind every shot you can",
    "Spread big to make yourself huge in a 1v1",
    "Take a touch then pass calmly under pressure",
    "Call 'keeper!' early and claim crosses you can reach",
    "Roll the ball out fast to start a quick break",
    "Stay on your toes, ready to dive either way",
    "Push wide shots round the post, not back into play",
    "Watch the ball into your hands every time",
    "Start in a good ready position before every shot",
    "Kick to a team-mate, not just as far as you can",
    "Talk your defenders into the right positions",
    "Recover quickly after a save to be ready for the rebound",
    "Stay big and tall — don't go to ground too early",
    "Win the high ball with a strong, brave jump",
    "Stay switched on even when the ball is up the other end"
  ],
  CB: [
    "Jockey, don't dive in — show them away from goal",
    "Head clearances high and far under pressure",
    "Step up together to hold the line",
    "Pass out calmly to a midfielder",
    "Track your runner — don't get dragged out",
    "Win your headers by attacking the ball first",
    "Stay goal-side of your attacker at all times",
    "Clear your lines early when there's danger",
    "Talk to your keeper and fellow defender constantly",
    "Stay on your feet in the box — don't dive in",
    "Pick the right moment to step in and tackle",
    "Cover your partner when they go to press",
    "Be brave — put your head and body in the way",
    "Look up before you pass out of defence",
    "Don't ball-watch — know where your man is",
    "Make the pitch big when we have the ball",
    "Show the attacker onto their weaker foot",
    "Stay calm when the ball comes to you under pressure",
    "Drop and turn quickly when the ball goes over the top",
    "Switch off the danger before starting our attack"
  ],
  FB: [
    "Sprint back goal-side the moment we lose it",
    "Overlap to support the winger",
    "Win the 1v1 on the touchline",
    "Deliver an early cross to the back post",
    "Switch play with a pass to the far side",
    "Stay tight to the winger but don't dive in",
    "Time your overlap run to arrive in space",
    "Get tight quickly when the ball comes to your side",
    "Look inside first, then out, when you get the ball",
    "Recover into the middle if our centre-back steps out",
    "Defend the cross by getting between the ball and goal",
    "Use your speed to track runners down the wing",
    "Keep your cross low and into the danger area",
    "Stay wide to give us width when we attack",
    "Pass and move — don't stand still after you give it",
    "Show the winger down the line, away from goal",
    "Be loud — tell your team-mates who to pick up",
    "Get your head up before crossing to pick a team-mate",
    "Stay balanced so you can turn either way",
    "Drop in to make a back three when we're under pressure"
  ],
  CM: [
    "Receive on the half-turn to play forward",
    "Scan before you receive — know your next pass",
    "Be an option for attack AND defence",
    "Drive forward when space opens",
    "Win it back within 5 seconds of losing it",
    "Always offer an angle to the player on the ball",
    "Keep the ball moving with quick one-touch passes",
    "Pick the right pass — safe back or brave forward",
    "Get back to protect your defenders when we lose it",
    "Make a forward run into the box when you can",
    "Shield the ball with your body when you're crowded",
    "Look over both shoulders before the ball arrives",
    "Switch the play to the free side of the pitch",
    "Press the ball-carrier hard when we're out of possession",
    "Be brave — take the ball even when it's tight",
    "Spread the play with a long, accurate pass",
    "Stay between the ball and our goal when defending",
    "Take a good first touch out of your feet",
    "Support the striker so they always have an option",
    "Keep talking — be the engine that organises the team"
  ],
  WIDE: [
    "Take defenders on 1v1 with pace",
    "Get to the byline and cut it back",
    "Stay wide to stretch the pitch",
    "Track back to help your full-back",
    "Cut inside onto your stronger foot to shoot",
    "Run at the defender to make something happen",
    "Use a trick or change of pace to beat your marker",
    "Get your cross in early before they get set",
    "Make a run in behind when the full-back's tired",
    "Stay onside but be ready to sprint in behind",
    "Look up before you cross to find a team-mate",
    "Receive on the back foot, ready to attack",
    "Don't give the ball away cheaply in our half",
    "Recover quickly when you lose it out wide",
    "Attack the back post when the cross comes from the other side",
    "Keep the chalk on your boots — hug the touchline",
    "Cross or shoot decisively — don't dither on the ball",
    "Press the full-back when they have the ball",
    "Take players on, even if it doesn't always work",
    "Get into the box to score, not just to create"
  ],
  FWD: [
    "First touch away from the defender, ready to shoot",
    "Make near-post runs across the defender",
    "Finish first-time, low and across the keeper",
    "Hold the ball up and bring others in",
    "Lead the press from the front",
    "Gamble in the box — be there for the rebound",
    "Spin in behind when the defender switches off",
    "Place your shots into the corners, don't always blast",
    "Get across your marker to attack the cross",
    "Take a touch to set yourself, then shoot",
    "Stretch the defence by running in behind",
    "Use your body to shield and keep the ball",
    "Be greedy in the box — always try to score",
    "Stay calm and pick your spot one-on-one with the keeper",
    "Pull off the shoulder of the last defender",
    "Shoot early before the defender can block",
    "Win the first ball to bring midfielders into play",
    "Make runs even when you don't get the ball",
    "Close down the keeper and defenders from the front",
    "Follow in every shot — keepers spill the ball"
  ]
};

/* Map a position code to one of the six POSITION_TASKS groups.
   GK→GK; CB→CB; RB/LB/RWB/LWB→FB; CDM/CM/CAM→CM; RM/LM/RW/LW→WIDE; ST/CF→FWD.
   Defaults to CM for anything unknown. */
window.posGroup = function (pos) {
  const P = String(pos || "").toUpperCase().trim();
  if (P === "GK") return "GK";
  if (P === "CB") return "CB";
  if (["RB", "LB", "RWB", "LWB"].includes(P)) return "FB";
  if (["CDM", "CM", "CAM"].includes(P)) return "CM";
  if (["RM", "LM", "RW", "LW"].includes(P)) return "WIDE";
  if (["ST", "CF"].includes(P)) return "FWD";
  return "CM";
};
