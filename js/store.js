/* ===================================================================
   OWFC Harris — Data store
   Bridges the UI to either Supabase (live) or sample data (preview).
   =================================================================== */
(function () {
  const cfg = window.HARRIS_CONFIG;
  const LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const LS_KEY = "harris_preview_state_v1";
  const LS_CONTENT = "harris_preview_content_v1";

  const Store = {
    MODE: LIVE ? "live" : "preview",
    sb: null,
    state: null,
    me: cfg.DEMO_PLAYER_ID,
    isAdmin: !LIVE,   // preview: everyone behind the team password can try the admin panel
    linkedPlayer: null,   // the player (child) this account is linked to
    userId: null,
    displayName: "",

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
        try { return await this._loadLive(); }
        catch (e) { console.error("Live load failed, using sample data", e); }
      }
      return this._loadPreview();
    },

    _loadPreview() {
      const base = structuredClone(window.HARRIS_DATA);
      const content = JSON.parse(localStorage.getItem(LS_CONTENT) || "null");
      if (content) {
        ["fixtures","players","training","events","gamePoints"].forEach(k => { if (content[k]) base[k] = content[k]; });
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
      const myp = localStorage.getItem("harris_my_player");
      if (myp) { this.me = +myp; this.linkedPlayer = +myp; }
      this.displayName = localStorage.getItem("harris_name") || this.displayName;
      this.state = base;
      return base;
    },

    async _loadLive() {
      const sb = this.sb;
      const [players, fixtures, attendance, training, events, points] = await Promise.all([
        sb.from("players").select("*").order("number"),
        sb.from("fixtures").select("*, goals(*), media(*)").order("date"),
        sb.from("attendance").select("*"),
        sb.from("training_sessions").select("*").order("date"),
        sb.from("events").select("*, media(*)").order("date"),
        sb.from("game_points").select("*")
      ]);
      const att = {};
      (attendance.data || []).forEach(r => { (att[r.fixture_id] ||= {})[r.player_id] = r.status; });
      // who am I, and am I an admin?
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          this.userId = user.id;
          const { data: prof } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
          if (prof) {
            this.isAdmin = !!prof.is_admin;
            if (prof.parent_name) this.displayName = prof.parent_name;
            if (prof.player_id) { this.me = prof.player_id; this.linkedPlayer = prof.player_id; }
          }
        }
      } catch (e) { /* ignore */ }
      this.state = {
        season: window.HARRIS_DATA.season,
        players: players.data || [],
        fixtures: fixtures.data || [],
        attendance: att,
        training: training.data || [],
        trainingSchedule: window.HARRIS_DATA.trainingSchedule,
        events: (events.data || []).map(e => ({ ...e, desc: e.description, media_list: e.media, media: 0 })),
        gamePoints: (points.data || []).map(g => ({ ...g, playerId: g.player_id })),
        achievements: window.HARRIS_DATA.achievements,
        quiz: window.HARRIS_DATA.quiz,
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
    async setAttendance(fixtureId, playerId, status) {
      (this.state.attendance[fixtureId] ||= {})[playerId] = status;
      if (LIVE) {
        await this.sb.from("attendance")
          .upsert({ fixture_id: fixtureId, player_id: playerId, status }, { onConflict: "fixture_id,player_id" });
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
        training: this.state.training, events: this.state.events, gamePoints: this.state.gamePoints
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

    async saveResult(fixtureId, r) {
      // r: { our_score, their_score, motm, goals:[{scorer,assist}] }
      const result = r.our_score > r.their_score ? "W" : r.our_score < r.their_score ? "L" : "D";
      if (LIVE) {
        const { error } = await this.sb.from("fixtures")
          .update({ status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm })
          .eq("id", fixtureId);
        if (error) return { ok:false, msg:error.message };
        await this.sb.from("goals").delete().eq("fixture_id", fixtureId);
        if (r.goals.length) await this.sb.from("goals").insert(r.goals.map(g => ({ fixture_id:fixtureId, scorer:g.scorer, assist:g.assist })));
        await this.load();
      } else {
        const f = this.state.fixtures.find(x => x.id === fixtureId);
        Object.assign(f, { status:"past", our_score:r.our_score, their_score:r.their_score, result, motm:r.motm, goals:r.goals });
        this._persistContent();
      }
      return { ok:true };
    },

    async addPlayer(p) {
      if (LIVE) {
        const { data, error } = await this.sb.from("players").insert(p).select().single();
        if (error) return { ok:false, msg:error.message };
        this.state.players.push(data);
      } else {
        p.id = this._nextId(this.state.players);
        p.goals = p.goals||0; p.assists = p.assists||0; p.motm = p.motm||0; p.sessions = p.sessions||0; p.points = p.points||0;
        p.program = p.program || [];
        this.state.players.push(p); this._persistContent();
      }
      return { ok:true };
    },

    async addTraining(t) {
      if (LIVE) {
        const { data, error } = await this.sb.from("training_sessions").insert(t).select().single();
        if (error) return { ok:false, msg:error.message };
        this.state.training.push(data);
      } else {
        t.id = this._nextId(this.state.training);
        this.state.training.push(t);
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

    resetPreview() { localStorage.removeItem(LS_CONTENT); localStorage.removeItem(LS_KEY); },

    /* ---------- which child is this account linked to ---------- */
    hasLinkedPlayer() { return LIVE ? !!this.linkedPlayer : !!localStorage.getItem("harris_my_player"); },
    async setMyPlayer(id) {
      this.me = id; this.linkedPlayer = id;
      if (LIVE) {
        await this.sb.from("profiles").upsert({ id: this.userId, player_id: id, parent_name: this.displayName || null }, { onConflict: "id" });
      } else {
        localStorage.setItem("harris_my_player", String(id));
      }
    },

    /* ---------- selectors ---------- */
    player(id) { return this.state.players.find(p => p.id === id); },

    fixtures(status) {
      const today = new Date().toISOString().slice(0, 10);
      return this.state.fixtures.filter(f => {
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

    attendCount(fixtureId) {
      const a = this.state.attendance[fixtureId] || {};
      return Object.values(a).filter(v => v === "yes").length;
    },

    /* league table: rank players by their league points */
    leagueRows() {
      return this.state.players.map(p => ({
        player: p, playerId: p.id, total: p.points || 0,
        goals: p.goals || 0, assists: p.assists || 0, motm: p.motm || 0, sessions: p.sessions || 0
      })).sort((a, b) => b.total - a.total);
    },

    /* admin: set a player's season stats */
    async updatePlayerStats(id, s) {
      const p = this.player(id); if (!p) return { ok: false, msg: "Player not found" };
      Object.assign(p, s);
      if (LIVE) {
        const { error } = await this.sb.from("players").update(s).eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
    }
  };

  window.HarrisStore = Store;
})();
