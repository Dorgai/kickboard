import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { getPredictionsOverview } from "@/lib/fixture-predictions/overview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const fixtureKey = params.get("fixtureKey")?.trim() ?? "";
  const homeTeam = params.get("homeTeam")?.trim() ?? "";
  const awayTeam = params.get("awayTeam")?.trim() ?? "";

  try {
    const overview = await getPredictionsOverview(user.id, {
      fixtureKey: fixtureKey || undefined,
      homeTeam: homeTeam || undefined,
      awayTeam: awayTeam || undefined
    });
    return NextResponse.json(overview);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load predictions overview." }, { status: 500 });
  }
}
