import { NextResponse } from "next/server";
import { getWorldCupCompetitions } from "@/lib/statsbomb";

export async function GET() {
  try {
    const worldCups = (await getWorldCupCompetitions()).map((competition) => ({
      competitionId: competition.competition_id,
      seasonId: competition.season_id,
      country: competition.country_name,
      name: competition.competition_name,
      gender: competition.competition_gender,
      season: competition.season_name,
      matchDataAvailable: competition.match_available ?? null
    }));

    return NextResponse.json(
      {
        connected: true,
        source: "statsbomb/open-data",
        worldCupCompetitionCount: worldCups.length,
        worldCups
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
        error: error instanceof Error ? error.message : "Unknown StatsBomb fetch error"
      },
      { status: 502 }
    );
  }
}
