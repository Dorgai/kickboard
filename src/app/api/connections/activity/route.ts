import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { listConnectionPredictionEvents } from "@/lib/fixture-predictions/events";
import { query } from "@/lib/db";
import { listAcceptedPeerIds } from "@/lib/connections/store";

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
    return NextResponse.json({ error: "Fan Mode accounts cannot use connections." }, { status: 403 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "60");

  try {
    const predictionEvents = await listConnectionPredictionEvents(user.id, limit);

    const peerIds = await listAcceptedPeerIds(user.id);
    let connectionEvents: Array<{
      id: string;
      eventType: string;
      summary: string;
      createdAt: string;
      userId: string;
      username: string;
      displayName: string | null;
    }> = [];

    if (peerIds.length) {
      const rows = await query<{
        id: string;
        user_id: string;
        event_type: string;
        summary: string;
        created_at: Date;
        username: string;
        display_name: string | null;
      }>(
        `SELECT e.id, e.user_id, e.event_type, e.summary, e.created_at, u.username, u.display_name
         FROM user_activity_events e
         INNER JOIN users u ON u.id = e.user_id
         WHERE e.user_id = ANY($1::uuid[])
           AND e.event_type IN ('connection_request', 'connection_accepted')
           AND e.created_at > now() - interval '30 days'
         ORDER BY e.created_at DESC
         LIMIT 20`,
        [peerIds]
      );
      connectionEvents = rows.rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        summary: row.summary,
        createdAt: row.created_at.toISOString(),
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name
      }));
    }

    return NextResponse.json({
      predictionEvents,
      connectionEvents
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load connection activity." }, { status: 500 });
  }
}
