import { NextResponse } from "next/server";
import { getCommunityHealth } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getCommunityHealth();

  return NextResponse.json({
    connected: health.database && health.jwt && health.schemaReady,
    database: health.database,
    jwt: health.jwt,
    schemaReady: health.schemaReady,
    message: health.message
  });
}
