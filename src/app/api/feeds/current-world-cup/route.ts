import { NextResponse } from "next/server";
import { fetchCurrentWorldCupFeed } from "@/lib/feeds/current-world-cup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await fetchCurrentWorldCupFeed();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown current World Cup feed error"
      },
      { status: 502 }
    );
  }
}
