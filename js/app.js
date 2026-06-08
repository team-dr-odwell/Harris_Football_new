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
    $("#season-pill").textContent = cfg.CURRENT_SEASON;
    await S.load();
    $("#nav-admin").classList.toggle("hidden", !S.isAdmin);
    if (!S.hasLinkedPlayer()) { showChildPicker(false); return; }
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

  function wireShell() {
    $("#logout-btn").addEventListener("click", async () => { await S.logout(); location.hash = "#home"; showGate(); });
    $("#myplayer-btn").addEventListener("click", () => showChildPicker(true));
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
        ${[...S.state.players].sort((a,b)=>a.number-b.number).map(p=>`
          <button class="card" data-pick="${p.id}" style="cursor:pointer;display:flex;gap:.8rem;align-items:center;text-align:left">
            <span class="club-badge us" style="flex:none">${esc(initials(p))}</span>
            <span><b>${esc(p.name)}</b><br><span class="muted" style="font-size:.82rem">#${p.number} · ${esc(p.pos)}</span></span>
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
    const top = [...S.state.players].sort((a,b)=>b.goals-a.goals)[0];

    view.innerHTML = `
      <section class="hero">
        <div class="hero-tag">${esc(cfg.TEAM_NAME)} · ${esc(cfg.AGE_GROUP)} · ${esc(cfg.CURRENT_SEASON)}</div>
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
        <div class="stat"><div class="n">${S.state.players.length}</div><div class="l">Squad size</div></div>
        <div class="stat"><div class="n">${top.goals}</div><div class="l">Top scorer (${esc(top.name.split(" ")[0])})</div></div>
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
      <div class="section-head"><div><div class="eyebrow">${esc(cfg.CURRENT_SEASON)} Season</div><h2>Fixtures</h2></div>
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
    const d = new Date(iso + "T00:00:00"); const out = [];
    (S.state.trainingSchedule || window.HARRIS_DATA.trainingSchedule || []).forEach(r => {
      if (d.getDay() === r.day && iso <= r.until) out.push({ kind:"training", key:"t"+iso, start:r.start, end:r.end, location:r.location, label:r.label || "Training" });
    });
    (S.state.training || []).forEach(t => { if (t.date === iso) out.push({ kind:"training", key:"t"+iso, start:t.start, end:t.end, location:t.location, label:t.focus || "Training", drills:t.drills }); });
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
    const drills = S.state.drills || [];
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Next 4 weeks</div><h2>Training Schedule</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Upcoming training sessions. Tap to tell us if ${esc(playerFirst())} is going — and whether they'll need a lift.</p>
      <div class="agenda" style="margin-top:1.2rem">
        ${rows.length ? rows.map(agendaRow).join("") : `<div class="card"><p class="muted" style="margin:0">No training in the next four weeks.</p></div>`}
      </div>
      ${drills.length ? `
        <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">Practise at home</div><h2>Training Drills</h2></div></div>
        <div class="grid cols-2">
          ${drills.map(dr => `<div class="card"><div class="ag-head" style="margin-bottom:.6rem">${dr.area?`<span class="tag t-train">${esc(dr.area)}</span>`:""}<b>${esc(dr.title)}</b></div>${videoEmbed(dr.url)}</div>`).join("")}
        </div>` : ""}`;
    wireRsvp();
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

  function Players(id) {
    if (id) return AcademyProfile(+id);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(cfg.CURRENT_SEASON)} Squad</div><h2>The Academy</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Every player has a card and an academy profile. Tap a card for season stats, development progress and their goals to achieve.</p>
      <div class="players-grid" style="margin-top:1.3rem">
        ${[...S.state.players].sort((a,b)=>a.number-b.number).map(fcCard).join("")}
      </div>`;
    view.querySelectorAll("[data-player]").forEach(c => c.addEventListener("click", () => location.hash = "#players/"+c.dataset.player));
  }

  function fcCard(p) {
    return `<div class="fc-card" data-player="${p.id}">${fcCardInner(p)}</div>`;
  }

  function AcademyProfile(id) {
    const p = S.player(id); if (!p) return Players();
    const stats = [["Goals",p.goals||0],["Assists",p.assists||0],["MOTM",p.motm||0],["Training",p.sessions||0],["Points",p.points||0]];
    const dev = p.dev || {}; const targets = p.targets || [];
    view.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-go="players" style="margin-bottom:1rem">← Academy</button>
      <div class="player-detail">
        <div><div class="fc-card" style="max-width:230px;margin:0 auto">${fcCardInner(p)}</div></div>
        <div>
          <div class="eyebrow" style="color:var(--gold)">${esc(p.pos)} · Squad #${p.number}${p.captain?' · Captain 🧢':''}</div>
          <h2 style="font-family:var(--display);font-size:2.2rem;margin:.1rem 0 1rem">${esc(p.name)}</h2>
          <div class="stat-strip" style="grid-template-columns:repeat(5,1fr)">
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

          <button class="btn btn-gold btn-sm" data-go="development" style="margin-top:1.2rem">My development plan &amp; videos →</button>
        </div>
      </div>`;
    wireGo();
  }

  /* ============================ DEVELOPMENT ============================ */
  function Development() {
    const p = S.player(S.me);
    if (!p) { view.innerHTML = `<div class="card pad-lg"><h2 style="font-family:var(--display)">Development</h2><p class="muted">Choose which player is yours from the top bar to see their development plan.</p></div>`; return; }
    const program = p.program || []; const videos = p.videos || [];
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(p.name)}</div><h2>My Development</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Your personal plan, videos the coaches have picked for you, and this week's quiz.</p>

      <div class="card pad-lg" style="margin-top:1.2rem">
        <h3 style="margin:0 0 .5rem;font-family:var(--display)">Personal development plan</h3>
        ${program.length?program.map((s,i)=>`<div class="program-step"><div class="dot">${i+1}</div><div>${esc(s)}</div></div>`).join("")
          :`<p class="muted" style="margin:0">Your coach will add your plan here soon.</p>`}
      </div>

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Picked for you</div><h2>My Videos</h2></div></div>
      ${videos.length?`<div class="grid cols-2">${videos.map(v=>`<div class="card"><b style="display:block;margin-bottom:.6rem">${esc(v.title||"Video")}</b>${videoEmbed(v.url)}</div>`).join("")}</div>`
        :`<div class="card"><p class="muted" style="margin:0">No videos yet — your coach will add some skills to work on.</p></div>`}

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">+${S.state.quiz.points} pts · test yourself</div><h2>Weekly Quiz</h2></div>
        ${S.state.quizScore!=null?`<span class="tag green">Last score ${S.state.quizScore}/${S.state.quiz.questions.length}</span>`:""}</div>
      <div class="card pad-lg"><div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div></div>`;
    wireGo();
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
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
              <div class="ach"><span class="em">🏋️</span><div>Training effort grade <span class="muted">each session</span></div></div>
              <div class="ach"><span class="em">✅</span><div>Match &amp; training attendance</div></div>
              <div class="ach"><span class="em">🧠</span><div>Weekly quiz score</div></div>
              <div class="ach"><span class="em">🤹</span><div>Fun home challenges</div></div>
              <div class="ach"><span class="em">🏅</span><div>Achievement badges <span class="muted">+10 each</span></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:1.4rem">
        <div class="card pad-lg" id="quiz-card">
          <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">+${S.state.quiz.points} pts</div><h2 style="font-size:1.5rem">${esc(S.state.quiz.title)}</h2></div>
            ${myScore!=null?`<span class="tag green">Last score ${myScore}/${S.state.quiz.questions.length}</span>`:""}</div>
          <div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div>
        </div>
        <div class="card pad-lg">
          <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">Earn extra points</div><h2 style="font-size:1.5rem">Fun Challenges</h2></div></div>
          ${S.state.exercises.map(x=>{
            const done = S.state.completedExercises.includes(x.id);
            return `<div class="ach" style="margin-bottom:.6rem;justify-content:space-between">
              <div style="display:flex;gap:.6rem;align-items:center"><span class="em">${x.icon}</span><div><b>${esc(x.name)}</b><br><span class="muted" style="font-size:.78rem">${esc(x.desc)}</span></div></div>
              <button class="btn ${done?'btn-ghost':'btn-dark'} btn-sm" data-ex="${x.id}" ${done?'disabled':''}>${done?'✓ Done':'+'+x.points}</button>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Unlock them all</div><h2>Badges</h2></div></div>
      <div class="card"><div class="badge-row">
        ${S.state.achievements.map(a=>`<div class="ach ${a.locked?'locked':''}"><span class="em">${a.emoji}</span><div><b>${esc(a.name)}</b><br><span class="muted" style="font-size:.74rem">${esc(a.desc)}</span></div></div>`).join("")}
      </div></div>`;

    view.querySelectorAll("[data-ex]").forEach(b => b.addEventListener("click", () => { S.completeExercise(+b.dataset.ex); League(); }));
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
  }

  function runQuiz() {
    const qz = S.state.quiz; let idx = 0, score = 0;
    const host = $("#quiz-host");
    function render() {
      if (idx >= qz.questions.length) {
        S.setQuizScore(score);
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
    const tabs = [["fixtures","Add fixture"],["result","Enter result"],["stats","Player stats"],["academy","Development"],["drills","Drill videos"],["players","Add player"],["training","Add training"],["events","Add event"]];
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Coaches only</div><h2>Admin Panel</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Manage everything from here — no spreadsheets. ${S.MODE==='preview'?'<b>Preview mode:</b> changes save to this browser so you can try it. Connect Supabase to save for everyone.':'Changes save to your database and appear for everyone straight away.'}</p>
      <div class="badge-row" style="margin:1rem 0 1.2rem">
        ${tabs.map(([k,l])=>`<button class="btn ${sub===k?'btn-gold':'btn-ghost'} btn-sm" data-atab="${k}">${l}</button>`).join("")}
      </div>
      <div id="admin-body"></div>`;
    view.querySelectorAll("[data-atab]").forEach(b => b.addEventListener("click", () => location.hash = "#admin/"+b.dataset.atab));
    ({ fixtures:AdmFixture, result:AdmResult, stats:AdmStats, academy:AdmAcademy, drills:AdmDrills, players:AdmPlayer, training:AdmTraining, events:AdmEvent }[sub] || AdmFixture)();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:linear-gradient(180deg,var(--gold-bright),var(--gold));color:#171205;font-weight:800;padding:.7rem 1.2rem;border-radius:999px;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,.4)";
    document.body.appendChild(t); setTimeout(()=>t.remove(), 2200);
  }
  const playerOpts = (sel) => S.state.players.map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>#${p.number} ${esc(p.name)}</option>`).join("");
  const F = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;

  function AdmFixture() {
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      ${F("Opponent",`<input id="f-opp" placeholder="e.g. Wallsend Boys Club"/>`)}
      <div class="grid cols-2">${F("Date",`<input type="date" id="f-date"/>`)}${F("Competition",`<select id="f-comp"><option>League</option><option>Cup</option><option>Friendly</option></select>`)}</div>
      <div class="grid cols-2">${F("Kick-off",`<input type="time" id="f-ko" value="10:00"/>`)}${F("Meet-up time",`<input type="time" id="f-meet" value="09:30"/>`)}</div>
      <div class="grid cols-2">${F("Home or away",`<select id="f-ha"><option value="H">Home</option><option value="A">Away</option></select>`)}${F("Kit",`<select id="f-kit"><option value="gold">Gold (home)</option><option value="black">Black (away)</option><option value="white">White (third)</option></select>`)}</div>
      ${F("Ground",`<input id="f-ground" placeholder="e.g. Harris Park, Pitch 3"/>`)}
      ${F("Full address (for maps)",`<input id="f-addr" placeholder="Street, Town, Postcode"/>`)}
      <button class="btn btn-gold btn-block" id="f-save">Add fixture</button>
    </div>`;
    $("#f-save").addEventListener("click", async () => {
      const opp = $("#f-opp").value.trim(), date = $("#f-date").value;
      if (!opp || !date) return toast("Add an opponent and a date");
      const res = await S.addFixture({ opponent:opp, date, kickoff:$("#f-ko").value, meetup:$("#f-meet").value,
        home_away:$("#f-ha").value, kit:$("#f-kit").value, competition:$("#f-comp").value,
        ground:$("#f-ground").value.trim(), address:$("#f-addr").value.trim() });
      if (res.ok) { toast("Fixture added ✓"); location.hash = "#fixtures/upcoming"; }
      else toast("Error: "+res.msg);
    });
  }

  function AdmResult() {
    const played = S.state.fixtures; // allow upcoming -> result, or edit past
    let goals = [{scorer:null,assist:null}];
    const body = $("#admin-body");
    function render() {
      body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
        ${F("Which fixture?",`<select id="r-fix">${played.map(f=>`<option value="${f.id}">${f.status==='past'?'✓ ':''}${fdate(f.date)} — vs ${esc(f.opponent)}</option>`).join("")}</select>`)}
        <div class="grid cols-2">${F("Our score",`<input type="number" min="0" id="r-us" value="0"/>`)}${F("Their score",`<input type="number" min="0" id="r-them" value="0"/>`)}</div>
        ${F("Man of the Match",`<select id="r-motm">${playerOpts()}</select>`)}
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">GOALSCORERS</div>
        <div id="goal-rows">${goals.map((g,i)=>goalRow(g,i)).join("")}</div>
        <button class="btn btn-dark btn-sm" id="add-goal" style="margin:.3rem 0 1rem">+ Add goal</button>
        <button class="btn btn-gold btn-block" id="r-save">Save result</button>
      </div>`;
      body.querySelector("#add-goal").addEventListener("click", () => { goals.push({scorer:null,assist:null}); render(); });
      body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{ goals.splice(+b.dataset.del,1); if(!goals.length)goals=[{scorer:null,assist:null}]; render(); }));
      body.querySelector("#r-save").addEventListener("click", saveIt);
    }
    function goalRow(g,i){ return `<div class="grid" style="grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem;align-items:end">
      ${F("Scorer",`<select data-g="scorer" data-i="${i}">${playerOpts(g.scorer)}</select>`)}
      ${F("Assist (optional)",`<select data-g="assist" data-i="${i}"><option value="">— none —</option>${playerOpts(g.assist)}</select>`)}
      <button class="btn btn-ghost btn-sm" data-del="${i}" style="min-height:44px">✕</button></div>`; }
    async function saveIt(){
      body.querySelectorAll("[data-g]").forEach(sel=>{ const i=+sel.dataset.i; goals[i][sel.dataset.g]= sel.value? +sel.value : null; });
      const res = await S.saveResult(+body.querySelector("#r-fix").value, {
        our_score:+body.querySelector("#r-us").value, their_score:+body.querySelector("#r-them").value,
        motm:+body.querySelector("#r-motm").value, goals:goals.filter(g=>g.scorer) });
      if (res.ok){ toast("Result saved ✓"); location.hash="#fixtures/past"; } else toast("Error: "+res.msg);
    }
    render();
  }

  function AdmStats() {
    const body = $("#admin-body");
    const num = (id,v)=>`<input type="number" min="0" id="${id}" value="${v}"/>`;
    function load(id) {
      const p = S.player(id); if (!p) return;
      body.querySelector("#st-fields").innerHTML = `
        <div class="grid cols-3">${F("Goals",num("st-goals",p.goals||0))}${F("Assists",num("st-assists",p.assists||0))}${F("Man of Match",num("st-motm",p.motm||0))}</div>
        <div class="grid cols-2">${F("Training sessions",num("st-sessions",p.sessions||0))}${F("League points",num("st-points",p.points||0))}</div>
        <button class="btn btn-gold btn-block" id="st-save">Save ${esc(p.name)}'s stats</button>`;
      body.querySelector("#st-save").addEventListener("click", async () => {
        const res = await S.updatePlayerStats(id, {
          goals:+$("#st-goals").value, assists:+$("#st-assists").value, motm:+$("#st-motm").value,
          sessions:+$("#st-sessions").value, points:+$("#st-points").value });
        if (res.ok) toast("Stats saved ✓"); else toast("Error: "+res.msg);
      });
    }
    const players = [...S.state.players].sort((a,b)=>a.number-b.number);
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Update each player's season stats — they show on their card, profile and the league table.</p>
      ${F("Player",`<select id="st-player">${players.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
      <div id="st-fields"></div>
    </div>`;
    body.querySelector("#st-player").addEventListener("change", e => load(+e.target.value));
    load(players[0].id);
  }

  function AdmAcademy() {
    const body = $("#admin-body");
    const players = [...S.state.players].sort((a,b)=>a.number-b.number);
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
      <p class="muted" style="margin-top:0">Set each player's development progress, targets, plan and personalised videos. Shown on their Academy profile and Development page.</p>
      ${F("Player",`<select id="ac-player">${players.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
      <div id="ac-fields"></div>
    </div>`;
    body.querySelector("#ac-player").addEventListener("change", e => load(+e.target.value));
    load(players[0].id);
  }

  function AdmDrills() {
    const body = $("#admin-body");
    const drills = S.state.drills || [];
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Add training-exercise videos (YouTube/Vimeo links) for the Schedule "Training Drills" library.</p>
      ${F("Title",`<input id="dr-title" placeholder="e.g. Cone dribbling warm-up"/>`)}
      <div class="grid cols-2">${F("Skill area",`<select id="dr-area"><option value="">—</option>${DEV_AREAS.map(([,l])=>`<option>${l}</option>`).join("")}</select>`)}${F("Video link",`<input id="dr-url" placeholder="https://youtu.be/..."/>`)}</div>
      <button class="btn btn-gold btn-block" id="dr-save">Add drill video</button>
      ${drills.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;margin:1rem 0 .4rem">CURRENT (${drills.length})</div>${drills.map(d=>`<div class="ach" style="margin-bottom:.4rem"><span class="em">🎬</span><div><b>${esc(d.title)}</b>${d.area?` <span class="tag">${esc(d.area)}</span>`:""}</div></div>`).join("")}`:""}
    </div>`;
    $("#dr-save").addEventListener("click", async () => {
      const title=$("#dr-title").value.trim(), url=$("#dr-url").value.trim();
      if(!title||!url) return toast("Add a title and a video link");
      const res = await S.addDrill({ title, area:$("#dr-area").value, url });
      if(res.ok){ toast("Drill added ✓"); Admin("drills"); } else toast("Error: "+res.msg);
    });
  }

  function AdmPlayer() {
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Add a new squad member. Set their stats afterwards on the <b>Player stats</b> tab.</p>
      ${F("Full name",`<input id="p-name" placeholder="e.g. Sam Kirby"/>`)}
      <div class="grid cols-2">${F("Squad number",`<input type="number" min="1" id="p-num"/>`)}${F("Position",`<select id="p-pos">${["GK","RB","LB","CB","CDM","CM","CAM","LM","RM","LW","RW","ST"].map(x=>`<option>${x}</option>`).join("")}</select>`)}</div>
      <label class="field" style="flex-direction:row;align-items:center;gap:.5rem"><input type="checkbox" id="p-capt" style="width:auto"/> <span style="margin:0">Team captain</span></label>
      <button class="btn btn-gold btn-block" id="p-save">Add player</button>
    </div>`;
    $("#p-save").addEventListener("click", async () => {
      const name=$("#p-name").value.trim(); if(!name) return toast("Add a name");
      const init=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const res = await S.addPlayer({ name, number:+$("#p-num").value, pos:$("#p-pos").value,
        captain:$("#p-capt").checked, init, goals:0, assists:0, motm:0, sessions:0, points:0 });
      if(res.ok){ toast("Player added ✓"); location.hash="#players"; } else toast("Error: "+res.msg);
    });
  }

  function AdmTraining() {
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      ${F("Date",`<input type="date" id="t-date"/>`)}
      <div class="grid cols-2">${F("Start",`<input type="time" id="t-start" value="18:00"/>`)}${F("End",`<input type="time" id="t-end" value="19:15"/>`)}</div>
      ${F("Location",`<input id="t-loc" placeholder="e.g. Harris Park 3G Cage"/>`)}
      ${F("Session focus",`<input id="t-focus" placeholder="e.g. Finishing & movement in the box"/>`)}
      ${F("Drills (one per line)",`<textarea id="t-drills" rows="4" placeholder="Rondo warm-up&#10;Crossing & finishing circuit&#10;Small-sided 4v4"></textarea>`)}
      <button class="btn btn-gold btn-block" id="t-save">Add training session</button>
    </div>`;
    $("#t-save").addEventListener("click", async () => {
      const focus=$("#t-focus").value.trim(), date=$("#t-date").value;
      if(!date||!focus) return toast("Add a date and a focus");
      const drills=$("#t-drills").value.split("\n").map(s=>s.trim()).filter(Boolean);
      const res = await S.addTraining({ date, start:$("#t-start").value, end:$("#t-end").value, location:$("#t-loc").value.trim(), focus, drills });
      if(res.ok){ toast("Session added ✓"); location.hash="#training"; } else toast("Error: "+res.msg);
    });
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
