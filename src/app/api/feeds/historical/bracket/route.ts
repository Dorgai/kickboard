import { NextRequest, NextResponse } from "next/server";
import { getMatches, getWorldCupCompetitions } from "@/lib/statsbomb";

const STAGE_ORDER = [
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "3rd Place Final",
  "Final"
];

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
    const knockoutMatches = matches
      .filter((match) => {
        const stage = match.competition_stage?.name ?? "";
        return stage && stage !== "Group Stage";
      })
      .map((match) => ({
        matchId: match.match_id,
        date: match.match_date,
        stage: match.competition_stage?.name ?? "Unknown",
        homeTeam: match.home_team.home_team_name,
        awayTeam: match.away_team.away_team_name,
        homeScore: match.home_score,
        awayScore: match.away_score,
        stadium: match.stadium?.name ?? null
      }));

    const rounds = STAGE_ORDER.map((stage) => ({
      stage,
      matches: knockoutMatches.filter((match) => match.stage === stage)
    })).filter((round) => round.matches.length > 0);

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
