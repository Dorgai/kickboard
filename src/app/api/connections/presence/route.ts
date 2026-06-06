import { NextResponse } from "next/server";
import { listAcceptedConnectionsPresence } from "@/lib/connections/presence";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot use connections." }, { status: 403 });
  }

  try {
    const peers = await listAcceptedConnectionsPresence(user.id);
    const onlineCount = peers.filter((peer) => peer.online).length;
    return NextResponse.json({ peers, onlineCount });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load presence." }, { status: 500 });
  }
}
