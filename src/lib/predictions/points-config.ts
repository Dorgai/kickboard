/** Fan points per category — each dimension grades independently. */
export const FIXTURE_PREDICTION_POINTS = {
  outcome: 1,
  exactScore: 3,
  scorerPerCorrect: 1
} as const;

export const TOURNAMENT_PREDICTION_POINTS = {
  champion: 10,
  /** Both finalists correct (champion + opponent in the final). */
  finalists: 6,
  /** One correct finalist when the other is wrong. */
  finalistPartial: 2,
  topScorer: 5,
  bestPlayer: 5,
  /** Per correct rank on the optional top-scorer leaderboard. */
  scorerBoardPerRank: 1
} as const;
