/* =============================================================
   Loup Garou — interface
   ============================================================= */
(function () {
  "use strict";
  const LG = window.LG, A = window.LGAudio, I = window.LGI18n;
  const t = (k, p) => I.t(k, p);
  const cfg = window.LG_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const AVATARS = ["🐺", "🦊", "🐻", "🦉", "🐗", "🦌", "🐈‍⬛", "🐇", "🦇", "🐸", "🐴", "🐮", "🐷", "🐔", "🦄", "🐲", "👻", "🎃", "🧙", "🧛", "🧟", "🤠", "👑", "🌙", "⭐", "🔥", "🍄", "🌻", "🍀", "🎭", "💀", "🗡️"];
  const COLORS = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#57cc99", "#4cc9f0", "#4361ee", "#7209b7", "#f72585", "#b5838d", "#c8a24a", "#adb5bd"];
  const BURSTS = ["🐺", "😱", "😂", "🔥", "❤️", "👏", "🤔", "💀", "🌕", "🙏"];
  const REACTS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🐺", "🔥"];
  const CAUSE_ICON = { wolves: "🐺", poison: "☠️", lone: "🌑", vote: "⚖️", hunter: "🎯", love: "💔", dead: "⚰️" };

  /* ---------- Profil ---------- */
  // ?profil=xxx : un joueur distinct par onglet (pour tester à plusieurs sur un seul appareil)
  const PROFILE = (new URLSearchParams(location.search).get("profil") || "").replace(/[^\w-]/g, "").slice(0, 12);
  const ME_KEY = "lg.me" + (PROFILE ? "." + PROFILE : "");
  let me;
  try { me = JSON.parse(localStorage.getItem(ME_KEY) || "null"); } catch (e) { me = null; }
  if (!me || !me.id) {
    const rnd = new Uint8Array(9); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(rnd) : rnd.forEach((_, i) => (rnd[i] = Math.random() * 256));
    me = { id: Array.from(rnd, (b) => b.toString(16).padStart(2, "0")).join(""), name: "", av: AVATARS[Math.floor(Math.random() * AVATARS.length)], col: COLORS[Math.floor(Math.random() * COLORS.length)] };
  }
  const saveMe = () => { try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch (e) { /* ignore */ } };
  saveMe();

  /* ---------- État de l'interface ---------- */
  const ui = {
    screen: "home", sess: null, pub: null, priv: null,
    stepId: null, sel: [], witch: { save: false, kill: null, poisonMode: false },
    chatOpen: false, unread: 0, lastChatId: 0, peek: false, drawer: null,
    lastCue: null, lastBuzz: null, lastToast: null, avatarPick: false, qr: false,
    settingsOpen: true, roleInfo: null, conn: "ok", joining: false, flipped: {},
    hostMenu: false, subtitle: "", wake: null
  };

  /* ---------- Morphing DOM (mises à jour sans casser les animations) ---------- */
  function morphAttrs(a, b) {
    for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  }
  function morphChildren(a, b) {
    const ac = Array.from(a.childNodes), bc = Array.from(b.childNodes);
    for (let i = 0; i < bc.length; i++) {
      const x = ac[i], y = bc[i];
      if (!x) { a.appendChild(y.cloneNode(true)); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.nodeType === 1 && (x.getAttribute("data-k") !== y.getAttribute("data-k")))) {
        a.replaceChild(y.cloneNode(true), x); continue;
      }
      if (x.nodeType === 3 || x.nodeType === 8) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      if (x === document.activeElement && (x.tagName === "INPUT" || x.tagName === "TEXTAREA")) { continue; }
      morphAttrs(x, y);
      if (x.tagName === "INPUT" && x.type !== "checkbox") { if (y.hasAttribute("value") && x.value !== y.getAttribute("value") && x !== document.activeElement) x.value = y.getAttribute("value"); }
      if (x.tagName === "INPUT" && x.type === "checkbox") x.checked = y.hasAttribute("checked");
      if (x.tagName === "SELECT") { morphChildren(x, y); const sel = y.querySelector("option[selected]"); if (sel) x.value = sel.value; continue; }
      morphChildren(x, y);
    }
    for (let i = ac.length - 1; i >= bc.length; i--) a.removeChild(ac[i]);
  }
  function patch(el, html) {
    if (!el) return;
    if (el.__html === html) return;
    el.__html = html;
    const tmp = document.createElement(el.tagName);
    tmp.innerHTML = html;
    morphChildren(el, tmp);
  }

  /* ---------- Raccourcis ---------- */
  const pub = () => ui.pub, priv = () => ui.priv || {};
  const G = () => (ui.pub && ui.pub.g) || null;
  const player = (id) => (ui.pub && ui.pub.players.find((p) => p.id === id)) || null;
  const pname = (id) => { const p = player(id); return p ? p.name : "?"; };
  const isHost = () => ui.pub && ui.pub.hostId === me.id;
  const isNarr = () => ui.pub && ui.pub.settings.narrator === me.id;
  const inGame = () => { const g = G(); return !!(g && g.seat.includes(me.id)); };
  const alive = (id) => { const g = G(); return !!(g && g.alive[id]); };
  const roleName = (r) => t("role." + r);
  const teamOf = (r) => (LG.META[r] || {}).team;
  const act = (a) => ui.sess && ui.sess.act(a);

  function avatar(p, cls) {
    if (!p) return "";
    return `<span class="av ${cls || ""}" style="--c:${esc(p.col)}">${esc(p.av)}</span>`;
  }
  function roleCard(r, opts) {
    opts = opts || {};
    const m = LG.META[r] || {};
    return `<div class="rcard ${opts.cls || ""}" style="--rc:${m.color}" data-k="rc-${r}">
      <img class="rcard-art" src="${LG.art(r)}" alt="">
      <div class="rcard-name">${esc(roleName(r))}</div>
      ${opts.team ? `<div class="rcard-team team-${m.team}">${esc(t("team." + m.team))}</div>` : ""}
    </div>`;
  }

  /* ---------- Narration ---------- */
  function names(ids) { return ids.map(pname).join(", "); }
  function deathLine(d, reveal) {
    let s = t("n.death." + (d.cause === "dead" ? "dead" : d.cause), { name: pname(d.id) });
    if (reveal && d.role) s += " " + t("n.was", { name: pname(d.id), role: roleName(d.role) });
    return s;
  }
  function cueText(c) {
    const p = pub();
    const reveal = p.settings.reveal;
    switch (c.k) {
      case "deal": return t("n.deal");
      case "sleep": return t("n.nightfall");
      case "call": return t("n.call." + c.role);
      case "sleepRole": return t("n.end." + c.role);
      case "wake": {
        const g = G();
        const st = g && g.step && g.step.t === "dawn" ? g.step : null;
        let s = t("n.dawn") + " ";
        const ds = st ? st.deaths : [];
        s += ds.length ? ds.map((d) => deathLine(d, reveal)).join(" ") : t("n.dawn.none");
        if (st && st.raven) s += " " + t("n.raven", { name: pname(st.raven) });
        return s;
      }
      case "hunter": return t("n.hunter", { name: pname(c.pid) });
      case "shot": return c.target ? t("n.shot", { name: pname(c.target) }) : t("n.shot.none");
      case "successor": return t("n.successor", { name: pname(c.pid) });
      case "newMayor": return t("n.newMayor", { name: pname(c.pid) });
      case "mayor": return t("n.mayor");
      case "elected": return t("n.elected", { name: pname(c.pid) });
      case "discuss": return t("n.discuss");
      case "vote": return t("n.vote");
      case "tiebreak": return t("n.tiebreak", { names: names(c.tied || []) });
      case "verdict": {
        const g = G(); const r = g && g.step && g.step.res;
        if (!r) return "";
        if (r.none) return r.tie ? t("n.verdict.tie") : t("n.verdict.none");
        if (r.idiot) return t("n.verdict.idiot", { name: pname(r.id) });
        let s = t("n.verdict.out", { name: pname(r.id) });
        r.deaths.forEach((d) => { s += " " + (d.id === r.id ? (reveal && d.role ? t("n.was", { name: pname(d.id), role: roleName(d.role) }) : "") : deathLine(d, reveal)); });
        return s;
      }
      case "win": return t("n.win." + c.w);
    }
    return "";
  }

  function onCue(c, fresh) {
    if (!c || c.id === ui.lastCue) return;
    ui.lastCue = c.id;
    const text = cueText(c);
    ui.subtitle = text;
    if (!fresh) return; // ancien événement (connexion en cours de partie)
    const p = pub();
    const v = p.settings.voice;
    const speak = !isNarr() && (v === "all" || (v === "host" && isHost()));
    switch (c.k) {
      case "deal": A.play("magic"); break;
      case "sleep": A.play("howl"); A.setAmbient("night"); break;
      case "call": if (c.role === "wolves") A.play("howl", 0.3); break;
      case "wake": A.play("rooster"); A.play("bell", 1.2); A.setAmbient("day"); if ((c.deaths || []).length) A.play("death", 3); break;
      case "shot": A.play("shot"); break;
      case "vote": A.play("drum"); A.setAmbient("vote"); break;
      case "mayor": A.play("drum"); break;
      case "elected": case "newMayor": A.play("reveal"); break;
      case "verdict": A.play("gavel"); { const g = G(); if (g && g.step && g.step.res && g.step.res.deaths && g.step.res.deaths.length) A.play("death", 0.9); } A.setAmbient("day"); break;
      case "win": { const g = G(); A.play(g && g.winners && g.winners.includes(me.id) ? "win" : "lose"); A.setAmbient("lobby"); break; }
    }
    if (c.vib) A.vibrate(c.k === "sleep" ? "sleep" : c.k === "wake" ? "wake" : c.k === "deal" ? "tap" : "tap");
    if (speak && text) A.say(text);
  }

  /* ---------- Réception de l'état ---------- */
  function onUpdate(p, pv) {
    const first = !ui.pub;
    const prevPhase = ui.pub && ui.pub.phase;
    ui.pub = p; ui.priv = pv || {};
    if (ui.screen !== "game" && ui.screen !== "lobby") ui.screen = p.phase === "lobby" ? "lobby" : "game";
    else ui.screen = p.phase === "lobby" ? "lobby" : "game";
    // nouvelle étape : remise à zéro des sélections
    const g = p.g;
    const sid = g && g.step ? g.step.id + ":" + g.step.sub : null;
    if (sid !== ui.stepId) {
      ui.stepId = sid; ui.sel = []; ui.witch = { save: false, kill: null, poisonMode: false };
    }
    // événements sonores / vibrations
    if (p.cue) {
      const age = ui.sess.now() - p.cue.at;
      onCue(p.cue, first ? age < 3000 : age < 15000);
    }
    const b = ui.priv.buzz;
    if (b && ui.lastBuzz !== null && b.id !== ui.lastBuzz) A.vibrate(b.pat);
    if (b) ui.lastBuzz = b.id; else if (ui.lastBuzz === null) ui.lastBuzz = 0;
    const tt = ui.priv.toast;
    if (tt && ui.lastToast !== tt.id) { if (ui.lastToast !== null || !first) toast(t(tt.k, tt.p)); ui.lastToast = tt.id; }
    else if (!tt && ui.lastToast === null) ui.lastToast = 0;
    // ambiance selon la phase
    if (p.phase === "lobby") A.setAmbient("lobby");
    else if (p.phase === "night") A.setAmbient("night");
    else if (p.phase === "day" && !(g && g.step && g.step.t === "vote")) A.setAmbient("day");
    else if (p.phase === "end") A.setAmbient("lobby");
    if (p.phase !== "lobby" && prevPhase === "lobby") { ui.flipped = {}; keepAwake(true); }
    if (p.phase === "lobby") ui.peek = false;
    // non-lus
    const msgs = allChat();
    const lastId = msgs.length ? msgs[msgs.length - 1].id : 0;
    if (lastId > ui.lastChatId) {
      const news = msgs.filter((m) => m.id > ui.lastChatId && m.f && m.f !== me.id);
      if (!first && news.length) { if (!ui.chatOpen && ui.screen === "game") ui.unread += news.length; A.play("pop"); }
      ui.lastChatId = lastId;
    }
    try { sessionStorage.setItem("lg.active", p.code); localStorage.setItem("lg.last", JSON.stringify({ code: p.code, at: Date.now() })); } catch (e) { /* ignore */ }
    render();
  }

  function allChat() {
    const p = pub(); if (!p) return [];
    return p.chat.concat(priv().chat || []).sort((a, b) => a.id - b.id);
  }

  /* ---------- Rendu principal ---------- */
  function render() {
    document.body.dataset.screen = ui.screen;
    const p = pub();
    const g = G();
    let phase = "lobby";
    if (ui.screen === "game" && p) {
      phase = p.phase === "night" ? "night" : p.phase === "end" ? "end" : "day";
      if (g && g.step && g.step.t === "dawn") phase = "dawn";
      if (g && g.step && g.step.t === "nightfall") phase = "dusk";
      if (p.phase === "deal") phase = "deal";
    } else if (ui.screen === "home") phase = "home";
    document.body.dataset.phase = phase;
    document.body.classList.toggle("is-dead", !!(g && inGame() && !alive(me.id) && p.phase !== "end"));
    document.body.classList.toggle("is-narr", !!isNarr());
    const view = $("#view");
    if (ui.screen === "home") patch(view, viewHome());
    else if (ui.screen === "lobby") patch(view, viewLobby());
    else if (ui.screen === "game") patch(view, viewGame());
    renderTop();
    renderChat();
    renderOverlays();
    tickTimers();
  }

  function renderTop() {
    const p = pub();
    const pr = A.prefs();
    const inRoom = ui.screen !== "home" && p;
    patch($("#topbar"), `
      <button class="tb-logo" data-a="${inRoom ? "menu" : "home"}" aria-label="${esc(t("app.title"))}"><span class="moon-ico"></span><span class="tb-title">${esc(t("app.title"))}</span></button>
      ${inRoom ? `<button class="tb-code" data-a="share">${esc(p.code)}</button>` : ""}
      <span class="tb-sp"></span>
      ${ui.conn !== "ok" && inRoom ? `<span class="tb-conn" title="${esc(t("conn." + ui.conn))}">📡</span>` : ""}
      <button class="tb-btn" data-a="sound" aria-label="${esc(t("set.sound"))}">${pr.sound ? "🔊" : "🔇"}</button>
      ${inRoom && ui.screen === "game" ? `<button class="tb-btn tb-chat" data-a="chat" aria-label="${esc(t("chat.title"))}">💬${ui.unread ? `<b class="badge">${ui.unread > 9 ? "9+" : ui.unread}</b>` : ""}</button>` : ""}
      <button class="tb-btn" data-a="prefs" aria-label="${esc(t("set.title"))}">⚙️</button>`);
  }

  /* ================= ACCUEIL ================= */
  function viewHome() {
    let last = null;
    try { last = JSON.parse(localStorage.getItem("lg.last") || "null"); } catch (e) { /* ignore */ }
    const recent = last && Date.now() - last.at < 6 * 3600e3;
    const code = ui.prefill || "";
    return `
    <section class="home" data-k="home">
      <div class="home-hero">
        <h1 class="title"><span>${esc(t("app.title1"))}</span><span class="title-b">${esc(t("app.title2"))}</span></h1>
        <p class="tagline">${esc(t("home.tagline"))}</p>
      </div>
      <div class="panel profile">
        <button class="av-btn" data-a="avatar" aria-label="${esc(t("home.avatar"))}">${avatar(me, "av-xl")}<span class="av-edit">✎</span></button>
        <label class="field"><span>${esc(t("home.name"))}</span>
          <input id="nameIn" maxlength="18" autocomplete="nickname" placeholder="${esc(t("home.namePh"))}" value="${esc(me.name)}"></label>
        ${ui.avatarPick ? `<div class="pick-grid">${AVATARS.map((a) => `<button class="pick ${a === me.av ? "on" : ""}" data-a="setav" data-v="${a}">${a}</button>`).join("")}</div>
          <div class="pick-colors">${COLORS.map((c) => `<button class="dot ${c === me.col ? "on" : ""}" style="--c:${c}" data-a="setcol" data-v="${c}" aria-label="${c}"></button>`).join("")}</div>` : ""}
      </div>
      <div class="panel actions">
        <button class="btn btn-big btn-fire" data-a="create">🔥 ${esc(t("home.create"))}</button>
        <div class="or"><span>${esc(t("home.or"))}</span></div>
        <div class="join-row">
          <input id="codeIn" class="code-in" maxlength="4" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="${esc(t("home.codePh"))}" value="${esc(code)}">
          <button class="btn btn-gold" data-a="join">${esc(t("home.join"))}</button>
        </div>
        ${recent ? `<button class="btn btn-ghost" data-a="resume" data-v="${esc(last.code)}">↩️ ${esc(t("home.resume", { code: last.code }))}</button>` : ""}
      </div>
      <div class="home-links">
        <button class="link" data-a="rules">📜 ${esc(t("home.rules"))}</button>
        ${cfg.leoneUrl ? `<a class="link leone" href="${esc(cfg.leoneUrl)}" target="_blank" rel="noopener">🏠 ${esc(t("home.leone"))}</a>` : ""}
      </div>
      <p class="fine">${esc(t("home.fine"))}</p>
    </section>`;
  }

  /* ================= SALLE D'ATTENTE ================= */
  function viewLobby() {
    const p = pub();
    if (!p) return `<div class="loading">${esc(t("conn.joining"))}</div>`;
    const st = p.settings;
    const host = isHost();
    const playing = p.players.filter((x) => x.id !== st.narrator);
    const total = Object.values(st.roles).reduce((a, b) => a + b, 0);
    const link = joinLink(p.code);
    const roles = LG.ROLE_ORDER.filter((r) => st.roles[r] > 0);
    const wolves = (st.roles.wolf || 0) + (st.roles.lonewolf || 0);
    return `
    <section class="lobby" data-k="lobby">
      <div class="panel code-panel">
        <div class="code-label">${esc(t("lobby.code"))}</div>
        <button class="code-tiles" data-a="share" aria-label="${esc(t("lobby.share"))}">${p.code.split("").map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</button>
        <div class="code-actions">
          <button class="btn btn-sm" data-a="share">📤 ${esc(t("lobby.share"))}</button>
          <button class="btn btn-sm" data-a="qr">${ui.qr ? "✖" : "▦"} QR</button>
        </div>
        ${ui.qr && window.LEONE_QR ? `<div class="qr">${window.LEONE_QR.svg(link, { dark: "#14100c", light: "#f3e3c3" })}</div>` : ""}
      </div>

      <div class="panel">
        <h2>${esc(t("lobby.players"))} <span class="count">${playing.length}</span></h2>
        <div class="plist">
          ${p.players.map((x) => `
            <div class="pl ${x.on ? "" : "off"} ${x.id === me.id ? "me" : ""}" data-k="pl-${x.id}">
              ${avatar(x)}
              <span class="pl-name">${esc(x.name)}</span>
              <span class="pl-tags">${x.id === p.hostId ? `<i title="${esc(t("lobby.host"))}">👑</i>` : ""}${x.id === st.narrator ? `<i title="${esc(t("lobby.narrator"))}">🎙️</i>` : ""}${x.on ? "" : `<i>💤</i>`}</span>
              ${host && x.id !== me.id ? `<button class="pl-x" data-a="kick" data-id="${x.id}" aria-label="${esc(t("lobby.kick"))}">✕</button>` : ""}
            </div>`).join("")}
        </div>
        ${playing.length < LG.MIN_PLAYERS ? `<p class="hint">${esc(t("lobby.needMore", { n: LG.MIN_PLAYERS }))}</p>` : ""}
      </div>

      <div class="panel">
        <h2>${esc(t("lobby.compo"))} <span class="count ${total === playing.length ? "ok" : "bad"}">${total}/${playing.length}</span></h2>
        <div class="compo">${roles.map((r) => `<button class="chip-role" data-a="roleinfo" data-v="${r}" style="--rc:${LG.META[r].color}"><img src="${LG.art(r)}" alt=""><span>${esc(roleName(r))}</span>${st.roles[r] > 1 ? `<b>×${st.roles[r]}</b>` : ""}</button>`).join("")}</div>
        <div class="balance"><span class="b-w" style="flex:${wolves || 0.01}">🐺 ${wolves}</span><span class="b-v" style="flex:${Math.max(total - wolves, 0.01)}">🏡 ${total - wolves}</span></div>
        <div class="opts-sum">
          ${st.narrator ? `<span>🎙️ ${esc(t("lobby.narratorIs", { name: pname(st.narrator) }))}</span>` : `<span>🤖 ${esc(t("lobby.autoNarr"))}</span>`}
          <span>${st.reveal ? "👁️ " + esc(t("opt.revealOn")) : "🙈 " + esc(t("opt.revealOff"))}</span>
          ${st.mayor ? `<span>🎖️ ${esc(t("opt.mayorOn"))}</span>` : ""}
        </div>
      </div>

      ${host ? hostSettings(p, playing.length, total) : `<div class="panel waiting"><div class="wait-fire"></div><p>${esc(t("lobby.waitHost", { name: pname(p.hostId) }))}</p></div>`}

      ${chatPanel("lobby")}
    </section>`;
  }

  function stepper(key, val, min, max, step, unit) {
    return `<div class="stepper"><button data-a="set" data-k2="${key}" data-v="${Math.max(min, val - step)}" ${val <= min ? "disabled" : ""}>−</button><b>${val}${unit || ""}</b><button data-a="set" data-k2="${key}" data-v="${Math.min(max, val + step)}" ${val >= max ? "disabled" : ""}>+</button></div>`;
  }

  function hostSettings(p, nPlaying, total) {
    const st = p.settings;
    const ok = total === nPlaying && nPlaying >= LG.MIN_PLAYERS && (st.roles.wolf + st.roles.lonewolf) > 0;
    return `
    <div class="panel settings">
      <h2>⚙️ ${esc(t("lobby.settings"))}</h2>
      <div class="set-row">
        <span>🎙️ ${esc(t("opt.narrator"))}</span>
        <select data-a="narr">
          <option value="" ${!st.narrator ? "selected" : ""}>${esc(t("opt.narrNone"))}</option>
          ${p.players.map((x) => `<option value="${x.id}" ${st.narrator === x.id ? "selected" : ""}>${esc(x.av + " " + x.name)}</option>`).join("")}
        </select>
      </div>
      <p class="hint">${esc(st.narrator ? t("opt.narrHint") : t("opt.autoHint"))}</p>
      ${st.narrator ? `<label class="set-row"><span>👆 ${esc(t("opt.manual"))}</span><input type="checkbox" data-a="toggle" data-k2="manual" ${st.manual ? "checked" : ""}></label>` : ""}
      <div class="set-row"><span>🗣️ ${esc(t("opt.voice"))}</span>
        <select data-a="voice">
          ${["host", "all", "off"].map((v) => `<option value="${v}" ${st.voice === v ? "selected" : ""}>${esc(t("opt.voice." + v))}</option>`).join("")}
        </select></div>

      <h3>${esc(t("lobby.roles"))}
        <label class="mini-toggle"><input type="checkbox" data-a="toggle" data-k2="auto" ${st.auto ? "checked" : ""}> ${esc(t("opt.auto"))}</label></h3>
      <div class="role-rows">
        ${LG.ROLE_ORDER.map((r) => {
          const n = st.roles[r] || 0, max = LG.ROLES[r].max;
          return `<div class="role-row ${n ? "on" : ""}" style="--rc:${LG.META[r].color}">
            <button class="rr-art" data-a="roleinfo" data-v="${r}"><img src="${LG.art(r)}" alt=""></button>
            <span class="rr-name">${esc(roleName(r))}<small class="team-${LG.META[r].team}">${esc(t("team." + LG.META[r].team))}</small></span>
            <div class="stepper"><button data-a="role" data-v="${r}" data-d="-1" ${n <= 0 ? "disabled" : ""}>−</button><b>${n}</b><button data-a="role" data-v="${r}" data-d="1" ${n >= max ? "disabled" : ""}>+</button></div>
          </div>`;
        }).join("")}
      </div>

      <h3>${esc(t("lobby.options"))}</h3>
      <label class="set-row"><span>👁️ ${esc(t("opt.reveal"))}</span><input type="checkbox" data-a="toggle" data-k2="reveal" ${st.reveal ? "checked" : ""}></label>
      <label class="set-row"><span>🎖️ ${esc(t("opt.mayor"))}</span><input type="checkbox" data-a="toggle" data-k2="mayor" ${st.mayor ? "checked" : ""}></label>
      <div class="set-row"><span>🌙 ${esc(t("opt.nightSec"))}</span>${stepper("nightSec", st.nightSec, 15, 180, 5, "s")}</div>
      <div class="set-row"><span>💬 ${esc(t("opt.discussSec"))}</span>${stepper("discussSec", st.discussSec, 30, 900, 30, "s")}</div>
      <div class="set-row"><span>🗳️ ${esc(t("opt.voteSec"))}</span>${stepper("voteSec", st.voteSec, 20, 300, 10, "s")}</div>

      <button class="btn btn-big btn-fire start" data-a="start" ${ok ? "" : "disabled"}>🌕 ${esc(t("lobby.start"))}</button>
      ${!ok ? `<p class="hint bad">${esc(total !== nPlaying ? t("err.count", { r: total, p: nPlaying }) : nPlaying < LG.MIN_PLAYERS ? t("err.min", { n: LG.MIN_PLAYERS }) : t("err.nowolf"))}</p>` : ""}
    </div>`;
  }

  /* ================= DISCUSSION ================= */
  function chatPanel(where) {
    const p = pub();
    let msgs = allChat();
    if (where === "wolves") msgs = msgs.filter((m) => m.c === "wolves");
    const chan = where === "wolves" ? "wolves" : p && p.phase !== "lobby" && p.phase !== "end" ? priv().chan : "all";
    const canBurst = !(p && p.phase === "night" && inGame() && alive(me.id));
    return `
    <div class="panel chat chat-${where}" data-k="chat-${where}">
      <h2>💬 ${esc(t("chat.title"))} ${chan && chan !== "all" ? `<span class="chan chan-${chan}">${esc(t("chat.chan." + chan))}</span>` : ""}</h2>
      <div class="msgs" id="msgs-${where}">
        ${msgs.length ? msgs.map((m) => msgHtml(m)).join("") : `<p class="empty">${esc(t("chat.empty"))}</p>`}
      </div>
      ${canBurst ? `<div class="bursts">${BURSTS.map((e) => `<button data-a="burst" data-v="${e}">${e}</button>`).join("")}</div>` : ""}
      ${chan ? `<form class="chat-form" data-a="send">
        <input id="chatIn-${where}" maxlength="300" autocomplete="off" placeholder="${esc(t(chan === "wolves" ? "chat.phWolves" : chan === "dead" ? "chat.phDead" : "chat.ph"))}">
        <button class="btn btn-gold" type="submit" aria-label="${esc(t("chat.send"))}">➤</button>
      </form>` : `<p class="hint">${esc(t("chat.sleeping"))}</p>`}
    </div>`;
  }
  function msgHtml(m) {
    if (m.sys) return `<div class="msg sys" data-k="m${m.id}">${esc(t("sys." + m.sys, m.p))}</div>`;
    const p = player(m.f) || { name: "?", av: "❔", col: "#888" };
    const rx = Object.keys(m.r || {});
    return `<div class="msg ${m.f === me.id ? "mine" : ""} c-${m.c}" data-k="m${m.id}">
      ${avatar(p, "av-s")}
      <div class="bubble" data-a="react-open" data-id="${m.id}">
        <b style="color:${esc(p.col)}">${esc(p.name)}${m.c !== "all" ? ` <small>${m.c === "wolves" ? "🐺" : "👻"}</small>` : ""}</b>
        <span>${esc(m.x)}</span>
        ${rx.length ? `<div class="rx">${rx.map((e) => `<button class="${m.r[e].includes(me.id) ? "on" : ""}" data-a="react" data-id="${m.id}" data-v="${e}">${e} ${m.r[e].length}</button>`).join("")}</div>` : ""}
        ${ui.reactFor === m.id ? `<div class="rx-pick">${REACTS.map((e) => `<button data-a="react" data-id="${m.id}" data-v="${e}">${e}</button>`).join("")}</div>` : ""}
      </div>
    </div>`;
  }
  function renderChat() {
    document.querySelectorAll(".msgs").forEach((box) => {
      if (box.__lastCount !== box.childElementCount) { box.__lastCount = box.childElementCount; box.scrollTop = box.scrollHeight; }
    });
  }

  /* ================= PARTIE ================= */
  function timerHtml(step) {
    if (!step || !step.ends) return "";
    return `<div class="timer" data-ends="${step.ends}" data-k="tm-${step.id}-${step.sub}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" class="tr-bg"/><circle cx="18" cy="18" r="16" class="tr-fg" pathLength="100"/></svg><span>…</span></div>`;
  }

  function hud() {
    const p = pub(), g = G();
    const st = g.step || {};
    const label = p.phase === "night" ? `🌙 ${t("hud.night", { n: g.n })}` : p.phase === "day" ? `☀️ ${t("hud.day", { n: g.day })}` : p.phase === "deal" ? `🃏 ${t("hud.deal")}` : `🏁 ${t("hud.end")}`;
    const nAlive = g.seat.filter((id) => g.alive[id]).length;
    return `<div class="hud" data-k="hud">
      <span class="hud-phase">${esc(label)}</span>
      <span class="hud-alive">❤️ ${nAlive}/${g.seat.length}</span>
      ${g.paused ? `<span class="hud-pause">⏸ ${esc(t("hud.paused"))}</span>` : ""}
      ${timerHtml(st)}
    </div>`;
  }

  function viewGame() {
    const p = pub(), g = G();
    if (!p || !g) return `<div class="loading">…</div>`;
    if (isNarr()) return viewNarrator();
    const st = g.step || {};
    let main = "";
    if (p.phase === "end") main = stageEnd();
    else if (!inGame()) main = stageSpectator();
    else if (st.t === "deal") main = stageDeal();
    else if (p.phase === "night") main = stageNight();
    else main = stageDay();
    const dead = inGame() && !alive(me.id) && p.phase !== "end";
    return `<section class="game" data-k="game">
      ${hud()}
      ${dead ? `<div class="dead-ribbon">💀 ${esc(t("game.youDead"))}</div>` : ""}
      ${ui.subtitle && p.phase !== "end" ? `<div class="subtitle" data-k="sub-${ui.lastCue}"><span>📜</span> ${esc(ui.subtitle)}</div>` : ""}
      <div class="stage" data-k="stage-${st.t}-${st.id}">${main}</div>
      ${hostBar()}
      ${inGame() && p.phase !== "end" && st.t !== "deal" ? `<div class="bottom-bar">
        <button class="peek-btn" data-hold="peek">🂠 ${esc(t("game.myRole"))}</button>
        <button class="btn btn-sm" data-a="drawer" data-v="players">👥 ${esc(t("game.players"))}</button>
      </div>` : ""}
    </section>`;
  }

  function hostBar() {
    const p = pub();
    if (!isHost() || isNarr() || p.phase === "end") return "";
    return `<div class="host-bar">
      <button class="btn btn-xs" data-a="hostmenu">👑 ${esc(t("host.menu"))}</button>
      ${ui.hostMenu ? `<div class="host-menu">
        <button class="btn btn-sm" data-a="nskip">⏭ ${esc(t("narr.next"))}</button>
        <button class="btn btn-sm" data-a="nadd">+30s</button>
        <button class="btn btn-sm" data-a="npause">⏯ ${esc(t("narr.pause"))}</button>
        <button class="btn btn-sm btn-danger" data-a="abort">✖ ${esc(t("host.abort"))}</button>
      </div>` : ""}
    </div>`;
  }

  /* --- Distribution & explication de la carte --- */
  function stageDeal() {
    const pv = priv(), g = G();
    const r = pv.role;
    if (!r) return `<div class="center"><div class="card-back spin"></div></div>`;
    const flipped = !!ui.flipped.deal;
    const m = LG.META[r];
    return `<div class="deal">
      <h2 class="stage-title">${esc(t("deal.title"))}</h2>
      <p class="hint">${esc(flipped ? t("deal.hide") : t("deal.tap"))}</p>
      <button class="flip ${flipped ? "is-flipped" : ""}" data-a="flip" aria-label="${esc(t("deal.tap"))}">
        <span class="flip-inner">
          <span class="flip-face back"><img src="${LG.art("back")}" alt=""></span>
          <span class="flip-face front">${roleCard(r, { team: true, cls: "big" })}</span>
        </span>
      </button>
      ${flipped ? `<div class="explain panel" style="--rc:${m.color}">
        <h3>${esc(t("deal.youAre", { role: roleName(r) }))}</h3>
        <p>${esc(t("desc." + r))}</p>
        <p class="goal">🎯 ${esc(t("goal." + m.team))}</p>
        ${pv.pack && pv.pack.length > 1 ? `<p class="pack">🐺 ${esc(t("deal.pack"))} ${pv.pack.filter((x) => x !== me.id).map((x) => avatar(player(x), "av-s") + " " + esc(pname(x))).join(" · ")}</p>` : ""}
        <div class="howto">
          <p>📳 ${esc(t(A.canVibrate() ? "deal.howVib" : "deal.howNoVib"))}</p>
          <p>🙈 ${esc(t("deal.howEyes"))}</p>
          <p>🂠 ${esc(t("deal.howPeek"))}</p>
        </div>
        ${pv.ready ? `<div class="ready-wait"><div class="dots"><i></i><i></i><i></i></div>${esc(t("deal.waiting", { n: g.ready, total: g.seat.length }))}</div>`
          : `<button class="btn btn-big btn-gold" data-a="ready">✓ ${esc(t("deal.ready"))}</button>`}
      </div>` : ""}
    </div>`;
  }

  /* --- Nuit --- */
  function stageNight() {
    const pv = priv(), g = G(), st = g.step || {};
    const me_alive = alive(me.id);
    const a = pv.act;
    let body = "";
    if (me_alive && a && st.sub === "act") body = actionPanel(a);
    else if (me_alive && pv.spy && st.sub === "act") body = spyPanel(pv.spy);
    else if (me_alive && st.t === "lovers" && pv.lover && st.sub === "act") body = loversPanel(pv);
    else {
      const myTurn = me_alive && st.sub === "call" && isMyRoleStep(st.t);
      body = `<div class="sleep ${myTurn ? "wake-up" : ""}">
        <div class="moon-big"></div>
        <h2>${esc(myTurn ? t("night.yourTurn") : st.t === "nightfall" ? t("night.fall") : t("night.closeEyes"))}</h2>
        <p class="hint">${esc(myTurn ? t("night.openEyes") : me_alive ? t("night.wait") : t("night.deadWatch"))}</p>
        ${st.t === "wolves" && st.sub !== "end" ? `<div class="eyes-row"><i></i><i></i><i></i></div>` : ""}
      </div>`;
    }
    // résultat de voyante / renard affiché juste après l'action
    return body;
  }
  function isMyRoleStep(t0) {
    const pv = priv(), r = pv.role;
    if (t0 === "wolves") return LG.isWolf(r);
    if (t0 === "lovers") return !!pv.lover;
    return t0 === r;
  }

  function tile(id, o) {
    o = o || {};
    const p = player(id) || { name: "?", av: "❔", col: "#888" };
    const g = G();
    const dead = g && !g.alive[id];
    const cls = ["tile", o.sel ? "sel" : "", o.dis ? "dis" : "", dead ? "dead" : "", id === me.id ? "me" : "", o.cls || ""].join(" ");
    const badges = [];
    if (g && g.mayor === id) badges.push("🎖️");
    if (g && g.idiots && g.idiots[id]) badges.push("🃏");
    if (o.badge) badges.push(o.badge);
    return `<button class="${cls}" ${o.a && !o.dis ? `data-a="${o.a}" data-id="${id}"` : "disabled"} data-k="t-${id}">
      ${avatar(p)}
      <span class="t-name">${esc(p.name)}${id === me.id ? ` <small>(${esc(t("game.you"))})</small>` : ""}</span>
      ${badges.length ? `<span class="t-badges">${badges.join("")}</span>` : ""}
      ${o.count ? `<span class="t-count">${o.count}</span>` : ""}
      ${o.voters && o.voters.length ? `<span class="t-voters">${o.voters.map((v) => avatar(player(v), "av-xs")).join("")}</span>` : ""}
      ${o.role ? `<span class="t-role"><img src="${LG.art(o.role)}" alt="">${esc(roleName(o.role))}</span>` : ""}
      ${dead && !o.role ? `<span class="t-dead">✝</span>` : ""}
    </button>`;
  }

  function actionPanel(a) {
    const pv = priv(), g = G();
    const lastKnow = (pv.know || []).slice(-1)[0];
    const head = (k, p) => `<div class="act-head" style="--rc:${(LG.META[pv.role] || {}).color}"><img src="${LG.art(pv.role)}" alt=""><div><h2>${esc(t("act." + a.t + ".title", p))}</h2><p>${esc(t("act." + a.t + ".hint", p))}</p></div></div>`;
    switch (a.t) {
      case "seer": case "fox":
        if (a.done && lastKnow && (lastKnow.k === "seer" || lastKnow.k === "fox") && lastKnow.n === g.n) {
          if (lastKnow.k === "seer") return `<div class="act">${head()}<div class="vision">${avatar(player(lastKnow.p), "av-l")}<p>${esc(t("act.seer.result", { name: pname(lastKnow.p) }))}</p>${roleCard(lastKnow.r, { team: true, cls: "reveal-in" })}</div></div>`;
          return `<div class="act">${head()}<div class="vision fox-res ${lastKnow.yes ? "yes" : "no"}"><p>${esc(t(lastKnow.yes ? "act.fox.yes" : "act.fox.no", { names: names(lastKnow.near) }))}</p><div class="big-emo">${lastKnow.yes ? "🐺❗" : "🌿"}</div></div></div>`;
        }
      // falls through
      case "guard": case "raven": case "lonewolf": case "hunter": case "successor": case "tiebreak": {
        if (a.done) return `<div class="act">${head()}<p class="done">✓ ${esc(t("act.done"))}</p></div>`;
        const opts = a.t === "tiebreak" ? a.opts : g.seat.filter((id) => g.alive[id] || false);
        const list = a.t === "tiebreak" ? a.opts : opts;
        const sel = ui.sel[0];
        const skippable = ["raven", "lonewolf"].includes(a.t);
        return `<div class="act">${head()}
          <div class="tiles">${list.map((id) => tile(id, { a: "sel", sel: sel === id, dis: !a.opts.includes(id), badge: a.t === "guard" && a.last === id ? "🚫" : "" })).join("")}</div>
          <div class="act-btns">
            ${skippable ? `<button class="btn" data-a="pick-none">${esc(t("act.skip"))}</button>` : ""}
            <button class="btn btn-gold btn-big" data-a="confirm" ${sel ? "" : "disabled"}>${esc(t("act.confirm"))}${sel ? " · " + esc(pname(sel)) : ""}</button>
          </div></div>`;
      }
      case "cupid": {
        if (a.done) return `<div class="act">${head()}<p class="done">💘 ${esc(t("act.cupid.done", { a: pname(a.cur[0]), b: pname(a.cur[1]) }))}</p></div>`;
        return `<div class="act">${head()}
          <div class="tiles">${a.opts.map((id) => tile(id, { a: "sel2", sel: ui.sel.includes(id), badge: ui.sel.includes(id) ? "💘" : "" })).join("")}</div>
          <div class="act-btns"><button class="btn btn-gold btn-big" data-a="confirm2" ${ui.sel.length === 2 ? "" : "disabled"}>${esc(t("act.confirm"))} (${ui.sel.length}/2)</button></div></div>`;
      }
      case "wolves": {
        const votes = a.votes || {};
        const count = {};
        Object.keys(votes).forEach((w) => { if (votes[w]) (count[votes[w]] = count[votes[w]] || []).push(w); });
        const mine = votes[me.id];
        const caught = (pv.know || []).filter((k) => k.k === "girl" && k.n === g.n).slice(-1)[0];
        return `<div class="act wolves-act">${head()}
          ${caught ? `<div class="alert">👁️ ${esc(t("act.wolves.caught", { name: pname(caught.p) }))}</div>` : ""}
          <div class="tiles">${g.seat.filter((id) => g.alive[id]).map((id) => tile(id, { a: a.opts.includes(id) ? "wolfvote" : null, dis: !a.opts.includes(id), sel: mine === id, voters: count[id], cls: !a.opts.includes(id) ? "packmate" : "", badge: !a.opts.includes(id) ? "🐺" : "" })).join("")}</div>
          <p class="hint">${esc(t("act.wolves.agree"))}</p>
          ${chatPanel("wolves")}
        </div>`;
      }
      case "witch": {
        if (a.done) return `<div class="act">${head()}<p class="done">✓ ${esc(t("act.done"))}</p></div>`;
        const w = ui.witch;
        return `<div class="act witch-act">${head()}
          <div class="witch-victim">${a.victim ? `${avatar(player(a.victim), "av-l")}<p>${esc(t("act.witch.victim", { name: pname(a.victim) }))}</p>` : `<p>${esc(t("act.witch.noVictim"))}</p>`}</div>
          <div class="potions">
            <button class="potion life ${w.save ? "on" : ""}" data-a="w-save" ${a.heal && a.victim && !a.saved ? "" : "disabled"}>🧪<b>${esc(t("act.witch.save"))}</b><small>${esc(a.heal ? t("act.witch.left") : t("act.witch.used"))}</small></button>
            <button class="potion death ${w.poisonMode || w.kill ? "on" : ""}" data-a="w-poison" ${a.poison ? "" : "disabled"}>☠️<b>${esc(t("act.witch.kill"))}</b><small>${esc(a.poison ? t("act.witch.left") : t("act.witch.used"))}</small></button>
          </div>
          ${w.poisonMode ? `<p class="hint">${esc(t("act.witch.pick"))}</p><div class="tiles">${a.opts.map((id) => tile(id, { a: "w-kill", sel: w.kill === id, badge: w.kill === id ? "☠️" : "" })).join("")}</div>` : ""}
          <div class="act-btns"><button class="btn btn-gold btn-big" data-a="w-done">${esc(w.save || w.kill ? t("act.confirm") : t("act.witch.nothing"))}</button></div>
        </div>`;
      }
    }
    return "";
  }

  function spyPanel(spy) {
    return `<div class="act spy-act">
      <div class="act-head" style="--rc:${LG.META.girl.color}"><img src="${LG.art("girl")}" alt=""><div><h2>${esc(t("act.girl.title"))}</h2><p>${esc(t("act.girl.hint"))}</p></div></div>
      <button class="spy-btn ${spy.on ? "on" : ""}" data-hold="spy">👁️<span>${esc(t(spy.on ? "act.girl.spying" : "act.girl.hold"))}</span></button>
      <div class="spy-view ${spy.on ? "on" : ""}">${spy.on ? (spy.see.length ? spy.see.map((id) => `<span class="blur-name">${esc(pname(id))}</span>`).join("") : `<span>${esc(t("act.girl.nothing"))}</span>`) : ""}</div>
      <p class="hint warn">⚠️ ${esc(t("act.girl.risk"))}</p>
    </div>`;
  }
  function loversPanel(pv) {
    return `<div class="act lovers">
      <div class="hearts"><i>💘</i><i>💗</i><i>💕</i></div>
      <h2>${esc(t("lovers.title"))}</h2>
      <div class="lovers-pair">${avatar(me, "av-l")}<span>❤️</span>${avatar(player(pv.lover), "av-l")}</div>
      <p>${esc(t("lovers.text", { name: pname(pv.lover) }))}</p>
    </div>`;
  }

  /* --- Jour --- */
  function stageDay() {
    const p = pub(), pv = priv(), g = G(), st = g.step || {};
    switch (st.t) {
      case "dawn": return stageDawn(st);
      case "mayor": case "vote": return stageVote(st);
      case "discuss": return stageDiscuss(st);
      case "tiebreak": {
        if (pv.act && pv.act.t === "tiebreak") return actionPanel(pv.act);
        return `<div class="center-msg"><div class="big-emo">⚖️</div><h2>${esc(t("tie.title"))}</h2><p>${esc(t("tie.wait", { name: pname(g.mayor), names: names(st.tied || []) }))}</p></div>`;
      }
      case "verdict": return stageVerdict(st);
      case "hunter": case "successor": {
        if (st.sub === "act" && pv.act && pv.act.t === st.t) return actionPanel(pv.act);
        if (st.sub === "end") {
          if (st.t === "hunter") return `<div class="center-msg shot-anim"><div class="big-emo">🎯</div><h2>${esc(st.target ? t("n.shot", { name: pname(st.target) }) : t("n.shot.none"))}</h2>${(st.deaths || []).map((d) => deathCard(d)).join("")}</div>`;
          return `<div class="center-msg"><div class="big-emo">🎖️</div><h2>${esc(t("n.newMayor", { name: pname(st.choice) }))}</h2>${avatar(player(st.choice), "av-xl")}</div>`;
        }
        return `<div class="center-msg"><div class="big-emo">${st.t === "hunter" ? "🎯" : "🎖️"}</div><h2>${esc(t(st.t === "hunter" ? "n.hunter" : "n.successor", { name: pname(st.pid) }))}</h2></div>`;
      }
    }
    return `<div class="center-msg"><div class="sun-big"></div></div>`;
  }

  function deathCard(d) {
    const p = player(d.id);
    const k = "dc-" + d.id;
    return `<div class="death" data-k="${k}">
      <div class="death-av">${avatar(p, "av-l")}<span class="grave">🪦</span></div>
      <div class="death-txt"><b>${esc(pname(d.id))}</b><span>${CAUSE_ICON[d.cause] || "⚰️"} ${esc(t("cause." + d.cause))}</span></div>
      ${d.role ? `<div class="death-role"><img src="${LG.art(d.role)}" alt=""><span>${esc(roleName(d.role))}</span></div>` : ""}
    </div>`;
  }

  function stageDawn(st) {
    const ds = st.deaths || [];
    return `<div class="dawn">
      <div class="sunrise"></div>
      <h2 class="stage-title">${esc(t("dawn.title"))}</h2>
      ${ds.length ? `<div class="deaths">${ds.map((d, i) => `<div style="--d:${1.2 + i * 1.4}s" class="death-wrap">${deathCard(d)}</div>`).join("")}</div>`
        : `<div class="nobody"><div class="big-emo">🌅</div><p>${esc(t("n.dawn.none"))}</p></div>`}
      ${st.raven ? `<div class="raven-note">🪶 ${esc(t("n.raven", { name: pname(st.raven) }))}</div>` : ""}
    </div>`;
  }

  function stageDiscuss(st) {
    const g = G();
    const ready = st.ready || [];
    const canVote = inGame() && alive(me.id) && !(g.idiots && g.idiots[me.id]);
    return `<div class="discuss">
      <h2 class="stage-title">🗣️ ${esc(t("discuss.title"))}</h2>
      <p class="hint">${esc(t("discuss.hint"))}</p>
      <div class="tiles">${g.seat.map((id) => tile(id, { badge: ready.includes(id) ? "✋" : "", role: (g.roles || {})[id] })).join("")}</div>
      ${canVote ? `<button class="btn btn-big ${ready.includes(me.id) ? "btn-on" : "btn-gold"}" data-a="ready">✋ ${esc(t(ready.includes(me.id) ? "discuss.readyOn" : "discuss.ready"))} (${ready.length}/${st.total || 0})</button>` : ""}
    </div>`;
  }

  function stageVote(st) {
    const g = G(), pv = priv();
    const votes = st.votes || {};
    const by = {};
    Object.keys(votes).forEach((v) => (by[votes[v]] = by[votes[v]] || []).push(v));
    const mine = votes[me.id];
    const canVote = inGame() && alive(me.id) && (st.t === "mayor" || !(g.idiots && g.idiots[me.id])) && st.sub === "act";
    const isMayorVote = st.t === "mayor";
    if (isMayorVote && st.sub === "end" && st.elected) {
      return `<div class="center-msg elected"><div class="big-emo">🎖️</div>${avatar(player(st.elected), "av-xl")}<h2>${esc(t("n.elected", { name: pname(st.elected) }))}</h2><p class="hint">${esc(t("mayor.power"))}</p></div>`;
    }
    const weight = (v) => (!isMayorVote && g.mayor === v ? 2 : 1);
    return `<div class="vote">
      <h2 class="stage-title">${isMayorVote ? "🎖️ " + esc(t("mayor.title")) : "⚖️ " + esc(t("vote.title"))}</h2>
      <p class="hint">${esc(isMayorVote ? t("mayor.hint") : t("vote.hint"))}${!isMayorVote && g.mayor && g.alive[g.mayor] ? " " + esc(t("vote.mayorX2")) : ""}</p>
      <div class="tiles">${g.seat.filter((id) => g.alive[id]).map((id) => {
        const vs = by[id] || [];
        let n = vs.reduce((s, v) => s + weight(v), 0);
        if (!isMayorVote && st.raven === id) n += 2;
        return tile(id, { a: canVote && (isMayorVote || id !== me.id) ? "vote" : null, dis: !canVote || (!isMayorVote && id === me.id), sel: mine === id, voters: vs, count: n || "", badge: !isMayorVote && st.raven === id ? "🪶+2" : "" });
      }).join("")}</div>
      <p class="vote-count">${esc(t("vote.progress", { n: st.done || 0, total: st.total || 0 }))}</p>
      ${!canVote && inGame() && alive(me.id) && g.idiots && g.idiots[me.id] ? `<p class="hint">${esc(t("vote.idiot"))}</p>` : ""}
    </div>`;
  }

  function stageVerdict(st) {
    const r = st.res || {};
    if (r.none) return `<div class="center-msg"><div class="big-emo">🤷</div><h2>${esc(r.tie ? t("n.verdict.tie") : t("n.verdict.none"))}</h2></div>`;
    if (r.idiot) return `<div class="center-msg"><div class="big-emo">🃏</div>${avatar(player(r.id), "av-xl")}<h2>${esc(t("n.verdict.idiot", { name: pname(r.id) }))}</h2>${roleCard("idiot", { cls: "reveal-in" })}</div>`;
    return `<div class="verdict">
      <div class="gallows">⚖️</div>
      <h2 class="stage-title">${esc(t("n.verdict.out", { name: pname(r.id) }))}</h2>
      ${r.byMayor ? `<p class="hint">${esc(t("verdict.byMayor"))}</p>` : ""}
      <div class="deaths">${(r.deaths || []).map((d, i) => `<div style="--d:${0.8 + i * 1.4}s" class="death-wrap">${deathCard(d)}</div>`).join("")}</div>
    </div>`;
  }

  function stageSpectator() {
    const g = G();
    return `<div class="center-msg"><div class="big-emo">👀</div><h2>${esc(t("spec.title"))}</h2><p>${esc(t("spec.text"))}</p>
      <div class="tiles">${g.seat.map((id) => tile(id, { role: (g.roles || {})[id] })).join("")}</div></div>`;
  }

  function stageEnd() {
    const g = G();
    const w = g.winner;
    const won = (g.winners || []).includes(me.id);
    const art = { village: "villager", wolves: "wolf", lonewolf: "lonewolf", lovers: "cupid", nobody: "back" }[w] || "back";
    const deathOf = {};
    (g.log || []).forEach((l) => { if (l.k === "death") deathOf[l.p.id] = l.p.cause; });
    return `<div class="end">
      ${won ? `<div class="confetti" data-k="confetti">${Array.from({ length: 60 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 10) / 3}s;--c:${COLORS[i % COLORS.length]};--r:${(i * 53) % 360}deg"></i>`).join("")}</div>` : ""}
      <img class="end-art" src="${LG.art(art)}" alt="">
      <h2 class="end-title">${esc(t("end." + w))}</h2>
      ${inGame() ? `<p class="end-me ${won ? "won" : "lost"}">${esc(t(won ? "end.won" : "end.lost"))}</p>` : ""}
      <div class="tiles end-tiles">${g.seat.map((id) => tile(id, { role: g.roles[id], cls: (g.winners || []).includes(id) ? "winner" : "", badge: (g.lovers || []).includes(id) ? "💘" : deathOf[id] ? CAUSE_ICON[deathOf[id]] : "" })).join("")}</div>
      ${storyHtml(g)}
      <div class="act-btns">
        ${isHost() ? `<button class="btn btn-big btn-fire" data-a="restart">🔁 ${esc(t("end.again"))}</button>` : `<p class="hint">${esc(t("end.waitHost"))}</p>`}
        <button class="btn" data-a="leave">🚪 ${esc(t("end.leave"))}</button>
      </div>
    </div>`;
  }
  function storyHtml(g) {
    const log = (g.log || []).filter((l) => l.k === "death" || l.k === "night");
    if (!log.length) return "";
    return `<details class="panel story"><summary>📖 ${esc(t("end.story"))}</summary><ol>${log.map((l) => l.k === "night"
      ? `<li class="st-night">🌙 ${esc(t("hud.night", { n: l.p.n }))}</li>`
      : `<li>${CAUSE_ICON[l.p.cause] || "⚰️"} ${esc(pname(l.p.id))} — ${esc(t("cause." + l.p.cause))} <i>(${esc(roleName(g.roles[l.p.id]))})</i></li>`).join("")}</ol></details>`;
  }

  /* --- Écran du narrateur --- */
  function viewNarrator() {
    const p = pub(), g = G(), pv = priv(), n = pv.narr || {};
    const st = g.step || {};
    const roles = n.roles || {};
    const acts = n.acts || {};
    const marks = {};
    const mark = (id, e) => { if (id) (marks[id] = marks[id] || []).push(e); };
    if (g.mayor) mark(g.mayor, "🎖️");
    (n.lovers || []).forEach((id) => mark(id, "💘"));
    if (p.phase === "night") {
      if (acts.guard) mark(acts.guard, "🛡️");
      if (acts.victim) mark(acts.victim, "🐺🎯");
      if (acts.save) mark(acts.victim, "🧪");
      if (acts.poison) mark(acts.poison, "☠️");
      if (acts.seer) mark(acts.seer, "🔮");
      if (acts.lone) mark(acts.lone, "🌑");
    }
    if (n.raven) mark(n.raven, "🪶");
    const script = ui.subtitle || cueText(p.cue || {});
    const waiting = st.ends == null && st.t !== "deal" && p.phase !== "end";
    const wolvesLive = st.t === "wolves" ? Object.keys(acts.wolfVotes || {}).map((w) => `${esc(pname(w))} → ${esc(acts.wolfVotes[w] ? pname(acts.wolfVotes[w]) : "…")}`).join("<br>") : "";
    return `<section class="game narr" data-k="narr">
      ${hud()}
      <div class="panel script">
        <div class="script-tag">🎙️ ${esc(t("narr.read"))}</div>
        <p class="script-text">${esc(script || "…")}</p>
        <div class="step-name">${esc(t("narr.step"))} : <b>${esc(stepLabel(st))}</b> ${st.sub ? `<small>(${esc(t("sub." + st.sub))})</small>` : ""}</div>
        ${wolvesLive ? `<div class="narr-live">${wolvesLive}</div>` : ""}
        ${n.spy ? `<div class="narr-live">👁️ ${esc(t("narr.spying"))}</div>` : ""}
        <div class="narr-btns">
          <button class="btn btn-big ${waiting ? "btn-fire pulse" : "btn-gold"}" data-a="nskip">▶ ${esc(t("narr.next"))}</button>
          <button class="btn" data-a="nadd">+30s</button>
          <button class="btn" data-a="npause">⏯</button>
        </div>
        ${p.phase === "end" ? `<button class="btn btn-fire" data-a="restart">🔁 ${esc(t("end.again"))}</button>` : ""}
      </div>
      ${p.phase === "deal" ? `<p class="hint center">${esc(t("deal.waiting", { n: g.ready, total: g.seat.length }))}</p>` : ""}
      <div class="panel">
        <h2>${esc(t("narr.table"))}</h2>
        <div class="tiles narr-tiles">${g.seat.map((id) => tile(id, { role: roles[id], badge: (marks[id] || []).join("") })).join("")}</div>
        <div class="narr-info">
          ${roles && Object.values(roles).includes("witch") ? `<span>🧪 ${n.potions && n.potions.heal ? "✓" : "✗"} ☠️ ${n.potions && n.potions.poison ? "✓" : "✗"}</span>` : ""}
          ${Object.values(roles).includes("elder") ? `<span>🧓 ${esc(t("narr.elderLife", { n: n.elderLife }))}</span>` : ""}
          ${Object.values(roles).includes("fox") ? `<span>🦊 ${n.foxPower ? "✓" : "✗"}</span>` : ""}
          ${n.guardLast ? `<span>🛡️ ${esc(t("narr.guardLast", { name: pname(n.guardLast) }))}</span>` : ""}
        </div>
        ${(n.queue || []).length ? `<p class="hint">${esc(t("narr.next2"))} : ${(n.queue || []).map((q) => esc(stepLabel({ t: q }))).join(" → ")}</p>` : ""}
      </div>
      ${chatPanel("narr")}
    </section>`;
  }
  function stepLabel(st) {
    if (!st || !st.t) return "";
    if (LG.ROLES[st.t]) return roleName(st.t);
    return t("step." + st.t);
  }

  /* ---------- Superpositions ---------- */
  function renderOverlays() {
    const p = pub(), pv = priv();
    let html = "";
    // carte du rôle (maintenir appuyé)
    if (ui.peek && pv.role) {
      html += `<div class="ov peek" data-k="peek">${roleCard(pv.role, { team: true, cls: "big" })}
        <div class="peek-info">
          <p>${esc(t("desc." + pv.role))}</p>
          ${pv.pack && pv.pack.length > 1 ? `<p>🐺 ${esc(t("deal.pack"))} ${esc(pv.pack.filter((x) => x !== me.id).map(pname).join(", "))}</p>` : ""}
          ${pv.lover ? `<p>💘 ${esc(t("lovers.text", { name: pname(pv.lover) }))}</p>` : ""}
          ${pv.potions ? `<p>🧪 ${pv.potions.heal ? "✓" : "✗"} · ☠️ ${pv.potions.poison ? "✓" : "✗"}</p>` : ""}
          ${(pv.know || []).filter((k) => k.k === "seer").map((k) => `<p>🔮 ${esc(pname(k.p))} : ${esc(roleName(k.r))}</p>`).join("")}
          ${(pv.know || []).filter((k) => k.k === "fox").map((k) => `<p>🦊 ${esc(names(k.near))} : ${k.yes ? "🐺" : "🌿"}</p>`).join("")}
          ${pv.caught ? `<p>⚠️ ${esc(t("act.girl.caught"))}</p>` : ""}
        </div></div>`;
    }
    if (ui.drawer === "players" && p && p.g) {
      const g = p.g;
      html += `<div class="ov drawer" data-a="close-ov" data-k="dr-players"><div class="sheet" data-stop="1"><h2>👥 ${esc(t("game.players"))}</h2>
        <div class="tiles">${g.seat.map((id) => tile(id, { role: g.roles[id], badge: player(id) && !player(id).on ? "💤" : "" })).join("")}</div>
        <button class="btn" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
    }
    if (ui.chatOpen && ui.screen === "game") {
      html += `<div class="ov drawer chat-drawer" data-a="close-ov" data-k="dr-chat"><div class="sheet" data-stop="1">${chatPanel("drawer")}<button class="btn" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
    }
    if (ui.roleInfo) {
      const r = ui.roleInfo;
      html += `<div class="ov modal" data-a="close-ov" data-k="ri-${r}"><div class="sheet" data-stop="1">${roleCard(r, { team: true, cls: "big" })}<p>${esc(t("desc." + r))}</p><p class="goal">🎯 ${esc(t("goal." + LG.META[r].team))}</p><button class="btn btn-gold" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
    }
    if (ui.rules) html += rulesHtml();
    if (ui.prefs) html += prefsHtml();
    if (ui.menu) {
      html += `<div class="ov modal" data-a="close-ov" data-k="menu"><div class="sheet" data-stop="1"><h2>${esc(t("app.title"))}</h2>
        <button class="btn" data-a="rules">📜 ${esc(t("home.rules"))}</button>
        <button class="btn" data-a="share">📤 ${esc(t("lobby.share"))}</button>
        ${cfg.leoneUrl ? `<a class="btn" href="${esc(cfg.leoneUrl)}" target="_blank" rel="noopener">🏠 ${esc(t("home.leone"))}</a>` : ""}
        <button class="btn btn-danger" data-a="leave">🚪 ${esc(t("end.leave"))}</button>
        <button class="btn btn-gold" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
    }
    patch($("#overlays"), html);
    const d = document.getElementById("msgs-drawer");
    if (d && ui.chatOpen && !d.__opened) { d.__opened = true; d.scrollTop = d.scrollHeight; }
  }

  function rulesHtml() {
    return `<div class="ov modal rules" data-a="close-ov" data-k="rules"><div class="sheet" data-stop="1">
      <h2>📜 ${esc(t("rules.title"))}</h2>
      <p>${esc(t("rules.intro"))}</p>
      <h3>🌙 ${esc(t("rules.nightT"))}</h3><p>${esc(t("rules.night"))}</p>
      <h3>☀️ ${esc(t("rules.dayT"))}</h3><p>${esc(t("rules.day"))}</p>
      <h3>📳 ${esc(t("rules.phoneT"))}</h3>
      <ul class="vib-legend"><li>〰️ ${esc(t("rules.vibSleep"))}</li><li>〰〰〰 ${esc(t("rules.vibWake"))}</li><li>▬ ▬ ▬ ${esc(t("rules.vibCall"))}</li></ul>
      <p class="hint">${esc(t("rules.ios"))}</p>
      <h3>🎙️ ${esc(t("rules.narrT"))}</h3><p>${esc(t("rules.narr"))}</p>
      <h3>🃏 ${esc(t("rules.rolesT"))}</h3>
      <div class="rules-roles">${LG.ROLE_ORDER.map((r) => `<div class="rr" style="--rc:${LG.META[r].color}"><img src="${LG.art(r)}" alt=""><div><b>${esc(roleName(r))}</b> <small class="team-${LG.META[r].team}">${esc(t("team." + LG.META[r].team))}</small><p>${esc(t("desc." + r))}</p></div></div>`).join("")}</div>
      <button class="btn btn-gold" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
  }
  function prefsHtml() {
    const pr = A.prefs();
    const row = (k, ico) => `<label class="set-row"><span>${ico} ${esc(t("set." + k))}</span><input type="checkbox" data-a="pref" data-k2="${k}" ${pr[k] ? "checked" : ""}></label>`;
    return `<div class="ov modal" data-a="close-ov" data-k="prefs"><div class="sheet" data-stop="1">
      <h2>⚙️ ${esc(t("set.title"))}</h2>
      <div class="set-row"><span>🌐 ${esc(t("set.lang"))}</span><select data-a="lang">${I.LANGS.map((l) => `<option value="${l.code}" ${I.lang() === l.code ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
      ${row("sound", "🔊")}${row("ambient", "🌲")}${A.hasVoice() ? row("voice", "🗣️") : ""}${A.canVibrate() ? row("vib", "📳") : `<p class="hint">📳 ${esc(t("set.noVib"))}</p>`}
      <button class="btn" data-a="testvib">📳 ${esc(t("set.test"))}</button>
      <button class="btn btn-gold" data-a="close-ov">${esc(t("ui.close"))}</button></div></div>`;
  }

  /* ---------- Minuteries ---------- */
  function tickTimers() {
    const now = ui.sess ? ui.sess.now() : Date.now();
    const paused = G() && G().paused;
    document.querySelectorAll(".timer[data-ends]").forEach((el) => {
      const ends = +el.dataset.ends;
      const rem = Math.max(0, ends - now);
      if (!el.__total || rem > el.__total) el.__total = Math.max(rem, 1);
      const s = Math.ceil(rem / 1000);
      const txt = s >= 60 ? Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") : String(s);
      const span = el.querySelector("span");
      if (span.textContent !== txt) {
        span.textContent = paused ? "⏸" : txt;
        if (s <= 5 && s > 0 && !paused && ui.screen === "game" && el.__last !== s) { el.__last = s; if (pub() && pub().phase !== "night") A.play("tick"); }
      }
      el.classList.toggle("low", s <= 10);
      const fg = el.querySelector(".tr-fg");
      if (fg) fg.style.strokeDashoffset = String(100 - (rem / el.__total) * 100);
    });
  }
  setInterval(tickTimers, 250);

  /* ---------- Émojis volants ---------- */
  function onFx(f) {
    const p = player(f.pid);
    const el = document.createElement("div");
    el.className = "fx";
    el.style.setProperty("--x", (8 + Math.random() * 84).toFixed(1) + "vw");
    el.style.setProperty("--w", ((Math.random() - 0.5) * 80).toFixed(0) + "px");
    el.innerHTML = `<span class="fx-e">${esc(f.e)}</span>${p ? `<span class="fx-n">${esc(p.name)}</span>` : ""}`;
    $("#fx").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------- Toasts ---------- */
  let toastT;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("on"), 3200);
  }

  /* ---------- Écran toujours allumé ---------- */
  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator && !ui.wake) {
        ui.wake = await navigator.wakeLock.request("screen");
        ui.wake.addEventListener("release", () => { ui.wake = null; });
      } else if (!on && ui.wake) { ui.wake.release(); ui.wake = null; }
    } catch (e) { /* non supporté */ }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && ui.screen === "game") keepAwake(true); });

  /* ---------- Connexion ---------- */
  function joinLink(code) { return location.origin + location.pathname + "?c=" + code; }
  function urlFor(code) {
    const q = new URLSearchParams();
    if (code) q.set("c", code);
    if (PROFILE) q.set("profil", PROFILE);
    const s = q.toString();
    return location.pathname + (s ? "?" + s : "");
  }

  function readProfile() {
    const n = $("#nameIn");
    if (n) me.name = n.value.trim().slice(0, 18);
    if (!me.name) { toast(t("err.name")); if (n) n.focus(); return false; }
    saveMe();
    return true;
  }

  function newSession() {
    if (ui.sess) ui.sess.leave();
    ui.pub = null; ui.priv = null; ui.lastCue = null; ui.lastBuzz = null; ui.lastToast = null; ui.lastChatId = 0; ui.unread = 0; ui.subtitle = "";
    ui.sess = new window.LGSession(me, {
      update: onUpdate, fx: onFx,
      status: (s) => { if (s !== ui.conn) { ui.conn = s; renderTop(); if (s === "nohost") toast(t("conn.nohost")); } }
    });
    return ui.sess;
  }

  async function createGame() {
    if (!readProfile()) return;
    if (!window.LGNet.configured) return toast(t("err.config"));
    A.unlock();
    ui.joining = true; toast(t("conn.creating"));
    const s = newSession();
    try {
      const code = await s.createGame();
      history.replaceState(null, "", urlFor(code));
      ui.screen = "lobby";
      render();
    } catch (e) { toast(t("err.net")); }
    ui.joining = false;
  }

  async function joinGame(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (code.length !== 4) return toast(t("err.code"));
    if (!readProfile()) return;
    if (!window.LGNet.configured) return toast(t("err.config"));
    A.unlock();
    const s = newSession();
    if (s.canResume(code)) {
      await s.resumeHost(code);
      history.replaceState(null, "", urlFor(code));
      ui.screen = "lobby"; render();
      return;
    }
    toast(t("conn.joining"));
    ui.screen = "lobby"; render();
    const ok = await s.joinGame(code);
    if (!ok) {
      s.leave(); ui.sess = null; ui.screen = "home"; ui.prefill = code;
      try { sessionStorage.removeItem("lg.active"); } catch (e) { /* ignore */ }
      render(); toast(t("err.notFound", { code }));
      return;
    }
    history.replaceState(null, "", urlFor(code));
  }

  function leave() {
    if (ui.sess) ui.sess.leave();
    ui.sess = null; ui.pub = null; ui.priv = null; ui.screen = "home"; ui.menu = false; ui.drawer = null; ui.chatOpen = false;
    try { sessionStorage.removeItem("lg.active"); localStorage.removeItem("lg.last"); } catch (e) { /* ignore */ }
    history.replaceState(null, "", urlFor(""));
    keepAwake(false);
    A.setAmbient(null);
    render();
  }

  async function share() {
    const p = pub(); if (!p) return;
    const url = joinLink(p.code);
    const text = t("lobby.shareText", { code: p.code });
    try {
      if (navigator.share) { await navigator.share({ title: t("app.title"), text, url }); return; }
    } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast(t("lobby.copied")); } catch (e) { toast(url); }
  }

  /* ---------- Interactions ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const stopper = e.target.closest("[data-stop]");
    if (stopper && el.contains(stopper)) return; // clic dans une fenêtre, hors bouton : ne ferme pas
    const a = el.dataset.a, v = el.dataset.v, id = el.dataset.id;
    A.unlock();
    if (["SELECT", "FORM"].includes(el.tagName) || (el.tagName === "INPUT" && el.type === "checkbox")) return;
    switch (a) {
      case "home": if (!ui.sess) render(); break;
      case "menu": ui.menu = true; break;
      case "avatar": ui.avatarPick = !ui.avatarPick; readName(); break;
      case "setav": me.av = v; saveMe(); A.play("select"); readName(); syncProfile(); break;
      case "setcol": me.col = v; saveMe(); A.play("select"); readName(); syncProfile(); break;
      case "create": createGame(); return;
      case "join": joinGame(($("#codeIn") || {}).value); return;
      case "resume": joinGame(v); return;
      case "rules": ui.rules = true; ui.menu = false; break;
      case "prefs": ui.prefs = true; break;
      case "sound": A.setPref("sound", !A.prefs().sound); break;
      case "close-ov": ui.rules = false; ui.prefs = false; ui.roleInfo = null; ui.drawer = null; ui.chatOpen = false; ui.menu = false; ui.reactFor = null; break;
      case "share": share(); return;
      case "qr": ui.qr = !ui.qr; break;
      case "kick": if (confirm(t("lobby.kickConfirm", { name: pname(id) }))) act({ t: "kick", id }); return;
      case "roleinfo": ui.roleInfo = v; A.play("flip"); break;
      case "role": { const st = pub().settings; act({ t: "settings", patch: { roles: { [v]: (st.roles[v] || 0) + +el.dataset.d } } }); A.play("click"); return; }
      case "set": act({ t: "settings", patch: { [el.dataset.k2]: +v } }); A.play("click"); return;
      case "start": A.play("magic"); act({ t: "start" }); return;
      case "burst": ui.sess && ui.sess.burst(v); A.vibrate("tap"); return;
      case "react-open": ui.reactFor = ui.reactFor === +id ? null : +id; break;
      case "react": act({ t: "react", id: +id, e: v }); ui.reactFor = null; A.play("pop"); break;
      case "chat": ui.chatOpen = true; ui.unread = 0; break;
      case "drawer": ui.drawer = v; break;
      case "flip": ui.flipped.deal = !ui.flipped.deal; A.play(ui.flipped.deal ? "reveal" : "flip"); A.vibrate("tap"); break;
      case "ready": act({ t: "ready" }); A.play("select"); return;
      case "sel": ui.sel = ui.sel[0] === id ? [] : [id]; A.play("click"); A.vibrate("tap"); break;
      case "sel2": ui.sel = ui.sel.includes(id) ? ui.sel.filter((x) => x !== id) : ui.sel.concat(id).slice(-2); A.play("click"); A.vibrate("tap"); break;
      case "confirm": if (ui.sel[0]) { act({ t: "pick", ids: [ui.sel[0]] }); A.play("select"); } return;
      case "confirm2": if (ui.sel.length === 2) { act({ t: "pick", ids: ui.sel.slice() }); A.play("select"); } return;
      case "pick-none": act({ t: "pick", ids: [null] }); return;
      case "wolfvote": { const pv = priv(); const cur = pv.act && pv.act.votes && pv.act.votes[me.id]; act({ t: "pick", ids: [cur === id ? null : id] }); A.play("click"); A.vibrate("tap"); return; }
      case "vote": { const st = G().step; const cur = st.votes && st.votes[me.id]; act({ t: "vote", id: cur === id ? null : id }); A.play("click"); A.vibrate("tap"); return; }
      case "w-save": ui.witch.save = !ui.witch.save; A.play("click"); break;
      case "w-poison": ui.witch.poisonMode = !ui.witch.poisonMode; if (!ui.witch.poisonMode) ui.witch.kill = null; A.play("click"); break;
      case "w-kill": ui.witch.kill = ui.witch.kill === id ? null : id; A.play("click"); break;
      case "w-done": act({ t: "witch", save: ui.witch.save, kill: ui.witch.kill }); A.play("select"); return;
      case "nskip": act({ t: "nskip" }); A.play("click"); return;
      case "nadd": act({ t: "nadd" }); return;
      case "npause": act({ t: "npause" }); return;
      case "hostmenu": ui.hostMenu = !ui.hostMenu; break;
      case "abort": if (confirm(t("host.abortConfirm"))) { act({ t: "abort" }); ui.hostMenu = false; } return;
      case "restart": act({ t: "restart" }); return;
      case "leave": if (!pub() || pub().phase === "lobby" || pub().phase === "end" || confirm(t("ui.leaveConfirm"))) leave(); return;
      case "testvib": if (!A.vibrate("call")) toast(t("set.noVib")); return;
      default: return;
    }
    render();
  });

  function readName() { const n = $("#nameIn"); if (n) { me.name = n.value.trim().slice(0, 18); saveMe(); } }
  function syncProfile() { if (ui.sess && pub() && pub().phase === "lobby") act({ t: "profile", name: me.name, av: me.av, col: me.col }); }

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) return;
    const a = el.dataset.a;
    if (a === "narr") act({ t: "settings", patch: { narrator: el.value || null } });
    else if (a === "voice") act({ t: "settings", patch: { voice: el.value } });
    else if (a === "toggle") act({ t: "settings", patch: { [el.dataset.k2]: el.checked } });
    else if (a === "pref") { A.setPref(el.dataset.k2, el.checked); render(); }
    else if (a === "lang") { I.setLang(el.value).then(() => { A.setLang(I.locale()); document.title = t("app.title"); render(); }); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "codeIn") e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "codeIn") joinGame(e.target.value);
    if (e.key === "Enter" && e.target.id === "nameIn") { readName(); syncProfile(); e.target.blur(); }
    if (e.key === "Escape") { ui.rules = ui.prefs = ui.menu = false; ui.roleInfo = null; ui.drawer = null; ui.chatOpen = false; render(); }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-a=send]");
    if (!f) return;
    e.preventDefault();
    const inp = f.querySelector("input");
    const x = inp.value.trim();
    if (!x) return;
    act({ t: "chat", x });
    inp.value = "";
    A.play("pop");
  });
  document.addEventListener("focusout", (e) => { if (e.target.id === "nameIn") { readName(); syncProfile(); } });

  // Maintenir appuyé : voir son rôle / espionner
  function holdStart(e) {
    const el = e.target.closest("[data-hold]");
    if (!el) return;
    e.preventDefault();
    A.unlock();
    if (el.dataset.hold === "peek") { ui.peek = true; A.vibrate("tap"); render(); }
    if (el.dataset.hold === "spy") { act({ t: "spy", on: true }); A.vibrate("tap"); }
    ui.holding = el.dataset.hold;
  }
  function holdEnd() {
    if (!ui.holding) return;
    if (ui.holding === "peek") { ui.peek = false; render(); }
    if (ui.holding === "spy") act({ t: "spy", on: false });
    ui.holding = null;
  }
  document.addEventListener("pointerdown", holdStart);
  ["pointerup", "pointercancel", "blur"].forEach((ev) => window.addEventListener(ev, holdEnd));
  document.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-hold]")) e.preventDefault(); });

  /* ---------- Démarrage ---------- */
  async function boot() {
    await I.init();
    A.setLang(I.locale());
    document.title = t("app.title");
    const params = new URLSearchParams(location.search);
    const code = (params.get("c") || "").toUpperCase();
    let active = null;
    try { active = sessionStorage.getItem("lg.active"); } catch (e) { /* ignore */ }
    if (code) ui.prefill = code;
    render();
    // rechargement de la page en pleine partie : on se reconnecte tout seul
    if (code && active === code && me.name) joinGame(code);
  }
  boot();
})();
