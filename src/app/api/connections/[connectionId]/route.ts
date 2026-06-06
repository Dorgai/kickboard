import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapConnectionError } from "@/lib/connections/errors";
import { cancelOutgoingRequest, respondToConnectionRequest } from "@/lib/connections/store";
import { mapDatabaseError } from "@/lib/community/health";
import { notifyConnectionAccepted } from "@/lib/push/connection-notify";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ connectionId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const { connectionId } = await context.params;

  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action;
    if (action !== "accept" && action !== "reject" && action !== "block") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const result = await respondToConnectionRequest(connectionId, user.id, action);
    if (!result) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }

    if (result.status === "accepted" && "requesterId" in result) {
      notifyConnectionAccepted(result.requesterId, result.addresseeId);
    }

    return NextResponse.json({ status: result.status, message: "Connection updated." });
  } catch (error) {
    const connectionMapped = mapConnectionError(error);
    if (connectionMapped) {
      return NextResponse.json({ error: connectionMapped.error }, { status: connectionMapped.status });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to update connection." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { connectionId } = await context.params;
  const removed = await cancelOutgoingRequest(connectionId, user.id);
  if (!removed) {
    return NextResponse.json({ error: "Pending request not found." }, { status: 404 });
  }
  return NextResponse.json({ message: "Request cancelled." });
}
