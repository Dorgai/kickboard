import { NextResponse } from "next/server";
import { settleRecentFinishedFixturePredictions } from "@/lib/fixture-predictions/settlement";

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

  const result = await settleRecentFinishedFixturePredictions();
  return NextResponse.json({ ok: result.connected, ...result }, { status: result.connected ? 200 : 503 });
}
