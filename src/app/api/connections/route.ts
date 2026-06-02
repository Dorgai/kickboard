import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapConnectionError } from "@/lib/connections/errors";
import {
  createConnectionRequest,
  listConnectionsForUser
} from "@/lib/connections/store";
import { notifyIncomingConnectionRequest } from "@/lib/push/connection-notify";
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
    const connections = await listConnectionsForUser(user.id);
    return NextResponse.json(connections);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load connections." }, { status: 500 });
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
    return NextResponse.json({ error: "Fan Mode accounts cannot use connections." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { username?: string };
    const created = await createConnectionRequest(user.id, body.username ?? "");
    if (!created) {
      return NextResponse.json({ error: "Unable to send request." }, { status: 500 });
    }
    notifyIncomingConnectionRequest(created.addresseeId, user.id);
    return NextResponse.json({ connectionId: created.connectionId, message: "Connection request sent." });
  } catch (error) {
    const connectionMapped = mapConnectionError(error);
    if (connectionMapped) {
      return NextResponse.json({ error: connectionMapped.error }, { status: connectionMapped.status });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to send request." }, { status: 500 });
  }
}
