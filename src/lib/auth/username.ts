const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "help",
  "kickboard",
  "mypicks",
  "support",
  "system",
  "null",
  "undefined",
  "fan",
  "user",
  "mod",
  "moderator",
  "official",
  "staff",
  "team"
]);

export function suggestUsernameFromLabel(label: string | null | undefined) {
  const slug = (label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  if (slug.length < 3) return "";
  if (!USERNAME_PATTERN.test(slug)) return "";
  if (RESERVED_USERNAMES.has(slug)) return "";
  return slug;
}

export function parseOptionalUsername(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new Error("INVALID_USERNAME");
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const username = trimmed.toLowerCase();
  assertUsernameAvailable(username);
  return username;
}

export function assertUsernameAvailable(username: string) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("INVALID_USERNAME");
  }
  if (RESERVED_USERNAMES.has(username)) {
    throw new Error("USERNAME_RESERVED");
  }
}

export function isUsernameUniqueViolation(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "23505"
  );
}
