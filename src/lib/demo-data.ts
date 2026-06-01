import type { UserStatCardData } from "@/components/user-stat-card";

export const demoTournament = {
  name: "FIFA World Cup 2026",
  mode: "Demo seed data",
  lastUpdated: "2026-06-01T12:00:00Z",
  sourceNote: "Curated demo data shown until the API-Football polling worker is connected."
};

export const demoLiveMatch = {
  id: "demo-bra-fra",
  minute: 73,
  status: "LIVE",
  venue: "MetLife Stadium, New Jersey",
  homeTeam: {
    name: "Brazil",
    code: "BRA",
    score: 2
  },
  awayTeam: {
    name: "France",
    code: "FRA",
    score: 1
  },
  prediction: "Brazil 2-1 France -> exact score live",
  stats: [
    { label: "Possession", home: "58%", away: "42%" },
    { label: "Shots on target", home: "5", away: "3" },
    { label: "Passes", home: "312", away: "220" },
    { label: "Corners", home: "4", away: "2" }
  ],
  events: [
    { minute: "12'", type: "Goal", detail: "Vinicius Junior scores from a low Rodrygo cross", tone: "goal" },
    { minute: "34'", type: "Yellow card", detail: "Aurelien Tchouameni booked for a late challenge", tone: "danger" },
    { minute: "56'", type: "Substitution", detail: "France bring on fresh pace on the left wing", tone: "brand" },
    { minute: "73'", type: "Live stat", detail: "Brazil lead possession 58% to 42%", tone: "live" }
  ]
};

export const demoDashboardWidgets = [
  {
    title: "Live Match",
    eyebrow: "73' LIVE",
    body: "Brazil 2-1 France",
    meta: "Prediction: Brazil 2-1 -> exact score live"
  },
  {
    title: "Bracket Mini",
    eyebrow: "Round of 16",
    body: "Brazil, France, Argentina and Japan tracking as qualifiers",
    meta: "Next match: USA vs Senegal at 20:00 UTC"
  },
  {
    title: "Coach Board",
    eyebrow: "Latest",
    body: "Maya shared a 4-3-3 Brazil-France squad",
    meta: "3 new squad shares and 12 reactions"
  },
  {
    title: "Wallet",
    eyebrow: "Fan points",
    body: "1,284 pts",
    meta: "Rank #12 globally, 41% prediction accuracy"
  }
];

export const demoGroups = [
  {
    name: "Group A",
    teams: [
      { name: "Brazil", code: "BRA", played: 3, goalDifference: 5, points: 7 },
      { name: "Morocco", code: "MAR", played: 3, goalDifference: 2, points: 5 },
      { name: "Japan", code: "JPN", played: 3, goalDifference: 0, points: 4 },
      { name: "Canada", code: "CAN", played: 3, goalDifference: -7, points: 0 }
    ]
  },
  {
    name: "Group B",
    teams: [
      { name: "France", code: "FRA", played: 3, goalDifference: 4, points: 7 },
      { name: "USA", code: "USA", played: 3, goalDifference: 1, points: 5 },
      { name: "Senegal", code: "SEN", played: 3, goalDifference: 0, points: 4 },
      { name: "Australia", code: "AUS", played: 3, goalDifference: -5, points: 0 }
    ]
  },
  {
    name: "Group C",
    teams: [
      { name: "Argentina", code: "ARG", played: 3, goalDifference: 3, points: 6 },
      { name: "Germany", code: "GER", played: 3, goalDifference: 2, points: 6 },
      { name: "Spain", code: "ESP", played: 3, goalDifference: 1, points: 4 },
      { name: "Ghana", code: "GHA", played: 3, goalDifference: -6, points: 1 }
    ]
  }
];

export const demoMatches = [
  {
    id: "demo-usa-sen",
    status: "Upcoming",
    kickoff: "20:00 UTC",
    homeTeam: "USA",
    awayTeam: "Senegal",
    venue: "Lumen Field, Seattle"
  },
  {
    id: "demo-arg-ger",
    status: "Completed",
    kickoff: "FT",
    homeTeam: "Argentina",
    awayTeam: "Germany",
    score: "1-1",
    venue: "AT&T Stadium, Dallas"
  },
  {
    id: "demo-jpn-mar",
    status: "Upcoming",
    kickoff: "Tomorrow 17:00 UTC",
    homeTeam: "Japan",
    awayTeam: "Morocco",
    venue: "BC Place, Vancouver"
  }
];

export const demoTopScorers = [
  { name: "Kylian Mbappe", team: "France", goals: 5, assists: 2, rating: "9.1" },
  { name: "Vinicius Junior", team: "Brazil", goals: 4, assists: 3, rating: "8.9" },
  { name: "Lionel Messi", team: "Argentina", goals: 3, assists: 4, rating: "8.8" },
  { name: "Jamal Musiala", team: "Germany", goals: 3, assists: 2, rating: "8.5" },
  { name: "Christian Pulisic", team: "USA", goals: 2, assists: 2, rating: "8.1" }
];

export const demoLeaderboard = [
  { rank: 1, username: "Maya", points: 1320, accuracy: "44%" },
  { rank: 2, username: "Lazlo", points: 1284, accuracy: "41%" },
  { rank: 3, username: "CoachNina", points: 1210, accuracy: "39%" },
  { rank: 4, username: "TacticsTom", points: 1188, accuracy: "37%" },
  { rank: 5, username: "Ari", points: 1142, accuracy: "35%" }
];

export const demoSquad = {
  name: "Brazil-France Watch XI",
  formation: "4-3-3",
  players: [
    { slot: "LW", name: "Vinicius Junior", team: "Brazil", rating: "8.9" },
    { slot: "ST", name: "Kylian Mbappe", team: "France", rating: "9.1" },
    { slot: "RW", name: "Rodrygo", team: "Brazil", rating: "8.2" },
    { slot: "CM", name: "Antoine Griezmann", team: "France", rating: "8.0" },
    { slot: "CM", name: "Bruno Guimaraes", team: "Brazil", rating: "7.8" },
    { slot: "DM", name: "Aurelien Tchouameni", team: "France", rating: "7.5" },
    { slot: "LB", name: "Theo Hernandez", team: "France", rating: "7.7" },
    { slot: "CB", name: "Marquinhos", team: "Brazil", rating: "7.9" },
    { slot: "CB", name: "William Saliba", team: "France", rating: "7.8" },
    { slot: "RB", name: "Danilo", team: "Brazil", rating: "7.4" },
    { slot: "GK", name: "Alisson", team: "Brazil", rating: "8.1" }
  ]
};

export const demoUserStatCard: UserStatCardData = {
  username: "Lazlo",
  handle: "@kickboarder",
  tier: "pro",
  points: "1,284",
  rank: "#12",
  accuracy: "41%",
  streak: [true, true, true, false, false],
  streakLabel: "3 correct in a row",
  topPlayer: {
    name: "Kylian Mbappe",
    rating: "9.2",
    portraitInitials: "KM"
  },
  squadsSubmitted: 14,
  votesCast: 67,
  friendsCount: 8
};

export const demoData = {
  tournament: demoTournament,
  liveMatch: demoLiveMatch,
  widgets: demoDashboardWidgets,
  groups: demoGroups,
  matches: demoMatches,
  topScorers: demoTopScorers,
  leaderboard: demoLeaderboard,
  squad: demoSquad,
  userStatCard: demoUserStatCard
};
