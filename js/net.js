/* =============================================================
   Loup Garou — réseau temps réel
   • Supabase Realtime (WebSocket, protocole Phoenix) sans SDK
   • Messages joueurs → hôte envoyés par l'API REST "broadcast"
   • Infos secrètes chiffrées de bout en bout (ECDH P-256 + AES-GCM)
   ============================================================= */
(function () {
  "use strict";
  const cfg = window.LG_CONFIG || {};
  const BASE = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  const KEY = cfg.supabaseAnonKey || "";

  /* ---------- Client Realtime minimal ---------- */
  function Realtime() {
    this.ws = null;
    this.ref = 0;
    this.chans = {};
    this.open = false;
    this.backoff = 500;
    this.listeners = { status: [] };
    this.connect();
    this.hb = setInterval(() => this.push("phoenix", "heartbeat", {}), 25000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && (!this.ws || this.ws.readyState > 1)) this.connect(true);
    });
    window.addEventListener("online", () => this.connect(true));
  }
  Realtime.prototype.emit = function (k, v) { (this.listeners[k] || []).forEach((f) => f(v)); };
  Realtime.prototype.on = function (k, f) { (this.listeners[k] = this.listeners[k] || []).push(f); };
  Realtime.prototype.connect = function (now) {
    if (this.ws && this.ws.readyState <= 1 && !now) return;
    if (this.ws) { try { this.ws.onclose = null; this.ws.close(); } catch (e) { /* ignore */ } }
    clearTimeout(this.retry);
    const url = BASE.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(KEY) + "&vsn=1.0.0";
    let ws;
    try { ws = new WebSocket(url); } catch (e) { return this.schedule(); }
    this.ws = ws;
    ws.onopen = () => {
      this.open = true; this.backoff = 500;
      Object.values(this.chans).forEach((c) => this.join(c));
      this.emit("status", true);
    };
    ws.onclose = () => { this.open = false; this.emit("status", false); this.schedule(); };
    ws.onerror = () => { /* onclose suit */ };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (window.LGNet.debug) console.log("rt<", m.topic, m.event, m.join_ref, JSON.stringify(m.payload).slice(0, 160));
      const c = this.chans[m.topic];
      if (!c) return;
      if (m.event === "phx_reply" && m.ref === c.joinRef) {
        c.joined = m.payload && m.payload.status === "ok";
        if (c.joined) { if (c.meta) this.track(c); if (c.onJoin) c.onJoin(); }
        return;
      }
      if (m.event === "broadcast" && m.payload) c.onMsg(m.payload.event, m.payload.payload);
      else if (m.event === "presence_state") { c.presence = {}; Object.keys(m.payload || {}).forEach((k) => (c.presence[k] = m.payload[k].metas)); c.onPresence && c.onPresence(c.presence); }
      else if (m.event === "presence_diff") {
        const d = m.payload || {};
        Object.keys(d.joins || {}).forEach((k) => (c.presence[k] = d.joins[k].metas));
        Object.keys(d.leaves || {}).forEach((k) => {
          const left = (d.leaves[k].metas || []).map((x) => x.phx_ref);
          c.presence[k] = (c.presence[k] || []).filter((x) => !left.includes(x.phx_ref));
          if (!c.presence[k].length) delete c.presence[k];
        });
        c.onPresence && c.onPresence(c.presence);
      } else if (m.event === "phx_error") {
        // phx_close n'est pas traité : il concerne une inscription remplacée ou quittée
        if (m.ref && m.ref !== c.joinRef) return;
        c.joined = false;
        setTimeout(() => { if (this.chans[c.topic] === c && !c.joined) this.join(c); }, 1000);
      }
    };
  };
  Realtime.prototype.schedule = function () {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(this.backoff * 1.8, 8000);
  };
  Realtime.prototype.push = function (topic, event, payload, joinRef) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    const ref = String(++this.ref);
    // une inscription (phx_join) porte sa propre référence comme join_ref
    try { this.ws.send(JSON.stringify({ topic, event, payload, ref, join_ref: joinRef === true ? ref : joinRef })); } catch (e) { return false; }
    return ref;
  };
  Realtime.prototype.join = function (c) {
    c.joined = false;
    c.joinRef = this.push(c.topic, "phx_join", {
      config: { broadcast: { self: false, ack: false }, presence: { key: c.presenceKey || "" }, postgres_changes: [], private: false },
      access_token: KEY
    }, true);
  };
  Realtime.prototype.track = function (c) {
    this.push(c.topic, "presence", { type: "presence", event: "track", payload: c.meta }, c.joinRef);
  };
  // Rejoint un canal : renvoie un objet { send, leave }
  Realtime.prototype.channel = function (name, opts) {
    const topic = "realtime:" + name;
    const c = Object.assign({ topic, presence: {}, joined: false }, opts);
    this.chans[topic] = c;
    if (this.open) this.join(c);
    return {
      send: (event, payload) => c.joined && !!this.push(topic, "broadcast", { type: "broadcast", event, payload }, c.joinRef),
      leave: () => { this.push(topic, "phx_leave", {}, c.joinRef); delete this.chans[topic]; },
      get joined() { return c.joined; },
      get presence() { return c.presence; }
    };
  };

  // Envoi sans abonnement (joueur → hôte) : pas de diffusion vers les autres joueurs
  async function post(topic, event, payload) {
    const r = await fetch(BASE + "/realtime/v1/api/broadcast", {
      method: "POST",
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic, event, payload, private: false }] }),
      keepalive: true
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
  }

  /* ---------- Chiffrement ---------- */
  const subtle = window.crypto && window.crypto.subtle;
  // ?profil=xxx (tests à plusieurs sur un appareil) : des clés distinctes par profil
  const PROFILE = (new URLSearchParams(location.search).get("profil") || "").replace(/[^\w-]/g, "").slice(0, 12);
  const KS = "lg.keys" + (PROFILE ? "." + PROFILE : "");
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ""; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  const enc = new TextEncoder(), dec = new TextDecoder();
  let myKeys = null;
  const derived = {};

  async function keys() {
    if (myKeys) return myKeys;
    if (!subtle) return (myKeys = { pub: null });
    try {
      const s = JSON.parse(localStorage.getItem(KS) || "null");
      if (s && s.pub && s.priv) {
        myKeys = { pub: s.pub, priv: await subtle.importKey("jwk", s.priv, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]) };
        return myKeys;
      }
    } catch (e) { /* régénère */ }
    try {
      const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
      const pub = await subtle.exportKey("jwk", kp.publicKey);
      const priv = await subtle.exportKey("jwk", kp.privateKey);
      const slim = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y };
      try { localStorage.setItem(KS, JSON.stringify({ pub: slim, priv })); } catch (e) { /* ignore */ }
      myKeys = { pub: slim, priv: kp.privateKey };
    } catch (e) { myKeys = { pub: null }; }
    return myKeys;
  }
  async function shared(otherPub) {
    if (!subtle || !otherPub) return null;
    const id = otherPub.x + otherPub.y;
    if (derived[id]) return derived[id];
    const k = await keys();
    if (!k.priv) return null;
    const pub = await subtle.importKey("jwk", Object.assign({ ext: true }, otherPub), { name: "ECDH", namedCurve: "P-256" }, false, []);
    derived[id] = await subtle.deriveKey({ name: "ECDH", public: pub }, k.priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return derived[id];
  }
  async function seal(key, obj) {
    const txt = JSON.stringify(obj);
    if (!key) return { p: txt };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(txt));
    return { i: b64(iv), c: b64(ct) };
  }
  async function open(key, box) {
    if (!box) return null;
    if (box.p != null) return JSON.parse(box.p);
    if (!key) return null;
    const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64(box.i) }, key, unb64(box.c));
    return JSON.parse(dec.decode(pt));
  }

  /* ---------- Signature de l'hôte (ECDSA P-256) ----------
     Chaque message de l'hôte est signé : un joueur ne peut pas se faire
     passer pour l'hôte en diffusant un faux état de partie. */
  const SK = "lg.sign" + (PROFILE ? "." + PROFILE : "");
  let signKeys = null;
  const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
  const SIG = { name: "ECDSA", hash: "SHA-256" };
  async function hostSigner() {
    if (signKeys) return signKeys;
    if (!subtle) throw new Error("NO_CRYPTO");
    try {
      const s = JSON.parse(localStorage.getItem(SK) || "null");
      if (s && s.pub && s.priv) {
        signKeys = { pub: s.pub, priv: await subtle.importKey("jwk", s.priv, ECDSA, false, ["sign"]) };
        return signKeys;
      }
    } catch (e) { /* régénère */ }
    const kp = await subtle.generateKey(ECDSA, true, ["sign", "verify"]);
    const pub = await subtle.exportKey("jwk", kp.publicKey);
    const priv = await subtle.exportKey("jwk", kp.privateKey);
    const slim = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y };
    try { localStorage.setItem(SK, JSON.stringify({ pub: slim, priv })); } catch (e) { /* ignore */ }
    signKeys = { pub: slim, priv: kp.privateKey };
    return signKeys;
  }
  async function sign(text) {
    const k = await hostSigner();
    return b64(await subtle.sign(SIG, k.priv, enc.encode(text)));
  }
  const verifiers = {};
  async function verify(pub, text, sig) {
    if (!subtle || !pub || typeof sig !== "string") return false;
    try {
      const id = pub.x + pub.y;
      if (!verifiers[id]) verifiers[id] = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: pub.x, y: pub.y, ext: true }, ECDSA, false, ["verify"]);
      return await subtle.verify(SIG, verifiers[id], unb64(sig), enc.encode(text));
    } catch (e) { return false; }
  }
  // Empreinte courte d'une clé publique (mise dans le lien d'invitation)
  async function fingerprint(pub) {
    const h = new Uint8Array(await subtle.digest("SHA-256", enc.encode(pub.x + "." + pub.y)));
    return b64(h).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 12);
  }
  // Vérifie qu'une clé publique reçue a bien la forme attendue
  const validPub = (k) => !!(k && typeof k === "object" && k.kty === "EC" && k.crv === "P-256" &&
    /^[A-Za-z0-9_-]{43}$/.test(k.x || "") && /^[A-Za-z0-9_-]{43}$/.test(k.y || ""));
  // Remplissage : tous les messages chiffrés d'un même envoi ont la même taille
  const pad = (obj, size) => {
    const s = JSON.stringify(obj);
    const target = Math.max(size || 0, Math.ceil((s.length + 8) / 256) * 256);
    return Object.assign({}, obj, { _: "~".repeat(Math.max(0, target - s.length - 7)) });
  };
  // Essaie de déchiffrer avec une clé ; null si ce n'est pas la bonne
  async function tryOpen(key, box) {
    if (!key || !box || box.p != null) return null;
    try { return await open(key, box); } catch (e) { return null; }
  }

  window.LGNet = { Realtime, post, keys, shared, seal, open, tryOpen, sign, verify, fingerprint, hostSigner, validPub, pad, hasCrypto: !!subtle, configured: !!(BASE && KEY) };
  window.LGNet.debug = false;
})();
