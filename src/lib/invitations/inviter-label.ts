/** Human-facing inviter name — never the internal @username slug unless nothing else exists. */
export function formatInviterPublicName(input: {
  displayName: string | null | undefined;
  username: string;
  email?: string | null;
}): string {
  const display = input.displayName?.trim() ?? "";
  const username = input.username.trim();

  if (display && !looksLikeInternalUsername(display, username)) {
    return display;
  }

  const fromEmail = humanNameFromEmail(input.email);
  if (fromEmail) return fromEmail;

  if (username && !looksLikeInternalUsername(username, username)) {
    return username;
  }

  return "A Kickboard fan";
}

function looksLikeInternalUsername(value: string, username: string): boolean {
  const normalized = value.trim().toLowerCase();
  const userNorm = username.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === userNorm) return true;
  // Auto usernames: slug_random, e.g. laszlo_dorgai_x7k2q1
  if (/^[a-z0-9]+_[a-z0-9]{4,8}$/i.test(normalized)) return true;
  if (normalized.includes("_") && !normalized.includes(" ")) return true;
  return false;
}

function humanNameFromEmail(email: string | null | undefined): string | null {
  const local = email?.split("@")[0]?.trim() ?? "";
  if (!local || local.length < 2) return null;
  const words = local
    .replace(/[._+-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (words.length === 0) return null;
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
