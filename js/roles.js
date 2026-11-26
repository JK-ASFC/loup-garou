/* =============================================================
   Loup Garou — cartes des rôles (illustrations originales en SVG)
   Style « gravure populaire » : aplats vifs, silhouettes noires,
   grain de papier. Chaque carte devient une image data: URI.
   ============================================================= */
(function () {
  "use strict";

  const INK = "#14100c";
  const PAPER = "#f3e3c3";

  // Filtres communs : bords tremblés (fait main) + grain du papier
  const DEFS = `
    <filter id="hand" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0 0.04  0 0 0 0.55 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;

  const bg = (id, c1, c2) =>
    `<radialGradient id="${id}" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient><rect width="200" height="200" fill="url(#${id})"/>`;

  // Rayons de soleil / motifs
  function rays(cx, cy, n, r1, r2, color, op) {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2;
      d += `M${cx},${cy} L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} Z `;
    }
    return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
  }
  function stars(seed, n, color) {
    let s = seed, out = "";
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) out += `<circle cx="${(r() * 200).toFixed(1)}" cy="${(r() * 120).toFixed(1)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="${color}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
    return out;
  }
  function dots(color, op) {
    let out = "";
    for (let y = 8; y < 200; y += 16) for (let x = (y / 16) % 2 ? 8 : 16; x < 200; x += 16) out += `<circle cx="${x}" cy="${y}" r="1.6" fill="${color}" opacity="${op}"/>`;
    return out;
  }
  const hills = (color) => `<path d="M0,170 C30,155 55,160 80,166 C110,174 140,152 170,158 C185,161 195,166 200,168 L200,200 L0,200 Z" fill="${color}"/>`;
  const pines = (color, y) => {
    let out = "";
    [[8, 26], [26, 34], [168, 30], [186, 38]].forEach(([x, h]) => {
      out += `<path d="M${x},${y - h} L${x - 9},${y - h * 0.45} L${x - 4},${y - h * 0.45} L${x - 12},${y} L${x + 12},${y} L${x + 4},${y - h * 0.45} L${x + 9},${y - h * 0.45} Z" fill="${color}"/>`;
    });
    return out;
  };

  /* ---------- Illustrations ---------- */
  const ART = {
    // Loup-garou : loup noir hurlant sous la lune rouge
    wolf: () => `
      ${bg("bw", "#c0392b", "#3d0a0a")}
      ${rays(100, 70, 24, 0, 160, "#ff6a3d", 0.18)}
      <circle cx="132" cy="58" r="30" fill="#ffd9a0" filter="url(#glow)"/>
      <circle cx="140" cy="52" r="5" fill="#f0b97a" opacity=".7"/><circle cx="124" cy="66" r="7" fill="#f0b97a" opacity=".6"/>
      <g filter="url(#hand)" fill="${INK}">
        <path d="M46,196 L50,150 C46,128 52,112 64,100 L58,92 L36,58 L42,54 L60,66 L66,50 L74,38 L80,56 C92,62 102,74 108,90 C124,100 146,118 152,146 C156,164 150,182 140,196 Z"/>
        <path d="M140,190 C160,192 178,180 186,160 C190,176 180,196 150,198 Z"/>
      </g>
      <circle cx="70" cy="68" r="3" fill="#ffd23f"/>
      ${hills("#1c0707")}`,

    // Loup solitaire : loup blanc, lune noire
    lonewolf: () => `
      ${bg("blw", "#3b3f8f", "#0b0b24")}
      ${stars(11, 40, "#fff")}
      <circle cx="100" cy="70" r="44" fill="#9b1d20" filter="url(#glow)"/>
      <circle cx="100" cy="70" r="44" fill="none" stroke="#ffcf6b" stroke-width="2" stroke-dasharray="3 5"/>
      <g filter="url(#hand)">
        <path d="M100,184 C74,182 58,160 60,134 L46,96 L72,116 L84,102 L92,118 L100,108 L108,118 L116,102 L128,116 L154,96 L140,134 C142,160 126,182 100,184 Z" fill="#f4efe6" stroke="${INK}" stroke-width="4"/>
        <path d="M78,140 L92,146 M122,140 L108,146" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <path d="M88,168 L100,178 L112,168 Z" fill="${INK}"/>
      </g>
      <circle cx="84" cy="142" r="3" fill="#e63946"/><circle cx="116" cy="142" r="3" fill="#e63946"/>`,

    // Simple villageois : fourche et maisonnette
    villager: () => `
      ${bg("bv", "#f2c14e", "#b06a1b")}
      ${rays(100, 210, 18, 0, 230, "#fff3c4", 0.25)}
      <g filter="url(#hand)">
        <path d="M24,150 L24,112 L52,88 L80,112 L80,150 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
        <path d="M18,116 L52,84 L86,116" fill="none" stroke="#7a2b13" stroke-width="9" stroke-linejoin="round"/>
        <rect x="44" y="124" width="16" height="26" fill="${INK}"/>
        <rect x="30" y="118" width="10" height="10" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>
        <circle cx="132" cy="70" r="16" fill="${INK}"/>
        <path d="M112,186 L114,120 C114,98 150,98 150,120 L152,186 Z" fill="${INK}"/>
        <path d="M118,52 C126,40 142,40 148,54 Z" fill="#7a2b13" stroke="${INK}" stroke-width="3"/>
        <path d="M168,186 L168,64" stroke="#7a4a20" stroke-width="5"/>
        <path d="M156,66 L156,44 M168,64 L168,40 M180,66 L180,44 M156,66 L180,66" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
      ${hills("#7a3d10")}`,

    // Voyante : œil dans la boule de cristal
    seer: () => `
      ${bg("bs", "#7b3fa0", "#1f0b33")}
      ${stars(5, 30, "#ffe9a8")}
      ${rays(100, 92, 30, 0, 140, "#d9a7ff", 0.16)}
      <g filter="url(#hand)">
        <circle cx="100" cy="92" r="56" fill="#cfe9ff" stroke="${INK}" stroke-width="5"/>
        <circle cx="100" cy="92" r="56" fill="url(#bsg)" opacity=".9"/>
        <path d="M58,92 C78,64 122,64 142,92 C122,120 78,120 58,92 Z" fill="#fff8e7" stroke="${INK}" stroke-width="4"/>
        <circle cx="100" cy="92" r="17" fill="#2a9d8f" stroke="${INK}" stroke-width="3"/>
        <circle cx="100" cy="92" r="8" fill="${INK}"/>
        <circle cx="94" cy="86" r="3" fill="#fff"/>
        <path d="M66,150 L134,150 L146,176 L54,176 Z" fill="#c8913a" stroke="${INK}" stroke-width="4"/>
        <path d="M60,166 L140,166" stroke="${INK}" stroke-width="3"/>
      </g>
      <radialGradient id="bsg" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#9fd3ff" stop-opacity=".2"/><stop offset="1" stop-color="#3a0d6b" stop-opacity=".6"/></radialGradient>`,

    // Sorcière : chaudron et deux fioles (vie / mort)
    witch: () => `
      ${bg("bwi", "#e76f51", "#4a1405")}
      ${dots("#ffd23f", 0.25)}
      <g filter="url(#hand)">
        <path d="M70,58 C64,44 78,36 84,46 C90,30 112,32 112,48 C122,40 136,50 128,62" fill="none" stroke="#b9f18c" stroke-width="5" stroke-linecap="round" opacity=".9"/>
        <ellipse cx="100" cy="112" rx="60" ry="12" fill="#2b9348" stroke="${INK}" stroke-width="4"/>
        <path d="M40,112 C40,170 160,170 160,112 Z" fill="${INK}"/>
        <path d="M60,168 L52,186 M140,168 L148,186" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <path d="M24,110 L24,92 L20,86 L36,86 L32,92 L32,110 C44,116 44,140 28,142 C12,140 12,116 24,110 Z" fill="#80ed99" stroke="${INK}" stroke-width="3.5"/>
        <path d="M168,110 L168,92 L164,86 L180,86 L176,92 L176,110 C188,116 188,140 172,142 C156,140 156,116 168,110 Z" fill="#d62828" stroke="${INK}" stroke-width="3.5"/>
        <path d="M166,124 L178,124 M172,118 L172,132" stroke="${PAPER}" stroke-width="3"/>
      </g>
      <circle cx="84" cy="104" r="5" fill="#b9f18c"/><circle cx="110" cy="100" r="4" fill="#b9f18c"/><circle cx="96" cy="94" r="3" fill="#b9f18c"/>
      <path d="M60,150 C80,160 120,160 140,150" stroke="#ff9f1c" stroke-width="3" fill="none" opacity=".6"/>`,

    // Chasseur : cible et fusil
    hunter: () => `
      ${bg("bh", "#8ab17d", "#22381c")}
      <g filter="url(#hand)">
        <circle cx="100" cy="96" r="70" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
        <circle cx="100" cy="96" r="52" fill="#bc4b51"/>
        <circle cx="100" cy="96" r="36" fill="${PAPER}"/>
        <circle cx="100" cy="96" r="20" fill="#bc4b51"/>
        <circle cx="100" cy="96" r="7" fill="${INK}"/>
        <path d="M100,14 L100,48 M100,144 L100,178 M18,96 L52,96 M148,96 L182,96" stroke="${INK}" stroke-width="5"/>
        <g transform="rotate(-28 100 150)">
          <rect x="26" y="146" width="120" height="8" rx="3" fill="${INK}"/>
          <path d="M120,150 L176,150 L184,164 L150,168 Z" fill="#7f4f24" stroke="${INK}" stroke-width="3"/>
          <rect x="96" y="154" width="6" height="10" fill="${INK}"/>
        </g>
      </g>`,

    // Cupidon : arc et cœur transpercé
    cupid: () => `
      ${bg("bc", "#7ec8e3", "#1d4e89")}
      ${rays(100, 100, 20, 0, 150, "#ffffff", 0.14)}
      <g filter="url(#hand)">
        <path d="M100,164 C40,120 34,70 66,58 C84,52 96,64 100,76 C104,64 116,52 134,58 C166,70 160,120 100,164 Z" fill="#e63946" stroke="${INK}" stroke-width="5"/>
        <path d="M74,74 C70,84 72,92 78,98" stroke="#ffb3c1" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M22,168 L178,40" stroke="${INK}" stroke-width="5"/>
        <path d="M178,40 L160,42 L166,48 L170,58 Z" fill="${INK}"/>
        <path d="M22,168 L16,152 M22,168 L36,170 M30,160 L22,146 M30,160 L44,162" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/>
        <path d="M30,30 C70,40 58,92 22,112" fill="none" stroke="#7f4f24" stroke-width="6" stroke-linecap="round"/>
        <path d="M30,30 L22,112" stroke="${PAPER}" stroke-width="2"/>
      </g>`,

    // Petite fille : un œil derrière le trou de la serrure
    girl: () => `
      ${bg("bg", "#3a506b", "#0b132b")}
      ${stars(21, 28, "#fff")}
      <g filter="url(#hand)">
        <rect x="30" y="18" width="140" height="170" rx="10" fill="#8d5524" stroke="${INK}" stroke-width="5"/>
        <path d="M40,30 L160,30 M40,176 L160,176" stroke="#5b3416" stroke-width="4"/>
        <path d="M54,40 L54,168 M146,40 L146,168" stroke="#5b3416" stroke-width="3" opacity=".6"/>
        <circle cx="100" cy="86" r="34" fill="${INK}"/>
        <path d="M80,104 L66,160 L134,160 L120,104 Z" fill="${INK}"/>
        <ellipse cx="100" cy="88" rx="22" ry="13" fill="#fff8e7"/>
        <circle cx="100" cy="88" r="10" fill="#4a90a4"/>
        <circle cx="100" cy="88" r="5" fill="${INK}"/>
        <circle cx="96" cy="84" r="2.5" fill="#fff"/>
        <path d="M78,80 C88,70 112,70 122,80" stroke="#f4a261" stroke-width="3" fill="none"/>
        <circle cx="150" cy="104" r="7" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
      </g>`,

    // Garde : bouclier et lanterne
    guard: () => `
      ${bg("bgu", "#a8dadc", "#1d3557")}
      ${rays(100, 96, 16, 0, 150, "#f1faee", 0.18)}
      <g filter="url(#hand)">
        <path d="M100,22 L164,44 C164,110 140,156 100,182 C60,156 36,110 36,44 Z" fill="#457b9d" stroke="${INK}" stroke-width="6"/>
        <path d="M100,36 L150,54 C150,108 132,142 100,164 Z" fill="#1d3557"/>
        <path d="M100,62 L108,86 L134,86 L113,101 L121,126 L100,111 L79,126 L87,101 L66,86 L92,86 Z" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
      </g>`,

    // Ancien : visage barbu et bâton noueux
    elder: () => `
      ${bg("be", "#d4a373", "#5e3a1a")}
      ${rays(96, 70, 22, 0, 150, "#fefae0", 0.18)}
      <g filter="url(#hand)">
        <path d="M60,60 C60,30 132,30 132,60 L132,82 L60,82 Z" fill="#6b4226" stroke="${INK}" stroke-width="4"/>
        <ellipse cx="96" cy="84" rx="34" ry="36" fill="#f1c27d" stroke="${INK}" stroke-width="4"/>
        <path d="M70,76 L86,78 M106,78 L122,76" stroke="${PAPER}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="80" cy="86" r="3.5" fill="${INK}"/><circle cx="112" cy="86" r="3.5" fill="${INK}"/>
        <path d="M60,96 C56,150 80,186 96,192 C112,186 136,150 132,96 C124,110 112,104 96,108 C80,104 68,110 60,96 Z" fill="#f8f4ea" stroke="${INK}" stroke-width="4"/>
        <path d="M84,104 C90,98 102,98 108,104" stroke="${INK}" stroke-width="3" fill="none"/>
        <path d="M86,124 L90,160 M96,120 L96,170 M106,124 L102,160" stroke="#c9c2b2" stroke-width="2"/>
        <path d="M160,190 L156,60" stroke="#6b4226" stroke-width="8" stroke-linecap="round"/>
        <circle cx="156" cy="56" r="10" fill="#6b4226" stroke="${INK}" stroke-width="3"/>
        <path d="M152,100 L164,96 M150,140 L162,136" stroke="${INK}" stroke-width="3"/>
      </g>`,

    // Idiot du village : bonnet à grelots
    idiot: () => `
      ${bg("bi", "#ffd166", "#d1495b")}
      ${dots("#fff", 0.3)}
      <g filter="url(#hand)">
        <path d="M100,100 L36,40 C46,74 52,90 60,108 Z" fill="#06d6a0" stroke="${INK}" stroke-width="4"/>
        <path d="M100,100 L164,40 C154,74 148,90 140,108 Z" fill="#118ab2" stroke="${INK}" stroke-width="4"/>
        <path d="M100,100 L100,22 C88,60 76,86 74,108 L126,108 C124,86 112,60 100,22 Z" fill="#ef476f" stroke="${INK}" stroke-width="4"/>
        <circle cx="36" cy="40" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
        <circle cx="164" cy="40" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
        <circle cx="100" cy="20" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
        <path d="M54,108 L146,108 L146,120 L54,120 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
        <path d="M62,120 C62,170 138,170 138,120 Z" fill="#f1c27d" stroke="${INK}" stroke-width="4"/>
        <circle cx="84" cy="136" r="5" fill="${INK}"/><circle cx="116" cy="136" r="5" fill="${INK}"/>
        <path d="M78,150 C90,166 110,166 122,150" stroke="${INK}" stroke-width="4" fill="#d1495b"/>
        <circle cx="72" cy="148" r="5" fill="#ef476f" opacity=".5"/><circle cx="128" cy="148" r="5" fill="#ef476f" opacity=".5"/>
      </g>`,

    // Corbeau : silhouette noire et plume
    raven: () => `
      ${bg("br", "#f4d35e", "#ee964b")}
      ${rays(140, 60, 20, 0, 180, "#fff", 0.2)}
      <circle cx="140" cy="60" r="26" fill="#fff6d5" opacity=".9"/>
      <g filter="url(#hand)" fill="${INK}">
        <path d="M30,120 C44,96 70,86 92,90 L104,74 C112,64 128,66 132,76 L150,80 L134,88 C140,110 130,134 108,146 L130,176 L114,174 L100,152 L86,156 L90,178 L76,172 L74,150 C50,148 34,138 30,120 Z"/>
        <path d="M60,104 C40,80 30,66 14,62 C26,82 34,98 48,112 Z"/>
      </g>
      <circle cx="118" cy="78" r="3" fill="#fff"/>
      <g filter="url(#hand)"><path d="M150,184 C160,150 176,130 190,120 C186,142 174,166 150,184 Z" fill="${INK}" opacity=".85"/><path d="M150,184 L184,126" stroke="#f4d35e" stroke-width="1.5"/></g>`,

    // Renard : tête géométrique
    fox: () => `
      ${bg("bf", "#52b788", "#1b4332")}
      ${rays(100, 110, 18, 0, 150, "#d8f3dc", 0.15)}
      <g filter="url(#hand)">
        <path d="M40,40 L76,76 L124,76 L160,40 L152,108 L100,170 L48,108 Z" fill="#f77f00" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M50,54 L70,76 L56,88 Z M150,54 L130,76 L144,88 Z" fill="${INK}"/>
        <path d="M48,108 L100,118 L152,108 L100,170 Z" fill="#fff8e7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M68,100 L88,104 L72,108 Z M132,100 L112,104 L128,108 Z" fill="${INK}"/>
        <path d="M92,154 L108,154 L100,168 Z" fill="${INK}"/>
      </g>`
  };

  // Dos de carte
  const BACK = () => `
    ${bg("bb", "#2a2350", "#0a0818")}
    ${stars(3, 50, "#ffe9a8")}
    <g fill="none" stroke="#c8a24a" stroke-width="3" opacity=".9">
      <rect x="12" y="12" width="176" height="176" rx="12"/>
      <rect x="20" y="20" width="160" height="160" rx="8" stroke-dasharray="2 6"/>
    </g>
    <circle cx="100" cy="92" r="40" fill="#f6e7b0" filter="url(#glow)"/>
    <circle cx="114" cy="84" r="34" fill="#2a2350"/>
    <g filter="url(#hand)" fill="#0a0818">${pines("#0a0818", 186)}<path d="M0,186 L200,186 L200,200 L0,200 Z"/></g>
    <circle cx="82" cy="150" r="4" fill="#ffd23f" filter="url(#glow)"/><circle cx="98" cy="150" r="4" fill="#ffd23f" filter="url(#glow)"/>`;

  function svg(inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${DEFS}</defs>${inner}<rect width="200" height="200" filter="url(#grain)" opacity=".45"/></svg>`;
  }
  const cache = {};
  function uri(role) {
    if (!cache[role]) {
      const f = role === "back" ? BACK : ART[role];
      cache[role] = f ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(f())) : "";
    }
    return cache[role];
  }

  const META = {
    wolf: { emoji: "🐺", color: "#c0392b", team: "wolves" },
    lonewolf: { emoji: "🌑", color: "#3b3f8f", team: "solo" },
    villager: { emoji: "🧑‍🌾", color: "#d9922e", team: "village" },
    seer: { emoji: "🔮", color: "#7b3fa0", team: "village" },
    witch: { emoji: "🧪", color: "#e76f51", team: "village" },
    hunter: { emoji: "🎯", color: "#5c8a4f", team: "village" },
    cupid: { emoji: "💘", color: "#3d8bc2", team: "village" },
    girl: { emoji: "👁️", color: "#3a506b", team: "village" },
    guard: { emoji: "🛡️", color: "#457b9d", team: "village" },
    elder: { emoji: "🧓", color: "#a0703f", team: "village" },
    idiot: { emoji: "🃏", color: "#ef476f", team: "village" },
    raven: { emoji: "🪶", color: "#e39b3b", team: "village" },
    fox: { emoji: "🦊", color: "#2d8a5e", team: "village" }
  };

  window.LG = window.LG || {};
  window.LG.art = uri;
  window.LG.META = META;
})();
