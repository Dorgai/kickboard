export const enMessages = {
  common: {
    continue: "Continue",
    saving: "Saving…",
    sending: "Sending…",
    menu: "Menu",
    skipToMain: "Skip to main content",
    checkingSignIn: "Checking sign-in…",
    accountLoading: "Account…",
    navigate: "Navigate",
    help: "Help",
    language: "Language",
    notNow: "Not now",
    dismiss: "Dismiss",
    copyLink: "Copy link",
    loading: "Loading…"
  },
  nav: {
    home: "Home",
    community: "Community",
    admin: "Admin",
    homeAria: "{brand} home",
    primaryAria: "Primary navigation"
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
    username: "Username (optional)",
    usernameHint: "Friends find you with @username on Community. Skip to keep an auto-assigned handle.",
    usernamePlaceholder: "e.g. {example}",
    usernamePlaceholderGeneric: "e.g. alex_k",
    chooseLanguage: "Choose your language",
    chooseLanguageHint: "You can change this anytime from the menu.",
    signIn: "Sign in",
    signOut: "Sign out",
    signOutAria: "Sign out",
    logOut: "Log out",
    completeOnboarding: "Complete onboarding",
    points: "{count} pts",
    onboardingFailed: "Onboarding failed."
  },
  helpMenu: {
    eventOverview: "Event overview",
    welcomeTour: "Welcome tour",
    askAi: "Ask MyPicks AI",
    askAdmin: "Ask an admin"
  },
  helpCenter: {
    title: "Help",
    eyebrow: "Help",
    heading: "Questions & support",
    channelAi: "MyPicks AI",
    channelAdmin: "Ask admin",
    signInPrompt: "Sign in and complete onboarding to save your help conversations and reach an admin.",
    placeholderAi: "Ask MyPicks AI…",
    placeholderAdmin: "Message for admins (account, bugs, policy)…",
    threadPlaceholderAi: "Ask a question below.",
    threadPlaceholderAdmin: "Describe your issue below.",
    send: "Send",
    close: "Close help",
    newThread: "New thread",
    yourMessage: "Your message",
    roleYou: "You",
    roleAdmin: "Admin",
    roleSystem: "System"
  },
  theme: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    auto: "Auto",
    autoHint: "Auto is light on mobile; on desktop it follows your device.",
    ariaLabel: "Color theme"
  },
  predictions: {
    tournamentPicks: "Tournament picks",
    tournamentShort: "Tournament",
    matchPicks: "Match picks",
    matchShort: "Matches",
    featureLabel: "Predictions",
    loadingPicks: "Loading picks…",
    loadingPoints: "Loading points…",
    pickMatch: "Pick a match",
    loadingFixtures: "Loading upcoming fixtures from the tournament feed.",
    typeAria: "Prediction type",
    selectMatchAria: "Select a match for your prediction"
  },
  eventTabs: {
    tournament: "Tournament",
    predictions: "Predictions",
    coachBoard: "Coach Board",
    coachBoardLine1: "Coach",
    coachBoardLine2: "Board",
    community: "Community",
    groupStage: "Group stage",
    knockout: "Knockout",
    sectionAria: "Current event sections"
  },
  notifications: {
    title: "Alerts",
    markAllRead: "Mark all read",
    signInToSee: "Sign in to see connection activity and match alerts.",
    updating: "Updating alerts…",
    empty:
      "No alerts yet. Connect with fans to see their predictions and boards; upcoming WC26 kickoffs appear within three days of the match.",
    openAlerts: "Open alerts",
    unreadAlerts: "{count} unread alerts",
    categoryConnection: "Connection",
    categoryUpcoming: "Upcoming",
    categoryResult: "Result",
    timeJustNow: "Just now",
    timeMinutesAgo: "{count}m ago",
    timeHoursAgo: "{count}h ago",
    loadError: "Unable to load alerts."
  },
  pwa: {
    installAria: "Install MyPicks",
    title: "Add MyPicks to your home screen",
    iosBeforeShare: "Tap",
    iosShare: "Share",
    iosAfterShare: ", then",
    iosAddToHomeScreen: "Add to Home Screen",
    iosTail: "for a full-screen app experience.",
    androidCopy: "Install MyPicks from your browser menu for quick access and a full-screen view.",
    notNow: "Not now",
    dismissAria: "Dismiss install hint"
  },
  invitations: {
    title: "Invite someone to register",
    tooltipLabel: "Registration invites",
    tooltipBody:
      "Leave email blank to get a link you can share anywhere. Add their email only to lock the invite to that Google account. After they register, you'll be connected automatically.",
    emailLabel: "Their email (optional)",
    emailPlaceholder: "friend@example.com",
    selfHint:
      "Invitations are for someone else. Leave email blank for a link you can copy, or use a different address.",
    selfError:
      "That email is your sign-in address. Enter a friend's email, or leave the field blank to create a shareable link.",
    messageLabel: "Short message (optional)",
    messagePlaceholder: "Join me on MyPicks for WC26 picks and Coach Board…",
    sendEmailTo: "Send invitation email to {email}",
    sendInvitation: "Send invitation",
    createInviteLink: "Create invite link",
    latestLink: "Latest invite link",
    loading: "Loading your invitations…",
    copiedNotice:
      "Invitation link copied to your clipboard. Send it to your friend by email, WhatsApp, text message, or any other channel you use.",
    copyFailed:
      "Could not copy automatically — select the link below, copy it, then send it by email, WhatsApp, text, or another app.",
    created: "Invitation created.",
    revoked: "Invitation revoked.",
    loadError: "Unable to load invitations.",
    createError: "Unable to create invitation.",
    revokeError: "Unable to revoke.",
    revoke: "Revoke",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusExpired: "Expired",
    statusRevoked: "Revoked",
    anyGoogleAccount: "Any Google account",
    expires: "Expires",
    noInvitationsYet: "No invitations yet."
  },
  connections: {
    profileVisible: "My profile is visible to anyone",
    profileVisibleHint:
      "On by default. Other fans can find you on Community and send connection requests. Turn off to hide from search and browse lists.",
    profileVisibleSaving: "Saving visibility…",
    profileHiddenNotice: "Your profile is hidden from Community discovery.",
    discoverableFansTitle: "Fans you can connect with",
    discoverableFansEmpty: "No discoverable fans right now. Try searching by username.",
    searching: "Searching…",
    loading: "Loading connections…",
    connectByUsername: "Connect by username",
    searchPlaceholder: "Search or type @username",
    sendRequest: "Send request",
    connect: "Connect",
    requestsForYou: "Requests for you",
    pendingSent: "Pending sent",
    connected: "Connected ({count})",
    onlineSummary: "· {count} online",
    noConnections: "No connections yet. Send a request to get started.",
    accept: "Accept",
    decline: "Decline",
    cancel: "Cancel",
    requestSent: "Request sent.",
    connectedNotice: "Connected.",
    requestUpdated: "Request updated."
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
  },
  friendsHighlights: {
    eyebrow: "Daily pulse",
    title: "Friends' prediction highlights",
    leadWithFriends: "Key moves from your {count} connections in the last day.",
    leadNoFriends: "Connect with fans to see their picks here each day.",
    loading: "Loading friends' highlights…",
    emptyWithFriends: "No fresh friend picks in the last day — check back after the next kickoff.",
    emptyNoFriends: "Add connections in Community to get a daily digest of their picks.",
    findFriends: "Find friends",
    close: "Close",
    autoDismiss: "This recap disappears in a few seconds…",
    blowingUp: "See you tomorrow!"
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
