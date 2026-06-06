import { NextResponse } from "next/server";
import { pushRecentMatchResultsToSubscribers } from "@/lib/push/match-results";
import { isWebPushConfigured } from "@/lib/push/vapid";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push is not configured." }, { status: 503 });
  }

  const result = await pushRecentMatchResultsToSubscribers();
  return NextResponse.json({ ok: true, ...result });
}
