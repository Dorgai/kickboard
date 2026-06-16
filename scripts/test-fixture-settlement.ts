import assert from "node:assert/strict";
import { scoreFixturePrediction } from "../src/lib/fixture-predictions/scoring";

const exact = scoreFixturePrediction(
  {
    predictedOutcome: "home",
    homeScore: 2,
    awayScore: 1,
    scorerPicks: [
      { playerId: 10, playerName: "Alex Morgan", teamSide: "home" },
      { playerId: 10, playerName: "Alex Morgan", teamSide: "home" }
    ]
  },
  {
    homeGoals: 2,
    awayGoals: 1,
    goalScorers: [
      { playerId: 10, playerName: "Alex Morgan", teamSide: "home", minute: 12, extra: null },
      { playerId: 10, playerName: "Alex Morgan", teamSide: "home", minute: 67, extra: null },
      { playerId: 9, playerName: "Away Nine", teamSide: "away", minute: 72, extra: null }
    ]
  }
);

assert.equal(exact.outcomeStatus, "won");
assert.equal(exact.scoreStatus, "won");
assert.equal(exact.scorersStatus, "won");
assert.equal(exact.totalPointsAwarded, 10);

const partialScorers = scoreFixturePrediction(
  {
    predictedOutcome: "away",
    homeScore: 0,
    awayScore: 2,
    scorerPicks: [
      { playerId: 8, playerName: "Correct Scorer", teamSide: "away" },
      { playerId: 7, playerName: "Wrong Scorer", teamSide: "away" }
    ]
  },
  {
    homeGoals: 1,
    awayGoals: 2,
    goalScorers: [
      { playerId: 11, playerName: "Home Goal", teamSide: "home", minute: 6, extra: null },
      { playerId: 8, playerName: "Correct Scorer", teamSide: "away", minute: 40, extra: null },
      { playerId: 9, playerName: "Other Scorer", teamSide: "away", minute: 88, extra: null }
    ]
  }
);

assert.equal(partialScorers.outcomeStatus, "won");
assert.equal(partialScorers.scoreStatus, "lost");
assert.equal(partialScorers.scorersStatus, "partial");
assert.equal(partialScorers.totalPointsAwarded, 4);

const missingScorerFeed = scoreFixturePrediction(
  {
    predictedOutcome: "draw",
    homeScore: null,
    awayScore: null,
    scorerPicks: [{ playerId: 5, playerName: "Unknown Yet", teamSide: "home" }]
  },
  {
    homeGoals: 1,
    awayGoals: 1,
    goalScorers: []
  }
);

assert.equal(missingScorerFeed.outcomeStatus, "won");
assert.equal(missingScorerFeed.scoreStatus, "void");
assert.equal(missingScorerFeed.scorersStatus, "pending");
assert.equal(missingScorerFeed.totalPointsAwarded, 3);

const noGoalScorerMiss = scoreFixturePrediction(
  {
    predictedOutcome: null,
    homeScore: null,
    awayScore: null,
    scorerPicks: [{ playerId: 5, playerName: "No Goal", teamSide: "home" }]
  },
  {
    homeGoals: 0,
    awayGoals: 0,
    goalScorers: []
  }
);

assert.equal(noGoalScorerMiss.scorersStatus, "lost");
assert.equal(noGoalScorerMiss.totalPointsAwarded, 0);

console.log("fixture settlement scoring tests ok");
