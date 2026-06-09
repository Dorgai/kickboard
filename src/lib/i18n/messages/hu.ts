import type { Messages } from "@/lib/i18n/messages/en";

export const huMessages: Messages = {
  common: {
    continue: "Folytatás",
    saving: "Mentés…",
    sending: "Küldés…",
    menu: "Menü",
    skipToMain: "Ugrás a fő tartalomhoz",
    checkingSignIn: "Bejelentkezés ellenőrzése…",
    accountLoading: "Fiók…",
    navigate: "Navigáció",
    help: "Súgó",
    language: "Nyelv",
    notNow: "Most nem",
    dismiss: "Bezárás",
    copyLink: "Link másolása",
    loading: "Betöltés…"
  },
  nav: {
    home: "Kezdőlap",
    community: "Közösség",
    admin: "Admin",
    homeAria: "{brand} kezdőlap",
    primaryAria: "Fő navigáció"
  },
  auth: {
    signInToUse: "Jelentkezz be a(z) {feature} használatához",
    signInWhy: "Miért kell bejelentkezni",
    signInWhyBody:
      "Regisztrálj Google-fiókkal (OAuth). A fiókod a keretekhez, a Fan Chathez és a tippekhez kell — nincs külön közösségi jelszó.",
    oauthNotConfigured:
      "A Google OAuth nincs beállítva ezen a szerveren. Add meg a változókat a Railway MyPicks webszolgáltatáson, majd telepítsd újra.",
    confirmAge: "Életkor megerősítése",
    confirmAgeWhy: "Miért kérjük",
    confirmAgeWhyBody:
      "Gyermekvédelmi szabályok miatt kötelező. A 13 év alatti fiókok Fan módban maradnak, és nem posztolhatnak a Coach Boardon.",
    birthYear: "Születési év",
    username: "Felhasználónév (opcionális)",
    usernameHint:
      "A barátaid a @felhasználónév alapján találnak meg a Közösségben. Hagyd üresen az automatikus névért.",
    usernamePlaceholder: "pl. {example}",
    usernamePlaceholderGeneric: "pl. alex_k",
    chooseLanguage: "Válaszd ki a nyelvet",
    chooseLanguageHint: "Bármikor megváltoztathatod a menüben.",
    signIn: "Bejelentkezés",
    signOut: "Kijelentkezés",
    signOutAria: "Kijelentkezés",
    logOut: "Kilépés",
    completeOnboarding: "Bevezetés befejezése",
    points: "{count} pont",
    onboardingFailed: "A bevezetés sikertelen."
  },
  helpMenu: {
    eventOverview: "Verseny áttekintése",
    welcomeTour: "Bemutató",
    askAi: "Kérdezd a MyPicks AI-t",
    askAdmin: "Kérdezz egy admint"
  },
  helpCenter: {
    title: "Súgó",
    eyebrow: "Súgó",
    heading: "Kérdések és támogatás",
    channelAi: "MyPicks AI",
    channelAdmin: "Admin kérdezése",
    signInPrompt:
      "Jelentkezz be és fejezd be a bevezetést a súgó beszélgetések mentéséhez és az admin eléréséhez.",
    placeholderAi: "Kérdezd a MyPicks AI-t…",
    placeholderAdmin: "Üzenet adminoknak (fiók, hibák, szabályok)…",
    threadPlaceholderAi: "Tegyél fel egy kérdést lent.",
    threadPlaceholderAdmin: "Írd le a problémát lent.",
    send: "Küldés",
    close: "Súgó bezárása",
    newThread: "Új beszélgetés",
    yourMessage: "Üzeneted",
    roleYou: "Te",
    roleAdmin: "Admin",
    roleSystem: "Rendszer"
  },
  theme: {
    label: "Téma",
    light: "Világos",
    dark: "Sötét",
    auto: "Auto",
    autoHint: "Mobilon világos; asztali gépen a készülék beállítását követi.",
    ariaLabel: "Színséma"
  },
  predictions: {
    tournamentPicks: "Verseny tippek",
    tournamentShort: "Verseny",
    matchPicks: "Meccs tippek",
    matchShort: "Meccsek",
    featureLabel: "Tippek",
    loadingPicks: "Tippek betöltése…",
    loadingPoints: "Pontok betöltése…",
    pickMatch: "Válassz meccset",
    loadingFixtures: "Közelgő meccsek betöltése a verseny feedből.",
    typeAria: "Tipp típusa",
    selectMatchAria: "Válassz meccset a tippedhez"
  },
  eventTabs: {
    tournament: "Verseny",
    predictions: "Tippek",
    coachBoard: "Coach Board",
    coachBoardLine1: "Coach",
    coachBoardLine2: "Board",
    community: "Közösség",
    groupStage: "Csoportkör",
    knockout: "Egyenes kiesés",
    sectionAria: "Aktuális verseny szekciók"
  },
  notifications: {
    title: "Értesítések",
    markAllRead: "Összes olvasott",
    signInToSee: "Jelentkezz be a kapcsolatok és meccs értesítések megtekintéséhez.",
    updating: "Értesítések frissítése…",
    empty:
      "Még nincs értesítés. Kapcsolódj szurkolókhoz tippekért és boardokért; a WC26 kezdések a meccs előtt legfeljebb három nappal jelennek meg.",
    openAlerts: "Értesítések megnyitása",
    unreadAlerts: "{count} olvasatlan értesítés",
    categoryConnection: "Kapcsolat",
    categoryUpcoming: "Közelgő",
    categoryResult: "Eredmény",
    timeJustNow: "Épp most",
    timeMinutesAgo: "{count} perce",
    timeHoursAgo: "{count} órája",
    loadError: "Az értesítések betöltése sikertelen."
  },
  pwa: {
    installAria: "MyPicks telepítése",
    title: "MyPicks hozzáadása a kezdőképernyőhöz",
    iosBeforeShare: "Koppints a",
    iosShare: "Megosztás",
    iosAfterShare: " gombra, majd",
    iosAddToHomeScreen: "Hozzáadás a kezdőképernyőhöz",
    iosTail: "a teljes képernyős élményért.",
    androidCopy: "Telepítsd a MyPicks-et a böngésző menüjéből gyors hozzáférésért teljes képernyőn.",
    notNow: "Most nem",
    dismissAria: "Telepítési tipp bezárása"
  },
  invitations: {
    title: "Valaki meghívása regisztrációra",
    tooltipLabel: "Regisztrációs meghívók",
    tooltipBody:
      "Hagyd üresen az e-mailt egy megosztható linkért. E-maillel a meghívó a Google-fiókhoz kötődik. Regisztráció után automatikusan kapcsolódtok.",
    emailLabel: "E-mail címük (opcionális)",
    emailPlaceholder: "barat@pelda.hu",
    selfHint:
      "A meghívók másoknak szólnak. Hagyd üresen az e-mailt egy másolható linkért, vagy adj meg más címet.",
    selfError:
      "Ez a te bejelentkezési e-mailed. Adj meg egy barát e-mailjét, vagy hagyd üresen a mezőt egy linkhez.",
    messageLabel: "Rövid üzenet (opcionális)",
    messagePlaceholder: "Csatlakozz hozzám a MyPicksen VB26 tippekért és Coach Boardért…",
    sendEmailTo: "Meghívó e-mail küldése ide: {email}",
    sendInvitation: "Meghívó küldése",
    createInviteLink: "Meghívó link létrehozása",
    latestLink: "Legutóbbi meghívó link",
    loading: "Meghívók betöltése…",
    copiedNotice:
      "A meghívó link a vágólapra került. Küldd el e-mailben, WhatsAppon, SMS-ben vagy más csatornán.",
    copyFailed:
      "Automatikus másolás sikertelen — jelöld ki az alábbi linket, másold és oszd meg kézzel.",
    created: "Meghívó létrehozva.",
    revoked: "Meghívó visszavonva.",
    loadError: "A meghívók betöltése sikertelen.",
    createError: "A meghívó létrehozása sikertelen.",
    revokeError: "A visszavonás sikertelen.",
    revoke: "Visszavonás",
    statusPending: "Függőben",
    statusAccepted: "Elfogadva",
    statusExpired: "Lejárt",
    statusRevoked: "Visszavonva",
    anyGoogleAccount: "Bármely Google-fiók",
    expires: "Lejár",
    noInvitationsYet: "Még nincs meghívó."
  },
  connections: {
    profileVisible: "A profilom bárki számára látható",
    profileVisibleHint:
      "Alapértelmezetten bekapcsolva. Más szurkolók megtalálhatnak a Közösségben és küldhetnek kapcsolódási kérelmet. Kapcsold ki, ha el szeretnéd rejteni a keresésből és listákból.",
    profileVisibleSaving: "Láthatóság mentése…",
    profileHiddenNotice: "A profilod rejtve van a Közösség felfedezéséből.",
    discoverableFansTitle: "Szurkolók, akikkel kapcsolódhatsz",
    discoverableFansEmpty: "Jelenleg nincs felfedezhető szurkoló. Próbálj felhasználónévre keresni.",
    searching: "Keresés…",
    loading: "Kapcsolatok betöltése…",
    connectByUsername: "Kapcsolódás felhasználónévvel",
    searchPlaceholder: "Keresés vagy @felhasználónév",
    sendRequest: "Kérelem küldése",
    connect: "Kapcsolódás",
    requestsForYou: "Bejövő kérelmek",
    pendingSent: "Elküldött függőben",
    connected: "Kapcsolódva ({count})",
    onlineSummary: "· {count} online",
    noConnections: "Még nincs kapcsolat. Küldj egy kérelmet a kezdéshez.",
    accept: "Elfogadás",
    decline: "Elutasítás",
    cancel: "Mégse",
    requestSent: "Kérelem elküldve.",
    connectedNotice: "Kapcsolódva.",
    requestUpdated: "Kérelem frissítve."
  },
  welcome: {
    eyebrow: "2026-os vb",
    title: "Üdvözöl a MyPicks",
    lead: "Tippelj meccseket, állíts össze kereteket, kövesd a tornát és kapcsolódj a szurkolókhoz — egy helyen.",
    startExploring: "Felfedezés",
    footnote: "Böngészés ingyenes. Jelentkezz be tippek, keretek és chat mentéséhez.",
    highlights: {
      predictionsTitle: "Tippek",
      predictionsLine: "Tippelj eredményeket és kimeneteleket. Mászd meg a ponttáblát.",
      coachBoardTitle: "Coach Board",
      coachBoardLine: "Állíts fel csapatokat bármely meccshez — húzd a játékosokat a pályára.",
      tournamentTitle: "Verseny",
      tournamentLine: "Csoportok, meccsek és az út a döntőig.",
      communityTitle: "Közösség",
      communityLine: "Adj hozzá barátokat, oszd meg a boardokat és hasonlítsd össze a tippeket."
    }
  }
};
