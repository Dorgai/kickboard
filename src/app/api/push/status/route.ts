import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { listPushSubscriptionsForUser, userPushNotificationsEnabled } from "@/lib/push/store";
import { isWebPushConfigured } from "@/lib/push/vapid";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const [subscriptions, pushEnabled] = await Promise.all([
    listPushSubscriptionsForUser(user.id),
    userPushNotificationsEnabled(user.id)
  ]);

  return NextResponse.json({
    configured: isWebPushConfigured(),
    pushEnabled,
    subscriptionCount: subscriptions.length
  });
}
