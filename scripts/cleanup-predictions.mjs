#!/usr/bin/env node
/**
 * Delete all placed fixture + tournament predictions and reset related points/alerts.
 *
 * Usage:
 *   CONFIRM_CLEANUP_PREDICTIONS=yes npm run db:cleanup-predictions
 *
 * Optional dry run (counts only):
 *   npm run db:cleanup-predictions -- --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("error: DATABASE_URL is not set.");
  process.exit(1);
}

if (!dryRun && process.env.CONFIRM_CLEANUP_PREDICTIONS !== "yes") {
  console.error(
    "error: Refusing to delete predictions without CONFIRM_CLEANUP_PREDICTIONS=yes\n" +
      "       Dry run: npm run db:cleanup-predictions -- --dry-run"
  );
  process.exit(1);
}

const countQueries = [
  ["fixture_predictions", "SELECT COUNT(*)::int AS n FROM fixture_predictions"],
  ["tournament_predictions", "SELECT COUNT(*)::int AS n FROM tournament_predictions"],
  ["fixture_prediction_events", "SELECT COUNT(*)::int AS n FROM fixture_prediction_events"],
  ["prediction_share_links", "SELECT COUNT(*)::int AS n FROM prediction_share_links"],
  ["predictions (legacy)", "SELECT COUNT(*)::int AS n FROM predictions"],
  [
    "user_alerts (prediction)",
    `SELECT COUNT(*)::int AS n FROM user_alerts
     WHERE alert_key LIKE 'connection:prediction:%'
        OR alert_key LIKE 'connection:prediction-event:%'`
  ],
  [
    "wallet_ledger (prediction)",
    `SELECT COUNT(*)::int AS n FROM wallet_ledger
     WHERE transaction_type IN ('prediction_correct', 'prediction_partial')`
  ],
  [
    "users with points_balance > 0",
    "SELECT COUNT(*)::int AS n FROM users WHERE deleted_at IS NULL AND points_balance > 0"
  ]
];

async function tableExists(client, tableName) {
  const result = await client.query(`SELECT to_regclass($1) IS NOT NULL AS exists`, [
    `public.${tableName}`
  ]);
  return Boolean(result.rows[0]?.exists);
}

async function safeCount(client, label, sql) {
  try {
    const result = await client.query(sql);
    return { label, count: result.rows[0]?.n ?? 0 };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "42P01") {
      return { label, count: null, missing: true };
    }
    throw error;
  }
}

async function main() {
  const local = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: local ? false : { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    console.log(dryRun ? "Dry run — row counts before cleanup:" : "Before cleanup:");
    const before = [];
    for (const [label, sql] of countQueries) {
      before.push(await safeCount(client, label, sql));
    }
    for (const row of before) {
      if (row.missing) {
        console.log(`  ${row.label}: (table missing)`);
      } else {
        console.log(`  ${row.label}: ${row.count}`);
      }
    }

    if (dryRun) {
      console.log("\nNo changes made (dry run).");
      return;
    }

    const sqlPath = path.join(root, "db/cleanup-predictions.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("\nApplying db/cleanup-predictions.sql …");
    await client.query(sql);
    console.log("Cleanup complete.\nAfter cleanup:");

    for (const [label, sqlText] of countQueries) {
      const row = await safeCount(client, label, sqlText);
      if (row.missing) {
        console.log(`  ${row.label}: (table missing)`);
      } else {
        console.log(`  ${row.label}: ${row.count}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
