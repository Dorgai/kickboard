import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { mapInvitationError } from "@/lib/invitations/errors";
import {
  createRegistrationInvitation,
  listRegistrationInvitationsForInviter
} from "@/lib/invitations/store";
import { resolveAuthBaseUrl } from "@/auth";

export const dynamic = "force-dynamic";

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
    };

    const invitation = await createRegistrationInvitation({
      inviterId: user.id,
      inviteeEmail: body.inviteeEmail,
      personalMessage: body.personalMessage,
      baseUrl: resolvePublicBaseUrl(request)
    });

    return NextResponse.json({
      invitation,
      message: "Invitation created. Share the link so they can register with Google."
    });
  } catch (error) {
    const mapped = mapInvitationError(error) ?? mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to create invitation." }, { status: 500 });
  }
}
