import { NextResponse } from "next/server";
import { getWorldCupSquadPlayerPool } from "@/lib/squads/player-pool";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competitionId = Number(searchParams.get("competitionId"));
  const seasonId = Number(searchParams.get("seasonId"));

  try {
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
