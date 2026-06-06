import { sendEmail } from "@/lib/email/resend";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExpiryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

export function buildRegistrationInvitationEmail(input: {
  inviterDisplayName: string;
  inviteeEmail: string;
  inviteUrl: string;
  personalMessage: string | null;
  expiresAt: string;
}) {
  const inviter = escapeHtml(input.inviterDisplayName.trim() || "A MyPicks fan");
  const inviteUrl = input.inviteUrl.trim();
  const expiryLabel = formatExpiryDate(input.expiresAt);
  const messageBlock = input.personalMessage?.trim()
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #16a34a;background:#f3f4f6;color:#111827;font-size:15px;line-height:1.5;">
        ${escapeHtml(input.personalMessage.trim())}
      </blockquote>`
  : "";

  const subject = `${input.inviterDisplayName.trim() || "Someone"} invited you to MyPicks`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">MyPicks invitation</p>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Join ${inviter} on MyPicks</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">
                  ${inviter} invited you to register with Google, pick World Cup fixtures, and connect on Coach Board.
                </p>
                ${messageBlock}
                <p style="margin:0 0 20px;text-align:center;">
                  <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:8px;">
                    Accept invitation
                  </a>
                </p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b7280;">
                  Or copy this link:<br />
                  <a href="${escapeHtml(inviteUrl)}" style="color:#15803d;word-break:break-all;">${escapeHtml(inviteUrl)}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                  This invite is for <strong>${escapeHtml(input.inviteeEmail)}</strong> and expires on ${escapeHtml(expiryLabel)}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `${input.inviterDisplayName.trim() || "Someone"} invited you to MyPicks.`,
    "",
    input.personalMessage?.trim() ? `Message: ${input.personalMessage.trim()}` : null,
    input.personalMessage?.trim() ? "" : null,
    `Accept your invitation: ${inviteUrl}`,
    "",
    `This invite is for ${input.inviteeEmail} and expires on ${expiryLabel}.`
  ].filter((line): line is string => line !== null);

  return { subject, html, text: textLines.join("\n") };
}

export async function sendRegistrationInvitationEmail(input: {
  inviterDisplayName: string;
  inviterEmail?: string;
  inviteeEmail: string;
  inviteUrl: string;
  personalMessage: string | null;
  expiresAt: string;
}) {
  const { subject, html, text } = buildRegistrationInvitationEmail(input);
  return sendEmail({
    to: input.inviteeEmail,
    subject,
    html,
    text,
    replyTo: input.inviterEmail
  });
}
