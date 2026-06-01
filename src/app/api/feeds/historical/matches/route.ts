import { NextRequest, NextResponse } from "next/server";
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

    const matches = (await getMatches(competitionId, seasonId)).map((match) => ({
      matchId: match.match_id,
      date: match.match_date,
      kickoff: match.kick_off ?? null,
      stage: match.competition_stage?.name ?? null,
      matchWeek: match.match_week ?? null,
      homeTeam: match.home_team.home_team_name,
      awayTeam: match.away_team.away_team_name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      stadium: match.stadium?.name ?? null,
      status: match.match_status ?? null
    }));

    return NextResponse.json(
      {
        connected: true,
        competitionId,
        seasonId,
        count: matches.length,
        matches
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
        error: error instanceof Error ? error.message : "Unknown StatsBomb matches fetch error"
      },
      { status: 502 }
    );
  }
}
