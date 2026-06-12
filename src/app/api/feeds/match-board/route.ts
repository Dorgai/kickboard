import { NextResponse } from "next/server";
import { loadMatchBoard } from "@/lib/fixtures/match-board";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await loadMatchBoard();
    return NextResponse.json(payload, { status: payload.connected ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unable to load match board.",
        updatedAt: new Date().toISOString(),
        live: [],
        startingSoon: [],
        byKey: {}
      },
      { status: 502 }
    );
  }
}
