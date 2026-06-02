import { NextResponse } from "next/server";
import {
  getOnlineUserCount,
  listActivityEventsForAdmin,
  listPresenceSessionsForAdmin,
  listUsersActivityForAdmin
} from "@/lib/activity/store";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, users: [], events: [], sessions: [] });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim() ?? "users";
  const userId = searchParams.get("userId")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const eventType = searchParams.get("eventType")?.trim() || undefined;
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;
  const onlineOnly = searchParams.get("onlineOnly") === "1";
  const limit = Number(searchParams.get("limit") ?? "40");

  try {
    if (scope === "summary") {
      const onlineCount = await getOnlineUserCount();
      return NextResponse.json({ connected: true, onlineCount });
    }

    if (scope === "sessions" && userId) {
      const sessions = await listPresenceSessionsForAdmin(userId, limit);
      return NextResponse.json({ connected: true, sessions });
    }

    if (scope === "events") {
      const events = await listActivityEventsForAdmin({
        userId,
        queryText: q,
        eventType,
        from,
        to,
        limit
      });
      return NextResponse.json({ connected: true, events });
    }

    const users = await listUsersActivityForAdmin({
      queryText: q,
      userId,
      onlineOnly,
      from,
      to,
      limit
    });

    return NextResponse.json({ connected: true, users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load activity." }, { status: 500 });
  }
}
