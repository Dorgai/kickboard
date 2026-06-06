#!/usr/bin/env node
/**
 * Apply db/schema.sql and db/community-extensions.sql using DATABASE_URL.
 * Idempotent (CREATE IF NOT EXISTS / DO blocks). Prefer this over psql on Railway.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("error: DATABASE_URL is not set.");
  process.exit(1);
}

if (/\.railway\.internal\b/i.test(databaseUrl) || /postgres\.railway\.internal/i.test(databaseUrl)) {
  console.error(
    "error: DATABASE_URL uses Railway private networking (postgres.railway.internal). GitHub Actions and your laptop need the public URL — Railway Postgres → Connect → Public URL, or DATABASE_PUBLIC_URL."
  );
  process.exit(1);
}

const files = [
  "db/schema.sql",
  "db/community-extensions.sql",
  "db/auth-extensions.sql",
  "db/fixture-scope-extensions.sql",
  "db/connections-social-extensions.sql",
  "db/fixture-prediction-settlement-extensions.sql",
  "db/registration-invitations-extensions.sql",
  "db/fixture-prediction-types-extensions.sql",
  "db/user-alerts-extensions.sql",
  "db/fan-chat-messages-extensions.sql",
  "db/fan-chat-thread-reads-extensions.sql",
  "db/admin-moderation-extensions.sql",
  "db/user-activity-extensions.sql",
  "db/help-support-extensions.sql",
  "db/fixture-prediction-events-extensions.sql",
  "db/prediction-share-links-extensions.sql",
  "db/tournament-predictions-extensions.sql",
  "db/tournament-predictions-top-scorer-board.sql",
  "db/push-notifications-extensions.sql"
];

async function applyFile(client, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const sql = fs.readFileSync(absolutePath, "utf8");
  console.log(`Applying ${relativePath} …`);
  await client.query(sql);
  console.log(`Applied ${relativePath}.`);
}

async function main() {
  const local = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  const needsSsl =
    !local &&
    (databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("railway") ||
      databaseUrl.includes("rlwy.net"));

  const client = new Client({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    for (const file of files) {
      await applyFile(client, file);
    }
    console.log("Database schema is up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
