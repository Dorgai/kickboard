import { NextResponse } from "next/server";
import { recordActivityEvent } from "@/lib/activity/store";
import { requireAuthUser } from "@/lib/auth/require-user";
import { completeUserOnboarding } from "@/lib/auth/users";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getRegistrationInviteTokenFromCookies,
  REGISTRATION_INVITE_COOKIE,
  registrationInviteCookieOptions
} from "@/lib/invitations/cookie";
import { mapInvitationError } from "@/lib/invitations/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { birthYear?: number };
    const birthYear = Number(body.birthYear);
    const registrationInviteToken = await getRegistrationInviteTokenFromCookies();
    const updated = await completeUserOnboarding(user.id, birthYear, {
      registrationInviteToken
    });
    if (!updated) {
      return NextResponse.json({ error: "Unable to complete onboarding." }, { status: 500 });
    }

    void recordActivityEvent({
      userId: user.id,
      eventType: "onboarding_complete",
      summary: `Completed onboarding (birth year ${birthYear})`,
      metadata: { birthYear }
    }).catch(() => undefined);

    const response = NextResponse.json({
      user: {
        id: updated.id,
        displayName: updated.displayName ?? updated.username,
        onboardingComplete: updated.onboardingComplete,
        pointsBalance: updated.pointsBalance
      }
    });

    if (registrationInviteToken) {
      response.cookies.set(REGISTRATION_INVITE_COOKIE, "", {
        ...registrationInviteCookieOptions(0),
        maxAge: 0
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "CHILD_ACCOUNT_BLOCKED") {
      return NextResponse.json(
        { error: "Accounts under 13 cannot use Coach Board or Fan Chat." },
        { status: 403 }
      );
    }
    if (error instanceof Error && error.message === "INVALID_BIRTH_YEAR") {
      return NextResponse.json({ error: "Enter a valid birth year." }, { status: 400 });
    }
    const inviteMapped = mapInvitationError(error);
    if (inviteMapped) {
      return NextResponse.json({ error: inviteMapped.error }, { status: inviteMapped.status });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    return NextResponse.json({ error: "Unable to complete onboarding." }, { status: 500 });
  }
}
