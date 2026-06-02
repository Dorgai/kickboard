import { getEmailConfig } from "@/lib/email/config";

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
  const config = getEmailConfig();
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
    const detail = (await response.text()).slice(0, 500);
    throw new EmailSendFailedError(response.status, detail);
  }

  const payload = (await response.json()) as { id?: string };
  return { id: payload.id ?? "unknown" };
}
