import { NextRequest, NextResponse } from "next/server";
import { getEvents, summariseEvent } from "@/lib/statsbomb";

export async function GET(request: NextRequest) {
  try {
    const matchId = Number(request.nextUrl.searchParams.get("matchId"));

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    const events = await getEvents(matchId);
    const summary = events.map(summariseEvent);
    const eventTypeCounts = summary.reduce<Record<string, number>>((counts, event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json(
      {
        connected: true,
        matchId,
        count: summary.length,
        eventTypeCounts,
        events: summary.slice(0, 200)
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
        error: error instanceof Error ? error.message : "Unknown StatsBomb events fetch error"
      },
      { status: 502 }
    );
  }
}
