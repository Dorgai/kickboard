import type { Messages } from "@/lib/i18n/messages/en";

export const deMessages: Messages = {
  common: {
    continue: "Weiter",
    saving: "Speichern…",
    sending: "Senden…",
    menu: "Menü",
    skipToMain: "Zum Hauptinhalt springen",
    checkingSignIn: "Anmeldung wird geprüft…",
    accountLoading: "Konto…",
    navigate: "Navigation",
    help: "Hilfe",
    language: "Sprache",
    notNow: "Nicht jetzt",
    dismiss: "Schließen",
    copyLink: "Link kopieren",
    copy: "Kopieren",
    copied: "Kopiert",
    loading: "Laden…"
  },
  nav: {
    home: "Start",
    community: "Community",
    admin: "Admin",
    homeAria: "{brand} Startseite",
    primaryAria: "Hauptnavigation"
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
    username: "Benutzername (optional)",
    usernameHint:
      "Freunde finden dich mit @Benutzername in der Community. Überspringen für einen automatischen Namen.",
    usernamePlaceholder: "z. B. {example}",
    usernamePlaceholderGeneric: "z. B. alex_k",
    chooseLanguage: "Sprache wählen",
    chooseLanguageHint: "Du kannst das jederzeit im Menü ändern.",
    signIn: "Anmelden",
    signOut: "Abmelden",
    signOutAria: "Abmelden",
    logOut: "Abmelden",
    completeOnboarding: "Onboarding abschließen",
    points: "{count} Pkt.",
    onboardingFailed: "Onboarding fehlgeschlagen."
  },
  helpMenu: {
    eventOverview: "Turnierübersicht",
    welcomeTour: "Willkommenstour",
    askAi: "MyPicks KI fragen",
    askAdmin: "Admin fragen"
  },
  helpCenter: {
    title: "Hilfe",
    eyebrow: "Hilfe",
    heading: "Fragen & Support",
    channelAi: "MyPicks KI",
    channelAdmin: "Admin fragen",
    signInPrompt:
      "Melde dich an und schließe das Onboarding ab, um Hilfe-Chats zu speichern und einen Admin zu erreichen.",
    placeholderAi: "MyPicks KI fragen…",
    placeholderAdmin: "Nachricht an Admins (Konto, Bugs, Richtlinien)…",
    threadPlaceholderAi: "Stelle unten eine Frage.",
    threadPlaceholderAdmin: "Beschreibe unten dein Problem.",
    send: "Senden",
    close: "Hilfe schließen",
    newThread: "Neuer Thread",
    yourMessage: "Deine Nachricht",
    roleYou: "Du",
    roleAdmin: "Admin",
    roleSystem: "System"
  },
  theme: {
    label: "Design",
    light: "Hell",
    dark: "Dunkel",
    auto: "Auto",
    autoHint: "Auf dem Handy hell; am Desktop folgt es deinem Gerät.",
    ariaLabel: "Farbschema"
  },
  predictions: {
    tournamentPicks: "Turniertipps",
    tournamentShort: "Turnier",
    matchPicks: "Spieltipp",
    matchShort: "Spiele",
    featureLabel: "Tipps",
    loadingPicks: "Tipps werden geladen…",
    loadingPoints: "Punkte werden geladen…",
    pickMatch: "Spiel wählen",
    loadingFixtures: "Kommende Spiele werden aus dem Turnier-Feed geladen.",
    noUpcomingFixtures:
      "Keine kommenden Spiele in der Liste — Live- und beendete Spiele findest du oben im Ergebnis-Streifen.",
    typeAria: "Tipp-Art",
    selectMatchAria: "Spiel für deinen Tipp wählen"
  },
  eventTabs: {
    tournament: "Turnier",
    predictions: "Tipps",
    coachBoard: "Coach Board",
    coachBoardLine1: "Coach",
    coachBoardLine2: "Board",
    community: "Community",
    groupStage: "Gruppenphase",
    knockout: "K.-o.-Runde",
    sectionAria: "Aktuelle Turnier-Bereiche",
    currentEvent: "Aktuelles Turnier",
    currentEventLine1: "Aktuell",
    currentEventLine2: "Turnier",
    pastEvents: "Vergangene Turniere",
    pastEventsLine1: "Vergangene",
    pastEventsLine2: "Turniere",
    feedSelectorAria: "Turnier-Auswahl"
  },
  notifications: {
    title: "Benachrichtigungen",
    markAllRead: "Alle gelesen",
    signInToSee: "Melde dich an, um Verbindungs- und Spiel-Hinweise zu sehen.",
    updating: "Benachrichtigungen werden aktualisiert…",
    empty:
      "Noch keine Benachrichtigungen. Vernetze dich mit Fans für Tipps und Boards; WC26-Anpfiffe erscheinen bis drei Tage vor dem Spiel.",
    openAlerts: "Benachrichtigungen öffnen",
    unreadAlerts: "{count} ungelesen",
    categoryConnection: "Verbindung",
    categoryUpcoming: "Bevorstehend",
    categoryResult: "Ergebnis",
    timeJustNow: "Gerade eben",
    timeMinutesAgo: "vor {count} Min.",
    timeHoursAgo: "vor {count} Std.",
    loadError: "Benachrichtigungen konnten nicht geladen werden.",
    pushEnable: "Telefon-Benachrichtigungen aktivieren",
    pushEnabling: "Aktivieren…",
    pushEnableHint: "Ergebnisse, Nachrichten und Freundes-Aktivität auf diesem Gerät.",
    pushEnableFailed: "Benachrichtigungen konnten nicht aktiviert werden. Seite neu laden und erneut versuchen.",
    pushDenied:
      "Benachrichtigungen sind im Browser blockiert. Erlaube sie für MyPicks und lade die Seite neu.",
    pushIosInstall:
      "Auf dem iPhone MyPicks zum Home-Bildschirm hinzufügen (Safari → Teilen → Zum Home-Bildschirm), App öffnen und Benachrichtigungen aktivieren.",
    pushNotConfigured: "Push-Benachrichtigungen sind auf dem Server noch nicht konfiguriert."
  },
  pwa: {
    installAria: "MyPicks installieren",
    title: "MyPicks zum Home-Bildschirm hinzufügen",
    iosBeforeShare: "Tippe auf",
    iosShare: "Teilen",
    iosAfterShare: ", dann",
    iosAddToHomeScreen: "Zum Home-Bildschirm",
    iosTail: "für die Vollbild-App.",
    androidCopy: "Installiere MyPicks über das Browser-Menü für schnellen Zugriff im Vollbild.",
    notNow: "Nicht jetzt",
    dismissAria: "Installationshinweis schließen"
  },
  invitations: {
    title: "Jemanden zur Registrierung einladen",
    tooltipLabel: "Registrierungseinladungen",
    tooltipBody:
      "E-Mail leer lassen für einen teilbaren Link. Mit E-Mail wird die Einladung an dieses Google-Konto gebunden. Nach der Registrierung seid ihr automatisch verbunden.",
    emailLabel: "E-Mail (optional)",
    emailPlaceholder: "freund@beispiel.de",
    selfHint:
      "Einladungen sind für andere. E-Mail leer lassen für einen kopierbaren Link oder eine andere Adresse nutzen.",
    selfError:
      "Das ist deine Anmelde-E-Mail. Gib die E-Mail eines Freundes ein oder lass das Feld leer für einen Link.",
    messageLabel: "Kurze Nachricht (optional)",
    messagePlaceholder: "Komm zu MyPicks für WM26-Tipps und Coach Board…",
    sendEmailTo: "Einladungs-E-Mail an {email} senden",
    sendInvitation: "Einladung senden",
    createInviteLink: "Einladungslink erstellen",
    latestLink: "Neuester Einladungslink",
    loading: "Einladungen werden geladen…",
    copiedNotice:
      "Einladungslink kopiert. Sende ihn per E-Mail, WhatsApp, SMS oder einem anderen Kanal.",
    copyFailed:
      "Automatisches Kopieren fehlgeschlagen — Link unten markieren, kopieren und manuell teilen.",
    created: "Einladung erstellt.",
    revoked: "Einladung widerrufen.",
    loadError: "Einladungen konnten nicht geladen werden.",
    createError: "Einladung konnte nicht erstellt werden.",
    revokeError: "Widerruf fehlgeschlagen.",
    revoke: "Widerrufen",
    statusPending: "Ausstehend",
    statusAccepted: "Angenommen",
    statusExpired: "Abgelaufen",
    statusRevoked: "Widerrufen",
    anyGoogleAccount: "Beliebiges Google-Konto",
    expires: "Läuft ab",
    noInvitationsYet: "Noch keine Einladungen."
  },
  connections: {
    profileVisible: "Mein Profil ist für alle sichtbar",
    profileVisibleHint:
      "Standardmäßig an. Andere Fans finden dich in der Community und können Verbindungsanfragen senden. Ausschalten, um dich aus Suche und Listen zu verbergen.",
    profileVisibleSaving: "Sichtbarkeit wird gespeichert…",
    profileHiddenNotice: "Dein Profil ist in der Community nicht auffindbar.",
    discoverableFansTitle: "Fans, mit denen du dich verbinden kannst",
    discoverableFansEmpty: "Derzeit keine auffindbaren Fans. Versuche die Suche nach Benutzernamen.",
    searching: "Suche…",
    loading: "Verbindungen werden geladen…",
    connectByUsername: "Per Benutzername verbinden",
    searchPlaceholder: "Suchen oder @benutzername",
    sendRequest: "Anfrage senden",
    connect: "Verbinden",
    requestsForYou: "Anfragen an dich",
    pendingSent: "Ausstehend gesendet",
    connected: "Verbunden ({count})",
    onlineSummary: "· {count} online",
    noConnections: "Noch keine Verbindungen. Sende eine Anfrage.",
    accept: "Annehmen",
    decline: "Ablehnen",
    cancel: "Abbrechen",
    requestSent: "Anfrage gesendet.",
    connectedNotice: "Verbunden.",
    requestUpdated: "Anfrage aktualisiert."
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
  },
  friendLiveActivity: {
    eyebrow: "Live von deinen Verbindungen",
    dismiss: "Schließen"
  },
  friendsHighlights: {
    eyebrow: "Tagesüberblick",
    title: "Highlights der Freunde-Tipps",
    leadWithFriends: "Wichtige Züge deiner {count} Verbindungen im letzten Tag.",
    leadNoFriends: "Vernetze dich mit Fans, um hier täglich ihre Tipps zu sehen.",
    loading: "Highlights der Freunde werden geladen…",
    emptyWithFriends: "Keine frischen Freundes-Tipps im letzten Tag — schau nach dem nächsten Anpfiff wieder vorbei.",
    emptyNoFriends: "Füge in der Community Verbindungen hinzu für einen täglichen Tipp-Überblick.",
    findFriends: "Freunde finden",
    close: "Schließen",
    autoDismiss: "Dieses Recap verschwindet in wenigen Sekunden…",
    blowingUp: "Bis morgen!"
  }
};
