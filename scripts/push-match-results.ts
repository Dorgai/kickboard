/**
 * Push full-time match results to subscribed users.
 * Schedule via Railway cron or GitHub Actions (every 15–30 min during match days).
 */
import { pushRecentMatchResultsToSubscribers } from "../src/lib/push/match-results";
import { settleFixturePredictions } from "../src/lib/fixture-predictions/settlement";
import { settleTournamentPredictions } from "../src/lib/tournament-predictions/settlement";

async function main() {
  const [pushResult, fixtureSettlement, tournamentSettlement] = await Promise.all([
    pushRecentMatchResultsToSubscribers(),
    settleFixturePredictions(),
    settleTournamentPredictions()
  ]);
  console.log(JSON.stringify({ ok: true, push: pushResult, fixtureSettlement, tournamentSettlement }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
