import assert from "node:assert/strict";
import {
  buildPredictionSharePageUrl,
  decodePredictionShare,
  encodePredictionShare,
  normalizePredictionShareToken
} from "../src/lib/predictions/share.ts";

const payload = {
  v: 1,
  fixtureKey: "wc26:a:usa:england:2026-06-15",
  fixtureLabel: "USA vs England",
  homeTeam: "USA",
  awayTeam: "England",
  predictedOutcome: "home",
  homeScore: 2,
  awayScore: 1,
  scorerPicks: [{ playerId: 9, playerName: "Player", teamSide: "home" }],
  displayName: "Test Fan"
};

const token = encodePredictionShare(payload);
assert.ok(decodePredictionShare(token));

const pathUrl = buildPredictionSharePageUrl(payload);
const fromPath = pathUrl.split("/share/prediction/")[1];
assert.ok(decodePredictionShare(fromPath));

const legacy = `https://kickboard.app/share/prediction?d=${encodeURIComponent(token)}`;
assert.equal(normalizePredictionShareToken(legacy), token);

const pasted = `  ${legacy}  `;
assert.equal(normalizePredictionShareToken(pasted), token);

console.log("prediction share tests ok");
