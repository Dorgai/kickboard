import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapConnectionError } from "@/lib/connections/errors";
import { getPeerSquadForViewer } from "@/lib/connections/peers";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ userId: string; squadId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot view friends." }, { status: 403 });
  }

  const { userId: peerId, squadId } = await context.params;

  try {
    const squad = await getPeerSquadForViewer(user.id, peerId, squadId);
    if (!squad) {
      return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    }
    return NextResponse.json({ squad });
  } catch (error) {
    const connectionMapped = mapConnectionError(error);
    if (connectionMapped) {
      return NextResponse.json({ error: connectionMapped.error }, { status: connectionMapped.status });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load squad." }, { status: 500 });
  }
}
