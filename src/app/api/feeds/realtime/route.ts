import { NextResponse } from "next/server";
import { fetchApiFootball, getApiFootballConfig, type ApiFootballFixture } from "@/lib/api-football";

export const dynamic = "force-dynamic";

export async function GET() {
  const { keyConfigured, workerEnabled } = getApiFootballConfig();

  if (!keyConfigured || !workerEnabled) {
    return NextResponse.json(
      {
        connected: false,
        provider: "API-Football",
        keyConfigured,
        workerEnabled,
        requiredRailwayVariables: ["API_FOOTBALL_KEY", "KICKBOARD_WORKER_ENABLED=true"],
        message:
          "Real-time data is not connected yet. Set API_FOOTBALL_KEY and KICKBOARD_WORKER_ENABLED=true on the MyPicks web service (see docs/api-football-live-setup.md). MyPicks will not fabricate live data."
      },
      { status: 503 }
    );
  }

  try {
    const liveFixtures = await fetchApiFootball<ApiFootballFixture[]>("/fixtures", { live: "all" });

    return NextResponse.json({
      connected: true,
      provider: "API-Football",
      mode: "adaptive polling",
      results: liveFixtures.results,
      fixtures: liveFixtures.response.map((fixture) => ({
        fixtureId: fixture.fixture.id,
        date: fixture.fixture.date,
        status: fixture.fixture.status,
        league: fixture.league.name,
        season: fixture.league.season,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeGoals: fixture.goals.home,
        awayGoals: fixture.goals.away
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        provider: "API-Football",
        error: error instanceof Error ? error.message : "Unknown API-Football error"
      },
      { status: 502 }
    );
  }
}
