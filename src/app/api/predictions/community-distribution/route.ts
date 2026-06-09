import { NextResponse } from "next/server";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getFixtureOutcomeDistribution,
  getTournamentPlayerDistribution,
  getTournamentTeamDistribution
} from "@/lib/predictions/community-distribution";

export const dynamic = "force-dynamic";

const FIXTURE_CATEGORIES = new Set(["outcome"]);
const TOURNAMENT_CATEGORIES = new Set(["champion", "finalOpponent", "topScorer", "bestPlayer"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";

  try {
    if (scope === "fixture") {
      if (!FIXTURE_CATEGORIES.has(category)) {
        return NextResponse.json({ error: "Unsupported fixture category." }, { status: 400 });
      }
      const fixtureKey = params.get("fixtureKey")?.trim() ?? "";
      if (!fixtureKey) {
        return NextResponse.json({ error: "fixtureKey is required." }, { status: 400 });
      }

      const distribution = await getFixtureOutcomeDistribution({
        fixtureKey,
        homeTeam: params.get("homeTeam")?.trim() || undefined,
        awayTeam: params.get("awayTeam")?.trim() || undefined,
        homeLabel: params.get("homeLabel")?.trim() || undefined,
        awayLabel: params.get("awayLabel")?.trim() || undefined
      });
      return NextResponse.json(distribution);
    }

    if (scope === "tournament") {
      if (!TOURNAMENT_CATEGORIES.has(category)) {
        return NextResponse.json({ error: "Unsupported tournament category." }, { status: 400 });
      }

      const tournamentKey = params.get("tournamentKey")?.trim() || undefined;

      if (category === "champion" || category === "finalOpponent") {
        const distribution = await getTournamentTeamDistribution({
          tournamentKey,
          category
        });
        return NextResponse.json(distribution);
      }

      const distribution = await getTournamentPlayerDistribution({
        tournamentKey,
        category: category === "topScorer" ? "topScorer" : "bestPlayer"
      });
      return NextResponse.json(distribution);
    }

    return NextResponse.json({ error: "scope must be fixture or tournament." }, { status: 400 });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load community distribution." }, { status: 500 });
  }
}
