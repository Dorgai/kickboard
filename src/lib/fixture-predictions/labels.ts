/** User-facing prediction block titles (1–5 words). */
export const PREDICTION_BLOCKS = {
  outcome: "Who wins?",
  score: "Final score",
  scorers: "Who scores?"
} as const;

/** Short labels for summaries and tables. */
export const PREDICTION_BLOCK_SHORT = {
  outcome: "Result",
  score: "Score",
  scorers: "Scorers"
} as const;

export const PREDICTION_OUTCOME_OPTION = {
  home: "Win",
  draw: "Draw",
  away: "Win"
} as const;

export const PREDICTION_HINTS = {
  outcomeEmpty: "Choose home, away, or draw",
  scoreOptional: "Optional — skip if not guessing score",
  scorersLead: "Pick one scorer per goal in your final score",
  scorersShowList: "Tap here to show the player list",
  scorersHideList: "Tap to hide the player list",
  saveButton: "Save picks",
  locked:
    "Picks are locked — this match has already kicked off. You can still view your saved picks and points."
} as const;
