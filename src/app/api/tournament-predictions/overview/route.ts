import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { getTournamentPredictionsOverview } from "@/lib/tournament-predictions/overview";
import { DEFAULT_TOURNAMENT_KEY } from "@/lib/tournament-predictions/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const tournamentKey =
    new URL(request.url).searchParams.get("tournamentKey")?.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;

  try {
    const overview = await getTournamentPredictionsOverview(user.id, tournamentKey);
    return NextResponse.json(overview);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load tournament picks overview." }, { status: 500 });
  }
}
