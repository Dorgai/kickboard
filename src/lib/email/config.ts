export type EmailConfig = {
  apiKey: string;
  from: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function isEmailDeliveryConfigured() {
  return getEmailConfig() !== null;
}
