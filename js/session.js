/* =============================================================
   Loup Garou — session de jeu (hôte ou joueur)
   Hôte  : fait tourner le moteur, diffuse l'état sur "lg-CODE"
   Joueur: écoute "lg-CODE", envoie ses actions sur "lg-CODE-up"
   ============================================================= */
(function () {
  "use strict";
  const Net = window.LGNet;
  const HOST_KEY = "lg.host";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let rt = null;
  const realtime = () => rt || (rt = new Net.Realtime());

  function Session(me, handlers) {
    this.me = me;              // { id, name, av, col }
    this.h = handlers;         // { update(pub, priv), fx(f), status(s), error(k) }
    this.pub = null;
    this.priv = null;
    this.offset = 0;           // horloge hôte - horloge locale
    this.lastSync = 0;
    this.queue = [];
    this.host = null;          // moteur si on est l'hôte
  }
  const P = Session.prototype;

  P.now = function () { return Date.now() + this.offset; };

  /* ================= HÔTE ================= */
  P.createGame = async function () {
    const RT = realtime();
    let code;
    for (let i = 0; i < 6; i++) {
      code = newCode();
      if (!(await this.codeInUse(code))) break;
    }
    const state = window.LG.newState(code, this.me);
    return this.startHost(state);
  };

  // Vérifie qu'aucun hôte n'utilise déjà ce code
  P.codeInUse = function (code) {
    const RT = realtime();
    return new Promise((resolve) => {
      let done = false;
      const ch = RT.channel("lg-" + code, {
        presenceKey: "probe-" + Math.random().toString(36).slice(2),
        onMsg: () => {},
        onPresence: (p) => {
          if (done) return;
          const busy = Object.values(p).some((metas) => metas.some((m) => m.host));
          if (busy) { done = true; ch.leave(); resolve(true); }
        }
      });
      setTimeout(() => { if (!done) { done = true; ch.leave(); resolve(false); } }, 1500);
    });
  };

  P.resumeHost = function (code) {
    try {
      const saved = JSON.parse(localStorage.getItem(HOST_KEY) || "null");
      if (saved && saved.state && saved.state.code === code && saved.state.hostId === this.me.id) return this.startHost(saved.state);
    } catch (e) { /* ignore */ }
    return null;
  };
  P.canResume = function (code) {
    try { const s = JSON.parse(localStorage.getItem(HOST_KEY) || "null"); return !!(s && s.state && s.state.code === code && s.state.hostId === this.me.id); } catch (e) { return false; }
  };

  P.startHost = async function (state) {
    const RT = realtime();
    const E = new window.LG.Engine(state);
    this.host = E;
    this.code = state.code;
    const k = await Net.keys();
    this.hostPub = k.pub;
    E.join(Object.assign({}, this.me, { pk: k.pub }));
    this.sentPriv = {};
    this.lastFull = 0;
    this.fxRate = {};

    this.main = RT.channel("lg-" + state.code, {
      presenceKey: this.me.id, meta: { pid: this.me.id, host: true },
      onMsg: () => {},
      onPresence: (p) => {
        const on = new Set(Object.keys(p));
        E.S.players.forEach((pl) => E.setOnline(pl.id, pl.id === this.me.id || on.has(pl.id)));
        this.dirty();
      },
      onJoin: () => this.flush(true)
    });
    this.up = RT.channel("lg-" + state.code + "-up", {
      presenceKey: "", onMsg: (ev, m) => this.onUp(ev, m)
    });
    RT.on("status", (s) => this.h.status && this.h.status(s ? "ok" : "off"));
    this.timer = setInterval(() => {
      if (E.tick()) this.dirty();
      if (Date.now() - this.lastFull > 4000) this.flush(Date.now() - this.lastFullPriv > 9000);
    }, 250);
    this.lastFullPriv = 0;
    this.dirty();
    return state.code;
  };

  P.onUp = async function (ev, m) {
    const E = this.host;
    if (!m || !m.pid) return;
    try {
      if (ev === "hello") {
        const ok = E.join({ id: m.pid, name: m.name, av: m.av, col: m.col, pk: m.pk || null });
        if (!ok) return;
        delete this.sentPriv[m.pid];
        this.dirty();
      } else if (ev === "act") {
        const p = E.player(m.pid);
        if (!p) return;
        const key = await Net.shared(p.pk);
        if (p.pk && m.e && m.e.p != null) return; // un joueur équipé de clés doit chiffrer
        const a = await Net.open(key, m.e);
        if (!a || (a.ts && Math.abs(Date.now() - a.ts) > 120000)) return;
        if (this.seen && this.seen[a.n]) return;
        (this.seen = this.seen || {})[a.n] = 1;
        E.handle(m.pid, a);
        this.dirty();
      } else if (ev === "fx") {
        const t = Date.now();
        if (t - (this.fxRate[m.pid] || 0) < 350) return;
        if (!E.player(m.pid) || typeof m.e !== "string" || m.e.length > 16) return;
        if (E.S.phase === "night" && E.S.g && E.S.g.alive[m.pid]) return; // la nuit, les vivants dorment

        this.fxRate[m.pid] = t;
        const f = { pid: m.pid, e: m.e };
        this.main.send("fx", f);
        this.h.fx && this.h.fx(f);
      }
    } catch (e) { /* message illisible : ignoré */ }
  };

  // Planifie une diffusion (regroupe les changements rapprochés)
  P.dirty = function () {
    if (this.flushT) return;
    const wait = Math.max(60, 180 - (Date.now() - (this.lastFlush || 0)));
    this.flushT = setTimeout(() => { this.flushT = null; this.flush(false); }, wait);
  };

  P.flush = async function (fullPriv) {
    const E = this.host;
    if (!E) return;
    this.lastFlush = Date.now();
    const pub = E.pub();
    pub.hk = this.hostPub;
    const privs = {};
    const myPriv = E.priv(this.me.id);
    for (const p of E.S.players) {
      if (p.id === this.me.id) continue;
      const pv = E.priv(p.id);
      const s = JSON.stringify(pv);
      if (!fullPriv && this.sentPriv[p.id] === s) continue;
      try {
        const key = await Net.shared(p.pk);
        privs[p.id] = await Net.seal(key, pv);
        this.sentPriv[p.id] = s;
      } catch (e) { /* ignore */ }
    }
    if (fullPriv) this.lastFullPriv = Date.now();
    this.lastFull = Date.now();
    if (this.main) this.main.send("sync", { pub, priv: privs });
    this.apply(pub, myPriv);
    // sauvegarde pour reprendre la partie si la page est rechargée
    try { localStorage.setItem(HOST_KEY, JSON.stringify({ state: E.S, at: Date.now() })); } catch (e) { /* ignore */ }
  };

  /* ================= JOUEUR ================= */
  P.joinGame = async function (code) {
    const RT = realtime();
    this.code = code;
    const k = await Net.keys();
    this.myPub = k.pub;
    this.main = RT.channel("lg-" + code, {
      presenceKey: this.me.id, meta: { pid: this.me.id },
      onMsg: (ev, m) => this.onDown(ev, m),
      onJoin: () => this.hello()
    });
    RT.on("status", (s) => { this.h.status && this.h.status(s ? "ok" : "off"); });
    this.watch = setInterval(() => {
      const quiet = Date.now() - this.lastSync;
      if (this.main.joined && quiet > 3500 && (!this.lastHello || Date.now() - this.lastHello > 3000)) this.hello();
      if (this.h.status) this.h.status(!RT.open ? "off" : this.lastSync && quiet > 12000 ? "nohost" : "ok");
    }, 1000);
    // réponse de l'hôte attendue
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      if (this.pub) return true;
    }
    return !!this.pub;
  };

  P.hello = function () {
    this.lastHello = Date.now();
    Net.post("lg-" + this.code + "-up", "hello", { pid: this.me.id, name: this.me.name, av: this.me.av, col: this.me.col, pk: this.myPub }).catch(() => {});
  };

  P.onDown = async function (ev, m) {
    if (ev === "fx") { if (m && m.pid !== this.me.id) this.h.fx && this.h.fx(m); return; }
    if (ev !== "sync" || !m || !m.pub) return;
    this.lastSync = Date.now();
    const pub = m.pub;
    if (pub.hk) this.hostKey = pub.hk;
    let priv = this.priv;
    const box = m.priv && m.priv[this.me.id];
    if (box) {
      try { priv = await Net.open(await Net.shared(this.hostKey), box); } catch (e) { /* ignore */ }
    }
    // joueur inconnu de l'hôte (exclu ou hôte redémarré) : on se représente
    if (!pub.players.some((p) => p.id === this.me.id) && (!this.lastHello || Date.now() - this.lastHello > 2500)) this.hello();
    this.apply(pub, priv);
    this.drain();
  };

  P.apply = function (pub, priv) {
    if (pub.now) this.offset = pub.now - Date.now();
    if (this.pub && pub.v < this.pub.v && pub.code === this.pub.code) return; // message en retard
    this.pub = pub;
    this.priv = priv || this.priv || {};
    this.h.update && this.h.update(this.pub, this.priv);
  };

  /* ================= ACTIONS ================= */
  let seq = 0;
  P.act = function (a) {
    a = Object.assign({}, a, { n: this.me.id.slice(0, 6) + "-" + Date.now().toString(36) + "-" + (++seq), ts: Date.now() });
    if (this.host) {
      this.host.handle(this.me.id, a);
      this.dirty();
      return;
    }
    this.queue.push(a);
    this.drain();
  };
  P.drain = async function () {
    if (this.draining || !this.queue.length || !this.pub) return;
    this.draining = true;
    try {
      const key = await Net.shared(this.hostKey);
      while (this.queue.length) {
        const a = this.queue[0];
        const e = await Net.seal(key, a);
        let ok = false;
        for (let i = 0; i < 4 && !ok; i++) {
          try { await Net.post("lg-" + this.code + "-up", "act", { pid: this.me.id, e }); ok = true; } catch (err) { await sleep(500 * (i + 1)); }
        }
        this.queue.shift();
      }
    } finally { this.draining = false; }
  };
  P.burst = function (emoji) {
    const f = { pid: this.me.id, e: emoji };
    if (this.host) { this.onUp("fx", f); return; }
    this.h.fx && this.h.fx(f);
    Net.post("lg-" + this.code + "-up", "fx", f).catch(() => {});
  };

  P.leave = function () {
    clearInterval(this.timer); clearInterval(this.watch);
    if (this.main) this.main.leave();
    if (this.up) this.up.leave();
    if (this.host) { try { localStorage.removeItem(HOST_KEY); } catch (e) { /* ignore */ } }
    this.host = null;
  };

  window.LGSession = Session;
})();
