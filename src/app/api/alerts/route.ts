import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { syncAlertsForUser } from "@/lib/alerts/sync";
import {
  countUnreadAlerts,
  listUserAlerts,
  markAlertRead,
  markAllAlertsRead
} from "@/lib/alerts/store";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    await syncAlertsForUser(user.id);
    const [alerts, unreadCount] = await Promise.all([
      listUserAlerts(user.id),
      countUnreadAlerts(user.id)
    ]);

    return NextResponse.json({
      alerts,
      unreadCount,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load alerts." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { alertId?: string; markAll?: boolean };
    if (body.markAll) {
      await markAllAlertsRead(user.id);
      return NextResponse.json({ message: "All alerts marked read." });
    }

    const alertId = body.alertId?.trim() ?? "";
    if (!alertId) {
      return NextResponse.json({ error: "alertId or markAll is required." }, { status: 400 });
    }

    const ok = await markAlertRead(user.id, alertId);
    if (!ok) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Alert marked read." });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to update alert." }, { status: 500 });
  }
}
