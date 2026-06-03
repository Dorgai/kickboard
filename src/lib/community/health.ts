import { getPool, isDatabaseConfigured, query } from "@/lib/db";
import { formatPgError } from "@/lib/pg-error";

export type CommunityHealth = {
  database: boolean;
  jwt: boolean;
  schemaReady: boolean;
  writeProbeOk: boolean;
  writeProbeError: string | null;
  message: string;
};

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "42703";
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
        "Community or messaging tables are missing or out of date. From your laptop or GitHub Actions, set DATABASE_URL to Railway Postgres → Connect → Public URL (not postgres.railway.internal), then run npm run db:schema. Or run the “Apply community schema (production)” workflow. Verify GET /api/community/status shows schemaReady:true."
    };
  }
  const pgMessage = formatPgError(error);
  if (pgMessage) {
    return { status: 500, error: pgMessage };
  }
  return null;
}

async function hasRequiredExtensions() {
  const result = await query<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname = ANY($1::text[])`,
    [["citext", "uuid-ossp"]]
  );
  const names = new Set(result.rows.map((row) => row.extname));
  return names.has("citext") && names.has("uuid-ossp");
}

/** Rolled-back insert to verify the DB user can write to users. */
export async function probeCommunityWrite() {
  const pool = getPool();
  if (!pool) {
    return { ok: false, error: "Database is not configured." };
  }

  const client = await pool.connect();
  const probeUsername = `probe_${Date.now().toString(36)}`;

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (email, username, display_name, birth_year, is_child, tier, role)
       VALUES ($1, $2, $3, $4, false, 'fan', 'user')`,
      [`${probeUsername}@community.kickboard.local`, probeUsername, "Probe", 1990]
    );
    await client.query("ROLLBACK");
    return { ok: true, error: null };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return { ok: false, error: formatPgError(error) ?? "Write probe failed." };
  } finally {
    client.release();
  }
}

export async function getCommunityHealth(): Promise<CommunityHealth> {
  const database = isDatabaseConfigured();
  const jwt = Boolean(process.env.JWT_SECRET?.trim());

  if (!database || !jwt) {
    return {
      database,
      jwt,
      schemaReady: false,
      writeProbeOk: false,
      writeProbeError: null,
      message: !database
        ? "Attach Railway Postgres and set DATABASE_URL."
        : "Set JWT_SECRET to enable community sessions."
    };
  }

  try {
    await query("SELECT 1 FROM users LIMIT 0");
    await query("SELECT 1 FROM posts LIMIT 0");
    await query("SELECT 1 FROM content_reports LIMIT 0");

    if (!(await hasRequiredExtensions())) {
      return {
        database: true,
        jwt: true,
        schemaReady: false,
        writeProbeOk: false,
        writeProbeError: "Extensions citext and uuid-ossp are required.",
        message: "Run db/schema.sql (creates citext and uuid-ossp extensions)."
      };
    }

    const probe = await probeCommunityWrite();
    if (!probe.ok) {
      return {
        database: true,
        jwt: true,
        schemaReady: false,
        writeProbeOk: false,
        writeProbeError: probe.error,
        message: probe.error ?? "Postgres is connected but test registration failed."
      };
    }

    return {
      database: true,
      jwt: true,
      schemaReady: true,
      writeProbeOk: true,
      writeProbeError: null,
      message: "Community posting is available."
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        database: true,
        jwt: true,
        schemaReady: false,
        writeProbeOk: false,
        writeProbeError: null,
        message:
          "Postgres is connected but community tables are not installed. Run npm run db:schema against this database."
      };
    }

    return {
      database: true,
      jwt: true,
      schemaReady: false,
      writeProbeOk: false,
      writeProbeError: formatPgError(error),
      message: "Postgres is connected but the community schema check failed."
    };
  }
}
