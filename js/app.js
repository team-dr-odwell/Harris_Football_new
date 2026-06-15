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
  // ---- safe name helpers (a bad/empty record must never crash a render) ----
  const fullName = (p) => (p && typeof p.name === "string" && p.name.trim()) ? p.name.trim() : "Player";
  const firstNameOf = (p) => fullName(p).split(" ")[0];
  // Safeguarding: card-facing UI shows "First L." (first name + surname initial), never full surname.
  function safeName(p) {
    const parts = fullName(p).split(" ").filter(Boolean);
    if (parts.length <= 1) return parts[0] || "Player";
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
  const initials = (p) => (p && p.init) || fullName(p).split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  /* ============================ AUTH / SHELL ============================ */
  // A simple, themed loading state for boot + season switches (crest + "Loading…").
  function showLoading(msg) {
    if (!view) return;
    view.innerHTML = `<div class="loading-state">
      <img src="assets/crest.svg?v=2" alt="" class="loading-crest"/>
      <p>${esc(msg || "Loading…")}</p>
    </div>`;
  }

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
    showLoading("Loading the Academy…");
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
    if (ssel) ssel.addEventListener("change", e => {
      const id = e.target.value;
      showLoading("Loading " + id + " season…");
      // Defer so the loading state paints before the (synchronous) reprojection.
      setTimeout(() => { S.setSeason(id); updateMyPlayerChip(); route(); }, 0);
    });
    $("#hamburger").addEventListener("click", () => $("#nav").classList.toggle("open"));
    document.querySelectorAll("[data-route]").forEach(a =>
      a.addEventListener("click", () => { location.hash = "#" + a.dataset.route; $("#nav").classList.remove("open"); }));
    window.addEventListener("hashchange", route);
  }

  function updateMyPlayerChip() {
    const chip = $("#myplayer-btn");
    const p = S.hasLinkedPlayer() ? S.player(S.me) : null;
    if (p) { chip.textContent = "👤 " + firstNameOf(p) + (S.myChildren().length > 1 ? " ⇄" : ""); chip.classList.remove("hidden"); }
    else { chip.classList.add("hidden"); }
    // The Family tab is the parents' space — only show it once a child is linked.
    const fam = $("#nav-family"); if (fam) fam.classList.toggle("hidden", !S.hasLinkedPlayer());
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
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0 .3rem">YOUR CHILD / CHILDREN <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— tick everyone who's yours (twins / siblings too)</span></div>
        <div id="ob-kids" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.2rem .8rem">
          ${players.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.2rem"><input type="checkbox" class="ob-kid" value="${p.id}" ${linked===p.id?'checked':''} style="width:auto"/> <span style="margin:0">${esc(p.name)} <span class="muted">#${p.number}</span></span></label>`).join("")}
        </div>
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
      const playerIds = [...view.querySelectorAll(".ob-kid:checked")].map(c=>+c.value);
      if (!playerIds.length) { h.textContent = "Please tick at least one child."; h.classList.add("error"); return; }
      const res = await S.saveProfile({ parents, playerIds });
      if (res.ok) { updateMyPlayerChip(); location.hash = "#home"; route(); }
      else { h.textContent = "Error: " + res.msg; h.classList.add("error"); }
    });
  }

  function showChildPicker(changing) {
    $("#nav").classList.remove("open");
    updateMyPlayerChip();
    const hi = S.displayName ? esc(S.displayName.split(" ")[0]) : "there";
    const kids = S.myChildren();
    view.innerHTML = `
      <section class="hero" style="text-align:center">
        <div class="hero-tag">Hi ${hi} 👋</div>
        <h1>Your <span>children</span></h1>
        <p style="margin-inline:auto">Tick everyone who's yours — twins and siblings too. ${kids.length>1?"Tap a child to view the home page as them.":"You can change this anytime from the top bar."}</p>
      </section>
      ${kids.length>1 ? `
        <div class="section-head"><div><div class="eyebrow">Home page is showing</div><h2>Switch child</h2></div></div>
        <div class="players-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));margin-bottom:1.4rem">
          ${kids.map(p=>`<button class="card ${p.id===S.me?'active-kid':''}" data-pick="${p.id}" style="cursor:pointer;display:flex;gap:.8rem;align-items:center;text-align:left">
            <span class="club-badge us" style="flex:none">${esc(initials(p))}</span>
            <span><b style="display:block">${esc(p.name)}</b><span class="muted" style="font-size:.82rem">${p.id===S.me?'✓ Active':'Tap to view'}</span></span></button>`).join("")}
        </div>` : ""}
      <div class="card pad-lg" style="max-width:620px">
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:0 0 .5rem">MY CHILDREN</div>
        <div id="pick-kids" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.2rem .8rem">
          ${S.roster().sort((a,b)=>a.number-b.number).map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.2rem"><input type="checkbox" class="pick-kid" value="${p.id}" ${S.myKids.includes(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">${esc(p.name)} <span class="muted">#${p.number}</span></span></label>`).join("")}
        </div>
        <button class="btn btn-gold btn-block" id="pick-save" style="margin-top:1rem">Save my children</button>
        ${changing ? `<button class="btn btn-ghost btn-sm btn-block" data-go="home" style="margin-top:.5rem">← Cancel</button>` : ""}
      </div>`;
    view.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", async () => {
      await S.setMyPlayer(+b.dataset.pick); updateMyPlayerChip(); location.hash = "#home"; route();
    }));
    $("#pick-save").addEventListener("click", async () => {
      const ids = [...view.querySelectorAll(".pick-kid:checked")].map(c=>+c.value);
      if (!ids.length) return toast("Tick at least one child");
      await S.setMyKids(ids); updateMyPlayerChip(); location.hash = "#home"; route();
    });
    wireGo();
  }

  // Canonical view map (function declarations below are hoisted, so this is safe).
  // Information architecture: Home | Schedule | Squad | Academy | Family | About (+ Admin).
  //   schedule  -> one page with Matches / Training / Events tabs
  //   academy   -> the signed-in child's development WORK (League() renders it)
  const VIEWS = { home:Home, schedule:Schedule, about:About,
                  fixtures:Fixtures, training:TrainingView, events:Events,
                  players:Players, development:Development, league:League, academy:League,
                  family:Family, admin:Admin };
  // Old hashes kept alive so existing WhatsApp / shared links never break.
  // Everything time-based now lives under #schedule; league/development map to their pages.
  const ROUTE_ALIASES = {
    fixtures: "schedule", matches: "schedule", results: "schedule",
    training: "schedule", events: "schedule",
    squad: "players",
    league: "academy", development: "academy",
    parents: "family", home_team: "family"
  };
  // Maps a canonical view key to the top-nav item that should appear "active".
  const NAV_OF = {
    schedule:"schedule", fixtures:"schedule", training:"schedule", events:"schedule",
    players:"players", squad:"players", development:"academy",
    league:"academy", academy:"academy",
    family:"family", about:"about", home:"home", admin:"admin"
  };
  function route() {
    let parts = (location.hash.replace("#", "") || "home").split("/");
    let key = parts[0];
    // Resolve aliases to a canonical destination, EXCEPT where the alias key still
    // owns its own view function (fixtures/training/events render Schedule sub-tabs).
    if (ROUTE_ALIASES[key] && !VIEWS[key]) key = ROUTE_ALIASES[key];
    // Which top-nav item lights up for this route.
    const navMatch = NAV_OF[parts[0]] || NAV_OF[key] || key;
    document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.route === navMatch));
    updateMyPlayerChip();
    window.scrollTo(0, 0);
    const fn = VIEWS[key] || Home;
    // ---- ERROR BOUNDARY ----
    // A single bad record (e.g. a player with a missing name) must never freeze
    // the page. Catch any render error, show a friendly fallback, log for coaches.
    try {
      fn(parts[1], parts[2]);
    } catch (err) {
      console.error("View render failed for #" + (location.hash || "") , err);
      renderViewError(err);
    }
  }
  // Re-render whatever view is currently on screen (used after an action like
  // ticking homework/chores or finishing the quiz). Fixes the old bug where these
  // always re-rendered the Academy/League page even when invoked from Family.
  function rerenderCurrent() { route(); }
  function renderViewError(err) {
    try {
      view.innerHTML = `
        <div class="card pad-lg" style="max-width:560px;margin:2rem auto;text-align:center">
          <div style="font-size:2.4rem">⚽</div>
          <h2 style="font-family:var(--display);margin:.4rem 0 .2rem">Oops — that didn't load</h2>
          <p class="muted">Something went wrong showing this page. It's not your fault! Try going back to the home page.</p>
          <button class="btn btn-gold" onclick="location.hash='#home'">← Back to home</button>
        </div>`;
    } catch (e) { /* last-resort: leave whatever is on screen */ }
  }

  /* ============================ HOME ============================ */
  function videoThumb(v, href, external) {
    const id = ytId(v.url);
    const bg = id ? `background-image:url('https://img.youtube.com/vi/${id}/hqdefault.jpg')` : "";
    return `<a class="vthumb" href="${esc(href)}"${external?' target="_blank" rel="noopener"':''}>
      <span class="vthumb-img" style="${bg}"><span class="vthumb-play">▶</span></span>
      <span class="vthumb-t">${esc(v.title || "Video")}</span></a>`;
  }

  function Home() {
    const me = S.hasLinkedPlayer() ? S.player(S.me) : null;
    const past = S.fixtures("past");
    const W = past.filter(f=>f.result==="W").length, D = past.filter(f=>f.result==="D").length, L = past.filter(f=>f.result==="L").length;
    const goals = past.reduce((n,f)=>n+(f.our_score||0),0);
    const ros = S.roster();
    const top = [...ros].sort((a,b)=>(b.goals||0)-(a.goals||0))[0];
    const next = S.fixtures("upcoming")[0];

    // Build interactive agenda items for the next fixture + next training
    const nextFixIt = next ? { kind:"match", key:"m"+next.id, dateObj:new Date(next.date+"T00:00:00"),
      start:next.kickoff, meetup:next.meetup, title:"vs "+next.opponent, location:next.ground,
      competition:next.competition, homeAway:next.home_away } : null;
    const nt = nextTraining();
    const nextTrainIt = nt ? { ...nt, dateObj:new Date(nt.date+"T00:00:00") } : null;
    const emptyCard = msg => `<div class="card"><p class="muted" style="margin:0">${msg}</p></div>`;

    // 5th stat: the child's own Academy Points (personal); for admins, the squad total.
    const fifth = me ? { n: me.points||0, l:"My Academy Points" }
                     : { n: ros.reduce((n,p)=>n+(p.points||0),0), l:"Squad AP" };

    const myVids = me ? S.videosForPlayer(me.id).filter(v=>v.url).slice(0,2) : [];
    const teamVids = S.teamVideos().filter(d=>d.url).slice(0,2);
    const firstName = me ? esc(firstNameOf(me)) : "";
    const honours = (cfg.SEASON_HONOURS || {})[S.season] || [];

    view.innerHTML = `
      ${me ? `
      <section class="hero hero-personal">
        <div class="hero-tag">OWFC Harris · ${esc(S.season)}</div>
        <h1>Welcome back, <span>${firstName}</span>! 👋</h1>
        <p class="hero-sub">#${me.number} · ${esc(me.pos)}${me.captain?' · Captain 🧢':''} — you've earned <b>${me.points||0}</b> points this season. Keep climbing! 🚀</p>
        <div class="hero-actions"><button class="btn btn-gold btn-sm" data-go="players/${me.id}">My player card →</button></div>
      </section>
      ` : `
      <section class="hero">
        <div class="hero-tag">${esc(cfg.TEAM_NAME)} · ${esc(S.ageGroup())} · ${esc(S.season)}</div>
        <h1>Welcome to the <span>Academy</span></h1>
        <p>Fixtures, training, player cards and progress — all in one place.</p>
        ${S.isAdmin?`<div class="hero-actions"><button class="btn btn-gold" data-go="admin">⚙ Admin</button><button class="btn btn-ghost" data-go="players">Player cards</button></div>`:""}
      </section>`}

      <div class="section-head" style="margin-top:1.4rem"><div><div class="eyebrow">Next up</div><h2>${me?`Is ${firstName} playing?`:"Coming up"}</h2></div></div>
      <div class="agenda">
        ${me
          ? `${nextFixIt?agendaRow(nextFixIt):emptyCard("No fixtures just yet — check back soon!")}
             ${nextTrainIt?agendaRow(nextTrainIt):emptyCard("No training booked in yet — watch this space!")}`
          : `<div class="card pad-lg">${next?fixtureMini(next):`<p class="muted" style="margin:0">No fixtures just yet.</p>`}<button class="btn btn-dark btn-sm" data-go="schedule/matches" style="margin-top:1rem">All fixtures</button></div>
             <div class="card pad-lg">${trainingMini(nt)}<button class="btn btn-dark btn-sm" data-go="schedule/training" style="margin-top:1rem">Schedule</button></div>`}
      </div>

      <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">${me?"My season":esc(S.season)+" season"}</div><h2>The numbers</h2></div></div>
      <div class="stat-strip">
        <div class="stat" title="Won · Drawn · Lost"><div class="n">${W}-${D}-${L}</div><div class="l">Won · Drawn · Lost</div></div>
        <div class="stat"><div class="n">${goals}</div><div class="l">Goals scored</div></div>
        <div class="stat"><div class="n">${ros.length}</div><div class="l">Squad size</div></div>
        <div class="stat"><div class="n">${top?top.goals:0}</div><div class="l">Top scorer${top?` (${esc(firstNameOf(top))})`:""}</div></div>
        <div class="stat stat-link" data-go="academy"><div class="n">${fifth.n}</div><div class="l">${fifth.l} →</div></div>
      </div>

      ${honours.length ? `
      <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">${esc(S.season)} · Trophy cabinet</div><h2>Club Honours</h2></div></div>
      <div class="honours">
        ${honours.map(hn=>`<div class="honour ${hn.win?'honour-win':''}"><div class="honour-ic">${hn.icon||"🏅"}</div><div><b>${esc(hn.comp)}</b><div class="muted" style="font-size:.84rem">${esc(hn.result)}</div></div></div>`).join("")}
      </div>` : ""}

      ${me && myVids.length ? `
      <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">Picked just for ${firstName}</div><h2>My Development</h2></div>
        <button class="btn btn-ghost btn-sm" data-go="development/${me.id}">My plan →</button></div>
      <p class="muted" style="margin-top:-.6rem;font-size:.86rem">Videos your coach chose for <b>you</b> — tap one, watch it to the end and earn points! 🎬</p>
      <div class="home-vids">${myVids.map(v=>videoThumb(v, "#development/"+me.id, false)).join("")}</div>` : ""}

      ${teamVids.length ? `
      <div class="section-head" style="margin-top:1.8rem"><div><div class="eyebrow">For the whole squad</div><h2>Team Training Videos</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;font-size:.86rem">Drills for everyone to practise at home — not personal homework.</p>
      <div class="home-vids">${teamVids.map(v=>videoThumb(v, v.url, true)).join("")}</div>` : ""}
    `;
    wireRsvp(); wireGo();
  }

  function fixtureMini(f) {
    if (!f) return `<p class="muted" style="margin:0">No fixtures just yet.</p>`;
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
  // NOTE (§11 safeguard): there is deliberately NO absolute squad leaderboard
  // anywhere kid-facing. The only ranked list is Mover of the Month (League()).
  // A previous leaguePreview()/S.leagueRows() helper that ranked players by total
  // AP was removed — an absolute ranking must never reappear on a child screen.

  /* ============================ MATCHES (fixtures + results) ============================ */
  // Sub-nav for the Matches tab inside Schedule: Upcoming vs Results.
  function matchesTabs(active) {
    return `<div class="badge-row" style="margin-bottom:1rem">
      <button class="btn ${active==='upcoming'?'btn-gold':'btn-ghost'} btn-sm" data-tab="upcoming">Upcoming</button>
      <button class="btn ${active==='past'?'btn-gold':'btn-ghost'} btn-sm" data-tab="past">Results</button>
    </div>`;
  }
  // Legacy entry points — funnel into the Schedule page on the right tab.
  // #fixtures/past (and #results) land on Matches → Results, fixing the old
  // bug where results links opened on Upcoming.
  function Fixtures(tab) { Schedule("matches", tab); }
  function Events() { Schedule("events"); }

  // Render the Matches section body into a container (used by the Schedule page).
  function renderMatchesInto(el, tab) {
    tab = (tab === "past" || tab === "upcoming") ? tab : "upcoming";
    const list = S.fixtures(tab);
    const tabsBar = matchesTabs(tab);
    if (tab === "past") {
      el.innerHTML = `${tabsBar}${resultsFormStrip(list)}${resultsGrouped(list)}`;
    } else {
      el.innerHTML = `${tabsBar}${list.length
        ? `<div class="grid cols-2">${list.map(upcomingCard).join("")}</div>`
        : emptyState("⚽", "No matches booked in yet",
            "As soon as the next fixture is set, it'll appear here with kick-off, meet time and the ground.",
            S.isAdmin ? { label:"Add a fixture", go:"admin/fixtures" } : { label:"See past results", go:"schedule/matches/past" })}`;
    }
    el.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => location.hash = "#schedule/matches/"+b.dataset.tab));
    wireRsvp(); wireMedia(); wireGo();
  }

  // Top-of-results W/D/L form strip (computed live, not stored — handles draws).
  function resultsFormStrip(list) {
    const played = list.filter(f => f.our_score != null && f.their_score != null);
    if (!played.length) return "";
    const W = played.filter(f=>f.result==="W").length, D = played.filter(f=>f.result==="D").length, L = played.filter(f=>f.result==="L").length;
    const gf = played.reduce((n,f)=>n+(f.our_score||0),0), ga = played.reduce((n,f)=>n+(f.their_score||0),0);
    // Recent form, newest last → show last 6 oldest→newest left-to-right.
    const recent = [...played].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(-6);
    const dot = r => `<span class="form-dot form-${r==='W'?'w':r==='L'?'l':'d'}" title="${r==='W'?'Win':r==='L'?'Loss':'Draw'}">${r}</span>`;
    return `<div class="card form-strip">
      <div class="form-stat"><div class="n">${W}</div><div class="l">Won</div></div>
      <div class="form-stat"><div class="n">${D}</div><div class="l">Drawn</div></div>
      <div class="form-stat"><div class="n">${L}</div><div class="l">Lost</div></div>
      <div class="form-stat"><div class="n">${gf}-${ga}</div><div class="l">Goals for–against</div></div>
      <div class="form-recent"><span class="form-recent-l">Recent form</span><span class="form-dots">${recent.map(f=>dot(f.result)).join("")}</span></div>
    </div>`;
  }

  // Group results by month, newest month first; within a month newest first.
  function resultsGrouped(list) {
    if (!list.length) return emptyState("📋", "No results to show yet",
      "Once we've played a match, the score, scorers and Player of the Match land here.",
      S.isAdmin ? { label:"Enter a result", go:"admin/result" } : { label:"See upcoming matches", go:"schedule/matches/upcoming" });
    const byMonth = {};
    [...list].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach(f => {
      const d = new Date((f.date||"") + "T00:00:00");
      const key = isNaN(d) ? "Other" : `${MON[d.getMonth()]} ${d.getFullYear()}`;
      (byMonth[key] ||= []).push(f);
    });
    return Object.entries(byMonth).map(([month, fixtures]) => `
      <div class="results-month">
        <div class="results-month-head">${esc(month)} <span class="muted">· ${fixtures.length} ${fixtures.length===1?"match":"matches"}</span></div>
        <div class="grid cols-1">${fixtures.map(resultCard).join("")}</div>
      </div>`).join("");
  }

  function upcomingCard(f) {
    const key = "m" + f.id;
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
      ${rsvpControls(key)}
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
        return `<div class="goal-row"><span class="ball">⚽</span><b>${esc(sc?safeName(sc):'')}</b>${as?`<span class="muted">— assist ${esc(safeName(as))}</span>`:''}</div>`;
      }).join("")}</div>`:""}
      ${motm?`<div class="motm"><span class="star">⭐</span><div><b>Player of the Match</b><br><span class="muted">${esc(safeName(motm))} · #${motm.number}</span></div></div>`:""}
      ${(()=>{ const media = S.mediaFor(f.id);
        // Collapse the photo slot unless media exists; coaches still get an "Add" affordance.
        if (!media.length && !S.isAdmin) return "";
        return `<div>
          <div class="lbl" style="font-size:.78rem;color:var(--muted);font-weight:700;margin-bottom:.5rem">PHOTOS &amp; VIDEOS</div>
          <div class="gallery" data-media="${f.id}">
            ${media.map(m=>mediaTile(m)).join("")}
            ${S.isAdmin?`<div class="ph add" data-add="${f.id}"><div><div class="ic">＋</div>Add</div></div>`:""}
          </div>
        </div>`; })()}
    </div>`;
  }

  // Friendly empty-state block with an optional next action (used across all lists).
  function emptyState(emoji, title, body, action) {
    return `<div class="card empty-state">
      <div class="empty-ic">${emoji}</div>
      <h3>${esc(title)}</h3>
      <p class="muted">${esc(body)}</p>
      ${action?`<button class="btn btn-gold btn-sm" data-go="${esc(action.go)}">${esc(action.label)}</button>`:""}
    </div>`;
  }

  function mediaTile(m) {
    return `<div class="ph"><div><div class="ic">${m.type==="video"?"▶":"📷"}</div>${esc(m.caption||m.type)}</div></div>`;
  }

  function playerFirst() {
    const p = S.hasLinkedPlayer() ? S.player(S.me) : null;
    return p ? firstNameOf(p) : "your child";
  }
  function rsvpLabel(key) {
    const c = S.rsvpCount(key);
    return `${c.going} going${c.lifts ? ` · ${c.lifts} need a lift` : ""}`;
  }
  function attendButtons(key, pid) {
    const st = (S.state.attendance[key] || {})[pid];
    return `<button class="att-btn yes ${st==='yes'?'on':''}" data-key="${key}" data-player="${pid}" data-s="yes">✓ Going</button>
      <button class="att-btn lift ${st==='lift'?'on':''}" data-key="${key}" data-player="${pid}" data-s="lift">🚗 Lift</button>
      <button class="att-btn no ${st==='no'?'on':''}" data-key="${key}" data-player="${pid}" data-s="no">✕ Can't</button>`;
  }
  // RSVP control: one row for a single child, or a row per child (+ "all going") for siblings/twins.
  // Coaches/admins don't RSVP as a player — they see the attendance count + a link to the roster.
  function rsvpControls(key) {
    if (S.isAdmin && !S.hasLinkedPlayer()) {
      return `<div class="ag-rsvp attend coach-rsvp">
        <span class="lbl">Coach view</span>
        <span class="att-count" data-key="${key}">${rsvpLabel(key)}</span>
        <a class="btn btn-ghost btn-sm" href="#admin/attendance">See who's coming →</a>
      </div>`;
    }
    const kids = S.myChildren();
    if (kids.length <= 1) {
      const only = kids[0] || S.player(S.me);
      // No child linked yet (and not admin) — prompt to pick, don't guess a name.
      if (!only) {
        return `<div class="ag-rsvp attend">
          <span class="lbl">Tell us if your child is coming</span>
          <a class="btn btn-gold btn-sm" href="#home" data-go-pick>Choose your child →</a>
        </div>`;
      }
      return `<div class="ag-rsvp attend" data-rsvp-group>
        <span class="lbl">Will ${esc(firstNameOf(only))} be there?</span>
        <div class="ag-btns">${attendButtons(key, only.id)}</div>
        <span class="att-count" data-key="${key}">${rsvpLabel(key)}</span>
      </div>`;
    }
    return `<div class="rsvp-multi">
      ${kids.map(k=>`<div class="rsvp-row" data-rsvp-group><span class="rsvp-name">${esc(firstNameOf(k))}</span><div class="ag-btns">${attendButtons(key, k.id)}</div></div>`).join("")}
      <div class="rsvp-foot"><button class="btn btn-ghost btn-sm" data-rsvp-all="${key}">✓ All going</button><span class="att-count" data-key="${key}">${rsvpLabel(key)}</span></div>
    </div>`;
  }
  function wireRsvp() {
    view.querySelectorAll("[data-go-pick]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); showChildPicker(true); }));
    view.querySelectorAll(".att-btn[data-key]").forEach(btn => btn.addEventListener("click", async () => {
      const key = btn.dataset.key, pid = +btn.dataset.player, status = btn.dataset.s;
      const current = (S.state.attendance[key] || {})[pid];
      const next = current === status ? null : status;
      await S.setAttendance(key, pid, next);
      const group = btn.closest("[data-rsvp-group]");
      group.querySelectorAll(".att-btn").forEach(b => b.classList.toggle("on", b.dataset.s === next));
      view.querySelectorAll(`.att-count[data-key="${key}"]`).forEach(c => c.textContent = rsvpLabel(key));
    }));
    view.querySelectorAll("[data-rsvp-all]").forEach(btn => btn.addEventListener("click", async () => {
      const key = btn.dataset.rsvpAll;
      await S.setAttendanceAll(key, "yes");
      const multi = btn.closest(".rsvp-multi");
      multi.querySelectorAll("[data-rsvp-group]").forEach(g => g.querySelectorAll(".att-btn").forEach(b => b.classList.toggle("on", b.dataset.s === "yes")));
      view.querySelectorAll(`.att-count[data-key="${key}"]`).forEach(c => c.textContent = rsvpLabel(key));
    }));
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

  // Legacy entry point — funnel into the Schedule page on the Training tab.
  function TrainingView() { Schedule("training"); }

  // Render the Training section body into a container (used by the Schedule page).
  function renderTrainingInto(el) {
    const rows = buildAgenda(["training"], 28);
    el.innerHTML = `
      <div class="section-head" style="margin-top:0"><div><div class="eyebrow">Next 4 weeks</div><h3 style="font-family:var(--display);font-size:1.5rem;margin:0">Training sessions</h3></div>
        <a class="btn btn-ghost btn-sm" href="${weekShareUrl()}" target="_blank" rel="noopener">💬 Share week to WhatsApp</a></div>
      <p class="muted" style="margin-top:.2rem;max-width:64ch">Upcoming training sessions, with the drills we'll be working on. ${S.isAdmin&&!S.hasLinkedPlayer()?"Each session shows how many players have replied — open Admin → Attendance for the full roster.":`Tap to tell us if ${esc(playerFirst())} is going — and whether they'll need a lift.`}</p>
      <div class="agenda" style="margin-top:1.2rem">
        ${rows.length ? rows.map(agendaRow).join("") : emptyState("🏃","No training booked in the next four weeks","Sessions appear here as soon as they're scheduled — with the drills and any videos to watch first.", S.isAdmin?{label:"Plan a session",go:"admin/training"}:null)}
      </div>`;
    wireRsvp(); wireGo();
  }

  /* ============================ SCHEDULE (Matches · Training · Events) ============================ */
  // One page that ties together everything time-based. The tab strip swaps between
  // the Matches view (with its own Upcoming/Results sub-tabs), Training and Events.
  // Deep links supported: #schedule, #schedule/matches[/upcoming|/past], #schedule/training,
  // #schedule/events — plus the legacy #fixtures, #training, #events, #results, #fixtures/past.
  function Schedule(tab, sub) {
    // Normalise: which big tab + (for Matches) which sub-tab.
    // Callers: Schedule(tab, sub) from the router (#schedule/<tab>/<sub>);
    //          Fixtures(t) -> Schedule("matches", t); Events() -> Schedule("events").
    const hashKey = (location.hash.replace("#","").split("/"))[0];
    let bigTab = tab, matchSub = sub;
    if (hashKey === "training") { bigTab = "training"; }
    else if (hashKey === "events") { bigTab = "events"; }
    // Legacy #fixtures/<sub> and #results both land on Matches; #results forces Results.
    else if (hashKey === "fixtures") { bigTab = "matches"; matchSub = sub; }
    else if (hashKey === "results") { bigTab = "matches"; matchSub = "past"; }
    else if (hashKey === "matches") { bigTab = "matches"; }
    if (!bigTab || !["matches","training","events"].includes(bigTab)) bigTab = "matches";

    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} Season</div><h2>Schedule</h2></div></div>
      <div class="sched-tabs badge-row" style="margin:-.2rem 0 1.1rem">
        <button class="btn ${bigTab==='matches'?'btn-gold':'btn-ghost'} btn-sm" data-sched="matches">Matches</button>
        <button class="btn ${bigTab==='training'?'btn-gold':'btn-ghost'} btn-sm" data-sched="training">Training</button>
        <button class="btn ${bigTab==='events'?'btn-gold':'btn-ghost'} btn-sm" data-sched="events">Events</button>
      </div>
      <div id="sched-body"></div>`;
    view.querySelectorAll("[data-sched]").forEach(b => b.addEventListener("click", () => {
      location.hash = "#schedule/" + b.dataset.sched;
    }));
    // Each section renders into #view (they fully replace innerHTML) — so we render
    // the tab strip, then call the section, which rewrites the page with its own
    // content. To keep the strip we instead render the section into #sched-body.
    if (bigTab === "matches") renderMatchesInto($("#sched-body"), matchSub);
    else if (bigTab === "training") renderTrainingInto($("#sched-body"));
    else renderEventsInto($("#sched-body"));
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
      ${videos.length ? `<div class="drill-vids">${videos.map(v=>`<div class="drill-vid"><b>${esc(v.title||"Drill")}</b>${v.area?` <span class="tag t-train">${esc(v.area)}</span>`:""}${v.description?`<div class="muted" style="font-size:.8rem;margin:.2rem 0 .4rem">${esc(v.description)}</div>`:""}${videoEmbed(v.url)}</div>`).join("")}</div>` : ""}
    </div>`;
  }

  function agendaRow(it) {
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
      ${rsvpControls(it.key)}
    </div>`;
  }

  /* ============================ EVENTS (rows) ============================ */
  // Render the Events section body into a container (used by the Schedule page).
  function renderEventsInto(el) {
    const rows = buildAgenda(["event"], 220);
    el.innerHTML = `
      <div class="section-head" style="margin-top:0"><div><div class="eyebrow">Beyond the pitch</div><h3 style="font-family:var(--display);font-size:1.5rem;margin:0">Events</h3></div></div>
      <p class="muted" style="margin-top:.2rem;max-width:62ch">Fundraisers, days out and celebrations. ${S.isAdmin&&!S.hasLinkedPlayer()?"Open Admin → Attendance to see who's replied.":`Tap to let us know if ${esc(playerFirst())} is coming.`}</p>
      <div class="agenda" style="margin-top:1.2rem">
        ${rows.length ? rows.map(agendaRow).join("") : emptyState("🎉","No events coming up just yet","When there's a tournament, fundraiser or day out, it'll show here with a tap-to-let-us-know.", S.isAdmin?{label:"Add an event",go:"admin/events"}:null)}
      </div>`;
    wireRsvp(); wireGo();
  }

  /* ============================ ABOUT ============================ */
  // PLACEHOLDER page — real wording to be supplied by the club. Uses existing
  // card/section classes so the later reskin flows straight through.
  function About() {
    const sec = (eyebrow, title, body) => `
      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">${esc(eyebrow)}</div><h2 style="font-size:1.5rem">${esc(title)}</h2></div></div>
      <div class="card pad-lg">${body}</div>`;
    view.innerHTML = `
      <section class="hero">
        <div class="hero-tag">${esc(cfg.TEAM_NAME)} · ${esc(S.ageGroup())}</div>
        <h1>About <span>our team</span></h1>
        <p>Who we are, how we play, and how we keep everyone safe and having fun.</p>
      </section>
      <div class="card pad-lg" style="margin-top:1.2rem">
        <p style="margin:0">We're <b>${esc(cfg.TEAM_NAME)} ${esc(S.ageGroup())}</b>, a friendly grassroots team for boys and girls in south-east England. We train hard, play fair and, above all, we love the game. At this age it's about getting better, making friends and enjoying every match — <b>development over winning</b>. If our players finish the season more confident, more skilful and still buzzing to play, we've done our job.</p>
        <p style="margin:.7rem 0 0"><b>For our players:</b> football should be fun. You'll learn loads, you'll make mistakes — everyone does, that's how you improve — and your coaches and teammates have got your back. Try your best, be a good teammate, and enjoy it. ⚽</p>
      </div>
      ${sec("Where we play","Our league — the Tandridge League", `
        <p style="margin:0">We play in the <b>Tandridge Youth Football League</b>, an England Football accredited Sunday league based in Surrey that runs football for boys and girls from Under-7 to Under-18.</p>
        <p style="margin:.7rem 0 0">It's organised by age and format: at our age we play <b>7-a-side mini-soccer</b>, before the squad moves up to 9-a-side and then 11-a-side as the players get older. The season runs from September to May, with home and away fixtures most Sundays. At mini-soccer age the league doesn't publish results or tables — and that's the point: it keeps everyone focused on learning and enjoying the game, not the scoreboard.</p>`)}
      ${sec("The rules","How we play — FA mini-soccer rules", `
        <p style="margin:0 0 .5rem">At our age we follow The FA's mini-soccer format, designed to fit young players:</p>
        <ul style="margin:0;padding-left:1.1rem;line-height:1.65">
          <li><b>7 v 7</b> — seven players a side including the goalkeeper, on a small pitch.</li>
          <li><b>Size 4 ball</b> — the right size and weight for this age.</li>
          <li><b>The retreat line</b> — when our keeper has the ball or at goal kicks, the other team drops back to the retreat line, so our players get time and space to play out instead of booting it long.</li>
          <li><b>No deliberate heading</b> — heading is taken out of the game at this age to protect young players; a deliberate header gives the other team a free kick.</li>
          <li><b>No league tables</b> — at mini-soccer age results and tables aren't published; we play to enjoy it and to get better.</li>
          <li><b>Fair game time</b> — every player gets a meaningful share of every match, with roll-on, roll-off subs so everyone starts, comes on and tries different positions.</li>
        </ul>`)}
      ${sec("Respect","Codes of conduct", `
        <p style="margin:0 0 .6rem">We follow The FA's Respect programme — enjoy the game, give respect, be inclusive, work together and play safe.</p>
        <div class="grid cols-2" style="gap:1rem;align-items:start">
          <div><b>Players</b><ul style="margin:.3rem 0 0;padding-left:1.1rem;line-height:1.55"><li>Play fair and try your best.</li><li>Never argue with the referee.</li><li>Support your teammates, win or lose.</li><li>Shake hands and say "well played".</li></ul></div>
          <div><b>Parents &amp; spectators</b><ul style="margin:.3rem 0 0;padding-left:1.1rem;line-height:1.55"><li>Cheer effort, not just goals.</li><li>Let the coaches coach and the referee referee.</li><li>Stay behind the spectator line.</li><li>Never criticise players, officials or other parents.</li></ul></div>
          <div><b>Coaches</b><ul style="margin:.3rem 0 0;padding-left:1.1rem;line-height:1.55"><li>Put the children's wellbeing and enjoyment first.</li><li>Give every player a fair chance to play.</li><li>Set a positive example to all.</li><li>Hold the right FA qualifications, DBS check and safeguarding training.</li></ul></div>
        </div>`)}
      ${sec("Safeguarding","Keeping children safe", `
        <p style="margin:0">The safety and welfare of every child comes first. Like all FA-affiliated youth teams we have safeguarding policies in place, and anyone working with the children holds an up-to-date FA-accepted DBS check and safeguarding training. On this site, children's full surnames are never shown on player cards. If you ever have a worry about a child's welfare, please speak to our coaches or Club Welfare Officer straight away.</p>`)}
      <div style="margin-top:1.4rem"><button class="btn btn-gold btn-sm" data-go="home">← Back to home</button></div>`;
    wireGo();
  }

  /* ============================ ACADEMY ============================ */
  const DEV_AREAS = [["passing","Passing"],["shooting","Shooting"],["dribbling","Dribbling"],["defending","Defending"],["fitness","Fitness"],["teamwork","Teamwork"]];
  const DEF_POS = ["GK","CB","LB","RB","RWB","LWB","CDM"];

  // Season stats line for a player (goals / assists / Player of the Match / appearances).
  // Abbreviations are spelled out where first used per page (see playerStats()).
  function seasonStatRow(p) {
    return [
      ["Goals", p.goals||0],
      ["Assists", p.assists||0],
      ["Player of the Match", p.motm||0],
      ["Appearances", S.appearances(p.id)]
    ];
  }
  // A compact stats strip; firstUse=true spells the abbreviations out for the page.
  function statsStrip(rows) {
    return `<div class="stat-strip" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr))">
      ${rows.map(([k,v])=>`<div class="stat"><div class="n">${v}</div><div class="l">${esc(k)}</div></div>`).join("")}</div>`;
  }
  // Earned badges block for a player (read-only, used on Squad + profile).
  function badgesBlock(p, heading) {
    const earned = S.earnedAchievements(p.id);
    const all = S.state.achievements || [];
    return `<div class="section-head" style="margin-top:1.4rem"><div><div class="eyebrow">${esc(heading||"Earned along the way")}</div><h2 style="font-size:1.5rem">Badges</h2></div></div>
      <div class="card"><div class="badge-row">
        ${all.map(a=>{const got=earned.includes(a.key);return `<div class="ach ${got?'':'locked'}"><span class="em">${a.emoji}</span><div><b>${esc(a.name)}</b>${got?' <span class="tag green">Earned</span>':''}<br><span class="muted" style="font-size:.74rem">${esc(a.desc)}</span></div></div>`;}).join("")}
      </div></div>`;
  }
  // Mover of the Month card (the ONLY ranked list, §11) — reusable across pages.
  function moverCard() {
    const mover = S.moverOfMonth(S.monthId());
    return `<div class="card pad-lg">
      <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">This month · the only ranking</div><h2 style="font-size:1.5rem">Mover of the Month</h2></div></div>
      <p class="muted" style="margin:0 0 .8rem;font-size:.86rem">Most Academy Points (AP) <b>gained this month</b> — not who has the most overall. Everyone starts level on the 1st.</p>
      ${mover.rows.filter(r=>r.gain>0).length ? `<div class="badge-row" style="flex-direction:column;text-align:left">
        ${mover.rows.slice(0,5).map((r,i)=>`<div class="ach" style="justify-content:space-between"><div><span class="em">${i===0?'👑':(i+1)}</span> <b>${esc(safeName(r.player))}</b></div><b style="color:var(--gold-bright)">+${r.gain}</b></div>`).join("")}
      </div>` : `<p class="muted" style="margin:0">No AP gained yet this month — first to get moving leads the spotlight!</p>`}
    </div>`;
  }
  // Squad Goals card (shared squad target) — reusable across pages.
  function squadGoalsCard() {
    const goals = S.squadGoals();
    return `<div class="card pad-lg">
      <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">Together as a squad</div><h2 style="font-size:1.5rem">Squad Goals</h2></div></div>
      ${goals.length ? goals.map(g=>{
        const prog = S.squadGoalProgress(g), pct = g.target?Math.min(100,Math.round(prog/g.target*100)):0;
        return `<div style="margin-bottom:1rem"><b>${esc(g.title)}</b> <span class="muted" style="font-size:.8rem">${prog}/${g.target} AP</span>
          <div class="track" style="margin:.3rem 0"><div class="fill" style="width:${pct}%"></div></div>
          <span class="muted" style="font-size:.82rem">🎁 Unlocks: ${esc(g.reward)}${g.unlocked||pct>=100?' <span class="tag green">Unlocked!</span>':''}</span></div>`;
      }).join("") : `<p class="muted" style="margin:0">Your coach will set a shared squad target soon — hit it together to unlock a reward!</p>`}
    </div>`;
  }
  // A small tappable "highlight" card for another squad member (card + AP/tier only).
  function squadHighlightCard(p) {
    const t = S.tierOf(p.id);
    return `<div class="fc-card" data-player="${p.id}">${fcCardInner(p)}</div>`;
  }

  function Players(id) {
    if (id) return PlayerProfile(+id);
    const me = S.hasLinkedPlayer() ? S.player(S.me) : null;
    const roster = S.roster().sort((a,b)=>a.number-b.number);

    // Coach with no linked child → the full card wall + squad motivation.
    if (!me) {
      view.innerHTML = `
        <div class="section-head"><div><div class="eyebrow">${esc(S.season)} Squad</div><h2>The Squad</h2></div></div>
        <p class="muted" style="margin-top:-.6rem;max-width:62ch">Every player has a card and an academy profile. Tap a card for their season stats and badges. <b>AP</b> means Academy Points.</p>
        <div class="players-grid" style="margin-top:1.3rem">
          ${roster.map(fcCard).join("") || emptyState("👟","No players in the "+esc(S.season)+" squad yet","Once the squad is set for this season, every player gets their own card here.", S.isAdmin?{label:"Add a player",go:"admin/players"}:null)}
        </div>
        <div class="grid cols-2" style="margin-top:1.6rem;align-items:start">${moverCard()}${squadGoalsCard()}</div>`;
      view.querySelectorAll("[data-player]").forEach(c => c.addEventListener("click", () => location.hash = "#players/"+c.dataset.player));
      wireGo();
      return;
    }

    // Logged-in child / parent → the active child's own platform first.
    const kids = S.myChildren();
    const others = roster.filter(p => p.id !== me.id);
    const fn = esc(firstNameOf(me));
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} · ${fn}'s platform</div><h2>Squad</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">${fn}'s own player card, season stats and badges — then how the whole squad is doing. <b>AP</b> means Academy Points.</p>

      ${kids.length>1 ? `<div class="badge-row" style="margin:1rem 0 .2rem">
        <span class="muted" style="align-self:center;font-size:.8rem;margin-right:.2rem">Showing:</span>
        ${kids.map(k=>`<button class="btn ${k.id===me.id?'btn-gold':'btn-ghost'} btn-sm" data-kid="${k.id}">${esc(firstNameOf(k))}</button>`).join("")}
      </div>` : ""}

      <div class="grid cols-2" style="margin-top:1.1rem;align-items:start">
        <div class="card pad-lg" style="text-align:center">
          <div class="fc-card" style="max-width:230px;margin:0 auto">${fcCardInner(me)}</div>
          <button class="btn btn-gold btn-sm" data-go="players/${me.id}" style="margin-top:1rem">${fn}'s full card &amp; profile →</button>
        </div>
        <div>
          ${tierProgressCard(me)}
          <div class="card pad-lg" style="margin-top:1.2rem">
            <div class="section-head" style="margin-bottom:.4rem"><div><div class="eyebrow">${esc(S.season)} so far</div><h2 style="font-size:1.4rem">${fn}'s season</h2></div></div>
            ${statsStrip(seasonStatRow(me))}
          </div>
        </div>
      </div>

      ${badgesBlock(me, fn+"'s badges")}

      <div class="grid cols-2" style="margin-top:1.6rem;align-items:start">${moverCard()}${squadGoalsCard()}</div>

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Tap a card to see their stats</div><h2>Rest of the squad</h2></div></div>
      <div class="players-grid" style="margin-top:1rem">
        ${others.map(squadHighlightCard).join("") || `<div class="card"><p class="muted" style="margin:0">No other players in the ${esc(S.season)} squad yet.</p></div>`}
      </div>`;
    view.querySelectorAll("[data-player]").forEach(c => c.addEventListener("click", () => location.hash = "#players/"+c.dataset.player));
    view.querySelectorAll("[data-kid]").forEach(b => b.addEventListener("click", async () => {
      await S.setMyPlayer(+b.dataset.kid); updateMyPlayerChip(); Players();
    }));
    wireGo();
  }

  function fcCard(p) {
    return `<div class="fc-card" data-player="${p.id}">${fcCardInner(p)}</div>`;
  }

  // Private Skill Ladder card (§2): the player's own six tracks with the next
  // target. Levels are private to that player (only shown to them or a coach).
  function skillLadderCard(p) {
    const ladder = S.skillLadder(p.id);
    const next = { bronze:"Silver", silver:"Gold", gold:"Gold (top!)", null:"Bronze" };
    const dot = lvl => lvl==="gold"?"🥇":lvl==="silver"?"🥈":lvl==="bronze"?"🥉":"⚪";
    const mine = p.id === S.me;
    const rows = S.SKILL_TRACKS.map(t => {
      const cur = ladder[t] || { level:null, pbs:0 };
      const target = cur.level==="gold" ? "Top level reached! ⭐" : `Next: ${next[cur.level||"null"]||"Bronze"}`;
      return `<div class="ach" style="justify-content:space-between">
        <div><span class="em">${dot(cur.level)}</span> <b>${esc(t)}</b> <span class="muted" style="font-size:.74rem;text-transform:capitalize">${cur.level||"not checked yet"}${cur.pbs?` · ${cur.pbs} PB`:""}</span></div>
        <span class="muted" style="font-size:.74rem">${esc(target)}</span></div>`;
    }).join("");
    return `<div class="card pad-lg" style="margin-top:1.2rem">
      <h3 style="margin:0 0 .2rem;font-family:var(--display)">${mine?"My":esc(firstNameOf(p))+"'s"} Skill Ladder</h3>
      <p class="muted" style="margin:0 0 .7rem;font-size:.84rem">Six skills to master, Bronze → Silver → Gold. Your coach checks these each half-term. ${mine?"This is just for you — only you and your coach can see it.":"Private to this player."}</p>
      ${rows}</div>`;
  }

  // Player identity profile (#players/:id). Card + season stats + badges for
  // everyone. Development bars, Skill Ladder, IDP and the link into Academy are
  // PRIVATE — shown only for the signed-in own child, or to a coach. A parent
  // opening ANOTHER kid sees highlights only.
  function PlayerProfile(id) {
    const p = S.player(id); if (!p) return Players();
    const full = (p.id === S.me) || S.isAdmin;   // own child or coach → full view
    const dev = p.dev || {}; const targets = p.targets || [];
    // Season stats: Player of the Match and Appearances spelled out in full.
    const stats = [["Goals",p.goals||0],["Assists",p.assists||0],["Player of the Match",p.motm||0],
                   ["Appearances",S.appearances(p.id)],["Academy Points (AP)",p.points||0],["Badges",S.earnedAchievements(p.id).length]];
    const isOther = !full;
    view.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-go="players" style="margin-bottom:1rem">← Squad</button>
      <div class="player-detail">
        <div><div class="fc-card" style="max-width:230px;margin:0 auto">${fcCardInner(p)}</div></div>
        <div>
          <div class="eyebrow" style="color:var(--gold-ink)">${esc(p.pos)} · Squad #${p.number}${p.captain?' · Captain 🧢':''}</div>
          <h2 style="font-family:var(--display);font-size:2.2rem;margin:.1rem 0 1rem">${esc(safeName(p))}</h2>
          ${statsStrip(stats)}
          ${full ? `
          <div class="card pad-lg" style="margin-top:1.2rem">
            <h3 style="margin:0 0 .2rem;font-family:var(--display)">Development progress</h3>
            <p class="muted" style="margin:0 0 .9rem;font-size:.86rem">How ${esc(firstNameOf(p))} is progressing toward their own targets — set by the coaches.</p>
            ${DEV_AREAS.map(([k,label])=>{const v=dev[k]||0;return `<div class="attr-bar"><div class="row"><span>${label}</span><span style="color:var(--gold-bright)">${v}%</span></div><div class="track"><div class="fill" style="width:${v}%"></div></div></div>`;}).join("")}
          </div>
          ${targets.length?`<div class="card pad-lg" style="margin-top:1.2rem">
            <h3 style="margin:0 0 .6rem;font-family:var(--display)">Goals to achieve</h3>
            ${targets.map(t=>`<div class="program-step"><div class="dot">★</div><div>${esc(t)}</div></div>`).join("")}
          </div>`:""}
          ${skillLadderCard(p)}
          ${S.isAdmin && p.id!==S.me
            ? `<button class="btn btn-gold btn-sm" data-go="development/${p.id}" style="margin-top:1.2rem">Manage ${esc(firstNameOf(p))}'s development plan &amp; videos →</button>`
            : `<button class="btn btn-gold btn-sm" data-go="academy" style="margin-top:1.2rem">My Academy — development plan, videos &amp; quiz →</button>`}
          ` : `
          <div class="card pad-lg" style="margin-top:1.2rem">
            <p class="muted" style="margin:0">This is a squad highlight — card and season stats only. ${esc(firstNameOf(p))}'s development plan, skill ladder and personal targets are private to their family.</p>
          </div>`}
        </div>
      </div>
      ${badgesBlock(p, (isOther?esc(firstNameOf(p))+"'s":"Earned along the way"))}`;
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

  // "My focus this half-term" (§5): the player's TWO mini-IDP focus areas, each
  // with its linked drill video and the coach's one-sentence feedback.
  function idpCard(p, mine) {
    const idp = S.idpFor(p.id);
    const cornerLabel = { technical:"Technical", physical:"Physical", psychological:"Psychological", social:"Social" };
    if (!idp.focus.length) {
      return `<div class="card pad-lg" style="margin-top:1.2rem">
        <h3 style="margin:0 0 .3rem;font-family:var(--display)">My focus this half-term</h3>
        <p class="muted" style="margin:0">Your coach will set your two focus areas for this half-term soon — one skill, plus one other thing to work on.</p></div>`;
    }
    const block = (f) => `<div class="card" style="margin-bottom:.7rem">
      <div class="lbl" style="font-size:.7rem;color:var(--gold-ink);font-weight:800;letter-spacing:1px;margin-bottom:.25rem">${esc((cornerLabel[f.corner]||f.corner||"").toUpperCase())}</div>
      <b style="display:block;margin-bottom:.4rem">${esc(f.area)}</b>
      ${f.drillUrl?`<div class="muted" style="font-size:.8rem;margin-bottom:.4rem">🎥 Drill: ${esc(f.drillTitle||"Watch and copy this")}</div>${videoEmbed(f.drillUrl)}`:""}
      ${f.feedback?`<div class="quiz-explain ok" style="margin-top:.6rem">💬 Coach: ${esc(f.feedback)}</div>`:""}
    </div>`;
    return `<div class="card pad-lg" style="margin-top:1.2rem">
      <h3 style="margin:0 0 .3rem;font-family:var(--display)">My focus this half-term</h3>
      <p class="muted" style="margin:0 0 .8rem;font-size:.84rem">${mine?"Your":esc(firstNameOf(p))+"'s"} two things to work on right now — one skill and one other. Watch the drill and give it a go!</p>
      ${idp.focus.map(block).join("")}</div>`;
  }

  function Development(id) {
    if (!id && S.isAdmin) return DevelopmentIndex();
    const p = id ? S.player(+id) : S.player(S.me);
    if (!p) { view.innerHTML = `<div class="card pad-lg"><h2 style="font-family:var(--display)">Development</h2><p class="muted">Choose which player is yours from the top bar to see their development plan.</p></div>`; return; }
    const mine = p.id === S.me;
    const track = false;   // v1.1 §1: videos are content only — no AP for watching (flagged)
    const program = p.program || [];
    const videos = S.videosForPlayer(p.id).map((v,i)=>({ ...v, domId:`devvid-${p.id}-${i}`, yt:ytId(v.url) }));
    view.innerHTML = `
      ${S.isAdmin ? `<button class="btn btn-ghost btn-sm" data-go="development" style="margin-bottom:1rem">← All players</button>`
        : (id && !mine ? `<button class="btn btn-ghost btn-sm" data-go="players/${p.id}" style="margin-bottom:1rem">← ${esc(firstNameOf(p))}'s card</button>` : "")}
      <div class="section-head"><div><div class="eyebrow">${esc(S.isAdmin?p.name:safeName(p))}</div><h2>${mine?"My":esc(firstNameOf(p))+"'s"} Development</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">Your personal plan, videos the coaches have picked for you, and this week's quiz.</p>

      ${idpCard(p, mine)}

      <div class="card pad-lg" style="margin-top:1.2rem">
        <h3 style="margin:0 0 .5rem;font-family:var(--display)">Personal development plan</h3>
        ${program.length?program.map((s,i)=>`<div class="program-step"><div class="dot">${i+1}</div><div>${esc(s)}</div></div>`).join("")
          :`<p class="muted" style="margin:0">Your coach will add your plan here soon.</p>`}
      </div>

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Picked for you</div><h2>My Videos</h2></div></div>
      ${videos.length?`<div class="grid cols-2">${videos.map(v=>`<div class="card"><b style="display:block;margin-bottom:${v.description?'.25rem':'.6rem'}">${esc(v.title||"Video")}</b>${v.description?`<div class="muted" style="font-size:.82rem;margin-bottom:.6rem">${esc(v.description)}</div>`:""}${videoEmbed(v.url)}</div>`).join("")}</div>`
        :`<div class="card"><p class="muted" style="margin:0">No videos yet — your coach will add some skills to work on.</p></div>`}

      <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">Fresh every week · test yourself</div><h2>Weekly Quiz</h2></div>
        ${S.state.quizScore!=null?`<span class="tag green">Last score ${S.state.quizScore}/${S.currentQuiz().questions.length}</span>`:""}</div>
      <div class="card pad-lg"><div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div></div>`;
    wireGo();
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
    if (track) trackYouTube(p.id, videos.filter(v=>v.yt).map(v=>({ domId:v.domId, url:v.url })));
  }
  function fcCardInner(p){
    const t = S.tierOf(p.id);
    const legacy = S.legacyTier ? S.legacyTier(p.id) : null;
    const tierLabel = { bronze:"BRONZE", silver:"SILVER", gold:"GOLD", icon:"ICON" }[t.key] || "BRONZE";
    return `<div class="fc-inner fc-tier-${t.key}">
      <div class="fc-top">
        <div><div class="fc-rating">${t.ap||0}</div><div class="fc-pos" title="Academy Points">AP</div></div>
        <div style="text-align:right"><div class="fc-num">#${p.number}</div><div class="fc-pos">${esc(p.pos)}</div></div>
      </div>
      <div class="fc-tier-label fc-tier-${t.key}">${tierLabel}${legacy?` <span class="fc-legacy" title="Last season: ${esc(legacy.label)}">· ${esc(legacy.label)} '24</span>`:""}</div>
      <div class="fc-photo"><div class="avatar">${esc(initials(p))}</div></div>
      <div class="fc-name">${p.captain?'<span class="capt" title="Captain">C</span> ':''}${esc(safeName(p))}</div>
      <div class="fc-stats">
        <div><span>GOALS</span>${p.goals||0}</div><div><span>ASSISTS</span>${p.assists||0}</div>
        <div><span title="Player of the Match awards">POTM</span>${p.motm||0}</div><div><span>TRAINING</span>${p.sessions||0}</div>
      </div>
      <img class="fc-crest" src="assets/crest.svg?v=2" alt=""/></div>`; }

  /* ============================ ACADEMY (kid-safe) ============================ */
  // §11: NO absolute leaderboard. This page shows the child's OWN card + standing,
  // Mover of the Month, Squad Goals, this week's homework (challenge + quiz) and chores.
  function pointsRules() {
    const s = cfg.SCORING || {};
    const pm = n => (n > 0 ? "+" + n : "" + n);
    return [
      { em:"✅", label:"Turn up to training", pts:pm(s.trainingAttendance) },
      { em:"🏅", label:"Trainer of the Day", pts:pm(s.trainerOfTheDay) },
      { em:"🎯", label:"Weekly challenge (done it!)", pts:pm(s.challenge) },
      { em:"📹", label:"...and show your coach", pts:pm(s.challengeShown) },
      { em:"🧠", label:"Complete the weekly quiz", pts:pm(s.quizComplete) },
      { em:"💯", label:"...with a perfect score", pts:pm(s.quizPerfect) },
      { em:"👕", label:"Play in the match", pts:pm(s.appearance) },
      { em:"🏆", label:"Win (everyone) / draw", pts:pm(s.win)+" / "+pm(s.draw) },
      { em:"⚽", label:"Goal / assist", pts:pm(s.goal)+" / "+pm(s.assist) },
      { em:"🧤", label:"Clean sheet (GK/def/other)", pts:pm(s.cleanSheetGK)+"/"+pm(s.cleanSheetDef)+"/"+pm(s.cleanSheetOther) },
      { em:"🧹", label:"Home Team chore (×3)", pts:pm(s.chore) },
      { em:"📚", label:"Homework done by deadline", pts:pm(s.homeworkBonus) }
    ];
  }

  // The Academy page (#academy) = the signed-in child's own development WORK.
  //   Progress: development bars + skill ladder + "my focus this half-term" (IDP)
  //   Quiz:     the weekly quiz (the CHILD takes it here)
  //   Tasks:    this week's challenge to DO (+ quiz status) and how points work
  //   Videos:   team videos + videos picked for the child
  // Mover of the Month, Squad Goals and Badges live on Squad now; chores live on Family.
  function League(tab) {
    const me = S.hasLinkedPlayer() ? S.player(S.me) : null;

    // Coach with no linked child → a friendly note + a link to Admin.
    if (!me) {
      view.innerHTML = `
        <div class="section-head"><div><div class="eyebrow">${esc(S.season)} Season</div><h2>Academy</h2></div></div>
        <div class="card pad-lg" style="max-width:560px">
          <p class="muted" style="margin:0 0 ${S.isAdmin?'1rem':'1rem'}">The Academy is each child's own development space — their progress, this week's quiz and challenge, and the videos picked for them. ${S.isAdmin?"Your coach account isn't linked to a child, so there's nothing personal to show here. Manage everyone's development from Admin.":"Pick which child is yours from the top bar to get started."}</p>
          ${S.isAdmin?`<button class="btn btn-gold" data-go="admin/academy">⚙ Manage development in Admin</button>`:`<button class="btn btn-gold" data-go-pick>Choose my child</button>`}
        </div>`;
      view.querySelectorAll("[data-go-pick]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); showChildPicker(true); }));
      wireGo();
      return;
    }

    const valid = ["progress","quiz","tasks","videos"];
    tab = valid.includes(tab) ? tab : "progress";
    const fn = esc(firstNameOf(me));
    const dev = me.dev || {}; const targets = me.targets || [];
    const program = me.program || [];
    const videos = S.videosForPlayer(me.id).map((v,i)=>({ ...v, domId:`devvid-${me.id}-${i}`, yt:ytId(v.url) }));
    const teamVids = S.teamVideos().filter(d=>d.url);

    let body = "";
    if (tab === "progress") {
      body = `
        ${tierProgressCard(me)}
        <div class="card pad-lg" style="margin-top:1.2rem">
          <h3 style="margin:0 0 .2rem;font-family:var(--display)">Development progress</h3>
          <p class="muted" style="margin:0 0 .9rem;font-size:.86rem">How ${fn} is progressing toward their own targets — set by the coaches.</p>
          ${DEV_AREAS.map(([k,label])=>{const v=dev[k]||0;return `<div class="attr-bar"><div class="row"><span>${label}</span><span style="color:var(--gold-bright)">${v}%</span></div><div class="track"><div class="fill" style="width:${v}%"></div></div></div>`;}).join("")}
        </div>
        ${targets.length?`<div class="card pad-lg" style="margin-top:1.2rem">
          <h3 style="margin:0 0 .6rem;font-family:var(--display)">Goals to achieve</h3>
          ${targets.map(t=>`<div class="program-step"><div class="dot">★</div><div>${esc(t)}</div></div>`).join("")}
        </div>`:""}
        ${skillLadderCard(me)}
        ${idpCard(me, true)}
        <div class="card pad-lg" style="margin-top:1.2rem">
          <h3 style="margin:0 0 .5rem;font-family:var(--display)">Personal development plan</h3>
          ${program.length?program.map((s,i)=>`<div class="program-step"><div class="dot">${i+1}</div><div>${esc(s)}</div></div>`).join("")
            :`<p class="muted" style="margin:0">Your coach will add your plan here soon.</p>`}
        </div>`;
    } else if (tab === "quiz") {
      body = `
        <div class="card pad-lg" id="quiz-card">
          <div class="section-head" style="margin-bottom:.6rem"><div><div class="eyebrow">Fresh every week · +${(cfg.SCORING||{}).quizComplete} Academy Points (AP) (+${(cfg.SCORING||{}).quizPerfect} for a perfect score)</div><h2 style="font-size:1.5rem">${esc(S.currentQuiz().title)}</h2></div>
            ${S.state.quizScore!=null?`<span class="tag green">Last score ${S.state.quizScore}/${S.currentQuiz().questions.length}</span>`:""}</div>
          <p class="muted" style="margin:0 0 .7rem;font-size:.84rem">Have a go — it's marked instantly, and a fresh quiz lands every week.</p>
          <div id="quiz-host"><button class="btn btn-gold" id="start-quiz">Start the quiz</button></div>
        </div>`;
    } else if (tab === "tasks") {
      body = `
        ${homeworkCard(me)}
        <div class="card" style="margin-top:1.2rem">
          <div class="lbl" style="color:var(--muted);font-weight:700;font-size:.74rem;letter-spacing:1px">HOW ACADEMY POINTS (AP) WORK</div>
          <div class="badge-row" style="flex-direction:column;margin-top:.7rem;text-align:left">
            ${pointsRules().map(r=>`<div class="ach"><span class="em">${r.em}</span><div>${r.label} <span class="muted" style="font-weight:800;color:var(--gold-bright)">${r.pts}</span></div></div>`).join("")}
          </div>
        </div>`;
    } else {   // videos
      body = `
        <div class="section-head" style="margin-top:0"><div><div class="eyebrow">Picked for you</div><h3 style="font-family:var(--display);font-size:1.5rem;margin:0">My videos</h3></div></div>
        ${videos.length?`<div class="grid cols-2" style="margin-top:.8rem">${videos.map(v=>`<div class="card"><b style="display:block;margin-bottom:${v.description?'.25rem':'.6rem'}">${esc(v.title||"Video")}</b>${v.description?`<div class="muted" style="font-size:.82rem;margin-bottom:.6rem">${esc(v.description)}</div>`:""}${videoEmbed(v.url)}</div>`).join("")}</div>`
          :`<div class="card" style="margin-top:.8rem"><p class="muted" style="margin:0">No videos yet — your coach will add some skills to work on.</p></div>`}
        <div class="section-head" style="margin-top:1.6rem"><div><div class="eyebrow">For the whole squad</div><h3 style="font-family:var(--display);font-size:1.5rem;margin:0">Team training videos</h3></div></div>
        ${teamVids.length?`<div class="grid cols-2" style="margin-top:.8rem">${teamVids.map(v=>`<div class="card"><b style="display:block;margin-bottom:${v.description?'.25rem':'.6rem'}">${esc(v.title||"Video")}</b>${v.description?`<div class="muted" style="font-size:.82rem;margin-bottom:.6rem">${esc(v.description)}</div>`:""}${videoEmbed(v.url)}</div>`).join("")}</div>`
          :`<div class="card" style="margin-top:.8rem"><p class="muted" style="margin:0">No team videos yet.</p></div>`}`;
    }

    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">${esc(S.season)} · ${fn}'s Academy</div><h2>Academy</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:64ch">${fn}'s own development space — track progress, take this week's quiz, do the weekly challenge and watch the videos picked for them. Earn <b>Academy Points (AP)</b> for trying hard and improving.</p>
      <div class="acad-tabs badge-row" style="margin:1rem 0 1.2rem">
        <button class="btn ${tab==='progress'?'btn-gold':'btn-ghost'} btn-sm" data-acad="progress">Progress</button>
        <button class="btn ${tab==='quiz'?'btn-gold':'btn-ghost'} btn-sm" data-acad="quiz">Quiz</button>
        <button class="btn ${tab==='tasks'?'btn-gold':'btn-ghost'} btn-sm" data-acad="tasks">Tasks</button>
        <button class="btn ${tab==='videos'?'btn-gold':'btn-ghost'} btn-sm" data-acad="videos">Videos</button>
      </div>
      <div id="acad-body">${body}</div>`;

    view.querySelectorAll("[data-acad]").forEach(b => b.addEventListener("click", () => location.hash = "#academy/"+b.dataset.acad));
    wireGo();
    wireHomework();
    const start = $("#start-quiz"); if (start) start.addEventListener("click", runQuiz);
  }

  /* ============================ FAMILY (parents' space) ============================ */
  // A dedicated home for parents/carers: this week's challenge + quiz, the homework
  // gate, the jobs they set at home, and their child's card + development focus.
  // Multi-child aware (Holden twins etc.) via a child switcher. Hidden from coach
  // accounts that aren't linked to a child.
  function Family() {
    if (!S.hasLinkedPlayer()) {
      view.innerHTML = `
        <div class="section-head"><div><div class="eyebrow">For parents &amp; carers</div><h2>Family</h2></div></div>
        <div class="card pad-lg" style="max-width:560px">
          <p class="muted" style="margin:0 0 ${S.isAdmin?'0':'1rem'}">This is your family's space — this week's challenge and quiz, homework to mark off, the jobs you set at home, and your child's card. ${S.isAdmin?"Your coach account isn't linked to a child, so there's nothing to show here.":"Pick which child is yours to get started."}</p>
          ${S.isAdmin?"":`<button class="btn btn-gold" data-go-pick>Choose my child</button>`}
        </div>`;
      view.querySelectorAll("[data-go-pick]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); showChildPicker(true); }));
      return;
    }
    const me = S.player(S.me);
    const kids = S.myChildren();
    const challengeDone = S.challengeDoneThisWeek(me.id);
    const quizDone = S.quizDoneThisWeek(me.id);
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">For parents &amp; carers · ${esc(S.season)}</div><h2>Family</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:66ch">Your space to back ${esc(firstNameOf(me))} this week — confirm homework, and set the jobs and challenges you do at home. ${esc(firstNameOf(me))} does the quiz and weekly challenge over in <b>Academy</b>; this is where you confirm and oversee. It's all upside — the kids never see deductions.</p>

      ${kids.length>1 ? `<div class="badge-row" style="margin:1rem 0 .2rem">
        <span class="muted" style="align-self:center;font-size:.8rem;margin-right:.2rem">Showing:</span>
        ${kids.map(k=>`<button class="btn ${k.id===me.id?'btn-gold':'btn-ghost'} btn-sm" data-kid="${k.id}">${esc(firstNameOf(k))}</button>`).join("")}
      </div>` : ""}

      <div class="card" style="margin-top:1.1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
        <span class="club-badge us" style="flex:none">${esc(initials(me))}</span>
        <div style="flex:1;min-width:160px"><b style="display:block">${esc(firstNameOf(me))}</b><span class="muted" style="font-size:.84rem">#${me.number} · ${esc(me.pos)} · ${esc(S.tierOf(me.id).label)} · ${me.points||0} Academy Points (AP)</span></div>
        <button class="btn btn-gold btn-sm" data-go="players/${me.id}">${esc(firstNameOf(me))}'s full card &amp; profile →</button>
      </div>

      <div class="grid cols-2" style="margin-top:1.2rem;align-items:start">
        <div>${homeworkCard(me)}</div>
        <div>${choresCard(me)}</div>
      </div>

      <div class="card pad-lg" style="margin-top:1.2rem">
        <div class="section-head" style="margin-bottom:.4rem"><div><div class="eyebrow">This week at a glance</div><h2 style="font-size:1.4rem">${esc(firstNameOf(me))}'s homework status</h2></div></div>
        <div class="ach" style="justify-content:space-between;margin-bottom:.4rem"><div><span class="em">🎯</span> <b>Weekly challenge</b></div>${challengeDone?'<span class="tag green">✓ Done</span>':'<span class="muted">Not yet</span>'}</div>
        <div class="ach" style="justify-content:space-between"><div><span class="em">🧠</span> <b>Weekly quiz</b></div>${quizDone?'<span class="tag green">✓ Done</span>':'<span class="muted">Not yet</span>'}</div>
        ${(!challengeDone||!quizDone)?`<button class="btn btn-ghost btn-sm" data-go="academy/quiz" style="margin-top:.8rem">Open ${esc(firstNameOf(me))}'s Academy to do them →</button>`:''}
      </div>`;

    wireGo();
    wireHomework();
    wireChores();
    view.querySelectorAll("[data-kid]").forEach(b => b.addEventListener("click", async () => {
      await S.setMyPlayer(+b.dataset.kid); updateMyPlayerChip(); rerenderCurrent();
    }));
  }

  function tierProgressCard(p) {
    const t = S.tierOf(p.id);
    const tiers = cfg.TIERS || [];
    const next = tiers.find(x => x.min > t.ap);
    const pct = next ? Math.min(100, Math.round(t.ap / next.min * 100)) : 100;
    return `<div class="card pad-lg">
      <div class="section-head" style="margin-bottom:.4rem"><div><div class="eyebrow">My card</div><h2 style="font-size:1.4rem">${esc(t.label)} · ${t.ap} AP</h2></div></div>
      ${next ? `<div class="track" style="margin:.4rem 0"><div class="fill" style="width:${pct}%"></div></div>
        <span class="muted" style="font-size:.84rem">${next.min - t.ap} AP to <b>${esc(next.label)}</b>${next.key==='icon'?` (and any 2 Gold skill checks — you have ${t.golds})`:''}</span>`
        : `<span class="tag green">Top tier reached — Icon! ⭐</span>`}
    </div>`;
  }

  // This week's homework = challenge + quiz. Parent marks the challenge done here.
  function homeworkCard(p) {
    const challengeDone = S.challengeDoneThisWeek(p.id);
    const quizDone = S.quizDoneThisWeek(p.id);
    const both = challengeDone && quizDone;
    const ch = S.weeklyChallenge();
    const deadline = S.homeworkDeadline();
    const overridden = S.homeworkOverridden(p.id);
    return `<div class="card pad-lg" style="margin-top:1.2rem">
      <div class="section-head" style="margin-bottom:.4rem"><div><div class="eyebrow">Homework · by ${fdateLong(deadline.toISOString().slice(0,10))} 6pm</div><h2 style="font-size:1.4rem">This week's homework</h2></div>${both?'<span class="tag green">Done +'+(cfg.SCORING||{}).homeworkBonus+'</span>':overridden?'<span class="tag">Waived</span>':''}</div>
      <p class="muted" style="margin:0 0 .6rem;font-size:.84rem">Do both the challenge and the quiz before the deadline for a <b>+${(cfg.SCORING||{}).homeworkBonus} AP</b> bonus. Miss it and it's ${(cfg.SCORING||{}).homeworkPenalty} AP and a bench start — but your coach can always waive it.</p>
      <div class="ach" style="justify-content:space-between;margin-bottom:.4rem">
        <div><span class="em">${ch&&ch.icon?ch.icon:'🎯'}</span> <b>Challenge:</b> ${ch?esc(ch.name):'Weekly drill'}${ch&&ch.corner?` <span class="tag" style="font-size:.6rem">${esc((S.state.cornerLabel||{})[ch.corner]||ch.corner)}</span>`:''}</div>
        ${challengeDone?'<span class="tag green">✓ Done</span>':`<button class="btn btn-dark btn-sm" data-hw-challenge="${p.id}">Mark done +${(cfg.SCORING||{}).challenge}</button>`}
      </div>
      ${ch&&ch.desc?`<p class="muted" style="margin:.1rem 0 .5rem;font-size:.82rem">${esc(ch.desc)}${ch.minutes?` <b style="color:var(--gold-bright)">~${ch.minutes} min</b>`:''}</p>`:''}
      ${ch&&ch.video?`<div style="margin:.2rem 0 .5rem">${videoEmbed(ch.video)}</div>`:''}
      ${challengeDone?'':`${ch&&ch.skillToShow?`<p class="muted" style="margin:.1rem 0 .4rem;font-size:.8rem">📹 To earn the bonus: ${esc(ch.skillToShow)}</p>`:''}<label class="field" style="flex-direction:row;align-items:center;gap:.4rem;margin:-.2rem 0 .6rem"><input type="checkbox" id="hw-shown-${p.id}" style="width:auto"/> <span style="margin:0;font-size:.82rem">We also showed the coach / sent a clip (+${(cfg.SCORING||{}).challengeShown})</span></label>`}
      <div class="ach" style="justify-content:space-between">
        <div><span class="em">🧠</span> <b>Quiz:</b> this week's quiz</div>
        ${quizDone?'<span class="tag green">✓ Done</span>':`<button class="btn btn-ghost btn-sm" onclick="location.hash='#academy/quiz'">Take the quiz →</button>`}
      </div>
    </div>`;
  }

  function wireHomework() {
    view.querySelectorAll("[data-hw-challenge]").forEach(b => b.addEventListener("click", async () => {
      if (S.isAdmin) return toast("Coaches don't earn AP");
      const pid = +b.dataset.hwChallenge;
      const shown = !!(view.querySelector(`#hw-shown-${pid}`) && view.querySelector(`#hw-shown-${pid}`).checked);
      const res = await S.tickChallenge(pid, shown);
      if (res.ok) { toast(res.dup ? "Already done this week" : "Challenge done! 🎯"); rerenderCurrent(); }
      else toast("Error: " + res.msg);
    }));
  }

  // Home Team chores (§1G): parent sets up to 3, ticks them, +10 each, private.
  function choresCard(p) {
    const max = (cfg.SCORING||{}).choresPerWeek || 3;
    const c = S.choresFor(p.id) || { list: [], done: [] };
    const has = c.list && c.list.length;
    return `<div class="card pad-lg" style="margin-top:1.2rem">
      <div class="section-head" style="margin-bottom:.4rem"><div><div class="eyebrow">Private to your family · +${(cfg.SCORING||{}).chore} each</div><h2 style="font-size:1.4rem">Home Challenges</h2></div></div>
      <p class="muted" style="margin:0 0 .6rem;font-size:.84rem">Set up to ${max} of your own challenges or jobs each week — keepie-uppies, wall passes, tidy the kit, help at home. Tick each off for AP. No deductions, just upside.</p>
      ${has ? `<div id="chore-list-${p.id}">${c.list.map((ch,i)=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.35rem"><input type="checkbox" class="chore-tick" data-p="${p.id}" data-i="${i}" ${c.done[i]?'checked':''} style="width:auto"/> <span style="margin:0">${esc(ch)}</span> ${c.done[i]?'<span class="tag green" style="font-size:.6rem">+'+(cfg.SCORING||{}).chore+'</span>':''}</label>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" data-chore-edit="${p.id}" style="margin-top:.4rem">Edit this week's jobs</button>`
      : `<button class="btn btn-dark btn-sm" data-chore-edit="${p.id}">Set this week's jobs</button>
         <button class="btn btn-ghost btn-sm" data-chore-default="${p.id}" style="margin-left:.4rem">Use default list</button>`}
    </div>`;
  }

  function wireChores() {
    view.querySelectorAll(".chore-tick").forEach(c => c.addEventListener("change", async () => {
      const res = await S.tickChore(+c.dataset.p, +c.dataset.i, c.checked);
      if (res.ok) { toast(c.checked ? "+"+(cfg.SCORING||{}).chore+" AP 🧹" : "Unticked"); rerenderCurrent(); }
      else toast("Error: " + res.msg);
    }));
    view.querySelectorAll("[data-chore-default]").forEach(b => b.addEventListener("click", async () => {
      const res = await S.reissueChores(+b.dataset.choreDefault); if (res.ok) { toast("Default jobs set ✓"); rerenderCurrent(); }
    }));
    view.querySelectorAll("[data-chore-edit]").forEach(b => b.addEventListener("click", () => choreEditor(+b.dataset.choreEdit)));
  }

  function choreEditor(pid) {
    const max = (cfg.SCORING||{}).choresPerWeek || 3;
    const c = S.choresFor(pid) || { list: [] };
    const root = $("#modal-root");
    root.innerHTML = `<div class="modal-backdrop"><div class="modal card pad-lg" style="max-width:420px">
      <h3 style="font-family:var(--display);margin:0 0 .6rem">Your home challenges this week</h3>
      <p class="muted" style="font-size:.84rem;margin:0 0 .8rem">Up to ${max} challenges or jobs you set — football or home. These are private to your family.</p>
      ${[0,1,2].slice(0,max).map(i=>`<label class="field"><span>Challenge ${i+1}</span><input id="chore-${i}" value="${esc((c.list||[])[i]||"")}" placeholder="${esc((S.DEFAULT_CHORES||[])[i]||["50 keepie-uppies","Wall passes, both feet","Help tidy up at home"][i]||"e.g. 50 keepie-uppies")}"/></label>`).join("")}
      <div class="badge-row" style="margin-top:.8rem"><button class="btn btn-gold btn-sm" id="chore-save">Save jobs</button><button class="btn btn-ghost btn-sm" id="chore-cancel">Cancel</button></div>
    </div></div>`;
    $("#chore-cancel").addEventListener("click", () => root.innerHTML = "");
    $("#chore-save").addEventListener("click", async () => {
      const list = [0,1,2].slice(0,max).map(i=>($("#chore-"+i)||{}).value||"").map(s=>s.trim()).filter(Boolean);
      const res = await S.setChores(pid, list);
      root.innerHTML = ""; if (res.ok) { toast("Jobs saved ✓"); rerenderCurrent(); }
    });
  }

  function runQuiz() {
    const qz = S.currentQuiz(); let idx = 0, score = 0;
    const host = $("#quiz-host");
    if (S.quizDoneThisWeek(S.me)) {
      host.innerHTML = `<div style="text-align:center;padding:1rem"><div class="tag green">Done this week ✓</div><p class="muted" style="margin-top:.6rem">You've already completed this week's quiz — your AP is banked. A fresh quiz lands next week!</p></div>`;
      return;
    }
    function render() {
      if (idx >= qz.questions.length) {
        const total = qz.questions.length;
        S.setQuizScore(score);
        if (!S.isAdmin) S.recordQuiz(S.me, score, total);
        const perfect = score === total;
        const earned = (cfg.SCORING||{}).quizComplete + (perfect ? (cfg.SCORING||{}).quizPerfect : 0);
        host.innerHTML = `<div style="text-align:center;padding:1rem">
          <div class="progress-ring" style="--p:${Math.round(score/total*100)};margin:0 auto 1rem"><div class="inner">${score}/${total}</div></div>
          <h3 style="font-family:var(--display);margin:.2rem 0">${perfect?'Perfect! 🧠':score>=Math.ceil(total/2)?'Great work! ⚽':'Nice try — you learned something! 💪'}</h3>
          <p class="muted">You earned <b>+${earned} Academy Points (AP)</b> for completing it${perfect?' with a perfect score':''}. Come back next week for a brand-new quiz!</p>
          <button class="btn btn-dark btn-sm" onclick="location.hash='#academy/tasks'">Back to my tasks</button></div>`;
        // Leave the celebratory score on screen — AP is already banked. The next
        // visit re-renders fresh state via the router.
        return;
      }
      const q = qz.questions[idx];
      host.innerHTML = `<div class="quiz-q">
        <div class="tag gold" style="margin-bottom:.6rem">Question ${idx+1} of ${qz.questions.length}</div>
        <h3 style="margin:.2rem 0 .9rem">${esc(q.q)}</h3>
        ${q.opts.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join("")}
        <div id="quiz-fb" style="margin-top:.8rem"></div>
      </div>`;
      host.querySelectorAll(".quiz-opt").forEach(btn => btn.addEventListener("click", () => {
        const i = +btn.dataset.i;
        host.querySelectorAll(".quiz-opt").forEach(b=>b.disabled=true);
        const correct = i === q.answer;
        if (correct) { btn.classList.add("correct"); score++; }
        else { btn.classList.add("wrong"); host.querySelectorAll(".quiz-opt")[q.answer].classList.add("correct"); }
        // Teaching tool (§1E): a wrong answer shows the correct one + a one-line explanation.
        const fb = host.querySelector("#quiz-fb");
        const explain = q.explain || (correct ? "Nice one!" : `The answer is "${q.opts[q.answer]}".`);
        fb.innerHTML = `<div class="quiz-explain ${correct?'ok':'no'}">${correct?'✅ ':'💡 '}${esc(explain)}</div>
          <button class="btn btn-dark btn-sm" id="quiz-next" style="margin-top:.6rem">${idx+1>=qz.questions.length?'See my score':'Next question'} →</button>`;
        host.querySelector("#quiz-next").addEventListener("click", ()=>{ idx++; render(); });
      }));
    }
    render();
  }

  /* ============================ ADMIN PANEL ============================ */
  function Admin(sub) {
    if (!S.isAdmin) { view.innerHTML = `<div class="card pad-lg"><h2 style="font-family:var(--display)">Admins only</h2><p class="muted">This area is for team coaches/admins. Ask the team admin to grant you access.</p></div>`; return; }
    sub = sub || "fixtures";
    const tabs = [["attendance","Attendance"],["fixtures","Add fixture"],["result","Enter result"],["register","Register"],["teamsheet","Team sheet"],["points","Academy Points"],["skillladder","Skill ladder"],["squadgoals","Squad goals"],["seasonstats","Season stats"],["quizresults","Quiz results"],["quizedit","Quiz"],["academy","Development"],["idp","Mini-IDP"],["videos","Videos"],["contacts","Contacts"],["roster","Roster"],["players","Add player"],["training","Plan training"],["events","Add event"]];
    view.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Coaches only</div><h2>Admin Panel</h2></div></div>
      <p class="muted" style="margin-top:-.6rem;max-width:62ch">Manage everything from here — no spreadsheets. ${S.MODE==='preview'?'<b>Preview mode:</b> changes save to this browser so you can try it. Connect Supabase to save for everyone.':'Changes save to your database and appear for everyone straight away.'}</p>
      <div class="badge-row" style="margin:1rem 0 1.2rem">
        ${tabs.map(([k,l])=>`<button class="btn ${sub===k?'btn-gold':'btn-ghost'} btn-sm" data-atab="${k}">${l}</button>`).join("")}
      </div>
      <div id="admin-body"></div>`;
    view.querySelectorAll("[data-atab]").forEach(b => b.addEventListener("click", () => location.hash = "#admin/"+b.dataset.atab));
    const sub2 = (location.hash.replace("#","").split("/"))[2];
    ({ attendance:AdmAttendance, fixtures:AdmFixture, result:AdmResult, register:AdmRegister, teamsheet:AdmTeamSheet, points:AdmPoints, skillladder:AdmSkillLadder, squadgoals:AdmSquadGoals, seasonstats:AdmSeasonStats, quizresults:AdmQuizResults, quizedit:AdmQuizEditor, academy:AdmAcademy, idp:AdmIdp, videos:AdmVideos, contacts:AdmContacts, roster:AdmRoster, players:AdmPlayer, training:AdmTraining, events:AdmEvent }[sub] || AdmAttendance)(sub2);
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0b0b0b;color:#fff;font-weight:600;padding:.7rem 1.2rem;border-radius:999px;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.18)";
    document.body.appendChild(t); setTimeout(()=>t.remove(), 2200);
  }
  const playerOpts = (sel) => S.roster(true).sort((a,b)=>a.number-b.number).map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>#${p.number} ${esc(p.name)}</option>`).join("");
  const F = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;

  // ---- Coach attendance view: who's coming to each upcoming session, by name ----
  function attendanceBreakdown(key) {
    const m = S.state.attendance[key] || {};
    const going=[], cant=[], noreply=[]; const lift=new Set();
    S.roster().sort((a,b)=>a.number-b.number).forEach(p => {
      const s = m[p.id];
      if (s==="yes") going.push(p);
      else if (s==="lift") { going.push(p); lift.add(p.id); }
      else if (s==="no") cant.push(p);
      else noreply.push(p);
    });
    return { going, cant, noreply, lift };
  }
  function admName(p, lift){ const parts=fullName(p).split(" ").filter(Boolean); const ln=parts.length>1?` ${parts[parts.length-1][0]}.`:""; return `${esc(parts[0]||"Player")}${esc(ln)}${lift&&lift.has(p.id)?' 🚗':''}`; }
  function AdmAttendance() {
    const body = $("#admin-body");
    const items = buildAgenda(["training","match","event"], 35);
    if (!items.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">Nothing scheduled in the next few weeks for the <b>${esc(S.season)}</b> season.</p></div>`; return; }
    const namesOf = (arr, lift) => arr.length ? arr.map(p=>admName(p,lift)).join(", ") : "—";
    body.innerHTML = `
      <p class="muted" style="margin-top:0;max-width:66ch">Who's coming to each upcoming session — so you can plan. 🚗 = needs a lift. Anyone who hasn't tapped Going or Can't shows under <b>No reply</b>. Switch season from the top bar.</p>
      ${items.map(it=>{
        const b=attendanceBreakdown(it.key); const d=it.dateObj;
        const time = it.kind==="match"?`KO ${fmt12(it.start)}`:it.kind==="event"?(it.time?fmt12(it.time):""):`${fmt12(it.start)}–${fmt12(it.end)}`;
        return `<div class="card" style="margin-bottom:.8rem">
          <div class="ag-head" style="margin-bottom:.6rem"><span class="tag ${TYPE_META[it.kind].cls}">${TYPE_META[it.kind].label}</span><b>${esc(it.title||it.label)}</b> <span class="muted">${fdate(ymd(d))}${time?` · ${time}`:""}</span></div>
          <div class="att-row att-go"><b>✓ Going (${b.going.length})</b> ${namesOf(b.going, b.lift)}</div>
          <div class="att-row att-no"><b>✕ Can't (${b.cant.length})</b> ${namesOf(b.cant)}</div>
          <div class="att-row att-na"><b>· No reply (${b.noreply.length})</b> ${namesOf(b.noreply)}</div>
        </div>`;
      }).join("")}`;
  }

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
      if (!S.inSeason(data.date) && !window.confirm(`That date is outside the ${S.season} season you're viewing — it'll appear under ${S._seasonForDate(data.date)}. Add anyway?`)) return;
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

    const gkIds = fullRoster.filter(p=>String(p.pos).toUpperCase()==="GK");
    function blankState(){ return { our:0, them:0, motm:null, moment:null, goals:[{scorer:null,assist:null}], cs:new Set(), saves:new Set(), lineup:new Set() }; }
    function loadFixture(id){
      const fx = played.find(f=>f.id===id) || {};
      const csIds = (S.state.ledger||[]).filter(e=>e.ref && e.ref.startsWith(`match:${id}:cs`)).map(e=>e.player_id);
      const saveIds = (S.state.ledger||[]).filter(e=>e.ref && e.ref.startsWith(`match:${id}:sotd`)).map(e=>e.player_id);
      const momentE = (S.state.ledger||[]).find(e=>e.ref===`match:${id}:moment`);
      st = {
        our: fx.our_score!=null?fx.our_score:0,
        them: fx.their_score!=null?fx.their_score:0,
        motm: fx.motm!=null?fx.motm:null,
        moment: momentE ? momentE.player_id : (fx.moment!=null?fx.moment:null),
        goals: (fx.goals && fx.goals.length) ? fx.goals.map(g=>({scorer:g.scorer??null, assist:g.assist??null})) : [{scorer:null,assist:null}],
        cs: new Set(csIds), saves: new Set(saveIds),
        lineup: new Set(Array.isArray(fx.lineup)?fx.lineup:[])
      };
    }
    function syncFromDom(){
      if (!body.querySelector("#r-us")) return;
      st.our = +body.querySelector("#r-us").value||0;
      st.them = +body.querySelector("#r-them").value||0;
      const m = body.querySelector("#r-motm").value; st.motm = m ? +m : null;
      const mo = body.querySelector("#r-moment").value; st.moment = mo ? +mo : null;
      body.querySelectorAll("[data-g]").forEach(sel=>{ const i=+sel.dataset.i; st.goals[i]=st.goals[i]||{scorer:null,assist:null}; st.goals[i][sel.dataset.g]= sel.value? +sel.value : null; });
      st.cs = new Set([...body.querySelectorAll(".cs:checked")].map(c=>+c.value));
      st.saves = new Set([...body.querySelectorAll(".sotd:checked")].map(c=>+c.value));
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
        <div class="grid cols-2">${F("Player of the Match (+"+(cfg.SCORING||{}).motm+")",`<select id="r-motm">${motmOpts(st.motm)}</select>`)}${F("Moment of the Match (+"+(cfg.SCORING||{}).momentOfMatch+", ≠ POTM)",`<select id="r-moment">${motmOpts(st.moment)}</select>`)}</div>
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">GOALSCORERS <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— goal/assist +${(cfg.SCORING||{}).goal} each, capped at +${(cfg.SCORING||{}).outcomeCapPerMatch}/player/match</span></div>
        <div id="goal-rows">${st.goals.map((g,i)=>goalRow(g,i)).join("")}</div>
        <button class="btn btn-dark btn-sm" id="add-goal" style="margin:.3rem 0 1rem">+ Add goal</button>
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.4rem 0">WHO PLAYED <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— everyone ticked gets appearance +${(cfg.SCORING||{}).appearance} and win/draw automatically</span> <button class="btn btn-ghost btn-sm" id="lp-all" type="button" style="margin-left:.4rem">All</button></div>
        <div id="lp-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.2rem .8rem">${fullRoster.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.45rem;margin-bottom:.2rem"><input type="checkbox" class="lp" value="${p.id}" ${st.lineup.has(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)}</span></label>`).join("")}</div>
        <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.6rem 0 .4rem">CLEAN SHEET <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— if we kept them out, tick who earned it (GK +${(cfg.SCORING||{}).cleanSheetGK} · def +${(cfg.SCORING||{}).cleanSheetDef} · others +${(cfg.SCORING||{}).cleanSheetOther})</span></div>
        <div id="cs-list">${defGk.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.3rem"><input type="checkbox" class="cs" value="${p.id}" ${st.cs.has(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)} <span class="muted">${esc(p.pos)}</span></span></label>`).join("") || `<p class="muted" style="margin:.2rem 0">No defenders/keepers in the ${esc(S.season)} squad.</p>`}</div>
        ${gkIds.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.6rem 0 .4rem">SAVE OF THE DAY <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— GK (+${(cfg.SCORING||{}).saveOfTheDay})</span></div>
        <div id="sotd-list">${gkIds.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.5rem;margin-bottom:.3rem"><input type="checkbox" class="sotd" value="${p.id}" ${st.saves.has(p.id)?'checked':''} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)}</span></label>`).join("")}</div>`:""}
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
      if (st.them > 0 && st.cs.size > 0 && !window.confirm(`We conceded ${st.them} but ${st.cs.size} clean sheet(s) are ticked — they won't be awarded (we conceded). Save anyway?`)) return;
      if (st.moment && st.moment === st.motm) { toast("Moment of the Match must be a different player to POTM"); return; }
      const res = await S.saveResult(curId, {
        our_score:st.our, their_score:st.them, motm:st.motm, moment:st.moment,
        goals:st.goals.filter(g=>g.scorer), cleanSheets:[...st.cs], saves:[...st.saves], lineup:[...st.lineup] });
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
    // Trainer-of-the-Day rotation hint (§1A): everyone wins once per half-term before twice.
    const trainerCounts = S.trainerOfDayThisHalfTerm();
    function trainerOpts(iso) {
      const saved = S.registerState(iso);
      const cur = Object.entries(saved).find(([,v])=>v.trainer);
      const sel = cur ? +cur[0] : null;
      return `<option value="">— none —</option>` + roster.map(p=>{
        const c = trainerCounts[p.id] || 0;
        return `<option value="${p.id}" ${sel===p.id?'selected':''}>#${p.number} ${esc(p.name)}${c?` (won ${c}× this half-term)`:""}</option>`;
      }).join("");
    }
    function renderRows(iso) {
      const saved = S.registerState(iso);
      const hasSaved = Object.keys(saved).length > 0;
      const going = rsvpGoing(iso);
      body.querySelector("#reg-rows").innerHTML = roster.map(p=>{
        // if a register was saved, use it; otherwise prefill attendance from RSVP (coach can override)
        const s = saved[p.id] || { attended: hasSaved ? false : going.has(p.id) };
        const rsvp = going.has(p.id);
        return `<tr>
          <td><b>${esc(p.name)}</b> <span class="muted">#${p.number}</span>${rsvp?` <span class="tag green" style="font-size:.6rem">RSVP'd</span>`:""}</td>
          <td style="text-align:center"><input type="checkbox" class="rg-att" data-p="${p.id}" ${s.attended?"checked":""} style="width:20px;height:20px"/></td>
        </tr>`;
      }).join("");
      const tsel = body.querySelector("#reg-trainer");
      if (tsel) tsel.innerHTML = trainerOpts(iso);
    }
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Take the register for a <b>${esc(S.season)}</b> session. Attendance is +${(cfg.SCORING||{}).trainingAttendance}. Optionally pick <b>Trainer of the Day</b> (+${(cfg.SCORING||{}).trainerOfTheDay}) for best effort. We <b>pre-fill from RSVPs</b> — untick anyone who didn't show. 4-week streaks are awarded automatically.</p>
      ${F("Session date",`<select id="reg-date">${allDates.map(iso=>`<option value="${iso}">${fdateLong(iso)}</option>`).join("")}${allDates.length?"":`<option value="">No sessions found</option>`}</select>`)}
      <div class="badge-row" style="margin:.2rem 0 .8rem">
        <button class="btn btn-ghost btn-sm" id="reg-all">✓ Mark all present</button>
        <button class="btn btn-ghost btn-sm" id="reg-none">Clear all</button>
      </div>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>Player</th><th>Attended</th></tr></thead><tbody id="reg-rows"></tbody></table></div>
      ${F("Trainer of the Day (rotation: everyone once before twice)",`<select id="reg-trainer"></select>`)}
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
        attended: body.querySelector(`.rg-att[data-p="${p.id}"]`).checked
      }));
      const tv = body.querySelector("#reg-trainer").value;
      const trainerId = tv ? +tv : null;
      const res = await S.saveRegister(iso, entries, trainerId);
      if (res.ok) toast("Register saved ✓"); else toast("Error: "+res.msg);
    });
  }

  // ---- Academy Points (coach view): standings, awards, monthly tools ----
  function AdmPoints() {
    const body = $("#admin-body");
    // Coach-only standings (NOT a kid-facing leaderboard) — sorted by season AP.
    const rows = S.roster(true).map(p=>({ player:p, total: p.points||0 })).sort((a,b)=>b.total-a.total);
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const recent = [...(S.state.ledger||[])].filter(e=>e.season===S.season).slice(-12).reverse();
    const month = S.monthId();
    const mover = S.moverOfMonth(month);
    const SC = cfg.SCORING || {};
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Every AP in <b>${esc(S.season)}</b> adds up automatically (matches, register, quiz, challenges, chores). This standings table is a <b>coach-only</b> view — players never see an absolute leaderboard. Use the box below for monthly awards or a correction.</p>
      <div class="grid cols-2" style="align-items:end">
        ${F("Player",`<select id="pt-player">${roster.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
        ${F("AP (use a minus to correct)",`<input type="number" id="pt-pts" value="${SC.captainsAward}"/>`)}
      </div>
      ${F("Reason",`<input id="pt-note" placeholder="e.g. Captain's Award — best teammate"/>`)}
      <div class="badge-row" style="margin:.2rem 0 .6rem">
        <button class="btn btn-ghost btn-sm" id="pt-captains">🧢 Captain's Award (+${SC.captainsAward})</button>
        <button class="btn btn-ghost btn-sm" id="pt-mover">👑 Award Mover of the Month (+${SC.moverOfMonth})</button>
      </div>
      <button class="btn btn-gold btn-block" id="pt-save">Add AP</button>
      ${mover.winner?`<p class="muted" style="font-size:.82rem;margin:.6rem 0 0">This month's top AP-gainer: <b>${esc(safeName(mover.winner.player))}</b> (+${mover.winner.gain}). One tap above awards the +${SC.moverOfMonth} spotlight bonus.</p>`:""}
      ${(()=>{ const quiet=S.quietPlayers(); return quiet.length?`<div class="card" style="background:var(--gold-soft);border:1px solid var(--gold-ring);margin:1.2rem 0 .2rem;padding:.8rem 1rem">
        <div class="lbl" style="font-size:.74rem;color:var(--gold-ink);font-weight:700;letter-spacing:1px;margin:0 0 .35rem">🔇 QUIET-PLAYER WATCH — COACH ONLY</div>
        <p class="muted" style="margin:0 0 .5rem;font-size:.82rem">Bottom-quartile AP <b>and</b> no award in the last 3 weeks. Not a problem with the player — a nudge to spread an award or have a friendly word. Never shown to families.</p>
        <div class="badge-row" style="flex-wrap:wrap">${quiet.map(p=>`<span class="tag gold">${esc(p.name)} <span style="opacity:.8">#${p.number}</span></span>`).join("")}</div>
      </div>`:`<p class="muted" style="font-size:.8rem;margin:1.2rem 0 .2rem">🔇 Quiet-player watch: nobody flagged this week — every player is either out of the bottom quartile or has had a recent award. ✓</p>`; })()}
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">AP STANDINGS — COACH VIEW (${esc(S.season)})</div>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>#</th><th>Player</th><th>Tier</th><th>AP</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.player.name)}</td><td>${esc(S.tierOf(r.player.id).label)}</td><td class="pts">${r.total}</td></tr>`).join("")}</tbody></table></div>
      ${recent.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">RECENT AP <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">— ✕ to undo a mistake</span></div>${recent.map(e=>{const pl=S.player(e.player_id);return `<div class="ach" style="margin-bottom:.3rem;justify-content:space-between"><div>${esc(pl?pl.name:"?")} <span class="muted">· ${esc(e.note||e.category)}</span></div><div style="display:flex;align-items:center;gap:.6rem"><b style="color:var(--gold-bright)">${e.points>0?"+":""}${e.points}</b><button class="btn btn-ghost btn-sm" data-del-pe="${e.id}" title="Undo">✕</button></div></div>`;}).join("")}`:""}
    </div>`;
    body.querySelector("#pt-captains").addEventListener("click", ()=>{ body.querySelector("#pt-pts").value=SC.captainsAward; body.querySelector("#pt-note").value="Captain's Award — best teammate"; });
    body.querySelector("#pt-mover").addEventListener("click", async ()=>{
      if (!mover.winner) return toast("No AP gained yet this month");
      const res = await S.awardMover(mover.winner.playerId, month);
      if (res.ok) { toast(res.dup?"Already awarded this month":"Mover of the Month awarded 👑"); Admin("points"); } else toast("Error: "+res.msg);
    });
    body.querySelector("#pt-save").addEventListener("click", async () => {
      const pid=+body.querySelector("#pt-player").value, pts=+body.querySelector("#pt-pts").value, note=body.querySelector("#pt-note").value.trim();
      if(!pts) return toast("Enter an AP value");
      const res = await S.addManual(pid, pts, note);
      if(res.ok){ toast("AP added ✓"); Admin("points"); } else toast("Error: "+res.msg);
    });
    body.querySelectorAll("[data-del-pe]").forEach(b=>b.addEventListener("click", async ()=>{
      const res = await S.deletePointEvent(+b.dataset.delPe);
      if(res.ok){ toast("Removed ✓"); Admin("points"); } else toast("Error: "+res.msg);
    }));
  }

  // ---- Team sheet: private bench flags + homework status + one-tap override (§1F) ----
  function AdmTeamSheet() {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const week = S.weekId();
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Private coach view for <b>${esc(week)}</b>. A player who hasn't completed homework (challenge + quiz) by the deadline is flagged to <b>start on the bench</b>. Tap <b>Waive</b> for illness, family circumstances or first week back — the gate teaches preparation, it never punishes life. These flags are <b>never shown to families</b> and reset each week.</p>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>Player</th><th>Challenge</th><th>Quiz</th><th>Status</th><th></th></tr></thead>
        <tbody>${roster.map(p=>{
          const ch=S.challengeDoneThisWeek(p.id), qz=S.quizDoneThisWeek(p.id);
          const bench=S.benchFlag(p.id, week), over=S.homeworkOverridden(p.id, week);
          const pattern=S.homeworkPatternFlag(p.id);
          return `<tr>
            <td><b>${esc(p.name)}</b> <span class="muted">#${p.number}</span>${pattern?` <span class="tag green" title="3+ consecutive missed weeks — a conversation with the family, not more deductions">⚑ 3-week pattern</span>`:""}</td>
            <td>${ch?'<span class="tag green">✓</span>':'<span class="tag">—</span>'}</td>
            <td>${qz?'<span class="tag green">✓</span>':'<span class="tag">—</span>'}</td>
            <td>${over?'<span class="tag">Waived</span>':bench?'<span class="tag loss">🪑 Bench start</span>':(ch&&qz?'<span class="tag green">Ready</span>':'<span class="muted">pending</span>')}</td>
            <td>${over?`<button class="btn btn-ghost btn-sm" data-hw-clear="${p.id}">Undo waive</button>`:bench?`<button class="btn btn-dark btn-sm" data-hw-waive="${p.id}">Waive</button>`:''}</td>
          </tr>`;
        }).join("")}</tbody></table></div>
    </div>`;
    body.querySelectorAll("[data-hw-waive]").forEach(b=>b.addEventListener("click", async ()=>{
      const res = await S.overrideHomework(+b.dataset.hwWaive, week);
      if (res.ok) { toast("Waived for this week ✓"); Admin("teamsheet"); } else toast("Error: "+res.msg);
    }));
    body.querySelectorAll("[data-hw-clear]").forEach(b=>b.addEventListener("click", async ()=>{
      const res = await S.clearHomeworkOverride(+b.dataset.hwClear, week);
      if (res.ok) { toast("Waive removed"); Admin("teamsheet"); } else toast("Error: "+res.msg);
    }));
  }

  // ---- Squad Goals editor (§4) ----
  function AdmSquadGoals() {
    const body = $("#admin-body");
    const goals = S.squadGoals();
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Set a shared <b>Squad Goal</b> — a monthly AP target the whole squad works toward together, unlocking a real-world reward (players pick the warm-up, coach does 20 press-ups, pizza fund). Progress is the total AP gained this month.</p>
      <div class="grid cols-2">${F("Goal title",`<input id="sg-title" placeholder="e.g. 2,000 AP in June"/>`)}${F("AP target",`<input type="number" id="sg-target" value="2000"/>`)}</div>
      ${F("Real-world unlock",`<input id="sg-reward" placeholder="e.g. Players pick the warm-up"/>`)}
      <button class="btn btn-gold btn-block" id="sg-add" style="margin-top:.6rem">Add squad goal</button>
      ${goals.length?`<div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">THIS SEASON'S GOALS</div>${goals.map(g=>{const prog=S.squadGoalProgress(g),pct=g.target?Math.min(100,Math.round(prog/g.target*100)):0;return `<div class="ach" style="justify-content:space-between;margin-bottom:.4rem"><div><b>${esc(g.title)}</b> <span class="muted">${prog}/${g.target} AP · 🎁 ${esc(g.reward)}${g.unlocked?' · unlocked':''}</span></div><div style="display:flex;gap:.4rem"><button class="btn btn-ghost btn-sm" data-sg-toggle="${g.id}">${g.unlocked?'Lock':'Unlock'}</button><button class="btn btn-ghost btn-sm" data-sg-del="${g.id}">✕</button></div></div>`;}).join("")}`:""}
    </div>`;
    body.querySelector("#sg-add").addEventListener("click", async ()=>{
      const title=$("#sg-title").value.trim(), target=$("#sg-target").value, reward=$("#sg-reward").value.trim();
      if(!title) return toast("Give the goal a title");
      const res = await S.addSquadGoal({ title, target, reward });
      if(res.ok){ toast("Squad goal added ✓"); Admin("squadgoals"); } else toast("Error: "+res.msg);
    });
    body.querySelectorAll("[data-sg-toggle]").forEach(b=>b.addEventListener("click", async ()=>{
      const g=S.squadGoals().find(x=>x.id===+b.dataset.sgToggle); await S.setSquadGoalUnlocked(g.id, !g.unlocked); Admin("squadgoals");
    }));
    body.querySelectorAll("[data-sg-del]").forEach(b=>b.addEventListener("click", async ()=>{
      await S.deleteSquadGoal(+b.dataset.sgDel); Admin("squadgoals");
    }));
  }

  // ---- Weekly quiz results table (auto-marked; blank = 0, not done) ----
  // ---- Season totals editor (for past seasons where only totals are known) ----
  function AdmSeasonStats() {
    const body = $("#admin-body");
    const players = S.roster(true).sort((a,b)=>a.number-b.number);
    if (!players.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet.</p></div>`; return; }
    const SC = cfg.SCORING || {};
    const num = (id,v)=>`<input type="number" min="0" id="${id}" value="${v}"/>`;
    function load(id) {
      const p = S.player(id); if (!p) return;
      const st = (p.stats && p.stats[S.season]) || {};
      body.querySelector("#ss-fields").innerHTML = `
        <div class="grid cols-2">${F("Goals",num("ss-goals",st.goals||0))}${F("Assists",num("ss-assists",st.assists||0))}</div>
        <div class="grid cols-2">${F("Man of the Match",num("ss-motm",st.motm||0))}${F("Training sessions attended",num("ss-sessions",st.sessions||0))}</div>
        <p class="muted" style="font-size:.84rem;margin:.2rem 0 .6rem">League points are worked out automatically: goals×${SC.goal} + assists×${SC.assist} + MOTM×${SC.motm} + sessions×${SC.trainingAttendance}.</p>
        <button class="btn btn-gold btn-block" id="ss-save">Save ${esc(p.name)}'s ${esc(S.season)} totals</button>`;
      body.querySelector("#ss-save").addEventListener("click", async () => {
        const res = await S.updateSeasonTotals(id, { goals:$("#ss-goals").value, assists:$("#ss-assists").value, motm:$("#ss-motm").value, sessions:$("#ss-sessions").value });
        if (res.ok) toast(`Saved ✓ — ${res.points} league points`); else toast("Error: "+res.msg);
      });
    }
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <p class="muted" style="margin-top:0">Enter each player's totals for <b>${esc(S.season)}</b>. Use this for a <b>past season</b> where you only have the season totals (not who scored in each game) — it fills in their card and the league. <b>For the current season you don't need this</b> — stats build automatically from results, the register and the league.</p>
      ${F("Player",`<select id="ss-player">${players.map(p=>`<option value="${p.id}">#${p.number} ${esc(p.name)}</option>`).join("")}</select>`)}
      <div id="ss-fields"></div>
    </div>`;
    body.querySelector("#ss-player").addEventListener("change", e => load(+e.target.value));
    load(players[0].id);
  }

  function AdmQuizResults() {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const total = S.currentQuiz().questions.length || 0;
    const week = S.weekId();
    const results = S.quizResults(week);
    const done = roster.filter(p=>results[p.id]!=null).length;
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Quiz results for <b>${esc(week)}</b> (${esc(S.season)}). Auto-marked — completion +${(cfg.SCORING||{}).quizComplete} AP, perfect score +${(cfg.SCORING||{}).quizPerfect}. Zero coach admin. ${done}/${roster.length} completed.</p>
      <div class="table-wrap"><table class="league-table"><thead><tr><th>Player</th><th>Score</th><th>AP</th><th>Status</th></tr></thead>
        <tbody>${roster.map(p=>{
          const sc=results[p.id];
          const perfect = sc && sc.correct!=null && sc.total && sc.correct>=sc.total;
          return `<tr><td><b>${esc(p.name)}</b> <span class="muted">#${p.number}</span></td>
            <td class="pts">${sc&&sc.correct!=null?sc.correct:0}${total?` / ${total}`:""}</td>
            <td class="pts">${sc?sc.points:0}</td>
            <td>${sc!=null?`<span class="tag green">Done${perfect?' · Perfect 💯':''}</span>`:`<span class="tag">Not done</span>`}</td></tr>`;
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
        <p class="muted" style="font-size:.82rem;margin:.4rem 0 .2rem">🎬 Videos are now managed in the <b>Videos</b> tab — add a video once and assign it to ${esc(firstNameOf(p))} (or the whole team) there.</p>
        <button class="btn btn-gold btn-block" id="ac-save">Save ${esc(p.name)}'s development</button>`;
      body.querySelector("#ac-save").addEventListener("click", async () => {
        const devObj = {}; DEV_AREAS.forEach(([k]) => devObj[k] = Math.max(0, Math.min(100, +$("#ac-"+k).value || 0)));
        const targets = $("#ac-targets").value.split("\n").map(s=>s.trim()).filter(Boolean);
        const program = $("#ac-plan").value.split("\n").map(s=>s.trim()).filter(Boolean);
        const res = await S.updatePlayerAcademy(id, { dev: devObj, targets, program });
        if (res.ok) toast("Development saved ✓"); else toast("Error: "+res.msg);
      });
    }
    body.innerHTML = `<div class="card pad-lg" style="max-width:640px">
      <p class="muted" style="margin-top:0">Set each player's <b>${esc(S.season)}</b> development progress, targets and plan. Shown on their Academy profile and Development page. (Videos are assigned in the <b>Videos</b> tab.)</p>
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
    const bandTag = b => b ? `<span class="tag" style="font-size:.6rem;margin-left:.3rem">${esc(b)}</span>` : "";
    function qRow(q,i){ return `<div class="ach" style="margin-bottom:.35rem;justify-content:space-between;align-items:flex-start">
      <div><b>${i+1}. ${esc(q.q)}</b>${bandTag(q.band)}${q.topic?bandTag(q.topic):""}${q.corner?bandTag(q.corner):""}<br><span class="muted" style="font-size:.78rem">✓ ${esc(q.opts[q.answer])}</span></div>
      <button class="btn btn-ghost btn-sm" data-rmq="${i}" title="Remove">✕</button></div>`; }
    const cov = S.quizCoverage();
    const covLine = (obj) => Object.entries(obj).map(([k,v])=>`${esc(k)} ${v}`).join(" · ");
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">This week's quiz (<b>${esc(cq.week)}</b>) — ${cq.custom?'<b>a custom set you made</b>':'auto-rotated from the question bank, mixing easy/medium/hard so every reader can score'}. It refreshes on its own each week; here you can shuffle a fresh set, add your own questions, or reset to automatic.</p>
      <div class="card" style="margin-bottom:1rem;background:var(--surface-soft)"><div class="lbl" style="font-size:.7rem;color:var(--muted);font-weight:700;letter-spacing:1px">QUESTION BANK COVERAGE · ${cov.total} QUESTIONS</div>
        <div class="muted" style="font-size:.8rem;margin-top:.3rem"><b>Bands:</b> ${esc(covLine(cov.band))}<br><b>Football topics:</b> ${esc(covLine(cov.topic))}<br><b>Skill corners:</b> ${esc(covLine(cov.corner))}</div></div>
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

  /* ---- Skill Ladder coach check (§2) — station-style, a few taps ----
     Coach picks a player, then for each of the SIX tracks taps Bronze/Silver/Gold
     (awards 25/50/100) or "Personal Best" (+10). Levels are private to the player;
     two Gold checks feed the Icon tier gate (§6). */
  function AdmSkillLadder(pid) {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    if (!roster.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet.</p></div>`; return; }
    const sel = pid ? +pid : roster[0].id;
    const p = S.player(sel) || roster[0];
    const ladder = S.skillLadder(p.id);
    const golds = S.skillGoldCount(p.id);
    const LEVELS = [["bronze","Bronze",(cfg.SCORING||{}).skillBronze],["silver","Silver",(cfg.SCORING||{}).skillSilver],["gold","Gold",(cfg.SCORING||{}).skillGold]];
    const rank = { bronze:1, silver:2, gold:3 };
    const trackRow = (track) => {
      const cur = ladder[track] || { level:null, rank:0, pbs:0 };
      return `<div class="card" style="margin-bottom:.6rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.4rem">
          <div><b>${esc(track)}</b> ${cur.level?`<span class="tag green" style="text-transform:capitalize">${esc(cur.level)}</span>`:'<span class="tag">Not checked</span>'}${cur.pbs?` <span class="muted" style="font-size:.72rem">· ${cur.pbs} PB</span>`:''}</div>
          <button class="btn btn-ghost btn-sm" data-sl-pb="${esc(track)}" title="Beat their own mark">⭐ Personal Best +${(cfg.SCORING||{}).skillPersonalBest}</button>
        </div>
        <div class="badge-row" style="margin-top:.5rem">
          ${LEVELS.map(([k,l,ap])=>{
            const done = (cur.rank||0) >= rank[k];
            return `<button class="btn ${done?'btn-gold':'btn-dark'} btn-sm" data-sl-set="${esc(track)}" data-sl-level="${k}">${done?'✓ ':''}${l} <span style="opacity:.7">+${ap}</span></button>`;
          }).join("")}
        </div>
      </div>`;
    };
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Run the half-term <b>skill checks</b> as a station. Pick a player, then tap the level they reached on each track — <b>Bronze +${(cfg.SCORING||{}).skillBronze}</b>, <b>Silver +${(cfg.SCORING||{}).skillSilver}</b>, <b>Gold +${(cfg.SCORING||{}).skillGold}</b>. "Personal Best" is +${(cfg.SCORING||{}).skillPersonalBest} any time they beat their own mark. Levels are private to each player; <b>2 Gold checks</b> unlock the Icon card.</p>
      ${F("Player",`<select id="sl-player">${roster.map(r=>`<option value="${r.id}" ${r.id===p.id?'selected':''}>#${r.number} ${esc(r.name)}</option>`).join("")}</select>`)}
      <div class="ach" style="justify-content:space-between;margin:.6rem 0 1rem"><div><span class="em">🏅</span> <b>${esc(p.name)}</b></div><span class="tag ${golds>=2?'green':''}">${golds} Gold check${golds===1?'':'s'}${golds>=2?' · Icon ready':''}</span></div>
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.2rem 0 .5rem">SIX TRACKS</div>
      ${S.SKILL_TRACKS.map(trackRow).join("")}
    </div>`;
    $("#sl-player").addEventListener("change", e => location.hash = "#admin/skillladder/"+e.target.value);
    body.querySelectorAll("[data-sl-set]").forEach(b => b.addEventListener("click", async () => {
      const res = await S.recordSkill(p.id, b.dataset.slSet, b.dataset.slLevel);
      if (res.ok) { toast(res.dup ? "Already at that level" : b.dataset.slLevel[0].toUpperCase()+b.dataset.slLevel.slice(1)+" check saved ✓"); AdmSkillLadder(p.id); }
      else toast("Error: "+res.msg);
    }));
    body.querySelectorAll("[data-sl-pb]").forEach(b => b.addEventListener("click", async () => {
      const res = await S.recordPersonalBest(p.id, b.dataset.slPb);
      if (res.ok) { toast("Personal Best! +"+(cfg.SCORING||{}).skillPersonalBest+" ⭐"); AdmSkillLadder(p.id); }
      else toast("Error: "+res.msg);
    }));
  }

  /* ---- Mini-IDP editor (§5): exactly TWO focus areas per half-term (one
     Technical + one other corner), each linked to one drill video, plus one
     sentence of post-match coach feedback. Refreshed each half-term. ---- */
  function AdmIdp(pid) {
    const body = $("#admin-body");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    if (!roster.length) { body.innerHTML = `<div class="card pad-lg"><p class="muted" style="margin:0">No players in the ${esc(S.season)} squad yet.</p></div>`; return; }
    const sel = pid ? +pid : roster[0].id;
    const p = S.player(sel) || roster[0];
    const idp = S.idpFor(p.id);
    const f0 = idp.focus[0] || {}; const f1 = idp.focus[1] || {};
    const corners = S.IDP_CORNERS.filter(c => c.key !== "technical");   // 2nd focus = a DIFFERENT corner
    const focusBlock = (i, f, lockCorner) => `<div class="card" style="margin-bottom:.8rem">
      <div class="lbl" style="font-size:.72rem;color:var(--gold-ink);font-weight:800;letter-spacing:1px;margin-bottom:.4rem">FOCUS ${i+1} · ${lockCorner?'TECHNICAL (required)':'PICK ANOTHER CORNER'}</div>
      ${lockCorner?'':F("Corner",`<select id="idp-corner-${i}">${corners.map(c=>`<option value="${c.key}" ${ (f.corner||'physical')===c.key?'selected':''}>${esc(c.label)}</option>`).join("")}</select>`)}
      ${F("Focus area (one short line)",`<input id="idp-area-${i}" value="${esc(f.area||"")}" placeholder="${lockCorner?'e.g. First touch under pressure':'e.g. Sprint recovery to get back'}"/>`)}
      ${F("Linked drill video (paste a link)",`<input id="idp-url-${i}" value="${esc(f.drillUrl||"")}" placeholder="https://..."/>`)}
      ${F("Drill title (optional)",`<input id="idp-title-${i}" value="${esc(f.drillTitle||"")}" placeholder="e.g. Wall pass control drill"/>`)}
      ${F("Coach feedback after a match (one sentence)",`<input id="idp-fb-${i}" value="${esc(f.feedback||"")}" placeholder="e.g. Much calmer first touch on Sunday — keep it up!"/>`)}
    </div>`;
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Set each player's <b>2 focus areas for this half-term</b> — one <b>Technical</b> plus one from another corner — each linked to one drill video, with a one-sentence coach feedback slot. Shown on the child's Development page as <b>"My focus this half-term"</b>. ${S.idpNeedsRefresh(p.id)?'<span class="tag">Needs refreshing this half-term</span>':'<span class="tag green">Set for this half-term ✓</span>'}</p>
      ${F("Player",`<select id="idp-player">${roster.map(r=>`<option value="${r.id}" ${r.id===p.id?'selected':''}>#${r.number} ${esc(r.name)}</option>`).join("")}</select>`)}
      ${focusBlock(0, f0, true)}
      ${focusBlock(1, f1, false)}
      <button class="btn btn-gold btn-block" id="idp-save">Save ${esc(p.name)}'s focus for this half-term</button>
    </div>`;
    $("#idp-player").addEventListener("change", e => location.hash = "#admin/idp/"+e.target.value);
    $("#idp-save").addEventListener("click", async () => {
      const focus = [0,1].map(i => ({
        corner: i===0 ? "technical" : ($("#idp-corner-"+i)||{}).value || "physical",
        area: ($("#idp-area-"+i)||{}).value || "",
        drillUrl: ($("#idp-url-"+i)||{}).value || "",
        drillTitle: ($("#idp-title-"+i)||{}).value || "",
        feedback: ($("#idp-fb-"+i)||{}).value || ""
      }));
      const res = await S.saveIdp(p.id, focus);
      if (res.ok) { toast("Focus saved ✓"); AdmIdp(p.id); } else toast("Error: "+res.msg);
    });
  }

  function AdmContacts() {
    const body = $("#admin-body");
    const profs = (S.state.profiles || []).filter(pr => pr.parents && pr.parents.length);
    const allEmails = [...new Set(profs.flatMap(pr => pr.parents.map(p=>p.email).filter(Boolean)))];
    const allPhones = [...new Set(profs.flatMap(pr => pr.parents.map(p=>p.phone).filter(Boolean)))];
    const rows = profs.flatMap(pr => {
      const kidIds = (Array.isArray(pr.player_ids) && pr.player_ids.length) ? pr.player_ids : (pr.player_id ? [pr.player_id] : []);
      const childNames = kidIds.map(id => S.player(id)).filter(Boolean).map(c => esc(c.name)).join(", ") || "—";
      return pr.parents.map(par => `<tr>
        <td>${childNames}</td>
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

  function AdmVideos(editId) {
    const body = $("#admin-body");
    const lib = S.state.drills || [];
    const ed = editId ? lib.find(v=>v.id===+editId) : null;
    const v = (k,d)=> ed && ed[k]!=null ? ed[k] : (d||"");
    const roster = S.roster(true).sort((a,b)=>a.number-b.number);
    const isTeam = ed ? ed.team===true : true;
    const assigned = new Set(ed && Array.isArray(ed.player_ids) ? ed.player_ids : []);
    const scopeLabel = d => d.team===true ? `<span class="tag t-train">Whole team</span>`
      : `<span class="tag">${(d.player_ids||[]).map(pid=>{const pl=S.player(pid);return pl?esc(firstNameOf(pl)):"?";}).join(", ")||"unassigned"}</span>`;
    body.innerHTML = `<div class="card pad-lg" style="max-width:640px">
      <h3 style="margin:0 0 .4rem;font-family:var(--display)">${ed?"Edit video":"Add a video"}</h3>
      <p class="muted" style="margin-top:0">Add a video <b>once</b> here, then assign it to the whole team or to specific children — no need to add the same clip twice.</p>
      ${F("Title",`<input id="v-title" value="${esc(v("title"))}" placeholder="e.g. Cone dribbling warm-up"/>`)}
      ${F("Video link (YouTube/Vimeo)",`<input id="v-url" value="${esc(v("url"))}" placeholder="https://youtu.be/..."/>`)}
      ${F("Description",`<textarea id="v-desc" rows="2" placeholder="What it's for / what to focus on">${esc(v("description"))}</textarea>`)}
      ${F("Skill area",`<select id="v-area"><option value="">—</option>${DEV_AREAS.map(([,l])=>`<option ${v("area")===l?'selected':''}>${l}</option>`).join("")}</select>`)}
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:.8rem 0 .4rem">WHO IS IT FOR?</div>
      <label class="field" style="flex-direction:row;align-items:center;gap:.5rem"><input type="radio" name="v-scope" id="v-team" value="team" ${isTeam?"checked":""} style="width:auto"/> <span style="margin:0">🟢 Whole team (Team Training Videos)</span></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:.5rem"><input type="radio" name="v-scope" id="v-indiv" value="indiv" ${!isTeam?"checked":""} style="width:auto"/> <span style="margin:0">👤 Specific children (their My Development)</span></label>
      <div id="v-players" class="${isTeam?'hidden':''}" style="border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;margin:.4rem 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.2rem .8rem">
        ${roster.map(p=>`<label class="field" style="flex-direction:row;align-items:center;gap:.45rem;margin-bottom:.2rem"><input type="checkbox" class="v-pl" value="${p.id}" ${assigned.has(p.id)?"checked":""} style="width:auto"/> <span style="margin:0">#${p.number} ${esc(p.name)}</span></label>`).join("")}
      </div>
      <button class="btn btn-gold btn-block" id="v-save">${ed?"Save changes":"Add to library"}</button>
      ${ed?`<button class="btn btn-ghost btn-sm btn-block" id="v-cancel" style="margin-top:.5rem">Cancel</button>`:""}
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">VIDEO LIBRARY (${lib.length})</div>
      ${lib.length?lib.map(d=>`<div class="ach" style="margin-bottom:.4rem;justify-content:space-between"><div style="display:flex;gap:.6rem;align-items:center"><span class="em">🎬</span><div><b>${esc(d.title)}</b>${d.area?` <span class="tag">${esc(d.area)}</span>`:""}<br>${scopeLabel(d)}</div></div><div style="display:flex;gap:.4rem"><button class="btn btn-ghost btn-sm" data-edit-v="${d.id}">Edit</button><button class="btn btn-ghost btn-sm" data-del-v="${d.id}">✕</button></div></div>`).join(""):`<p class="muted">Library is empty — add your first video above.</p>`}
    </div>`;
    const toggle = () => $("#v-players").classList.toggle("hidden", $("#v-team").checked);
    $("#v-team").addEventListener("change", toggle); $("#v-indiv").addEventListener("change", toggle);
    const collect = () => {
      const team = $("#v-team").checked;
      const player_ids = team ? [] : [...body.querySelectorAll(".v-pl:checked")].map(c=>+c.value);
      return { title:$("#v-title").value.trim(), url:$("#v-url").value.trim(), description:$("#v-desc").value.trim(),
        area:$("#v-area").value, team, player_ids };
    };
    $("#v-save").addEventListener("click", async () => {
      const d = collect();
      if(!d.title||!d.url) return toast("Add a title and a video link");
      if(!d.team && !d.player_ids.length) return toast("Pick at least one child, or choose Whole team");
      const res = ed ? await S.updateDrill(ed.id, d) : await S.addDrill(d);
      if(res.ok){ toast(ed?"Video updated ✓":"Added to library ✓"); Admin("videos"); } else toast("Error: "+res.msg);
    });
    if (ed) $("#v-cancel").addEventListener("click", ()=>location.hash="#admin/videos");
    body.querySelectorAll("[data-edit-v]").forEach(b=>b.addEventListener("click", ()=>location.hash="#admin/videos/"+b.dataset.editV));
    body.querySelectorAll("[data-del-v]").forEach(b => b.addEventListener("click", async () => {
      if(!window.confirm("Delete this video from the library?")) return;
      const res = await S.deleteDrill(+b.dataset.delV);
      if(res.ok){ toast("Removed"); Admin("videos"); } else toast("Error: "+res.msg);
    }));
  }

  function AdmRoster() {
    const body = $("#admin-body");
    const season = S.season;
    const players = [...S.state.players].sort((a,b)=>(a.number||999)-(b.number||999));
    body.innerHTML = `<div class="card pad-lg">
      <p class="muted" style="margin-top:0">Managing the <b>${esc(season)}</b> squad. Tick <b>In ${esc(season)}</b> for the players continuing this season (untick the ones who've left), and tick <b>Signed</b> once a child has registered. <b>Unsigned players are hidden from parents.</b> Switch season from the top bar.</p>
      <div class="table-wrap"><table class="league-table">
        <thead><tr><th>#</th><th>Player</th><th>In ${esc(season)}</th><th>Signed</th><th></th></tr></thead>
        <tbody>${players.map(p=>{
          const inS = (Array.isArray(p.seasons)?p.seasons:[]).includes(season);
          return `<tr>
            <td>${p.number||""}</td>
            <td><b>${esc(p.name)}</b>${p.signed===false?` <span class="tag">pending</span>`:""}</td>
            <td style="text-align:center"><input type="checkbox" data-in="${p.id}" ${inS?"checked":""} style="width:20px;height:20px"/></td>
            <td style="text-align:center"><input type="checkbox" data-signed="${p.id}" ${p.signed!==false?"checked":""} style="width:20px;height:20px"/></td>
            <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-edit-p="${p.id}">Edit</button></td>
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
    body.querySelectorAll("[data-edit-p]").forEach(b => b.addEventListener("click", () => location.hash = "#admin/players/"+b.dataset.editP));
    body.querySelector("[data-go-roster-add]").addEventListener("click", () => location.hash = "#admin/players");
  }

  function AdmPlayer(editId) {
    const ed = editId ? S.player(+editId) : null;
    const POS = ["GK","RB","LB","CB","CDM","CM","CAM","LM","RM","LW","RW","ST"];
    $("#admin-body").innerHTML = `<div class="card pad-lg" style="max-width:620px">
      ${ed ? `<h3 style="margin:0 0 .6rem;font-family:var(--display)">Edit player — ${esc(ed.name)}</h3>`
           : `<p class="muted" style="margin-top:0">Add a new squad member to the <b>${esc(S.season)}</b> season. They start as <b>pending</b> (hidden from parents) — approve them on the <b>Roster</b> tab once they've signed. Their goals, assists, points and stats then build up automatically from results, the register and the league.</p>`}
      ${F("Full name",`<input id="p-name" value="${esc(ed?ed.name:"")}" placeholder="e.g. Sam Kirby"/>`)}
      <div class="grid cols-2">${F("Squad number",`<input type="number" min="1" id="p-num" value="${ed&&ed.number!=null?ed.number:""}"/>`)}${F("Position",`<select id="p-pos">${POS.map(x=>`<option ${ed&&ed.pos===x?'selected':''}>${x}</option>`).join("")}</select>`)}</div>
      <label class="field" style="flex-direction:row;align-items:center;gap:.5rem"><input type="checkbox" id="p-capt" ${ed&&ed.captain?'checked':''} style="width:auto"/> <span style="margin:0">Team captain</span></label>
      <button class="btn btn-gold btn-block" id="p-save">${ed?"Save changes":"Add player"}</button>
      ${ed?`<div class="grid cols-2" style="margin-top:.5rem"><button class="btn btn-ghost btn-sm" id="p-cancel">Cancel</button><button class="btn btn-ghost btn-sm" id="p-del">Delete player</button></div>`:""}
    </div>`;
    $("#p-save").addEventListener("click", async () => {
      const name=$("#p-name").value.trim(); if(!name) return toast("Add a name");
      const init=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const fields = { name, number:+$("#p-num").value, pos:$("#p-pos").value, captain:$("#p-capt").checked, init };
      if (ed) {
        const res = await S.updatePlayer(ed.id, fields);
        if(res.ok){ toast("Player updated ✓"); location.hash="#admin/roster"; } else toast("Error: "+res.msg);
      } else {
        const res = await S.addPlayer(fields);
        if(res.ok){ toast("Player added as pending ✓"); location.hash="#admin/roster"; } else toast("Error: "+res.msg);
      }
    });
    if (ed) {
      $("#p-cancel").addEventListener("click", ()=>location.hash="#admin/roster");
      $("#p-del").addEventListener("click", async ()=>{
        if(!window.confirm(`Delete ${ed.name}? This only works for players with no match/points history.`)) return;
        const res = await S.deletePlayer(ed.id);
        if(res.ok){ toast("Player deleted"); location.hash="#admin/roster"; } else toast(res.msg);
      });
    }
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
          : `<p class="muted" style="margin:.2rem 0">No videos yet — add some on the <b>Videos</b> tab first.</p>`}
        <button class="btn btn-gold btn-block" id="t-save" style="margin-top:1rem">Save session plan</button>
        ${plan.id ? `<button class="btn btn-ghost btn-sm btn-block" id="t-del" style="margin-top:.5rem">Delete this planned session</button>` : ""}`;
      $("#t-save").addEventListener("click", save);
      const del = $("#t-del");
      if (del) del.addEventListener("click", async () => {
        if (!window.confirm("Delete this planned session? The recurring slot (if any) will still show.")) return;
        const res = await S.deleteTraining(plan.id);
        if (res.ok) { toast("Planned session deleted"); Admin("training"); } else toast("Error: "+res.msg);
      });
    }

    async function save() {
      const iso = $("#t-when").value === "__other" ? $("#t-other").value : $("#t-when").value;
      if (!iso) return toast("Pick or enter a date");
      const drills = $("#t-drills").value.split("\n").map(s=>s.trim()).filter(Boolean);
      const ids = [...body.querySelectorAll(".t-vid:checked")].map(c => +c.value);
      const videos = lib.filter(d => ids.includes(d.id)).map(d => ({ title:d.title, url:d.url, area:d.area, description:d.description }));
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

  function AdmEvent(editId) {
    const body = $("#admin-body");
    const ed = editId ? S.state.events.find(e=>e.id===+editId) : null;
    const v = (k,d)=> ed && ed[k]!=null ? ed[k] : (d||"");
    const upcoming = [...S.state.events].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    body.innerHTML = `<div class="card pad-lg" style="max-width:620px">
      <h3 style="margin:0 0 .6rem;font-family:var(--display)">${ed?`Edit event — ${esc(ed.title)}`:"Add an event"}</h3>
      ${F("Title",`<input id="e-title" value="${esc(v("title"))}" placeholder="e.g. Club Awards Afternoon"/>`)}
      <div class="grid cols-2">${F("Date",`<input type="date" id="e-date" value="${esc(v("date"))}"/>`)}${F("Start time (optional)",`<input id="e-time" value="${esc(v("time"))}" placeholder="e.g. 11:00"/>`)}</div>
      <div class="grid cols-2">${F("Location",`<input id="e-loc" value="${esc(v("location"))}" placeholder="e.g. High Elms Golf Course"/>`)}${F("Icon",`<select id="e-img">${[["trophy","🏆 Trophy"],["target","🎯 Fundraiser"],["flag","🏁 Day out"],["cone","🔶 Training/camp"]].map(([k,l])=>`<option value="${k}" ${v("img")===k?'selected':''}>${l}</option>`).join("")}</select>`)}</div>
      ${F("Link (optional)",`<input id="e-link" value="${esc(v("link"))}" placeholder="https://..."/>`)}
      ${F("Details",`<textarea id="e-desc" rows="4" placeholder="What's happening, who's invited, what to bring...">${esc(v("desc"))}</textarea>`)}
      <button class="btn btn-gold btn-block" id="e-save">${ed?"Save changes":"Add event"}</button>
      ${ed?`<button class="btn btn-ghost btn-sm btn-block" id="e-cancel" style="margin-top:.5rem">Cancel</button>`:""}
      <div class="lbl" style="font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:1px;margin:1.2rem 0 .4rem">ALL EVENTS</div>
      ${upcoming.map(e=>`<div class="ach" style="margin-bottom:.35rem;justify-content:space-between"><div>${fdate(e.date)} <b>${esc(e.title)}</b></div><div style="display:flex;gap:.4rem"><button class="btn btn-ghost btn-sm" data-edit-ev="${e.id}">Edit</button><button class="btn btn-ghost btn-sm" data-del-ev="${e.id}">✕</button></div></div>`).join("") || `<p class="muted">No events yet.</p>`}
    </div>`;
    const collect = ()=>({ title:$("#e-title").value.trim(), date:$("#e-date").value, location:$("#e-loc").value.trim(),
      desc:$("#e-desc").value.trim(), time:$("#e-time").value.trim(), link:$("#e-link").value.trim(), img:$("#e-img").value });
    $("#e-save").addEventListener("click", async () => {
      const d = collect(); if(!d.title||!d.date) return toast("Add a title and a date");
      const res = ed ? await S.updateEvent(ed.id, d) : await S.addEvent(d);
      if(res.ok){ toast(ed?"Event updated ✓":"Event added ✓"); Admin("events"); } else toast("Error: "+res.msg);
    });
    if (ed) $("#e-cancel").addEventListener("click", ()=>location.hash="#admin/events");
    body.querySelectorAll("[data-edit-ev]").forEach(b=>b.addEventListener("click", ()=>location.hash="#admin/events/"+b.dataset.editEv));
    body.querySelectorAll("[data-del-ev]").forEach(b=>b.addEventListener("click", async ()=>{
      const e = S.state.events.find(x=>x.id===+b.dataset.delEv);
      if(!window.confirm(`Delete the event "${e.title}"?`)) return;
      const res = await S.deleteEvent(+b.dataset.delEv);
      if(res.ok){ toast("Event deleted"); Admin("events"); } else toast("Error: "+res.msg);
    }));
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
