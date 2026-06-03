import { NextResponse } from "next/server";
import { recordActivityEvent } from "@/lib/activity/store";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { mapFanChatError } from "@/lib/fan-chat/errors";
import {
  listFanChatBroadcasts,
  listFanChatInbox,
  listFanChatThread,
  sendFanChatMessage
} from "@/lib/fan-chat/store";

export const dynamic = "force-dynamic";

function authBlocked(user: Awaited<ReturnType<typeof requireAuthUser>>) {
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot use Fan Chat." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const user = await requireAuthUser();
  const blocked = authBlocked(user);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const peerId = searchParams.get("peerId")?.trim() ?? "";
  const scope = searchParams.get("scope")?.trim() ?? "";

  try {
    if (scope === "broadcasts") {
      const broadcasts = await listFanChatBroadcasts(user!.id);
      return NextResponse.json({ broadcasts });
    }

    if (scope === "inbox") {
      const threads = await listFanChatInbox(user!.id);
      return NextResponse.json({ threads });
    }

    if (!peerId) {
      return NextResponse.json(
        { error: "peerId or scope=broadcasts|inbox is required." },
        { status: 400 }
      );
    }

    const messages = await listFanChatThread(user!.id, peerId);
    return NextResponse.json({ messages, peerId });
  } catch (error) {
    const mapped = mapFanChatError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    const db = mapDatabaseError(error);
    if (db) return NextResponse.json({ error: db.error }, { status: db.status });
    return NextResponse.json({ error: "Unable to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  const blocked = authBlocked(user);
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { recipientId?: string; body?: string };
    const recipientId = body.recipientId?.trim() ?? "";
    const text = body.body ?? "";

    if (!recipientId) {
      return NextResponse.json({ error: "recipientId is required (peer uuid or \"all\")." }, { status: 400 });
    }

    const result = await sendFanChatMessage(user!.id, user!.displayName ?? user!.username, {
      recipientId: recipientId === "all" ? "all" : recipientId,
      body: text
    });

    void recordActivityEvent({
      userId: user!.id,
      eventType: result.mode === "broadcast" ? "fan_chat_broadcast" : "fan_chat_sent",
      summary:
        result.mode === "broadcast"
          ? `Broadcast Fan Chat to ${result.recipientCount} connections`
          : "Sent Fan Chat direct message",
      metadata:
        result.mode === "broadcast"
          ? { broadcastId: result.broadcastId, recipientCount: result.recipientCount }
          : { messageId: result.messageId }
    }).catch(() => undefined);

    return NextResponse.json({
      ...result,
      message:
        result.mode === "broadcast"
          ? `Sent to ${result.recipientCount} connection${result.recipientCount === 1 ? "" : "s"}.`
          : "Message sent."
    });
  } catch (error) {
    const mapped = mapFanChatError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    const db = mapDatabaseError(error);
    if (db) return NextResponse.json({ error: db.error }, { status: db.status });
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}
