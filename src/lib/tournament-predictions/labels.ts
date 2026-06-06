/** User-facing tournament prediction blocks. */
export const TOURNAMENT_PREDICTION_BLOCKS = {
  champion: "Champion",
  finalOpponent: "Final opponent",
  topScorer: "Top goal scorer",
  topScorerBoard: "Top scorer leaderboard",
  bestPlayer: "Best player"
} as const;

export const TOURNAMENT_PREDICTION_HINTS = {
  champion: "Pick the team you think wins the World Cup.",
  finalOpponent: "Pick the team you think meets your champion in the final.",
  finalOpponentPrereq: "Choose a champion first, then pick their opponent in the final.",
  topScorer: "Golden Boot — most goals in the tournament.",
  topScorerBoard:
    "Optional — predict who finishes in the top 5 or top 10 scoring charts and how many goals each scores.",
  topScorerBoardEnable: "Also predict a top scorer leaderboard",
  topScorerBoardSize5: "Top 5",
  topScorerBoardSize10: "Top 10",
  topScorerBoardRank: (rank: number) => `#${rank}`,
  topScorerBoardChoose: "Choose player",
  topScorerBoardGoals: "Goals",
  bestPlayer: "Tournament MVP / best player of the World Cup.",
  saveButton: "Save tournament picks"
} as const;
