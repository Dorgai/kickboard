import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { listLiveConnectionActivity } from "@/lib/connections/live-activity";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const since = new URL(request.url).searchParams.get("since");

  try {
    const activities = await listLiveConnectionActivity(user.id, since);
    return NextResponse.json({
      activities,
      polledAt: new Date().toISOString()
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load live connection activity." }, { status: 500 });
  }
}
