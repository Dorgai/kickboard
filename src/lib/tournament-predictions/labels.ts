/** User-facing tournament prediction blocks. */
export const TOURNAMENT_PREDICTION_BLOCKS = {
  champion: "Champion",
  finalists: "Finalists",
  topScorer: "Top goal scorer",
  bestPlayer: "Best player"
} as const;

export const TOURNAMENT_PREDICTION_HINTS = {
  champion: "Pick the team you think wins the World Cup.",
  finalists: "Pick the two teams you think reach the final.",
  topScorer: "Golden Boot — most goals in the tournament.",
  bestPlayer: "Tournament MVP / best player of the World Cup.",
  saveButton: "Save tournament picks",
  finalistSlot: (index: number) => `Finalist ${index + 1}`
} as const;
