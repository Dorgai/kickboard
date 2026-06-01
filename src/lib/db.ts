import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 8,
      ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
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
