/* ===================================================================
   OWFC Harris — Data store
   Bridges the UI to either Supabase (live) or sample data (preview).
   =================================================================== */
(function () {
  const cfg = window.HARRIS_CONFIG;
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const LS_KEY = "harris_preview_state_v1";
  const LS_CONTENT = "harris_preview_content_v1";
  const LS_LEDGER = "harris_ledger_v1";

  const Store = {
    MODE: LIVE ? "live" : "preview",
    sb: null,
    state: null,
    me: cfg.DEMO_PLAYER_ID,
    isAdmin: !LIVE,   // preview: everyone behind the team password can try the admin panel
    linkedPlayer: null,   // the active child this account is currently viewing as
    myKids: [],           // all children linked to this family account (ids)
    userId: null,
    displayName: "",
    parents: [],          // [{name, relation, email, phone}]
    season: null,         // currently-viewed season id, e.g. "2025/26"

    // Turn a typed name into a stable hidden login id, e.g. "David Kirby" -> "david.kirby@harris.team"
    nameToEmail(name) {
      const slug = (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
      return slug + "@" + (cfg.LOGIN_EMAIL_DOMAIN || "harris.team");
    },

    /* ---------- init / auth ---------- */
    async init() {
      if (LIVE) {
        this.sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const { data } = await this.sb.auth.getSession();
        return !!(data && data.session);
      }
      return this._previewAuthed();
    },

    async login(name, password) {
      this.displayName = (name || "").trim();
      localStorage.setItem("harris_name", this.displayName);
      if (LIVE) {
        const email = this.nameToEmail(name);
        const { error } = await this.sb.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, msg: "Name or password not recognised — ask a coach to check your details." };
        return { ok: true };
      }
      // Preview: single shared team password (name is just for the greeting)
      if ((password || "").trim() === cfg.TEAM_PASSWORD) {
        sessionStorage.setItem("harris_preview_auth", "1");
        return { ok: true };
      }
      return { ok: false, msg: "That password isn't right — ask a coach." };
    },

    async logout() {
      if (LIVE) { try { await this.sb.auth.signOut(); } catch (e) {} }
      sessionStorage.removeItem("harris_preview_auth");
    },

    // Change the SIGNED-IN user's own password (LIVE only). Uses their existing
    // session — no email needed, touches no other account. Never logs the value.
    async changePassword(newPw) {
      if (!LIVE) return { ok: false, msg: "Changing your password is available on the live site." };
      const { error } = await this.sb.auth.updateUser({ password: newPw });
      if (error) return { ok: false, msg: error.message || "Couldn't update your password — please try again." };
      return { ok: true };
    },

    _previewAuthed() { return sessionStorage.getItem("harris_preview_auth") === "1"; },

    /* ---------- load data ---------- */
    async load() {
      if (LIVE) {
        try { await this._loadLive(); }
        catch (e) { console.error("Live load failed, using sample data", e); this._loadPreview(); }
      } else {
        this._loadPreview();
      }
      this._initSeason();
      this._normalizePlayers();
      this._normalizeDrills();
      this._applySeason();
      this._applyPoints();
      await this._seedDirectory();
      return this.state;
    },

    /* ---------- seasons ---------- */
    _defaultSeason() {
      const t = new Date().toISOString().slice(0, 10);
      const list = cfg.SEASONS || [];
      const f = list.find(s => t >= s.from && t <= s.to);
      return (f && f.id) || cfg.CURRENT_SEASON || (list[0] && list[0].id) || "2025/26";
    },
    _initSeason() {
      this.season = localStorage.getItem("harris_season") || this._defaultSeason();
    },
    setSeason(id) {
      this.season = id;
      localStorage.setItem("harris_season", id);
      this._applySeason();
      this._applyPoints();
    },
    seasonRange(id) { return (cfg.SEASONS || []).find(s => s.id === (id || this.season)); },
    ageGroup(id) { const r = this.seasonRange(id); return (r && r.age) || cfg.AGE_GROUP; },
    inSeason(iso) {
      const r = this.seasonRange();
      return r ? (iso >= r.from && iso <= r.to) : true;
    },

    // Make sure every player has seasons/signed/stats, backfilling 25/26 from flat fields.
    _normalizePlayers() {
      (this.state.players || []).forEach(p => {
        if (!Array.isArray(p.seasons)) p.seasons = ["2025/26", "2026/27"];
        if (p.signed === undefined || p.signed === null) p.signed = true;
        if (!p.stats || typeof p.stats !== "object") p.stats = {};
        if (!p.idp || typeof p.idp !== "object") p.idp = {};
        if (!p.stats["2025/26"]) {
          p.stats["2025/26"] = {
            goals: p.goals || 0, assists: p.assists || 0, motm: p.motm || 0,
            sessions: p.sessions || 0, points: p.points || 0,
            dev: p.dev || {}, targets: p.targets || [], program: p.program || [], videos: p.videos || []
          };
        }
      });
    },
    // Project the selected season's stats onto each player's flat fields so the
    // whole UI shows the right numbers without per-screen changes.
    _applySeason() {
      const s = this.season;
      (this.state.players || []).forEach(p => {
        const st = (p.stats && p.stats[s]) || {};
        p.goals = st.goals || 0; p.assists = st.assists || 0; p.motm = st.motm || 0;
        p.sessions = st.sessions || 0; p.points = st.points || 0;
        p.dev = st.dev || {}; p.targets = st.targets || [];
        p.program = st.program || []; p.videos = st.videos || [];
      });
    },
    // Players rostered in the current season. By default only signed (visible) ones.
    roster(includeUnsigned) {
      const s = this.season;
      return (this.state.players || []).filter(p =>
        (Array.isArray(p.seasons) ? p.seasons : ["2025/26"]).includes(s) &&
        (includeUnsigned || p.signed !== false)
      );
    },

    _loadPreview() {
      const base = structuredClone(window.HARRIS_DATA);
      const content = JSON.parse(localStorage.getItem(LS_CONTENT) || "null");
      if (content) {
        ["fixtures","players","training","events","gamePoints","drills"].forEach(k => { if (content[k]) base[k] = content[k]; });
      }
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved) {
        if (saved.attendance) base.attendance = { ...base.attendance, ...saved.attendance };
        if (saved.media) base.media = saved.media;          // {fixtureId/eventId: [..]}
        if (saved.completedExercises) base.completedExercises = saved.completedExercises;
        if (saved.quizScore != null) base.quizScore = saved.quizScore;
      }
      base.media = base.media || {};
      base.completedExercises = base.completedExercises || [];
      base.ledger = JSON.parse(localStorage.getItem(LS_LEDGER) || "[]");
      base.quizzes = JSON.parse(localStorage.getItem("harris_quizzes") || "{}");
      base.chores = JSON.parse(localStorage.getItem("harris_chores") || "{}");
      base.squadGoals = JSON.parse(localStorage.getItem("harris_squadgoals") || "[]");
      base.directory = JSON.parse(localStorage.getItem("harris_directory") || "[]");
      const kids = JSON.parse(localStorage.getItem("harris_my_kids") || "null");
      const myp = localStorage.getItem("harris_my_player");
      this.myKids = Array.isArray(kids) && kids.length ? kids : (myp ? [+myp] : []);
      if (this.myKids.length) { this.me = myp ? +myp : this.myKids[0]; this.linkedPlayer = this.me; }
      this.displayName = localStorage.getItem("harris_name") || this.displayName;
      this.parents = JSON.parse(localStorage.getItem("harris_parents") || "[]");
      this.state = base;
      return base;
    },

    async _loadLive() {
      const sb = this.sb;
      const [players, fixtures, training, events, points] = await Promise.all([
        sb.from("players").select("*").order("number"),
        sb.from("fixtures").select("*, goals(*), media(*)").order("date"),
        sb.from("training_sessions").select("*").order("date"),
        sb.from("events").select("*, media(*)").order("date"),
        sb.from("game_points").select("*")
      ]);
      const att = {};
      try {
        const { data: rsvpRows } = await sb.from("rsvp").select("*");
        (rsvpRows || []).forEach(r => { (att[r.activity_key] ||= {})[r.player_id] = r.status; });
      } catch (e) { /* rsvp table not created yet */ }
      let drills = [];
      try { const { data } = await sb.from("drills").select("*").order("id"); drills = data || []; } catch (e) { /* drills table not created yet */ }
      let ledger = [];
      try { const { data } = await sb.from("point_events").select("*"); ledger = data || []; } catch (e) { /* point_events not created yet */ }
      let quizzes = {};
      try { const { data } = await sb.from("quizzes").select("*"); (data || []).forEach(r => { quizzes[r.week] = r.questions; }); } catch (e) { /* quizzes table not created yet */ }
      let chores = {};
      try { const { data } = await sb.from("chores").select("*"); (data || []).forEach(r => { chores[`${r.week}:${r.player_id}`] = { list: r.list || [], done: r.done || [] }; }); } catch (e) { /* chores table not created yet */ }
      let squadGoals = [];
      try { const { data } = await sb.from("squad_goals").select("*"); squadGoals = data || []; } catch (e) { /* squad_goals not created yet */ }
      let directory = [];
      try { const { data } = await sb.from("directory").select("*").order("club"); directory = data || []; } catch (e) { /* directory table not created yet */ }
      // who am I, and am I an admin?
      let allProfiles = [];
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          this.userId = user.id;
          const { data: prof } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
          if (prof) {
            this.isAdmin = !!prof.is_admin;
            if (prof.parent_name) this.displayName = prof.parent_name;
            const kids = (Array.isArray(prof.player_ids) && prof.player_ids.length) ? prof.player_ids : (prof.player_id ? [prof.player_id] : []);
            this.myKids = kids;
            if (kids.length) { this.me = prof.player_id || kids[0]; this.linkedPlayer = this.me; }
            this.parents = prof.parents || [];
          }
          if (this.isAdmin) { try { const { data } = await sb.from("profiles").select("*"); allProfiles = data || []; } catch (e) {} }
        }
      } catch (e) { /* ignore */ }
      this.state = {
        season: window.HARRIS_DATA.season,
        players: players.data || [],
        fixtures: fixtures.data || [],
        attendance: att,
        training: training.data || [],
        trainingSchedule: window.HARRIS_DATA.trainingSchedule,
        drills, profiles: allProfiles, ledger, chores, squadGoals, directory,
        events: (events.data || []).map(e => ({ ...e, desc: e.description, media_list: e.media, media: 0 })),
        gamePoints: (points.data || []).map(g => ({ ...g, playerId: g.player_id })),
        achievements: window.HARRIS_DATA.achievements,
        quiz: window.HARRIS_DATA.quiz,
        quizBank: window.HARRIS_DATA.quizBank,
        quizzes,
        exercises: window.HARRIS_DATA.exercises,
        media: {}, completedExercises: []
      };
      return this.state;
    },

    _persistPreview() {
      localStorage.setItem(LS_KEY, JSON.stringify({
        attendance: this.state.attendance,
        media: this.state.media,
        completedExercises: this.state.completedExercises,
        quizScore: this.state.quizScore
      }));
    },

    /* ---------- mutations ---------- */
    async setAttendance(key, playerId, status) {
      const m = (this.state.attendance[key] ||= {});
      if (status === null) delete m[playerId]; else m[playerId] = status;
      if (LIVE) {
        if (status === null) {
          await this.sb.from("rsvp").delete().eq("activity_key", key).eq("player_id", playerId);
        } else {
          await this.sb.from("rsvp").upsert({ activity_key: key, player_id: playerId, status }, { onConflict: "activity_key,player_id" });
        }
      } else {
        this._persistPreview();
      }
    },

    addMedia(targetKey, item) {
      (this.state.media[targetKey] ||= []).push(item);
      if (!LIVE) this._persistPreview();
      // In live mode, a real upload to Supabase Storage + insert would go here.
    },

    completeExercise(id) {
      if (!this.state.completedExercises.includes(id)) this.state.completedExercises.push(id);
      if (!LIVE) this._persistPreview();
    },

    setQuizScore(score) {
      this.state.quizScore = score;
      if (!LIVE) this._persistPreview();
    },

    /* ---------- admin content management ---------- */
    _persistContent() {
      localStorage.setItem(LS_CONTENT, JSON.stringify({
        fixtures: this.state.fixtures, players: this.state.players,
        training: this.state.training, events: this.state.events,
        gamePoints: this.state.gamePoints, drills: this.state.drills
      }));
    },
    _nextId(list) { return list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1; },

    async addFixture(f) {
      f.status = "upcoming";
      if (LIVE) {
        const { data, error } = await this.sb.from("fixtures").insert(f).select("*, goals(*), media(*)").single();
        if (error) return { ok:false, msg:error.message };
        this.state.fixtures.push(data);
      } else {
        f.id = this._nextId(this.state.fixtures);
        this.state.fixtures.push(f); this._persistContent();
      }
      return { ok:true };
    },

    async updateFixture(id, f) {
      const fx = this.state.fixtures.find(x => x.id === id); if (!fx) return { ok:false, msg:"Fixture not found" };
      Object.assign(fx, f);
      if (LIVE) { const { error } = await this.sb.from("fixtures").update(f).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok:true };
    },

    async deleteFixture(id) {
      this.state.fixtures = this.state.fixtures.filter(x => x.id !== id);
      this.state.ledger = (this.state.ledger || []).filter(e => !(e.ref && e.ref.startsWith(`match:${id}:`)));
      if (LIVE) {
        await this.sb.from("point_events").delete().like("ref", `match:${id}:%`);
        const { error } = await this.sb.from("fixtures").delete().eq("id", id);
        if (error) return { ok:false, msg:error.message };
      } else { this._persistContent(); this._persistLedger(); }
      this._applyPoints();
      return { ok:true };
    },

    // Clean-sheet AP by a player's position (§1C): GK 15 / defenders 10 / others 5.
    _cleanSheetPoints(pos) {
      const SC = cfg.SCORING || {};
      const P = String(pos || "").toUpperCase();
      if (P === "GK") return SC.cleanSheetGK;
      // Defenders: any back-line / wing-back / defensive-mid role.
      if (["CB","LB","RB","RWB","LWB","CDM","DEF"].includes(P)) return SC.cleanSheetDef;
      return SC.cleanSheetOther;
    },

    async saveResult(fixtureId, r) {
      // r: { our_score, their_score, motm, moment, goals:[{scorer,assist}],
      //      cleanSheets:[playerId], saves:[playerId], lineup:[playerId] }
      const result = r.our_score > r.their_score ? "W" : r.our_score < r.their_score ? "L" : "D";
      const fx = this.state.fixtures.find(x => x.id === fixtureId);
      const season = this._seasonForDate(fx ? fx.date : this.season);
      const opp = fx ? fx.opponent : "";
      const SC = cfg.SCORING || {};
      const lineup = Array.isArray(r.lineup) ? r.lineup : (fx && fx.lineup) || [];
      const events = [];

      // (C) Appearance + win/draw — EVERYONE in the lineup, equally.
      lineup.forEach(pid => {
        events.push({ player_id: pid, season, category: "appearance", points: SC.appearance, note: "Played vs " + opp, ref: `match:${fixtureId}:app:${pid}` });
        if (result === "W") events.push({ player_id: pid, season, category: "win", points: SC.win, note: "Win vs " + opp, ref: `match:${fixtureId}:win:${pid}` });
        else if (result === "D") events.push({ player_id: pid, season, category: "draw", points: SC.draw, note: "Draw vs " + opp, ref: `match:${fixtureId}:draw:${pid}` });
      });

      // (C) Goals + assists — but capped at +30/match per player COMBINED.
      // Build raw goal/assist rows, then trim each player's combined total to the cap.
      const ga = [];
      (r.goals || []).forEach((g, i) => {
        if (g.scorer) ga.push({ player_id: g.scorer, category: "goal", points: SC.goal, note: "Goal vs " + opp, ref: `match:${fixtureId}:g${i}:scorer` });
        if (g.assist) ga.push({ player_id: g.assist, category: "assist", points: SC.assist, note: "Assist vs " + opp, ref: `match:${fixtureId}:g${i}:assist` });
      });
      const cap = SC.outcomeCapPerMatch || 30;
      const used = {};
      ga.forEach(e => {
        const u = used[e.player_id] || 0;
        const allow = Math.max(0, Math.min(e.points, cap - u));
        if (allow > 0) {
          used[e.player_id] = u + allow;
          events.push({ player_id: e.player_id, season, category: e.category, points: allow,
            note: e.note + (allow < e.points ? " (capped)" : ""), ref: e.ref });
        }
        // if allow === 0 the row is dropped entirely (player already at the cap)
      });

      // (D) Coach awards — POTM and Moment must be different players.
      if (r.motm) events.push({ player_id: r.motm, season, category: "motm", points: SC.motm, note: "Player of the Match vs " + opp, ref: `match:${fixtureId}:motm` });
      if (r.moment && r.moment !== r.motm) events.push({ player_id: r.moment, season, category: "moment", points: SC.momentOfMatch, note: "Moment of the Match vs " + opp, ref: `match:${fixtureId}:moment` });

      // (C) Clean sheet — only if we conceded 0, position-banded, lineup players only.
      if (r.their_score === 0) {
        (r.cleanSheets || []).forEach(pid => {
          const p = this.player(pid);
          events.push({ player_id: pid, season, category: "cleansheet", points: this._cleanSheetPoints(p && p.pos),
            note: "Clean sheet vs " + opp, ref: `match:${fixtureId}:cs${pid}` });
        });
      }

      // (C) Save of the Day — GK, coach tap.
      (r.saves || []).forEach(pid => events.push({ player_id: pid, season, category: "saveoftheday", points: SC.saveOfTheDay, note: "Save of the Day vs " + opp, ref: `match:${fixtureId}:sotd${pid}` }));

      if (LIVE) {
        const { error } = await this.sb.from("fixtures")
          .update({ status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm, moment:r.moment||null, lineup })
          .eq("id", fixtureId);
        if (error) return { ok:false, msg:error.message };
        await this.sb.from("goals").delete().eq("fixture_id", fixtureId);
        if ((r.goals||[]).length) await this.sb.from("goals").insert(r.goals.map(g => ({ fixture_id:fixtureId, scorer:g.scorer, assist:g.assist })));
        await this.replacePoints(`match:${fixtureId}:`, events);
        await this.load();
      } else {
        Object.assign(fx, { status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm, moment:r.moment||null, goals:r.goals, lineup });
        this._persistContent();
        await this.replacePoints(`match:${fixtureId}:`, events);
      }
      return { ok:true };
    },

    async addPlayer(p) {
      // New players join the SELECTED season and start as "pending" (unsigned) until approved.
      const season = this.season || "2026/27";
      const zero = { goals:0, assists:0, motm:0, sessions:0, points:0, dev:{}, targets:[], program:[], videos:[] };
      p.seasons = p.seasons || [season];
      p.signed = (p.signed !== undefined) ? p.signed : false;
      p.stats = { [season]: { ...zero } };
      if (LIVE) {
        const ins = { name:p.name, number:p.number, pos:p.pos, captain:!!p.captain, init:p.init,
          goals:0, assists:0, motm:0, sessions:0, points:0,
          seasons:p.seasons, signed:p.signed, stats:p.stats };
        const { data, error } = await this.sb.from("players").insert(ins).select().single();
        if (error) return { ok:false, msg:error.message };
        this.state.players.push(data);
      } else {
        p.id = this._nextId(this.state.players);
        Object.assign(p, zero);
        this.state.players.push(p); this._persistContent();
      }
      this._normalizePlayers(); this._applySeason();
      return { ok:true };
    },

    // Plan/update a session for a date (one per date). Attaches focus, drill
    // activities and any videos chosen from the stock library.
    async addTraining(t) {
      const fields = { date:t.date, start:t.start, end:t.end, location:t.location,
        focus:t.focus, drills:t.drills || [], videos:t.videos || [] };
      const existing = (this.state.training || []).find(x => x.date === t.date);
      if (LIVE) {
        if (existing) {
          const { date, ...upd } = fields;
          const { data, error } = await this.sb.from("training_sessions").update(upd).eq("id", existing.id).select().single();
          if (error) return { ok:false, msg:error.message };
          Object.assign(existing, data);
        } else {
          const { data, error } = await this.sb.from("training_sessions").insert(fields).select().single();
          if (error) return { ok:false, msg:error.message };
          this.state.training.push(data);
        }
      } else {
        if (existing) { Object.assign(existing, fields); }
        else { fields.id = this._nextId(this.state.training); this.state.training.push(fields); }
        this.state.training.sort((a,b)=>a.date.localeCompare(b.date));
        this._persistContent();
      }
      return { ok:true };
    },

    async addEvent(ev) {
      // ev: { title, date, location, desc, img, time, link }
      if (LIVE) {
        const payload = { title:ev.title, description:ev.desc || null, location:ev.location || null,
          date:ev.date, time:ev.time || null, link:ev.link || null, img:ev.img };
        const { data, error } = await this.sb.from("events").insert(payload).select().single();
        if (error) return { ok:false, msg:error.message };
        this.state.events.push({ ...data, desc:data.description, media_list:[], media:0 });
      } else {
        ev.id = this._nextId(this.state.events); ev.media = ev.media || 0;
        this.state.events.push(ev); this._persistContent();
      }
      return { ok:true };
    },

    async updateEvent(id, ev) {
      const e = this.state.events.find(x => x.id === id); if (!e) return { ok:false, msg:"Event not found" };
      Object.assign(e, { title:ev.title, desc:ev.desc, location:ev.location, date:ev.date, time:ev.time, link:ev.link, img:ev.img });
      if (LIVE) {
        const { error } = await this.sb.from("events").update({ title:ev.title, description:ev.desc || null,
          location:ev.location || null, date:ev.date, time:ev.time || null, link:ev.link || null, img:ev.img }).eq("id", id);
        if (error) return { ok:false, msg:error.message };
      } else this._persistContent();
      return { ok:true };
    },
    async deleteEvent(id) {
      this.state.events = this.state.events.filter(x => x.id !== id);
      if (LIVE) { const { error } = await this.sb.from("events").delete().eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok:true };
    },

    async deleteTraining(id) {
      this.state.training = (this.state.training || []).filter(x => x.id !== id);
      if (LIVE) { const { error } = await this.sb.from("training_sessions").delete().eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok:true };
    },

    async updatePlayer(id, fields) {
      const p = this.player(id); if (!p) return { ok:false, msg:"Player not found" };
      Object.assign(p, fields);
      if (LIVE) { const { error } = await this.sb.from("players").update(fields).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok:true };
    },
    // Safe delete: only allowed if the player has no match/points history (avoids destroying records).
    playerHasHistory(id) {
      const inLedger = (this.state.ledger || []).some(e => e.player_id === id);
      const inMatch = (this.state.fixtures || []).some(f =>
        (Array.isArray(f.lineup) && f.lineup.includes(id)) ||
        (Array.isArray(f.goals) && f.goals.some(g => g.scorer === id || g.assist === id)) ||
        f.motm === id);
      return inLedger || inMatch;
    },
    async deletePlayer(id) {
      if (this.playerHasHistory(id)) return { ok:false, msg:"This player has match/points history — remove them from the season on the Roster tab instead of deleting." };
      this.state.players = this.state.players.filter(x => x.id !== id);
      // clear any RSVP rows so they don't inflate "going" counts
      Object.values(this.state.attendance || {}).forEach(m => { delete m[id]; });
      if (LIVE) {
        try { await this.sb.from("profiles").update({ player_id:null }).eq("player_id", id); } catch (e) {}
        try { await this.sb.from("rsvp").delete().eq("player_id", id); } catch (e) {}
        const { error } = await this.sb.from("players").delete().eq("id", id);
        if (error) return { ok:false, msg:error.message };
      } else this._persistContent();
      return { ok:true };
    },

    resetPreview() { localStorage.removeItem(LS_CONTENT); localStorage.removeItem(LS_KEY); },

    /* ---------- parent profile (contact details + child) ---------- */
    needsOnboarding() {
      if (this.isAdmin) return false;
      return LIVE ? !(this.parents && this.parents.length) : !localStorage.getItem("harris_parents");
    },
    async saveProfile({ parents, playerIds }) {
      playerIds = (playerIds || []).filter(Boolean);
      this.parents = parents;
      this.myKids = playerIds;
      this.me = playerIds[0] || null; this.linkedPlayer = this.me;
      this.displayName = (parents[0] && parents[0].name) || this.displayName;
      if (LIVE) {
        const { error } = await this.sb.from("profiles").upsert(
          { id: this.userId, parents, player_ids: playerIds, player_id: this.me, parent_name: this.displayName || null },
          { onConflict: "id" });
        if (error) return { ok: false, msg: error.message };
      } else {
        localStorage.setItem("harris_parents", JSON.stringify(parents));
        localStorage.setItem("harris_my_kids", JSON.stringify(playerIds));
        if (this.me) localStorage.setItem("harris_my_player", String(this.me));
        if (this.displayName) localStorage.setItem("harris_name", this.displayName);
      }
      return { ok: true };
    },

    /* ---------- which children is this account linked to ---------- */
    hasLinkedPlayer() { return (this.myKids && this.myKids.length > 0); },
    myChildren() { return (this.myKids || []).map(id => this.player(id)).filter(Boolean); },

    // switch the ACTIVE child (for the personalised home) among the linked children
    async setMyPlayer(id) {
      this.me = id; this.linkedPlayer = id;
      if (!this.myKids.includes(id)) this.myKids = [...this.myKids, id];
      if (LIVE) {
        await this.sb.from("profiles").upsert({ id: this.userId, player_id: id, player_ids: this.myKids, parent_name: this.displayName || null }, { onConflict: "id" });
      } else {
        localStorage.setItem("harris_my_player", String(id));
        localStorage.setItem("harris_my_kids", JSON.stringify(this.myKids));
      }
    },

    // set the full list of linked children (add/remove siblings)
    async setMyKids(ids) {
      ids = (ids || []).filter(Boolean);
      this.myKids = ids;
      if (!ids.includes(this.me)) { this.me = ids[0] || null; this.linkedPlayer = this.me; }
      if (LIVE) {
        await this.sb.from("profiles").upsert({ id: this.userId, player_ids: ids, player_id: this.me, parent_name: this.displayName || null }, { onConflict: "id" });
      } else {
        localStorage.setItem("harris_my_kids", JSON.stringify(ids));
        if (this.me) localStorage.setItem("harris_my_player", String(this.me)); else localStorage.removeItem("harris_my_player");
      }
      return { ok: true };
    },

    // set attendance for ALL the family's children at once (e.g. "both going")
    async setAttendanceAll(key, status) {
      for (const id of (this.myKids || [])) { await this.setAttendance(key, id, status); }
      return { ok: true };
    },

    /* ---------- selectors ---------- */
    player(id) { return this.state.players.find(p => p.id === id); },

    fixtures(status) {
      const today = new Date().toISOString().slice(0, 10);
      return this.state.fixtures.filter(f => {
        if (!this.inSeason(f.date)) return false;
        const isPast = f.status === "past" || (f.date && f.date < today);
        return status === "past" ? isPast : !isPast;
      });
    },

    mediaFor(key) {
      const seed = (this.state.fixtures.find(f => f.id === key)?.media)
                || (this.state.events.find(e => e.id === key)?.media_list) || [];
      const added = this.state.media[key] || [];
      return [...seed, ...added];
    },

    rsvpCount(key) {
      const v = Object.values(this.state.attendance[key] || {});
      return { going: v.filter(x => x === "yes" || x === "lift").length, lifts: v.filter(x => x === "lift").length };
    },

    /* §11 safeguard: NO absolute squad leaderboard. The former leagueRows() helper,
       which ranked the whole squad by total AP, was removed so an absolute ranking
       can never be wired back into a kid-facing view. The only ranked list is
       moverOfMonth() (AP gained this month). */

    /* admin: set a player's development (dev %, targets, plan, videos) for the selected season */
    async updatePlayerAcademy(id, a) {
      const p = this.player(id); if (!p) return { ok: false, msg: "Player not found" };
      if (!p.stats) p.stats = {};
      p.stats[this.season] = { ...(p.stats[this.season] || {}), ...a };
      Object.assign(p, a);
      if (LIVE) {
        const { error } = await this.sb.from("players").update({ stats: p.stats }).eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
    },

    /* ================= MINI-IDPs (§5) =================
       Two focus areas per player per half-term: one Technical + one from another
       FA corner, each linked to one drill video, plus one sentence of post-match
       coach feedback. Refreshed each half-term window. Stored on players.idp keyed
       by half-term so history is kept and a new window starts blank. */
    IDP_CORNERS: [
      { key: "technical",     label: "Technical" },
      { key: "physical",      label: "Physical" },
      { key: "psychological", label: "Psychological" },
      { key: "social",        label: "Social" }
    ],
    // The IDP for a player in a half-term window (defaults to the current one).
    // Returns { ht, focus:[{corner, area, drillUrl, drillTitle, feedback}, ...] }.
    idpFor(playerId, ht) {
      ht = ht || this._halfTermKey();
      const p = this.player(playerId) || {};
      const all = p.idp || {};
      const rec = all[ht] || { focus: [] };
      return { ht, focus: Array.isArray(rec.focus) ? rec.focus : [] };
    },
    // Has this player got a current-half-term IDP set (both focus areas filled)?
    idpNeedsRefresh(playerId) {
      const cur = this.idpFor(playerId);
      return cur.focus.filter(f => f && f.area).length < 2;
    },
    // Save the 2 focus areas for the current (or given) half-term. `focus` is an
    // array of up to 2 {corner, area, drillUrl, drillTitle, feedback}. We enforce
    // the spec: at most 2, the first is Technical.
    async saveIdp(playerId, focus, ht) {
      const p = this.player(playerId); if (!p) return { ok: false, msg: "Player not found" };
      ht = ht || this._halfTermKey();
      const clean = (Array.isArray(focus) ? focus : []).slice(0, 2).map((f, i) => ({
        corner: i === 0 ? "technical" : (f.corner || "physical"),
        area: (f.area || "").trim(),
        drillUrl: (f.drillUrl || "").trim(),
        drillTitle: (f.drillTitle || "").trim(),
        feedback: (f.feedback || "").trim()
      })).filter(f => f.area);
      p.idp = { ...(p.idp || {}), [ht]: { focus: clean } };
      if (LIVE) {
        const { error } = await this.sb.from("players").update({ idp: p.idp }).eq("id", playerId);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
    },
    // One-sentence post-match coach feedback slot, set per focus area (§5).
    async setIdpFeedback(playerId, focusIndex, feedback, ht) {
      const cur = this.idpFor(playerId, ht);
      if (!cur.focus[focusIndex]) return { ok: false, msg: "No focus area there" };
      cur.focus[focusIndex].feedback = (feedback || "").trim();
      return this.saveIdp(playerId, cur.focus, cur.ht);
    },

    /* admin: set a player's SEASON TOTALS for the viewed season (for past seasons where
       only totals are known — not game-by-game). Points are derived from the scoring rules.
       Where a season has a points ledger (the live season), the ledger still wins on display. */
    async updateSeasonTotals(id, t) {
      const p = this.player(id); if (!p) return { ok: false, msg: "Player not found" };
      if (!p.stats) p.stats = {};
      const SC = cfg.SCORING || {};
      const g = +t.goals || 0, a = +t.assists || 0, m = +t.motm || 0, s = +t.sessions || 0;
      const points = g * (SC.goal || 0) + a * (SC.assist || 0) + m * (SC.motm || 0) + s * (SC.trainingAttendance || 0);
      p.stats[this.season] = { ...(p.stats[this.season] || {}), goals: g, assists: a, motm: m, sessions: s, points };
      if (LIVE) {
        const { error } = await this.sb.from("players").update({ stats: p.stats }).eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      this._applySeason(); this._applyPoints();
      return { ok: true, points };
    },

    /* admin: roster management — add/remove a player for the selected season, set signed status */
    async setRoster(id, opts) {
      const p = this.player(id); if (!p) return { ok: false, msg: "Player not found" };
      let seasons = Array.isArray(p.seasons) ? [...p.seasons] : ["2025/26"];
      if (opts.inSeason !== undefined) {
        const set = new Set(seasons);
        if (opts.inSeason) set.add(this.season); else set.delete(this.season);
        seasons = [...set];
      }
      p.seasons = seasons;
      if (opts.signed !== undefined) p.signed = opts.signed;
      if (LIVE) {
        const { error } = await this.sb.from("players").update({ seasons: p.seasons, signed: p.signed }).eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
    },

    /* ================= VIDEO LIBRARY (the `drills` table) =================
       One library, added once. A video is either a TEAM video (team:true, whole
       squad) or assigned to specific children (team:false, player_ids:[...]). */
    _normalizeDrills() {
      (this.state.drills || []).forEach(d => {
        if (!Array.isArray(d.player_ids)) d.player_ids = [];
        // A video is "stock/unassigned" when it has NO team flag AND no children.
        // Only default an absent team flag to TRUE when the row is already assigned
        // to children would be wrong, so: legacy rows with neither marker became team
        // videos historically — preserve that, but never force a STOCK row (which has
        // team===false AND no player_ids) to become a team video.
        if (d.team === undefined || d.team === null) d.team = !(d.player_ids.length);
        if (d.folder === undefined) d.folder = null;
      });
    },
    // A video is STOCK (admin-only shelf) when it has no team assignment AND no child
    // assignment — regardless of which folder it sits in.
    isStockVideo(d) { return d && d.team !== true && !((d.player_ids || []).length); },
    // FAMILY-FACING lists: a stock/unassigned video must NEVER appear here.
    teamVideos() { return (this.state.drills || []).filter(d => d.team === true && !this.isStockVideo(d)); },
    videosForPlayer(pid) { return (this.state.drills || []).filter(d => !this.isStockVideo(d) && d.team !== true && (d.player_ids || []).includes(pid)); },

    /* ----- Stock library (admin-only) ----- */
    // Distinct folder names currently in use across stock videos (sorted A–Z).
    videoFolders() {
      const set = new Set();
      (this.state.drills || []).forEach(d => { if (this.isStockVideo(d) && d.folder) set.add(d.folder); });
      return [...set].sort((a, b) => a.localeCompare(b));
    },
    // Stock videos, optionally limited to one folder.
    stockVideos(folder) {
      const all = (this.state.drills || []).filter(d => this.isStockVideo(d));
      return folder === undefined ? all : all.filter(d => (d.folder || null) === (folder || null));
    },
    async addDrill(d) {
      this.state.drills = this.state.drills || [];
      const row = { title:d.title, url:d.url, area:d.area || null, description:d.description || null,
        team: d.team !== false, player_ids: d.player_ids || [], folder: d.folder || null };
      if (LIVE) {
        const { data, error } = await this.sb.from("drills").insert(row).select().single();
        if (error) return { ok: false, msg: error.message };
        this.state.drills.push(data);
      } else {
        row.id = this._nextId(this.state.drills); this.state.drills.push(row); this._persistContent();
      }
      return { ok: true };
    },
    // Add a STOCK video (unassigned) into a folder. No team, no children.
    async addStockVideo(d) {
      return this.addDrill({ title:d.title, url:d.url, area:d.area || null,
        description:d.description || null, team:false, player_ids:[], folder:d.folder || null });
    },

    async updateDrill(id, d) {
      const v = (this.state.drills || []).find(x => x.id === id); if (!v) return { ok:false, msg:"Video not found" };
      const fields = { title:d.title, url:d.url, area:d.area || null, description:d.description || null,
        team: d.team !== false, player_ids: d.player_ids || [], folder: (d.folder !== undefined ? d.folder : v.folder) || null };
      Object.assign(v, fields);
      if (LIVE) { const { error } = await this.sb.from("drills").update(fields).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok: true };
    },
    // Assign a (stock) video to the team OR to specific children — keeps its folder tag.
    // opts: { team:true } OR { playerIds:[...] }. Once assigned it shows to families.
    async assignVideo(id, opts) {
      const v = (this.state.drills || []).find(x => x.id === id); if (!v) return { ok:false, msg:"Video not found" };
      opts = opts || {};
      let fields;
      if (opts.team) fields = { team: true, player_ids: [] };
      else fields = { team: false, player_ids: (opts.playerIds || []).filter(Boolean) };
      Object.assign(v, fields);
      if (LIVE) { const { error } = await this.sb.from("drills").update(fields).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok: true };
    },
    // Move a video to a different folder (used to organise the stock shelf).
    async moveVideoToFolder(id, folder) {
      const v = (this.state.drills || []).find(x => x.id === id); if (!v) return { ok:false, msg:"Video not found" };
      v.folder = folder || null;
      if (LIVE) { const { error } = await this.sb.from("drills").update({ folder: v.folder }).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok: true };
    },
    // Rename a folder everywhere it's used (across all stock videos).
    async renameFolder(oldName, newName) {
      newName = (newName || "").trim() || null;
      for (const d of (this.state.drills || [])) {
        if (this.isStockVideo(d) && (d.folder || null) === (oldName || null)) await this.moveVideoToFolder(d.id, newName);
      }
      return { ok: true };
    },
    // "Delete" a folder = move its stock videos to no folder (videos are kept, not lost).
    async deleteFolder(name) { return this.renameFolder(name, null); },

    async deleteDrill(id) {
      this.state.drills = (this.state.drills || []).filter(d => d.id !== id);
      if (LIVE) {
        const { error } = await this.sb.from("drills").delete().eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
    },

    /* ================= OPPONENT DIRECTORY (arranging friendlies) =================
       Admin-only contact book of opposition managers. Seeded once from every
       distinct opponent that's ever appeared in the fixture list; the coach fills
       in the contact fields. This is opponent-ADULT contact info, never child data. */
    directory() { return [...(this.state.directory || [])].sort((a, b) => (a.club || "").localeCompare(b.club || "")); },
    _persistDirectory() { localStorage.setItem("harris_directory", JSON.stringify(this.state.directory || [])); },
    // Create a row for every distinct fixture opponent that isn't already in the
    // directory. Runs on load; only ADDS missing clubs so it never duplicates.
    async _seedDirectory() {
      this.state.directory = this.state.directory || [];
      const have = new Set((this.state.directory || []).map(d => (d.club || "").trim().toLowerCase()).filter(Boolean));
      const opponents = [];
      const seen = new Set();
      (this.state.fixtures || []).forEach(f => {
        const club = (f && f.opponent || "").trim();
        const key = club.toLowerCase();
        if (club && !seen.has(key) && !have.has(key)) { seen.add(key); opponents.push(club); }
      });
      for (const club of opponents) {
        await this.addDirectoryEntry({ club, manager: "", phone: "", email: "", ground: "" }, true);
      }
      return { ok: true, added: opponents.length };
    },
    async addDirectoryEntry(d, _seeding) {
      this.state.directory = this.state.directory || [];
      const row = { club: (d.club || "").trim(), manager: (d.manager || "").trim(),
        phone: (d.phone || "").trim(), email: (d.email || "").trim(), ground: (d.ground || "").trim() };
      if (!row.club) return { ok: false, msg: "Add a club / team name" };
      if (LIVE) {
        const { data, error } = await this.sb.from("directory").insert(row).select().single();
        if (error) { if (_seeding) return { ok: false }; return { ok: false, msg: error.message }; }
        this.state.directory.push(data);
      } else {
        row.id = this._nextId(this.state.directory); this.state.directory.push(row); this._persistDirectory();
      }
      return { ok: true };
    },
    async updateDirectoryEntry(id, d) {
      const row = (this.state.directory || []).find(x => x.id === id); if (!row) return { ok: false, msg: "Entry not found" };
      const fields = { club: (d.club || "").trim(), manager: (d.manager || "").trim(),
        phone: (d.phone || "").trim(), email: (d.email || "").trim(), ground: (d.ground || "").trim() };
      if (!fields.club) return { ok: false, msg: "Add a club / team name" };
      Object.assign(row, fields);
      if (LIVE) { const { error } = await this.sb.from("directory").update(fields).eq("id", id); if (error) return { ok: false, msg: error.message }; }
      else this._persistDirectory();
      return { ok: true };
    },
    async deleteDirectoryEntry(id) {
      this.state.directory = (this.state.directory || []).filter(x => x.id !== id);
      if (LIVE) { const { error } = await this.sb.from("directory").delete().eq("id", id); if (error) return { ok: false, msg: error.message }; }
      else this._persistDirectory();
      return { ok: true };
    },

    /* ================= POINTS LEDGER ================= */
    _persistLedger() { localStorage.setItem(LS_LEDGER, JSON.stringify(this.state.ledger || [])); },

    // ISO week id like "2026-W23" — used to key weekly things (quiz, make-your-bed).
    weekId(dateLike) {
      const d = dateLike ? new Date(dateLike) : new Date();
      const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = dt.getUTCDay() || 7;
      dt.setUTCDate(dt.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
      const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
      return dt.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
    },
    _seasonForDate(iso) {
      const f = (cfg.SEASONS || []).find(s => iso >= s.from && iso <= s.to);
      return (f && f.id) || this.season;
    },
    // The real, live season today falls in (NOT the season being viewed) — so a
    // child earning quiz/video/challenge points always banks them in the right season.
    currentSeason() { return this._seasonForDate(new Date().toISOString().slice(0, 10)); },

    // Calendar month key "2026-06" — used for Mover of the Month (§4) & monthly badges.
    monthId(dateLike) {
      const d = dateLike ? new Date(dateLike) : new Date();
      return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
    },
    // Half-term key (§8: 6 half-terms/season). Approximate English school half-terms by
    // splitting the season into 6 ~bimonthly windows from 1 July. Used for streak freezes
    // and the Trainer-of-the-Day rotation rule.
    _halfTermKey(dateLike) {
      const d = dateLike ? new Date(dateLike + (typeof dateLike === "string" && dateLike.length === 10 ? "T00:00:00Z" : "")) : new Date();
      if (isNaN(d)) return "ht?";
      const cs = this._seasonForDate(d.toISOString().slice(0, 10));
      const r = (cfg.SEASONS || []).find(s => s.id === cs);
      const start = r ? new Date(r.from + "T00:00:00Z") : new Date(Date.UTC(d.getUTCFullYear(), 6, 1));
      const months = (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + (d.getUTCMonth() - start.getUTCMonth());
      const idx = Math.max(0, Math.min(5, Math.floor(months / 2)));
      return cs + ":ht" + idx;
    },
    _urlKey(url) {
      // Prefer the stable YouTube video id; fall back to a normalised tail.
      const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
      if (m) return "yt" + m[1];
      const vm = String(url || "").match(/vimeo\.com\/(\d+)/);
      if (vm) return "vm" + vm[1];
      return String(url || "").replace(/[^a-z0-9]/gi, "").slice(-24);
    },

    ledgerFor(playerId, season) {
      season = season || this.season;
      return (this.state.ledger || []).filter(e => e.player_id === playerId && e.season === season);
    },
    ledgerSum(playerId, season) { return this.ledgerFor(playerId, season).reduce((n, e) => n + (e.points || 0), 0); },
    countCat(playerId, category, season) {
      return this.ledgerFor(playerId, season).filter(e => e.category === category).length;
    },
    catPoints(playerId, category, season) {
      return this.ledgerFor(playerId, season).filter(e => e.category === category).reduce((n, e) => n + (e.points || 0), 0);
    },
    quizPoints(playerId, season) { return this.catPoints(playerId, "quiz", season); },
    trainingPoints(playerId, season) { return this.catPoints(playerId, "attendance", season) + this.catPoints(playerId, "trainer", season) + this.catPoints(playerId, "streak", season); },
    videoWatches(playerId, season) { return this.countCat(playerId, "video", season); },

    // Achievements/badges earned, computed from the ledger (no manual marking).
    earnedAchievements(playerId, season) {
      season = season || this.season;
      const out = [], p = this.player(playerId); if (!p) return out;
      const goals = this.countCat(playerId, "goal", season);
      const motm = this.countCat(playerId, "motm", season);
      const max = Math.max(0, ...this.roster(true).map(x => this.countCat(x.id, "goal", season)));
      if (goals > 0 && goals === max) out.push("topscorer");
      if (motm >= 4) out.push("motm4");
      const byMatch = {};
      this.ledgerFor(playerId, season).filter(e => e.category === "goal" && e.ref).forEach(e => {
        const m = e.ref.split(":").slice(0, 2).join(":"); byMatch[m] = (byMatch[m] || 0) + 1;
      });
      if (Object.values(byMatch).some(c => c >= 3)) out.push("hattrick");
      // Quiz Ace = at least one perfect quiz; Quiz Whizz = 4 perfect quizzes (§7).
      const perfectQuizzes = this.ledgerFor(playerId, season).filter(e => e.category === "quiz" && /perfect/i.test(e.note || "")).length;
      if (perfectQuizzes >= 1) out.push("quizace");
      if (perfectQuizzes >= 4) out.push("quizwhizz");
      // Home Team Hero — coach-awarded monthly badge, stored as a manual badge row.
      if (this.ledgerFor(playerId, season).some(e => e.category === "badge" && /home team hero/i.test(e.note || ""))) out.push("hometeamhero");
      if (this.ledgerFor(playerId, season).some(e => e.category === "manual" && /perfect month/i.test(e.note || ""))) out.push("perfect");
      return out;
    },
    ledgerHas(ref) { return !!ref && (this.state.ledger || []).some(e => e.ref === ref); },

    // Recompute each player's headline numbers from the ledger (current season).
    // If a season has NO ledger rows for a player (e.g. the 2025/26 archive, whose
    // stats live in players.stats), keep the _applySeason projection so historical
    // records aren't wiped to zero.
    _applyPoints() {
      const s = this.season;
      const SC = cfg.SCORING || {};
      (this.state.players || []).forEach(p => {
        const st = (p.stats && p.stats[s]) || {};
        const g = st.goals || 0, a = st.assists || 0, m = st.motm || 0, ses = st.sessions || 0;
        // Season AP is COMPUTED from the archived stats with ONE formula so every player
        // is on the same scale (goals×10 + assists×10 + MOTM×15 + training×20), PLUS any
        // live ledger activity. Live seasons carry no stored totals (perf = 0), so the
        // ledger drives those — performance is recorded as stored totals (archive) OR as
        // match-result ledger events (live), never both, so this never double-counts.
        const perf = g*(SC.goal||0) + a*(SC.assist||0) + m*(SC.motm||0) + ses*(SC.trainingAttendance||0);
        p.points   = perf + this.ledgerSum(p.id, s);
        p.goals    = g + this.countCat(p.id, "goal", s);
        p.assists  = a + this.countCat(p.id, "assist", s);
        p.motm     = m + this.countCat(p.id, "motm", s);
        p.sessions = ses + this.countCat(p.id, "attendance", s);
      });
    },

    /* ================= STREAKS (§1A/B/E) =================
       Generic weekly-streak engine. A streak bonus is awarded for every block of
       4 consecutive "active weeks" for a category. One freeze per half-term means a
       single missed week inside a half-term does NOT break the run. Recomputed
       idempotently from the ledger (ref `streak:<sourceCat>:<playerId>:<weekId>`). */
    _activeWeeksFor(playerId, sourceCat, season) {
      // Returns a sorted array of {week, ht} for which the player has a qualifying event.
      const wks = {};
      this.ledgerFor(playerId, season).filter(e => e.category === sourceCat && e.ref).forEach(e => {
        const w = this._weekFromRef(e.ref);
        if (w) wks[w] = true;
      });
      return Object.keys(wks).sort();
    },
    _weekFromRef(ref) {
      // attendance: train:YYYY-MM-DD:...  → derive ISO week
      let m = String(ref || "").match(/^train:(\d{4}-\d{2}-\d{2}):/);
      if (m) return this.weekId(m[1]);
      // quiz / challenge / homework store the week directly: cat:season:YYYY-Www:...
      m = String(ref || "").match(/(\d{4}-W\d{2})/);
      return m ? m[1] : null;
    },
    _allWeeksBetween(weeks) {
      // Build the full ordered list of ISO weeks spanned, so we can detect gaps.
      if (!weeks.length) return [];
      const toDate = w => {
        const [y, ww] = w.split("-W").map(Number);
        const simple = new Date(Date.UTC(y, 0, 1 + (ww - 1) * 7));
        const dow = simple.getUTCDay() || 7;
        simple.setUTCDate(simple.getUTCDate() - dow + 1);
        return simple;
      };
      const start = toDate(weeks[0]), end = toDate(weeks[weeks.length - 1]);
      const out = [];
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 7)) out.push(this.weekId(d));
      return out;
    },
    // Recompute streak bonuses for a category across the whole roster.
    async _recomputeStreakFor(sourceCat, bonusKey, season) {
      const SC = cfg.SCORING || {};
      const bonus = SC[bonusKey] || 0;
      const refPrefix = `streak:${sourceCat}:`;
      const newEvents = [];
      this.roster(true).forEach(p => {
        const active = new Set(this._activeWeeksFor(p.id, sourceCat, season));
        if (!active.size) return;
        const ordered = [...active].sort();
        const span = this._allWeeksBetween(ordered);
        let run = 0, freezeUsedHT = {}, awardedBlocks = 0;
        span.forEach(wk => {
          if (active.has(wk)) {
            run++;
          } else {
            // missed week — try to spend the one freeze for this half-term
            const ht = this._halfTermKey(this._weekStartIso(wk));
            if (run > 0 && !freezeUsedHT[ht]) { freezeUsedHT[ht] = true; /* freeze: run continues */ }
            else { run = 0; }
          }
          if (run > 0 && run % 4 === 0) {
            awardedBlocks++;
            newEvents.push({ player_id: p.id, season, category: "streak", points: bonus,
              note: `${sourceCat} 4-streak`, ref: `${refPrefix}${p.id}:${wk}` });
          }
        });
      });
      // Replace all streak rows for this source category in one idempotent pass.
      this.state.ledger = this.state.ledger || [];
      if (LIVE) { await this.sb.from("point_events").delete().like("ref", refPrefix + "%"); }
      this.state.ledger = this.state.ledger.filter(e => !(e.ref && e.ref.startsWith(refPrefix)));
      for (const ev of newEvents) {
        const row = { player_id: ev.player_id, season: ev.season, category: "streak", points: ev.points, note: ev.note, ref: ev.ref };
        if (LIVE) { const { data, error } = await this.sb.from("point_events").insert(row).select().single(); if (!error) this.state.ledger.push(data); }
        else { row.id = this._nextId(this.state.ledger); this.state.ledger.push(row); }
      }
      if (!LIVE) this._persistLedger();
    },
    _weekStartIso(wk) {
      const [y, ww] = wk.split("-W").map(Number);
      const simple = new Date(Date.UTC(y, 0, 1 + (ww - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      simple.setUTCDate(simple.getUTCDate() - dow + 1);
      return simple.toISOString().slice(0, 10);
    },
    async _recomputeStreaks(season) {
      season = season || this.season;
      await this._recomputeStreakFor("attendance", "trainingStreak", season);
      await this._recomputeStreakFor("challenge", "challengeStreak", season);
      await this._recomputeStreakFor("quiz", "quizStreak", season);
      this._applyPoints();
    },

    /* ================= CARD TIERS (§6) =================
       Season AP thresholds, one-way. Icon also requires 2 Gold skill checks. */
    skillGoldCount(playerId, season) {
      season = season || this.season;
      return this.ledgerFor(playerId, season).filter(e => e.category === "skill" && /gold/i.test(e.note || "")).length;
    },
    tierOf(playerId, season) {
      season = season || this.season;
      // Computed AP (matches _applyPoints): performance from stats + live ledger.
      const _SC = cfg.SCORING || {};
      const _p = this.player(playerId) || {};
      const _st = (_p.stats && _p.stats[season]) || {};
      const _perf = (_st.goals||0)*(_SC.goal||0) + (_st.assists||0)*(_SC.assist||0) + (_st.motm||0)*(_SC.motm||0) + (_st.sessions||0)*(_SC.trainingAttendance||0);
      const ap = _perf + this.ledgerSum(playerId, season);
      const golds = this.skillGoldCount(playerId, season);
      const tiers = cfg.TIERS || [];
      let cur = tiers[0];
      tiers.forEach(t => {
        if (ap >= t.min && (!t.goldSkillChecks || golds >= t.goldSkillChecks)) cur = t;
      });
      return { ...cur, ap, golds };
    },
    // Last season's tier, for the "legacy crest" on a fresh Bronze card (§6).
    legacyTier(playerId) {
      const seasons = (cfg.SEASONS || []).map(s => s.id);
      const idx = seasons.indexOf(this.season);
      if (idx <= 0) return null;
      const prev = seasons[idx - 1];
      const t = this.tierOf(playerId, prev);
      return t && t.ap > 0 ? t : null;
    },

    /* ================= MOVER OF THE MONTH (§4) =================
       AP gained this calendar month (the ONLY ranked list). Winner = home spotlight +25.
       Computed from created_at where available, else from ref-embedded dates. */
    _eventMonth(e) {
      if (e.created_at) return this.monthId(e.created_at);
      const m = String(e.ref || "").match(/(\d{4}-\d{2}-\d{2})/);
      if (m) return this.monthId(m[1] + "T00:00:00Z");
      const w = String(e.ref || "").match(/(\d{4})-W(\d{2})/);
      if (w) return this.monthId(this._weekStartIso(w[1] + "-W" + w[2]) + "T00:00:00Z");
      return this.monthId();
    },
    moverOfMonth(month, season) {
      month = month || this.monthId();
      season = season || this.season;
      const gains = {};
      (this.state.ledger || []).filter(e => e.season === season && this._eventMonth(e) === month)
        .forEach(e => { gains[e.player_id] = (gains[e.player_id] || 0) + (e.points || 0); });
      const rows = this.roster(true).map(p => ({ player: p, playerId: p.id, gain: gains[p.id] || 0 }))
        .sort((a, b) => b.gain - a.gain);
      const top = rows.find(r => r.gain > 0) || null;
      return { month, rows, winner: top };
    },

    /* ================= QUIET-PLAYER DASHBOARD FLAG (§11) =================
       Coach-only signal (NOT shown to families): a player whose season AP is in
       the bottom quartile of the squad AND who has had no award (coach award or
       badge) in the last 3 weeks. It's a "have a quiet word / spread an award"
       prompt for the coach, never a punishment and never surfaced to kids. */
    // Categories that count as an "award" for the quiet-player check.
    _AWARD_CATEGORIES: ["motm", "moment", "captains", "mover", "badge"],
    awardedWithinWeeks(playerId, weeks, season) {
      season = season || this.currentSeason();
      const cut = new Date(); cut.setUTCDate(cut.getUTCDate() - weeks * 7);
      return this.ledgerFor(playerId, season).some(e => {
        if (!this._AWARD_CATEGORIES.includes(e.category)) return false;
        // Use created_at when present, else any date embedded in the ref.
        let when = e.created_at ? new Date(e.created_at) : null;
        if (!when) { const m = String(e.ref || "").match(/(\d{4}-\d{2}-\d{2})/); if (m) when = new Date(m[1] + "T00:00:00Z"); }
        if (!when) { const w = String(e.ref || "").match(/(\d{4})-W(\d{2})/); if (w) when = new Date(this._weekStartIso(w[1] + "-W" + w[2]) + "T00:00:00Z"); }
        return when ? when >= cut : true; // undated award row → treat as recent (safe: fewer false quiet flags)
      });
    },
    quietPlayerFlag(playerId, season) {
      season = season || this.currentSeason();
      const ros = this.roster(true);
      if (ros.length < 4) return false;                       // quartile is meaningless on a tiny squad
      const ap = this.ledgerSum(playerId, season);
      const totals = ros.map(p => this.ledgerSum(p.id, season)).sort((a, b) => a - b);
      // Bottom-quartile threshold: the 25th-percentile AP value.
      const q1 = totals[Math.floor((totals.length - 1) * 0.25)];
      const bottomQuartile = ap <= q1;
      return bottomQuartile && !this.awardedWithinWeeks(playerId, 3, season);
    },
    // Convenience: every flagged player, for the coach dashboard.
    quietPlayers(season) {
      season = season || this.currentSeason();
      return this.roster(true).filter(p => this.quietPlayerFlag(p.id, season));
    },

    async addPoints(ev) {
      this.state.ledger = this.state.ledger || [];
      if (this.ledgerHas(ev.ref)) return { ok: true, dup: true };
      const row = { player_id: ev.player_id, season: ev.season || this.season,
        category: ev.category, points: ev.points || 0, note: ev.note || null, ref: ev.ref || null };
      if (LIVE) {
        const { data, error } = await this.sb.from("point_events").insert(row).select().single();
        if (error) return { ok: false, msg: error.message };
        this.state.ledger.push(data);
      } else { row.id = this._nextId(this.state.ledger); this.state.ledger.push(row); this._persistLedger(); }
      this._applyPoints();
      return { ok: true };
    },

    // Delete every row whose ref starts with prefix, then add the new set. Used so
    // re-entering a result / register cleanly replaces its points (no double-count).
    async replacePoints(refPrefix, events) {
      this.state.ledger = this.state.ledger || [];
      if (LIVE) { await this.sb.from("point_events").delete().like("ref", refPrefix + "%"); }
      this.state.ledger = this.state.ledger.filter(e => !(e.ref && e.ref.startsWith(refPrefix)));
      for (const ev of events) {
        const row = { player_id: ev.player_id, season: ev.season || this.season,
          category: ev.category, points: ev.points || 0, note: ev.note || null, ref: ev.ref || null };
        if (LIVE) {
          const { data, error } = await this.sb.from("point_events").insert(row).select().single();
          if (error) return { ok: false, msg: error.message };
          this.state.ledger.push(data);
        } else { row.id = this._nextId(this.state.ledger); this.state.ledger.push(row); }
      }
      if (!LIVE) this._persistLedger();
      this._applyPoints();
      return { ok: true };
    },

    // Training register (§1A): attendance +20 + optional Trainer of the Day +10.
    // entries = [{playerId, attended}], trainerId = playerId | null
    async saveRegister(date, entries, trainerId) {
      const season = this._seasonForDate(date), SC = cfg.SCORING || {}, events = [];
      const attendedIds = new Set();
      entries.forEach(en => {
        if (en.attended) {
          attendedIds.add(en.playerId);
          events.push({ player_id: en.playerId, season, category: "attendance",
            points: SC.trainingAttendance, note: "Training " + date, ref: `train:${date}:${en.playerId}:att` });
        }
      });
      // Trainer of the Day — coach pick, must have attended.
      if (trainerId && attendedIds.has(trainerId)) {
        events.push({ player_id: trainerId, season, category: "trainer",
          points: SC.trainerOfTheDay, note: "Trainer of the Day " + date, ref: `train:${date}:${trainerId}:trainer` });
      }
      const res = await this.replacePoints(`train:${date}:`, events);
      // After attendance is banked, recompute the 4-week training streak bonuses.
      await this._recomputeStreaks(season);
      return res;
    },
    registerState(date) {
      const out = {};
      (this.state.ledger || []).filter(e => e.ref && e.ref.startsWith(`train:${date}:`)).forEach(e => {
        const st = (out[e.player_id] = out[e.player_id] || { attended: false, trainer: false });
        if (e.ref.endsWith(":att")) st.attended = true;
        if (e.ref.endsWith(":trainer")) st.trainer = true;
      });
      return out;
    },
    // Who has been Trainer of the Day this half-term (for the rotation hint, §1A).
    trainerOfDayThisHalfTerm(season) {
      season = season || this.season;
      const ht = this._halfTermKey();
      const counts = {};
      (this.state.ledger || []).filter(e => e.category === "trainer" && e.season === season &&
        this._halfTermKey(this._dateFromTrainRef(e.ref)) === ht)
        .forEach(e => { counts[e.player_id] = (counts[e.player_id] || 0) + 1; });
      return counts; // { playerId: timesWon }
    },
    _dateFromTrainRef(ref) { const m = String(ref || "").match(/^train:(\d{4}-\d{2}-\d{2}):/); return m ? m[1] : null; },

    // Weekly quiz result (§1E): completion +10, perfect +5. One per child per week,
    // banked in the live season. `correct`/`total` come from the auto-marked run.
    async recordQuiz(playerId, correct, total) {
      const cs = this.currentSeason(), wk = this.weekId(), SC = cfg.SCORING || {};
      const perfect = total != null && total > 0 && correct >= total;
      const points = (SC.quizComplete || 0) + (perfect ? (SC.quizPerfect || 0) : 0);
      const res = await this.addPoints({ player_id: playerId, season: cs, category: "quiz",
        points, note: `Quiz ${wk} (${correct}/${total}${perfect ? " perfect" : ""})`,
        ref: `quiz:${cs}:${wk}:${playerId}` });
      await this._recomputeStreakFor("quiz", "quizStreak", cs);
      await this._refreshHomework(playerId, wk, cs);
      this._applyPoints();
      return res;
    },
    quizDoneThisWeek(playerId) { return this.ledgerHas(`quiz:${this.currentSeason()}:${this.weekId()}:${playerId}`); },
    // raw quiz score (correct count) parsed from the note, for the results table.
    quizScoreThisWeek(playerId, week) {
      week = week || this.weekId();
      const e = (this.state.ledger || []).find(x => x.category === "quiz" && x.ref && x.ref.includes(`:${week}:${playerId}`));
      if (!e) return null;
      const m = String(e.note || "").match(/\((\d+)\/(\d+)/);
      return m ? { correct: +m[1], total: +m[2], points: e.points } : { correct: null, total: null, points: e.points };
    },
    quizResults(week) {
      week = week || this.weekId();
      const map = {};
      (this.state.ledger || []).filter(e => e.category === "quiz" && e.season === this.season && e.ref && e.ref.includes(`:${week}:`))
        .forEach(e => { const sc = this.quizScoreThisWeek(e.player_id, week); map[e.player_id] = sc; });
      return map;
    },

    /* ----- weekly quiz: fresh rotation from the bank, with optional coach override ----- */
    _weekHash(salt) { const s = this.weekId() + (salt || ""); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; },
    _rotatePick(arr, n, salt) {
      if (!arr.length) return [];
      if (arr.length <= n) return arr.slice();
      const off = this._weekHash(salt) % arr.length, out = [];
      for (let i = 0; i < n; i++) out.push(arr[(off + i) % arr.length]);
      return out;
    },
    // The quiz to play THIS week — a coach override if one exists, else a rotated set from the bank.
    currentQuiz() {
      const meta = (this.state && this.state.quiz) || window.HARRIS_DATA.quiz || { title: "Weekly Quiz" };
      const wk = this.weekId();
      const custom = (this.state.quizzes || {})[wk];
      if (custom && custom.length) return { title: meta.title, week: wk, custom: true, questions: custom };
      const bank = this.state.quizBank || window.HARRIS_DATA.quizBank || [];
      const per = meta.perWeek || { skill: 5, gen: 5, foot: 10 };
      const questions = [].concat(
        this._bandedPick(bank.filter(q => q.cat === "skill"), per.skill, "skill"),
        this._bandedPick(bank.filter(q => q.cat === "gen"), per.gen, "gen"),
        this._bandedPick(bank.filter(q => q.cat === "foot"), per.foot, "foot")
      );
      return { title: meta.title, week: wk, custom: false, questions };
    },
    // Pick `n` from `pool` for this week, mixing difficulty bands (§1E) so every
    // reading level can score. Roughly weights starter > standard > stretch, then
    // rotates within each band by ISO week so the set still changes automatically.
    _bandedPick(pool, n, salt) {
      if (pool.length <= n) return pool.slice();
      const banded = b => pool.filter(q => (q.band || "standard") === b);
      const starter = banded("starter"), standard = banded("standard"), stretch = banded("stretch");
      // target split — bias toward the easier bands so it stays winnable
      let wantStart = Math.round(n * 0.45), wantStd = Math.round(n * 0.35);
      let wantStr = n - wantStart - wantStd;
      const out = []
        .concat(this._rotatePick(starter, Math.min(wantStart, starter.length), salt + "S"))
        .concat(this._rotatePick(standard, Math.min(wantStd, standard.length), salt + "M"))
        .concat(this._rotatePick(stretch, Math.min(wantStr, stretch.length), salt + "T"));
      // top up from the whole pool if any band was short
      if (out.length < n) {
        const have = new Set(out.map(q => q.q));
        for (const q of this._rotatePick(pool, pool.length, salt + "X")) {
          if (out.length >= n) break;
          if (!have.has(q.q)) { out.push(q); have.add(q.q); }
        }
      }
      return out.slice(0, n);
    },
    // Coverage audit (§1E + four-corner): counts of the live bank by tag, so the
    // coach screen can show "every corner and band is covered".
    quizCoverage() {
      const bank = this.state.quizBank || window.HARRIS_DATA.quizBank || [];
      const tally = (key) => bank.reduce((m, q) => { const k = q[key] || "—"; m[k] = (m[k] || 0) + 1; return m; }, {});
      return { total: bank.length, band: tally("band"), cat: tally("cat"),
        corner: tally("corner"), topic: tally("topic") };
    },
    // A brand-new random set drawn from the bank (for the "new set" button).
    shuffleQuiz() {
      const bank = this.state.quizBank || [], per = (this.state.quiz || {}).perWeek || { skill: 5, gen: 5, foot: 10 };
      const pick = (cat, n) => { const a = bank.filter(q => q.cat === cat).slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
      return [].concat(pick("skill", per.skill), pick("gen", per.gen), pick("foot", per.foot));
    },
    async saveCustomQuiz(questions) {
      const wk = this.weekId();
      this.state.quizzes = this.state.quizzes || {};
      this.state.quizzes[wk] = questions;
      if (LIVE) { const { error } = await this.sb.from("quizzes").upsert({ week: wk, questions, season: this.currentSeason() }, { onConflict: "week" }); if (error) return { ok: false, msg: error.message }; }
      else localStorage.setItem("harris_quizzes", JSON.stringify(this.state.quizzes));
      return { ok: true };
    },
    async resetCustomQuiz() {
      const wk = this.weekId();
      if (this.state.quizzes) delete this.state.quizzes[wk];
      if (LIVE) { const { error } = await this.sb.from("quizzes").delete().eq("week", wk); if (error) return { ok: false, msg: error.message }; }
      else localStorage.setItem("harris_quizzes", JSON.stringify(this.state.quizzes || {}));
      return { ok: true };
    },

    /* ----- match appearances (who actually played) ----- */
    appearances(playerId, season) {
      season = season || this.season;
      return (this.state.fixtures || []).filter(f => this._seasonForDate(f.date) === season && Array.isArray(f.lineup) && f.lineup.includes(playerId)).length;
    },

    // Video watch — v1.1 §1 does NOT award AP for watching videos. Videos are content
    // only now. Kept as a no-op so any existing caller never throws or banks AP.
    // (FLAGGED to the user: re-enable AP here only on explicit instruction.)
    async recordVideoWatch(playerId, url) { return { ok: true, dup: true, noop: true }; },

    /* ----- Weekly Challenge (§1B) ----- */
    // The current week's challenge rotates the FA four corners across the month.
    weeklyChallenge(week) {
      const D = (this.state && this.state) || window.HARRIS_DATA || {};
      const bank = D.exercises || (window.HARRIS_DATA && window.HARRIS_DATA.exercises) || [];
      const weekly = bank.filter(x => x.weekly !== false);
      if (!weekly.length) return null;
      const wk = week || this.weekId();
      const n = parseInt(wk.split("-W")[1], 10) || 0;
      // Rotate the FA four corners across the month IN ORDER (technical → ball →
      // movement → game): the week number picks the corner, and within that corner
      // we cycle through that corner's challenges so months stay fresh.
      const order = D.cornerOrder || (window.HARRIS_DATA && window.HARRIS_DATA.cornerOrder) || ["technical","ball","physical","game"];
      const corner = order[n % order.length];
      const inCorner = weekly.filter(x => x.corner === corner);
      if (!inCorner.length) return weekly[n % weekly.length];   // fallback: any
      // which cycle through this corner are we on (every `order.length` weeks)
      const cycle = Math.floor(n / order.length);
      return inCorner[cycle % inCorner.length];
    },
    // Coach preview: the 4-corner rotation as it will fall over the next N weeks.
    challengeRotation(weeks) {
      weeks = weeks || 4;
      const base = this.weekId(), [y, ww] = base.split("-W").map(Number), out = [];
      for (let i = 0; i < weeks; i++) {
        const wk = y + "-W" + String(ww + i).padStart(2, "0");
        const c = this.weeklyChallenge(wk);
        if (c) out.push({ week: wk, challenge: c });
      }
      return out;
    },
    // Mark this week's challenge done (parent confirm). `shown` = shown to coach / clip (+5).
    async tickChallenge(playerId, shown) {
      const cs = this.currentSeason(), wk = this.weekId(), SC = cfg.SCORING || {};
      const points = (SC.challenge || 0) + (shown ? (SC.challengeShown || 0) : 0);
      const res = await this.addPoints({ player_id: playerId, season: cs, category: "challenge",
        points, note: `Weekly challenge ${wk}${shown ? " (shown to coach)" : ""}`,
        ref: `chal:${cs}:${wk}:${playerId}` });
      await this._recomputeStreakFor("challenge", "challengeStreak", cs);
      await this._refreshHomework(playerId, wk, cs);
      this._applyPoints();
      return res;
    },
    challengeDoneThisWeek(playerId) { return this.ledgerHas(`chal:${this.currentSeason()}:${this.weekId()}:${playerId}`); },

    /* ================= HOMEWORK GATE (§1F) — parent controlled =================
       Homework = this week's Challenge (§B) + Quiz (§E). Both done by the deadline → +5;
       not complete → −5 and a private bench flag for the coach. AP floor 0/week, never
       compounding, never reducing tier, one-tap coach override, 3-week pattern flag. */
    homeworkDeadline(week) {
      // Default: 6pm the day before the week's match (we approximate to the week's
      // Saturday minus DAYS_BEFORE at HOMEWORK_DEADLINE_HOUR). Configurable in config.
      const ws = this._weekStartIso(week || this.weekId());          // Monday
      const d = new Date(ws + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 5 - (cfg.HOMEWORK_DEADLINE_DAYS_BEFORE || 1)); // ~Fri/Sat
      d.setUTCHours(cfg.HOMEWORK_DEADLINE_HOUR != null ? cfg.HOMEWORK_DEADLINE_HOUR : 18, 0, 0, 0);
      return d;
    },
    homeworkComplete(playerId, week) {
      week = week || this.weekId();
      const cs = this.currentSeason();
      return this.ledgerHas(`chal:${cs}:${week}:${playerId}`) && this.ledgerHas(`quiz:${cs}:${week}:${playerId}`);
    },
    homeworkOverridden(playerId, week) {
      week = week || this.weekId();
      return this.ledgerHas(`hwoverride:${this.currentSeason()}:${week}:${playerId}`);
    },
    // Recompute the homework outcome row for a player/week. Called whenever the
    // challenge or quiz state changes, and by the deadline sweep.
    async _refreshHomework(playerId, week, season) {
      week = week || this.weekId(); season = season || this.currentSeason();
      const SC = cfg.SCORING || {};
      const ref = `homework:${season}:${week}:${playerId}`;
      const overridden = this.homeworkOverridden(playerId, week);
      const complete = this.homeworkComplete(playerId, week);
      const pastDeadline = new Date() > this.homeworkDeadline(week);
      let points = 0, note = null;
      if (overridden) { points = 0; note = `Homework waived ${week} (coach override)`; }
      else if (complete) { points = SC.homeworkBonus; note = `Homework complete ${week}`; }
      else if (pastDeadline) {
        // Missed: −5, but FLOORED so the player's WEEKLY AP can't go below 0.
        const weeklyBefore = this._weeklyAP(playerId, week, season, ref); // exclude this row
        points = Math.max(SC.homeworkPenalty, -weeklyBefore);
        note = `Homework missed ${week}`;
      } else {
        // Before the deadline and not yet complete — no row yet (fresh slate).
        return this._removeRef(ref);
      }
      return this._upsertRef({ player_id: playerId, season, category: "homework", points, note, ref });
    },
    // Total AP a player earned in a given ISO week (used for the §1F floor).
    _weeklyAP(playerId, week, season, excludeRef) {
      season = season || this.currentSeason();
      return this.ledgerFor(playerId, season)
        .filter(e => e.ref !== excludeRef && this._weekFromRef(e.ref) === week)
        .reduce((n, e) => n + (e.points || 0), 0);
    },
    async _upsertRef(ev) {
      this.state.ledger = this.state.ledger || [];
      const existing = (this.state.ledger || []).find(e => e.ref === ev.ref);
      if (existing) {
        existing.points = ev.points; existing.note = ev.note;
        if (LIVE) await this.sb.from("point_events").update({ points: ev.points, note: ev.note }).eq("ref", ev.ref);
        else this._persistLedger();
        return { ok: true };
      }
      return this.addPoints(ev);
    },
    async _removeRef(ref) {
      this.state.ledger = (this.state.ledger || []).filter(e => e.ref !== ref);
      if (LIVE) await this.sb.from("point_events").delete().eq("ref", ref);
      else this._persistLedger();
      return { ok: true };
    },
    // Private coach-only bench flag: missed homework + past deadline + not overridden.
    benchFlag(playerId, week) {
      week = week || this.weekId();
      if (this.homeworkOverridden(playerId, week)) return false;
      return !this.homeworkComplete(playerId, week) && new Date() > this.homeworkDeadline(week);
    },
    // 3 consecutive missed weeks → private pattern note for the coach (§1F).
    homeworkPatternFlag(playerId) {
      const cs = this.currentSeason();
      let streak = 0;
      for (let back = 0; back < 8; back++) {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - back * 7);
        const wk = this.weekId(d);
        if (new Date() <= this.homeworkDeadline(wk)) continue;          // current/future week: skip
        if (this.homeworkOverridden(playerId, wk)) { break; }            // override breaks the pattern
        if (this.homeworkComplete(playerId, wk)) break;
        streak++;
        if (streak >= 3) return true;
      }
      return false;
    },
    // Coach one-tap override (illness / first week back) — waives the gate for a week.
    async overrideHomework(playerId, week) {
      week = week || this.weekId();
      const cs = this.currentSeason();
      await this.addPoints({ player_id: playerId, season: cs, category: "hwoverride", points: 0,
        note: `Homework waived ${week}`, ref: `hwoverride:${cs}:${week}:${playerId}` });
      return this._refreshHomework(playerId, week, cs);
    },
    async clearHomeworkOverride(playerId, week) {
      week = week || this.weekId();
      await this._removeRef(`hwoverride:${this.currentSeason()}:${week}:${playerId}`);
      return this._refreshHomework(playerId, week, this.currentSeason());
    },

    /* ================= HOME TEAM CHORES (§1G) — parent controlled =================
       Up to 3 chores/week, +10 each on parent tick, private to the family,
       deduction-free, with a re-issuable default list. */
    DEFAULT_CHORES: ["Tidy your room", "Kit washed & packed", "Help with dinner"],
    choresFor(playerId, week) {
      week = week || this.weekId();
      const all = (this.state.chores || {});
      return (all[`${week}:${playerId}`]) || null;   // {list:[...], done:[bool,bool,bool]}
    },
    // Parent sets / re-issues the week's chore list (max 3).
    async setChores(playerId, list, week) {
      week = week || this.weekId();
      list = (list || []).filter(Boolean).slice(0, (cfg.SCORING || {}).choresPerWeek || 3);
      this.state.chores = this.state.chores || {};
      const key = `${week}:${playerId}`;
      const cur = this.state.chores[key] || { list: [], done: [] };
      const done = list.map((_, i) => !!cur.done[i]);
      this.state.chores[key] = { list, done };
      if (LIVE) await this.sb.from("chores").upsert({ week, player_id: playerId, list, done }, { onConflict: "week,player_id" });
      else localStorage.setItem("harris_chores", JSON.stringify(this.state.chores));
      await this._syncChorePoints(playerId, week);
      return { ok: true };
    },
    // Re-issue last week's (or the default) chore list to this week.
    async reissueChores(playerId, week) {
      week = week || this.weekId();
      // find the most recent prior week with a list
      let prior = null;
      for (let back = 1; back <= 8 && !prior; back++) {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - back * 7);
        const c = this.choresFor(playerId, this.weekId(d));
        if (c && c.list && c.list.length) prior = c.list;
      }
      return this.setChores(playerId, prior || this.DEFAULT_CHORES, week);
    },
    // Parent ticks/unticks a chore → +10 AP each (deduction-free; max 30/week).
    async tickChore(playerId, index, done, week) {
      week = week || this.weekId();
      const c = this.choresFor(playerId, week);
      if (!c) return { ok: false, msg: "No chores set this week" };
      c.done[index] = !!done;
      this.state.chores[`${week}:${playerId}`] = c;
      if (LIVE) await this.sb.from("chores").upsert({ week, player_id: playerId, list: c.list, done: c.done }, { onConflict: "week,player_id" });
      else localStorage.setItem("harris_chores", JSON.stringify(this.state.chores));
      await this._syncChorePoints(playerId, week);
      return { ok: true };
    },
    // One ledger row per ticked chore (idempotent, capped at 3/week → 30 AP).
    async _syncChorePoints(playerId, week) {
      week = week || this.weekId();
      const cs = this.currentSeason(), SC = cfg.SCORING || {};
      const c = this.choresFor(playerId, week) || { done: [] };
      const cap = SC.choresPerWeek || 3;
      const refPrefix = `chore:${cs}:${week}:${playerId}:`;
      const events = [];
      c.done.forEach((d, i) => {
        if (d && i < cap) events.push({ player_id: playerId, season: cs, category: "chore",
          points: SC.chore, note: `Home Team chore ${week}`, ref: `${refPrefix}${i}` });
      });
      const res = await this.replacePoints(refPrefix, events);
      this._applyPoints();
      return res;
    },

    // Coach manual adjustment (corrections, one-offs).
    async addManual(playerId, points, note) {
      return this.addPoints({ player_id: playerId, season: this.season, category: "manual",
        points, note: note || "Coach adjustment", ref: `manual:${Date.now()}:${playerId}` });
    },

    /* ----- Coach awards: Captain's Award (§1D), Save of the Day already in match ----- */
    async awardCaptains(playerId, month) {
      month = month || this.monthId();
      const cs = this.currentSeason(), SC = cfg.SCORING || {};
      return this.addPoints({ player_id: playerId, season: cs, category: "captains",
        points: SC.captainsAward, note: `Captain's Award ${month}`, ref: `captains:${cs}:${month}` });
    },
    // Mover of the Month spotlight bonus (§4): +25 to the month's top AP-gainer.
    async awardMover(playerId, month) {
      month = month || this.monthId();
      const cs = this.currentSeason(), SC = cfg.SCORING || {};
      return this.addPoints({ player_id: playerId, season: cs, category: "mover",
        points: SC.moverOfMonth, note: `Mover of the Month ${month}`, ref: `mover:${cs}:${month}` });
    },
    // Has this month's Mover spotlight already been awarded? (read-only, for Home control tower)
    moverAwarded(month) {
      month = month || this.monthId();
      const cs = this.currentSeason();
      return (this.state.ledger || []).some(e => e.category === "mover" && String(e.ref || "") === `mover:${cs}:${month}`);
    },
    // Coach-tap badge (incl. Home Team Hero monthly). 0 AP — badges are separate from AP (§1).
    async awardBadge(playerId, badgeName, period) {
      const cs = this.currentSeason();
      const key = `badge:${cs}:${(badgeName||"").toLowerCase().replace(/[^a-z0-9]+/g,"-")}:${period||this.monthId()}:${playerId}`;
      return this.addPoints({ player_id: playerId, season: cs, category: "badge", points: 0,
        note: badgeName, ref: key });
    },

    /* ----- Skill Ladder AP (§2) — storage only; check-station UI is Phase 4 ----- */
    SKILL_TRACKS: ["First Touch","Weak Foot","1v1 Moves","Passing","Movement & Agility","GK/Defending"],
    skillLevel(playerId, track, season) {
      season = season || this.season;
      // highest level recorded for this track
      const rows = this.ledgerFor(playerId, season).filter(e => e.category === "skill" && e.ref && e.ref.includes(`:${this._slug(track)}:`));
      const order = { bronze: 1, silver: 2, gold: 3 };
      let best = null, bn = 0;
      rows.forEach(e => { const m = String(e.ref||"").match(/:(bronze|silver|gold)$/); if (m && order[m[1]] > bn) { bn = order[m[1]]; best = m[1]; } });
      return best;
    },
    _slug(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); },
    // Record a skill check pass. level: "bronze"|"silver"|"gold". One row per track/level.
    async recordSkill(playerId, track, level) {
      const cs = this.currentSeason(), SC = cfg.SCORING || {};
      const pts = { bronze: SC.skillBronze, silver: SC.skillSilver, gold: SC.skillGold }[level] || 0;
      const res = await this.addPoints({ player_id: playerId, season: cs, category: "skill",
        points: pts, note: `${track} — ${level[0].toUpperCase()+level.slice(1)}`,
        ref: `skill:${cs}:${playerId}:${this._slug(track)}:${level}` });
      this._applyPoints();
      return res;
    },
    // "Personal Best" coach tap +10 any time a player beats their own mark.
    async recordPersonalBest(playerId, track) {
      const cs = this.currentSeason(), SC = cfg.SCORING || {};
      const res = await this.addPoints({ player_id: playerId, season: cs, category: "skill",
        points: SC.skillPersonalBest, note: `Personal Best — ${track}`,
        ref: `skill:${cs}:${playerId}:${this._slug(track)}:pb:${Date.now()}` });
      this._applyPoints();
      return res;
    },
    // The six Skill Ladder tracks (§2). Order is the coach-check station order.
    SKILL_TRACKS: ["First Touch", "Weak Foot", "1v1 Moves", "Passing", "Movement & Agility", "GK/Defending"],
    // A player's current level for each track (private to that player), derived
    // from the ledger. Gold > Silver > Bronze; null = not yet checked. Also returns
    // how many Personal Bests they've banked on each track.
    skillLadder(playerId, season) {
      season = season || this.currentSeason();
      const order = { bronze: 1, silver: 2, gold: 3 };
      const out = {};
      this.SKILL_TRACKS.forEach(t => { out[t] = { level: null, rank: 0, pbs: 0 }; });
      this.ledgerFor(playerId, season).filter(e => e.category === "skill").forEach(e => {
        const m = String(e.ref || "").match(/^skill:[^:]+:[^:]+:([^:]+):(bronze|silver|gold|pb)/);
        if (!m) return;
        const track = this.SKILL_TRACKS.find(t => this._slug(t) === m[1]);
        if (!track) return;
        if (m[2] === "pb") { out[track].pbs++; return; }
        if ((order[m[2]] || 0) > out[track].rank) { out[track].rank = order[m[2]]; out[track].level = m[2]; }
      });
      return out;
    },
    // Highest level already banked for one track (so the coach UI / awards know
    // whether tapping a level would be a new award or a repeat).
    skillLevelOf(playerId, track, season) {
      return (this.skillLadder(playerId, season)[track] || { level: null }).level;
    },

    /* ----- Squad Goals (§4): shared monthly target + real-world unlock ----- */
    squadGoals() { return (this.state.squadGoals || []).filter(g => g.season === this.season); },
    squadGoalProgress(goal) {
      // AP gained this month across the squad (shared progress).
      const m = goal.month || this.monthId();
      return this.roster(true).reduce((n, p) => n + (this.moverOfMonth(m, this.season).rows.find(r => r.playerId === p.id)?.gain || 0), 0);
    },
    async addSquadGoal(g) {
      this.state.squadGoals = this.state.squadGoals || [];
      const row = { season: this.season, month: g.month || this.monthId(), title: g.title,
        target: +g.target || 0, reward: g.reward || "", unlocked: false };
      if (LIVE) { const { data, error } = await this.sb.from("squad_goals").insert(row).select().single(); if (error) return { ok:false, msg:error.message }; this.state.squadGoals.push(data); }
      else { row.id = this._nextId(this.state.squadGoals); this.state.squadGoals.push(row); localStorage.setItem("harris_squadgoals", JSON.stringify(this.state.squadGoals)); }
      return { ok: true };
    },
    async setSquadGoalUnlocked(id, unlocked) {
      const g = (this.state.squadGoals || []).find(x => x.id === id); if (!g) return { ok:false };
      g.unlocked = !!unlocked;
      if (LIVE) await this.sb.from("squad_goals").update({ unlocked: g.unlocked }).eq("id", id);
      else localStorage.setItem("harris_squadgoals", JSON.stringify(this.state.squadGoals));
      return { ok: true };
    },
    async deleteSquadGoal(id) {
      this.state.squadGoals = (this.state.squadGoals || []).filter(x => x.id !== id);
      if (LIVE) await this.sb.from("squad_goals").delete().eq("id", id);
      else localStorage.setItem("harris_squadgoals", JSON.stringify(this.state.squadGoals));
      return { ok: true };
    },

    // Sweep all players' homework for a week (called after the deadline / on load).
    async sweepHomework(week) {
      week = week || this.weekId();
      for (const p of this.roster(true)) { await this._refreshHomework(p.id, week, this.currentSeason()); }
      this._applyPoints();
      return { ok: true };
    },

    // Undo any single ledger entry (fix a mistake without touching SQL).
    async deletePointEvent(id) {
      this.state.ledger = (this.state.ledger || []).filter(e => e.id !== id);
      if (LIVE) { const { error } = await this.sb.from("point_events").delete().eq("id", id); if (error) return { ok: false, msg: error.message }; }
      else this._persistLedger();
      this._applyPoints();
      return { ok: true };
    }
  };

  window.HarrisStore = Store;
})();
