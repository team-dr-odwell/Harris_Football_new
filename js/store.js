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
        drills, profiles: allProfiles, ledger,
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

    async saveResult(fixtureId, r) {
      // r: { our_score, their_score, motm, goals:[{scorer,assist}], cleanSheets:[playerId] }
      const result = r.our_score > r.their_score ? "W" : r.our_score < r.their_score ? "L" : "D";
      const fx = this.state.fixtures.find(x => x.id === fixtureId);
      const season = this._seasonForDate(fx ? fx.date : this.season);
      const opp = fx ? fx.opponent : "";
      const SC = cfg.SCORING || {};
      // Build the match's point events (regenerated each save).
      const events = [];
      (r.goals || []).forEach((g, i) => {
        if (g.scorer) events.push({ player_id: g.scorer, season, category: "goal", points: SC.goal, note: "Goal vs " + opp, ref: `match:${fixtureId}:g${i}:scorer` });
        if (g.assist) events.push({ player_id: g.assist, season, category: "assist", points: SC.assist, note: "Assist vs " + opp, ref: `match:${fixtureId}:g${i}:assist` });
      });
      if (r.motm) events.push({ player_id: r.motm, season, category: "motm", points: SC.motm, note: "Man of the Match vs " + opp, ref: `match:${fixtureId}:motm` });
      (r.cleanSheets || []).forEach(pid => events.push({ player_id: pid, season, category: "cleansheet", points: SC.cleanSheet, note: "Clean sheet vs " + opp, ref: `match:${fixtureId}:cs${pid}` }));

      const lineup = Array.isArray(r.lineup) ? r.lineup : (fx && fx.lineup) || [];
      if (LIVE) {
        const { error } = await this.sb.from("fixtures")
          .update({ status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm, lineup })
          .eq("id", fixtureId);
        if (error) return { ok:false, msg:error.message };
        await this.sb.from("goals").delete().eq("fixture_id", fixtureId);
        if (r.goals.length) await this.sb.from("goals").insert(r.goals.map(g => ({ fixture_id:fixtureId, scorer:g.scorer, assist:g.assist })));
        await this.replacePoints(`match:${fixtureId}:`, events);
        await this.load();
      } else {
        Object.assign(fx, { status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm, goals:r.goals, lineup });
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

    /* league table: rank the current season's signed squad by league points */
    leagueRows() {
      return this.roster().map(p => ({
        player: p, playerId: p.id, total: p.points || 0,
        goals: p.goals || 0, assists: p.assists || 0, motm: p.motm || 0, sessions: p.sessions || 0
      })).sort((a, b) => b.total - a.total);
    },

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
        if (d.team === undefined || d.team === null) d.team = !(Array.isArray(d.player_ids) && d.player_ids.length);
        if (!Array.isArray(d.player_ids)) d.player_ids = [];
      });
    },
    teamVideos() { return (this.state.drills || []).filter(d => d.team === true); },
    videosForPlayer(pid) { return (this.state.drills || []).filter(d => d.team !== true && (d.player_ids || []).includes(pid)); },

    async addDrill(d) {
      this.state.drills = this.state.drills || [];
      const row = { title:d.title, url:d.url, area:d.area || null, description:d.description || null,
        team: d.team !== false, player_ids: d.player_ids || [] };
      if (LIVE) {
        const { data, error } = await this.sb.from("drills").insert(row).select().single();
        if (error) return { ok: false, msg: error.message };
        this.state.drills.push(data);
      } else {
        row.id = this._nextId(this.state.drills); this.state.drills.push(row); this._persistContent();
      }
      return { ok: true };
    },

    async updateDrill(id, d) {
      const v = (this.state.drills || []).find(x => x.id === id); if (!v) return { ok:false, msg:"Video not found" };
      const fields = { title:d.title, url:d.url, area:d.area || null, description:d.description || null,
        team: d.team !== false, player_ids: d.player_ids || [] };
      Object.assign(v, fields);
      if (LIVE) { const { error } = await this.sb.from("drills").update(fields).eq("id", id); if (error) return { ok:false, msg:error.message }; }
      else this._persistContent();
      return { ok: true };
    },

    async deleteDrill(id) {
      this.state.drills = (this.state.drills || []).filter(d => d.id !== id);
      if (LIVE) {
        const { error } = await this.sb.from("drills").delete().eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
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
    trainingPoints(playerId, season) { return this.catPoints(playerId, "attendance", season) + this.catPoints(playerId, "performance", season); },
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
      const total = (this.currentQuiz().questions || []).length || 0;
      if (total && this.ledgerFor(playerId, season).some(e => e.category === "quiz" && e.points === total)) out.push("quizace");
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
      (this.state.players || []).forEach(p => {
        if (!this.ledgerFor(p.id, s).length) return; // keep projected season stats
        p.points   = this.ledgerSum(p.id, s);
        p.goals    = this.countCat(p.id, "goal", s);
        p.assists  = this.countCat(p.id, "assist", s);
        p.motm     = this.countCat(p.id, "motm", s);
        p.sessions = this.countCat(p.id, "attendance", s);
      });
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

    // Training register: entries = [{playerId, attended, perf:"good"|"poor"|""}]
    async saveRegister(date, entries) {
      const season = this._seasonForDate(date), SC = cfg.SCORING || {}, events = [];
      entries.forEach(en => {
        if (en.attended) events.push({ player_id: en.playerId, season, category: "attendance",
          points: SC.trainingAttendance, note: "Training " + date, ref: `train:${date}:${en.playerId}:att` });
        if (en.perf === "good") events.push({ player_id: en.playerId, season, category: "performance",
          points: SC.trainingPerformanceGood, note: "Good performance " + date, ref: `train:${date}:${en.playerId}:perf` });
        if (en.perf === "poor") events.push({ player_id: en.playerId, season, category: "performance",
          points: SC.trainingPerformancePoor, note: "Poor performance " + date, ref: `train:${date}:${en.playerId}:perf` });
      });
      return this.replacePoints(`train:${date}:`, events);
    },
    registerState(date) {
      const out = {};
      (this.state.ledger || []).filter(e => e.ref && e.ref.startsWith(`train:${date}:`)).forEach(e => {
        const st = (out[e.player_id] = out[e.player_id] || { attended: false, perf: "" });
        if (e.ref.endsWith(":att")) st.attended = true;
        if (e.ref.endsWith(":perf")) st.perf = e.points >= 0 ? "good" : "poor";
      });
      return out;
    },

    // Weekly quiz result (1 point per correct). One per child per week, banked in the live season.
    async recordQuiz(playerId, correct) {
      const cs = this.currentSeason(), wk = this.weekId();
      return this.addPoints({ player_id: playerId, season: cs, category: "quiz",
        points: correct, note: "Quiz " + wk, ref: `quiz:${cs}:${wk}:${playerId}` });
    },
    quizDoneThisWeek(playerId) { return this.ledgerHas(`quiz:${this.currentSeason()}:${this.weekId()}:${playerId}`); },
    quizResults(week) {
      week = week || this.weekId();
      const map = {};
      (this.state.ledger || []).filter(e => e.category === "quiz" && e.season === this.season && e.ref && e.ref.includes(`:${week}:`))
        .forEach(e => { map[e.player_id] = e.points; });
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
        this._rotatePick(bank.filter(q => q.cat === "skill"), per.skill, "skill"),
        this._rotatePick(bank.filter(q => q.cat === "gen"), per.gen, "gen"),
        this._rotatePick(bank.filter(q => q.cat === "foot"), per.foot, "foot")
      );
      return { title: meta.title, week: wk, custom: false, questions };
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

    // Video watch: 2 points first full watch, +1 each rewatch.
    async recordVideoWatch(playerId, url) {
      const key = this._urlKey(url);
      const prior = (this.state.ledger || []).filter(e => e.category === "video" &&
        e.ref && e.ref.startsWith(`video:${playerId}:${key}:`)).length;
      const SC = cfg.SCORING || {};
      const points = prior === 0 ? SC.videoFirstWatch : SC.videoRewatch;
      return this.addPoints({ player_id: playerId, season: this.currentSeason(), category: "video",
        points, note: "Watched a coach's video", ref: `video:${playerId}:${key}:${prior + 1}` });
    },

    // Challenge tick (honesty). Weekly challenges (make-your-bed) key by ISO week.
    async tickChallenge(playerId, ex) {
      const period = ex.weekly ? this.weekId() : "once";
      return this.addPoints({ player_id: playerId, season: this.currentSeason(), category: "challenge",
        points: ex.points, note: ex.name, ref: `chal:${playerId}:${ex.id}:${period}` });
    },
    challengeDone(playerId, ex) {
      const period = ex.weekly ? this.weekId() : "once";
      return this.ledgerHas(`chal:${playerId}:${ex.id}:${period}`);
    },

    // Coach manual adjustment (perfect month, bottom-of-league challenge, corrections).
    async addManual(playerId, points, note) {
      return this.addPoints({ player_id: playerId, season: this.season, category: "manual",
        points, note: note || "Coach adjustment", ref: `manual:${Date.now()}:${playerId}` });
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
