import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getRegistrationInviteTokenFromCookies,
  REGISTRATION_INVITE_COOKIE,
  registrationInviteCookieOptions
} from "@/lib/invitations/cookie";
import { mapInvitationError } from "@/lib/invitations/errors";
import { redeemRegistrationInvitation } from "@/lib/invitations/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json(
      { error: "Complete onboarding first — your invite will apply automatically." },
      { status: 403 }
    );
  }

  const token = await getRegistrationInviteTokenFromCookies();
  if (!token) {
    return NextResponse.json({ redeemed: false });
  }

  try {
    const result = await redeemRegistrationInvitation({
      inviteToken: token,
      newUserId: user.id,
      newUserEmail: user.email
    });

    const response = NextResponse.json({
      redeemed: Boolean(result),
      message: result ? "You are now connected with your inviter." : undefined
    });
    response.cookies.set(REGISTRATION_INVITE_COOKIE, "", {
      ...registrationInviteCookieOptions(0),
      maxAge: 0
    });
    return response;
  } catch (error) {
    const mapped = mapInvitationError(error);
    if (mapped) {
      const response = NextResponse.json({ error: mapped.error, redeemed: false }, { status: mapped.status });
      if (
        error instanceof Error &&
        (error.message === "ALREADY_REGISTERED" ||
          error.message === "INVITATION_EXPIRED" ||
          error.message === "INVITATION_NOT_PENDING")
      ) {
        response.cookies.set(REGISTRATION_INVITE_COOKIE, "", {
          ...registrationInviteCookieOptions(0),
          maxAge: 0
        });
      }
      return response;
    }
    const dbMapped = mapDatabaseError(error);
    if (dbMapped) return NextResponse.json({ error: dbMapped.error }, { status: dbMapped.status });
    return NextResponse.json({ error: "Unable to redeem invitation." }, { status: 500 });
  }
}
