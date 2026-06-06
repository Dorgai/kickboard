import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapConnectionError } from "@/lib/connections/errors";
import { listPeersMatchActivity } from "@/lib/connections/peers";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const params = new URL(request.url).searchParams;
  const fixtureKey = params.get("fixtureKey")?.trim() ?? "";
  if (!fixtureKey) {
    return NextResponse.json({ error: "fixtureKey is required." }, { status: 400 });
  }

  const homeTeam = params.get("homeTeam")?.trim() ?? "";
  const awayTeam = params.get("awayTeam")?.trim() ?? "";

  try {
    const peers = await listPeersMatchActivity(user.id, fixtureKey, {
      homeTeam: homeTeam || undefined,
      awayTeam: awayTeam || undefined
    });
    return NextResponse.json({ fixtureKey, peers });
  } catch (error) {
    const connectionMapped = mapConnectionError(error);
    if (connectionMapped) {
      return NextResponse.json({ error: connectionMapped.error }, { status: connectionMapped.status });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load friends activity." }, { status: 500 });
  }
}
