/**
 * Push full-time match results to subscribed users.
 * Schedule via Railway cron or GitHub Actions (every 15–30 min during match days).
 */
import { pushRecentMatchResultsToSubscribers } from "../src/lib/push/match-results";

async function main() {
  const result = await pushRecentMatchResultsToSubscribers();
  console.log(JSON.stringify({ ok: true, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
