# 🐺 Loup Garou — Résidence LEONE

Le jeu du Loup Garou en ligne, **sur le téléphone de chacun**, autour de la même table.

**Jouer :** https://jk-asfc.github.io/loup-garou/ · **Site de la résidence :** https://jk-asfc.github.io/portfolio/

## Comment ça marche

1. **Créer une partie** : l'hôte obtient un code de 4 lettres (à partager par lien, QR code ou à voix haute).
2. **Salle d'attente** : chat, réactions emoji sur les messages, émojis qui s'envolent sur tous les écrans.
3. **Réglages de l'hôte** : composition automatique selon le nombre de joueurs (ou à la main), narrateur, voix du conteur, rôles dévoilés à la mort, élection du maire, durées.
4. **Distribution** : chacun retourne sa carte en secret, lit l'explication de son rôle, puis valide.
5. **La nuit** : tout le monde ferme les yeux. Le téléphone **vibre** quand ton rôle est appelé (3 longues vibrations) ; le village qui s'endort / se réveille fait vibrer tous les téléphones.
6. **Le jour** : annonce des morts, débat, vote sur le téléphone (votes visibles, voix double du maire).

### Mode narrateur
Un joueur peut être **narrateur** : il ne joue pas, voit tous les rôles et toutes les actions de la nuit en direct, a le texte à lire à voix haute, et fait avancer la partie avec le bouton **Suivant**.
Sans narrateur, l'appli raconte toute seule (voix de synthèse sur le téléphone de l'hôte, ou sur tous).

### Rôles
Loup-garou · Loup solitaire · Villageois · Voyante · Sorcière · Chasseur · Cupidon · Petite fille · Garde · Ancien · Idiot du village · Corbeau · Renard

Les illustrations des cartes sont **originales** (SVG dessinés pour ce projet, dans `js/roles.js`).

### Langues
20 langues (les mêmes que le site LEONE) : français, anglais, espagnol, portugais, italien, allemand, polonais, russe, ukrainien, turc, arabe, hindi, vietnamien, malais, chinois, japonais, coréen, lingala, créole guadeloupéen et martiniquais. La langue choisie sur le site LEONE est reprise automatiquement.

## Technique

- Site **statique** (GitHub Pages), HTML/CSS/JS sans framework ni dépendance.
- Temps réel : **Supabase Realtime** (projet « leone ») en WebSocket, sans SDK. Aucune table : la partie vit sur le téléphone de l'hôte, qui fait autorité et diffuse l'état.
- Les infos secrètes (rôle, actions de nuit, chat de la meute) sont **chiffrées de bout en bout** entre chaque joueur et l'hôte (ECDH P-256 + AES-GCM) : impossible de lire les rôles des autres en espionnant le réseau.
- Sons et ambiances **synthétisés** en Web Audio (vent, grillons, chouette, hurlements, cloche, battements de cœur…) — aucun fichier audio.
- Vibrations : API Vibration (Android). Sur iPhone, Safari ne vibre pas : la voix du conteur appelle les rôles.
- L'écran reste allumé pendant la partie (Wake Lock). Recharger la page reconnecte automatiquement, y compris l'hôte (état sauvegardé).

| Fichier | Rôle |
|---|---|
| `js/engine.js` | Moteur de jeu (règles, étapes, votes, victoire) — testable avec Node |
| `js/session.js` | Hôte / joueur : synchronisation et actions |
| `js/net.js` | Client Realtime + chiffrement |
| `js/app.js` | Interface |
| `js/audio.js` | Sons, ambiances, voix, vibrations |
| `js/roles.js` | Illustrations des cartes |
| `js/i18n.js`, `js/lang/*.js` | Traductions |

### Tests

```bash
node test/simulate.js 500   # 500 parties aléatoires de 3 à 20 joueurs
node test/i18n-check.js     # toutes les clés de traduction présentes
```

Pour essayer à plusieurs sur un seul ordinateur, ouvre plusieurs onglets avec `?profil=a`, `?profil=b`… (un joueur différent par onglet).
