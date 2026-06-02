import { NextResponse } from "next/server";
import {
  getFixtureSquadPlayerPool,
  getTeamSquadPlayerPool,
  getWorldCupSquadPlayerPool
} from "@/lib/squads/player-pool";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competitionId = Number(searchParams.get("competitionId"));
  const seasonId = Number(searchParams.get("seasonId"));
  const homeTeam = searchParams.get("homeTeam")?.trim() ?? "";
  const awayTeam = searchParams.get("awayTeam")?.trim() ?? "";
  const fixtureKey = searchParams.get("fixtureKey")?.trim() ?? "";
  const team = searchParams.get("team")?.trim() ?? "";

  try {
    if (team) {
      const pool = await getTeamSquadPlayerPool(team);
      return NextResponse.json(pool, {
        headers: { "Cache-Control": "public, max-age=3600" }
      });
    }

    if (homeTeam && awayTeam) {
      const pool = await getFixtureSquadPlayerPool(homeTeam, awayTeam, {
        fixtureKey: fixtureKey || null
      });
      return NextResponse.json(pool, {
        headers: { "Cache-Control": "public, max-age=3600" }
      });
    }

    const pool = await getWorldCupSquadPlayerPool({
      competitionId: Number.isFinite(competitionId) ? competitionId : undefined,
      seasonId: Number.isFinite(seasonId) ? seasonId : undefined
    });

    return NextResponse.json(pool, {
      headers: { "Cache-Control": "public, max-age=3600" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player pool.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
