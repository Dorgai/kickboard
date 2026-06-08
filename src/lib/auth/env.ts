/** Strip trailing slash and accidental double schemes (e.g. https://https://mypicks.live). */
export function normalizePublicSiteUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  if (!normalized) return "";

  normalized = normalized.replace(/^(https?:\/\/)+/i, "https://");
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/** Auth.js v5 reads AUTH_SECRET / AUTH_URL / AUTH_TRUST_HOST — mirror legacy Railway vars at boot. */
export function bootstrapAuthEnv() {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!process.env.AUTH_SECRET?.trim() && jwtSecret) {
    process.env.AUTH_SECRET = jwtSecret;
  }

  if (!process.env.AUTH_TRUST_HOST?.trim()) {
    process.env.AUTH_TRUST_HOST = "true";
  }

  const existing = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (existing) {
    const normalized = normalizePublicSiteUrl(existing);
    if (normalized) process.env.AUTH_URL = normalized;
    return normalized;
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const normalized = normalizePublicSiteUrl(fallback);
  if (normalized) {
    process.env.AUTH_URL = normalized;
  }
  return normalized;
}

export function resolveAuthSecret() {
  return process.env.AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim() || "";
}
