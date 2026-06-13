import { NextResponse } from "next/server";
import { loadMatchBoard } from "@/lib/fixtures/match-board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payload = await loadMatchBoard();
    return NextResponse.json(payload, {
      status: payload.connected ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unable to load match board.",
        updatedAt: new Date().toISOString(),
        live: [],
        startingSoon: [],
        recentResults: [],
        byKey: {}
      },
      { status: 502 }
    );
  }
}
