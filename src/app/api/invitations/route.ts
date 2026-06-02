import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { mapInvitationError } from "@/lib/invitations/errors";
import {
  createRegistrationInvitation,
  listRegistrationInvitationsForInviter
} from "@/lib/invitations/store";
import { resolveAuthBaseUrl } from "@/auth";
import { assertEmailDeliveryReady, EmailFromAddressError } from "@/lib/email/config";
import { EmailNotConfiguredError, EmailSendFailedError } from "@/lib/email/resend";
import { sendRegistrationInvitationEmail } from "@/lib/email/registration-invitation";

export const dynamic = "force-dynamic";

export type InvitationEmailDelivery =
  | { sent: true; id: string }
  | { sent: false; reason: "skipped" | "not_configured" | "send_failed"; detail?: string };

function resolvePublicBaseUrl(request: Request) {
  const fromAuth = resolveAuthBaseUrl();
  if (fromAuth) return fromAuth;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot send invites." }, { status: 403 });
  }

  try {
    const invitations = await listRegistrationInvitationsForInviter(
      user.id,
      resolvePublicBaseUrl(request)
    );
    return NextResponse.json({ invitations });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load invitations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot send invites." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      inviteeEmail?: string;
      personalMessage?: string;
      sendEmail?: boolean;
    };

    const inviteeEmail = body.inviteeEmail?.trim() ?? "";
    const shouldSendEmail = body.sendEmail !== false && Boolean(inviteeEmail);

    if (shouldSendEmail) {
      if (!process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
        throw new EmailNotConfiguredError();
      }
      assertEmailDeliveryReady();
    }

    const invitation = await createRegistrationInvitation({
      inviterId: user.id,
      inviteeEmail: body.inviteeEmail,
      personalMessage: body.personalMessage,
      baseUrl: resolvePublicBaseUrl(request)
    });

    let emailDelivery: InvitationEmailDelivery = inviteeEmail
      ? { sent: false, reason: "skipped" }
      : { sent: false, reason: "skipped" };

    if (shouldSendEmail && invitation.inviteeEmail) {
      try {
        const sent = await sendRegistrationInvitationEmail({
          inviterDisplayName: user.displayName ?? user.username,
          inviterEmail: user.email,
          inviteeEmail: invitation.inviteeEmail,
          inviteUrl: invitation.inviteUrl,
          personalMessage: invitation.personalMessage,
          expiresAt: invitation.expiresAt
        });
        emailDelivery = { sent: true, id: sent.id };
      } catch (error) {
        if (error instanceof EmailNotConfiguredError) throw error;
        const detail =
          error instanceof EmailSendFailedError
            ? `${error.status}: ${error.detail}`
            : error instanceof Error
              ? error.message
              : "unknown";
        console.error("[invitations] email send failed", detail);
        emailDelivery = { sent: false, reason: "send_failed", detail };
      }
    }

    const message = emailDelivery.sent
      ? `Invitation email sent to ${invitation.inviteeEmail}. They can also use the link below.`
      : emailDelivery.reason === "send_failed"
        ? "Invitation created, but the email could not be sent. Copy the link and share it manually."
        : "Invitation created. Share the link so they can register with Google.";

    return NextResponse.json({
      invitation,
      emailDelivery,
      message
    });
  } catch (error) {
    if (error instanceof EmailFromAddressError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const mapped = mapInvitationError(error) ?? mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to create invitation." }, { status: 500 });
  }
}
