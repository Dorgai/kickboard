import { NextResponse } from "next/server";
import { recordActivityWithPresence } from "@/lib/activity/store";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

const ALLOWED_CLIENT_EVENTS = new Set(["page_view"]);

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      eventType?: string;
      summary?: string;
      pagePath?: string;
      metadata?: Record<string, unknown>;
    };

    const eventType = payload.eventType?.trim() ?? "";
    if (!ALLOWED_CLIENT_EVENTS.has(eventType)) {
      return NextResponse.json({ error: "Unsupported event type." }, { status: 400 });
    }

    const summary =
      payload.summary?.trim() ||
      (eventType === "page_view" && payload.pagePath
        ? `Viewed ${payload.pagePath}`
        : eventType);

    await recordActivityWithPresence({
      userId: user.id,
      eventType,
      summary,
      metadata: payload.metadata,
      userAgent: request.headers.get("user-agent"),
      pagePath: payload.pagePath ?? null
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    console.error(error);
    return NextResponse.json({ error: "Unable to record activity." }, { status: 500 });
  }
}
