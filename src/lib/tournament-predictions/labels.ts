/** User-facing tournament prediction blocks. */
export const TOURNAMENT_PREDICTION_BLOCKS = {
  champion: "Champion",
  finalOpponent: "Final opponent",
  topScorer: "Top goal scorer",
  bestPlayer: "Best player"
} as const;

export const TOURNAMENT_PREDICTION_HINTS = {
  champion: "Pick the team you think wins the World Cup.",
  finalOpponent: "Pick the team you think meets your champion in the final.",
  finalOpponentPrereq: "Choose a champion first, then pick their opponent in the final.",
  topScorer: "Golden Boot — most goals in the tournament.",
  bestPlayer: "Tournament MVP / best player of the World Cup.",
  saveButton: "Save tournament picks"
} as const;
