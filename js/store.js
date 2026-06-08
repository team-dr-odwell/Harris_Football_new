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
      this._applySeason();
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
      const myp = localStorage.getItem("harris_my_player");
      if (myp) { this.me = +myp; this.linkedPlayer = +myp; }
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
            if (prof.player_id) { this.me = prof.player_id; this.linkedPlayer = prof.player_id; }
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
        drills, profiles: allProfiles,
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

    /* ---------- parent profile (contact details + child) ---------- */
    needsOnboarding() {
      if (this.isAdmin) return false;
      return LIVE ? !(this.parents && this.parents.length) : !localStorage.getItem("harris_parents");
    },
    async saveProfile({ parents, playerId }) {
      this.parents = parents;
      this.me = playerId; this.linkedPlayer = playerId;
      this.displayName = (parents[0] && parents[0].name) || this.displayName;
      if (LIVE) {
        const { error } = await this.sb.from("profiles").upsert(
          { id: this.userId, parents, player_id: playerId, parent_name: this.displayName || null },
          { onConflict: "id" });
        if (error) return { ok: false, msg: error.message };
      } else {
        localStorage.setItem("harris_parents", JSON.stringify(parents));
        localStorage.setItem("harris_my_player", String(playerId));
        if (this.displayName) localStorage.setItem("harris_name", this.displayName);
      }
      return { ok: true };
    },

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

    /* admin: set a player's stats for the CURRENTLY-SELECTED season */
    async updatePlayerStats(id, s) {
      const p = this.player(id); if (!p) return { ok: false, msg: "Player not found" };
      if (!p.stats) p.stats = {};
      p.stats[this.season] = { ...(p.stats[this.season] || {}), ...s };
      Object.assign(p, s); // reflect immediately on the projected flat fields
      if (LIVE) {
        const { error } = await this.sb.from("players").update({ stats: p.stats }).eq("id", id);
        if (error) return { ok: false, msg: error.message };
      } else { this._persistContent(); }
      return { ok: true };
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

    /* admin: training-exercise video library */
    async addDrill(d) {
      this.state.drills = this.state.drills || [];
      if (LIVE) {
        const { data, error } = await this.sb.from("drills").insert(d).select().single();
        if (error) return { ok: false, msg: error.message };
        this.state.drills.push(data);
      } else {
        d.id = this._nextId(this.state.drills); this.state.drills.push(d); this._persistContent();
      }
      return { ok: true };
    }
  };

  window.HarrisStore = Store;
})();
