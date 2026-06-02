import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { mapInvitationError } from "@/lib/invitations/errors";
import { revokeRegistrationInvitation } from "@/lib/invitations/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ invitationId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { invitationId } = await context.params;

  try {
    await revokeRegistrationInvitation(invitationId, user.id);
    return NextResponse.json({ message: "Invitation revoked." });
  } catch (error) {
    const mapped = mapInvitationError(error) ?? mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to revoke invitation." }, { status: 500 });
  }
}
