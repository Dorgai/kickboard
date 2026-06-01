import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StatsBombCompetition = {
  competition_id: number;
  season_id: number;
  country_name: string;
  competition_name: string;
  competition_gender: string;
  season_name: string;
  match_available_360?: string;
  match_available?: string;
};

const STATSBOMB_COMPETITIONS_URL =
  "https://raw.githubusercontent.com/statsbomb/open-data/master/data/competitions.json";

export async function GET() {
  try {
    const response = await fetch(STATSBOMB_COMPETITIONS_URL, {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 60 * 60
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          error: `StatsBomb returned ${response.status}`
        },
        { status: 502 }
      );
    }

    const competitions = (await response.json()) as StatsBombCompetition[];
    const worldCups = competitions
      .filter((competition) => competition.competition_name.toLowerCase().includes("world cup"))
      .map((competition) => ({
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
        source: STATSBOMB_COMPETITIONS_URL,
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
