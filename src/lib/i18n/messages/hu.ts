import type { Messages } from "@/lib/i18n/messages/en";

export const huMessages: Messages = {
  common: {
    continue: "Folytatás",
    saving: "Mentés…",
    menu: "Menü",
    skipToMain: "Ugrás a fő tartalomhoz",
    checkingSignIn: "Bejelentkezés ellenőrzése…",
    accountLoading: "Fiók…",
    navigate: "Navigáció",
    help: "Súgó",
    language: "Nyelv"
  },
  nav: {
    home: "Kezdőlap",
    community: "Közösség",
    admin: "Admin",
    homeAria: "{brand} kezdőlap"
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
    chooseLanguage: "Válaszd ki a nyelvet",
    chooseLanguageHint: "Bármikor megváltoztathatod a menüben.",
    signIn: "Bejelentkezés",
    signOut: "Kijelentkezés",
    signOutAria: "Kijelentkezés",
    logOut: "Kilépés",
    completeOnboarding: "Bevezetés befejezése",
    points: "{count} pont"
  },
  helpMenu: {
    eventOverview: "Verseny áttekintése",
    welcomeTour: "Bemutató",
    askAi: "Kérdezd a MyPicks AI-t",
    askAdmin: "Kérdezz egy admint"
  },
  theme: {
    label: "Téma",
    light: "Világos",
    dark: "Sötét",
    auto: "Auto",
    autoHint: "Mobilon világos; asztali gépen a készülék beállítását követi."
  },
  predictions: {
    tournamentPicks: "Verseny tippek",
    tournamentShort: "Verseny",
    matchPicks: "Meccs tippek",
    matchShort: "Meccsek"
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
