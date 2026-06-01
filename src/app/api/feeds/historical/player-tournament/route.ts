import { NextRequest, NextResponse } from "next/server";
import { getPlayerTournamentAppearances } from "@/lib/player-tournament";

export async function GET(request: NextRequest) {
  try {
    const playerId = Number(request.nextUrl.searchParams.get("playerId"));
    const competitionId = Number(request.nextUrl.searchParams.get("competitionId"));
    const seasonId = Number(request.nextUrl.searchParams.get("seasonId"));
    const excludeMatchId = Number(request.nextUrl.searchParams.get("excludeMatchId") || "0");

    if (!playerId || !competitionId || !seasonId) {
      return NextResponse.json(
        { error: "Missing playerId, competitionId, or seasonId" },
        { status: 400 }
      );
    }

    const summary = await getPlayerTournamentAppearances(playerId, competitionId, seasonId, {
      excludeMatchId: excludeMatchId || undefined
    });

    return NextResponse.json(
      {
        connected: true,
        playerId,
        competitionId,
        seasonId,
        ...summary,
        note:
          "Tournament totals are aggregated from other StatsBomb matches in this World Cup season where the player was in the lineup."
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
        error: error instanceof Error ? error.message : "Unknown player tournament fetch error"
      },
      { status: 502 }
    );
  }
}
