import type { Messages } from "@/lib/i18n/messages/en";

export const frMessages: Messages = {
  common: {
    continue: "Continuer",
    saving: "Enregistrement…",
    sending: "Envoi…",
    menu: "Menu",
    skipToMain: "Aller au contenu principal",
    checkingSignIn: "Vérification de la connexion…",
    accountLoading: "Compte…",
    navigate: "Navigation",
    help: "Aide",
    language: "Langue",
    notNow: "Pas maintenant",
    dismiss: "Fermer",
    copyLink: "Copier le lien",
    loading: "Chargement…"
  },
  nav: {
    home: "Accueil",
    community: "Communauté",
    admin: "Admin",
    homeAria: "Accueil {brand}",
    primaryAria: "Navigation principale"
  },
  auth: {
    signInToUse: "Connectez-vous pour utiliser {feature}",
    signInWhy: "Pourquoi se connecter",
    signInWhyBody:
      "Inscrivez-vous avec Google (OAuth). Votre compte sert pour les effectifs, le Fan Chat et les pronostics — pas de mot de passe communauté séparé.",
    oauthNotConfigured:
      "Google OAuth n'est pas configuré sur ce serveur. Ajoutez les variables sur le service web Railway MyPicks, puis redéployez.",
    confirmAge: "Confirmez votre âge",
    confirmAgeWhy: "Pourquoi nous demandons",
    confirmAgeWhyBody:
      "Requis pour la protection des mineurs. Les comptes de moins de 13 ans restent en mode Fan et ne peuvent pas publier sur le Coach Board.",
    birthYear: "Année de naissance",
    username: "Nom d'utilisateur (facultatif)",
    usernameHint:
      "Vos amis vous trouvent avec @nom sur la Communauté. Ignorez pour garder un identifiant auto.",
    usernamePlaceholder: "ex. {example}",
    usernamePlaceholderGeneric: "ex. alex_k",
    chooseLanguage: "Choisissez votre langue",
    chooseLanguageHint: "Vous pourrez la modifier à tout moment dans le menu.",
    signIn: "Se connecter",
    signOut: "Se déconnecter",
    signOutAria: "Se déconnecter",
    logOut: "Déconnexion",
    completeOnboarding: "Terminer l'inscription",
    points: "{count} pts",
    onboardingFailed: "Échec de l'inscription."
  },
  helpMenu: {
    eventOverview: "Aperçu du tournoi",
    welcomeTour: "Visite guidée",
    askAi: "Demander à MyPicks IA",
    askAdmin: "Demander à un admin"
  },
  helpCenter: {
    title: "Aide",
    eyebrow: "Aide",
    heading: "Questions et support",
    channelAi: "MyPicks IA",
    channelAdmin: "Demander à un admin",
    signInPrompt:
      "Connectez-vous et terminez l'inscription pour enregistrer vos conversations d'aide et joindre un admin.",
    placeholderAi: "Demander à MyPicks IA…",
    placeholderAdmin: "Message aux admins (compte, bugs, règles)…",
    threadPlaceholderAi: "Posez une question ci-dessous.",
    threadPlaceholderAdmin: "Décrivez votre problème ci-dessous.",
    send: "Envoyer",
    close: "Fermer l'aide",
    newThread: "Nouvelle conversation",
    yourMessage: "Votre message",
    roleYou: "Vous",
    roleAdmin: "Admin",
    roleSystem: "Système"
  },
  theme: {
    label: "Thème",
    light: "Clair",
    dark: "Sombre",
    auto: "Auto",
    autoHint: "Clair sur mobile ; sur ordinateur, suit votre appareil.",
    ariaLabel: "Thème de couleur"
  },
  predictions: {
    tournamentPicks: "Pronostics tournoi",
    tournamentShort: "Tournoi",
    matchPicks: "Pronostics matchs",
    matchShort: "Matchs",
    featureLabel: "Pronostics",
    loadingPicks: "Chargement des pronos…",
    loadingPoints: "Chargement des points…",
    pickMatch: "Choisir un match",
    loadingFixtures: "Chargement des matchs à venir depuis le flux du tournoi.",
    typeAria: "Type de pronostic",
    selectMatchAria: "Choisir un match pour votre pronostic"
  },
  eventTabs: {
    tournament: "Tournoi",
    predictions: "Pronostics",
    coachBoard: "Coach Board",
    coachBoardLine1: "Coach",
    coachBoardLine2: "Board",
    community: "Communauté",
    groupStage: "Phase de groupes",
    knockout: "Éliminatoires",
    sectionAria: "Sections de l'événement en cours"
  },
  notifications: {
    title: "Alertes",
    markAllRead: "Tout marquer lu",
    signInToSee: "Connectez-vous pour voir l'activité des connexions et les alertes match.",
    updating: "Mise à jour des alertes…",
    empty:
      "Pas encore d'alertes. Connectez-vous avec des fans pour voir leurs pronos et boards ; les coups d'envoi WC26 apparaissent jusqu'à trois jours avant le match.",
    openAlerts: "Ouvrir les alertes",
    unreadAlerts: "{count} alertes non lues",
    categoryConnection: "Connexion",
    categoryUpcoming: "À venir",
    categoryResult: "Résultat",
    timeJustNow: "À l'instant",
    timeMinutesAgo: "il y a {count} min",
    timeHoursAgo: "il y a {count} h",
    loadError: "Impossible de charger les alertes."
  },
  pwa: {
    installAria: "Installer MyPicks",
    title: "Ajouter MyPicks à l'écran d'accueil",
    iosBeforeShare: "Appuyez sur",
    iosShare: "Partager",
    iosAfterShare: ", puis",
    iosAddToHomeScreen: "Sur l'écran d'accueil",
    iosTail: "pour une expérience plein écran.",
    androidCopy: "Installez MyPicks depuis le menu du navigateur pour un accès rapide en plein écran.",
    notNow: "Pas maintenant",
    dismissAria: "Fermer l'invite d'installation"
  },
  invitations: {
    title: "Inviter quelqu'un à s'inscrire",
    tooltipLabel: "Invitations d'inscription",
    tooltipBody:
      "Laissez l'e-mail vide pour obtenir un lien partageable. Ajoutez leur e-mail pour lier l'invitation à ce compte Google. Après inscription, vous serez connectés automatiquement.",
    emailLabel: "Leur e-mail (facultatif)",
    emailPlaceholder: "ami@exemple.com",
    selfHint:
      "Les invitations sont pour quelqu'un d'autre. Laissez l'e-mail vide pour un lien à copier, ou utilisez une autre adresse.",
    selfError:
      "Cet e-mail est le vôtre. Entrez l'e-mail d'un ami ou laissez le champ vide pour un lien partageable.",
    messageLabel: "Message court (facultatif)",
    messagePlaceholder: "Rejoins-moi sur MyPicks pour les pronos CM26 et le Coach Board…",
    sendEmailTo: "Envoyer l'invitation par e-mail à {email}",
    sendInvitation: "Envoyer l'invitation",
    createInviteLink: "Créer un lien d'invitation",
    latestLink: "Dernier lien d'invitation",
    loading: "Chargement de vos invitations…",
    copiedNotice:
      "Lien d'invitation copié. Envoyez-le par e-mail, WhatsApp, SMS ou tout autre canal.",
    copyFailed:
      "Copie automatique impossible — sélectionnez le lien ci-dessous, copiez-le et partagez-le manuellement.",
    created: "Invitation créée.",
    revoked: "Invitation révoquée.",
    loadError: "Impossible de charger les invitations.",
    createError: "Impossible de créer l'invitation.",
    revokeError: "Impossible de révoquer.",
    revoke: "Révoquer",
    statusPending: "En attente",
    statusAccepted: "Acceptée",
    statusExpired: "Expirée",
    statusRevoked: "Révoquée",
    anyGoogleAccount: "Tout compte Google",
    expires: "Expire",
    noInvitationsYet: "Pas encore d'invitations."
  },
  connections: {
    profileVisible: "Mon profil est visible par tous",
    profileVisibleHint:
      "Activé par défaut. Les autres fans peuvent vous trouver dans la Communauté et envoyer des demandes de connexion. Désactivez pour vous masquer de la recherche et des listes.",
    profileVisibleSaving: "Enregistrement de la visibilité…",
    profileHiddenNotice: "Votre profil est masqué de la découverte Communauté.",
    discoverableFansTitle: "Fans avec qui vous connecter",
    discoverableFansEmpty: "Aucun fan découvrable pour le moment. Essayez de chercher par nom d'utilisateur.",
    searching: "Recherche…",
    loading: "Chargement des connexions…",
    connectByUsername: "Se connecter par nom d'utilisateur",
    searchPlaceholder: "Rechercher ou @nom",
    sendRequest: "Envoyer la demande",
    connect: "Connecter",
    requestsForYou: "Demandes pour vous",
    pendingSent: "En attente envoyées",
    connected: "Connectés ({count})",
    onlineSummary: "· {count} en ligne",
    noConnections: "Pas encore de connexions. Envoyez une demande pour commencer.",
    accept: "Accepter",
    decline: "Refuser",
    cancel: "Annuler",
    requestSent: "Demande envoyée.",
    connectedNotice: "Connecté.",
    requestUpdated: "Demande mise à jour."
  },
  welcome: {
    eyebrow: "Coupe du monde 2026",
    title: "Bienvenue sur MyPicks",
    lead: "Pronostiquez les matchs, composez des effectifs, suivez le tournoi et connectez-vous avec les fans — tout au même endroit.",
    startExploring: "Commencer",
    footnote: "Navigation gratuite. Connectez-vous pour enregistrer pronostics, effectifs et chat.",
    highlights: {
      predictionsTitle: "Pronostics",
      predictionsLine: "Scorez les résultats. Grimpez au classement.",
      coachBoardTitle: "Coach Board",
      coachBoardLine: "Composez les équipes pour chaque match — glissez les joueurs sur le terrain.",
      tournamentTitle: "Tournoi",
      tournamentLine: "Groupes, matchs et la route vers la finale.",
      communityTitle: "Communauté",
      communityLine: "Ajoutez des amis, partagez vos boards et comparez les pronos."
    }
  },
  friendLiveActivity: {
    eyebrow: "En direct de vos connexions",
    dismiss: "Fermer"
  },
  friendsHighlights: {
    eyebrow: "Puls du jour",
    title: "Temps forts des pronos de vos amis",
    leadWithFriends: "Mouvements clés de vos {count} connexions sur la dernière journée.",
    leadNoFriends: "Connectez-vous avec des fans pour voir leurs pronos ici chaque jour.",
    loading: "Chargement des temps forts…",
    emptyWithFriends: "Aucun nouveau prono d'ami aujourd'hui — revenez après le prochain coup d'envoi.",
    emptyNoFriends: "Ajoutez des connexions dans Communauté pour un récap quotidien.",
    findFriends: "Trouver des amis",
    close: "Fermer",
    autoDismiss: "Ce récap disparaît dans quelques secondes…",
    blowingUp: "À demain !"
  }
};
