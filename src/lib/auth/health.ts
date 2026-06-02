import { getPool, query } from "@/lib/db";
import { formatPgError } from "@/lib/pg-error";

export type AuthSchemaHealth = {
  oauthColumnsReady: boolean;
  birthYearNullable: boolean;
  oauthWriteProbeOk: boolean;
  oauthWriteProbeError: string | null;
  message: string;
};

async function hasOAuthColumns() {
  const result = await query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = ANY($1::text[])`,
    [["oauth_provider", "oauth_subject", "onboarding_completed_at"]]
  );
  const names = new Set(result.rows.map((row) => row.column_name));
  return (
    names.has("oauth_provider") &&
    names.has("oauth_subject") &&
    names.has("onboarding_completed_at")
  );
}

async function isBirthYearNullable() {
  const result = await query<{ is_nullable: string }>(
    `SELECT is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'birth_year'`
  );
  return result.rows[0]?.is_nullable === "YES";
}

/** Rolled-back insert matching Google OAuth sign-up (NULL birth_year until onboarding). */
export async function probeOAuthUserWrite() {
  const pool = getPool();
  if (!pool) {
    return { ok: false, error: "Database is not configured." };
  }

  const probeId = `oauth_probe_${Date.now().toString(36)}`.slice(0, 30);
  const email = `${probeId}@oauth-probe.kickboard.local`;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (
         email, username, display_name, birth_year, is_child,
         oauth_provider, oauth_subject, tier, role
       )
       VALUES ($1, $2, $3, NULL, false, 'google', $4, 'fan', 'user')`,
      [email, probeId, "OAuth probe", probeId]
    );
    await client.query("ROLLBACK");
    return { ok: true, error: null };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return { ok: false, error: formatPgError(error) ?? "OAuth user write probe failed." };
  } finally {
    client.release();
  }
}

export async function getAuthSchemaHealth(): Promise<AuthSchemaHealth> {
  try {
    const oauthColumnsReady = await hasOAuthColumns();
    const birthYearNullable = await isBirthYearNullable();

    if (!oauthColumnsReady || !birthYearNullable) {
      const parts: string[] = [];
      if (!oauthColumnsReady) {
        parts.push("missing oauth_provider / oauth_subject columns");
      }
      if (!birthYearNullable) {
        parts.push("users.birth_year is still NOT NULL (OAuth needs nullable until onboarding)");
      }
      return {
        oauthColumnsReady,
        birthYearNullable,
        oauthWriteProbeOk: false,
        oauthWriteProbeError: null,
        message: `Auth schema incomplete (${parts.join("; ")}). Run npm run db:schema (includes db/auth-extensions.sql).`
      };
    }

    const probe = await probeOAuthUserWrite();
    if (!probe.ok) {
      return {
        oauthColumnsReady: true,
        birthYearNullable: true,
        oauthWriteProbeOk: false,
        oauthWriteProbeError: probe.error,
        message: probe.error ?? "OAuth user insert probe failed."
      };
    }

    return {
      oauthColumnsReady: true,
      birthYearNullable: true,
      oauthWriteProbeOk: true,
      oauthWriteProbeError: null,
      message: "Google sign-in database schema is ready."
    };
  } catch (error) {
    return {
      oauthColumnsReady: false,
      birthYearNullable: false,
      oauthWriteProbeOk: false,
      oauthWriteProbeError: formatPgError(error),
      message: formatPgError(error) ?? "Auth schema check failed."
    };
  }
}
