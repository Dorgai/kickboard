import { isDatabaseConfigured, query } from "@/lib/db";

export type CommunityHealth = {
  database: boolean;
  jwt: boolean;
  schemaReady: boolean;
  message: string;
};

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return code === "42P01";
}

export function mapDatabaseError(error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
    return { status: 503, error: "Database is not configured." };
  }
  if (error instanceof Error && error.message === "JWT_SECRET_NOT_CONFIGURED") {
    return { status: 503, error: "JWT_SECRET is not configured." };
  }
  if (isMissingRelationError(error)) {
    return {
      status: 503,
      error:
        "Community tables are missing. On Railway Postgres run: npm run db:schema (applies db/schema.sql and db/community-extensions.sql)."
    };
  }
  return null;
}

export async function getCommunityHealth(): Promise<CommunityHealth> {
  const database = isDatabaseConfigured();
  const jwt = Boolean(process.env.JWT_SECRET?.trim());

  if (!database || !jwt) {
    return {
      database,
      jwt,
      schemaReady: false,
      message: !database
        ? "Attach Railway Postgres and set DATABASE_URL."
        : "Set JWT_SECRET to enable community sessions."
    };
  }

  try {
    await query("SELECT 1 FROM users LIMIT 0");
    await query("SELECT 1 FROM posts LIMIT 0");
    await query("SELECT 1 FROM content_reports LIMIT 0");
    return {
      database: true,
      jwt: true,
      schemaReady: true,
      message: "Community posting is available."
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        database: true,
        jwt: true,
        schemaReady: false,
        message:
          "Postgres is connected but community tables are not installed. Run npm run db:schema against this database."
      };
    }

    return {
      database: true,
      jwt: true,
      schemaReady: false,
      message: "Postgres is connected but the community schema check failed."
    };
  }
}
