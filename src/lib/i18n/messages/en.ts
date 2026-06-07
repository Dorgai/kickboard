export const enMessages = {
  common: {
    continue: "Continue",
    saving: "Saving…",
    menu: "Menu",
    skipToMain: "Skip to main content",
    checkingSignIn: "Checking sign-in…",
    accountLoading: "Account…",
    navigate: "Navigate",
    help: "Help",
    language: "Language"
  },
  nav: {
    home: "Home",
    community: "Community",
    admin: "Admin",
    homeAria: "{brand} home"
  },
  auth: {
    signInToUse: "Sign in to use {feature}",
    signInWhy: "Why sign in",
    signInWhyBody:
      "Register with Google (OAuth). We use your account for squads, Fan Chat, and predictions — not a separate community password.",
    oauthNotConfigured:
      "Google OAuth is not configured on this server. Add variables on the Railway MyPicks web service, then redeploy.",
    confirmAge: "Confirm your age",
    confirmAgeWhy: "Why we ask",
    confirmAgeWhyBody:
      "Required for child-safety rules. Accounts under 13 stay in Fan Mode and cannot post on the Coach Board.",
    birthYear: "Birth year",
    chooseLanguage: "Choose your language",
    chooseLanguageHint: "You can change this anytime from the menu.",
    signIn: "Sign in",
    signOut: "Sign out",
    signOutAria: "Sign out",
    logOut: "Log out",
    completeOnboarding: "Complete onboarding",
    points: "{count} pts"
  },
  helpMenu: {
    eventOverview: "Event overview",
    welcomeTour: "Welcome tour",
    askAi: "Ask MyPicks AI",
    askAdmin: "Ask an admin"
  },
  theme: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    auto: "Auto",
    autoHint: "Auto is light on mobile; on desktop it follows your device."
  },
  predictions: {
    tournamentPicks: "Tournament picks",
    tournamentShort: "Tournament",
    matchPicks: "Match picks",
    matchShort: "Matches"
  },
  welcome: {
    eyebrow: "World Cup 2026",
    title: "Welcome to MyPicks",
    lead: "Predict matches, build squads, follow the tournament, and connect with fans — all in one place.",
    startExploring: "Start exploring",
    footnote: "Free to browse. Sign in to save picks, squads, and chat.",
    highlights: {
      predictionsTitle: "Predictions",
      predictionsLine: "Pick scores and outcomes. Climb the points board.",
      coachBoardTitle: "Coach Board",
      coachBoardLine: "Set lineups for any match — drag players onto the pitch.",
      tournamentTitle: "Tournament",
      tournamentLine: "Groups, fixtures, and the road to the final.",
      communityTitle: "Community",
      communityLine: "Add friends, share boards, and compare picks."
    }
  }
} as const;

export type Messages = {
  [K in keyof typeof enMessages]: {
    [P in keyof (typeof enMessages)[K]]: (typeof enMessages)[K][P] extends string
      ? string
      : (typeof enMessages)[K][P] extends Record<string, string>
        ? Record<keyof (typeof enMessages)[K][P], string>
        : string;
  };
};
