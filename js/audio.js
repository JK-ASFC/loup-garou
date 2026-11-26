/* =============================================================
   Loup Garou — sons, ambiances, voix et vibrations
   Tout est synthétisé avec Web Audio (aucun fichier son).
   ============================================================= */
(function () {
  "use strict";
  const LS = "lg.audio";
  let prefs = { sound: true, ambient: true, voice: true, vib: true, vol: 0.8 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(LS) || "{}")); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  let ctx = null, master, sfx, amb, verb, noiseBuf;
  let ambKind = null, ambNodes = [], ambTimers = [];

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = prefs.sound ? prefs.vol : 0; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = prefs.ambient ? 0.55 : 0; amb.connect(master);
    // réverbération (réponse impulsionnelle générée)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // À appeler lors d'un geste de l'utilisateur (obligatoire sur mobile)
  function unlock() {
    init();
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (window.speechSynthesis && !unlock.spoke) {
      unlock.spoke = true;
      try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- Briques ---------- */
  const T = () => ctx.currentTime;
  function env(g, t, a, peak, d) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, out, t, a, peak, d, wet) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(g); g.connect(out); if (wet) g.connect(verb);
    env(g, t, a, peak, d);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function noise(out, t, dur, filterType, f, q, peak, a, wet) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = filterType; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
    const g = ctx.createGain();
    s.connect(fl); fl.connect(g); g.connect(out); if (wet) g.connect(verb);
    env(g, t, a || 0.005, peak, dur);
    s.start(t, Math.random()); s.stop(t + (a || 0.005) + dur + 0.05);
    return { s, fl, g };
  }

  /* ---------- Effets ---------- */
  function howl(out, t, base, vol) {
    base = base || 290; vol = vol || 0.22;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 2;
    o.type = "sawtooth"; o2.type = "sine";
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = 7;
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    [o, o2].forEach((x, i) => {
      const m = i ? 2 : 1;
      x.frequency.setValueAtTime(base * m, t);
      x.frequency.linearRampToValueAtTime(base * 1.75 * m, t + 0.9);
      x.frequency.linearRampToValueAtTime(base * 1.68 * m, t + 2.4);
      x.frequency.linearRampToValueAtTime(base * 1.1 * m, t + 3.4);
    });
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    o.connect(lp); lp.connect(bp); bp.connect(g); o2.connect(mix); mix.connect(g);
    g.connect(out); g.connect(verb);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
    g.gain.setValueAtTime(vol, t + 2.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + 3.7); });
  }
  function bell(out, t, f, vol) {
    [[0.5, 1], [1, 0.8], [1.19, 0.5], [1.5, 0.4], [2, 0.35], [2.74, 0.25], [3, 0.2], [4.1, 0.12]].forEach(([r, a]) => {
      osc("sine", f * r, out, t, 0.004, vol * a, 3.5 / Math.sqrt(r), true);
    });
  }
  function owl(out, t) {
    const hoot = (tt, dur, f) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "triangle"; lp.type = "lowpass"; lp.frequency.value = 900;
      o.frequency.setValueAtTime(f, tt); o.frequency.linearRampToValueAtTime(f * 0.86, tt + dur);
      o.connect(lp); lp.connect(g); g.connect(out); g.connect(verb);
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.07, tt + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
      o.start(tt); o.stop(tt + dur + 0.05);
    };
    hoot(t, 0.45, 390); hoot(t + 0.75, 0.25, 380); hoot(t + 1.1, 0.7, 370);
  }
  function chirpBird(out, t) {
    const n = 2 + Math.floor(Math.random() * 4), f0 = 2400 + Math.random() * 1600;
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.09 + Math.random() * 0.05);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.5), tt + 0.06);
      o.connect(g); g.connect(out); env(g, tt, 0.005, 0.05, 0.07);
      o.start(tt); o.stop(tt + 0.1);
    }
  }
  function cricket(out, t) {
    for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) {
      const tt = t + k * 0.32 + i * 0.045;
      osc("sine", 4300 + Math.random() * 200, out, tt, 0.004, 0.018, 0.03);
    }
  }
  function heartbeat(out, t, vol) {
    [0, 0.22].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(i ? 50 : 60, t + d); o.frequency.exponentialRampToValueAtTime(32, t + d + 0.18);
      o.connect(g); g.connect(out); env(g, t + d, 0.01, (vol || 0.5) * (i ? 0.7 : 1), 0.2);
      o.start(t + d); o.stop(t + d + 0.3);
    });
  }

  const FX = {
    flip(t) { const n = noise(sfx, t, 0.18, "bandpass", 900, 1.2, 0.25, 0.01); n.fl.frequency.exponentialRampToValueAtTime(3500, t + 0.18); },
    pop(t) { const o = osc("sine", 620, sfx, t, 0.005, 0.18, 0.09); o.frequency.exponentialRampToValueAtTime(980, t + 0.08); },
    click(t) { osc("triangle", 1300, sfx, t, 0.002, 0.12, 0.04); },
    tick(t) { osc("square", 1800, sfx, t, 0.001, 0.05, 0.03); },
    select(t) { osc("triangle", 660, sfx, t, 0.004, 0.15, 0.12); osc("triangle", 990, sfx, t + 0.06, 0.004, 0.12, 0.15); },
    howl(t) { howl(sfx, t, 290, 0.25); howl(sfx, t + 0.6, 340, 0.12); },
    bell(t) { bell(sfx, t, 330, 0.12); bell(sfx, t + 1.6, 330, 0.1); bell(sfx, t + 3.2, 330, 0.08); },
    death(t) {
      const o = osc("sine", 90, sfx, t, 0.01, 0.6, 2.2, true); o.frequency.exponentialRampToValueAtTime(38, t + 2);
      noise(sfx, t, 1.4, "lowpass", 300, 0.7, 0.4, 0.01, true);
      osc("sawtooth", 110, sfx, t + 0.05, 0.02, 0.05, 1.6, true);
    },
    drum(t) { heartbeat(sfx, t, 0.6); noise(sfx, t, 0.25, "lowpass", 200, 1, 0.3, 0.005, true); },
    heartbeat(t) { heartbeat(sfx, t, 0.45); },
    magic(t) { [880, 1175, 1320, 1760, 2093, 2637].forEach((f, i) => osc("sine", f, sfx, t + i * 0.07, 0.01, 0.06, 0.8, true)); },
    reveal(t) { [523, 659, 784, 1046].forEach((f, i) => osc("triangle", f, sfx, t + i * 0.06, 0.01, 0.09, 0.6, true)); noise(sfx, t, 0.5, "highpass", 5000, 0.5, 0.05, 0.05, true); },
    alert(t) { osc("square", 880, sfx, t, 0.005, 0.08, 0.12); osc("square", 660, sfx, t + 0.16, 0.005, 0.08, 0.16); },
    win(t) {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { osc("triangle", f, sfx, t + i * 0.13, 0.01, 0.16, 0.4, true); osc("sine", f / 2, sfx, t + i * 0.13, 0.01, 0.08, 0.4); });
    },
    lose(t) { [392, 370, 349, 262].forEach((f, i) => osc("sawtooth", f, sfx, t + i * 0.35, 0.03, 0.06, 0.5, true)); },
    gavel(t) { [0, 0.25, 0.5].forEach((d) => { osc("triangle", 180, sfx, t + d, 0.002, 0.4, 0.12, true); noise(sfx, t + d, 0.06, "bandpass", 1200, 2, 0.3, 0.001); }); },
    shot(t) { noise(sfx, t, 0.5, "lowpass", 1800, 0.8, 0.9, 0.001, true); const o = osc("sine", 120, sfx, t, 0.001, 0.6, 0.4); o.frequency.exponentialRampToValueAtTime(40, t + 0.3); },
    rooster(t) {
      const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
      o.type = "sawtooth"; bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 3;
      [[0, 600], [0.15, 900], [0.45, 1000], [0.9, 820], [1.25, 560]].forEach(([d, f]) => o.frequency.linearRampToValueAtTime(f, t + d));
      o.connect(bp); bp.connect(g); g.connect(sfx); g.connect(verb);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.08); g.gain.setValueAtTime(0.18, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
      o.start(t); o.stop(t + 1.4);
    }
  };

  function play(name, delay) {
    if (!prefs.sound) return;
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
    const f = FX[name];
    if (f) try { f(T() + 0.02 + (delay || 0)); } catch (e) { /* ignore */ }
  }

  /* ---------- Ambiances en boucle ---------- */
  function stopAmbient() {
    ambNodes.forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* ignore */ } });
    ambTimers.forEach((t) => clearTimeout(t));
    ambNodes = []; ambTimers = [];
  }
  function every(minMs, maxMs, fn) {
    const loop = () => {
      const id = setTimeout(() => { if (ctx && prefs.ambient) try { fn(T() + 0.05); } catch (e) { /* ignore */ } loop(); }, minMs + Math.random() * (maxMs - minMs));
      ambTimers.push(id);
    };
    loop();
  }
  function wind(vol, f) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = vol;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.06 + Math.random() * 0.05; lg.gain.value = f * 0.6;
    lfo.connect(lg); lg.connect(bp.frequency);
    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.11; lg2.gain.value = vol * 0.7;
    lfo2.connect(lg2); lg2.connect(g.gain);
    s.connect(bp); bp.connect(g); g.connect(amb);
    s.start(); lfo.start(); lfo2.start();
    ambNodes.push(s, lfo, lfo2);
  }

  function setAmbient(kind) {
    if (kind === ambKind) return;
    ambKind = kind;
    if (!init()) return;
    stopAmbient();
    if (!kind) return;
    if (kind === "night") {
      wind(0.16, 420);
      every(1200, 3500, (t) => cricket(amb, t));
      every(14000, 30000, (t) => owl(amb, t));
      every(35000, 80000, (t) => howl(amb, t, 250 + Math.random() * 60, 0.05));
    } else if (kind === "day") {
      wind(0.05, 800);
      every(1500, 5000, (t) => chirpBird(amb, t));
    } else if (kind === "lobby") {
      wind(0.07, 300);
      // feu de camp qui crépite
      every(60, 400, (t) => noise(amb, t, 0.02 + Math.random() * 0.04, "highpass", 1800 + Math.random() * 3000, 0.7, 0.03 + Math.random() * 0.07, 0.002));
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
      const g = ctx.createGain(); g.gain.value = 0.12; s.connect(lp); lp.connect(g); g.connect(amb); s.start(); ambNodes.push(s);
      every(20000, 45000, (t) => owl(amb, t));
    } else if (kind === "vote") {
      wind(0.05, 300);
      every(1000, 1000, (t) => heartbeat(amb, t, 0.35));
    }
  }

  /* ---------- Voix du narrateur ---------- */
  let voiceLang = "fr-FR";
  function pickVoice(lang) {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices();
    const base = lang.split("-")[0];
    return vs.find((v) => v.lang === lang && /google|natural|premium|enhanced/i.test(v.name)) ||
      vs.find((v) => v.lang === lang) || vs.find((v) => v.lang && v.lang.split(/[-_]/)[0] === base) || null;
  }
  function say(text, opts) {
    if (!prefs.voice || !window.speechSynthesis || !text) return;
    opts = opts || {};
    try {
      if (opts.interrupt !== false) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang || voiceLang;
      const v = pickVoice(u.lang); if (v) u.voice = v;
      u.rate = 0.93; u.pitch = 0.82; u.volume = 1;
      if (ctx && amb) {
        amb.gain.setTargetAtTime(prefs.ambient ? 0.2 : 0, T(), 0.2);
        u.onend = u.onerror = () => amb.gain.setTargetAtTime(prefs.ambient ? 0.55 : 0, T(), 0.6);
      }
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};

  /* ---------- Vibrations ---------- */
  const PATTERNS = {
    call: [500, 150, 500, 150, 500],   // ton rôle est appelé
    sleep: [250],                      // le village s'endort
    wake: [120, 90, 120, 90, 350],     // le village se réveille
    vote: [80, 60, 80],
    remind: [200, 100, 200],
    death: [900],
    alert: [100, 50, 100, 50, 100, 50, 400],
    win: [100, 60, 100, 60, 100, 60, 600],
    tap: [12]
  };
  const canVibrate = () => typeof navigator !== "undefined" && "vibrate" in navigator;
  function vibrate(kind) {
    if (!prefs.vib || !canVibrate()) return false;
    try { return navigator.vibrate(PATTERNS[kind] || kind); } catch (e) { return false; }
  }

  function setPref(k, v) {
    prefs[k] = v; save();
    if (!ctx) return;
    if (k === "sound") master.gain.setTargetAtTime(v ? prefs.vol : 0, T(), 0.1);
    if (k === "ambient") amb.gain.setTargetAtTime(v ? 0.55 : 0, T(), 0.3);
    if (k === "voice" && !v && window.speechSynthesis) speechSynthesis.cancel();
  }

  window.LGAudio = {
    unlock, play, setAmbient, say, vibrate, canVibrate,
    prefs: () => Object.assign({}, prefs), setPref,
    setLang(l) { voiceLang = l; },
    hasVoice: () => !!window.speechSynthesis
  };
})();
