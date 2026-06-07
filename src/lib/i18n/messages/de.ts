import type { Messages } from "@/lib/i18n/messages/en";

export const deMessages: Messages = {
  common: {
    continue: "Weiter",
    saving: "Speichern…",
    menu: "Menü",
    skipToMain: "Zum Hauptinhalt springen",
    checkingSignIn: "Anmeldung wird geprüft…",
    accountLoading: "Konto…",
    navigate: "Navigation",
    help: "Hilfe",
    language: "Sprache"
  },
  nav: {
    home: "Start",
    community: "Community",
    admin: "Admin",
    homeAria: "{brand} Startseite"
  },
  auth: {
    signInToUse: "Melde dich an, um {feature} zu nutzen",
    signInWhy: "Warum anmelden",
    signInWhyBody:
      "Registriere dich mit Google (OAuth). Dein Konto gilt für Kader, Fan-Chat und Tipps — kein separates Community-Passwort.",
    oauthNotConfigured:
      "Google OAuth ist auf diesem Server nicht konfiguriert. Variablen im Railway-MyPicks-Webdienst setzen und neu deployen.",
    confirmAge: "Alter bestätigen",
    confirmAgeWhy: "Warum wir fragen",
    confirmAgeWhyBody:
      "Erforderlich für Jugendschutz. Konten unter 13 Jahren bleiben im Fan-Modus und können nicht im Coach Board posten.",
    birthYear: "Geburtsjahr",
    chooseLanguage: "Sprache wählen",
    chooseLanguageHint: "Du kannst das jederzeit im Menü ändern.",
    signIn: "Anmelden",
    signOut: "Abmelden",
    signOutAria: "Abmelden",
    logOut: "Abmelden",
    completeOnboarding: "Onboarding abschließen",
    points: "{count} Pkt."
  },
  helpMenu: {
    eventOverview: "Turnierübersicht",
    welcomeTour: "Willkommenstour",
    askAi: "MyPicks KI fragen",
    askAdmin: "Admin fragen"
  },
  theme: {
    label: "Design",
    light: "Hell",
    dark: "Dunkel",
    auto: "Auto",
    autoHint: "Auf dem Handy hell; am Desktop folgt es deinem Gerät."
  },
  predictions: {
    tournamentPicks: "Turniertipps",
    tournamentShort: "Turnier",
    matchPicks: "Spieltipp",
    matchShort: "Spiele"
  },
  welcome: {
    eyebrow: "WM 2026",
    title: "Willkommen bei MyPicks",
    lead: "Tippe Spiele, baue Kader, verfolge das Turnier und vernetze dich mit Fans — alles an einem Ort.",
    startExploring: "Loslegen",
    footnote: "Kostenlos stöbern. Anmelden zum Speichern von Tipps, Kadern und Chat.",
    highlights: {
      predictionsTitle: "Tipps",
      predictionsLine: "Ergebnisse und Ausgänge tippen. In der Punkte-Rangliste aufsteigen.",
      coachBoardTitle: "Coach Board",
      coachBoardLine: "Aufstellungen für jedes Spiel setzen — Spieler per Drag & Drop aufs Feld.",
      tournamentTitle: "Turnier",
      tournamentLine: "Gruppen, Spiele und der Weg zum Finale.",
      communityTitle: "Community",
      communityLine: "Freunde hinzufügen, Boards teilen und Tipps vergleichen."
    }
  }
};
