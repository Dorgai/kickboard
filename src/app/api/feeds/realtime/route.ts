import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const keyConfigured = Boolean(process.env.API_FOOTBALL_KEY);
  const workerEnabled = process.env.KICKBOARD_WORKER_ENABLED === "true";

  if (!keyConfigured || !workerEnabled) {
    return NextResponse.json(
      {
        connected: false,
        provider: "API-Football",
        keyConfigured,
        workerEnabled,
        requiredRailwayVariables: ["API_FOOTBALL_KEY", "KICKBOARD_WORKER_ENABLED=true"],
        message:
          "Real-time data is not connected yet. The app is using demo data until API-Football credentials and the worker service are configured."
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    connected: true,
    provider: "API-Football",
    mode: "adaptive polling",
    pollingCadence: {
      preKickoff72h: "once",
      preKickoff60m: "10m",
      live: "60s",
      halfTime: "2m",
      extraTimeOrPenalties: "30s",
      fullTimePlus30m: "5m",
      nextDay: "once"
    }
  });
}
