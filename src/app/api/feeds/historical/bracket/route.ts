import { NextRequest, NextResponse } from "next/server";
import { buildKnockoutBracket } from "@/lib/world-cup-bracket";
import { getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fallbackCompetition = (await getWorldCupCompetitions())[0];
    const competitionId = Number(searchParams.get("competitionId") ?? fallbackCompetition?.competition_id);
    const seasonId = Number(searchParams.get("seasonId") ?? fallbackCompetition?.season_id);

    if (!competitionId || !seasonId) {
      return NextResponse.json({ error: "Missing competitionId or seasonId" }, { status: 400 });
    }

    const matches = await getMatches(competitionId, seasonId);
    const rounds = buildKnockoutBracket(matches);

    return NextResponse.json(
      {
        connected: true,
        competitionId,
        seasonId,
        rounds
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown StatsBomb bracket fetch error"
      },
      { status: 502 }
    );
  }
}
