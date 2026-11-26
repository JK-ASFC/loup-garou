// Tests de sécurité du moteur : node test/security.js
const LG = require("../js/engine.js");
let ok = 0, ko = 0;
const check = (name, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", name); } };

const S = LG.newState("TEST", { id: "h" });
const E = new LG.Engine(S, { rand: Math.random });
E.join({ id: "h", name: "Hôte" });

// 1. Identifiants piégés refusés (injection HTML dans les attributs)
check("id avec HTML refusé", !E.join({ id: '"><img src=x>', name: "x" }));
check("id trop long refusé", !E.join({ id: "a".repeat(41), name: "x" }));
check("id non texte refusé", !E.join({ id: { toString: () => "a" }, name: "x" }));

// 2. Noms nettoyés (inversion de texte, caractères invisibles, contrôle)
E.join({ id: "a", name: "Al‮ice​\u0007", av: "<b>" });
const a = E.player("a");
check("caractère d'inversion supprimé", !/[‮​\u0007]/.test(a.name));
check("avatar non emoji remplacé", a.av === "🙂");
E.join({ id: "b", name: "x".repeat(200) });
check("nom limité à 18 caractères", E.player("b").name.length <= 18);
E.join({ id: "c", name: "Carl" });
E.join({ id: "d", name: "Dana" });

// 3. Réactions : liste fermée (pas de __proto__ / constructor)
E.handle("a", { t: "chat", x: "salut" });
const msg = S.chat[S.chat.length - 1];
let crashed = false;
try {
  E.handle("b", { t: "react", id: msg.id, e: "__proto__" });
  E.handle("b", { t: "react", id: msg.id, e: "constructor" });
  E.handle("b", { t: "react", id: msg.id, e: "<script>" });
} catch (e) { crashed = true; }
check("réactions piégées sans plantage", !crashed);
check("réactions piégées ignorées", Object.keys(msg.r).length === 0);
E.handle("b", { t: "react", id: msg.id, e: "🔥" });
check("réaction normale acceptée", msg.r["🔥"] && msg.r["🔥"].includes("b"));
check("prototype intact", ({}).polluted === undefined && typeof Object.prototype.indexOf === "undefined");

// 4. Seul l'hôte règle la partie
E.handle("a", { t: "settings", patch: { reveal: false, narrator: "a" } });
check("un joueur ne peut pas changer les réglages", S.settings.reveal === true && S.settings.narrator === null);
E.handle("a", { t: "kick", id: "b" });
check("un joueur ne peut pas exclure", !!E.player("b"));
E.handle("a", { t: "start" });
check("un joueur ne peut pas lancer", S.phase === "lobby");
E.handle("h", { t: "settings", patch: { nightSec: 1e9, voteSec: -5, roles: { wolf: 999, __proto__: 3 } } });
check("valeurs bornées", S.settings.nightSec === 180 && S.settings.voteSec === 20 && S.settings.roles.wolf <= 8);
E.handle("h", { t: "settings", patch: { auto: true } });

// 5. Exclusion définitive
E.handle("h", { t: "kick", id: "b" });
check("exclu ne peut pas revenir", !E.join({ id: "b", name: "Bob" }));

// 6. Partie : actions hors de son rôle ignorées
E.handle("h", { t: "start" });
check("partie lancée", S.phase === "deal");
const g = S.g;
S.players.forEach((p) => E.handle(p.id, { t: "ready" }));
// avance jusqu'à l'étape des loups
let guard = 0;
while (!(g.step && g.step.t === "wolves" && g.step.sub === "act") && guard++ < 50) E.skip();
const wolf = g.seat.find((id) => LG.isWolf(g.roles[id]));
const villager = g.seat.find((id) => !LG.isWolf(g.roles[id]));
E.handle(villager, { t: "pick", ids: [wolf] });
check("un villageois ne peut pas voter avec les loups", !(villager in g.acts.wolfVotes));
E.handle(wolf, { t: "pick", ids: [wolf] });
check("un loup ne peut pas viser un loup", g.acts.wolfVotes[wolf] !== wolf);
E.handle(wolf, { t: "pick", ids: ["inconnu"] });
check("cible inconnue refusée", g.acts.wolfVotes[wolf] !== "inconnu");

// 7. Spectateur : ni chat des morts, ni écriture
E.join({ id: "spec", name: "Spectateur" });
S.chat.push({ id: 9999, f: villager, x: "secret de mort", t: Date.now(), c: "dead", r: {} });
check("spectateur ne lit pas le cimetière", !E.priv("spec").chat.some((m) => m.c === "dead"));
const before = S.chat.length;
E.handle("spec", { t: "chat", x: "je triche" });
check("spectateur ne peut pas écrire", S.chat.length === before);

// 8. Vue publique : aucun rôle vivant ni nombre d'acteurs la nuit
const pub = JSON.stringify(E.pub());
check("aucun rôle vivant dans la vue publique", g.seat.filter((id) => g.alive[id]).every((id) => !(id in E.pub().g.roles)));
check("pas de compteur d'acteurs la nuit", E.pub().g.step.total === undefined);
check("pas de victime dans la vue publique", !pub.includes("wolfVotes") && !pub.includes("victim"));

// 9. Vue privée : un villageois ne voit pas la meute
check("villageois sans meute", !E.priv(villager).pack);
check("villageois sans votes des loups", !E.priv(villager).act);

console.log(ko ? `${ko} échec(s), ${ok} réussi(s)` : `OK : ${ok} vérifications de sécurité réussies`);
process.exit(ko ? 1 : 0);
