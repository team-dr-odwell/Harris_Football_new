/* ===================================================================
   OWFC Harris — App (router + views)
   =================================================================== */
(function () {
  const S = window.HarrisStore;
  const cfg = window.HARRIS_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const view = $("#view");

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function fdate(iso) { const d = new Date(iso + "T00:00:00"); return `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; }
  function fdateLong(iso) { const d = new Date(iso + "T00:00:00"); return `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; }
  const KITNAME = { gold:"Gold (home)", black:"Black (away)", white:"White (third)" };
  const initials = (p) => p.init || p.name.split(" ").map(w=>w[0]).join("").slice(0,2);

  /* ============================ AUTH / SHELL ============================ */
  async function boot() {
    const authed = await S.init();
    if (authed) { await enterApp(); } else { showGate(); }
    wireGate(); wireShell();
  }

  function showGate() { $("#gate").classList.remove("hidden"); $("#app").classList.add("hidden"); }

  async function enterApp() {
    $("#gate").classList.add("hidden");
    $("#app").classList.remove("hidden");
    if (S.MODE === "preview") $("#demo-banner").classList.remove("hidden");
    await S.load();
    populateSeasonSelect();
    $("#nav-admin").classList.toggle("hidden", !S.isAdmin);
    if (S.needsOnboarding()) { showOnboarding(); return; }
    if (!S.hasLinkedPlayer() && !S.isAdmin) { showChildPicker(false); return; }
    if (!location.hash) location.hash = "#home";
    route();
  }

  function wireGate() {
    const go = async () => {
      const name = $("#login-name").value;
      const pw = $("#login-password").value;
      const hint = $("#gate-hint");
      const res = await S.login(name, pw);
      if (res.ok) { hint.classList.remove("error"); await enterApp(); }
      else { hint.textContent = res.msg || "Login failed."; hint.classList.add("error"); }
    };
    $("#login-btn").addEventListener("click", go);
    $("#login-password").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  }

  function populateSeasonSelect() {
    const sel = $("#season-select"); if (!sel) return;
    sel.innerHTML = (cfg.SEASONS || []).map(s => `<option value="${esc(s.id)}" ${s.id === S.season ? "selected" : ""}>${esc(s.id)}</option>`).join("");
  }

  function wireShell() {
    $("#logout-btn").addEventListener("click", async () => { await S.logout(); location.hash = "#home"; showGate(); });
    $("#myplayer-btn").addEventListener("click", () => showChildPicker(true));
    const ssel = $("#season-select");
    if (ssel) ssel.addEventListener("change", e => { S.setSeason(e.target.value); updateMyPlayerChip(); route(); });
    $("#hamburger").addEventListener("click", () => $("#nav").classList.toggle("open"));
    document.querySelectorAll("[data-route]").forEach(a =>
      a.addEventListener("click", () => { location.hash = "#" + a.dataset.route; $("#nav").classList.remove("open"); }));
    window.addEventListener("hashchange", route);
  }

  function updateMyPlayerChip() {
    const chip = $("#myplayer-btn");
    const p = S.hasLinkedPlayer() ? S.player(S.me) : null;
    if (p) { chip.textContent = "👤 " + p.name.split(" ")[0]; chip.classList.remove("hidden"); }
    else { chip.classList.add("hidden"); }
  }

  function showOnboarding() {
    $("#nav").classList.remove("open");
    const players = S.roster().sort((a,b)=>a.number-b.number);
    const linked = S.linkedPlayer;
    const relOpts = ["Mum","Dad","Guardian","Parent"].map(r=>`<option>${r}</option>`).join("");
    view.innerHTML = `
      <section class="hero" style="text-align:center">
        <div class="hero-tag">Welcome 👋</div>
        <h1>Set up your <span>family</span></h1>
        <p style="margin-inline:auto">Add your contact details so the coaches can reach you, then choose your child.</p>
      </section>
      <div class="card pad-lg" style="max-width:620px;margin:0 auto">
        <h3 style="margin:0 0 .6rem;font-family:var(--display)">Parent / guardian 1</h3>
        <div class="grid cols-2">${F("Relation",`<select id="p1-rel">${relOpts}</select>`)}${F("Full name",`<input id="p1-name" placeholder="e.g. David Kirby"/>`)}</div>
        <div class="grid cols-2">${F("Email",`<input type="email" id="p1-email" placeholder="you@email.com"/>`)}${F("Mobile number",`<input id="p1-phone" placeholder="07…"/>`)}</div>
        <div id="p2-wrap" class="hidden">
          <h3 style="margin:1rem 0 .6rem;font-family:var(--display)">Parent / guardian 2 <span class="muted" style="font-size:.78rem">(optional)</span></h3>
          <div class="grid cols-2">${F("Relation",`<select id="p2-rel">${relOpts}</select>`)}${F("Full name",`<input id="p2-name"/>`)}</div>
          <div class="grid cols-2">${F("Email",`<input type="email" id="p2-email"/>`)}${F("Mobile number",`<input id="p2-phone"/>`)}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="add-p2" style="margin:.2rem 0 1rem">+ Add another parent</button>
        ${F("Your child",`<select id="ob-child">${players.map(p=>`<option value="${p.id}" ${linked===p.id?'selected':''}>${esc(p.name)} (#${p.number})</option>`).join("")}</select>`)}
        <p class="gate-hint" id="ob-hint">We'll only use this to contact you about the team.</p>
        <button class="btn btn-gold btn-block" id="ob-save">Save &amp; continue</button>
      </div>`;
    $("#add-p2").addEventListener("click", () => { $("#p2-wrap").classList.remove("hidden"); $("#add-p2").classList.add("hidden"); });
    $("#ob-save").addEventListener("click", async () => {
      const p1 = { relation:$("#p1-rel").value, name:$("#p1-name").value.trim(), email:$("#p1-email").value.trim(), phone:$("#p1-phone").value.trim() };
      const h = $("#ob-hint");
      if (!p1.name || !p1.email || !p1.phone) { h.textContent = "Please add parent 1's name, email and mobile number."; h.classList.add("error"); return; }
      const parents = [p1];
      if (!$("#p2-wrap").classList.contains("hidden")) {
        const p2 = { relation:$("#p2-rel").value, name:$("#p2-name").value.trim(), email:$("#p2-email").value.trim(), phone:$("#p2-phone").value.trim() };
        if (p2.name) parents.push(p2);
      }
      const res = await S.saveProfile({ parents, playerId: +$("#ob-child").value });
      if (res.ok) { updateMyPlayerChip(); location.hash = "#home"; route(); }
      else { h.textContent = "Error: " + res.msg; h.classList.add("error"); }
    });
  }

  function showChildPicker(changing) {
    $("#nav").classList.remove("open");
    updateMyPlayerChip();
    const hi = S.displayName ? esc(S.displayName.split(" ")[0]) : "there";
    view.innerHTML = `
      <section class="hero" style="text-align:center">
        <div class="hero-tag">Hi ${hi} 👋</div>
        <h1>Which player is <span>yours</span>?</h1>
        <p style="margin-inline:auto">Pick your child so we can show their card, season stats and match availability as yours. You can change this anytime from the top bar.</p>
      </section>
      <div class="players-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        ${S.roster().sort((a,b)=>a.number-b.number).map(p=>`
          <button class="card" data-pick="${p.id}" style="cursor:pointer;display:flex;gap:.8rem;align-items:center;text-align:left">
            <span class="club-badge us" style="flex:none">${esc(initials(p))}</span>
            <span><b style="font-size:1.05rem;display:block">${esc(p.name)}</b><span class="muted" style="font-size:.82rem">Squad #${p.number} · ${esc(p.pos)}</span></span>
          </button>`).join("")}
      </div>
      ${changing ? `<div style="margin-top:1.2rem"><button class="btn btn-ghost btn-sm" data-go="home">← Cancel</button></div>` : ""}`;
    view.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", async () => {
      await S.setMyPlayer(+b.dataset.pick);
      updateMyPlayerChip();
      location.hash = "#home"; route();
    }));
    wireGo();
  }

  function route() {
    const r = (location.hash.replace("#", "") || "home").split("/");
    document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.route === r[0]));
    updateMyPlayerChip();
    window.scrollTo(0, 0);
    ({ home:Home, fixtures:Fixtures, training:Schedule, events:Events, players:Players, development:Development, league:League, admin:Admin }[r[0]] || Home)(r[1]);
  }

  /* ============================ HOME ============================ */
  function Home() {
    const next = S.fixtures("upcoming")[0];
    const past = S.fixtures("past");
    const W = past.filter(f=>f.result==="W").length, D = past.filter(f=>f.result==="D").length, L = past.filter(f=>f.result==="L").length;
    const goals = past.reduce((n,f)=>n+(f.our_score||0),0);
    const ros = S.roster();
    const top = [...ros].sort((a,b)=>(b.goals||0)-(a.goals||0))[0];

    view.innerHTML = `
      <section class="hero">
        <div class="hero-tag">${esc(cfg.TEAM_NAME)} · ${esc(cfg.AGE_GROUP)} · ${esc(S.season)}</div>
        <h1>Welcome to the <span>Academy</span></h1>
        <p>Your home for fixtures, training, player cards and everything that makes this team special. Every session, every goal, every bit of progress — all tracked right here.</p>
        <div class="hero-actions">
          <button class="btn btn-gold" data-go="fixtures">Next fixture →</button>
          <button class="btn btn-ghost" data-go="players">Player cards</button>
        </div>
      </section>

      <div class="stat-strip">
        <div class="stat"><div class="n">${W}-${D}-${L}</div><div class="l">W · D · L</div></div>
        <div class="stat"><div class="n">${goals}</div><div class="l">Goals scored</div></div>
        <div class="stat"><div class="n">${ros.length}</div><div class="l">Squad size</div></div>
        <div class="stat"><div class="n">${top?top.goals:0}</div><div class="l">Top scorer${top?` (${esc(top.name.split(" ")[0])})`:""}</div></div>
      </div>

      <div class="grid cols-2">
        <div class="card pad-lg">
          <div class="eyebrow" style="color:var(--gold)">Next up</div>
          ${next ? fixtureMini(next) : `<p class="muted">No fixtures just yet — check back soon!</p>`}
          <button class="btn btn-dark btn-sm" data-go="fixtures" style="margin-top:1rem">See all fixtures</button>
        </div>
        <div class="card pad-lg">
          <div class="eyebrow" style="color:var(--gold)">Next training</div>
          ${trainingMini(nextTraining())}
          <button class="btn btn-dark btn-sm" data-go="training" style="margin-top:1rem">Full calendar</button>
        </div>
      </div>

      <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">Climb the ranks</div><h2>Academy League</h2></div>
        <button class="btn btn-ghost btn-sm" data-go="league">Full table →</button></div>
      ${leaguePreview()}
    `;
    wireGo();
  }

  function fixtureMini(f) {
    return `<div class="fixture-vs" style="margin:.4rem 0 .8rem">
        <span class="club-badge us">H</span><h3>vs ${esc(f.opponent)}</h3>
      </div>
      <div class="fixture-meta">
        <span class="mi"><b>Date</b> ${fdate(f.date)}</span>
        <span class="mi"><b>Kick-off</b> ${esc(f.kickoff)}</span>
        <span class="mi"><b>Meet</b> ${esc(f.meetup)}</span>
        <span class="mi"><b>Venue</b> ${f.home_away==="H"?"Home":"Away"}</span>
      </div>`;
  }
  function trainingMini(t) {
    if (!t) return `<p class="muted">No training booked in yet — watch this space!</p>`;
    return `<h3 style="margin:.3rem 0 .6rem">${esc(t.label || t.focus)}</h3>
      <div class="fixture-meta">
        <span class="mi"><b>Date</b> ${fdate(t.date)}</span>
        <span class="mi"><b>Time</b> ${fmt12(t.start)}–${fmt12(t.end)}</span>
        <span class="mi"><b>Where</b> ${esc(t.location)}</span>
      </div>`;
  }
  function nextTraining() {
    const today = new Date();
    for (let i = 0; i < 21; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const t = itemsOn(ymd(d)).find(x => x.kind === "training");
      if (t) return { ...t, date: ymd(d) };
    }
    return null;
  }
  function leaguePreview() {
    const rows = S.leagueRows().slice(0, 5);
    return `<div class="card" style="padding:.4rem 1rem"><table class="league-table">
      <thead><tr><th>#</th><th>Player</th><th>Points</th></tr></thead><tbody>
      ${rows.map((r,i)=>`<tr class="${r.playerId===S.me?'me':''}">
        <td class="rank ${i<3?'r'+(i+1):''}">${i+1}</td>
        <td>${esc(r.player.name)} <span class="tag" style="margin-left:.3rem">#${r.player.number}</span></td>
        <td class="pts">${r.total}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  /* ============================ FIXTURES ============================ */
  function Fixtures(tab) {
    tab = tab || "upcoming";
    const list = S.fixtures(tab);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} Season</div><h2>Fixtures</h2></div>
        <div class="badge-row">
          <button class="btn ${tab==='upcoming'?'btn-gold':'btn-ghost'} btn-sm" data-tab="upcoming">Upcoming</button>
          <button class="btn ${tab==='past'?'btn-gold':'btn-ghost'} btn-sm" data-tab="past">Results</button>
        </div></div>
      <div class="grid ${tab==='past'?'cols-1':'cols-2'}">${list.map(f => tab==="upcoming"?upcomingCard(f):resultCard(f)).join("")}</div>
    `;
    view.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => location.hash = "#fixtures/"+b.dataset.tab));
    wireRsvp(); wireMedia(); wireGo();
  }

  function upcomingCard(f) {
    const key = "m" + f.id;
    const mine = (S.state.attendance[key] || {})[S.me];
    const fit = { kind:"match", key, dateObj:new Date(f.date+"T00:00:00"), start:f.kickoff, meetup:f.meetup, title:"vs "+f.opponent, location:f.ground, competition:f.competition, homeAway:f.home_away };
    const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(f.address);
    return `<div class="card fixture">
      <div class="fixture-top">
        <div class="fixture-vs"><span class="club-badge us">H</span>
          <div><h3>vs ${esc(f.opponent)}</h3><span class="tag ${f.competition==='Cup'?'gold':''}">${esc(f.competition)} · ${f.home_away==='H'?'Home':'Away'}</span></div>
        </div>
        <span class="tag gold">${fdate(f.date)}</span>
      </div>
      <div class="fixture-meta">
        <span class="mi"><b>Kick-off</b> ${esc(f.kickoff)}</span>
        <span class="mi"><b>Meet at</b> ${esc(f.meetup)}</span>
        <span class="mi"><b>Ground</b> ${esc(f.ground)}</span>
        <span class="mi"><b>Kit</b> <span class="kit-chip"><span class="kit-dot kit-${f.kit}"></span>${KITNAME[f.kit]}</span></span>
        <span class="mi" style="grid-column:1/-1"><b>Address</b> <a href="${mapsUrl}" target="_blank" rel="noopener" style="color:var(--gold-bright)">${esc(f.address)} ↗</a></span>
      </div>
      ${calLinks(fit)}${shareLink(fit)}
      <div class="attend ag-rsvp" data-key="${key}">
        <span class="lbl">Will ${esc(playerFirst())} be there?</span>
        <button class="att-btn yes ${mine==='yes'?'on':''}" data-s="yes">✓ Going</button>
        <button class="att-btn lift ${mine==='lift'?'on':''}" data-s="lift">🚗 Lift</button>
        <button class="att-btn no ${mine==='no'?'on':''}" data-s="no">✕ Can't</button>
        <span class="att-count">${rsvpLabel(key)}</span>
      </div>
    </div>`;
  }

  function resultCard(f) {
    const rc = f.result==="W"?"win":f.result==="L"?"loss":"draw";
    const motm = S.player(f.motm);
    const hasResult = f.our_score != null && f.their_score != null;
    return `<div class="card fixture">
      <div class="fixture-top">
        <div class="fixture-vs"><span class="club-badge us">H</span>
          <div><h3>vs ${esc(f.opponent)}</h3><span class="tag">${esc(f.competition)} · ${f.home_away==='H'?'Home':'Away'} · ${fdate(f.date)}</span></div>
        </div>
        <div style="text-align:right">
          ${hasResult
            ? `<div class="score">${f.our_score}<span class="sep">–</span>${f.their_score}</div><span class="tag ${rc}">${f.result==="W"?"Win":f.result==="L"?"Loss":"Draw"}</span>`
            : `<span class="tag">Score to add</span>`}
        </div>
      </div>
      ${f.goals?.length ? `<div class="goal-list">${f.goals.map(g=>{
        const sc=S.player(g.scorer), as=g.assist?S.player(g.assist):null;
        return `<div class="goal-row"><span class="ball">⚽</span><b>${esc(sc?.name||'')}</b>${as?`<span class="muted">— assist ${esc(as.name)}</span>`:''}</div>`;
      }).join("")}</div>`:""}
      ${motm?`<div class="motm"><span class="star">⭐</span><div><b>Man of the Match</b><br><span class="muted">${esc(motm.name)} · #${motm.number}</span></div></div>`:""}
      <div>
        <div class="lbl" style="font-size:.78rem;color:var(--muted);font-weight:700;margin-bottom:.5rem">PHOTOS &amp; VIDEOS</div>
        <div class="gallery" data-media="${f.id}">
          ${S.mediaFor(f.id).map(m=>mediaTile(m)).join("")}
          <div class="ph add" data-add="${f.id}"><div><div class="ic">＋</div>Add</div></div>
        </div>
      </div>
    </div>`;
  }

  function mediaTile(m) {
    return `<div class="ph"><div><div class="ic">${m.type==="video"?"▶":"📷"}</div>${esc(m.caption||m.type)}</div></div>`;
  }

  function playerFirst() { return S.player(S.me)?.name.split(" ")[0] || "your child"; }
  function rsvpLabel(key) {
    const c = S.rsvpCount(key);
    return `${c.going} going${c.lifts ? ` · ${c.lifts} need a lift` : ""}`;
  }
  function wireRsvp() {
    view.querySelectorAll(".ag-rsvp").forEach(box => {
      box.querySelectorAll(".att-btn").forEach(btn => btn.addEventListener("click", async () => {
        const key = box.dataset.key, status = btn.dataset.s;
        const current = (S.state.attendance[key] || {})[S.me];
        const next = current === status ? null : status;
        await S.setAttendance(key, S.me, next);
        box.querySelectorAll(".att-btn").forEach(b => b.classList.toggle("on", b.dataset.s === next));
        box.querySelector(".att-count").textContent = rsvpLabel(key);
      }));
    });
  }

  function wireMedia() {
    view.querySelectorAll("[data-add]").forEach(add => add.addEventListener("click", () => {
      openModal("Add a photo or video", `
        <p class="muted" style="margin-top:0">Share a great moment from the match. ${S.MODE==='preview'?'In preview mode this is saved on this device only.':''}</p>
        <label class="field"><span>Type</span><select id="m-type"><option value="photo">Photo</option><option value="video">Video</option></select></label>
        <label class="field"><span>Caption</span><input id="m-cap" placeholder="e.g. Freddie's winner!"/></label>
        <label class="field"><span>File</span><input type="file" id="m-file" accept="image/*,video/*"/></label>
        <button class="btn btn-gold btn-block" id="m-save">Upload</button>`,
        () => {
          $("#m-save").addEventListener("click", () => {
            S.addMedia(+add.dataset.add, { type:$("#m-type").value, caption:$("#m-cap").value || $("#m-type").value });
            closeModal(); route();
          });
        });
    }));
  }

  /* ============================ TRAINING (month calendar) ============================ */
  const pad2 = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  function fmt12(t) {
    if (!t) return ""; let [h,m] = t.split(":").map(Number);
    const ap = h < 12 ? "am" : "pm"; h = h % 12 || 12;
    return `${h}${m?":"+pad2(m):""}${ap}`;
  }
  function itemsOn(iso) {
    if (!S.inSeason(iso)) return [];
    const d = new Date(iso + "T00:00:00"); const out = [];
    const schedule = (S.state.trainingSchedule || window.HARRIS_DATA.trainingSchedule || []);
    const recur = schedule.find(r => d.getDay() === r.day && iso <= r.until);
    const planned = (S.state.training || []).filter(t => t.date === iso);
    if (planned.length) {
      // A planned/edited session replaces the recurring slot for that date.
      planned.forEach(t => out.push({ kind:"training", key:"t"+iso,
        start:t.start || (recur && recur.start), end:t.end || (recur && recur.end),
        location:t.location || (recur && recur.location),
        label:t.focus || (recur && recur.label) || "Training",
        drills:t.drills || [], videos:t.videos || [] }));
    } else if (recur) {
      out.push({ kind:"training", key:"t"+iso, start:recur.start, end:recur.end, location:recur.location, label:recur.label || "Training" });
    }
    (S.state.fixtures || []).forEach(f => { if (f.date === iso) out.push({ kind:"match", key:"m"+f.id, title:"vs "+f.opponent, location:f.ground, start:f.kickoff, meetup:f.meetup, homeAway:f.home_away, competition:f.competition }); });
    (S.state.events || []).forEach(e => { if (e.date === iso) out.push({ kind:"event", key:"e"+e.id, title:e.title, location:e.location, time:e.time, desc:e.desc, link:e.link }); });
    return out;
  }

  const TYPE_META = { training:{label:"Training",cls:"t-train"}, match:{label:"Match",cls:"t-match"}, event:{label:"Event",cls:"t-event"} };

  function videoEmbed(url) {
    if (!url) return "";
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    const vm = url.match(/vimeo\.com\/(\d+)/);
    const src = yt ? "https://www.youtube.com/embed/" + yt[1] : vm ? "https://player.vimeo.com/video/" + vm[1] : null;
    if (!src) return `<a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--gold-bright)">Watch video ↗</a>`;
    return `<div class="video"><iframe src="${src}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  function ytId(url) { const m = String(url||"").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/); return m ? m[1] : null; }

  // YouTube IFrame API — award points when a child watches their own video to the end.
  let _ytCbs = [];
  function onYTReady(cb) {
    if (window.YT && window.YT.Player) return cb();
    _ytCbs.push(cb);
    if (!window._ytLoading) {
      window._ytLoading = true;
      window.onYouTubeIframeAPIReady = () => { const cbs = _ytCbs; _ytCbs = []; cbs.forEach(f => f()); };
      const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    }
  }
  function trackYouTube(playerId, items) {
    if (!items.length) return;
    onYTReady(() => items.forEach(it => {
      try {
        new window.YT.Player(it.domId, { events: { onStateChange: async (e) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            const res = await S.recordVideoWatch(playerId, it.url);
            if (res && res.ok && !res.dup) toast("🎬 Nice — points added for watching!");
          }
        } } });
      } catch (err) { /* ignore */ }
    }));
  }

  function buildAgenda(kinds, horizonDays) {
    const today = new Date(); const rows = [];
    for (let i = 0; i < horizonDays; i++) {
      const dd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      itemsOn(ymd(dd)).forEach(it => { if (kinds.includes(it.kind)) rows.push({ ...it, dateObj: dd }); });
    }
    return rows;
  }

  function Schedule() {
    const rows = buildAgenda(["training"], 28);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Next 4 weeks</div><h2>Training Schedule</h2></div>
        <a class="btn btn-ghost btn-sm" href="${weekShareUrl()}" target="_blank" rel="noopener">💬 Share week to WhatsApp</a></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Upcoming training sessions, with the drills we'll be working on. Tap to tell us if ${esc(playerFirst())} is going — and whether they'll need a lift.</p>
      <div class="agenda" style="margin-top:1.2rem">
        ${rows.length ? rows.map(agendaRow).join("") : `<div class="card"><p class="muted" style="margin:0">No training in the next four weeks.</p></div>`}
      </div>`;
    wireRsvp();
  }

  function toCal(it) {
    const d = it.dateObj;
    const ymdStr = `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
    const dt = (t, addMin = 0) => {
      let [h, m] = (t || "00:00").split(":").map(Number);
      let tot = h * 60 + m + addMin; h = Math.floor(tot / 60) % 24; m = tot % 60;
      return `${ymdStr}T${pad2(h)}${pad2(m)}00`;
    };
    let start, end, allDay = false;
    if (it.kind === "training") { start = dt(it.start); end = dt(it.end); }
    else if (it.kind === "match") { start = dt(it.start); end = dt(it.start, 90); }
    else if (it.time) { start = dt(it.time); end = dt(it.time, 90); }
    else allDay = true;
    const title = it.kind === "match" ? "OWFC Harris " + it.title : (it.title || it.label);
    const details = it.kind === "match" ? `${it.competition || ""} · ${it.homeAway === "H" ? "Home" : "Away"}` : (it.desc || "");
    return { ymdStr, start, end, allDay, title, location: it.location || "", details };
  }
  function gcalUrl(it) {
    const c = toCal(it);
    const dates = c.allDay ? `${c.ymdStr}/${c.ymdStr}` : `${c.start}/${c.end}`;
    const q = new URLSearchParams({ action:"TEMPLATE", text:c.title, dates, location:c.location, details:c.details, ctz:"Europe/London" });
    return "https://calendar.google.com/calendar/render?" + q.toString();
  }
  function icsUrl(it) {
    const c = toCal(it);
    const s = c.allDay ? `;VALUE=DATE:${c.ymdStr}` : `:${c.start}`;
    const e = c.allDay ? `;VALUE=DATE:${c.ymdStr}` : `:${c.end}`;
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//OWFC Harris//EN","BEGIN:VEVENT",
      "UID:" + it.key + "@harris.football", "DTSTART" + s, "DTEND" + e,
      "SUMMARY:" + c.title, "LOCATION:" + c.location, "DESCRIPTION:" + c.details,
      "END:VEVENT","END:VCALENDAR"].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }
  function calLinks(it) {
    return `<div class="ag-cal">📅 Add to calendar:
      <a href="${gcalUrl(it)}" target="_blank" rel="noopener">Google</a> ·
      <a href="${icsUrl(it)}" download="harris-${it.key}.ics">Apple / Outlook</a></div>`;
  }

  const fdateShort = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  function waText(it) {
    const when = fdateShort(it.dateObj);
    if (it.kind === "training")
      return `⚽ OWFC Harris training — ${when}, ${fmt12(it.start)}–${fmt12(it.end)} at ${it.location}. See you there! Please reply in the group if your child can't make it.`;
    if (it.kind === "match")
      return `⚽ OWFC Harris ${it.homeAway === "H" ? "(Home)" : "(Away)"} vs ${(it.title||"").replace(/^vs /,"")} — ${when}, kick-off ${fmt12(it.start)}${it.meetup ? `, meet ${fmt12(it.meetup)}` : ""} at ${it.location}. Come and support the lads! 🦁`;
    return `📅 ${it.title} — ${when}${it.time ? `, ${fmt12(it.time)}` : ""}${it.location ? ` at ${it.location}` : ""}.${it.desc ? ` ${it.desc}` : ""}`;
  }
  const waUrl = text => "https://wa.me/?text=" + encodeURIComponent(text);
  function shareLink(it) {
    return `<a class="wa-share" href="${waUrl(waText(it))}" target="_blank" rel="noopener">💬 Share to WhatsApp</a>`;
  }
  function weekShareUrl() {
    const items = buildAgenda(["training","match","event"], 8);
    const lines = items.map(it => {
      const t = it.kind === "match" ? `KO ${fmt12(it.start)}` : it.kind === "event" ? (it.time ? fmt12(it.time) : "") : `${fmt12(it.start)}–${fmt12(it.end)}`;
      const name = it.kind === "match" ? `Match ${it.title}` : it.kind === "event" ? it.title : "Training";
      return `• ${fdateShort(it.dateObj)}${t ? ` ${t}` : ""} — ${name}${it.location ? ` @ ${it.location}` : ""}`;
    });
    return waUrl("📅 OWFC Harris — the week ahead:\n" + (lines.join("\n") || "Nothing scheduled."));
  }

  function drillBlock(it) {
    if (it.kind !== "training") return "";
    const drills = it.drills || [], videos = it.videos || [];
    if (!drills.length && !videos.length) return "";
    return `<div class="drill-plan">
      <div class="drill-label">📋 This session</div>
      ${drills.length ? `<ul class="drill-list">${drills.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>` : ""}
      ${videos.length ? `<div class="drill-vids">${videos.map(v=>`<div class="drill-vid"><b>${esc(v.title||"Drill")}</b>${v.area?` <span class="tag t-train">${esc(v.area)}</span>`:""}${videoEmbed(v.url)}</div>`).join("")}</div>` : ""}
    </div>`;
  }

  function agendaRow(it) {
    const me = (S.state.attendance[it.key] || {})[S.me];
    const tm = TYPE_META[it.kind];
    const time = it.kind === "match"
      ? `KO ${fmt12(it.start)}${it.meetup ? ` · meet ${fmt12(it.meetup)}` : ""}`
      : it.kind === "event"
      ? (it.time ? fmt12(it.time) : "")
      : `${fmt12(it.start)}–${fmt12(it.end)}`;
    const d = it.dateObj;
    return `<div class="card ag-row">
      <div class="ag-date"><span class="ag-dow">${DAYS[d.getDay()]}</span><span class="ag-day">${d.getDate()}</span><span class="ag-mon">${MON[d.getMonth()]}</span></div>
      <div class="ag-main">
        <div class="ag-head"><span class="tag ${tm.cls}">${tm.label}</span><b>${esc(it.title || it.label)}</b>${it.kind==="match"?`<span class="tag">${it.homeAway==='H'?'Home':'Away'}</span>`:""}</div>
        <div class="muted ag-meta">${time?`🕒 ${time}`:""}${it.location?`${time?" · ":""}📍 ${esc(it.location)}`:""}</div>
        ${it.desc?`<div class="muted" style="font-size:.85rem;margin-top:.25rem">${esc(it.desc)}</div>`:""}
        ${it.link?`<a href="${esc(it.link)}" target="_blank" rel="noopener" style="color:var(--gold-bright);font-size:.85rem">Location &amp; prices ↗</a>`:""}
        ${drillBlock(it)}
        ${calLinks(it)}
        ${shareLink(it)}
      </div>
      <div class="ag-rsvp" data-key="${it.key}">
        <div class="ag-btns">
          <button class="att-btn yes ${me==='yes'?'on':''}" data-s="yes">✓ Going</button>
          <button class="att-btn lift ${me==='lift'?'on':''}" data-s="lift">🚗 Lift</button>
          <button class="att-btn no ${me==='no'?'on':''}" data-s="no">✕ Can't</button>
        </div>
        <span class="att-count">${rsvpLabel(it.key)}</span>
      </div>
    </div>`;
  }

  /* ============================ EVENTS (rows) ============================ */
  function Events() {
    const rows = buildAgenda(["event"], 220);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Beyond the pitch</div><h2>Events</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Fundraisers, days out and celebrations. Tap to let us know if ${esc(playerFirst())} is coming.</p>
      <div class="agenda" style="margin-top:1.2rem">
        ${rows.length ? rows.map(agendaRow).join("") : `<div class="card"><p class="muted" style="margin:0">No events coming up just yet — watch this space!</p></div>`}
      </div>`;
    wireRsvp();
  }

  /* ============================ ACADEMY ============================ */
  const DEV_AREAS = [["passing","Passing"],["shooting","Shooting"],["dribbling","Dribbling"],["defending","Defending"],["fitness","Fitness"],["teamwork","Teamwork"]];
  const DEF_POS = ["GK","CB","LB","RB","RWB","LWB","CDM"];

  function Players(id) {
    if (id) return AcademyProfile(+id);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} Squad</div><h2>The Academy</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Every player has a card and an academy profile. Tap a card for season stats, development progress and their goals to achieve.</p>
      <div class="players-grid" style="margin-top:1.3rem">
        ${S.roster().sort((a,b)=>a.number-b.number).map(fcCard).join("") || `<div class="card"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet.</p></div>`}
      </div>`;
    view.querySelectorAll("[data-player]").forEach(c => c.addEventListener("click", () => location.hash = "#players/"+c.dataset.player));
  }

  function fcCard(p) {
    return `<div class="fc-card" data-player="${p.id}">${fcCardInner(p)}</div>`;
  }

  function AcademyProfile(id) {
    const p = S.player(id); if (!p) return Players();
    const stats = [["Points",p.points||0],["Apps",S.appearances(p.id)],["Quiz",S.quizPoints(p.id)],["Training pts",S.trainingPoints(p.id)],["Video watches",S.videoWatches(p.id)],["Achievements",S.earnedAchievements(p.id).length]];
    const dev = p.dev || {}; const targets = p.targets || [];
    view.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-go="players" style="margin-bottom:1rem">← Academy</button>
      <div class="player-detail">
        <div><div class="fc-card" style="max-width:230px;margin:0 auto">${fcCardInner(p)}</div></div>
        <div>
          <div class="eyebrow" style="color:var(--gold)">${esc(p.pos)} · Squad #${p.number}${p.captain?' · Captain 🧢':''}</div>
          <h2 style="font-family:var(--display);font-size:2.2rem;margin:.1rem 0 1rem">${esc(p.name)}</h2>
          <div class="stat-strip" style="grid-template-columns:repeat(auto-fit,minmax(88px,1fr))">
            ${stats.map(([k,v])=>`<div class="stat"><div class="n">${v}</div><div class="l">${k}</div></div>`).join("")}
          </div>

          <div class="card pad-lg" style="margin-top:1.2rem">
            <h3 style="margin:0 0 .2rem;font-family:var(--display)">Development progress</h3>
            <p class="muted" style="margin:0 0 .9rem;font-size:.86rem">How ${esc(p.name.split(" ")[0])} is progressing toward their own targets — set by the coaches.</p>
            ${DEV_AREAS.map(([k,label])=>{const v=dev[k]||0;return `<div class="attr-bar"><div class="row"><span>${label}</span><span style="color:var(--gold-bright)">${v}%</span></div><div class="track"><div class="fill" style="width:${v}%"></div></div></div>`;}).join("")}
          </div>

          ${targets.length?`<div class="card pad-lg" style="margin-top:1.2rem">
            <h3 style="margin:0 0 .6rem;font-family:var(--display)">Goals to achieve</h3>
            ${targets.map(t=>`<div class="program-step"><div class="dot">★</div><div>${esc(t)}</div></div>`).join("")}
          </div>`:""}

          <button class="btn btn-gold btn-sm" data-go="development/${p.id}" style="margin-top:1.2rem">${p.id===S.me?"My":esc(p.name.split(" ")[0])+"'s"} development plan &amp; videos →</button>
        </div>
      </div>`;
    wireGo();
  }

  /* ============================ DEVELOPMENT ============================ */
  function DevelopmentIndex() {
    const players = S.roster(true).sort((a,b)=>a.number-b.number);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} · Coaches view</div><h2>Players' Development</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">You're an admin, so you can open any player to see and manage their plan, videos and progress.</p>
      <div class="players-grid" style="margin-top:1.2rem;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        ${players.map(p=>`<button class="card" data-go="development/${p.id}" style="cursor:pointer;display:flex;gap:.8rem;align-items:center;text-align:left">
          <span class="club-badge us" style="flex:none">${esc(initials(p))}</span>
          <span><b style="display:block">${esc(p.name)}</b><span class="muted" style="font-size:.82rem">#${p.number} · ${esc(p.pos)}${p.signed===false?' · pending':''}</span></span>
        </button>`).join("") || `<div class="card"><p class="muted" style="margin:0">No players in ${esc(S.season)} yet.</p></div>`}
      </div>`;
    wireGo();
  }

  function Development(id) {
    if (!id && S.isAdmin) return DevelopmentIndex();
    const p = id ? S.player(+id) : S.player(S.me);
    if (!p) { view.innerHTML = `<div class="card pad-lg"><h2 style="font-family:var(--display)">Development</h2><p class="muted">Choose which player is yours from the top bar to see their development plan.</p></div>`; return; }
    const mine = p.id === S.me;
    const track = mine && !S.isAdmin;   // only the child earns points, on their own videos
    const program = p.program || [];
    const videos = (p.videos || []).map((v,i)=>({ ...v, domId:`devvid-${p.id}-${i}`, yt:ytId(v.url) }));
    view.innerHTML = `
      ${S.isAdmin ? `<button class="btn btn-ghost btn-sm" data-go="development" style="margin-bottom:1rem">← All players</button>`
        : (id && !mine ? `<button class="btn btn-ghost btn-sm" data-go="players/${p.id}" style="margin-bottom:1rem">← ${esc(p.name.split(" ")[0])}'s card</button>` : "")}
      <div class="section-head"><div><div class="eyebrow">${esc(p.name)}</div><h2>${mine?"My":esc(p.name.split(" ")[0])+"'s"} Development</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Your personal plan, videos the coaches have picked for you, and this week's quiz.</p>

      <div class="card pad-lg" style="margin-top:1.2rem">
        <h3 style="margin:0 0 .5rem;font-family:var(--display)">Personal development plan</h3>
        ${program.length?program.map((s,i)=>`<div class="program-step"><div class="dot">${i+1}</div><div>${esc(s)}</div></div>`).join("")
          :`<p class="muted" style="margin:0">Your coach will add your plan here soon.</p>`}
      </div>

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Picked for you</div><h2>My Videos</h2></div></div>
      ${videos.length?`<div class="grid cols-2">${videos.map(v=>`<div class="card"><b style="display:block;margin-bottom:.6rem">${esc(v.title||"Video")}</b>${(track && v.yt)?`<div class="video"><iframe id="${v.domId}" src="https://www.youtube.com/embed/${v.yt}?enablejsapi=1" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`:videoEmbed(v.url)}${track?`<div class="muted" style="font-size:.74rem;margin-top:.4rem">${v.yt?`+${(cfg.SCORING||{}).videoFirstWatch} for watching it fully, +${(cfg.SCORING||{}).videoRewatch} each rewatch 🎬`:`Auto-points only work for YouTube links`}</div>`:""}</div>`).join("")}</div>`
        :`<div class="card"><p class="muted" style="margin:0">No videos yet — your coach will add some skills to work on.</p></div>`}

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Fresh every week · test yourself</div><h2>Weekly Quiz</h2></div>
        ${S.state.quizScore!=null?`<span class="tag green">Last score ${S.state.quizScore}/${S.currentQuiz().questions.length}</span>`:""}</div>
      <div class="card pad-lg"><div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div></div>`;
    wireGo();
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
    if (track) trackYouTube(p.id, videos.filter(v=>v.yt).map(v=>({ domId:v.domId, url:v.url })));
  }
  function fcCardInner(p){ return `<div class="fc-inner">
      <div class="fc-top">
        <div><div class="fc-rating">${p.points||0}</div><div class="fc-pos">PTS</div></div>
        <div style="text-align:right"><div class="fc-num">#${p.number}</div><div class="fc-pos">${esc(p.pos)}</div></div>
      </div>
      <div class="fc-photo"><div class="avatar">${esc(initials(p))}</div></div>
      <div class="fc-name">${p.captain?'<span class="capt" title="Captain">C</span> ':''}${esc(p.name)}</div>
      <div class="fc-stats">
        <div><span>GOALS</span>${p.goals||0}</div><div><span>ASSISTS</span>${p.assists||0}</div>
        <div><span>MOTM</span>${p.motm||0}</div><div><span>TRAINING</span>${p.sessions||0}</div>
      </div>
      <img class="fc-crest" src="assets/crest.svg" alt=""/></div>`; }

  /* ============================ LEAGUE / GAMIFICATION ============================ */
  function pointsRules() {
    const s = cfg.SCORING || {};
    const pm = n => (n > 0 ? "+" + n : "" + n);
    return [
      { em:"⚽", label:"Goal in a game", pts:pm(s.goal) },
      { em:"🅰️", label:"Assist", pts:pm(s.assist) },
      { em:"⭐", label:"Man of the Match", pts:pm(s.motm) },
      { em:"🧤", label:"Clean sheet (defenders &amp; GK)", pts:pm(s.cleanSheet) },
      { em:"✅", label:"Training attendance", pts:pm(s.trainingAttendance) },
      { em:"🏋️", label:"Good training performance", pts:pm(s.trainingPerformanceGood) },
      { em:"⚠️", label:"Poor training performance", pts:pm(s.trainingPerformancePoor) },
      { em:"🧠", label:"Quiz — per correct answer", pts:pm(s.quizPerCorrect) },
      { em:"🎬", label:"Watch a coach's video fully", pts:pm(s.videoFirstWatch)+" then "+pm(s.videoRewatch)+" each rewatch" },
      { em:"🛏️", label:"Make-your-bed (full week)", pts:pm(s.makeYourBedPerWeek) },
      { em:"🤹", label:"Fun home challenge", pts:pm(s.funHomeChallenge) },
      { em:"🎯", label:"Coach challenge", pts:pm(s.challenge) },
      { em:"💯", label:"Every session in a month", pts:pm(s.perfectMonth) },
      { em:"🏅", label:"Bottom of league — big challenge", pts:pm(s.bottomOfLeagueChallenge) }
    ];
  }

  function League() {
    const rows = S.leagueRows();
    const myScore = S.state.quizScore;
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Effort gets rewarded</div><h2>Academy League</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Earn points for turning up to training, working hard, smashing the weekly quiz and completing fun challenges at home. It all adds up — who'll finish top of the academy?</p>

      <div class="grid cols-3" style="margin-top:1.2rem">
        <div class="card" style="grid-column:1 / span 2;padding:.4rem 1rem">
          <div class="table-wrap"><table class="league-table">
            <thead><tr><th>#</th><th>Player</th><th>Gls</th><th>Ast</th><th>MOM</th><th>Trn</th><th>Points</th></tr></thead>
            <tbody>${rows.map((r,i)=>`<tr class="${r.playerId===S.me?'me':''}">
              <td class="rank ${i<3?'r'+(i+1):''}">${i+1}</td>
              <td><b>${esc(r.player.name)}</b>${r.player.captain?' <span class="capt" title="Captain">C</span>':''}</td>
              <td>${r.goals}</td><td>${r.assists}</td><td>${r.motm}</td><td>${r.sessions}</td>
              <td class="pts">${r.total}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>
        <div>
          <div class="card" style="text-align:center">
            <div class="lbl" style="color:var(--muted);font-weight:700;font-size:.74rem;letter-spacing:1px">HOW POINTS WORK</div>
            <div class="badge-row" style="flex-direction:column;margin-top:.7rem;text-align:left">
              ${pointsRules().map(r=>`<div class="ach"><span class="em">${r.em}</span><div>${r.label} <span class="muted" style="font-weight:800;color:var(--gold-bright)">${r.pts}</span></div></div>`).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:1.4rem">
        <div class="card pad-lg" id="quiz-card">
          <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">Fresh every week · +${(cfg.SCORING||{}).quizPerCorrect}/correct</div><h2 style="font-size:1.5rem">${esc(S.currentQuiz().title)}</h2></div>
            ${myScore!=null?`<span class="tag green">Last score ${myScore}/${S.currentQuiz().questions.length}</span>`:""}</div>
          <div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div>
        </div>
        <div class="card pad-lg">
          <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">Earn extra points</div><h2 style="font-size:1.5rem">Fun Challenges</h2></div></div>
          ${S.state.exercises.map(x=>{
            const done = S.challengeDone(S.me, x);
            return `<div class="ach" style="margin-bottom:.6rem;justify-content:space-between">
              <div style="display:flex;gap:.6rem;align-items:center"><span class="em">${x.icon}</span><div><b>${esc(x.name)}</b>${x.weekly?` <span class="tag">this week</span>`:""}<br><span class="muted" style="font-size:.78rem">${esc(x.desc)}</span></div></div>
              <button class="btn ${done?'btn-ghost':'btn-dark'} btn-sm" data-ex="${x.id}" ${done?'disabled':''}>${done?'✓ Done':'+'+x.points}</button>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Unlock them all</div><h2>Badges</h2></div></div>
      <div class="card"><div class="badge-row">
        ${(()=>{ const earned=S.earnedAchievements(S.me); return S.state.achievements.map(a=>{const got=earned.includes(a.key);return `<div class="ach ${got?'':'locked'}"><span class="em">${a.emoji}</span><div><b>${esc(a.name)}</b>${got?' <span class="tag green">Earned</span>':''}<br><span class="muted" style="font-size:.74rem">${esc(a.desc)}</span></div></div>`;}).join("");})()}
      </div></div>`;

    view.querySelectorAll("[data-ex]").forEach(b => b.addEventListener("click", async () => {
      if (S.isAdmin) return toast("Admins don't earn league points");
      const ex = S.state.exercises.find(e => e.id === +b.dataset.ex);
      const res = await S.tickChallenge(S.me, ex);
      if (res.ok) { toast(res.dup ? "Already done this " + (ex.weekly ? "week" : "season") : "+" + ex.points + " points! 🎉"); League(); }
      else toast("Error: " + res.msg);
    }));
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
  }

  function runQuiz() {
    const qz = S.currentQuiz(); let idx = 0, score = 0;
    const host = $("#quiz-host");
    if (S.quizDoneThisWeek(S.me)) {
      host.innerHTML = `<div style="text-align:center;padding:1rem"><div class="tag green">Done this week ✓</div><p class="muted" style="margin-top:.6rem">You've already completed this week's quiz — your points are in the league. A fresh quiz lands next week!</p></div>`;
      return;
    }
    function render() {
      if (idx >= qz.questions.length) {
        S.setQuizScore(score);
        if (!S.isAdmin) S.recordQuiz(S.me, score);
        host.innerHTML = `<div style="text-align:center;padding:1rem">
          <div class="progress-ring" style="--p:${Math.round(score/qz.questions.length*100)};margin:0 auto 1rem"><div class="inner">${score}/${qz.questions.length}</div></div>
          <h3 style="font-family:var(--display);margin:.2rem 0">${score===qz.questions.length?'Perfect! 🧠':score>=3?'Great work! ⚽':'Nice try — you\'ll smash it next time! 💪'}</h3>
          <p class="muted">Those points are heading to the league table. Come back next week for a brand-new quiz!</p>
          <button class="btn btn-dark btn-sm" onclick="location.hash='#league'">Back to league</button></div>`;
        return;
      }
      const q = qz.questions[idx];
      host.innerHTML = `<div class="quiz-q">
        <div class="tag gold" style="margin-bottom:.6rem">Question ${idx+1} of ${qz.questions.length}</div>
        <h3 style="margin:.2rem 0 .9rem">${esc(q.q)}</h3>
        ${q.opts.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join("")}
      </div>`;
      host.querySelectorAll(".quiz-opt").forEach(btn => btn.addEventListener("click", () => {
        const i = +btn.dataset.i;
        host.querySelectorAll(".quiz-opt").forEach(b=>b.disabled=true);
        if (i === q.answer) { btn.classList.add("correct"); score++; }
        else { btn.classList.add("wrong"); host.querySelectorAll(".quiz-opt")[q.answer].classList.add("correct"); }
        setTimeout(()=>{ idx++; render(); }, 850);
      }));
    }
    render();
  }

  /* ============================ ADMIN PANEL ============================ */
  function Admin(sub) {
    if (!S.isAdmin) { view.innerHTML = `<div class="card pad-lg"><h2 style="font-family:var(--display)">Admins only</h2><p class="muted">This area is for team coaches/admins. Ask the team admin to grant you access.</p></div>`; return; }
    sub = sub || "fixtures";
    const tabs = [["fixtures","Add fixture"],["result","Enter result"],["register","Register"],["points","Points & league"],["quizresults","Quiz results"],["quizedit","Quiz"],["academy","Development"],["drills","Drill library"],["contacts","Contacts"],["roster","Roster"],["players","Add player"],["training","Plan training"],["events","Add event"]];
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Coaches only</div><h2>Admin Panel</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Manage everything from here — no spreadsheets. ${S.MODE==='preview'?'<b>Preview mode:</b> changes save to this browser so you can try it. Connect Supabase to save for everyone.':'Changes save to your database and appear for everyone straight away.'}</p>
      <div class="badge-row" style="margin:1rem 0 1.2rem">
        ${tabs.map(([k,l])=>`<button class="btn ${sub===k?'btn-gold':'btn-ghost'} btn-sm" data-atab="${k}">${l}</button>`).join("")}
      </div>
      <div id="admin-body"></div>`;
    view.querySelectorAll("[data-atab]").forEach(b => b.addEventListener("click", () => location.hash = "#admin/"+b.dataset.atab));
    const sub2 = (location.hash.replace("#","").split("/"))[2];
    ({ fixtures:AdmFixture, result:AdmResult, register:AdmRegister, points:AdmPoints, quizresults:AdmQuizResults, quizedit:AdmQuizEditor, academy:AdmAcademy, drills:AdmDrills, contacts:AdmContacts, roster:AdmRoster, players:AdmPlayer, training:AdmTraining, events:AdmEvent }[sub] || AdmFixture)(sub2);
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:linear-gradient(180deg,var(--gold-bright),var(--gold));color:#171205;font-weight:800;padding:.7rem 1.2rem;border-radius:999px;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,.4)";
    document.body.appendChild(t); setTimeout(()=>t.remove(), 2200);
  }
  const playerOpts = (sel) => S.roster(true).sort((a,b)=>a.number-b.number).map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>#${p.number} ${esc(p.name)}</option>`).join("");
  const F = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;

  function AdmFixture(editId) {
    const body = $("#admin-body");
    const ed = editId ? S.state.fixtures.find(f=>f.id===+editId) : null;
    const v = (x,d)=> ed && ed[x]!=null ? ed[x] : (d||"");
    const seasonFix = [...S.state.fixtures].filter(f=>S.inSeason(f.date)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const optSel = (val,opts)=>opts.map(([k,l])=>`<option value="${k}" ${v("__"+k)===k||val===k?'selected':''}>${l}</option>`).join("");
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <h3 style="margin:0 0 .6rem;font-family:var(--display)">${ed?`Edit fixture — vs ${esc(ed.opponent)}`:"Add a fixture"}</h3>
      ${F("Opponent",`<input id="f-opp" value="${esc(v("opponent"))}" placeholder="e.g. Wallsend Boys Club"/>`)}
      <div class="grid cols-2">${F("Date",`<input type="date" id="f-date" value="${esc(v("date"))}"/>`)}${F("Competition",`<select id="f-comp">${["League","Cup","Friendly","U10 Ladder","Spring Vase","Autumn Vase"].map(c=>`<option ${v("competition")===c?'selected':''}>${c}</option>`).join("")}</select>`)}</div>
      <div class="grid cols-2">${F("Kick-off",`<input type="time" id="f-ko" value="${esc(v("kickoff","10:00"))}"/>`)}${F("Meet-up time",`<input type="time" id="f-meet" value="${esc(v("meetup","09:30"))}"/>`)}</div>
      <div class="grid cols-2">${F("Home or away",`<select id="f-ha"><option value="H" ${v("home_away")==="H"?'selected':''}>Home</option><option value="A" ${v("home_away")==="A"?'selected':''}>Away</option></select>`)}${F("Kit",`<select id="f-kit"><option value="gold" ${v("kit")==="gold"?'selected':''}>Gold (home)</option><option value="black" ${v("kit")==="black"?'selected':''}>Black (away)</option><option value="white" ${v("kit")==="white"?'selected':''}>White (third)</option></select>`)}</div>
      ${F("Ground",`<input id="f-ground" value="${esc(v("ground"))}" placeholder="e.g. Harris Park, Pitch 3"/>`)}
      ${F("Full address (for maps)",`<input id="f-addr" value="${esc(v("address"))}" placeholder="Street, Town, Postcode"/>`)}
      <button class="btn btn-gold btn-block" id="f-save">${ed?"Save changes":"Add fixture"}</button>
      ${ed?`<button class="btn btn-ghost btn-sm btn-block" id="f-cancel" style="margin-top:.5rem">Cancel</button>`:""}
      <p class="muted" style="font-size:.8rem;margin:.8rem 0 0">Goals, assists and Man of the Match are added per game on the <b>Enter result</b> tab — anytime, even after the score's in.</p>
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">${esc(S.season)} FIXTURES</div>
      ${seasonFix.map(f=>`<div class="ach" style="margin-bottom:.35rem;justify-content:space-between"><div>${f.our_score!=null?`<span class="tag ${f.result==='W'?'win':f.result==='L'?'loss':'draw'}">${f.our_score}-${f.their_score}</span> `:''}${fdate(f.date)} <b>vs ${esc(f.opponent)}</b> <span class="muted">${f.home_away==='H'?'(H)':'(A)'}</span></div><div style="display:flex;gap:.4rem"><button class="btn btn-ghost btn-sm" data-edit-fix="${f.id}">Edit</button><button class="btn btn-ghost btn-sm" data-del-fix="${f.id}">✕</button></div></div>`).join("") || `<p class="muted">No fixtures in ${esc(S.season)} yet.</p>`}
    </div>`;
    const collect = () => ({ opponent:$("#f-opp").value.trim(), date:$("#f-date").value, kickoff:$("#f-ko").value, meetup:$("#f-meet").value,
      home_away:$("#f-ha").value, kit:$("#f-kit").value, competition:$("#f-comp").value,
      ground:$("#f-ground").value.trim(), address:$("#f-addr").value.trim() });
    $("#f-save").addEventListener("click", async () => {
      const data = collect();
      if (!data.opponent || !data.date) return toast("Add an opponent and a date");
      const res = ed ? await S.updateFixture(ed.id, data) : await S.addFixture(data);
      if (res.ok) { toast(ed?"Fixture updated ✓":"Fixture added ✓"); Admin("fixtures"); } else toast("Error: "+res.msg);
    });
    if (ed) $("#f-cancel").addEventListener("click", ()=>location.hash="#admin/fixtures");
    body.querySelectorAll("[data-edit-fix]").forEach(b=>b.addEventListener("click", ()=>location.hash="#admin/fixtures/"+b.dataset.editFix));
    body.querySelectorAll("[data-del-fix]").forEach(b=>b.addEventListener("click", async ()=>{
      const f = S.state.fixtures.find(x=>x.id===+b.dataset.delFix);
      if (!window.confirm(`Delete the fixture vs ${f.opponent} on ${fdate(f.date)}? This also removes its match points.`)) return;
      const res = await S.deleteFixture(+b.dataset.delFix);
      if (res.ok){ toast("Fixture deleted"); Admin("fixtures"); } else toast("Error: "+res.msg);
    }));
  }

  function AdmResult() {
    const played = [...S.state.fixtures].sort((a,b)=>(b.date||"").localeCompare(a.date||"")); // newest first
    const fullRoster = S.roster(true).sort((a,b)=>a.number-b.number);
    const defGk = fullRoster.filter(p=>DEF_POS.includes(p.pos));
    const body = $("#admin-body");
    if (!played.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No fixtures yet — add one on the <b>Add fixture</b> tab.</p></div>`; return; }
    // default to the most recent fixture that's already in the past and unscored, else newest
    const today = new Date().toISOString().slice(0,10);
    let curId = (played.find(f => f.date <= today && f.our_score == null) || played[0]).id;
    const motmOpts = sel => `<option value="">— none —</option>` + playerOpts(sel);
    let st = blankState();

    function blankState(){ return { our:0, them:0, motm:null, goals:[{scorer:null,assist:null}], cs:new Set(), lineup:new Set() }; }
    function loadFixture(id){
      const fx = played.find(f=>f.id===id) || {};
      const csIds = (S.state.ledger||[]).filter(e=>e.ref && e.ref.startsWith(`match:${id}:cs`)).map(e=>e.player_id);
      st = {
        our: fx.our_score!=null?fx.our_score:0,
        them: fx.their_score!=null?fx.their_score:0,
        motm: fx.motm!=null?fx.motm:null,
        goals: (fx.goals && fx.goals.length) ? fx.goals.map(g=>({scorer:g.scorer??null, assist:g.assist??null})) : [{scorer:null,assist:null}],
        cs: new Set(csIds),
        lineup: new Set(Array.isArray(fx.lineup)?fx.lineup:[])
      };
    }
    function syncFromDom(){
      if (!body.querySelector("#r-us")) return;
      st.our = +body.querySelector("#r-us").value||0;
      st.them = +body.querySelector("#r-them").value||0;
      const m = body.querySelector("#r-motm").value; st.motm = m ? +m : null;
      body.querySelectorAll("[data-g]").forEach(sel=>{ const i=+sel.dataset.i; st.goals[i]=st.goals[i]||{scorer:null,assist:null}; st.goals[i][sel.dataset.g]= sel.value? +sel.value : null; });
      st.cs = new Set([...body.querySelectorAll(".cs:checked")].map(c=>+c.value));
      st.lineup = new Set([...body.querySelectorAll(".lp:checked")].map(c=>+c.value));
    }
    function goalRow(g,i){ return `<div class="grid" style="grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem;align-items:end">
      ${F("Scorer",`<select data-g="scorer" data-i="${i}">${playerOpts(g.scorer)}</select>`)}
      ${F("Assist (optional)",`<select data-g="assist" data-i="${i}"><option value="">— none —</option>${playerOpts(g.assist)}</select>`)}
      <button class="btn btn-ghost btn-sm" data-del="${i}" style="min-height:44px">✕</button></div>`; }
    function render() {
      const fx = played.find(f=>f.id===curId) || {};
      body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
        ${F("Which fixture?",`<select id="r-fix">${played.map(f=>`<option value="${f.id}" ${f.id===curId?'selected':''}>${f.our_score!=null?'✓ ':''}${fdate(f.date)} — vs ${esc(f.opponent)}</option>`).join("")}</select>`)}
        ${fx.our_score!=null?`<p class="muted" style="margin:.2rem 0 .6rem;font-size:.82rem">Editing a saved result — its points will be recalculated from what you save here.</p>`:""}
        <div class="grid cols-2">${F("Our score",`<input type="number" min="0" id="r-us" value="${st.our}"/>`)}${F("Their score",`<input type="number" min="0" id="r-them" value="${st.them}"/>`)}</div>
        ${F("Man of the Match",`<select id="r-motm">${motmOpts(st.motm)}</select>`)}
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">GOALSCORERS</div>
        <div id="goal-rows">${st.goals.map((g,i)=>goalRow(g,i)).join("")}</div>
        <button class="btn btn-dark btn-sm" id="add-goal" style="margin:.3rem 0 1rem">+ Add goal</button>
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">WHO PLAYED <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— tick the squad who featured</span> <button class="btn btn-ghost btn-sm" id="lp-all" type="button" style="margin-left:.4rem">All</button></div>
        <div id="lp-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.2rem .8rem">${fullRoster.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.45rem;margin-bottom:.2rem"><input type="checkbox" class="lp" value="${p.id}" ${st.lineup.has(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)}</span></label>`).join("")}</div>
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.6rem 0 .4rem">CLEAN SHEET <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— tick defenders &amp; GK who kept it (+${(cfg.SCORING||{}).cleanSheet})</span></div>
        <div id="cs-list">${defGk.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.3rem"><input type="checkbox" class="cs" value="${p.id}" ${st.cs.has(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)} <span class="muted">${esc(p.pos)}</span></span></label>`).join("") || `<p class="muted" style="margin:.2rem 0">No defenders/keepers in the ${esc(S.season)} squad.</p>`}</div>
        <button class="btn btn-gold btn-block" id="r-save" style="margin-top:1rem">Save result</button>
      </div>`;
      body.querySelector("#r-fix").addEventListener("change", e => { curId = +e.target.value; loadFixture(curId); render(); });
      body.querySelector("#lp-all").addEventListener("click", () => { syncFromDom(); st.lineup = new Set(fullRoster.map(p=>p.id)); render(); });
      body.querySelector("#add-goal").addEventListener("click", () => { syncFromDom(); st.goals.push({scorer:null,assist:null}); render(); });
      body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{ syncFromDom(); st.goals.splice(+b.dataset.del,1); if(!st.goals.length)st.goals=[{scorer:null,assist:null}]; render(); }));
      body.querySelector("#r-save").addEventListener("click", saveIt);
    }
    async function saveIt(){
      syncFromDom();
      const fx = played.find(f=>f.id===curId) || {};
      if (fx.date > today && !window.confirm("This fixture is in the future — save a result anyway?")) return;
      const res = await S.saveResult(curId, {
        our_score:st.our, their_score:st.them, motm:st.motm,
        goals:st.goals.filter(g=>g.scorer), cleanSheets:[...st.cs], lineup:[...st.lineup] });
      if (res.ok){ toast("Result saved ✓"); location.hash="#fixtures/past"; } else toast("Error: "+res.msg);
    }
    loadFixture(curId);
    render();
  }

  // ---- Training register: attendance + good/poor performance ----
  function AdmRegister() {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    if (!roster.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet.</p></div>`; return; }
    const dates = upcomingTrainingDates(6);
    // also offer recent past session dates so you can register after the session (8 weeks back)
    const past = []; const today = new Date();
    for (let i=1;i<=56 && past.length<10;i++){ const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i); const iso=ymd(d); if(S.inSeason(iso)&&itemsOn(iso).some(x=>x.kind==="training")) past.push(iso); }
    const allDates = [...past.reverse(), ...dates];

    // RSVP "going" for a training date = the parent said yes/lift; used to PREFILL only.
    function rsvpGoing(iso) {
      const m = S.state.attendance["t"+iso] || {};
      return new Set(Object.entries(m).filter(([,v])=>v==="yes"||v==="lift").map(([k])=>+k));
    }
    function renderRows(iso) {
      const saved = S.registerState(iso);
      const hasSaved = Object.keys(saved).length > 0;
      const going = rsvpGoing(iso);
      body.querySelector("#reg-rows").innerHTML = roster.map(p=>{
        // if a register was saved, use it; otherwise prefill attendance from RSVP (coach can override)
        const s = saved[p.id] || { attended: hasSaved ? false : going.has(p.id), perf:"" };
        const rsvp = going.has(p.id);
        return `<tr>
          <td><b>${esc(p.name)}</b> <span class="muted">#${p.number}</span>${rsvp?` <span class="tag green" style="font-size:.6rem">RSVP'd</span>`:""}</td>
          <td style="text-align:center"><input type="checkbox" class="rg-att" data-p="${p.id}" ${s.attended?"checked":""} style="width:20px;height:20px"/></td>
          <td><select class="rg-perf" data-p="${p.id}"><option value="" ${s.perf===""?"selected":""}>—</option><option value="good" ${s.perf==="good"?"selected":""}>Good (+${(cfg.SCORING||{}).trainingPerformanceGood})</option><option value="poor" ${s.perf==="poor"?"selected":""}>Poor (${(cfg.SCORING||{}).trainingPerformancePoor})</option></select></td>
        </tr>`;
      }).join("");
    }
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Take the register for a <b>${esc(S.season)}</b> session. Attendance is +${(cfg.SCORING||{}).trainingAttendance}; grade effort Good/Poor. We <b>pre-fill from RSVPs</b> but you have the final say — untick anyone who said yes but didn't show. Saving updates the league instantly.</p>
      ${F("Session date",`<select id="reg-date">${allDates.map(iso=>`<option value="${iso}">${fdateLong(iso)}</option>`).join("")}${allDates.length?"":`<option value="">No sessions found</option>`}</select>`)}
      <div class="badge-row" style="margin:.2rem 0 .8rem">
        <button class="btn btn-ghost btn-sm" id="reg-all">✓ Mark all present</button>
        <button class="btn btn-ghost btn-sm" id="reg-none">Clear all</button>
      </div>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>Player</th><th>Attended</th><th>Performance</th></tr></thead><tbody id="reg-rows"></tbody></table></div>
      <button class="btn btn-gold btn-block" id="reg-save" style="margin-top:1rem">Save register</button>
    </div>`;
    const dsel = body.querySelector("#reg-date");
    dsel.addEventListener("change", () => renderRows(dsel.value));
    if (allDates.length) renderRows(dsel.value);
    body.querySelector("#reg-all").addEventListener("click", ()=>body.querySelectorAll(".rg-att").forEach(c=>c.checked=true));
    body.querySelector("#reg-none").addEventListener("click", ()=>body.querySelectorAll(".rg-att").forEach(c=>c.checked=false));
    body.querySelector("#reg-save").addEventListener("click", async () => {
      const iso = dsel.value; if (!iso) return toast("No session selected");
      const entries = roster.map(p => ({
        playerId: p.id,
        attended: body.querySelector(`.rg-att[data-p="${p.id}"]`).checked,
        perf: body.querySelector(`.rg-perf[data-p="${p.id}"]`).value
      }));
      const res = await S.saveRegister(iso, entries);
      if (res.ok) toast("Register saved ✓"); else toast("Error: "+res.msg);
    });
  }

  // ---- Points & league: live table + manual adjustments ----
  function AdmPoints() {
    const body = $("#admin-body");
    const rows = S.leagueRows();
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const recent = [...(S.state.ledger||[])].filter(e=>e.season===S.season).slice(-12).reverse();
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Every point in <b>${esc(S.season)}</b> adds up here automatically (matches, register, quiz, videos, challenges). Use the box below for one-off awards: the <b>perfect-month</b> bonus, the <b>bottom-of-league</b> big challenge, or a correction.</p>
      <div class="grid cols-2" style="align-items:end">
        ${F("Player",`<select id="pt-player">${roster.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
        ${F("Points (use a minus to deduct)",`<input type="number" id="pt-pts" value="${(cfg.SCORING||{}).perfectMonth}"/>`)}
      </div>
      ${F("Reason",`<input id="pt-note" placeholder="e.g. Perfect month — every session in May"/>`)}
      <div class="badge-row" style="margin:.2rem 0 1rem">
        <button class="btn btn-ghost btn-sm" data-quick="${(cfg.SCORING||{}).perfectMonth}|Perfect month — every session">💯 Perfect month +${(cfg.SCORING||{}).perfectMonth}</button>
        <button class="btn btn-ghost btn-sm" data-quick="${(cfg.SCORING||{}).bottomOfLeagueChallenge}|Bottom-of-league big challenge">🏅 Bottom-league challenge +${(cfg.SCORING||{}).bottomOfLeagueChallenge}</button>
      </div>
      <button class="btn btn-gold btn-block" id="pt-save">Add points</button>
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">LEAGUE (${esc(S.season)})</div>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>#</th><th>Player</th><th>Pts</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.player.name)}</td><td class="pts">${r.total}</td></tr>`).join("")}</tbody></table></div>
      ${recent.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">RECENT POINTS <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— ✕ to undo a mistake</span></div>${recent.map(e=>{const pl=S.player(e.player_id);return `<div class="ach" style="margin-bottom:.3rem;justify-content:space-between"><div>${esc(pl?pl.name:"?")} <span class="muted">· ${esc(e.note||e.category)}</span></div><div style="display:flex;align-items:center;gap:.6rem"><b style="color:var(--gold-bright)">${e.points>0?"+":""}${e.points}</b><button class="btn btn-ghost btn-sm" data-del-pe="${e.id}" title="Undo">✕</button></div></div>`;}).join("")}`:""}
    </div>`;
    body.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>{
      const [pts,note]=b.dataset.quick.split("|"); body.querySelector("#pt-pts").value=pts; body.querySelector("#pt-note").value=note;
    }));
    body.querySelector("#pt-save").addEventListener("click", async () => {
      const pid=+body.querySelector("#pt-player").value, pts=+body.querySelector("#pt-pts").value, note=body.querySelector("#pt-note").value.trim();
      if(!pts) return toast("Enter a points value");
      const res = await S.addManual(pid, pts, note);
      if(res.ok){ toast("Points added ✓"); Admin("points"); } else toast("Error: "+res.msg);
    });
    body.querySelectorAll("[data-del-pe]").forEach(b=>b.addEventListener("click", async ()=>{
      const res = await S.deletePointEvent(+b.dataset.delPe);
      if(res.ok){ toast("Removed ✓"); Admin("points"); } else toast("Error: "+res.msg);
    }));
  }

  // ---- Weekly quiz results table (auto-marked; blank = 0, not done) ----
  function AdmQuizResults() {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const total = S.currentQuiz().questions.length || 0;
    const week = S.weekId();
    const results = S.quizResults(week);
    const done = roster.filter(p=>results[p.id]!=null).length;
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Quiz results for <b>${esc(week)}</b> (${esc(S.season)}). Auto-marked — 1 point per correct answer. Anyone who hasn't done it by Sunday counts as <b>0</b>. ${done}/${roster.length} completed.</p>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>Player</th><th>Score</th><th>Status</th></tr></thead>
        <tbody>${roster.map(p=>{
          const sc=results[p.id];
          return `<tr><td><b>${esc(p.name)}</b> <span class="muted">#${p.number}</span></td>
            <td class="pts">${sc!=null?sc:0}${total?` / ${total}`:""}</td>
            <td>${sc!=null?`<span class="tag green">Done</span>`:`<span class="tag">Not done (0)</span>`}</td></tr>`;
        }).join("")}</tbody></table></div>
    </div>`;
  }

  function AdmAcademy() {
    const body = $("#admin-body");
    const players = S.roster(true).sort((a,b)=>a.number-b.number);
    if (!players.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet. Add them on the <b>Roster</b> tab first.</p></div>`; return; }
    function load(id) {
      const p = S.player(id); if (!p) return;
      const dev = p.dev || {};
      body.querySelector("#ac-fields").innerHTML = `
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.6rem 0 .3rem">DEVELOPMENT PROGRESS (%)</div>
        <div class="grid cols-3">${DEV_AREAS.map(([k,label])=>F(label,`<input type="number" min="0" max="100" id="ac-${k}" value="${dev[k]||0}"/>`)).join("")}</div>
        ${F("Goals to achieve (one per line)",`<textarea id="ac-targets" rows="3">${esc((p.targets||[]).join("\n"))}</textarea>`)}
        ${F("Development plan (one step per line)",`<textarea id="ac-plan" rows="4">${esc((p.program||[]).join("\n"))}</textarea>`)}
        ${F("Videos — one per line as: Title | https://link",`<textarea id="ac-videos" rows="3">${esc((p.videos||[]).map(v=>`${v.title} | ${v.url}`).join("\n"))}</textarea>`)}
        <button class="btn btn-gold btn-block" id="ac-save">Save ${esc(p.name)}'s development</button>`;
      body.querySelector("#ac-save").addEventListener("click", async () => {
        const devObj = {}; DEV_AREAS.forEach(([k]) => devObj[k] = Math.max(0, Math.min(100, +$("#ac-"+k).value || 0)));
        const targets = $("#ac-targets").value.split("\n").map(s=>s.trim()).filter(Boolean);
        const program = $("#ac-plan").value.split("\n").map(s=>s.trim()).filter(Boolean);
        const videos = $("#ac-videos").value.split("\n").map(s=>s.trim()).filter(Boolean).map(line => {
          const [title, url] = line.split("|").map(x=>x.trim()); return { title: title||"Video", url: url||"" };
        });
        const res = await S.updatePlayerAcademy(id, { dev: devObj, targets, program, videos });
        if (res.ok) toast("Development saved ✓"); else toast("Error: "+res.msg);
      });
    }
    body.innerHTML = `<div class="card pad-lg" style="max-width:640px">
      <p class="muted" style="margin-top:0">Set each player's <b>${esc(S.season)}</b> development progress, targets, plan and personalised videos. Shown on their Academy profile and Development page.</p>
      ${F("Player",`<select id="ac-player">${players.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
      <div id="ac-fields"></div>
    </div>`;
    body.querySelector("#ac-player").addEventListener("change", e => load(+e.target.value));
    load(players[0].id);
  }

  // ---- Quiz editor: shuffle / write / reset this week's questions ----
  function AdmQuizEditor() {
    const body = $("#admin-body");
    const cq = S.currentQuiz();
    function qRow(q,i){ return `<div class="ach" style="margin-bottom:.35rem;justify-content:space-between;align-items:flex-start">
      <div><b>${i+1}. ${esc(q.q)}</b><br><span class="muted" style="font-size:.78rem">✓ ${esc(q.opts[q.answer])}</span></div>
      <button class="btn btn-ghost btn-sm" data-rmq="${i}" title="Remove">✕</button></div>`; }
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">This week's quiz (<b>${esc(cq.week)}</b>) — ${cq.custom?'<b>a custom set you made</b>':'auto-rotated from the question bank'}. It refreshes on its own each week; here you can shuffle a fresh set, add your own questions, or reset to automatic.</p>
      <div class="badge-row" style="margin-bottom:1rem">
        <button class="btn btn-gold btn-sm" id="qz-shuffle">🔀 New random set</button>
        <button class="btn btn-ghost btn-sm" id="qz-reset">↺ Reset to automatic</button>
      </div>
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">THIS WEEK — ${cq.questions.length} QUESTIONS</div>
      <div id="qz-list">${cq.questions.map(qRow).join("")}</div>
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1rem 0 .4rem">ADD YOUR OWN QUESTION</div>
      ${F("Question",`<input id="qz-q" placeholder="e.g. Who is the team captain?"/>`)}
      <div class="grid cols-2">${F("Option A",`<input id="qz-o0"/>`)}${F("Option B",`<input id="qz-o1"/>`)}</div>
      <div class="grid cols-2">${F("Option C",`<input id="qz-o2"/>`)}${F("Option D",`<input id="qz-o3"/>`)}</div>
      ${F("Correct answer",`<select id="qz-ans">${["A","B","C","D"].map((l,i)=>`<option value="${i}">${l}</option>`).join("")}</select>`)}
      <button class="btn btn-gold btn-block" id="qz-add">Add question to this week</button>
    </div>`;
    const reload = ()=>Admin("quizedit");
    body.querySelector("#qz-shuffle").addEventListener("click", async ()=>{ const r=await S.saveCustomQuiz(S.shuffleQuiz()); if(r.ok){toast("Fresh set ready ✓"); reload();} else toast("Error: "+r.msg); });
    body.querySelector("#qz-reset").addEventListener("click", async ()=>{ const r=await S.resetCustomQuiz(); if(r.ok){toast("Back to automatic ✓"); reload();} else toast("Error: "+r.msg); });
    body.querySelectorAll("[data-rmq]").forEach(b=>b.addEventListener("click", async ()=>{
      const qs = cq.questions.filter((_,i)=>i!==+b.dataset.rmq);
      const r = await S.saveCustomQuiz(qs); if(r.ok){toast("Removed"); reload();} else toast("Error: "+r.msg);
    }));
    body.querySelector("#qz-add").addEventListener("click", async ()=>{
      const q=$("#qz-q").value.trim(), opts=[0,1,2,3].map(i=>$("#qz-o"+i).value.trim());
      if(!q || opts.some(o=>!o)) return toast("Fill in the question and all four options");
      const qs = [...cq.questions, { q, opts, answer:+$("#qz-ans").value, cat:"custom" }];
      const r = await S.saveCustomQuiz(qs); if(r.ok){toast("Question added ✓"); reload();} else toast("Error: "+r.msg);
    });
  }

  function AdmContacts() {
    const body = $("#admin-body");
    const profs = (S.state.profiles || []).filter(pr => pr.parents && pr.parents.length);
    const allEmails = [...new Set(profs.flatMap(pr => pr.parents.map(p=>p.email).filter(Boolean)))];
    const allPhones = [...new Set(profs.flatMap(pr => pr.parents.map(p=>p.phone).filter(Boolean)))];
    const rows = profs.flatMap(pr => {
      const child = S.player(pr.player_id);
      return pr.parents.map(par => `<tr>
        <td>${child ? esc(child.name) : "—"}</td>
        <td>${esc(par.name||"")}${par.relation?` <span class="muted">(${esc(par.relation)})</span>`:""}</td>
        <td>${par.email?`<a href="mailto:${esc(par.email)}" style="color:var(--gold-bright)">${esc(par.email)}</a>`:""}</td>
        <td>${esc(par.phone||"")}</td></tr>`);
    }).join("");
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Parent contact details from family sign-ups (${profs.length} ${profs.length===1?"family":"families"}, ${allEmails.length} emails). Emails are <b>BCC'd</b> so families can't see each other's addresses.</p>
      ${allEmails.length?`<div class="badge-row" style="margin-bottom:1rem">
        <a class="btn btn-gold btn-sm" href="mailto:?bcc=${encodeURIComponent(allEmails.join(","))}">✉️ Email all parents</a>
        <button class="btn btn-ghost btn-sm" data-copy="${esc(allEmails.join(", "))}">Copy emails</button>
        <button class="btn btn-ghost btn-sm" data-copy="${esc(allPhones.join(", "))}">Copy numbers</button>
      </div>`:""}
      ${rows ? `<div class="table-wrap"><table class="league-table">
        <thead><tr><th>Child</th><th>Parent</th><th>Email</th><th>Mobile</th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : `<p class="muted">No families have completed sign-up yet.</p>`}
    </div>`;
    body.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click", ()=>{
      const t=b.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>toast("Copied ✓"),()=>toast(t));
      else toast(t);
    }));
  }

  function AdmDrills() {
    const body = $("#admin-body");
    const drills = S.state.drills || [];
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Your reusable <b>stock library</b> of drill videos (YouTube/Vimeo). Build it up once, then attach any of these to a session on the <b>Plan training</b> tab — they show on that session in the Schedule.</p>
      ${F("Title",`<input id="dr-title" placeholder="e.g. Cone dribbling warm-up"/>`)}
      <div class="grid cols-2">${F("Skill area",`<select id="dr-area"><option value="">—</option>${DEV_AREAS.map(([,l])=>`<option>${l}</option>`).join("")}</select>`)}${F("Video link",`<input id="dr-url" placeholder="https://youtu.be/..."/>`)}</div>
      <button class="btn btn-gold btn-block" id="dr-save">Add to library</button>
      ${drills.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;margin:1rem 0 .4rem">STOCK LIBRARY (${drills.length})</div>${drills.map(d=>`<div class="ach" style="margin-bottom:.4rem;justify-content:space-between"><div style="display:flex;gap:.6rem;align-items:center"><span class="em">🎬</span><div><b>${esc(d.title)}</b>${d.area?` <span class="tag">${esc(d.area)}</span>`:""}</div></div><button class="btn btn-ghost btn-sm" data-del-drill="${d.id}">✕</button></div>`).join("")}`:`<p class="muted" style="margin-top:1rem">Library is empty — add your first drill video above.</p>`}
    </div>`;
    $("#dr-save").addEventListener("click", async () => {
      const title=$("#dr-title").value.trim(), url=$("#dr-url").value.trim();
      if(!title||!url) return toast("Add a title and a video link");
      const res = await S.addDrill({ title, area:$("#dr-area").value, url });
      if(res.ok){ toast("Added to library ✓"); Admin("drills"); } else toast("Error: "+res.msg);
    });
    body.querySelectorAll("[data-del-drill]").forEach(b => b.addEventListener("click", async () => {
      const res = await S.deleteDrill(+b.dataset.delDrill);
      if(res.ok){ toast("Removed"); Admin("drills"); } else toast("Error: "+res.msg);
    }));
  }

  function AdmRoster() {
    const body = $("#admin-body");
    const season = S.season;
    const players = [...S.state.players].sort((a,b)=>(a.number||999)-(b.number||999));
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Managing the <b>${esc(season)}</b> squad. Tick <b>In ${esc(season)}</b> for the players continuing this season (untick the ones who've left), and tick <b>Signed</b> once a child has registered. <b>Unsigned players are hidden from parents.</b> Switch season from the top bar.</p>
      <div class="table-wrap"><table class="league-table">
        <thead><tr><th>#</th><th>Player</th><th>In ${esc(season)}</th><th>Signed</th></tr></thead>
        <tbody>${players.map(p=>{
          const inS = (Array.isArray(p.seasons)?p.seasons:[]).includes(season);
          return `<tr>
            <td>${p.number||""}</td>
            <td><b>${esc(p.name)}</b>${p.signed===false?` <span class="tag">pending</span>`:""}</td>
            <td style="text-align:center"><input type="checkbox" data-in="${p.id}" ${inS?"checked":""} style="width:20px;height:20px"/></td>
            <td style="text-align:center"><input type="checkbox" data-signed="${p.id}" ${p.signed!==false?"checked":""} style="width:20px;height:20px"/></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
      <div style="margin-top:1rem"><button class="btn btn-ghost btn-sm" data-go-roster-add>+ Add a new player</button></div>
    </div>`;
    body.querySelectorAll("[data-in]").forEach(cb => cb.addEventListener("change", async () => {
      const res = await S.setRoster(+cb.dataset.in, { inSeason: cb.checked });
      if (res.ok) toast(cb.checked ? "Added to "+season+" ✓" : "Removed from "+season); else toast("Error: "+res.msg);
    }));
    body.querySelectorAll("[data-signed]").forEach(cb => cb.addEventListener("change", async () => {
      const res = await S.setRoster(+cb.dataset.signed, { signed: cb.checked });
      if (res.ok) { toast(cb.checked ? "Approved ✓" : "Set to pending"); Admin("roster"); } else toast("Error: "+res.msg);
    }));
    body.querySelector("[data-go-roster-add]").addEventListener("click", () => location.hash = "#admin/players");
  }

  function AdmPlayer() {
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Add a new squad member to the <b>${esc(S.season)}</b> season. They start as <b>pending</b> (hidden from parents) — approve them on the <b>Roster</b> tab once they've signed. Their goals, assists, points and stats then build up automatically from results, the register and the league.</p>
      ${F("Full name",`<input id="p-name" placeholder="e.g. Sam Kirby"/>`)}
      <div class="grid cols-2">${F("Squad number",`<input type="number" min="1" id="p-num"/>`)}${F("Position",`<select id="p-pos">${["GK","RB","LB","CB","CDM","CM","CAM","LM","RM","LW","RW","ST"].map(x=>`<option>${x}</option>`).join("")}</select>`)}</div>
      <label class="field" style="flex-direction:row;align-items:center;gap:.5rem"><input type="checkbox" id="p-capt" style="width:auto"/> <span style="margin:0">Team captain</span></label>
      <button class="btn btn-gold btn-block" id="p-save">Add player</button>
    </div>`;
    $("#p-save").addEventListener("click", async () => {
      const name=$("#p-name").value.trim(); if(!name) return toast("Add a name");
      const init=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const res = await S.addPlayer({ name, number:+$("#p-num").value, pos:$("#p-pos").value,
        captain:$("#p-capt").checked, init });
      if(res.ok){ toast("Player added as pending ✓"); location.hash="#admin/roster"; } else toast("Error: "+res.msg);
    });
  }

  // Next training dates in the current season (from the recurring schedule + any planned ones)
  function upcomingTrainingDates(n) {
    const out = []; const today = new Date();
    for (let i = 0; i < 140 && out.length < n; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = ymd(d);
      if (!S.inSeason(iso)) continue;
      if (itemsOn(iso).some(x => x.kind === "training")) out.push(iso);
    }
    return out;
  }
  function recurFor(iso) {
    const d = new Date(iso + "T00:00:00");
    return (S.state.trainingSchedule || window.HARRIS_DATA.trainingSchedule || []).find(r => d.getDay() === r.day && iso <= r.until) || {};
  }

  function AdmTraining() {
    const body = $("#admin-body");
    const lib = S.state.drills || [];
    const dates = upcomingTrainingDates(10);

    function planFor(iso) { return (S.state.training || []).find(t => t.date === iso); }

    function fields(iso) {
      const base = recurFor(iso), plan = planFor(iso) || {};
      const checked = new Set((plan.videos || []).map(v => v.url));
      $("#t-fields").innerHTML = `
        <div class="grid cols-2">${F("Start",`<input type="time" id="t-start" value="${esc(plan.start||base.start||"18:00")}"/>`)}${F("End",`<input type="time" id="t-end" value="${esc(plan.end||base.end||"19:30")}"/>`)}</div>
        ${F("Location",`<input id="t-loc" value="${esc(plan.location||base.location||"")}" placeholder="e.g. Norman Park, Bromley"/>`)}
        ${F("Session focus",`<input id="t-focus" value="${esc(plan.focus||"")}" placeholder="e.g. Finishing & movement in the box"/>`)}
        ${F("Drill activities (one per line)",`<textarea id="t-drills" rows="3" placeholder="Rondo warm-up&#10;Crossing & finishing circuit&#10;Small-sided 4v4">${esc((plan.drills||[]).join("\n"))}</textarea>`)}
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.8rem 0 .4rem">ATTACH VIDEOS FROM THE STOCK LIBRARY</div>
        ${lib.length ? lib.map(dr => `<label class="field" style="flex-direction:row;align-items:center;gap:.6rem;margin-bottom:.35rem">
            <input type="checkbox" class="t-vid" value="${dr.id}" ${checked.has(dr.url)?"checked":""} style="width:auto"/>
            <span style="margin:0">🎬 ${esc(dr.title)}${dr.area?` <span class="tag t-train">${esc(dr.area)}</span>`:""}</span></label>`).join("")
          : `<p class="muted" style="margin:.2rem 0">No stock videos yet — add some on the <b>Drill library</b> tab first.</p>`}
        <button class="btn btn-gold btn-block" id="t-save" style="margin-top:1rem">Save session plan</button>`;
      $("#t-save").addEventListener("click", save);
    }

    async function save() {
      const iso = $("#t-when").value === "__other" ? $("#t-other").value : $("#t-when").value;
      if (!iso) return toast("Pick or enter a date");
      const drills = $("#t-drills").value.split("\n").map(s=>s.trim()).filter(Boolean);
      const ids = [...body.querySelectorAll(".t-vid:checked")].map(c => +c.value);
      const videos = lib.filter(d => ids.includes(d.id)).map(d => ({ title:d.title, url:d.url, area:d.area }));
      const res = await S.addTraining({ date:iso, start:$("#t-start").value, end:$("#t-end").value,
        location:$("#t-loc").value.trim(), focus:$("#t-focus").value.trim(), drills, videos });
      if (res.ok) { toast("Session plan saved ✓"); location.hash = "#training"; } else toast("Error: "+res.msg);
    }

    body.innerHTML = `<div class="card pad-lg" style="max-width:640px">
      <p class="muted" style="margin-top:0">Plan an upcoming <b>${esc(S.season)}</b> session: pick the date, set the focus and drills, and tick which stock videos to show the team beforehand. It appears on that session's row in the Schedule.</p>
      ${F("Which session?",`<select id="t-when">
        ${dates.map(iso=>`<option value="${iso}">${fdateLong(iso)}${planFor(iso)?" ✓ planned":""}</option>`).join("")}
        <option value="__other">Other date…</option>
      </select>`)}
      <div id="t-other-wrap" class="hidden">${F("Date",`<input type="date" id="t-other"/>`)}</div>
      <div id="t-fields"></div>
    </div>`;
    const whenSel = $("#t-when");
    whenSel.addEventListener("change", () => {
      const other = whenSel.value === "__other";
      $("#t-other-wrap").classList.toggle("hidden", other);
      fields(other ? "" : whenSel.value);
    });
    $("#t-other")?.addEventListener("change", e => fields(e.target.value));
    if (whenSel.value === "__other") $("#t-other-wrap").classList.remove("hidden");
    fields(dates[0] || "");
  }

  function AdmEvent() {
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      ${F("Title",`<input id="e-title" placeholder="e.g. Club Awards Afternoon"/>`)}
      <div class="grid cols-2">${F("Date",`<input type="date" id="e-date"/>`)}${F("Start time (optional)",`<input id="e-time" placeholder="e.g. 11:00"/>`)}</div>
      <div class="grid cols-2">${F("Location",`<input id="e-loc" placeholder="e.g. High Elms Golf Course"/>`)}${F("Icon",`<select id="e-img"><option value="trophy">🏆 Trophy</option><option value="target">🎯 Fundraiser</option><option value="flag">🏁 Day out</option><option value="cone">🔶 Training/camp</option></select>`)}</div>
      ${F("Link (optional)",`<input id="e-link" placeholder="https://..."/>`)}
      ${F("Details",`<textarea id="e-desc" rows="4" placeholder="What's happening, who's invited, what to bring..."></textarea>`)}
      <button class="btn btn-gold btn-block" id="e-save">Add event</button>
    </div>`;
    $("#e-save").addEventListener("click", async () => {
      const title=$("#e-title").value.trim(), date=$("#e-date").value;
      if(!title||!date) return toast("Add a title and a date");
      const res = await S.addEvent({ title, date, location:$("#e-loc").value.trim(), desc:$("#e-desc").value.trim(),
        time:$("#e-time").value.trim(), link:$("#e-link").value.trim(), img:$("#e-img").value });
      if(res.ok){ toast("Event added ✓"); location.hash="#events"; } else toast("Error: "+res.msg);
    });
  }

  /* ============================ MODAL + nav helpers ============================ */
  function wireGo(){ view.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>location.hash="#"+b.dataset.go)); }
  function openModal(title, bodyHtml, after) {
    $("#modal-root").innerHTML = `<div class="modal-bg" id="mbg"><div class="modal">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="x" id="mx">×</button></div>
      <div class="modal-body">${bodyHtml}</div></div></div>`;
    $("#mx").addEventListener("click", closeModal);
    $("#mbg").addEventListener("click", e => { if (e.target.id === "mbg") closeModal(); });
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", escClose);
    if (after) after();
  }
  function escClose(e){ if (e.key === "Escape") closeModal(); }
  function closeModal(){ $("#modal-root").innerHTML = ""; document.body.style.overflow = ""; document.removeEventListener("keydown", escClose); }

  boot();
})();
