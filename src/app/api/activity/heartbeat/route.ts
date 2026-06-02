import { NextResponse } from "next/server";
import { touchPresence } from "@/lib/activity/store";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { pagePath?: string };
    const userAgent = request.headers.get("user-agent");
    const sessionId = await touchPresence(user.id, {
      userAgent,
      pagePath: payload.pagePath ?? null
    });

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    console.error(error);
    return NextResponse.json({ error: "Unable to update presence." }, { status: 500 });
  }
}
