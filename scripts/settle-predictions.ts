/**
 * Grade pending fixture and tournament predictions after matches finish.
 * Schedule via GitHub Actions (with push-match-results) or Railway cron.
 */
import { settleFixturePredictions } from "../src/lib/fixture-predictions/settlement";
import { settleTournamentPredictions } from "../src/lib/tournament-predictions/settlement";

async function main() {
  const [fixture, tournament] = await Promise.all([
    settleFixturePredictions(),
    settleTournamentPredictions()
  ]);

  console.log(
    JSON.stringify({
      ok: true,
      fixture,
      tournament
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
