import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { getSessionCheckpointPayload } from "@/lib/session-checkpoint/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const payload = await getSessionCheckpointPayload(user.id);
    return NextResponse.json(payload);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load session summary." }, { status: 500 });
  }
}
