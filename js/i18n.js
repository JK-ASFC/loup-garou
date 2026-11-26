/* =============================================================
   Loup Garou — traductions
   fr et en sont intégrés ; les autres langues sont dans js/lang/
   et chargées à la demande. Clé manquante → anglais → français.
   ============================================================= */
(function () {
  "use strict";
  const LANGS = [
    { code: "fr", name: "Français", locale: "fr-FR" },
    { code: "en", name: "English", locale: "en-GB" },
    { code: "es", name: "Español", locale: "es-ES" },
    { code: "pt", name: "Português", locale: "pt-PT" },
    { code: "it", name: "Italiano", locale: "it-IT" },
    { code: "de", name: "Deutsch", locale: "de-DE" },
    { code: "pl", name: "Polski", locale: "pl-PL" },
    { code: "ru", name: "Русский", locale: "ru-RU" },
    { code: "uk", name: "Українська", locale: "uk-UA" },
    { code: "tr", name: "Türkçe", locale: "tr-TR" },
    { code: "ar", name: "العربية", locale: "ar-SA", dir: "rtl" },
    { code: "hi", name: "हिन्दी", locale: "hi-IN" },
    { code: "vi", name: "Tiếng Việt", locale: "vi-VN" },
    { code: "ms", name: "Bahasa Melayu", locale: "ms-MY" },
    { code: "zh", name: "中文", locale: "zh-CN" },
    { code: "ja", name: "日本語", locale: "ja-JP" },
    { code: "ko", name: "한국어", locale: "ko-KR" },
    { code: "ln", name: "Lingála", locale: "fr-FR" },
    { code: "gcf", name: "Kréyòl Gwadloup", locale: "fr-FR" },
    { code: "gcf-MQ", name: "Kréyòl Matinik", locale: "fr-FR" }
  ];

  const D = window.LG_I18N = window.LG_I18N || {};

  D.fr = {
    "app.title": "Loup Garou", "app.title1": "Loup", "app.title2": "Garou",
    "home.tagline": "Le jeu du village… sur ton téléphone. Une nuit, des loups, et personne en qui avoir confiance.",
    "home.avatar": "Changer d'avatar", "home.name": "Ton nom", "home.namePh": "Ex. Léa",
    "home.create": "Créer une partie", "home.or": "ou", "home.codePh": "CODE", "home.join": "Rejoindre",
    "home.resume": "Reprendre la partie {code}", "home.rules": "Règles & rôles", "home.leone": "Résidence LEONE",
    "home.fine": "Un téléphone par joueur. Garde le son et la vibration activés.",

    "lobby.code": "Code de la partie", "lobby.share": "Inviter", "lobby.players": "Joueurs", "lobby.host": "Hôte",
    "lobby.narrator": "Narrateur", "lobby.kick": "Exclure", "lobby.kickConfirm": "Exclure {name} de la partie ?",
    "lobby.needMore": "Il faut au moins {n} joueurs.", "lobby.compo": "Composition",
    "lobby.narratorIs": "Narrateur : {name}", "lobby.autoNarr": "Narrateur automatique (voix)",
    "lobby.waitHost": "En attente que {name} lance la partie…", "lobby.settings": "Réglages de l'hôte",
    "lobby.roles": "Rôles", "lobby.options": "Options", "lobby.start": "Lancer la partie",
    "lobby.shareText": "Viens jouer au Loup Garou ! Code : {code}", "lobby.copied": "Lien copié !",

    "opt.revealOn": "Rôles dévoilés à la mort", "opt.revealOff": "Rôles cachés jusqu'à la fin", "opt.mayorOn": "Élection du maire",
    "opt.narrator": "Narrateur", "opt.narrNone": "Aucun — l'appli raconte",
    "opt.narrHint": "Le narrateur ne joue pas : il voit tous les rôles sur son téléphone et raconte l'histoire.",
    "opt.autoHint": "Sans narrateur, l'appli appelle les rôles à voix haute et fait vibrer les téléphones.",
    "opt.manual": "Le narrateur fait avancer chaque étape", "opt.voice": "Voix du conteur",
    "opt.voice.host": "Sur le téléphone de l'hôte", "opt.voice.all": "Sur tous les téléphones", "opt.voice.off": "Désactivée",
    "opt.auto": "Auto", "opt.reveal": "Dévoiler le rôle des morts", "opt.mayor": "Élire un maire (voix double)",
    "opt.nightSec": "Temps d'action la nuit", "opt.discussSec": "Temps de débat", "opt.voteSec": "Temps de vote",

    "err.count": "{r} rôles pour {p} joueurs : ajuste la composition.", "err.min": "Il faut au moins {n} joueurs.",
    "err.nowolf": "Il faut au moins un loup !", "err.name": "Choisis d'abord ton nom 🙂",
    "err.config": "Le serveur de jeu n'est pas configuré.", "err.net": "Connexion impossible. Vérifie ton réseau.",
    "err.code": "Le code fait 4 lettres.", "err.notFound": "Aucune partie trouvée avec le code {code}.",

    "chat.title": "Discussion", "chat.chan.wolves": "Meute", "chat.chan.dead": "Cimetière", "chat.empty": "Pas encore de message. Lance la conversation !",
    "chat.ph": "Écris un message…", "chat.phWolves": "Chuchote à la meute…", "chat.phDead": "Parle aux fantômes…",
    "chat.send": "Envoyer", "chat.sleeping": "Chut… le village dort.",
    "sys.join": "{n} a rejoint le village", "sys.kick": "{n} a été exclu", "sys.lobby": "Retour à la salle d'attente",

    "hud.night": "Nuit {n}", "hud.day": "Jour {n}", "hud.deal": "Distribution", "hud.end": "Fin de partie", "hud.paused": "Pause",
    "game.youDead": "Tu es mort… observe en silence. Le cimetière t'attend dans la discussion.",
    "game.myRole": "Mon rôle", "game.players": "Joueurs", "game.you": "toi",
    "host.menu": "Hôte", "host.abort": "Arrêter", "host.abortConfirm": "Arrêter la partie et revenir à la salle d'attente ?",

    "narr.next": "Suivant", "narr.pause": "Pause", "narr.read": "À lire à voix haute", "narr.step": "Étape",
    "narr.spying": "La petite fille espionne !", "narr.table": "La table", "narr.elderLife": "Ancien : {n} vie(s) en réserve",
    "narr.guardLast": "Dernier protégé : {name}", "narr.next2": "Ensuite",
    "sub.call": "réveil", "sub.act": "action", "sub.end": "fin",
    "step.nightfall": "Tombée de la nuit", "step.lovers": "Les amoureux", "step.wolves": "Les loups-garous", "step.dawn": "Lever du jour",
    "step.mayor": "Élection du maire", "step.discuss": "Débat", "step.vote": "Vote", "step.tiebreak": "Égalité", "step.verdict": "Verdict",
    "step.hunter": "Tir du chasseur", "step.successor": "Successeur du maire", "step.deal": "Distribution", "step.end": "Fin",

    "deal.title": "Ta carte", "deal.tap": "Touche la carte pour la retourner — cache l'écran !", "deal.hide": "Touche encore pour la cacher.",
    "deal.youAre": "Tu es : {role}", "deal.pack": "Ta meute :",
    "deal.howVib": "La nuit, ton téléphone vibre fort quand ton rôle est appelé : ouvre les yeux à ce moment-là seulement.",
    "deal.howNoVib": "Ton téléphone ne vibre pas : écoute la voix du conteur pour savoir quand ouvrir les yeux.",
    "deal.howEyes": "Le reste du temps, la nuit, garde les yeux fermés.",
    "deal.howPeek": "Pendant la partie, maintiens « Mon rôle » pour revoir ta carte en douce.",
    "deal.waiting": "Prêts : {n}/{total}", "deal.ready": "J'ai compris",

    "night.yourTurn": "C'est ton tour !", "night.fall": "La nuit tombe…", "night.closeEyes": "Ferme les yeux…",
    "night.openEyes": "Ouvre les yeux, discrètement.", "night.wait": "Le village dort. Ton téléphone vibrera si on a besoin de toi.",
    "night.deadWatch": "Les fantômes veillent sur la nuit…",

    "act.confirm": "Valider", "act.skip": "Ne rien faire", "act.done": "C'est noté. Referme les yeux…",
    "act.seer.title": "Voyante, qui veux-tu sonder ?", "act.seer.hint": "Tu découvriras son vrai rôle.",
    "act.seer.result": "La boule de cristal révèle que {name} est…",
    "act.fox.title": "Renard, qui veux-tu flairer ?", "act.fox.hint": "Tu sauras s'il y a un loup parmi ce joueur et ses deux voisins.",
    "act.fox.yes": "Ça sent le loup ! Au moins un loup parmi : {names}.", "act.fox.no": "Aucun loup parmi : {names}. Tu perds ton flair…",
    "act.guard.title": "Garde, qui protèges-tu ?", "act.guard.hint": "Il sera à l'abri des loups cette nuit (pas deux fois de suite le même).",
    "act.raven.title": "Corbeau, qui désignes-tu ?", "act.raven.hint": "Il aura 2 voix contre lui au prochain vote.",
    "act.lonewolf.title": "Loup solitaire, qui dévores-tu ?", "act.lonewolf.hint": "Tu peux tuer un loup-garou cette nuit… ou attendre.",
    "act.hunter.title": "Chasseur, ta dernière balle !", "act.hunter.hint": "Choisis qui tu emportes avec toi.",
    "act.successor.title": "Maire, désigne ton successeur", "act.successor.hint": "Il héritera de ta voix double.",
    "act.tiebreak.title": "Maire, tranche !", "act.tiebreak.hint": "Choisis qui est éliminé parmi les ex æquo.",
    "act.cupid.title": "Cupidon, choisis deux amoureux", "act.cupid.hint": "Ils seront liés jusqu'à la mort (tu peux te choisir).",
    "act.cupid.done": "{a} et {b} sont désormais amoureux.",
    "act.wolves.title": "Loups, choisissez votre victime", "act.wolves.hint": "Touchez un joueur. Mettez-vous d'accord avec la meute.",
    "act.wolves.agree": "La victime est choisie quand toute la meute vise le même joueur.",
    "act.wolves.caught": "La petite fille vous espionne : c'est {name} !",
    "act.witch.title": "Sorcière, à toi de jouer", "act.witch.hint": "Chaque potion ne sert qu'une fois.",
    "act.witch.victim": "Les loups ont attaqué {name}.", "act.witch.noVictim": "Les loups n'ont tué personne cette nuit.",
    "act.witch.save": "Potion de vie", "act.witch.kill": "Potion de mort", "act.witch.left": "disponible", "act.witch.used": "utilisée",
    "act.witch.pick": "Qui veux-tu empoisonner ?", "act.witch.nothing": "Ne rien faire",
    "act.girl.title": "Petite fille, les loups sont réveillés…", "act.girl.hint": "Tu peux entrouvrir les yeux pour espionner.",
    "act.girl.hold": "Maintiens pour espionner", "act.girl.spying": "Tu espionnes…", "act.girl.nothing": "Les loups hésitent encore…",
    "act.girl.risk": "Plus tu espionnes longtemps, plus tu risques d'être repérée !", "act.girl.caught": "Les loups t'ont repérée !",
    "lovers.title": "Coup de foudre !", "lovers.text": "Tu es amoureux de {name}. Si l'un meurt, l'autre meurt de chagrin.",
    "tie.title": "Égalité !", "tie.wait": "{name}, le maire, doit départager : {names}.",

    "cause.wolves": "dévoré par les loups", "cause.poison": "empoisonné", "cause.lone": "dévoré par le loup solitaire",
    "cause.vote": "éliminé par le village", "cause.hunter": "abattu par le chasseur", "cause.love": "mort de chagrin", "cause.dead": "mort",
    "dawn.title": "Le jour se lève",
    "discuss.title": "Le débat", "discuss.hint": "Accusez, défendez-vous, mentez… Qui sont les loups ?",
    "discuss.ready": "Passer au vote", "discuss.readyOn": "Prêt à voter",
    "mayor.title": "Élection du maire", "mayor.hint": "Vote pour le joueur qui deviendra maire.", "mayor.power": "Sa voix compte double et il tranche les égalités.",
    "vote.title": "Le vote", "vote.hint": "Touche le joueur que tu veux éliminer. Tu peux changer d'avis.",
    "vote.mayorX2": "La voix du maire compte double.", "vote.progress": "Votes : {n}/{total}", "vote.idiot": "Tu as perdu ton droit de vote.",
    "verdict.byMayor": "Le maire a tranché.",
    "spec.title": "Tu regardes la partie", "spec.text": "La partie a commencé sans toi. Tu joueras la prochaine !",
    "end.village": "Victoire du village !", "end.wolves": "Victoire des loups-garous !", "end.lonewolf": "Victoire du loup solitaire !",
    "end.lovers": "Victoire des amoureux !", "end.nobody": "Personne n'a survécu…",
    "end.won": "Tu as gagné ! 🎉", "end.lost": "Tu as perdu…", "end.again": "Nouvelle partie", "end.waitHost": "L'hôte peut relancer une partie.",
    "end.leave": "Quitter", "end.story": "Le récit de la partie",
    "ui.close": "Fermer", "ui.leaveConfirm": "Quitter la partie en cours ?",

    "rules.title": "Règles du jeu",
    "rules.intro": "Le village est infesté de loups-garous déguisés en villageois. Chaque nuit, ils dévorent quelqu'un. Chaque jour, le village débat puis vote pour éliminer un suspect. Le village gagne quand tous les loups sont morts ; les loups gagnent quand il ne reste plus qu'eux.",
    "rules.nightT": "La nuit", "rules.night": "Tout le monde ferme les yeux. Les rôles sont appelés un par un : seuls les joueurs concernés ouvrent les yeux et agissent sur leur téléphone.",
    "rules.dayT": "Le jour", "rules.day": "On découvre les victimes de la nuit, on débat autour de la table, puis chacun vote sur son téléphone. Le joueur qui a le plus de voix est éliminé.",
    "rules.phoneT": "Les vibrations",
    "rules.vibSleep": "1 vibration : le village s'endort, ferme les yeux.", "rules.vibWake": "Petites vibrations : le village se réveille.",
    "rules.vibCall": "3 longues vibrations : c'est TON rôle qui est appelé, ouvre les yeux.",
    "rules.ios": "Sur iPhone, Safari ne permet pas la vibration : la voix du conteur (ou le narrateur) appelle les rôles.",
    "rules.narrT": "Le mode narrateur", "rules.narr": "Un joueur peut être narrateur : il ne joue pas, voit tous les rôles et les actions de la nuit sur son téléphone, lit le texte proposé et fait avancer la partie.",
    "rules.rolesT": "Les rôles",

    "set.title": "Réglages", "set.lang": "Langue", "set.sound": "Effets sonores", "set.ambient": "Ambiance (forêt, vent…)",
    "set.voice": "Voix du conteur", "set.vib": "Vibrations", "set.noVib": "Ce téléphone ne peut pas vibrer (iPhone) : fie-toi à la voix.", "set.test": "Tester la vibration",
    "conn.joining": "Connexion à la partie…", "conn.creating": "Création de la partie…", "conn.nohost": "L'hôte ne répond plus… la partie reprendra dès son retour.",
    "conn.off": "Connexion perdue, reconnexion…", "conn.ok": "Connecté",

    "role.wolf": "Loup-garou", "role.lonewolf": "Loup solitaire", "role.villager": "Villageois", "role.seer": "Voyante", "role.witch": "Sorcière",
    "role.hunter": "Chasseur", "role.cupid": "Cupidon", "role.girl": "Petite fille", "role.guard": "Garde", "role.elder": "Ancien",
    "role.idiot": "Idiot du village", "role.raven": "Corbeau", "role.fox": "Renard",
    "desc.wolf": "Chaque nuit, les loups-garous se réveillent ensemble et choisissent une victime. Le jour, ils se font passer pour d'innocents villageois.",
    "desc.lonewolf": "Il se réveille avec les loups mais ne joue que pour lui. Une nuit sur deux, il peut dévorer un loup-garou. Il gagne s'il est le dernier survivant.",
    "desc.villager": "Aucun pouvoir, mais du flair et une voix au vote. Démasque les loups pendant le débat !",
    "desc.seer": "Chaque nuit, elle découvre le vrai rôle d'un joueur de son choix.",
    "desc.witch": "Elle a deux potions, utilisables une seule fois : une potion de vie pour sauver la victime des loups, une potion de mort pour éliminer quelqu'un.",
    "desc.hunter": "S'il meurt, il tire une dernière balle et emporte un joueur avec lui.",
    "desc.cupid": "La première nuit, il désigne deux amoureux. Si l'un meurt, l'autre meurt de chagrin. Un loup et un villageois amoureux gagnent ensemble s'ils sont les deux derniers.",
    "desc.girl": "Pendant le tour des loups, elle peut espionner en maintenant le bouton 👁️ : elle voit leur cible… mais si elle est repérée, les loups découvrent qui elle est !",
    "desc.guard": "Chaque nuit, il protège un joueur des loups (lui-même compris), mais jamais deux nuits de suite le même.",
    "desc.elder": "Coriace : il survit à la première attaque des loups.",
    "desc.idiot": "S'il est éliminé par le vote du village, il est épargné… mais ne peut plus voter.",
    "desc.raven": "Chaque nuit, il peut désigner un suspect qui aura 2 voix contre lui au vote suivant.",
    "desc.fox": "Chaque nuit, il flaire un joueur et ses deux voisins : il apprend s'il y a au moins un loup parmi eux. S'il n'en trouve pas, il perd son flair.",
    "team.village": "Village", "team.wolves": "Loups", "team.solo": "Solitaire",
    "goal.village": "Éliminer tous les loups-garous.", "goal.wolves": "Dévorer tous les villageois.", "goal.solo": "Être le dernier survivant.",

    "n.deal": "Les cartes sont distribuées. Découvrez votre rôle en secret.",
    "n.nightfall": "La nuit tombe sur le village. Tout le monde ferme les yeux.",
    "n.call.cupid": "Cupidon se réveille et désigne deux amoureux.", "n.end.cupid": "Cupidon se rendort.",
    "n.call.lovers": "Les amoureux se réveillent et se reconnaissent.", "n.end.lovers": "Les amoureux se rendorment.",
    "n.call.guard": "Le garde se réveille et choisit qui protéger.", "n.end.guard": "Le garde se rendort.",
    "n.call.seer": "La voyante se réveille et sonde l'âme d'un joueur.", "n.end.seer": "La voyante se rendort.",
    "n.call.fox": "Le renard se réveille et flaire le village.", "n.end.fox": "Le renard se rendort.",
    "n.call.wolves": "Les loups-garous se réveillent et choisissent leur victime.", "n.end.wolves": "Les loups-garous, repus, se rendorment.",
    "n.call.lonewolf": "Le loup solitaire se réveille, affamé.", "n.end.lonewolf": "Le loup solitaire se rendort.",
    "n.call.witch": "La sorcière se réveille et se penche sur ses potions.", "n.end.witch": "La sorcière se rendort.",
    "n.call.raven": "Le corbeau se réveille et désigne un suspect.", "n.end.raven": "Le corbeau se rendort.",
    "n.dawn": "Le soleil se lève, le village se réveille.", "n.dawn.none": "Miracle : personne n'est mort cette nuit !",
    "n.death.wolves": "{name} a été dévoré par les loups.", "n.death.poison": "{name} a été empoisonné.",
    "n.death.lone": "{name} a été dévoré par le loup solitaire.", "n.death.love": "{name} meurt de chagrin.",
    "n.death.hunter": "{name} a été abattu par le chasseur.", "n.death.vote": "{name} est éliminé.", "n.death.dead": "{name} est mort.",
    "n.was": "{name} était : {role}.", "n.raven": "Le corbeau accuse {name} : 2 voix contre lui au vote.",
    "n.hunter": "{name}, le chasseur, rassemble ses dernières forces pour tirer…",
    "n.shot": "Le chasseur a abattu {name} !", "n.shot.none": "Le chasseur n'a tiré sur personne.",
    "n.successor": "{name}, le maire, désigne son successeur.", "n.newMayor": "{name} est le nouveau maire.",
    "n.mayor": "Le village doit élire son maire. Sa voix comptera double.", "n.elected": "{name} est élu maire !",
    "n.discuss": "Le débat est ouvert. Qui sont les loups-garous ?", "n.vote": "L'heure du vote a sonné. Désignez le coupable !",
    "n.tiebreak": "Égalité entre {names}. Le maire doit trancher.",
    "n.verdict.out": "Le village a décidé d'éliminer {name}.", "n.verdict.none": "Le village n'a éliminé personne.",
    "n.verdict.tie": "Égalité : personne n'est éliminé aujourd'hui.", "n.verdict.idiot": "{name} est l'idiot du village ! Il est épargné, mais ne votera plus.",
    "n.win.village": "Les villageois ont débarrassé le village des loups-garous !", "n.win.wolves": "Les loups-garous ont dévoré tout le village !",
    "n.win.lonewolf": "Le loup solitaire règne seul sur le village !", "n.win.lovers": "L'amour a triomphé : les amoureux sont les derniers survivants !",
    "n.win.nobody": "Le village est désert… personne n'a survécu."
  };

  D.en = {
    "app.title": "Werewolf", "app.title1": "Were", "app.title2": "wolf",
    "home.tagline": "The village game… on your phone. One night, some wolves, and no one to trust.",
    "home.avatar": "Change avatar", "home.name": "Your name", "home.namePh": "e.g. Leah",
    "home.create": "Create a game", "home.or": "or", "home.codePh": "CODE", "home.join": "Join",
    "home.resume": "Resume game {code}", "home.rules": "Rules & roles", "home.leone": "LEONE residence",
    "home.fine": "One phone per player. Keep sound and vibration on.",
    "lobby.code": "Game code", "lobby.share": "Invite", "lobby.players": "Players", "lobby.host": "Host",
    "lobby.narrator": "Narrator", "lobby.kick": "Remove", "lobby.kickConfirm": "Remove {name} from the game?",
    "lobby.needMore": "At least {n} players needed.", "lobby.compo": "Line-up",
    "lobby.narratorIs": "Narrator: {name}", "lobby.autoNarr": "Automatic narrator (voice)",
    "lobby.waitHost": "Waiting for {name} to start the game…", "lobby.settings": "Host settings",
    "lobby.roles": "Roles", "lobby.options": "Options", "lobby.start": "Start the game",
    "lobby.shareText": "Come play Werewolf! Code: {code}", "lobby.copied": "Link copied!",
    "opt.revealOn": "Roles revealed on death", "opt.revealOff": "Roles hidden until the end", "opt.mayorOn": "Mayor election",
    "opt.narrator": "Narrator", "opt.narrNone": "None — the app tells the story",
    "opt.narrHint": "The narrator doesn't play: they see every role on their phone and tell the story.",
    "opt.autoHint": "Without a narrator, the app calls roles out loud and makes phones vibrate.",
    "opt.manual": "The narrator moves each step forward", "opt.voice": "Storyteller voice",
    "opt.voice.host": "On the host's phone", "opt.voice.all": "On every phone", "opt.voice.off": "Off",
    "opt.auto": "Auto", "opt.reveal": "Reveal roles of the dead", "opt.mayor": "Elect a mayor (double vote)",
    "opt.nightSec": "Night action time", "opt.discussSec": "Debate time", "opt.voteSec": "Voting time",
    "err.count": "{r} roles for {p} players: adjust the line-up.", "err.min": "At least {n} players needed.",
    "err.nowolf": "You need at least one wolf!", "err.name": "Pick your name first 🙂",
    "err.config": "The game server is not configured.", "err.net": "Can't connect. Check your network.",
    "err.code": "The code has 4 letters.", "err.notFound": "No game found with code {code}.",
    "chat.title": "Chat", "chat.chan.wolves": "Pack", "chat.chan.dead": "Graveyard", "chat.empty": "No messages yet. Say hi!",
    "chat.ph": "Write a message…", "chat.phWolves": "Whisper to the pack…", "chat.phDead": "Talk to the ghosts…",
    "chat.send": "Send", "chat.sleeping": "Shh… the village is asleep.",
    "sys.join": "{n} joined the village", "sys.kick": "{n} was removed", "sys.lobby": "Back to the waiting room",
    "hud.night": "Night {n}", "hud.day": "Day {n}", "hud.deal": "Dealing", "hud.end": "Game over", "hud.paused": "Paused",
    "game.youDead": "You are dead… watch in silence. The graveyard awaits you in the chat.",
    "game.myRole": "My role", "game.players": "Players", "game.you": "you",
    "host.menu": "Host", "host.abort": "Stop", "host.abortConfirm": "Stop the game and go back to the waiting room?",
    "narr.next": "Next", "narr.pause": "Pause", "narr.read": "Read aloud", "narr.step": "Step",
    "narr.spying": "The little girl is spying!", "narr.table": "The table", "narr.elderLife": "Elder: {n} spare life",
    "narr.guardLast": "Last protected: {name}", "narr.next2": "Next",
    "sub.call": "wake", "sub.act": "action", "sub.end": "end",
    "step.nightfall": "Nightfall", "step.lovers": "The lovers", "step.wolves": "The werewolves", "step.dawn": "Dawn",
    "step.mayor": "Mayor election", "step.discuss": "Debate", "step.vote": "Vote", "step.tiebreak": "Tie", "step.verdict": "Verdict",
    "step.hunter": "Hunter's shot", "step.successor": "Mayor's successor", "step.deal": "Dealing", "step.end": "End",
    "deal.title": "Your card", "deal.tap": "Tap the card to flip it — hide your screen!", "deal.hide": "Tap again to hide it.",
    "deal.youAre": "You are: {role}", "deal.pack": "Your pack:",
    "deal.howVib": "At night your phone vibrates hard when your role is called: open your eyes only then.",
    "deal.howNoVib": "Your phone can't vibrate: listen to the storyteller to know when to open your eyes.",
    "deal.howEyes": "The rest of the night, keep your eyes closed.",
    "deal.howPeek": "During the game, hold “My role” to peek at your card.",
    "deal.waiting": "Ready: {n}/{total}", "deal.ready": "Got it",
    "night.yourTurn": "Your turn!", "night.fall": "Night falls…", "night.closeEyes": "Close your eyes…",
    "night.openEyes": "Open your eyes, quietly.", "night.wait": "The village sleeps. Your phone will vibrate if you're needed.",
    "night.deadWatch": "The ghosts watch over the night…",
    "act.confirm": "Confirm", "act.skip": "Do nothing", "act.done": "Noted. Close your eyes…",
    "act.seer.title": "Seer, whose soul will you read?", "act.seer.hint": "You'll see their true role.",
    "act.seer.result": "The crystal ball reveals that {name} is…",
    "act.fox.title": "Fox, who will you sniff?", "act.fox.hint": "You'll learn whether a wolf hides among this player and both neighbours.",
    "act.fox.yes": "Smells like wolf! At least one wolf among: {names}.", "act.fox.no": "No wolf among: {names}. You lose your nose…",
    "act.guard.title": "Guard, who do you protect?", "act.guard.hint": "They'll be safe from wolves tonight (not the same twice in a row).",
    "act.raven.title": "Raven, who do you accuse?", "act.raven.hint": "They'll have 2 votes against them at the next vote.",
    "act.lonewolf.title": "Lone wolf, who will you devour?", "act.lonewolf.hint": "You may kill a werewolf tonight… or wait.",
    "act.hunter.title": "Hunter, your last bullet!", "act.hunter.hint": "Choose who you take with you.",
    "act.successor.title": "Mayor, name your successor", "act.successor.hint": "They inherit your double vote.",
    "act.tiebreak.title": "Mayor, decide!", "act.tiebreak.hint": "Choose who is eliminated among the tied players.",
    "act.cupid.title": "Cupid, pick two lovers", "act.cupid.hint": "They'll be bound until death (you can pick yourself).",
    "act.cupid.done": "{a} and {b} are now in love.",
    "act.wolves.title": "Wolves, choose your victim", "act.wolves.hint": "Tap a player. Agree with your pack.",
    "act.wolves.agree": "The victim is chosen when the whole pack targets the same player.",
    "act.wolves.caught": "The little girl is spying on you: it's {name}!",
    "act.witch.title": "Witch, your turn", "act.witch.hint": "Each potion works only once.",
    "act.witch.victim": "The wolves attacked {name}.", "act.witch.noVictim": "The wolves killed no one tonight.",
    "act.witch.save": "Life potion", "act.witch.kill": "Death potion", "act.witch.left": "available", "act.witch.used": "used",
    "act.witch.pick": "Who do you want to poison?", "act.witch.nothing": "Do nothing",
    "act.girl.title": "Little girl, the wolves are awake…", "act.girl.hint": "You can peek through your fingers to spy.",
    "act.girl.hold": "Hold to spy", "act.girl.spying": "Spying…", "act.girl.nothing": "The wolves are still hesitating…",
    "act.girl.risk": "The longer you spy, the more likely you get caught!", "act.girl.caught": "The wolves caught you!",
    "lovers.title": "Love at first sight!", "lovers.text": "You are in love with {name}. If one dies, the other dies of grief.",
    "tie.title": "It's a tie!", "tie.wait": "{name}, the mayor, must decide between: {names}.",
    "cause.wolves": "devoured by wolves", "cause.poison": "poisoned", "cause.lone": "devoured by the lone wolf",
    "cause.vote": "voted out", "cause.hunter": "shot by the hunter", "cause.love": "died of grief", "cause.dead": "dead",
    "dawn.title": "Day breaks",
    "discuss.title": "The debate", "discuss.hint": "Accuse, defend, lie… Who are the wolves?",
    "discuss.ready": "Go to vote", "discuss.readyOn": "Ready to vote",
    "mayor.title": "Mayor election", "mayor.hint": "Vote for the player who will become mayor.", "mayor.power": "Their vote counts double and breaks ties.",
    "vote.title": "The vote", "vote.hint": "Tap the player you want to eliminate. You can change your mind.",
    "vote.mayorX2": "The mayor's vote counts double.", "vote.progress": "Votes: {n}/{total}", "vote.idiot": "You lost your right to vote.",
    "verdict.byMayor": "The mayor decided.",
    "spec.title": "You're watching", "spec.text": "The game started without you. You'll play the next one!",
    "end.village": "The village wins!", "end.wolves": "The werewolves win!", "end.lonewolf": "The lone wolf wins!",
    "end.lovers": "The lovers win!", "end.nobody": "No one survived…",
    "end.won": "You won! 🎉", "end.lost": "You lost…", "end.again": "New game", "end.waitHost": "The host can start a new game.",
    "end.leave": "Leave", "end.story": "The story of the game",
    "ui.close": "Close", "ui.leaveConfirm": "Leave the current game?",
    "rules.title": "How to play",
    "rules.intro": "The village is infested with werewolves disguised as villagers. Each night they devour someone. Each day the village debates and votes to eliminate a suspect. The village wins when all wolves are dead; the wolves win when only they remain.",
    "rules.nightT": "Night", "rules.night": "Everyone closes their eyes. Roles are called one by one: only those players open their eyes and act on their phone.",
    "rules.dayT": "Day", "rules.day": "The night's victims are revealed, everyone debates around the table, then votes on their phone. The player with the most votes is eliminated.",
    "rules.phoneT": "Vibrations",
    "rules.vibSleep": "1 buzz: the village falls asleep, close your eyes.", "rules.vibWake": "Short buzzes: the village wakes up.",
    "rules.vibCall": "3 long buzzes: YOUR role is called, open your eyes.",
    "rules.ios": "On iPhone, Safari doesn't allow vibration: the storyteller's voice (or the narrator) calls the roles.",
    "rules.narrT": "Narrator mode", "rules.narr": "One player can be the narrator: they don't play, see every role and night action on their phone, read the suggested text and move the game forward.",
    "rules.rolesT": "Roles",
    "set.title": "Settings", "set.lang": "Language", "set.sound": "Sound effects", "set.ambient": "Ambience (forest, wind…)",
    "set.voice": "Storyteller voice", "set.vib": "Vibrations", "set.noVib": "This phone can't vibrate (iPhone): rely on the voice.", "set.test": "Test vibration",
    "conn.joining": "Joining the game…", "conn.creating": "Creating the game…", "conn.nohost": "The host isn't responding… the game resumes when they're back.",
    "conn.off": "Connection lost, reconnecting…", "conn.ok": "Connected",
    "role.wolf": "Werewolf", "role.lonewolf": "Lone wolf", "role.villager": "Villager", "role.seer": "Seer", "role.witch": "Witch",
    "role.hunter": "Hunter", "role.cupid": "Cupid", "role.girl": "Little girl", "role.guard": "Guard", "role.elder": "Elder",
    "role.idiot": "Village idiot", "role.raven": "Raven", "role.fox": "Fox",
    "desc.wolf": "Each night the werewolves wake up together and pick a victim. By day they pretend to be innocent villagers.",
    "desc.lonewolf": "Wakes up with the wolves but plays only for himself. Every other night he may devour a werewolf. He wins if he's the last one standing.",
    "desc.villager": "No power, just instinct and a vote. Unmask the wolves during the debate!",
    "desc.seer": "Each night she learns the true role of a player of her choice.",
    "desc.witch": "She has two single-use potions: a life potion to save the wolves' victim, and a death potion to eliminate someone.",
    "desc.hunter": "When he dies, he fires one last shot and takes a player with him.",
    "desc.cupid": "On the first night he picks two lovers. If one dies, the other dies of grief. A wolf and a villager in love win together if they're the last two.",
    "desc.girl": "During the wolves' turn she can spy by holding the 👁️ button: she sees their target… but if she's caught, the wolves learn who she is!",
    "desc.guard": "Each night he protects one player from the wolves (himself included), but never the same one two nights in a row.",
    "desc.elder": "Tough: he survives the first wolf attack.",
    "desc.idiot": "If the village votes him out, he is spared… but can no longer vote.",
    "desc.raven": "Each night he may accuse a suspect, who gets 2 extra votes against them at the next vote.",
    "desc.fox": "Each night he sniffs a player and both neighbours: he learns whether at least one wolf is among them. If not, he loses his nose.",
    "team.village": "Village", "team.wolves": "Wolves", "team.solo": "Loner",
    "goal.village": "Eliminate all the werewolves.", "goal.wolves": "Devour all the villagers.", "goal.solo": "Be the last survivor.",
    "n.deal": "The cards are dealt. Discover your role in secret.",
    "n.nightfall": "Night falls on the village. Everyone, close your eyes.",
    "n.call.cupid": "Cupid wakes up and chooses two lovers.", "n.end.cupid": "Cupid goes back to sleep.",
    "n.call.lovers": "The lovers wake up and recognise each other.", "n.end.lovers": "The lovers go back to sleep.",
    "n.call.guard": "The guard wakes up and chooses whom to protect.", "n.end.guard": "The guard goes back to sleep.",
    "n.call.seer": "The seer wakes up and reads a player's soul.", "n.end.seer": "The seer goes back to sleep.",
    "n.call.fox": "The fox wakes up and sniffs the village.", "n.end.fox": "The fox goes back to sleep.",
    "n.call.wolves": "The werewolves wake up and choose their victim.", "n.end.wolves": "The werewolves, well fed, go back to sleep.",
    "n.call.lonewolf": "The lone wolf wakes up, hungry.", "n.end.lonewolf": "The lone wolf goes back to sleep.",
    "n.call.witch": "The witch wakes up and leans over her potions.", "n.end.witch": "The witch goes back to sleep.",
    "n.call.raven": "The raven wakes up and accuses a suspect.", "n.end.raven": "The raven goes back to sleep.",
    "n.dawn": "The sun rises, the village wakes up.", "n.dawn.none": "A miracle: nobody died tonight!",
    "n.death.wolves": "{name} was devoured by the wolves.", "n.death.poison": "{name} was poisoned.",
    "n.death.lone": "{name} was devoured by the lone wolf.", "n.death.love": "{name} dies of grief.",
    "n.death.hunter": "{name} was shot by the hunter.", "n.death.vote": "{name} is eliminated.", "n.death.dead": "{name} is dead.",
    "n.was": "{name} was: {role}.", "n.raven": "The raven accuses {name}: 2 votes against them.",
    "n.hunter": "{name}, the hunter, gathers their last strength to shoot…",
    "n.shot": "The hunter shot {name}!", "n.shot.none": "The hunter shot no one.",
    "n.successor": "{name}, the mayor, names a successor.", "n.newMayor": "{name} is the new mayor.",
    "n.mayor": "The village must elect a mayor. Their vote will count double.", "n.elected": "{name} is elected mayor!",
    "n.discuss": "The debate is open. Who are the werewolves?", "n.vote": "Time to vote. Point out the culprit!",
    "n.tiebreak": "A tie between {names}. The mayor must decide.",
    "n.verdict.out": "The village decided to eliminate {name}.", "n.verdict.none": "The village eliminated no one.",
    "n.verdict.tie": "A tie: no one is eliminated today.", "n.verdict.idiot": "{name} is the village idiot! Spared, but can no longer vote.",
    "n.win.village": "The villagers rid the village of werewolves!", "n.win.wolves": "The werewolves devoured the whole village!",
    "n.win.lonewolf": "The lone wolf rules the village alone!", "n.win.lovers": "Love triumphs: the lovers are the last survivors!",
    "n.win.nobody": "The village is deserted… no one survived."
  };

  let cur = "fr";
  const find = (code) => LANGS.find((l) => l.code === code);

  function t(k, p) {
    let s = (D[cur] && D[cur][k]) || (D.en && D.en[k]) || D.fr[k] || k;
    if (p) s = s.replace(/\{(\w+)\}/g, (m, x) => (p[x] != null ? p[x] : m));
    return s;
  }

  function load(code) {
    if (D[code]) return Promise.resolve();
    return new Promise((res) => {
      const s = document.createElement("script");
      s.src = "js/lang/" + code + ".js";
      s.onload = s.onerror = () => res();
      document.head.appendChild(s);
    });
  }

  async function setLang(code) {
    if (!find(code)) code = "fr";
    await load(code);
    cur = D[code] ? code : "en";
    const l = find(cur);
    document.documentElement.lang = cur;
    document.documentElement.dir = l.dir || "ltr";
    try { localStorage.setItem("lg.lang", cur); } catch (e) { /* ignore */ }
  }

  function detect() {
    try {
      const s = localStorage.getItem("lg.lang") || localStorage.getItem("leone.lang"); // même domaine que le site LEONE
      if (s && find(s)) return s;
    } catch (e) { /* ignore */ }
    const navs = (navigator.languages || [navigator.language || "fr"]).map((x) => String(x));
    for (const n of navs) {
      if (find(n)) return n;
      const b = n.split("-")[0].toLowerCase();
      if (find(b)) return b;
    }
    return "fr";
  }

  window.LGI18n = {
    LANGS, t, setLang,
    init: () => setLang(detect()),
    lang: () => cur,
    locale: () => (find(cur) || {}).locale || "fr-FR"
  };
})();
