const DEFAULT_ADMIN_EMAILS = ["laszlo.dorgai@gmail.com"];

export function getAdminEmailAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const list = raw
    ? raw.split(/[,;\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase());

  return [...new Set(list)];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmailAllowlist().includes(normalized);
}
