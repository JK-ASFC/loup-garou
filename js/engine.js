/* =============================================================
   Loup Garou — moteur de jeu
   L'appareil de l'hôte fait autorité : il reçoit les actions des
   joueurs, fait avancer la partie et envoie à chacun ce qu'il a le
   droit de voir (vue publique + vue privée chiffrée).
   Aucune dépendance au navigateur : testable avec Node.
   ============================================================= */
(function (root) {
  "use strict";

  /* ---------- Rôles ---------- */
  const ROLES = {
    wolf: { team: "wolves", max: 8 },
    lonewolf: { team: "solo", max: 1 },
    villager: { team: "village", max: 20 },
    seer: { team: "village", max: 1 },
    witch: { team: "village", max: 1 },
    hunter: { team: "village", max: 1 },
    cupid: { team: "village", max: 1 },
    girl: { team: "village", max: 1 },
    guard: { team: "village", max: 1 },
    elder: { team: "village", max: 1 },
    idiot: { team: "village", max: 1 },
    raven: { team: "village", max: 1 },
    fox: { team: "village", max: 1 }
  };
  const ROLE_ORDER = ["wolf", "lonewolf", "seer", "witch", "hunter", "cupid", "guard", "girl", "idiot", "elder", "fox", "raven", "villager"];
  // Ordre de réveil la nuit (les étapes "lovers" et "wolves" ne sont pas des rôles)
  const NIGHT_ORDER = ["cupid", "lovers", "guard", "seer", "fox", "wolves", "lonewolf", "witch", "raven"];
  const NIGHT_STEPS = new Set(NIGHT_ORDER);
  const isWolf = (r) => r === "wolf" || r === "lonewolf";
  const MAX_PLAYERS = 30;
  const MIN_PLAYERS = 3;

  // Seuils (nombre de joueurs) à partir desquels un rôle est proposé automatiquement
  const UNLOCK = { seer: 3, hunter: 5, witch: 6, guard: 7, cupid: 8, girl: 9, idiot: 10, elder: 11, raven: 12, fox: 13, lonewolf: 15 };

  function autoRoles(n) {
    const r = {};
    ROLE_ORDER.forEach((k) => (r[k] = 0));
    if (n <= 0) return r;
    let wolves = n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : n <= 17 ? 4 : Math.round(n / 4.3);
    let used = 0;
    if (n >= UNLOCK.lonewolf) { r.lonewolf = 1; wolves -= 1; used++; }
    r.wolf = Math.max(1, wolves);
    used += r.wolf;
    ["seer", "hunter", "witch", "guard", "cupid", "girl", "idiot", "elder", "raven", "fox"].forEach((k) => {
      if (n >= UNLOCK[k] && used < n) { r[k] = 1; used++; }
    });
    r.villager = Math.max(0, n - used);
    return r;
  }

  function defaultSettings() {
    return {
      roles: autoRoles(0),
      auto: true,          // composition automatique selon le nombre de joueurs
      narrator: null,      // id du joueur narrateur (il ne joue pas)
      manual: true,        // avec narrateur : il fait avancer les étapes lui-même
      voice: "host",       // voix de synthèse : "host" | "all" | "off"
      reveal: true,        // rôle dévoilé à la mort
      mayor: true,         // élection du maire
      nightSec: 40,        // temps d'action d'un rôle la nuit
      discussSec: 180,     // débat du jour
      voteSec: 60          // vote
    };
  }

  function newState(code, host) {
    return {
      code, hostId: host.id, v: 1,
      phase: "lobby",
      players: [], kicked: [],
      settings: defaultSettings(),
      chat: [], msgSeq: 0,
      cue: null, cueSeq: 0,
      toasts: {},
      g: null
    };
  }

  /* ---------- Utilitaires ---------- */
  const clampInt = (v, a, b, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  // Texte nettoyé : sans caractères de contrôle, ni caractères invisibles ou
  // d'inversion de sens (qui permettraient d'usurper un nom à l'affichage)
  const cleanText = (s, max) => String(s == null ? "" : s)
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, max);
  const EMOJI_OK = (e) => typeof e === "string" && e.length > 0 && e.length <= 8 && !/[<>&"'\\\w\s]/.test(e);
  const REACTS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🐺", "🔥"];
  const ID_RE = /^[\w-]{1,40}$/; // identifiants sans caractère HTML

  /* =============================================================
     Moteur
     ============================================================= */
  function Engine(state, opts) {
    opts = opts || {};
    this.S = state;
    this.now = opts.now || (() => Date.now());
    this.rand = opts.rand || Math.random;
  }
  const P = Engine.prototype;

  P.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  P.pick = function (arr) { return arr.length ? arr[Math.floor(this.rand() * arr.length)] : null; };
  P.bump = function () { this.S.v++; };
  P.player = function (id) { return this.S.players.find((p) => p.id === id) || null; };
  P.name = function (id) { const p = this.player(id); return p ? p.name : "?"; };
  P.toast = function (pid, k, p) { this.S.toasts[pid] = { id: (this.S.toasts[pid] ? this.S.toasts[pid].id : 0) + 1, k, p: p || {} }; };

  /* ---------- Joueurs & salle d'attente ---------- */
  P.join = function (info) {
    const S = this.S;
    if (!info || typeof info.id !== "string" || !ID_RE.test(info.id) || S.kicked.includes(info.id)) return false;
    const name = cleanText(info.name, 18) || "?";
    const av = EMOJI_OK(info.av) ? info.av : "🙂";
    const col = /^#[0-9a-f]{6}$/i.test(info.col || "") ? info.col : "#c8a24a";
    let p = this.player(info.id);
    if (p) {
      if (p.pk && info.pk && JSON.stringify(p.pk) !== JSON.stringify(info.pk)) return false; // usurpation
      if (!p.pk && info.pk) p.pk = info.pk;
      if (S.phase === "lobby") { p.name = name; p.av = av; p.col = col; }
      p.on = true;
    } else {
      if (S.players.length >= MAX_PLAYERS) return false;
      p = { id: info.id, name, av, col, pk: info.pk || null, on: true, at: this.now() };
      S.players.push(p);
      if (S.phase === "lobby") this.sysChat("join", { n: name });
      this.syncAutoRoles();
    }
    this.bump();
    return true;
  };

  P.setOnline = function (id, on) {
    const p = this.player(id);
    if (p && p.on !== on) { p.on = on; this.bump(); }
  };

  P.lobbyPlayers = function () {
    const S = this.S;
    return S.players.filter((p) => p.id !== S.settings.narrator);
  };

  P.syncAutoRoles = function () {
    const S = this.S;
    if (S.phase === "lobby" && S.settings.auto) S.settings.roles = autoRoles(this.lobbyPlayers().length);
  };

  P.sysChat = function (k, p) {
    const S = this.S;
    S.chat.push({ id: ++S.msgSeq, f: null, sys: k, p: p || {}, t: this.now(), c: "all", r: {} });
    if (S.chat.length > 200) S.chat.splice(0, S.chat.length - 200);
  };

  /* ---------- Canaux de discussion ---------- */
  P.chatChannelFor = function (pid) {
    const S = this.S, g = S.g;
    if (!g || S.phase === "end") return "all";
    if (pid === S.settings.narrator) return "all";
    if (!(pid in g.roles)) return null;             // spectateur : lecture seule
    if (!g.alive[pid]) return "dead";
    if (S.phase === "night") return isWolf(g.roles[pid]) ? "wolves" : null;
    return "all";
  };
  P.canSee = function (pid, c) {
    const S = this.S, g = S.g;
    if (c === "all") return true;
    if (!g) return false;
    if (pid === S.settings.narrator || S.phase === "end") return true;
    if (c === "wolves") return pid in g.roles && isWolf(g.roles[pid]);
    if (c === "dead") return pid in g.roles && !g.alive[pid]; // pas les spectateurs (anti-triche)
    return false;
  };

  /* ---------- Actions reçues ---------- */
  P.handle = function (pid, a) {
    const S = this.S;
    if (!a || typeof a.t !== "string") return;
    const me = this.player(pid);
    if (!me) return;
    const isHost = pid === S.hostId;
    const isNarr = pid === S.settings.narrator;
    switch (a.t) {
      case "chat": return this.onChat(pid, a);
      case "react": return this.onReact(pid, a);
      case "profile": return this.join({ id: pid, name: a.name, av: a.av, col: a.col, pk: me.pk });
      case "settings": if (isHost && S.phase === "lobby") this.onSettings(a.patch || {}); return;
      case "kick": if (isHost && S.phase === "lobby" && a.id !== S.hostId) this.kick(a.id); return;
      case "start": if (isHost && S.phase === "lobby") this.start(pid); return;
      case "abort": if (isHost && S.phase !== "lobby") this.toLobby(); return;
      case "restart": if (isHost && S.phase === "end") this.toLobby(); return;
      case "nskip": if ((isHost || isNarr) && S.g) this.skip(); return;
      case "nadd": if ((isHost || isNarr) && S.g) this.addTime(30000); return;
      case "npause": if ((isHost || isNarr) && S.g) this.togglePause(); return;
    }
    if (!S.g || S.phase === "lobby" || S.phase === "end") return;
    switch (a.t) {
      case "ready": return this.onReady(pid);
      case "pick": return this.onPick(pid, Array.isArray(a.ids) ? a.ids.slice(0, 2) : []);
      case "witch": return this.onWitch(pid, a);
      case "spy": return this.onSpy(pid, !!a.on);
      case "vote": return this.onVote(pid, a.id == null ? null : a.id);
    }
  };

  P.onChat = function (pid, a) {
    const S = this.S;
    const text = cleanText(a.x, 300);
    if (!text) return;
    let c = this.chatChannelFor(pid);
    if (!c) return;
    if (a.c === "dead" && c === "dead") c = "dead";
    const last = S.chat.filter((m) => m.f === pid).slice(-1)[0];
    if (last && this.now() - last.t < 400) return; // anti-spam
    S.chat.push({ id: ++S.msgSeq, f: pid, x: text, t: this.now(), c, r: {} });
    if (S.chat.length > 200) S.chat.splice(0, S.chat.length - 200);
    this.bump();
  };

  P.onReact = function (pid, a) {
    const m = this.S.chat.find((x) => x.id === a.id);
    if (!m || !REACTS.includes(a.e) || !this.canSee(pid, m.c) || !this.chatChannelFor(pid)) return;
    const list = m.r[a.e] || (m.r[a.e] = []);
    const i = list.indexOf(pid);
    if (i >= 0) list.splice(i, 1); else list.push(pid);
    if (!list.length) delete m.r[a.e];
    if (Object.keys(m.r).length > 8) return;
    this.bump();
  };

  P.onSettings = function (patch) {
    const st = this.S.settings;
    if ("auto" in patch) st.auto = !!patch.auto;
    if (patch.roles && typeof patch.roles === "object") {
      st.auto = false;
      for (const k of Object.keys(ROLES)) if (k in patch.roles) st.roles[k] = clampInt(patch.roles[k], 0, ROLES[k].max, st.roles[k] || 0);
    }
    if ("narrator" in patch) {
      const id = patch.narrator;
      st.narrator = id && this.player(id) ? id : null;
      if (st.narrator) st.voice = "off"; else if (st.voice === "off") st.voice = "host";
    }
    if ("manual" in patch) st.manual = !!patch.manual;
    if ("voice" in patch && ["host", "all", "off"].includes(patch.voice)) st.voice = patch.voice;
    if ("reveal" in patch) st.reveal = !!patch.reveal;
    if ("mayor" in patch) st.mayor = !!patch.mayor;
    if ("nightSec" in patch) st.nightSec = clampInt(patch.nightSec, 15, 180, 40);
    if ("discussSec" in patch) st.discussSec = clampInt(patch.discussSec, 30, 900, 180);
    if ("voteSec" in patch) st.voteSec = clampInt(patch.voteSec, 20, 300, 60);
    this.syncAutoRoles();
    this.bump();
  };

  P.kick = function (id) {
    const S = this.S;
    const p = this.player(id);
    if (!p) return;
    S.players = S.players.filter((x) => x.id !== id);
    S.kicked.push(id);
    if (S.settings.narrator === id) S.settings.narrator = null;
    this.sysChat("kick", { n: p.name });
    this.syncAutoRoles();
    this.bump();
  };

  P.roleTotal = function () {
    const r = this.S.settings.roles;
    return Object.keys(r).reduce((s, k) => s + (r[k] || 0), 0);
  };

  P.start = function (pid) {
    const S = this.S;
    this.syncAutoRoles();
    const players = this.lobbyPlayers();
    const roles = S.settings.roles;
    const total = this.roleTotal();
    if (players.length < MIN_PLAYERS) return this.toast(pid, "err.min", { n: MIN_PLAYERS });
    if (total !== players.length) return this.toast(pid, "err.count", { r: total, p: players.length });
    if ((roles.wolf || 0) + (roles.lonewolf || 0) < 1) return this.toast(pid, "err.nowolf");
    const deck = [];
    for (const k of ROLE_ORDER) for (let i = 0; i < (roles[k] || 0); i++) deck.push(k);
    const shuffled = this.shuffle(deck);
    const seat = this.shuffle(players.map((p) => p.id)); // ordre autour de la table (voisins du renard)
    const g = {
      n: 0, day: 0, roles: {}, alive: {}, seat,
      lovers: null, mayor: null, idiots: {}, elderLife: 1,
      potions: { heal: true, poison: true }, guardLast: null, foxPower: true,
      raven: null, know: {}, acts: {}, ready: {},
      step: null, stepSeq: 0, queue: [], pending: [], dayFlags: {},
      deaths: [], allDeaths: [], spy: { on: false }, girlCaught: false,
      buzz: {}, winner: null, winners: [], paused: null, log: []
    };
    players.forEach((p, i) => { g.roles[p.id] = shuffled[i]; g.alive[p.id] = true; g.know[p.id] = []; });
    S.g = g;
    S.phase = "deal";
    this.startStep("deal");
    this.bump();
  };

  P.toLobby = function () {
    const S = this.S;
    S.phase = "lobby";
    S.g = null;
    S.cue = null;
    this.syncAutoRoles();
    this.sysChat("lobby");
    this.bump();
  };

  /* ---------- Repères ---------- */
  P.alive = function () { const g = this.S.g; return g.seat.filter((id) => g.alive[id]); };
  P.aliveWith = function (role) { const g = this.S.g; return this.alive().filter((id) => g.roles[id] === role); };
  P.holders = function (role) { const g = this.S.g; return g.seat.filter((id) => g.roles[id] === role); };
  P.inGame = function (role) { return this.holders(role).length > 0; };
  P.wolvesAlive = function () { const g = this.S.g; return this.alive().filter((id) => isWolf(g.roles[id])); };
  P.manual = function () { const st = this.S.settings; return !!(st.narrator && st.manual); };

  P.cue = function (k, extra, vibAll) {
    const S = this.S;
    S.cue = Object.assign({ id: ++S.cueSeq, k, vib: vibAll || null, at: this.now() }, extra || {});
  };
  P.buzz = function (ids, pat) {
    const g = this.S.g;
    (ids || []).forEach((id) => { g.buzz[id] = { id: ((g.buzz[id] && g.buzz[id].id) || 0) + 1, pat }; });
  };
  P.log = function (k, p) { this.S.g.log.push({ k, p: p || {}, n: this.S.g.n, ph: this.S.phase, t: this.now() }); };

  /* ---------- Acteurs de chaque étape ---------- */
  P.actors = function (step) {
    const S = this.S, g = S.g;
    const t = step.t;
    switch (t) {
      case "deal": return g.seat.slice();
      case "cupid": return this.aliveWith("cupid");
      case "lovers": return (g.lovers || []).filter((id) => g.alive[id]);
      case "guard": return this.aliveWith("guard");
      case "seer": return this.aliveWith("seer");
      case "fox": return g.foxPower ? this.aliveWith("fox") : [];
      case "wolves": return this.wolvesAlive();
      case "lonewolf": return this.aliveWith("lonewolf");
      case "witch": return this.aliveWith("witch");
      case "raven": return this.aliveWith("raven");
      case "hunter": case "successor": return step.data.pid ? [step.data.pid] : [];
      case "tiebreak": return g.mayor && g.alive[g.mayor] ? [g.mayor] : [];
      case "mayor": case "vote": case "discuss": return this.voters(t === "mayor");
    }
    return [];
  };
  P.voters = function (all) {
    const g = this.S.g;
    return this.alive().filter((id) => all || !g.idiots[id]);
  };

  // Joueurs que l'acteur peut désigner
  P.options = function (pid) {
    const S = this.S, g = S.g, st = g.step;
    if (!st) return [];
    const alive = this.alive();
    switch (st.t) {
      case "cupid": return alive;
      case "guard": return alive.filter((id) => id !== g.guardLast);
      case "seer": case "fox": case "raven": return alive.filter((id) => id !== pid);
      case "wolves": return alive.filter((id) => !isWolf(g.roles[id]));
      case "lonewolf": return alive.filter((id) => g.roles[id] === "wolf");
      case "witch": return alive.filter((id) => id !== pid);
      case "hunter": return alive.filter((id) => id !== pid);
      case "successor": return alive.filter((id) => id !== pid);
      case "tiebreak": return (st.data.tied || []).slice();
      case "mayor": return alive;
      case "vote": return alive.filter((id) => id !== pid);
    }
    return [];
  };

  /* ---------- Étapes ---------- */
  // durée (ms) ou null = attend le narrateur / une action
  P.setEnds = function (ms) { const st = this.S.g.step; st.ends = ms == null ? null : this.now() + ms; };

  P.startStep = function (t, data) {
    const S = this.S, g = S.g, st0 = S.settings;
    const step = { t, sub: "act", id: ++g.stepSeq, ends: null, data: data || {}, done: {} };
    g.step = step;
    const man = this.manual();
    const isNight = NIGHT_STEPS.has(t) || t === "fake";
    if (isNight) {
      const role = t === "fake" ? step.data.role : t;
      step.sub = "call";
      const acts = t === "fake" ? [] : this.actors(step);
      this.cue("call", { role }, null);
      this.buzz(acts, "call");
      this.setEnds(man ? null : 4500);
      if (t === "fake") step.data.fakeMs = 5000 + Math.floor(this.rand() * 5000);
    } else {
      switch (t) {
        case "deal":
          this.cue("deal", {}, "all");
          this.setEnds(null);
          break;
        case "nightfall":
          step.sub = "end";
          this.cue("sleep", { n: g.n }, "all");
          this.setEnds(man ? null : 6000);
          break;
        case "dawn": {
          step.sub = "end";
          const deaths = this.resolveNight();
          step.data.deaths = deaths;
          step.data.raven = g.raven && g.alive[g.raven] ? g.raven : null;
          this.cue("wake", { deaths: deaths.map((d) => d.id) }, "all");
          this.setEnds(man ? null : 6500 + 3500 * deaths.length);
          break;
        }
        case "hunter":
          this.cue("hunter", { pid: step.data.pid });
          this.buzz([step.data.pid], "call");
          this.setEnds(30000);
          break;
        case "successor":
          this.cue("successor", { pid: step.data.pid });
          this.buzz([step.data.pid], "call");
          this.setEnds(30000);
          break;
        case "mayor":
          step.data.votes = {};
          this.cue("mayor");
          this.setEnds(S.settings.voteSec * 1000);
          break;
        case "discuss":
          step.data.ready = {};
          this.cue("discuss", { d: g.day });
          this.setEnds(man ? null : st0.discussSec * 1000);
          break;
        case "vote":
          step.data.votes = {};
          this.cue("vote");
          this.buzz(this.voters(), "vote");
          this.setEnds(st0.voteSec * 1000);
          break;
        case "tiebreak":
          this.cue("tiebreak", { tied: step.data.tied });
          this.buzz(this.actors(step), "call");
          this.setEnds(30000);
          break;
        case "verdict":
          step.sub = "end";
          this.cue("verdict", { res: step.data.res });
          this.setEnds(man ? null : 7000);
          break;
      }
    }
    this.bump();
  };

  // Fin d'une sous-étape (minuterie écoulée, narrateur, ou action terminée)
  P.advanceSub = function () {
    const S = this.S, g = S.g, step = g.step;
    if (!step) return;
    const man = this.manual();
    const isNight = NIGHT_STEPS.has(step.t) || step.t === "fake";
    if (step.sub === "call") {
      step.sub = "act";
      const acts = step.t === "fake" ? [] : this.actors(step);
      if (step.t === "fake") this.setEnds(step.data.fakeMs);
      else if (step.t === "lovers") this.setEnds(7000);
      else if (!acts.length) this.setEnds(5000 + Math.floor(this.rand() * 4000));
      else this.setEnds(S.settings.nightSec * 1000);
      step.actAt = this.now();
      this.bump();
      return;
    }
    if (step.sub === "act") {
      this.resolveAct();
      if (S.phase === "end") return;
      if (isNight) {
        step.sub = "end";
        this.cue("sleepRole", { role: step.t === "fake" ? step.data.role : step.t });
        this.setEnds(man ? null : 3500);
        this.bump();
        return;
      }
      if (g.step !== step) return; // resolveAct a enchaîné sur une autre étape
      if (["hunter", "successor", "mayor"].includes(step.t)) {
        step.sub = "end";
        this.setEnds(man ? null : 5000);
        this.bump();
        return;
      }
      return this.flow();
    }
    // sub === "end"
    this.flow();
  };

  P.skip = function () {
    const g = this.S.g;
    if (!g || !g.step) return;
    if (g.paused) g.paused = null;
    if (g.step.t === "deal") { g.seat.forEach((id) => (g.ready[id] = true)); return this.flow(); }
    this.advanceSub();
  };
  P.addTime = function (ms) {
    const g = this.S.g;
    if (g && g.step && g.step.ends) { g.step.ends += ms; this.bump(); }
  };
  P.togglePause = function () {
    const g = this.S.g;
    if (!g || !g.step) return;
    if (g.paused) {
      if (g.step.ends) g.step.ends += this.now() - g.paused;
      g.paused = null;
    } else g.paused = this.now();
    this.bump();
  };

  P.tick = function () {
    const S = this.S, g = S.g;
    if (!g || !g.step || g.paused || S.phase === "end") return false;
    const now = this.now();
    const v = S.v;
    const step = g.step;
    // La petite fille espionne : risque d'être repérée
    if (step.t === "wolves" && step.sub === "act" && g.spy.on && !g.girlCaught) {
      if (now - (g.spy.last || g.spy.since) >= 1000) {
        g.spy.last = now;
        if (this.rand() < 0.06) {
          g.girlCaught = true;
          g.spy.on = false;
          const girl = this.aliveWith("girl")[0];
          this.wolvesAlive().forEach((w) => g.know[w].push({ k: "girl", p: girl, n: g.n }));
          if (girl) g.know[girl].push({ k: "caught", n: g.n });
          this.buzz(this.wolvesAlive().concat(girl ? [girl] : []), "alert");
          this.bump();
        }
      }
    }
    // Rappel aux retardataires
    if (step.sub === "act" && step.actAt && !step.reminded && now - step.actAt > 15000 && ["cupid", "guard", "seer", "fox", "wolves", "lonewolf", "witch", "raven", "vote", "mayor", "hunter", "successor", "tiebreak"].includes(step.t)) {
      step.reminded = true;
      this.buzz(this.actors(step).filter((id) => !step.done[id]), "remind");
      this.bump();
    }
    if (step.ends != null && now >= step.ends) this.advanceSub();
    return S.v !== v;
  };

  /* ---------- Enchaînement ---------- */
  P.flow = function () {
    const S = this.S, g = S.g;
    if (S.phase === "deal") {
      if (!g.seat.every((id) => g.ready[id])) return;
      return this.startNight();
    }
    if (g.queue.length) {
      const next = g.queue.shift();
      return this.startStep(next.t, next.data);
    }
    if (g.pending.length) {
      const p = g.pending.shift();
      if (p.t === "successor" && !this.alive().length) return this.flow();
      return this.startStep(p.t, { pid: p.pid });
    }
    const w = this.checkWin();
    if (w) return this.endGame(w);
    if (S.phase === "night") return; // l'aube est dans la file
    const f = g.dayFlags;
    if (S.settings.mayor && !g.mayor && !f.mayor) { f.mayor = true; return this.startStep("mayor"); }
    if (!f.discuss) { f.discuss = true; return this.startStep("discuss"); }
    if (!f.vote) { f.vote = true; return this.startStep("vote"); }
    return this.startNight();
  };

  P.startNight = function () {
    const S = this.S, g = S.g;
    S.phase = "night";
    g.n++;
    g.acts = { wolfVotes: {} };
    g.spy = { on: false };
    g.deaths = [];
    const q = [{ t: "nightfall" }];
    const hidden = !S.settings.reveal;
    for (const t of NIGHT_ORDER) {
      if (t === "cupid") { if (g.n === 1 && this.inGame("cupid")) q.push({ t }); continue; }
      if (t === "lovers") continue; // ajouté après le choix de Cupidon
      if (t === "wolves") { q.push({ t }); continue; }
      if (t === "lonewolf") { if (g.n % 2 === 0 && this.inGame("lonewolf")) q.push(this.aliveWith("lonewolf").length ? { t } : { t: "fake", data: { role: t } }); continue; }
      if (!this.inGame(t)) continue;
      let active = this.aliveWith(t).length > 0;
      if (t === "fox" && !g.foxPower) active = false;
      if (t === "witch" && !g.potions.heal && !g.potions.poison) active = false;
      if (active) q.push({ t });
      else if (hidden) q.push({ t: "fake", data: { role: t } }); // on appelle quand même pour ne rien trahir
    }
    q.push({ t: "dawn" });
    g.queue = q;
    this.log("night", { n: g.n });
    this.flow();
  };

  /* ---------- Morts ---------- */
  P.kill = function (id, cause, out) {
    const g = this.S.g;
    if (!id || !g.alive[id]) return;
    g.alive[id] = false;
    const d = { id, cause, role: g.roles[id], n: g.n, day: g.day };
    out.push(d);
    g.allDeaths.push(d);
    this.log("death", { id, cause });
    this.buzz([id], "death");
    if (g.roles[id] === "hunter") g.pending.push({ t: "hunter", pid: id });
    if (g.mayor === id) g.pending.push({ t: "successor", pid: id });
    if (g.lovers && g.lovers.includes(id)) {
      const other = g.lovers[0] === id ? g.lovers[1] : g.lovers[0];
      this.kill(other, "love", out);
    }
  };

  P.resolveNight = function () {
    const S = this.S, g = S.g, a = g.acts;
    const out = [];
    let v = a.victim || null;
    if (v && a.guard === v) v = null;
    if (v && a.save) v = null;
    if (v && g.roles[v] === "elder" && g.elderLife > 0) { g.elderLife--; v = null; }
    if (v) this.kill(v, "wolves", out);
    if (a.poison) this.kill(a.poison, "poison", out);
    if (a.lone) this.kill(a.lone, "lone", out);
    g.deaths = out;
    S.phase = "day";
    g.day++;
    g.dayFlags = {};
    return out;
  };

  /* ---------- Actions de jeu ---------- */
  P.onReady = function (pid) {
    const S = this.S, g = S.g, step = g.step;
    if (step.t === "deal" && pid in g.roles) {
      g.ready[pid] = true;
      this.bump();
      if (g.seat.every((id) => g.ready[id])) this.flow();
      return;
    }
    if (step.t === "discuss" && step.sub === "act" && this.voters().includes(pid)) {
      step.data.ready[pid] = !step.data.ready[pid];
      const alive = this.voters();
      const n = alive.filter((id) => step.data.ready[id]).length;
      this.bump();
      if (n >= Math.ceil(alive.length * 2 / 3)) this.advanceSub();
    }
  };

  P.onPick = function (pid, ids) {
    const S = this.S, g = S.g, step = g.step;
    if (!step || step.sub !== "act") return;
    if (!this.actors(step).includes(pid)) return;
    const opts = this.options(pid);
    ids = ids.filter((x) => x === null || opts.includes(x));
    const a = g.acts;
    const one = ids[0] === undefined ? null : ids[0];
    switch (step.t) {
      case "cupid":
        if (ids.length !== 2 || ids[0] === ids[1] || ids.includes(null)) return;
        a.cupid = ids;
        step.done[pid] = true;
        break;
      case "guard":
        if (one === null || step.done[pid]) return;
        a.guard = one; step.done[pid] = true;
        break;
      case "seer":
        if (one === null || step.done[pid]) return;
        a.seer = one; step.done[pid] = true;
        g.know[pid].push({ k: "seer", p: one, r: g.roles[one], n: g.n });
        this.bump();
        this.setEnds(5000); // laisse le temps de lire
        return;
      case "fox": {
        if (one === null || step.done[pid]) return;
        step.done[pid] = true;
        const ring = this.alive();
        const i = ring.indexOf(one);
        const near = [ring[(i - 1 + ring.length) % ring.length], one, ring[(i + 1) % ring.length]];
        const found = near.some((id) => isWolf(g.roles[id]));
        if (!found) g.foxPower = false;
        g.know[pid].push({ k: "fox", p: one, near: Array.from(new Set(near)), yes: found, n: g.n });
        this.bump();
        this.setEnds(5000);
        return;
      }
      case "wolves":
        a.wolfVotes[pid] = one;
        step.done[pid] = one !== null;
        break;
      case "lonewolf":
        a.lone = one; step.done[pid] = true;
        break;
      case "raven":
        g.raven = one; step.done[pid] = true;
        break;
      case "hunter": case "successor": case "tiebreak":
        if (one === null) return;
        step.data.choice = one; step.done[pid] = true;
        break;
      default: return;
    }
    this.bump();
    this.checkDone();
  };

  P.onWitch = function (pid, a) {
    const S = this.S, g = S.g, step = g.step;
    if (!step || step.t !== "witch" || step.sub !== "act" || step.done[pid]) return;
    if (!this.actors(step).includes(pid)) return;
    const acts = g.acts;
    if (a.save && g.potions.heal && acts.victim) { acts.save = true; g.potions.heal = false; }
    if (a.kill && g.potions.poison && this.options(pid).includes(a.kill)) { acts.poison = a.kill; g.potions.poison = false; }
    step.done[pid] = true;
    this.bump();
    this.checkDone();
  };

  P.onSpy = function (pid, on) {
    const g = this.S.g, step = g.step;
    if (g.roles[pid] !== "girl" || !g.alive[pid] || g.girlCaught) return;
    if (!step || step.t !== "wolves" || step.sub !== "act") on = false;
    if (g.spy.on === on) return;
    g.spy = { on, since: this.now() };
    this.bump();
  };

  P.onVote = function (pid, target) {
    const g = this.S.g, step = g.step;
    if (!step || !["vote", "mayor"].includes(step.t) || step.sub !== "act") return;
    if (!this.actors(step).includes(pid)) return;
    if (target !== null && !this.options(pid).includes(target)) return;
    if (target === null) { delete step.data.votes[pid]; delete step.done[pid]; }
    else { step.data.votes[pid] = target; step.done[pid] = true; }
    this.bump();
    this.checkDone();
  };

  P.checkDone = function () {
    const g = this.S.g, step = g.step;
    const acts = this.actors(step);
    if (!acts.length) return;
    let done = acts.every((id) => step.done[id]);
    if (step.t === "wolves" && done) {
      const targets = acts.map((id) => g.acts.wolfVotes[id]);
      done = targets.every((x) => x === targets[0]);
    }
    if (done) {
      const delay = ["vote", "mayor"].includes(step.t) ? 4000 : step.t === "wolves" ? 2500 : 1200;
      if (step.ends == null || step.ends - this.now() > delay) this.setEnds(delay);
      this.bump();
    }
  };

  // Comptage des votes : plus grand nombre, égalités renvoyées
  P.tally = function (votes, weights) {
    const count = {};
    Object.keys(votes).forEach((v) => {
      const t = votes[v];
      if (t == null) return;
      count[t] = (count[t] || 0) + ((weights && weights[v]) || 1);
    });
    let max = 0;
    Object.values(count).forEach((c) => (max = Math.max(max, c)));
    const top = Object.keys(count).filter((k) => count[k] === max && max > 0);
    return { count, top, max };
  };

  P.resolveAct = function () {
    const S = this.S, g = S.g, step = g.step, a = g.acts;
    switch (step.t) {
      case "cupid": {
        if (!a.cupid) {
          const alive = this.shuffle(this.alive());
          a.cupid = alive.slice(0, 2);
        }
        if (a.cupid.length === 2) {
          g.lovers = a.cupid.slice();
          g.lovers.forEach((id) => g.know[id].push({ k: "love", p: g.lovers.find((x) => x !== id), r: g.roles[g.lovers.find((x) => x !== id)], n: g.n }));
          g.queue.unshift({ t: "lovers" });
        }
        break;
      }
      case "guard":
        g.guardLast = a.guard || null;
        break;
      case "wolves": {
        const tl = this.tally(a.wolfVotes);
        a.victim = tl.top.length ? this.pick(tl.top) : null;
        g.spy = { on: false };
        break;
      }
      case "hunter": {
        const target = step.data.choice;
        step.data.deaths = [];
        if (target) this.kill(target, "hunter", step.data.deaths);
        step.data.target = target || null;
        this.cue("shot", { pid: step.data.pid, target: target || null, deaths: step.data.deaths.map((d) => d.id) });
        break;
      }
      case "successor": {
        let c = step.data.choice;
        if (!c) c = this.pick(this.alive());
        g.mayor = c || null;
        step.data.choice = c;
        this.cue("newMayor", { pid: c });
        break;
      }
      case "mayor": {
        const tl = this.tally(step.data.votes);
        let m = tl.top.length ? this.pick(tl.top) : this.pick(this.alive());
        g.mayor = m;
        step.data.elected = m;
        step.data.count = tl.count;
        this.cue("elected", { pid: m });
        break;
      }
      case "discuss":
        break;
      case "vote": {
        const weights = {};
        if (g.mayor && g.alive[g.mayor]) weights[g.mayor] = 2;
        const votes = Object.assign({}, step.data.votes);
        const tl = this.tally(votes, weights);
        if (g.raven && g.alive[g.raven]) {
          tl.count[g.raven] = (tl.count[g.raven] || 0) + 2;
          const max = Math.max(...Object.values(tl.count));
          tl.max = max;
          tl.top = Object.keys(tl.count).filter((k) => tl.count[k] === max);
        }
        g.raven = null;
        step.data.count = tl.count;
        if (!tl.top.length) return this.verdict({ none: true, count: tl.count });
        if (tl.top.length === 1) return this.verdict({ id: tl.top[0], count: tl.count });
        if (g.mayor && g.alive[g.mayor]) {
          this.startStep("tiebreak", { tied: tl.top, count: tl.count });
          return;
        }
        return this.verdict({ none: true, tie: tl.top, count: tl.count });
      }
      case "tiebreak": {
        const c = step.data.choice || this.pick(step.data.tied);
        return this.verdict({ id: c, count: step.data.count, byMayor: true });
      }
    }
  };

  P.verdict = function (res) {
    const g = this.S.g;
    res.deaths = [];
    if (res.id) {
      if (g.roles[res.id] === "idiot" && !g.idiots[res.id]) {
        g.idiots[res.id] = true;
        res.idiot = true;
        res.role = "idiot";
      } else {
        this.kill(res.id, "vote", res.deaths);
      }
    }
    this.startStep("verdict", { res });
  };

  /* ---------- Victoire ---------- */
  P.checkWin = function () {
    const g = this.S.g;
    const alive = this.alive();
    if (!alive.length) return "nobody";
    const lovers = g.lovers;
    if (lovers && alive.length === 2 && lovers.every((id) => g.alive[id])) {
      const t0 = isWolf(g.roles[lovers[0]]), t1 = isWolf(g.roles[lovers[1]]);
      if (t0 !== t1 || g.roles[lovers[0]] === "lonewolf" || g.roles[lovers[1]] === "lonewolf") return "lovers";
    }
    const wolves = alive.filter((id) => isWolf(g.roles[id]));
    if (!wolves.length) return "village";
    if (alive.length === 1 && g.roles[alive[0]] === "lonewolf") return "lonewolf";
    if (wolves.length === alive.length && !wolves.some((id) => g.roles[id] === "lonewolf")) return "wolves";
    return null;
  };

  P.endGame = function (w) {
    const S = this.S, g = S.g;
    S.phase = "end";
    g.winner = w;
    const team = (id) => ROLES[g.roles[id]].team;
    if (w === "village") g.winners = g.seat.filter((id) => team(id) === "village");
    else if (w === "wolves") g.winners = g.seat.filter((id) => g.roles[id] === "wolf");
    else if (w === "lonewolf") g.winners = g.seat.filter((id) => g.roles[id] === "lonewolf");
    else if (w === "lovers") g.winners = g.lovers.slice();
    else g.winners = [];
    g.step = { t: "end", sub: "end", id: ++g.stepSeq, ends: null, data: {}, done: {} };
    this.cue("win", { w });
    this.buzz(g.seat, "win");
    this.bump();
  };

  /* =============================================================
     Vues envoyées aux joueurs
     ============================================================= */
  P.chatFor = function (pid) {
    return this.S.chat.filter((m) => this.canSee(pid, m.c)).slice(-80);
  };

  P.pub = function () {
    const S = this.S, g = S.g, st = S.settings;
    const now = this.now();
    const out = {
      v: S.v, code: S.code, hostId: S.hostId, phase: S.phase, now,
      settings: { roles: st.roles, auto: st.auto, narrator: st.narrator, manual: st.manual, voice: st.voice, reveal: st.reveal, mayor: st.mayor, nightSec: st.nightSec, discussSec: st.discussSec, voteSec: st.voteSec },
      players: S.players.map((p) => ({ id: p.id, name: p.name, av: p.av, col: p.col, on: p.on })),
      chat: S.chat.filter((m) => m.c === "all").slice(-80),
      cue: S.cue
    };
    if (!g) return out;
    const end = S.phase === "end";
    const showRole = (id) => end || (st.reveal && !g.alive[id]);
    out.g = {
      n: g.n, day: g.day, seat: g.seat,
      alive: g.alive, mayor: g.mayor, idiots: g.idiots,
      roles: {}, paused: !!g.paused,
      lovers: end ? g.lovers : null,
      winner: g.winner, winners: g.winners,
      ready: S.phase === "deal" ? Object.keys(g.ready).length : 0,
      deadCauses: {}
    };
    g.seat.forEach((id) => { if (showRole(id)) out.g.roles[id] = g.roles[id]; });
    g.allDeaths.forEach((d) => { out.g.deadCauses[d.id] = end || st.reveal ? d.cause : "dead"; });
    if (end) out.g.log = g.log;
    const step = g.step;
    if (step) {
      const ps = { t: step.t, sub: step.sub, id: step.id, ends: step.ends };
      if (step.t === "fake") { ps.t = step.data.role; ps.fake = true; } // personne ne doit savoir que le rôle est mort
      // La nuit, on ne publie pas le nombre d'acteurs : cela trahirait les rôles morts
      if (!NIGHT_STEPS.has(step.t) && step.t !== "fake") {
        const acts = this.actors(step);
        ps.total = acts.length;
        ps.done = acts.filter((id) => step.done[id]).length;
      }
      const d = step.data;
      if (step.t === "dawn") { ps.deaths = d.deaths.map((x) => ({ id: x.id, cause: st.reveal ? x.cause : "dead", role: st.reveal ? x.role : null })); ps.raven = d.raven; }
      if (step.t === "vote" || step.t === "mayor") { ps.votes = d.votes; ps.raven = g.raven && g.alive[g.raven] ? g.raven : null; }
      if (step.t === "mayor" && step.sub === "end") ps.elected = d.elected;
      if (step.t === "discuss") ps.ready = Object.keys(d.ready).filter((k) => d.ready[k]);
      if (step.t === "tiebreak") { ps.tied = d.tied; ps.count = d.count; }
      if (step.t === "verdict") {
        const r = d.res;
        ps.res = { id: r.id || null, none: !!r.none, tie: r.tie || null, idiot: !!r.idiot, byMayor: !!r.byMayor, count: r.count,
          deaths: r.deaths.map((x) => ({ id: x.id, cause: st.reveal ? x.cause : "dead", role: st.reveal ? x.role : null })) };
      }
      if (step.t === "hunter" || step.t === "successor") {
        ps.pid = d.pid;
        if (step.sub === "end") {
          ps.target = d.target || null;
          ps.choice = d.choice || null;
          ps.deaths = (d.deaths || []).map((x) => ({ id: x.id, cause: st.reveal ? x.cause : "dead", role: st.reveal ? x.role : null }));
        }
      }
      out.g.step = ps;
    }
    return out;
  };

  P.priv = function (pid) {
    const S = this.S, g = S.g;
    const out = { chat: [], toast: S.toasts[pid] || null };
    if (!g) return out;
    out.chat = this.chatFor(pid).filter((m) => m.c !== "all").slice(-30);
    out.chan = this.chatChannelFor(pid);
    out.buzz = g.buzz[pid] || null;
    if (pid === S.settings.narrator) {
      out.narr = {
        roles: g.roles, acts: g.acts, lovers: g.lovers, guardLast: g.guardLast,
        potions: g.potions, elderLife: g.elderLife, foxPower: g.foxPower, raven: g.raven,
        spy: g.spy.on, girlCaught: g.girlCaught, know: g.know, queue: g.queue.map((q) => q.t === "fake" ? q.data.role : q.t),
        log: g.log.slice(-40), done: g.step ? g.step.done : {}
      };
      return out;
    }
    if (!(pid in g.roles)) { out.spectator = true; return out; }
    const role = g.roles[pid];
    out.role = role;
    out.know = g.know[pid];
    out.ready = !!g.ready[pid];
    if (isWolf(role)) out.pack = g.seat.filter((id) => isWolf(g.roles[id]));
    if (g.lovers && g.lovers.includes(pid)) out.lover = g.lovers.find((x) => x !== pid);
    if (role === "witch") out.potions = g.potions;
    if (role === "elder") out.elderLife = g.elderLife;
    if (role === "fox") out.foxPower = g.foxPower;
    if (role === "girl") out.caught = g.girlCaught;
    const step = g.step;
    if (step && step.sub === "act" && step.t !== "fake") {
      const acts = this.actors(step);
      if (acts.includes(pid) && !["deal", "discuss", "vote", "mayor", "lovers"].includes(step.t)) {
        const act = { t: step.t, opts: this.options(pid), done: !!step.done[pid] };
        if (step.t === "cupid") act.cur = g.acts.cupid || [];
        if (step.t === "wolves") act.votes = g.acts.wolfVotes;
        if (step.t === "witch") { act.victim = g.acts.victim || null; act.heal = g.potions.heal || g.acts.save; act.poison = g.potions.poison || !!g.acts.poison; act.saved = !!g.acts.save; act.killed = g.acts.poison || null; }
        if (step.t === "guard") act.last = g.guardLast;
        if (["hunter", "successor", "tiebreak"].includes(step.t)) act.cur = step.data.choice || null;
        if (step.t === "lonewolf" || step.t === "raven") act.cur = step.t === "raven" ? g.raven : g.acts.lone || null;
        out.act = act;
      }
      if (step.t === "wolves" && role === "girl" && g.alive[pid] && !g.girlCaught) {
        out.spy = { on: g.spy.on, see: g.spy.on ? Object.values(g.acts.wolfVotes).filter(Boolean) : [] };
      }
    }
    return out;
  };

  const api = { Engine, ROLES, ROLE_ORDER, NIGHT_ORDER, autoRoles, newState, defaultSettings, isWolf, MIN_PLAYERS, MAX_PLAYERS };
  root.LG = Object.assign(root.LG || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
