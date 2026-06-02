import { EmailFromAddressError, getEmailConfig } from "@/lib/email/config";
import { formatResendSendErrorDetail } from "@/lib/email/validate-from";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult = {
  id: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("EMAIL_NOT_CONFIGURED");
  }
}

export class EmailSendFailedError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super("EMAIL_SEND_FAILED");
    this.status = status;
    this.detail = detail;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  let config;
  try {
    config = getEmailConfig();
  } catch (error) {
    if (error instanceof EmailFromAddressError) {
      throw new EmailSendFailedError(400, error.message);
    }
    throw error;
  }
  if (!config) throw new EmailNotConfiguredError();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    const detail = formatResendSendErrorDetail(response.status, raw);
    throw new EmailSendFailedError(response.status, detail);
  }

  const payload = (await response.json()) as { id?: string };
  return { id: payload.id ?? "unknown" };
}
