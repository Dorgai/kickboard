import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  if (!pool) {
    const local =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    const needsSsl =
      !local &&
      (connectionString.includes("sslmode=require") ||
        connectionString.includes("railway") ||
        connectionString.includes("rlwy.net"));

    pool = new Pool({
      connectionString,
      max: 8,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const client = getPool();
  if (!client) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return client.query<T>(text, params);
}
