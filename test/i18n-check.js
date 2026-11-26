// Vérifie que toutes les clés utilisées existent dans chaque langue : node test/i18n-check.js
const fs = require("fs"), path = require("path");
global.window = { LG_I18N: {} }; global.document = {}; global.navigator = {};
eval(fs.readFileSync(path.join(__dirname, "../js/i18n.js"), "utf8"));
const D = window.LG_I18N;
const app = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
const used = new Set([...app.matchAll(/\bt\("([\w.]+)"/g)].map((m) => m[1]));
const roles = ["wolf","lonewolf","villager","seer","witch","hunter","cupid","girl","guard","elder","idiot","raven","fox"];
roles.forEach((r) => { used.add("role." + r); used.add("desc." + r); });
["village","wolves","solo"].forEach((x) => { used.add("team." + x); used.add("goal." + x); });
["cupid","lovers","guard","seer","fox","wolves","lonewolf","witch","raven"].forEach((x) => { used.add("n.call." + x); used.add("n.end." + x); });
["wolves","poison","lone","vote","hunter","love","dead"].forEach((x) => { used.add("cause." + x); used.add("n.death." + x); });
["village","wolves","lonewolf","lovers","nobody"].forEach((x) => { used.add("end." + x); used.add("n.win." + x); });
["call","act","end"].forEach((x) => used.add("sub." + x));
["host","all","off"].forEach((x) => used.add("opt.voice." + x));
["seer","fox","guard","raven","lonewolf","hunter","successor","tiebreak","cupid","wolves","witch"].forEach((x) => { used.add("act." + x + ".title"); used.add("act." + x + ".hint"); });
["nightfall","lovers","wolves","dawn","mayor","discuss","vote","tiebreak","verdict","hunter","successor","deal","end"].forEach((x) => used.add("step." + x));
["join","kick","lobby"].forEach((x) => used.add("sys." + x));
["wolves","dead"].forEach((x) => used.add("chat.chan." + x));
["off","ok","nohost"].forEach((x) => used.add("conn." + x));
["sound","ambient","voice","vib"].forEach((x) => used.add("set." + x));
const dyn = [...used].filter((k) => k.endsWith("."));
dyn.forEach((k) => used.delete(k));
for (const f of fs.readdirSync(path.join(__dirname, "../js/lang"))) eval(fs.readFileSync(path.join(__dirname, "../js/lang", f), "utf8"));
let bad = 0;
for (const lang of Object.keys(D)) {
  const miss = [...used].filter((k) => !(k in D[lang]));
  const extra = Object.keys(D[lang]).filter((k) => !(k in D.fr));
  const ph = Object.keys(D[lang]).filter((k) => D.fr[k] && JSON.stringify((D.fr[k].match(/\{\w+\}/g) || []).sort()) !== JSON.stringify((D[lang][k].match(/\{\w+\}/g) || []).sort()));
  if (miss.length || extra.length || ph.length) bad++;
  console.log(lang.padEnd(7), Object.keys(D[lang]).length, "clés", miss.length ? "MANQUE " + miss.join(",") : "", extra.length ? "EN TROP " + extra.join(",") : "", ph.length ? "VARIABLES " + ph.join(",") : "");
}
process.exit(bad ? 1 : 0);
