#!/usr/bin/env npx tsx
/**
 * Send daily "matches today" Web Push digests. Schedule via Railway cron or GitHub Actions.
 * Requires DATABASE_URL and VAPID_* env vars.
 */

import { runDailyMatchDigestForUtcDay } from "../src/lib/push/daily-digest";
import { isWebPushConfigured } from "../src/lib/push/vapid";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  if (!isWebPushConfigured()) {
    console.error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required.");
    process.exit(1);
  }

  const result = await runDailyMatchDigestForUtcDay(new Date());
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
