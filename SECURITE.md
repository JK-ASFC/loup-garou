# Audit de sécurité — Loup Garou

Audit du 26/11/2026 : code du jeu, configuration du site (GitHub Pages) et projet Supabase partagé avec LEONE.

## Ce qu'il faut protéger

| Bien | Menace |
|---|---|
| Les rôles et les actions de nuit | Un joueur qui triche avec la console du navigateur ou en espionnant le réseau |
| Le déroulement de la partie | Un intrus qui se fait passer pour l'hôte ou pour un joueur |
| Les écrans des joueurs | Injection de HTML ou de faux messages |
| Le projet Supabase « leone » | Abus de la clé publique (anon) |

## Failles trouvées et corrigées

| # | Gravité | Problème | Correction |
|---|---|---|---|
| 1 | **Élevée** | N'importe qui connaissant le code pouvait diffuser un **faux état de partie** (faux joueurs, faux rôles, faux votes) en se faisant passer pour l'hôte. | Chaque message de l'hôte est **signé (ECDSA P-256)**. La clé de l'hôte est **épinglée** à la première connexion et vérifiée par une **empreinte dans le lien d'invitation** (`&k=…`). Message non signé ou d'une autre clé : ignoré. |
| 2 | **Élevée** | **Fuite des rôles par les métadonnées** : l'identifiant de l'expéditeur des actions circulait en clair, et l'hôte n'envoyait des infos privées qu'aux joueurs concernés. En écoutant le canal, on pouvait voir qui agissait au tour de la voyante, des loups… | Actions **sans identifiant en clair** (l'hôte retrouve l'auteur grâce à sa clé), **taille fixe** (768 o), **messages-leurres** envoyés la nuit par tous les vivants. Les infos privées sont envoyées à **tous les joueurs en même temps et à taille égale**. |
| 3 | Moyenne | **Identifiant de joueur non validé** : un faux joueur pouvait injecter du HTML dans les attributs de la page (le script était déjà bloqué par la CSP, mais pas l'injection de faux éléments). | Identifiants vérifiés côté hôte (`[0-9a-f]{18}`) et dans le moteur (`[\w-]{1,40}`), clé publique obligatoire et bien formée. |
| 4 | Moyenne | **Spectateurs** (arrivés en cours de partie) : ils lisaient le **chat des morts**. Un joueur vivant pouvait ouvrir un 2e onglet pour espionner les morts. | Les spectateurs n'ont plus accès au chat des morts et ne peuvent plus écrire. |
| 5 | Moyenne | **Réactions** : clé libre (`__proto__`, `constructor`) → plantage de l'hôte possible. | Liste fermée de réactions et d'émojis volants. |
| 6 | Faible | **Usurpation visuelle de nom** avec des caractères invisibles ou d'inversion de texte (U+202E…). | Ces caractères sont supprimés des noms et des messages. |
| 7 | Faible | **Inondation** (milliers de faux joueurs ou de messages). | Au plus 8 nouveaux joueurs / 10 s, 80 messages / s, anti-rejeu des actions (nonce + horodatage). |
| 8 | Faible | **CSP incomplète** et pas de protection contre l'affichage dans un cadre (clickjacking). | Ajout de `object-src`, `base-uri`, `form-action`, `frame-src`, `worker-src`, `media-src` à `'none'` ; le jeu refuse d'être affiché dans le cadre d'un autre site. |
| 9 | Info | Le jeu exigeait le chiffrement… sauf si le navigateur ne le supportait pas (repli en clair). | Plus de repli en clair : un navigateur trop ancien reçoit un message lui demandant de se mettre à jour. |

## Vérifications

- `node test/security.js` : 26 contrôles (identifiants piégés, noms piégés, réactions piégées, droits de l'hôte, cibles interdites, spectateurs, vues publiques/privées) — **tous réussis**.
- `node test/simulate.js 200` : 200 parties complètes — **OK**.
- Attaques réelles depuis un navigateur sur une partie en cours :
  - faux état signé avec une autre clé → **ignoré** ;
  - faux état présenté avec la clé du vrai hôte → **signature refusée** ;
  - faux émoji au nom d'un joueur → **ignoré** ;
  - action en clair au nom d'un joueur → **ignorée** ;
  - inscription avec un identifiant contenant du HTML → **refusée** ;
  - écoute de la nuit : aucune action ne porte d'identifiant, toutes font la même taille, et les infos privées partent toujours vers tous les joueurs à taille égale.

## Limites connues (inhérentes au fonctionnement)

- **L'hôte voit tout** : la partie tourne sur son téléphone. Pour une partie « sérieuse », l'hôte peut être le **narrateur** (il ne joue pas).
- **Première connexion par code** (sans le lien) : la clé de l'hôte est acceptée de confiance. Pour une sécurité maximale, rejoindre via le **lien ou le QR code** (empreinte vérifiée).
- **Même domaine que les autres sites** `jk-asfc.github.io` (LEONE, portfolio, wiki…) : ces sites partagent le même stockage local. Une faille XSS dans l'un d'eux pourrait lire les clés du jeu. Un nom de domaine dédié isolerait complètement le jeu.
- **Canaux Realtime publics** : un intrus qui connaît le code peut voir *qu'il* se passe quelque chose (nombre de messages, présence), mais rien de leur contenu.

## Projet Supabase « leone » (partagé avec le site LEONE)

Le jeu n'utilise **aucune table** ; ces points concernent la base de LEONE :

| Gravité | Constat | Recommandation |
|---|---|---|
| Faible | 20 fonctions `SECURITY DEFINER` appelables par `anon` — voulu (API publique contrôlée). `admin_purge` vérifie bien `is_admin()` : **pas exploitable**. | Par précaution : `revoke execute on function public.admin_purge() from anon;` |
| Faible | 6 fonctions sans `search_path` fixé (`leone_name_key`, `leone_hash`, …). | Ajouter `set search_path = public`. |
| Faible | Protection contre les mots de passe divulgués désactivée (comptes organisateurs). | L'activer dans Supabase → Authentication → Policies. |
