/* =============================================================
   Loup Garou — session de jeu (hôte ou joueur)
   Hôte  : fait tourner le moteur, diffuse l'état signé sur "lg-CODE"
   Joueur: écoute "lg-CODE", envoie ses actions chiffrées sur "lg-CODE-up"

   Sécurité (voir SECURITE.md) :
   • chaque message de l'hôte est signé (ECDSA) ; la clé de l'hôte est
     épinglée à la première connexion, ou vérifiée par l'empreinte du lien ;
   • les actions des joueurs sont chiffrées, sans identifiant en clair et
     de taille fixe ; des messages-leurres sont envoyés la nuit ;
   • les infos privées sont envoyées à tous en même temps, à taille égale :
     impossible de deviner qui vient d'agir ou d'être appelé.
   ============================================================= */
(function () {
  "use strict";
  const Net = window.LGNet;
  const HOST_KEY = "lg.host";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const PID_RE = /^[0-9a-f]{18}$/;
  const BURSTS = ["🐺", "😱", "😂", "🔥", "❤️", "👏", "🤔", "💀", "🌕", "🙏"];
  const ACT_SIZE = 768; // taille fixe des actions chiffrées

  const newCode = () => {
    const r = new Uint32Array(4);
    crypto.getRandomValues(r);
    return Array.from(r, (x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let rt = null;
  const realtime = () => rt || (rt = new Net.Realtime());

  function Session(me, handlers) {
    this.me = me;              // { id, name, av, col }
    this.h = handlers;         // { update(pub, priv), fx(f), status(s) }
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
    const s = await Net.hostSigner();
    this.hostPub = k.pub;
    this.signPub = s.pub;
    this.fp = await Net.fingerprint(s.pub);
    E.join(Object.assign({}, this.me, { pk: k.pub }));
    this.sentPriv = {};
    this.lastFull = 0;
    this.lastFullPriv = 0;
    this.fxRate = {};
    this.seen = new Map();
    this.keyCache = {};
    this.rate = { t: 0, n: 0 };
    this.joins = [];

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
    RT.on("status", (st) => this.h.status && this.h.status(st ? "ok" : "off"));
    this.timer = setInterval(() => {
      if (E.tick()) this.dirty();
      if (Date.now() - this.lastFull > 4000) this.flush(Date.now() - this.lastFullPriv > 9000);
    }, 250);
    this.dirty();
    return state.code;
  };

  // Limite globale : au-delà de 80 messages/s, on ignore (inondation)
  P.overLimit = function () {
    const t = Math.floor(Date.now() / 1000);
    if (this.rate.t !== t) this.rate = { t, n: 0 };
    return ++this.rate.n > 80;
  };

  P.keyFor = async function (p) {
    if (!p.pk) return null;
    if (!this.keyCache[p.id]) this.keyCache[p.id] = await Net.shared(p.pk);
    return this.keyCache[p.id];
  };

  P.onUp = async function (ev, m) {
    const E = this.host;
    if (!E || !m || typeof m !== "object" || this.overLimit()) return;
    try {
      if (ev === "hello") {
        if (!PID_RE.test(m.pid || "") || !Net.validPub(m.pk)) return;
        if (!E.player(m.pid)) {
          // au plus 8 nouveaux joueurs toutes les 10 s (anti-inondation)
          const now = Date.now();
          this.joins = this.joins.filter((x) => now - x < 10000);
          if (this.joins.length >= 8) return;
          this.joins.push(now);
        }
        const ok = E.join({ id: m.pid, name: m.name, av: m.av, col: m.col, pk: m.pk });
        if (!ok) return;
        delete this.sentPriv[m.pid];
        this.dirty();
      } else if (ev === "act") {
        // pas d'identifiant en clair : on retrouve l'auteur grâce à sa clé
        if (!m.e || typeof m.e.i !== "string" || typeof m.e.c !== "string" || m.e.c.length > 8000) return;
        let who = null, a = null;
        for (const p of E.S.players) {
          if (p.id === this.me.id) continue;
          const x = await Net.tryOpen(await this.keyFor(p), m.e);
          if (x && x.pid === p.id) { who = p; a = x; break; }
        }
        if (!who || !a) return;
        if (a.t === "noop") return; // leurre
        if (!a.ts || Math.abs(Date.now() - a.ts) > 120000 || typeof a.n !== "string") return;
        if (this.seen.has(a.n)) return; // rejeu
        this.seen.set(a.n, Date.now());
        if (this.seen.size > 3000) for (const [n, ts] of this.seen) { if (Date.now() - ts > 130000) this.seen.delete(n); }
        delete a._; delete a.pid;
        E.handle(who.id, a);
        this.dirty();
      } else if (ev === "fx") {
        const t = Date.now();
        if (!PID_RE.test(m.pid || "") || !E.player(m.pid) || !BURSTS.includes(m.e)) return;
        if (t - (this.fxRate[m.pid] || 0) < 350) return;
        if (E.S.phase === "night" && E.S.g && E.S.g.alive[m.pid]) return; // la nuit, les vivants dorment
        this.fxRate[m.pid] = t;
        const f = { pid: m.pid, e: m.e };
        const d = JSON.stringify(f);
        this.main.send("fx", { d, s: await Net.sign(d) });
        this.h.fx && this.h.fx(f);
      }
    } catch (e) { /* message illisible : ignoré */ }
  };

  // Planifie une diffusion (regroupe les changements rapprochés)
  P.dirty = function () {
    if (this.flushT) return;
    const wait = Math.max(80, 250 - (Date.now() - (this.lastFlush || 0)));
    this.flushT = setTimeout(() => { this.flushT = null; this.flush(false); }, wait);
  };

  P.flush = async function (fullPriv) {
    const E = this.host;
    if (!E) return;
    this.lastFlush = Date.now();
    const pub = E.pub();
    pub.hk = this.hostPub;
    pub.hs = this.signPub;
    const myPriv = E.priv(this.me.id);
    const narr = E.S.settings.narrator;
    // Vues privées : si l'une change, on les renvoie TOUTES, à taille égale
    const views = {}, strs = {};
    let changed = !!fullPriv;
    for (const p of E.S.players) {
      if (p.id === this.me.id || !p.pk) continue;
      views[p.id] = E.priv(p.id);
      strs[p.id] = JSON.stringify(views[p.id]);
      if (this.sentPriv[p.id] !== strs[p.id]) changed = true;
    }
    let privs = null;
    if (changed) {
      privs = {};
      let size = 0;
      Object.keys(strs).forEach((id) => { if (id !== narr) size = Math.max(size, strs[id].length); });
      for (const id of Object.keys(views)) {
        try {
          const key = await this.keyFor(E.player(id));
          privs[id] = await Net.seal(key, Net.pad(views[id], id === narr ? 0 : size));
          this.sentPriv[id] = strs[id];
        } catch (e) { /* ignore */ }
      }
      this.lastFullPriv = Date.now();
    }
    this.lastFull = Date.now();
    if (this.main) {
      const d = JSON.stringify(privs ? { pub, priv: privs } : { pub });
      try { this.main.send("sync", { d, s: await Net.sign(d) }); } catch (e) { /* ignore */ }
    }
    this.apply(pub, myPriv);
    // sauvegarde pour reprendre la partie si la page est rechargée
    try { localStorage.setItem(HOST_KEY, JSON.stringify({ state: E.S, at: Date.now() })); } catch (e) { /* ignore */ }
  };

  /* ================= JOUEUR ================= */
  P.joinGame = async function (code, fp) {
    const RT = realtime();
    this.code = code;
    this.expectFp = fp || null;
    try { this.pin = JSON.parse(sessionStorage.getItem("lg.pin." + code) || "null"); } catch (e) { this.pin = null; }
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
    this.decoys();
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

  // Vérifie la signature de l'hôte (clé épinglée à la 1re connexion)
  P.verified = async function (m, hs) {
    if (!m || typeof m.d !== "string" || typeof m.s !== "string" || m.d.length > 900000) return false;
    const key = this.pin || hs;
    if (!Net.validPub(key)) return false;
    if (this.pin && hs && (hs.x !== this.pin.x || hs.y !== this.pin.y)) return false; // autre « hôte »
    if (!this.pin && this.expectFp && (await Net.fingerprint(key)) !== this.expectFp) return false;
    if (!(await Net.verify(key, m.d, m.s))) return false;
    if (!this.pin) {
      this.pin = { kty: "EC", crv: "P-256", x: key.x, y: key.y };
      try { sessionStorage.setItem("lg.pin." + this.code, JSON.stringify(this.pin)); } catch (e) { /* ignore */ }
    }
    return true;
  };

  P.onDown = async function (ev, m) {
    let data;
    try { data = JSON.parse(m && m.d); } catch (e) { return; }
    if (!data || typeof data !== "object") return;
    if (ev === "fx") {
      if (!this.pin || !(await this.verified(m, null))) return;
      if (data.pid !== this.me.id && BURSTS.includes(data.e)) this.h.fx && this.h.fx(data);
      return;
    }
    if (ev !== "sync" || !data.pub || data.pub.code !== this.code) return;
    if (!(await this.verified(m, data.pub.hs))) return;
    this.lastSync = Date.now();
    const pub = data.pub;
    if (Net.validPub(pub.hk)) this.hostKey = pub.hk;
    let priv = this.priv;
    const box = data.priv && data.priv[this.me.id];
    if (box) {
      try { priv = await Net.open(await Net.shared(this.hostKey), box); if (priv) delete priv._; } catch (e) { /* ignore */ }
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
  const nonce = () => { const r = new Uint32Array(2); crypto.getRandomValues(r); return r[0].toString(36) + r[1].toString(36) + (++seq); };
  P.act = function (a) {
    a = Object.assign({}, a, { n: nonce(), ts: Date.now() });
    if (this.host) {
      this.host.handle(this.me.id, a);
      this.dirty();
      return;
    }
    this.queue.push(a);
    this.drain();
  };
  P.drain = async function () {
    if (this.draining || !this.queue.length || !this.pub || !this.hostKey) return;
    this.draining = true;
    try {
      const key = await Net.shared(this.hostKey);
      if (!key) return;
      while (this.queue.length) {
        const a = Object.assign({}, this.queue[0], { pid: this.me.id });
        const e = await Net.seal(key, Net.pad(a, ACT_SIZE));
        let ok = false;
        for (let i = 0; i < 4 && !ok; i++) {
          try { await Net.post("lg-" + this.code + "-up", "act", { e }); ok = true; } catch (err) { await sleep(500 * (i + 1)); }
        }
        this.queue.shift();
      }
    } finally { this.draining = false; }
  };
  // La nuit, chaque joueur vivant envoie des messages-leurres indiscernables
  // des vraies actions : on ne peut pas deviner qui est réveillé.
  P.decoys = function () {
    const tick = () => {
      if (this.stopped) return;
      const p = this.pub, g = p && p.g;
      if (p && p.phase === "night" && g && g.alive && g.alive[this.me.id] && this.queue.length < 3) {
        this.queue.push({ t: "noop", n: nonce(), ts: Date.now() });
        this.drain();
      }
      this.decoyT = setTimeout(tick, 2500 + Math.random() * 4500);
    };
    this.decoyT = setTimeout(tick, 2000 + Math.random() * 3000);
  };
  P.burst = function (emoji) {
    if (!BURSTS.includes(emoji)) return;
    const f = { pid: this.me.id, e: emoji };
    if (this.host) { this.onUp("fx", f); return; }
    this.h.fx && this.h.fx(f);
    Net.post("lg-" + this.code + "-up", "fx", f).catch(() => {});
  };
  // Lien d'invitation avec l'empreinte de la clé de l'hôte
  P.fingerprint = function () { return this.host ? this.fp : this.expectFp; };

  P.leave = function () {
    this.stopped = true;
    clearInterval(this.timer); clearInterval(this.watch); clearTimeout(this.decoyT);
    if (this.main) this.main.leave();
    if (this.up) this.up.leave();
    if (this.host) { try { localStorage.removeItem(HOST_KEY); } catch (e) { /* ignore */ } }
    try { sessionStorage.removeItem("lg.pin." + this.code); } catch (e) { /* ignore */ }
    this.host = null;
  };

  window.LGSession = Session;
})();
