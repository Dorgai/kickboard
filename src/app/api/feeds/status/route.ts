import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const hasApiFootballKey = Boolean(process.env.API_FOOTBALL_KEY);
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const hasRedis = Boolean(process.env.REDIS_URL);
  const workerEnabled = process.env.KICKBOARD_WORKER_ENABLED === "true";

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      feeds: {
        historical: {
          name: "StatsBomb Open Data",
          connected: true,
          mode: "public-github-feed",
          endpoint: "/api/feeds/historical"
        },
        realtime: {
          name: "API-Football",
          connected: hasApiFootballKey && workerEnabled,
          keyConfigured: hasApiFootballKey,
          workerEnabled,
          mode: "adaptive-polling-worker",
          endpoint: "/api/feeds/realtime",
          message:
            hasApiFootballKey && workerEnabled
              ? "Real-time feed is configured."
              : "Real-time feed is not active. Configure API_FOOTBALL_KEY and run the worker service."
        },
        storage: {
          postgres: hasDatabase,
          redis: hasRedis
        }
      }
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
