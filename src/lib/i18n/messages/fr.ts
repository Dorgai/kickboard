import type { Messages } from "@/lib/i18n/messages/en";

export const frMessages: Messages = {
  common: {
    continue: "Continuer",
    saving: "Enregistrement…",
    menu: "Menu",
    skipToMain: "Aller au contenu principal",
    checkingSignIn: "Vérification de la connexion…",
    accountLoading: "Compte…",
    navigate: "Navigation",
    help: "Aide",
    language: "Langue"
  },
  nav: {
    home: "Accueil",
    community: "Communauté",
    admin: "Admin",
    homeAria: "Accueil {brand}"
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
    chooseLanguage: "Choisissez votre langue",
    chooseLanguageHint: "Vous pourrez la modifier à tout moment dans le menu.",
    signIn: "Se connecter",
    signOut: "Se déconnecter",
    signOutAria: "Se déconnecter",
    logOut: "Déconnexion",
    completeOnboarding: "Terminer l'inscription",
    points: "{count} pts"
  },
  helpMenu: {
    eventOverview: "Aperçu du tournoi",
    welcomeTour: "Visite guidée",
    askAi: "Demander à MyPicks IA",
    askAdmin: "Demander à un admin"
  },
  theme: {
    label: "Thème",
    light: "Clair",
    dark: "Sombre",
    auto: "Auto",
    autoHint: "Clair sur mobile ; sur ordinateur, suit votre appareil."
  },
  predictions: {
    tournamentPicks: "Pronostics tournoi",
    tournamentShort: "Tournoi",
    matchPicks: "Pronostics matchs",
    matchShort: "Matchs"
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
  }
};
