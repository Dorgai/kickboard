import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  deletePushSubscription,
  deletePushSubscriptionsForUser,
  upsertPushSubscription
} from "@/lib/push/store";
import { isWebPushConfigured } from "@/lib/push/vapid";

export const dynamic = "force-dynamic";

type PushKeys = { p256dh?: string; auth?: string };

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured on this server." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      endpoint?: string;
      keys?: PushKeys;
    };

    const endpoint = body.endpoint?.trim() ?? "";
    const p256dh = body.keys?.p256dh?.trim() ?? "";
    const auth = body.keys?.auth?.trim() ?? "";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
    }

    await upsertPushSubscription({
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent")
    });

    return NextResponse.json({ message: "Push subscription saved." });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save push subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { endpoint?: string; all?: boolean };
    if (body.all) {
      await deletePushSubscriptionsForUser(user.id);
      return NextResponse.json({ message: "All push subscriptions removed." });
    }

    const endpoint = body.endpoint?.trim() ?? "";
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint or all is required." }, { status: 400 });
    }

    await deletePushSubscription(user.id, endpoint);
    return NextResponse.json({ message: "Push subscription removed." });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to remove push subscription." }, { status: 500 });
  }
}
