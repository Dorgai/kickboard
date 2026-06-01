type PgErrorLike = {
  code?: string;
  detail?: string;
  message?: string;
  constraint?: string;
};

export function asPgError(error: unknown): PgErrorLike | null {
  if (!error || typeof error !== "object") return null;
  return error as PgErrorLike;
}

/** User-safe message for known Postgres errors (community registration, etc.). */
export function formatPgError(error: unknown) {
  const pg = asPgError(error);
  if (!pg?.code) return null;

  switch (pg.code) {
    case "42P01":
      return "Database tables are missing. Run npm run db:schema on Railway Postgres.";
    case "42704":
      return "A required Postgres extension is missing (citext or uuid-ossp). Re-run db/schema.sql.";
    case "23505":
      return "That account already exists. Try again or use a different display name.";
    case "23502":
      return "A required profile field was missing. Check display name and birth year.";
    case "23514":
      return pg.detail ?? "Profile data did not pass validation.";
    case "42501":
      return "The database user cannot write to this table. Check Railway Postgres permissions.";
    case "22P02":
      return "Invalid birth year or profile data.";
    default:
      return pg.detail ?? pg.message ?? null;
  }
}
