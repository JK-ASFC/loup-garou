// Simulation de parties aléatoires : node test/simulate.js [parties]
const LG = require("../js/engine.js");
let clock = 0;
const now = () => clock;
let seed = 1;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const N = +process.argv[2] || 2000;
const wins = {}; let steps = 0, maxDays = 0;
for (let game = 0; game < N; game++) {
  const n = 3 + (game % 18);
  const narr = game % 3 === 0;
  const S = LG.newState("TEST", { id: "p0" });
  const E = new LG.Engine(S, { now, rand });
  for (let i = 0; i < n + (narr ? 1 : 0); i++) E.join({ id: "p" + i, name: "J" + i, av: "🐺" });
  if (narr) E.handle("p0", { t: "settings", patch: { narrator: "p" + n } });
  if (game % 5 === 0) E.handle("p0", { t: "settings", patch: { reveal: false } });
  E.handle("p0", { t: "start" });
  if (S.phase !== "deal") throw new Error("pas démarré " + JSON.stringify(S.toasts));
  let guard = 0;
  while (S.phase !== "end") {
    if (++guard > 20000) throw new Error("boucle infinie " + JSON.stringify(S.g.step));
    const g = S.g, st = g.step;
    // chaque joueur agit au hasard selon sa vue privée
    for (const p of S.players) {
      const pv = E.priv(p.id);
      if (st.t === "deal" && rand() < 0.5) E.handle(p.id, { t: "ready" });
      if (pv.act && !pv.act.done && rand() < 0.3) {
        const o = pv.act.opts;
        if (pv.act.t === "witch") E.handle(p.id, { t: "witch", save: rand() < 0.5, kill: rand() < 0.3 ? o[Math.floor(rand() * o.length)] : null });
        else if (pv.act.t === "cupid") { const a = o.slice().sort(() => rand() - 0.5); E.handle(p.id, { t: "pick", ids: a.slice(0, 2) }); }
        else if (o.length) E.handle(p.id, { t: "pick", ids: [o[Math.floor(rand() * o.length)]] });
      }
      if (pv.spy && rand() < 0.2) E.handle(p.id, { t: "spy", on: !pv.spy.on });
      if (S.g.step && ["vote", "mayor"].includes(S.g.step.t) && rand() < 0.3) {
        const opts = E.options(p.id); if (opts.length) E.handle(p.id, { t: "vote", id: opts[Math.floor(rand() * opts.length)] });
      }
      if (S.g.step && S.g.step.t === "discuss" && rand() < 0.1) E.handle(p.id, { t: "ready" });
      if (rand() < 0.01) E.handle(p.id, { t: "chat", x: "salut" });
    }
    if (narr && rand() < 0.3) E.handle("p" + n, { t: "nskip" });
    clock += 700;
    E.tick();
    JSON.stringify(E.pub()); S.players.forEach((p) => JSON.stringify(E.priv(p.id)));
    steps++;
  }
  // cohérence de la victoire
  const g = S.g, alive = g.seat.filter((id) => g.alive[id]);
  const wolves = alive.filter((id) => LG.isWolf(g.roles[id]));
  if (g.winner === "village" && wolves.length) throw new Error("village gagne avec loups vivants");
  if (g.winner === "wolves" && wolves.length !== alive.length) throw new Error("loups gagnent à tort");
  wins[g.winner] = (wins[g.winner] || 0) + 1;
  maxDays = Math.max(maxDays, g.day);
  E.handle("p0", { t: "restart" });
  if (S.phase !== "lobby") throw new Error("retour salon");
}
console.log("OK", N, "parties", wins, "ticks", steps, "jours max", maxDays);
