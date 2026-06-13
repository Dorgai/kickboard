import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { listUserFixturePredictionsForUser } from "@/lib/fixture-predictions/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ predictions: [] });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const predictions = await listUserFixturePredictionsForUser(user.id);
    return NextResponse.json({ predictions });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load predictions." }, { status: 500 });
  }
}
