/** Domains Resend (and most ESPs) will not let you send as without DNS verification. */
const BLOCKED_FROM_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com"
]);

export function parseFromAddress(from: string): { displayName: string | null; email: string } | null {
  const trimmed = from.trim();
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  const email = (angle ? angle[2] : trimmed).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const displayName = angle ? angle[1].trim().replace(/^["']|["']$/g, "") : null;
  return { displayName: displayName || null, email };
}

export function fromAddressDomain(from: string): string | null {
  const parsed = parseFromAddress(from);
  if (!parsed) return null;
  return parsed.email.split("@")[1] ?? null;
}

export function isBlockedConsumerFromDomain(from: string): boolean {
  const domain = fromAddressDomain(from);
  if (!domain) return false;
  return BLOCKED_FROM_DOMAINS.has(domain);
}

export function formatResendSendErrorDetail(status: number, rawBody: string): string {
  try {
    const payload = JSON.parse(rawBody) as { message?: string; name?: string };
    if (payload.message) {
      const lower = payload.message.toLowerCase();
      if (status === 403 && lower.includes("testing emails")) {
        return (
          "Resend is in test mode: you can only email your own Resend account address until a domain is verified. " +
          "Add your domain at resend.com/domains, set Railway EMAIL_FROM to something like MyPicks <invites@yourdomain.com>, " +
          "then redeploy. Until then, copy the invite link below."
        );
      }
      if (status === 403 && lower.includes("not verified")) {
        return (
          "The sender address uses a domain that is not verified with Resend. " +
          "Verify your domain at resend.com/domains and set EMAIL_FROM to an address on that domain " +
          "(you cannot send as @gmail.com). Copy the invite link below to share manually."
        );
      }
      return payload.message;
    }
  } catch {
    /* use raw body */
  }
  return rawBody.slice(0, 280);
}
