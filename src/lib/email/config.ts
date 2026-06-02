import { isBlockedConsumerFromDomain, parseFromAddress } from "@/lib/email/validate-from";

export type EmailConfig = {
  apiKey: string;
  from: string;
};

export class EmailFromAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailFromAddressError";
  }
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  if (!parseFromAddress(from)) {
    throw new EmailFromAddressError(
      'EMAIL_FROM must look like Kickboard <invites@yourdomain.com> or invites@yourdomain.com'
    );
  }
  if (isBlockedConsumerFromDomain(from)) {
    throw new EmailFromAddressError(
      "EMAIL_FROM cannot use Gmail, Yahoo, Outlook, or similar addresses. Use Kickboard <onboarding@resend.dev> for testing, or a domain you verified at resend.com/domains."
    );
  }
  return { apiKey, from };
}

export function isEmailDeliveryConfigured() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;
  if (!parseFromAddress(from)) return false;
  if (isBlockedConsumerFromDomain(from)) return false;
  return true;
}

/** Throws EmailFromAddressError when EMAIL_FROM is invalid; returns config or null. */
export function requireEmailConfig(): EmailConfig {
  const config = getEmailConfig();
  if (!config) {
    throw new EmailFromAddressError(
      "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM on the server."
    );
  }
  return config;
}
