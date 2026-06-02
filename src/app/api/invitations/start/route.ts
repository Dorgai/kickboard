import { NextResponse } from "next/server";
import { mapInvitationError } from "@/lib/invitations/errors";
import {
  createRegistrationInviteCookieValue,
  REGISTRATION_INVITE_COOKIE,
  registrationInviteCookieOptions
} from "@/lib/invitations/cookie";
import { getPublicInvitationByToken } from "@/lib/invitations/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim() ?? "";
    if (!token) throw new Error("TOKEN_REQUIRED");

    const invitation = await getPublicInvitationByToken(token);
    if (!invitation) throw new Error("INVITATION_NOT_FOUND");
    if (invitation.status !== "pending") {
      if (invitation.status === "accepted") throw new Error("ALREADY_REGISTERED");
      throw new Error("INVITATION_NOT_PENDING");
    }

    const response = NextResponse.json({
      ok: true,
      invitation: {
        inviterDisplayName: invitation.inviterDisplayName,
        inviterUsername: invitation.inviterUsername,
        personalMessage: invitation.personalMessage,
        inviteeEmail: invitation.inviteeEmail
      }
    });

    response.cookies.set(
      REGISTRATION_INVITE_COOKIE,
      createRegistrationInviteCookieValue(token),
      registrationInviteCookieOptions()
    );

    return response;
  } catch (error) {
    const mapped = mapInvitationError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to start invitation." }, { status: 500 });
  }
}
