import { NextRequest, NextResponse } from "next/server";
import { classifyLineupRole } from "@/lib/lineup-roles";
import { buildMatchStats, getEvents, getLineups } from "@/lib/statsbomb";

export async function GET(request: NextRequest) {
  try {
    const matchId = Number(request.nextUrl.searchParams.get("matchId"));

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    const [events, lineups] = await Promise.all([getEvents(matchId), getLineups(matchId)]);
    const stats = buildMatchStats(events);

    return NextResponse.json(
      {
        connected: true,
        matchId,
        lineups: lineups.map((team) => ({
          teamId: team.team_id,
          teamName: team.team_name,
          players: team.lineup.map((player) => ({
            playerId: player.player_id,
            name: player.player_nickname || player.player_name,
            fullName: player.player_name,
            jerseyNumber: player.jersey_number ?? null,
            country: player.country?.name ?? null,
            lineupRole: classifyLineupRole(player.positions)
          }))
        })),
        teamStats: stats.teamStats,
        playerStats: stats.playerStats
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
        error: error instanceof Error ? error.message : "Unknown StatsBomb match detail fetch error"
      },
      { status: 502 }
    );
  }
}
